/* ==========================================================================
   ABC HCP — Process Claim (Medico Wizard) Page Behaviour
   Extracted from app.js (Role Split Guide, Step 5) — no behaviour change,
   except where noted: this page has exactly one view, so the SPA
   view-switching seams from app.js (hideAllViews/switchToListView/
   switchToMedicoView) are replaced with local equivalents that either
   no-op (nothing else to hide) or navigate back to index.html.
   ========================================================================== */

    /* formatFileSize, fmtCurrency, fmtDate, remarkInitials, defaultStageRemarks,
       formatRemarkTimestamp, renderCombinedRemarksTable, buildPager,
       DOCUMENT_CATEGORIES come from shared/shared-components.js;
       entries from shared/entries-store.js; getCurrentRole/setCurrentRole/
       getScanTagTab/setScanTagTab from shared/role-state.js; ROLES from
       shared/role-config.js; getProcessSheetHTML from shared/process-sheet-loader.js;
       placeholderDocHTML from shared/placeholder-doc-template.js — all loaded
       as classic <script> tags before this file, so their top-level
       declarations are already global by the time this script runs. */

    // Always land at the top of the page on a fresh load/refresh — some
    // browsers restore the prior scroll offset on reload by default, which
    // reads as broken on a wizard page where content height changes as
    // stages/cards are added.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    /* =====================================================================
       CLAIM HANDOFF — this page opens whichever claim's inwardId is passed
       via ?id= from index.html's row-action ("Process Claim") link.
    ===================================================================== */
    function goToClaimsList() {
      window.location.href = "./index.html?role=" + encodeURIComponent(getCurrentRole());
    }

    // Only medico-staff roles ever land on this page — used to validate an
    // incoming ?role= param at load time (see initFromQueryParam below).
    // Must mirror app.js's isMedicoStaffRole (the set that gets the
    // "Process Claim" row action button in the first place).
    const MEDICO_STAFF_ROLES = ["Medico", "Non Medico", "QC", "QC TL", "CMO", "CEM", "Payment Auditor - Settlement User"];

    /* =====================================================================
       ROLE SWITCHER (top-right profile)
       Mirrors index.html's dropdown, but role changes here just relabel
       the header — the medico wizard stays keyed to whichever claim is
       loaded regardless of which medico-family role is selected. Choosing
       a non-medico-family role navigates back to index.html (or
       payment.html for Payment) since this page has no other views.
    ===================================================================== */
    function renderRoleList() {
      const currentRole = getCurrentRole();
      const list = document.getElementById("roleList");
      list.innerHTML = ROLES.map(role => `
    <label class="role-option ${currentRole === role ? "selected" : ""}" data-role="${role}">
      <input type="radio" name="userRole" value="${role}" ${currentRole === role ? "checked" : ""}>
      <span>${role}</span>
    </label>
  `).join("");

      list.querySelectorAll(".role-option").forEach(opt => {
        opt.addEventListener("click", () => {
          const role = opt.dataset.role;
          if (role === getCurrentRole()) {
            document.getElementById("roleDropdown").classList.add("hidden");
            return;
          }
          document.getElementById("roleDropdown").classList.add("hidden");
          // Switching roles from inside the wizard always leaves this page —
          // every role has its own list/dashboard on index.html (or
          // payment.html for Payment), so there's nothing to re-render here.
          if (role === "Payment") {
            window.location.href = "./payment.html";
            return;
          }
          setCurrentRole(role);
          window.location.href = "./index.html?role=" + encodeURIComponent(role);
        });
      });
    }

    const profileWrap = document.getElementById("profileWrap");
    const profileBtn = document.getElementById("profileBtn");
    const roleDropdown = document.getElementById("roleDropdown");

    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = roleDropdown.classList.contains("hidden");
      roleDropdown.classList.toggle("hidden");
      profileBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) renderRoleList();
    });

    document.addEventListener("click", (e) => {
      if (!profileWrap.contains(e.target)) {
        roleDropdown.classList.add("hidden");
        profileBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !roleDropdown.classList.contains("hidden")) {
        roleDropdown.classList.add("hidden");
        profileBtn.setAttribute("aria-expanded", "false");
        profileBtn.focus();
      }
    });

    /* ---------------- Hamburger dropdown menu ---------------- */
    const hamburgerWrap = document.getElementById("hamburgerWrap");
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const navDropdownMenu = document.getElementById("navDropdownMenu");

    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = navDropdownMenu.classList.contains("hidden");
      navDropdownMenu.classList.toggle("hidden");
      hamburgerBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!hamburgerWrap.contains(e.target)) {
        navDropdownMenu.classList.add("hidden");
        hamburgerBtn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        navDropdownMenu.classList.add("hidden");
        hamburgerBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Escape-to-close, click-outside-to-close, initial focus, and focus
    // return for modals are handled globally in shared-components.js
    // (initModalAccessibility) — applies to every .modal-backdrop on every
    // page, not just this one.

    /* =====================================================================
       SUCCESS MODAL (local — this page's "View" action always returns
       to the claims list on index.html, so no per-call onView override
       plumbing is needed beyond that single destination)
    ===================================================================== */
    let successModalOnView = goToClaimsList;
    function showSuccessModal(opts) {
      const btn = document.getElementById("modalViewBtn");
      btn.textContent = (opts && opts.label) || "View in Claim List";
      successModalOnView = (opts && opts.onView) || goToClaimsList;
      document.getElementById("successModal").classList.add("show");
    }
    document.getElementById("modalViewBtn").addEventListener("click", () => {
      document.getElementById("successModal").classList.remove("show");
      successModalOnView();
    });

    /* ---------------- Sidebar collapse ---------------- */
    const sidebar = document.getElementById("sidebar");
    const collapseBtn = document.getElementById("collapseBtn");
    collapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      repositionMedicoBottomBar();
    });

    /* Collapsed sidebar is position: sticky with overflow-y: auto, which
       clips any same-container absolute tooltip before it can open
       rightward — so render hover labels via one shared position: fixed
       element instead (see #sidebarTooltip in styles.css). */
    const sidebarTooltip = document.getElementById("sidebarTooltip");
    sidebar.addEventListener("mouseover", (e) => {
      if (!sidebar.classList.contains("collapsed")) return;
      const row = e.target.closest("[title]");
      if (!row || !sidebar.contains(row)) return;
      const rect = row.getBoundingClientRect();
      sidebarTooltip.textContent = row.getAttribute("title");
      sidebarTooltip.style.top = `${rect.top + rect.height / 2}px`;
      sidebarTooltip.style.left = `${rect.right + 10}px`;
      sidebarTooltip.style.right = "auto";
      sidebarTooltip.style.transform = "translateY(-50%)";
      sidebarTooltip.classList.add("show");
    });
    sidebar.addEventListener("mouseout", (e) => {
      const row = e.target.closest("[title]");
      if (!row) return;
      sidebarTooltip.classList.remove("show");
    });
    sidebar.addEventListener("scroll", () => sidebarTooltip.classList.remove("show"));

    /* Local equivalent of the old SPA's switchToMedicoView(): this page has
       only one view (the wizard), which is visible by default, so there is
       nothing else to hide — just mirror the sidebar step highlight and
       reposition the bottom bar, same as the original did after unhiding. */
    function activateWizardView() {
      document.querySelectorAll("#sidebarMedicoContent .step").forEach((s, i) => s.classList.toggle("active", i === 0));
      document.getElementById("medicoBottomBar").classList.remove("hidden");
      repositionMedicoBottomBar();
    }

    /* =====================================================================
       INVESTIGATION SCORES (card-medinvestigation, Stage 1)
       Per the CP-Screen Matrix (Basic Details > Investigation Scores):
       MunichRe, Arya, Sherlock, and Penny Drop Verification Status are all
       Read-only "Card Layout" fields shown to every role except Payment
       Auditor (NA). Every card shows its full detail directly — no
       expand/collapse, replacing the legacy system's "click here" links.
    ===================================================================== */
    const INVESTIGATION_SCORE_SOURCES = [
      {
        name: "Sherlock",
        value: "No Data Found",
        empty: true,
        tone: "violet",
        icon: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        insight: "No insight available for this claim.",
      },
      {
        name: "MunichRe",
        value: "NA",
        empty: true,
        tone: "blue",
        icon: '<path d="M12 2a5 5 0 0 0-5 5c0 3 2 4 2 7h6c0-3 2-4 2-7a5 5 0 0 0-5-5z"/><path d="M9 21h6"/>',
        insight: "No insight available for this claim.",
      },
      {
        name: "Arya",
        value: "Score: 72 / 100",
        empty: false,
        tone: "teal",
        icon: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.1-3-3L4 16.5"/>',
        insight: "Moderate risk — recommend document cross-check.",
        admissibilityScore: "68 / 100",
        fraudScore: "Low",
      },
      {
        name: "Penny Drop Verification Status",
        value: "Verified",
        empty: false,
        tone: "amber",
        icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M7 11h.01"/><circle cx="15.5" cy="11" r="1.6"/>',
        insight: "Bank account verified via ₹1 penny drop.",
      },
    ];

    const CHECK_ICON = '<polyline points="20 6 9 17 4 12"/>';
    const CROSS_ICON = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';

    function scoreBarTone(pct) {
      if (pct >= 70) return "is-high";
      if (pct >= 40) return "is-medium";
      return "is-low";
    }

    function renderInvestigationScores() {
      const grid = document.getElementById("scoreCardGrid");
      grid.innerHTML = INVESTIGATION_SCORE_SOURCES.map(s => {
        const isPennyDrop = s.name === "Penny Drop Verification Status";
        const isVerified = isPennyDrop && s.value === "Verified";
        const admissibilityPct = s.admissibilityScore ? parseInt(s.admissibilityScore, 10) : null;

        const valueMarkup = isPennyDrop
          ? `<span class="score-card-status-badge ${isVerified ? "is-verified" : "is-failed"}">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">${isVerified ? CHECK_ICON : CROSS_ICON}</svg>
             ${s.value}
           </span>`
          : `<span class="score-card-value ${s.empty ? "is-empty" : "is-positive"}">${s.value}</span>`;

        return `
    <div class="score-card ${s.empty ? "is-empty-source" : ""}" data-tone="${s.tone}">
      <div class="score-card-head">
        <span class="score-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${s.icon}</svg></span>
        ${valueMarkup}
      </div>
      <span class="score-card-name">${s.name}</span>
      <p class="score-card-insight">${s.insight}</p>
      ${s.admissibilityScore || s.fraudScore ? `
      <div class="score-card-metrics">
        ${admissibilityPct !== null ? `
        <div class="score-card-metric-bar-row">
          <div><span class="score-card-metric-label">Admissibility Score</span><span class="score-card-metric-value">${s.admissibilityScore}</span></div>
          <div class="score-card-metric-bar-track"><div class="score-card-metric-bar-fill ${scoreBarTone(admissibilityPct)}" style="width:${admissibilityPct}%"></div></div>
        </div>` : ""}
        ${s.fraudScore ? `<div><span class="score-card-metric-label">Insights Fraud Score</span><span class="score-card-metric-value">${s.fraudScore}</span></div>` : ""}
      </div>` : ""}
    </div>
  `;
      }).join("");
    }

    /* =====================================================================
       POLICY / HOSPITALIZATION GRID HELPERS
       Used only by the medico wizard's Stage 1 (Policy & Member Details) —
       kept local to this page rather than shared-components.js since no
       other page currently calls them.
    ===================================================================== */
    function buildPolicyMockData(rec) {
      const policyNum = rec.policyId || rec.surakshaId || "2856208465622800";
      return {
        // Read-only fields, grouped to match the CP-Screen Matrix's
        // Basic Details > Basic Info sub-sections (Identity & Policy /
        // Verification / Address & Contact).
        policy: [
          ["Claim No", rec.claimId || "-"],
          ["Insured/Patient Name", rec.patientName],
          ["Policy Number", policyNum],
          ["Dummy ID", "ER2013713228-01E"],
          ["Product Name", "Optima Secure - Family"],
          ["Product Code", "5023"],
          ["Policy Start Date", "-"],
          ["Policy End Date", "-"],
          ["Age / DOB", "42 / 24-02-1984"],
          ["Gender", "Male"],
          ["Corporate Name", "NA"],
          ["Employee Id / Grade", "NA"],
          ["Patient ID", "-"],
        ],
        verify: [
          ["Pehchan Number", "LN7R62PA68", { verified: true }],
        ],
        verifyAddress: [
          ["ABHA Address", "-"],
        ],
        address: [
          ["Pin Code", "-"],
          ["E-Mail ID", "-"],
        ],
        editable: {
          aadhaarLast4: "",
          byPassPehchan: false,
          byPassPehchanRemark: "",
          abhaId: "",
          contactNo: rec.contactNumber || "",
          altContactNo: "",
          altEmail: "",
          claimantName: "",
          claimantMobile: "",
          claimantEmail: "",
          claimantAddress: "",
        },
        partnerReferenceId: "-",
        // Fields match the CP-Screen Matrix's Hospital Details > Hospital
        // Details / Hospitalization Details groups (Basic Details tab).
        hospitalization: {
          hospCaseNo: "",
          hospName: rec.hospitalName || "",
          ailment: "",
          hospAddress: "-",
          hospLocation: "-",
          hospContactNo: "-",
          hospCity: "-",
          hospState: "-",
          hospPinCode: "-",
          claimedAmount: "",
          dateOfAdmission: (rec.receivedDate || "").slice(0, 10),
          dateOfDischarge: "",
          admissionTime: "",
          dischargeTime: "",
          admissionInTime: "",
          dischargeOutTime: "",
          homeHealthCare: false,
          death: false,
          isPortablePolicy: false,
          majorIllness: "None",
        },
      };
    }

    const VERIFIED_BADGE = `<span class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>Verified</span>`;

    function renderReadonlyGrid(containerId, pairs) {
      // Rendered as disabled inputs (not .readonly-value divs) so read-only
      // fields share the same markup/look as the card's editable fields —
      // only the disabled state differs. A row may pass a third element
      // (verified: true) to attach the app's existing .verified-badge
      // alongside the field, e.g. Pehchan Number.
      document.getElementById(containerId).innerHTML = pairs.map(([label, value, opts]) => `
    <div class="field">
      <label>${label} ${opts && opts.verified ? VERIFIED_BADGE : ""}</label>
      <input type="text" value="${(value || "-").toString().replace(/"/g, "&quot;")}" disabled>
    </div>
  `).join("");
    }


    /* =====================================================================
       DOCUMENT PREVIEW MODAL (medico's own document tiles View action)
    ===================================================================== */
    function openDocPreview(category, docsSource) {
      const doc = docsSource[category];
      if (!doc || !doc.file) return;

      const url = URL.createObjectURL(doc.file);
      const body = document.getElementById("docPreviewBody");
      const ext = doc.fileName.split(".").pop().toLowerCase();

      document.getElementById("docPreviewTitle").textContent = category;
      document.getElementById("docPreviewMeta").textContent = `${doc.fileName} - ${doc.fileSize}`;

      if (["jpg", "jpeg", "png", "tiff", "tif"].includes(ext)) {
        body.innerHTML = `<img src="${url}" alt="${doc.fileName}" style="max-width:100%;max-height:65vh;border-radius:10px;display:block;margin:0 auto;">`;
      } else if (ext === "pdf") {
        body.innerHTML = `<iframe src="${url}" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:10px;"></iframe>`;
      } else {
        body.innerHTML = `<p style="text-align:center;color:var(--muted);font-size:13px;">Preview isn't available for this file type.</p>`;
      }

      document.getElementById("docPreviewModal").classList.add("show");
    }

    document.getElementById("docPreviewCloseBtn").addEventListener("click", () => {
      document.getElementById("docPreviewModal").classList.remove("show");
      document.getElementById("docPreviewBody").innerHTML = "";
    });
    document.getElementById("docPreviewCloseX").addEventListener("click", () => {
      document.getElementById("docPreviewModal").classList.remove("show");
      document.getElementById("docPreviewBody").innerHTML = "";
    });

    /* =====================================================================
       MEDICO / NON MEDICO WIZARD (Process Claim - non-sequential sections)
    ===================================================================== */
    const PAYMENT_DIRECTORY = [
      { neftCode: "NEFT-88213", paymentMode: "NEFT", payeeName: "Tanmoy Bhattacharjee", accountNo: "50100223345671", accountType: "Savings", bankName: "Dummy Bank", branchName: "Salt Lake, Kolkata", ifscCode: "DUMY0001234", panNo: "ABCDE1234F", emailId: "bhat.tanmoy@gmail.com", source: "HCS" },
      { neftCode: "NEFT-77410", paymentMode: "NEFT", payeeName: "Ramesh Iyer", accountNo: "03421000556612", accountType: "Savings", bankName: "ICICI Bank", branchName: "Jubilee Hills, Hyderabad", ifscCode: "ICIC0000342", panNo: "AAAPI1234K", emailId: "ramesh.iyer@example.com", source: "HCS" },
      { neftCode: "NEFT-90021", paymentMode: "RTGS", payeeName: "Apollo Hospitals Enterprise Ltd", accountNo: "91202001998877", accountType: "Current", bankName: "Axis Bank", branchName: "Jubilee Hills, Hyderabad", ifscCode: "UTIB0001122", panNo: "AAACA5678H", emailId: "billing@apollohospitals.com", source: "HCS" },
      { neftCode: "NEFT-65590", paymentMode: "NEFT", payeeName: "Neha Kapoor", accountNo: "11223344556677", accountType: "Savings", bankName: "State Bank of India", branchName: "Somajiguda, Hyderabad", ifscCode: "SBIN0004455", panNo: "BBCDE6789Z", emailId: "neha.kapoor@example.com", source: "HCS" },
    ];

    // Demo aid: account numbers already run through "Verify with Existing
    // Records" once with no conflict found. A second Verify click on the
    // same number then surfaces a dummy matched record — lets the
    // matched-record UI be demoed without needing to pre-seed real data.
    const verifiedAccountNumbers = new Set();

    function buildDummyMatch(accNo) {
      return { neftCode: "NEFT-00000", paymentMode: "NEFT", payeeName: "Dummy Payee", accountNo: accNo, accountType: "Savings", bankName: "Dummy Bank", branchName: "Dummy Branch", ifscCode: "DUMY0000000", panNo: "DUMMY0000D", emailId: "dummy.payee@example.com", source: "Demo" };
    }

    let medicoTargetId = null;

    function renderMedicoDocCategoryOptions(rec) {
      const select = document.getElementById("medDocCategorySelect");
      // Every category stays selectable, even ones that already have saved
      // documents — a category can hold more than one file, so uploading
      // another under an already-used category adds to it instead of
      // being blocked.
      const options = DOCUMENT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
      select.innerHTML = options + `<option value="__other__">Other (specify)</option>`;
      // The <option> list was just replaced wholesale — re-sync the
      // searchable-select proxy's visible label (options are re-read
      // fresh on next open regardless, but the at-rest label needs an
      // explicit nudge since no "change" event fires from an innerHTML
      // swap).
      refreshSearchableSelectLabel("medDocCategorySelect");
    }

    // Refreshes the category dropdown for the top-of-card single-file
    // upload control and rebuilds the one document row list (below the
    // dropzone) from rec.documents — there is no separate top-of-card list
    // anymore; every document, received or uploaded via either entry
    // point, renders as a row via rehydrateMedUploadList (see below).
    function renderMedicoDocuments(rec) {
      rehydrateMedUploadList(rec);
      renderMedicoDocCategoryOptions(rec);
    }

    document.getElementById("medDocCategorySelect").addEventListener("change", (e) => {
      document.getElementById("medDocOtherField").classList.toggle("hidden", e.target.value !== "__other__");
    });

    const MED_HEADER_ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "tiff", "tif"];

    document.getElementById("medDocFileInput").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const select = document.getElementById("medDocCategorySelect");
      let category = select.value;

      if (category === "__other__") {
        category = document.getElementById("medDocOtherLabel").value.trim();
        if (!category) {
          alert("Enter a custom document type before uploading.");
          e.target.value = "";
          return;
        }
      }

      const ext = file.name.split(".").pop().toLowerCase();
      if (!MED_HEADER_ALLOWED_EXTS.includes(ext)) {
        alert("This file type isn't supported. Upload a PDF, JPEG, PNG or TIFF file.");
        e.target.value = "";
        return;
      }

      // Stages the file as an already-tagged, committed row in the flat
      // in-progress list — same as tagging a dropzone upload via the
      // category select — instead of writing straight into
      // rec.documents. It only moves into the grouped/accordion view once
      // the user clicks Save Files.
      medUploadSeq++;
      medUploadFiles.push({ id: "mu-" + medUploadSeq, file, category, committed: true, uploadedBy: "you" });

      document.getElementById("medDocOtherField").classList.add("hidden");
      document.getElementById("medDocOtherLabel").value = "";
      e.target.value = "";
      renderMedUploadList();
      renderMedUploadPreview();
      updateMedUploadCount();
    });

    /* ============ Stage 1 Document Upload widget ============ */
    let medUploadFiles = [];
    let medUploadSelectedId = null;
    let medUploadSeq = 0;
    const MED_ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "docx"];

    function medUploadAddFiles(fileList) {
      [...fileList].forEach(file => {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!MED_ALLOWED_EXTS.includes(ext)) return;
        medUploadSeq++;
        medUploadFiles.push({ id: "mu-" + medUploadSeq, file, category: "" });
      });
      renderMedUploadList();
      updateMedUploadCount();
    }

    // DOM-building helpers for the document row list (createElement, not
    // innerHTML strings). Rows are keyed by dataset.id (a file id) — the
    // Remove/Delete button deliberately omits data-action to distinguish it
    // from the View/Download/Delete-on-committed-row actions.
    function makeMedDocIconBtn(className, action, id, label, pathD) {
      const btn = document.createElement("button");
      btn.className = className;
      btn.type = "button";
      if (action) btn.dataset.action = action;
      btn.dataset.id = id;
      btn.title = label;
      btn.setAttribute("aria-label", label);
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pathD}</svg>`;
      return btn;
    }

    function buildMedDocRow(f) {
      const row = document.createElement("div");
      row.className = "ci-doc-row" + (medUploadSelectedId === f.id ? " selected" : "");
      row.dataset.id = f.id;
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.setAttribute("aria-label", "Preview " + f.file.name);

      const meta = document.createElement("div");
      meta.className = "ci-doc-meta";
      const nameRow = document.createElement("div");
      nameRow.className = "ci-doc-name-row";
      const name = document.createElement("div");
      name.className = "ci-doc-name";
      name.title = f.file.name;
      name.textContent = f.file.name;
      nameRow.appendChild(name);
      if (f.committed) {
        const badge = document.createElement("span");
        badge.className = "badge" + (f.uploadedBy === "you" ? " amber" : "");
        badge.textContent = f.uploadedBy === "you" ? "Uploaded by You" : "Received";
        nameRow.appendChild(badge);
      }
      const size = document.createElement("div");
      size.className = "ci-doc-size";
      size.textContent = formatFileSize(f.file.size);
      meta.append(nameRow, size);
      row.appendChild(meta);

      const select = document.createElement("select");
      select.className = "ci-doc-select";
      select.dataset.id = f.id;
      if (!f.committed) {
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.selected = !f.category;
        placeholder.disabled = true;
        placeholder.textContent = "— Tag as category —";
        select.appendChild(placeholder);
      }
      const catOptions = DOCUMENT_CATEGORIES.includes(f.category) || !f.category ? DOCUMENT_CATEGORIES : [f.category, ...DOCUMENT_CATEGORIES];
      catOptions.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        opt.selected = f.category === c;
        select.appendChild(opt);
      });
      row.appendChild(select);

      if (f.committed) {
        row.appendChild(makeMedDocIconBtn("icon-btn", "view-staged-doc", f.id, "View " + f.file.name,
          '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>'));
        row.appendChild(makeMedDocIconBtn("icon-btn", "download-staged-doc", f.id, "Download " + f.file.name,
          '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="M12 4v12"/><path d="M8 11l4 4 4-4"/>'));
        if (f.uploadedBy !== "received") {
          row.appendChild(makeMedDocIconBtn("row-remove-btn", "delete-staged-doc", f.id, "Delete " + f.file.name,
            '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
        }
      } else {
        row.appendChild(makeMedDocIconBtn("row-remove-btn", null, f.id, "Remove " + f.file.name,
          '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
      }

      return row;
    }

    // The Save Files bar only makes sense once there's something
    // tagged-but-unsaved to commit — stays hidden otherwise instead of
    // sitting there as a dead button.
    function updateMedUploadSaveBarVisibility() {
      const bar = document.getElementById("medUploadDocSaveBar");
      if (!bar) return;
      const hasUnsaved = medUploadFiles.some(f => f.committed && !f.saved);
      bar.classList.toggle("hidden", !hasUnsaved);
    }

    function renderMedUploadList() {
      const list = document.getElementById("medUploadDocList");
      list.textContent = "";
      medUploadFiles.forEach(f => list.appendChild(buildMedDocRow(f)));
      updateMedUploadSaveBarVisibility();

      list.querySelectorAll(".ci-doc-row").forEach(row => {
        const activate = () => {
          medUploadSelectedId = row.dataset.id;
          renderMedUploadList();
          renderMedUploadPreview();
        };
        row.addEventListener("click", e => {
          if (e.target.closest("select") || e.target.closest("button")) return;
          activate();
        });
        row.addEventListener("keydown", e => {
          if (e.target.closest("select") || e.target.closest("button")) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        });
      });
      list.querySelectorAll(".ci-doc-select").forEach(sel => {
        sel.addEventListener("click", e => e.stopPropagation());
        sel.addEventListener("change", () => {
          const f = medUploadFiles.find(x => x.id === sel.dataset.id);
          if (!f || !sel.value) return;
          // Tagging marks the file committed locally (badge + icon-button
          // View/Download/Delete instead of the plain "Remove") — it no
          // longer writes into rec.documents or the grouped/accordion view
          // immediately. That write only happens when the user clicks
          // Save Files (see saveMedUploadFiles below).
          f.category = sel.value;
          f.committed = true;
          f.uploadedBy = "you";
          renderMedUploadList();
          renderMedUploadPreview();
          updateMedUploadCount();
        });
      });
      list.querySelectorAll('.row-remove-btn[data-id]:not([data-action])').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          medUploadFiles = medUploadFiles.filter(x => x.id !== btn.dataset.id);
          if (medUploadSelectedId === btn.dataset.id) { medUploadSelectedId = null; }
          renderMedUploadList();
          renderMedUploadPreview();
          updateMedUploadCount();
        });
      });
      list.querySelectorAll('button[data-action="view-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const f = medUploadFiles.find(x => x.id === btn.dataset.id);
          if (!f) return;
          medUploadSelectedId = f.id;
          renderMedUploadList();
          renderMedUploadPreview();
        });
      });
      list.querySelectorAll('button[data-action="download-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const f = medUploadFiles.find(x => x.id === btn.dataset.id);
          if (!f) return;
          const url = URL.createObjectURL(f.file);
          const a = document.createElement("a");
          a.href = url; a.download = f.file.name; document.body.appendChild(a); a.click(); a.remove();
        });
      });
      list.querySelectorAll('button[data-action="delete-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const f = medUploadFiles.find(x => x.id === btn.dataset.id);
          const rec = entries.find(x => x.inwardId === medicoTargetId);
          if (f && f.saved && rec && rec.documents && rec.documents[f.category]) {
            const idx = rec.documents[f.category].indexOf(f.savedDocEntry);
            if (idx !== -1) rec.documents[f.category].splice(idx, 1);
            if (!rec.documents[f.category].length) delete rec.documents[f.category];
          }
          medUploadFiles = medUploadFiles.filter(x => x.id !== btn.dataset.id);
          if (medUploadSelectedId === btn.dataset.id) { medUploadSelectedId = null; }
          renderMedUploadList();
          renderMedUploadPreview();
          updateMedUploadCount();
          renderMedGroupedList();
        });
      });

      // Wrap each row's freshly-rendered .ci-doc-select as a
      // searchable-select, same post-build wiring step as the row's other
      // listeners above.
      initSearchableSelectsIn(list);
    }

    // Rebuilds medUploadFiles from a record's already-saved rec.documents —
    // every document, received or uploaded via any entry point, renders
    // as a row here (there is no separate top-of-card list anymore).
    // Needed because re-opening the wizard for a claim whose documents
    // were set/committed on an earlier visit would otherwise show an
    // empty panel despite the documents being safely saved in
    // rec.documents.
    function rehydrateMedUploadList(rec) {
      medUploadFiles = [];
      medUploadSelectedId = null;
      renderMedUploadList();
      renderMedUploadPreview();
      updateMedUploadCount();
      renderMedGroupedList();
    }

    /* Commits every currently-tagged-but-unsaved file (f.committed &&
       !f.saved) into rec.documents, then removes it from the flat
       in-progress list — it now only shows in the grouped/accordion view
       below, matching an already-attached/received document exactly. */
    function saveMedUploadFiles() {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      const toSave = medUploadFiles.filter(f => f.committed && !f.saved);
      if (!toSave.length) return;
      toSave.forEach(f => {
        f.saved = true;
        // Appends to the category's array instead of overwriting — a
        // category can already hold earlier saved/received files, and
        // adding another shouldn't delete them.
        if (rec) {
          const docEntry = { fileName: f.file.name, fileSize: formatFileSize(f.file.size), file: f.file, uploadedBy: "you", uploadedAt: Date.now() };
          f.savedDocEntry = docEntry;
          rec.documents = rec.documents || {};
          rec.documents[f.category] = rec.documents[f.category] || [];
          rec.documents[f.category].push(docEntry);
        }
      });
      medUploadFiles = medUploadFiles.filter(f => !f.saved);
      if (medUploadSelectedId && !medUploadFiles.some(f => f.id === medUploadSelectedId)) medUploadSelectedId = null;
      renderMedUploadList();
      renderMedUploadPreview();
      updateMedUploadCount();
      renderMedGroupedList();
      if (rec) renderMedicoDocCategoryOptions(rec);
    }

    document.getElementById("medUploadSaveBtn").addEventListener("click", saveMedUploadFiles);

    /* Grouped/accordion view of already-attached documents, shown below
       the upload footer (#medUploadGroupedList) — separate from the flat
       dropzone list above so freshly-added-this-session uploads keep
       behaving exactly as before. Every committed file is grouped by its
       tagged category, one collapsible accordion section per category.
       Files uploaded by the current user get View/Download/Delete; files
       received/uploaded by someone else get View/Download only. */
    const medGroupedCollapsed = {};

    function buildMedGroupedFileRow(f) {
      const row = document.createElement("div");
      row.className = "ci-doc-row ci-doc-row--grouped";
      row.dataset.id = f.id;

      // Filename on its own line (ellipsis if too long to fit), with size
      // + status badge on a second line below it — keeps a long filename
      // from crowding out the size/badge/actions on a single row.
      const meta = document.createElement("div");
      meta.className = "ci-doc-meta";
      const name = document.createElement("div");
      name.className = "ci-doc-name";
      name.title = f.file.name;
      name.textContent = f.file.name;
      meta.appendChild(name);

      const metaRow2 = document.createElement("div");
      metaRow2.className = "ci-doc-meta-row2";
      const size = document.createElement("div");
      size.className = "ci-doc-size";
      size.textContent = formatFileSize(f.file.size);
      metaRow2.appendChild(size);

      const badge = document.createElement("span");
      badge.className = "badge" + (f.uploadedBy === "you" ? " amber" : "");
      badge.textContent = f.uploadedBy === "you" ? "Uploaded by You" : "Received";
      metaRow2.appendChild(badge);

      if (f.uploadedAt) {
        const stamp = document.createElement("div");
        stamp.className = "ci-doc-timestamp";
        stamp.textContent = typeof fmtDateTime === "function" ? fmtDateTime(f.uploadedAt) : new Date(f.uploadedAt).toLocaleString();
        metaRow2.appendChild(stamp);
      }
      meta.appendChild(metaRow2);
      row.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "ci-doc-actions";
      actions.appendChild(makeMedDocIconBtn("icon-btn", "view-staged-doc", f.id, "View " + f.file.name,
        '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>'));
      actions.appendChild(makeMedDocIconBtn("icon-btn", "download-staged-doc", f.id, "Download " + f.file.name,
        '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="M12 4v12"/><path d="M8 11l4 4 4-4"/>'));
      if (f.uploadedBy === "you") {
        actions.appendChild(makeMedDocIconBtn("row-remove-btn", "delete-staged-doc", f.id, "Delete " + f.file.name,
          '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
      }
      row.appendChild(actions);
      return row;
    }

    // Reads the current saved-documents map for the active Medico record.
    function medSavedDocsMap() {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      return (rec && rec.documents) || {};
    }

    function renderMedGroupedList() {
      const container = document.getElementById("medUploadGroupedList");
      if (!container) return;
      const docs = medSavedDocsMap();
      // Both received/pre-existing docs and files uploaded by the current
      // user in this session share this one grouped view now — there is
      // no separate flat pre-uploaded card anymore.
      const cats0 = Object.keys(docs).filter(c => docs[c] && docs[c].length);
      if (!cats0.length) { container.innerHTML = ""; container.classList.add("hidden"); return; }
      container.classList.remove("hidden");

      const byCategory = {};
      cats0.forEach(cat => {
        // Sorted for display only (newest upload first) — the id keeps
        // referring to the doc's original position in docs[cat] so
        // View/Download/Delete still target the right one regardless of
        // display order.
        byCategory[cat] = docs[cat]
          .map((doc, i) => ({ id: cat + "::" + i, category: cat, index: i, file: doc.file, uploadedBy: doc.uploadedBy, uploadedAt: doc.uploadedAt || 0 }))
          .sort((a, b) => b.uploadedAt - a.uploadedAt);
      });
      const cats = DOCUMENT_CATEGORIES.filter(c => byCategory[c])
        .concat(cats0.filter(c => !DOCUMENT_CATEGORIES.includes(c)));

      container.textContent = "";
      const subhead = document.createElement("div");
      subhead.className = "section-subhead";
      subhead.textContent = "Attached Documents";
      container.appendChild(subhead);
      const accordion = document.createElement("div");
      accordion.className = "ci-doc-accordion";
      container.appendChild(accordion);
      cats.forEach(cat => {
        const group = byCategory[cat];
        const collapsed = medGroupedCollapsed[cat] !== false;
        const section = document.createElement("div");
        section.className = "ci-doc-accordion-section" + (collapsed ? "" : " expanded");
        section.dataset.category = cat;

        const head = document.createElement("button");
        head.type = "button";
        head.className = "ci-doc-accordion-head";
        head.setAttribute("aria-expanded", String(!collapsed));

        const title = document.createElement("span");
        title.className = "ci-doc-accordion-title";
        title.textContent = cat;
        head.appendChild(title);

        const count = document.createElement("span");
        count.className = "ci-doc-accordion-count";
        count.textContent = String(group.length);
        head.appendChild(count);

        const chevronNs = "http://www.w3.org/2000/svg";
        const chevron = document.createElementNS(chevronNs, "svg");
        chevron.setAttribute("class", "ci-doc-accordion-chevron");
        chevron.setAttribute("viewBox", "0 0 24 24");
        chevron.setAttribute("width", "16");
        chevron.setAttribute("height", "16");
        chevron.setAttribute("fill", "none");
        chevron.setAttribute("stroke", "currentColor");
        chevron.setAttribute("stroke-width", "2");
        const polyline = document.createElementNS(chevronNs, "polyline");
        polyline.setAttribute("points", "6 9 12 15 18 9");
        chevron.appendChild(polyline);
        head.appendChild(chevron);

        head.addEventListener("click", () => {
          const nowCollapsed = section.classList.contains("expanded");
          medGroupedCollapsed[cat] = nowCollapsed;
          section.classList.toggle("expanded", !nowCollapsed);
          head.setAttribute("aria-expanded", String(!nowCollapsed));
          body.classList.toggle("hidden", nowCollapsed);
        });
        section.appendChild(head);

        const body = document.createElement("div");
        body.className = "ci-doc-accordion-body" + (collapsed ? " hidden" : "");
        group.forEach(f => body.appendChild(buildMedGroupedFileRow(f)));
        section.appendChild(body);

        accordion.appendChild(section);
      });

      function parseGroupedId(id) {
        const sep = id.lastIndexOf("::");
        return { category: id.slice(0, sep), index: Number(id.slice(sep + 2)) };
      }

      accordion.querySelectorAll('button[data-action="view-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const ref = parseGroupedId(btn.dataset.id);
          const doc = docs[ref.category] && docs[ref.category][ref.index];
          if (!doc) return;
          window.open(URL.createObjectURL(doc.file), "_blank", "noopener");
        });
      });
      accordion.querySelectorAll('button[data-action="download-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const ref = parseGroupedId(btn.dataset.id);
          const doc = docs[ref.category] && docs[ref.category][ref.index];
          if (!doc) return;
          const url = URL.createObjectURL(doc.file);
          const a = document.createElement("a");
          a.href = url; a.download = doc.file.name; document.body.appendChild(a); a.click(); a.remove();
        });
      });
      accordion.querySelectorAll('button[data-action="delete-staged-doc"]').forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const ref = parseGroupedId(btn.dataset.id);
          if (docs[ref.category]) {
            docs[ref.category].splice(ref.index, 1);
            if (!docs[ref.category].length) delete docs[ref.category];
          }
          renderMedGroupedList();
          updateMedUploadCount();
          const rec = entries.find(x => x.inwardId === medicoTargetId);
          if (rec) renderMedicoDocCategoryOptions(rec);
        });
      });
    }

    function renderMedUploadPreview() {
      const empty = document.getElementById("medUploadPreviewEmpty");
      const body = document.getElementById("medUploadPreviewBody");
      const f = medUploadFiles.find(x => x.id === medUploadSelectedId);
      if (!f) { empty.classList.remove("hidden"); body.classList.add("hidden"); return; }
      empty.classList.add("hidden"); body.classList.remove("hidden");
      document.getElementById("medUploadPreviewName").textContent = f.file.name;
      const ext = f.file.name.split(".").pop().toLowerCase();
      const url = URL.createObjectURL(f.file);
      const frame = document.getElementById("medUploadPreviewFrame");
      if (["jpg", "jpeg", "png"].includes(ext)) {
        frame.innerHTML = `<img src="${url}" alt="${f.file.name}">`;
      } else if (ext === "pdf") {
        frame.innerHTML = `<iframe src="${url}"></iframe>`;
      } else {
        frame.innerHTML = `<span class="ci-no-preview">Preview not available for .${ext} files.</span>`;
      }
      const newTabBtn = document.getElementById("medUploadPreviewNewTab");
      if (newTabBtn) newTabBtn.onclick = () => window.open(url, "_blank", "noopener");
    }

    // Counts saved documents (rec.documents) against the mandatory target —
    // a file only counts once it's been through Save Files, not the
    // moment it's tagged, matching the grouped/accordion view it feeds.
    function updateMedUploadCount() {
      const docs = medSavedDocsMap();
      const total = Object.keys(docs).filter(c => docs[c] && docs[c].length).length;
      document.getElementById("medUploadMandatoryCount").textContent = Math.min(total, 5) + " / 5 mandatory documents uploaded";
    }

    const medDropzone = document.getElementById("medUploadDropzone");
    const medFileInput = document.getElementById("medUploadFileInput");
    medDropzone.addEventListener("click", () => medFileInput.click());
    medFileInput.addEventListener("change", e => { if (e.target.files.length) medUploadAddFiles(e.target.files); medFileInput.value = ""; });
    ["dragenter", "dragover"].forEach(evt => medDropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); medDropzone.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach(evt => medDropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); medDropzone.classList.remove("dragover"); }));
    medDropzone.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files.length) medUploadAddFiles(e.dataTransfer.files); });
    document.getElementById("medBulkUploadBtn").addEventListener("click", () => medFileInput.click());

    // Builds a minimal single-page PDF (no library — hand-written PDF
    // object structure) from plain text lines, one per line at 14pt
    // leading. No external assets/fonts: uses the built-in Helvetica.
    function buildSimplePdf(lines) {
      const esc = s => String(s).replace(/[\\()]/g, c => "\\" + c);
      const streamLines = lines.map((l, i) => `${i === 0 ? "72 720 Td" : "0 -20 Td"} (${esc(l)}) Tj`).join("\n");
      const stream = `BT\n/F1 12 Tf\n${streamLines}\nET`;
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      ];
      let pdf = "%PDF-1.4\n";
      const offsets = [0];
      objects.forEach((obj, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
      });
      const xrefStart = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (let i = 1; i <= objects.length; i++) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
      return pdf;
    }

    // Policy Documents — no real document store to pull from, so this
    // downloads a dummy placeholder PDF, same blob+temp-anchor pattern
    // as the staged-upload "download-staged-doc" action above.
    document.getElementById("policyDocumentsBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      const claimId = rec ? rec.claimId : medicoTargetId;
      const pdf = buildSimplePdf([
        "Policy Documents",
        `Claim: ${claimId}`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "This is a placeholder policy document.",
      ]);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Policy-Documents-${claimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // ---------------- Penny Drop Bank Account Status (part of card-medpayment) ----------------
    // Per the CP-Screen Matrix (Basic Details > Penny Drop Account Status):
    // all display fields (Name, IFSC Code, Bank Name, Account Number,
    // Account Type, Account Status) are read-only for every role. By Pass
    // Penny Drop Validation, Is KYC Submitted?, Is NEFT Doc Submitted? are
    // editable for Non Medico only — Medico reads them. Payment Auditor has
    // no access to this screen at all (enforced by the existing whole-wizard
    // applyPaymentAuditorViewMode() disable pass).
    function renderPennyDropSection(rec) {
      const DUMMY_PAYMENT = PAYMENT_DIRECTORY[0];
      if (!rec.payments || rec.payments.length === 0) {
        rec.payments = [{ ...DUMMY_PAYMENT }];
      }
      const p = rec.payments[0];
      document.getElementById("pdName").value = p.payeeName || "-";
      document.getElementById("pdIfscCode").value = p.ifscCode || "-";
      document.getElementById("pdBankName").value = p.bankName || "-";
      document.getElementById("pdAccountNo").value = p.accountNo || "-";
      document.getElementById("pdAccountType").value = p.accountType || "-";

      if (typeof rec.pennyDropVerified === "undefined") rec.pennyDropVerified = true;
      // pennyDropBtn stays checked once a verification attempt has run,
      // whether it succeeded or failed — only "never checked" leaves it
      // unchecked (pennyDropVerified === false and no failure on record).
      document.getElementById("pennyDropBtn").checked = rec.pennyDropVerified || !!rec.pennyDropFailed;
      const status = document.getElementById("pdAccountStatus");
      const res = document.getElementById("pennyDropResult");
      status.classList.remove("pd-status--success", "pd-status--pending", "pd-status--failed");
      res.classList.remove("show", "field-note--success", "field-note--danger");
      if (rec.pennyDropVerified) {
        status.classList.add("pd-status--success");
        status.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>Verified`;
      } else if (rec.pennyDropFailed) {
        status.classList.add("pd-status--failed");
        status.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18"/></svg>Failed`;
        res.classList.add("show", "field-note--danger");
        res.textContent = "Verification failed — Account Number / IFSC Code does not match bank records";
      } else {
        status.classList.add("pd-status--pending");
        status.textContent = "Not Verified";
      }
    }

    const MED_PENNY_DROP_FIELD_ACCESS = {
      pdBypassValidation: { nonMedico: true, medico: false },
      pdBypassConsent: { nonMedico: true, medico: true },
      pdBypassReason: { nonMedico: true, medico: false },
      pdBypassRemarks: { nonMedico: true, medico: false },
      pdKycSubmitted: { nonMedico: true, medico: false },
      pdNeftDocSubmitted: { nonMedico: true, medico: false },
    };
    function applyPennyDropAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_PENNY_DROP_FIELD_ACCESS);
    }

    // Verify Penny Drop is a checkbox (matrix control type is a button, but
    // per request it's rendered as a checkbox here — checking it triggers
    // the same penny-drop verification result the button used to). Stays
    // checked either way — a failed verification means the account couldn't
    // be confirmed, not that the check never happened.
    document.getElementById("pennyDropBtn").addEventListener("change", (e) => {
      const cb = e.target;
      const status = document.getElementById("pdAccountStatus");
      const res = document.getElementById("pennyDropResult");
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!cb.checked) {
        if (rec) { rec.pennyDropVerified = false; rec.pennyDropFailed = false; rec.pennyDropVerifiedBy = ""; }
        status.classList.remove("pd-status--success", "pd-status--failed");
        status.classList.add("pd-status--pending");
        status.innerHTML = "Not Verified";
        res.textContent = "";
        res.classList.remove("show");
        return;
      }
      cb.disabled = true;
      status.classList.remove("pd-status--success", "pd-status--pending", "pd-status--failed");
      status.textContent = "Checking…";
      setTimeout(() => {
        cb.disabled = false;
        cb.checked = true;
        const p = rec && rec.payments && rec.payments[0];
        const isValid = !!(p && PAYMENT_DIRECTORY.some(d => d.accountNo === p.accountNo && d.ifscCode === p.ifscCode));

        if (rec) { rec.pennyDropVerified = isValid; rec.pennyDropFailed = !isValid; rec.pennyDropVerifiedBy = getCurrentRole(); }
        res.classList.add("show");
        if (isValid) {
          status.classList.add("pd-status--success");
          status.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>Verified`;
          res.classList.remove("field-note--danger");
          res.classList.add("field-note--success");
          res.textContent = "₹1 credited & confirmed — Account valid";
        } else {
          status.classList.add("pd-status--failed");
          status.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18"/></svg>Failed`;
          res.classList.remove("field-note--success");
          res.classList.add("field-note--danger");
          res.textContent = "Verification failed — Account Number / IFSC Code does not match bank records";
        }
      }, 1400);
    });

    // By Pass Penny Drop Validation checkbox — records who bypassed
    // verification plus the reason/remarks already captured in the two
    // adjacent textareas, feeding the read-only Penny Drop Summary card
    // Payment Auditor sees on Settlement (Payment Auditor has no access
    // to this section itself, per applyPaymentAuditorViewMode()).
    document.getElementById("pdBypassValidation").addEventListener("change", (e) => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      if (e.target.checked) {
        rec.pennyDropBypassedBy = getCurrentRole();
        rec.pennyDropBypassReason = document.getElementById("pdBypassReason").value;
        rec.pennyDropBypassRemarks = document.getElementById("pdBypassRemarks").value;
      } else {
        rec.pennyDropBypassedBy = "";
      }
    });
    document.getElementById("pdBypassReason").addEventListener("input", (e) => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec && rec.pennyDropBypassedBy) rec.pennyDropBypassReason = e.target.value;
    });
    document.getElementById("pdBypassRemarks").addEventListener("input", (e) => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec && rec.pennyDropBypassedBy) rec.pennyDropBypassRemarks = e.target.value;
    });
    // PREVIOUS_CLAIMS_MOCK / PREVIOUS_CLAIMS_STATUS_CLASS come from
    // shared/shared-components.js, alongside HOSPITAL_MASTER etc.
    document.getElementById("pdViewPreviousClaimsBtn").addEventListener("click", () => {
      const body = document.getElementById("prevClaimsBody");
      body.innerHTML = PREVIOUS_CLAIMS_MOCK.map(c => `
    <tr>
      <td class="mono">${c.claimNo}</td>
      <td>${c.intimationDate}</td>
      <td>${c.hospital}</td>
      <td>${c.claimType || "-"}</td>
      <td class="strong">${c.claimedAmt}</td>
      <td><span class="status-badge ${PREVIOUS_CLAIMS_STATUS_CLASS[c.status] || "st-inactive"}">${c.status}</span></td>
    </tr>
  `).join("");
      document.getElementById("prevClaimsModal").classList.add("show");
    });
    document.getElementById("prevClaimsCloseBtn").addEventListener("click", () => {
      document.getElementById("prevClaimsModal").classList.remove("show");
    });
    document.getElementById("prevClaimsCloseX").addEventListener("click", () => {
      document.getElementById("prevClaimsModal").classList.remove("show");
    });
    document.getElementById("pdProposerExpired").addEventListener("change", (e) => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec) rec.proposerExpired = e.target.checked;
    });

    function renderPaymentGrid(rec) {
      const body = document.getElementById("paymentGridBody");
      const payments = rec.payments || [];
      document.getElementById("paymentEmptyState").classList.toggle("hidden", payments.length > 0);

      body.innerHTML = payments.map(p => `
    <tr>
      <td class="mono">${p.neftCode || "-"}</td>
      <td>${p.paymentMode || "-"}</td>
      <td class="strong">${p.payeeName || "-"}</td>
      <td class="mono">${p.accountNo || "-"}</td>
      <td>${p.accountType || "-"}</td>
      <td>${p.bankName || "-"}</td>
      <td>${p.branchName || "-"}</td>
      <td class="mono">${p.ifscCode || "-"}</td>
      <td class="mono">${p.panNo || "-"}</td>
      <td>${p.emailId || "-"}</td>
      <td>${p.source || "-"}</td>
    </tr>
  `).join("");
    }

    let paymentSelectedExisting = null;
    let pmMatchedRecord = null;

    function resetPaymentModal() {
      paymentSelectedExisting = null;
      pmMatchedRecord = null;
      ["pmNeftCode", "pmPayeeName", "pmAccountNo", "pmBankName", "pmBranchName", "pmIfscCode", "pmPanNo", "pmEmailId"].forEach(id => {
        document.getElementById(id).value = "";
      });
      document.getElementById("pmPaymentMode").selectedIndex = 0;
      document.getElementById("pmAccountType").selectedIndex = 0;
      refreshSearchableSelectLabel("pmPaymentMode");
      refreshSearchableSelectLabel("pmAccountType");
      renderExistingPayeeList();
    }

    function renderExistingPayeeList() {
      const list = document.getElementById("existingPayeeList");
      list.innerHTML = PAYMENT_DIRECTORY.map((p, i) => `
    <label class="assign-option ${paymentSelectedExisting === i ? "selected" : ""}" data-idx="${i}">
      <input type="radio" name="existingPayee" ${paymentSelectedExisting === i ? "checked" : ""}>
      <span class="assign-avatar">${initials(p.payeeName)}</span>
      <span class="assign-name">${p.payeeName} <span style="color:var(--muted);font-weight:500;">- ${p.bankName}, A/C ${p.accountNo}</span></span>
    </label>
  `).join("");

      list.querySelectorAll(".assign-option").forEach(opt => {
        opt.addEventListener("click", () => {
          paymentSelectedExisting = Number(opt.dataset.idx);
          const p = PAYMENT_DIRECTORY[paymentSelectedExisting];
          document.getElementById("pmNeftCode").value = p.neftCode;
          document.getElementById("pmPaymentMode").value = p.paymentMode;
          document.getElementById("pmPayeeName").value = p.payeeName;
          document.getElementById("pmAccountNo").value = p.accountNo;
          document.getElementById("pmAccountType").value = p.accountType;
          document.getElementById("pmBankName").value = p.bankName;
          document.getElementById("pmBranchName").value = p.branchName;
          document.getElementById("pmIfscCode").value = p.ifscCode;
          document.getElementById("pmPanNo").value = p.panNo;
          document.getElementById("pmEmailId").value = p.emailId;
          refreshSearchableSelectLabel("pmPaymentMode");
          refreshSearchableSelectLabel("pmAccountType");
          renderExistingPayeeList();
        });
      });
    }

    document.getElementById("addPaymentBtn").addEventListener("click", () => {
      const currentRole = getCurrentRole();
      const isNonMedico = currentRole === "Non Medico" || currentRole === "Non Medico TL";
      if (isNonMedico) {
        ["fsNeftCode", "fsPayeeName", "fsAccountNo", "fsBankName", "fsBranchName", "fsIfscCode", "fsPanNo", "fsEmailId", "fsNeftRemark"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("fsPaymentMode").selectedIndex = 0;
        document.getElementById("fsAccountType").selectedIndex = 0;
        refreshSearchableSelectLabel("fsPaymentMode");
        refreshSearchableSelectLabel("fsAccountType");
        document.getElementById("fsVerifyResult").style.display = "none";
        document.getElementById("fsVerifyRecordsCards").innerHTML = "";
        fsMatchedRecord = null;
        appShell.classList.add("hidden");
        document.getElementById("viewAddPayment").classList.remove("hidden");
        window.scrollTo(0, 0);
      } else {
        resetPaymentModal();
        document.getElementById("verifyRecordsResult").classList.remove("show");
        document.getElementById("verifyRecordsCards").innerHTML = "";
        document.getElementById("paymentModal").classList.add("show");
      }
    });
    document.getElementById("paymentModalCloseX").addEventListener("click", () => {
      document.getElementById("paymentModal").classList.remove("show");
    });
    document.getElementById("paymentModalCancelBtn").addEventListener("click", () => {
      document.getElementById("paymentModal").classList.remove("show");
    });

    // Account No is purely numeric in this data model (see PAYMENT_DIRECTORY) —
    // strip any non-digit characters as the user types.
    document.getElementById("pmAccountNo").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });

    document.getElementById("paymentGridVerifyBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      const res = document.getElementById("paymentGridVerifyResult");
      res.style.display = "inline-flex";
      if (!rec || !rec.payments || rec.payments.length === 0) {
        res.style.color = "var(--muted)";
        res.textContent = "No payment details to verify yet.";
        return;
      }
      const p = rec.payments[0];
      const matchInDirectory = PAYMENT_DIRECTORY.find(d => d.accountNo === p.accountNo || d.panNo === p.panNo);
      const matchInClaims = entries.some(e => e.inwardId !== medicoTargetId && (e.payments || []).some(d => d.accountNo === p.accountNo));
      if (matchInDirectory || matchInClaims) {
        res.style.color = "var(--warn)";
        res.innerHTML = `⚠ Match found in existing records${matchInDirectory ? " — payee already on file" : ""}${matchInClaims ? " — account used on another claim" : ""}. Saved details are still valid.`;
      } else {
        res.style.color = "var(--success-dark)";
        res.textContent = "✓ No conflicts — payment details are unique across all existing records.";
      }
    });

    // Full-screen payment view wiring
    function closeFsPaymentView() {
      document.getElementById("viewAddPayment").classList.add("hidden");
      appShell.classList.remove("hidden");
      window.scrollTo(0, 0);
    }

    ["backFromAddPaymentBtn", "fsPaymentCancelBtn"].forEach(id => {
      document.getElementById(id).addEventListener("click", closeFsPaymentView);
    });

    // Account No is purely numeric in this data model (see PAYMENT_DIRECTORY) —
    // strip any non-digit characters as the user types.
    document.getElementById("fsAccountNo").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });

    let fsMatchedRecord = null;

    function applyFsMatchedRecord() {
      if (!fsMatchedRecord) return;
      const p = fsMatchedRecord;
      document.getElementById("fsNeftCode").value = p.neftCode || "";
      document.getElementById("fsPaymentMode").value = p.paymentMode || "NEFT";
      document.getElementById("fsPayeeName").value = p.payeeName || "";
      document.getElementById("fsAccountNo").value = p.accountNo || "";
      document.getElementById("fsAccountType").value = p.accountType || "Savings";
      document.getElementById("fsBankName").value = p.bankName || "";
      document.getElementById("fsBranchName").value = p.branchName || "";
      document.getElementById("fsIfscCode").value = p.ifscCode || "";
      document.getElementById("fsPanNo").value = p.panNo || "";
      document.getElementById("fsEmailId").value = p.emailId || "";
      refreshSearchableSelectLabel("fsPaymentMode");
      refreshSearchableSelectLabel("fsAccountType");
    }

    // "Use this Record" is rendered inside fsVerifyRecordsCards' innerHTML
    // (see the match-found branch below), so it's re-created every verify
    // click — delegate the click instead of binding it directly.
    document.getElementById("fsVerifyRecordsCards").addEventListener("click", (e) => {
      if (e.target.closest("#fsUseMatchedRecordBtn")) applyFsMatchedRecord();
    });

    document.getElementById("fsVerifyWithRecordsBtn").addEventListener("click", () => {
      const accNo = document.getElementById("fsAccountNo").value.trim();
      const payeeName = document.getElementById("fsPayeeName").value.trim();
      const panNo = document.getElementById("fsPanNo").value.trim();
      const res = document.getElementById("fsVerifyResult");
      const cards = document.getElementById("fsVerifyRecordsCards");
      res.style.display = "inline-block";
      fsMatchedRecord = null;
      let matchInDir = PAYMENT_DIRECTORY.find(p => (accNo && p.accountNo === accNo) || (panNo && p.panNo === panNo) || (payeeName && p.payeeName.toLowerCase() === payeeName.toLowerCase()));
      const matchingClaims = entries.filter(e => e.inwardId !== medicoTargetId && (e.payments || []).some(p => (accNo && p.accountNo === accNo) || (panNo && p.panNo === panNo)));

      if (!matchInDir && matchingClaims.length === 0 && accNo) {
        if (verifiedAccountNumbers.has(accNo)) {
          matchInDir = buildDummyMatch(accNo);
        } else {
          verifiedAccountNumbers.add(accNo);
        }
      }

      if (matchInDir || matchingClaims.length > 0) {
        res.style.color = "var(--warn)";
        res.textContent = `⚠ Match found${matchInDir ? " — payee already on file" : ""}${matchingClaims.length ? " — account used on another claim" : ""}. You can still save.`;

        let cardsHtml = "";
        if (matchInDir) {
          cardsHtml += `
            <div class="verify-match-card">
              <div class="verify-match-title">Existing Payee on Record</div>
              <div class="verify-match-grid">
                <span>Payee Name</span><span>${matchInDir.payeeName}</span>
                <span>Account No</span><span>${matchInDir.accountNo}</span>
                <span>Account Type</span><span>${matchInDir.accountType}</span>
                <span>Bank Name</span><span>${matchInDir.bankName}</span>
                <span>Branch Name</span><span>${matchInDir.branchName}</span>
                <span>IFSC Code</span><span>${matchInDir.ifscCode}</span>
                <span>PAN No</span><span>${matchInDir.panNo}</span>
              </div>
              <button class="btn btn-primary verify-match-use-btn" id="fsUseMatchedRecordBtn" type="button">Use this Record</button>
            </div>`;
        }

        matchingClaims.forEach(e => {
          const p = (e.payments || []).find(x => (accNo && x.accountNo === accNo) || (panNo && x.panNo === panNo));
          if (!p) return;
          cardsHtml += `
            <div class="verify-match-card">
              <div class="verify-match-title">Used on Claim: ${e.policyId || e.surakshaId || e.inwardId}</div>
              <div class="verify-match-grid">
                <span>Payee Name</span><span>${p.payeeName}</span>
                <span>Account No</span><span>${p.accountNo}</span>
                <span>Bank Name</span><span>${p.bankName}</span>
                <span>IFSC Code</span><span>${p.ifscCode}</span>
              </div>
              ${!matchInDir ? `<button class="btn btn-primary verify-match-use-btn" id="fsUseMatchedRecordBtn" type="button">Use this Record</button>` : ""}
            </div>`;
        });

        fsMatchedRecord = matchInDir || (() => {
          const e = matchingClaims[0];
          return e ? (e.payments || []).find(x => (accNo && x.accountNo === accNo) || (panNo && x.panNo === panNo)) : null;
        })();

        cards.innerHTML = cardsHtml;
      } else {
        res.style.color = "var(--success-dark)";
        res.textContent = "✓ No conflicts — details are unique across all records.";
        cards.innerHTML = "";
      }
    });

    document.getElementById("fsPaymentSaveBtn").addEventListener("click", () => {
      const payeeName = document.getElementById("fsPayeeName").value.trim();
      const accountNo = document.getElementById("fsAccountNo").value.trim();
      if (!payeeName || !accountNo) { alert("Payee Name and Account No are required."); return; }
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.payments = rec.payments || [];
      rec.payments.push({
        neftCode: document.getElementById("fsNeftCode").value.trim(),
        paymentMode: document.getElementById("fsPaymentMode").value,
        payeeName,
        accountNo,
        accountType: document.getElementById("fsAccountType").value,
        bankName: document.getElementById("fsBankName").value.trim(),
        branchName: document.getElementById("fsBranchName").value.trim(),
        ifscCode: document.getElementById("fsIfscCode").value.trim(),
        panNo: document.getElementById("fsPanNo").value.trim(),
        emailId: document.getElementById("fsEmailId").value.trim(),
        neftRemark: document.getElementById("fsNeftRemark").value.trim(),
      });
      renderPaymentGrid(rec);
      closeFsPaymentView();
    });

    function applyPmMatchedRecord() {
      if (!pmMatchedRecord) return;
      const p = pmMatchedRecord;
      document.getElementById("pmNeftCode").value = p.neftCode || "";
      document.getElementById("pmPaymentMode").value = p.paymentMode || "NEFT";
      document.getElementById("pmPayeeName").value = p.payeeName || "";
      document.getElementById("pmAccountNo").value = p.accountNo || "";
      document.getElementById("pmAccountType").value = p.accountType || "Savings";
      document.getElementById("pmBankName").value = p.bankName || "";
      document.getElementById("pmBranchName").value = p.branchName || "";
      document.getElementById("pmIfscCode").value = p.ifscCode || "";
      document.getElementById("pmPanNo").value = p.panNo || "";
      document.getElementById("pmEmailId").value = p.emailId || "";
      refreshSearchableSelectLabel("pmPaymentMode");
      refreshSearchableSelectLabel("pmAccountType");
    }

    // "Use this Record" is rendered inside verifyRecordsCards' innerHTML (see
    // the match-found branch below), so it's re-created every verify click —
    // delegate the click instead of binding it directly.
    document.getElementById("verifyRecordsCards").addEventListener("click", (e) => {
      if (e.target.closest("#useMatchedRecordBtn")) applyPmMatchedRecord();
    });

    document.getElementById("verifyWithRecordsBtn").addEventListener("click", () => {
      const accNo = document.getElementById("pmAccountNo").value.trim();
      const payeeName = document.getElementById("pmPayeeName").value.trim();
      const panNo = document.getElementById("pmPanNo").value.trim();
      const res = document.getElementById("verifyRecordsResult");
      const cards = document.getElementById("verifyRecordsCards");
      res.classList.add("show");
      pmMatchedRecord = null;

      let matchInDirectory = PAYMENT_DIRECTORY.find(p =>
        (accNo && p.accountNo === accNo) ||
        (panNo && p.panNo === panNo) ||
        (payeeName && p.payeeName.toLowerCase() === payeeName.toLowerCase())
      );
      const matchingClaims = entries.filter(e =>
        e.inwardId !== medicoTargetId && (e.payments || []).some(p =>
          (accNo && p.accountNo === accNo) || (panNo && p.panNo === panNo)
        )
      );

      if (!matchInDirectory && matchingClaims.length === 0 && accNo) {
        if (verifiedAccountNumbers.has(accNo)) {
          matchInDirectory = buildDummyMatch(accNo);
        } else {
          verifiedAccountNumbers.add(accNo);
        }
      }

      if (matchInDirectory || matchingClaims.length > 0) {
        res.style.color = "var(--warn)";
        res.textContent = `⚠ Match found${matchInDirectory ? " — payee already on file" : ""}${matchingClaims.length ? " — account used on another claim" : ""}. You can still save.`;

        let cardsHtml = "";
        if (matchInDirectory) {
          cardsHtml += `
            <div class="verify-match-card">
              <div class="verify-match-title">Existing Payee on Record</div>
              <div class="verify-match-grid">
                <span>Payee Name</span><span>${matchInDirectory.payeeName}</span>
                <span>Account No</span><span>${matchInDirectory.accountNo}</span>
                <span>Account Type</span><span>${matchInDirectory.accountType}</span>
                <span>Bank Name</span><span>${matchInDirectory.bankName}</span>
                <span>Branch Name</span><span>${matchInDirectory.branchName}</span>
                <span>IFSC Code</span><span>${matchInDirectory.ifscCode}</span>
                <span>PAN No</span><span>${matchInDirectory.panNo}</span>
              </div>
              <button class="btn btn-primary verify-match-use-btn" id="useMatchedRecordBtn" type="button">Use this Record</button>
            </div>`;
        }

        matchingClaims.forEach(e => {
          const p = (e.payments || []).find(x => (accNo && x.accountNo === accNo) || (panNo && x.panNo === panNo));
          if (!p) return;
          cardsHtml += `
            <div class="verify-match-card">
              <div class="verify-match-title">Used on Claim: ${e.policyId || e.surakshaId || e.inwardId}</div>
              <div class="verify-match-grid">
                <span>Payee Name</span><span>${p.payeeName}</span>
                <span>Account No</span><span>${p.accountNo}</span>
                <span>Bank Name</span><span>${p.bankName}</span>
                <span>IFSC Code</span><span>${p.ifscCode}</span>
              </div>
              ${!matchInDirectory ? `<button class="btn btn-primary verify-match-use-btn" id="useMatchedRecordBtn" type="button">Use this Record</button>` : ""}
            </div>`;
        });

        pmMatchedRecord = matchInDirectory || (() => {
          const e = matchingClaims[0];
          return e ? (e.payments || []).find(x => (accNo && x.accountNo === accNo) || (panNo && x.panNo === panNo)) : null;
        })();

        cards.innerHTML = cardsHtml;
      } else {
        res.style.color = "var(--success-dark)";
        res.textContent = `✓ No conflicts found — details are unique across all existing records.`;
        cards.innerHTML = "";
      }
    });

    document.getElementById("paymentModalSaveBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;

      const payeeName = document.getElementById("pmPayeeName").value.trim();
      const accountNo = document.getElementById("pmAccountNo").value.trim();
      if (!payeeName || !accountNo) {
        alert("Payee Name and Account No are required.");
        return;
      }

      const payment = {
        neftCode: document.getElementById("pmNeftCode").value.trim(),
        paymentMode: document.getElementById("pmPaymentMode").value,
        payeeName,
        accountNo,
        accountType: document.getElementById("pmAccountType").value,
        bankName: document.getElementById("pmBankName").value.trim(),
        branchName: document.getElementById("pmBranchName").value.trim(),
        ifscCode: document.getElementById("pmIfscCode").value.trim(),
        panNo: document.getElementById("pmPanNo").value.trim(),
        emailId: document.getElementById("pmEmailId").value.trim(),
      };

      rec.payments = rec.payments || [];
      rec.payments.push(payment);
      renderPaymentGrid(rec);

      document.getElementById("paymentModal").classList.remove("show");
    });

    let medicoActiveStage = 1;
    const medicoVisitedStages = new Set([1]);

    const MEDICO_STAGE_EYEBROW = {
      1: "Policy & Member Details",
      2: "Hospital Details",
      3: "Case Details",
      4: "Bill Details - Health",
      5: "Settlement",
    };

    const DOCS_ICON = '<path d="M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M5 8v11a2 2 0 0 0 2 2h9"/>';

    const MEDICO_STAGE_SECTIONS = {
      1: [
        { target: "card-medpolicy", label: "Policy Details", icon: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>' },
        { target: "card-medhospitalization", label: "Hospitalisation Details", icon: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>' },
        { target: "card-medpayment", label: "Payment Details", icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>' },
        { target: "card-medchecklist", label: "Document Checklist", icon: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>' },
        { target: "card-meddocuments", label: "Documents", icon: DOCS_ICON },
      ],
      2: [
        { target: "card-medhospital", label: "Hospital Details", icon: '<path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 1-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M4 12h16"/>' },
        { target: "card-medhospitalization2", label: "Hospitalization Details", icon: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>' },
        { target: "card-medconsultant", label: "Consultant Details", icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>' },
        { target: "card-medinvestigationdetails", label: "Investigations", icon: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>' },
      ],
      3: [
        { target: "card-medcase", label: "Case Details", icon: '<path d="M9 12h6M9 16h6M9 8h2"/><rect x="4" y="4" width="16" height="16" rx="2"/>' },
        { target: "card-medhistory", label: "Medical History", icon: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.1-3-3L4 16.5"/>' },
        { target: "card-medicaldetails", label: "Medical Details", icon: '<path d="M9 12h6M9 16h6M9 8h2"/><rect x="4" y="4" width="16" height="16" rx="2"/>' },
      ],
      4: [
        { target: "card-medbillheader", label: "Bill Details - Health", icon: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>' },
        { target: "card-medbill", label: "Bill Detail Entry Form", icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' },
        { target: "card-medbillitems", label: "Bill Items List", icon: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>' },
        { target: "card-medbillcalc", label: "Pharmacy & Calculations", icon: '<path d="M9 3h6l1 4H8z"/><path d="M7 7h10l1 13H6z"/><path d="M10 12h4M10 15h4"/>' },
        { target: "card-medbilladditional", label: "HC Details", icon: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>' },
      ],
      5: [
        { target: "card-medsettlement", label: "Settlement", icon: '<path d="M20 6L9 17l-5-5"/>' },
        { target: "card-pennydropsummary", label: "Penny Drop Summary", icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { target: "paDecisionSection", label: "Payment Auditor Decision", icon: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>' },
        { target: "paEmailApprovalSection", label: "High-Value Approval Requisition", icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
        { target: "card-qcchecklist", label: "QC Checklist", icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { target: "card-qcCommunication", label: "Communication", icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
      ],
    };

    const REMARKS_ICON = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';

    let medicoSidebarSpy = null;
    function setupMedicoSidebarScrollSpy(sectionTargets) {
      if (medicoSidebarSpy) medicoSidebarSpy.disconnect();
      if (!sectionTargets.length) { medicoSidebarSpy = null; return; }
      medicoSidebarSpy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const match = sectionTargets.find(x => x.el === entry.target);
            if (match) {
              sectionTargets.forEach(x => x.step.classList.remove("active"));
              match.step.classList.add("active");
            }
          }
        });
      }, { root: null, rootMargin: "-35% 0px -55% 0px", threshold: 0 });
      sectionTargets.forEach(x => medicoSidebarSpy.observe(x.el));
    }

    function renderMedicoSidebar(stageNum) {
      document.getElementById("medicoSidebarEyebrow").textContent = MEDICO_STAGE_EYEBROW[stageNum];
      const list = document.getElementById("medicoSidebarList");

      let sections = [...(MEDICO_STAGE_SECTIONS[stageNum] || [])];
      // Stage 4's "Additional Sections" dropdown (Hospital Daily Cash /
      // Accompanying Person, merged in from the former standalone HC
      // stage) always points its sidebar entry at card-medbilladditional
      // itself — the two grids inside it are shown/hidden by the dropdown,
      // not something the sidebar needs to distinguish between.
      // QC Checklist (Opinions & Status) is hidden for roles other than
      // QC/QC TL/CMO/CEM (see applySettlementVisibilityOverrides, which
      // runs before any stage switch), and Stage 5's four Payment
      // Auditor / QC cards (Penny Drop Summary, Payment Auditor Decision,
      // High-Value Email Approval, Communication) are each shown for at
      // most one role — drop any section whose target card is currently
      // hidden rather than linking to it.
      sections = sections.filter(s => {
        const el = document.getElementById(s.target);
        return !(el && el.classList.contains("hidden"));
      });
      // Remarks (per-stage, added below) is always the last item in every
      // stage.
      const remarksTarget = `card-medremarks${stageNum}`;
      sections.push({ target: remarksTarget, label: "Remarks", icon: REMARKS_ICON });

      list.innerHTML = sections.map((s, i) => `
    <div class="step ${i === 0 ? "active" : ""}" data-target="${s.target}" data-force-stage="${s.pinned ? 1 : ""}" title="${s.label}" role="button" tabindex="0" aria-label="${s.label}">
      <span class="step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${s.icon}</svg></span>
      <span class="step-label">${s.label}${s.pinned ? ' <span style="color:var(--muted);font-weight:600;">(always)</span>' : ""}</span>
      <span class="step-dot"></span>
    </div>
  `).join("");

      const stepEls = [...list.querySelectorAll(".step")];
      function activateStep(step) {
        const forceStage = step.dataset.forceStage;
        if (forceStage) switchMedicoStage(Number(forceStage));
        list.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
        step.classList.add("active");
        setTimeout(() => {
          document.getElementById(step.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, forceStage ? 60 : 0);
      }
      stepEls.forEach(step => {
        step.addEventListener("click", () => activateStep(step));
        step.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activateStep(step);
          }
        });
      });

      // Scroll-spy: keep the sidebar step highlighted in sync with whichever
      // section is actually in view as the user scrolls the page — mirrors
      // the static sidebars' behavior, but rebuilt every render since the
      // sidebar (and its section targets) is rebuilt per stage.
      const medicoSectionTargets = stepEls
        .map(s => ({ step: s, el: document.getElementById(s.dataset.target) }))
        .filter(x => x.el);
      setupMedicoSidebarScrollSpy(medicoSectionTargets);
    }

    function getHCStageVisible() {
      return ["Non Medico", "Non Medico TL", "QC", "QC TL", "CMO", "CEM", "Payment Auditor - Settlement User", "Medico", "Medico TL"].includes(getCurrentRole());
    }

    function getHCStageReadOnly() {
      return ["Medico", "Medico TL"].includes(getCurrentRole());
    }

    /* "Additional Sections" dropdown (card-medbilladditional, Stage 4) —
       merged in from the former standalone "Bill Details - HC" wizard
       stage. Single-select: choosing "Hospital Daily Cash" or "Accompanying
       Person" shows only that section's grid, hiding the other. Each
       section still has an editable/read-only DOM variant depending on
       role (same rule as the old HC stage — Medico/Medico TL see the
       read-only grid, everyone else sees the editable one); this function
       reapplies both the role-based variant and the dropdown's selection
       every time it's called, so it can be invoked whenever either changes
       (role determined at wizard-open, selection on every dropdown change). */
    function applyBillAdditionalSectionVisibility() {
      const card = document.getElementById("card-medbilladditional");
      if (!card) return;
      const visible = getHCStageVisible();
      card.classList.toggle("hidden", !visible);
      if (!visible) return;

      const readOnly = getHCStageReadOnly();
      const select = document.getElementById("bdAdditionalSectionSelect");
      const selection = select ? select.value : "hc";

      document.getElementById("card-medhc").classList.toggle("hidden", readOnly || selection !== "hc");
      document.getElementById("card-medhc-ro").classList.toggle("hidden", !readOnly || selection !== "hc");
      document.getElementById("card-medhcexp").classList.toggle("hidden", readOnly || selection !== "hcexp");
      document.getElementById("card-medhcexp-ro").classList.toggle("hidden", !readOnly || selection !== "hcexp");
    }

    const bdAdditionalSectionSelectEl = document.getElementById("bdAdditionalSectionSelect");
    if (bdAdditionalSectionSelectEl) {
      bdAdditionalSectionSelectEl.addEventListener("change", applyBillAdditionalSectionVisibility);
    }

    const WIZARD_STAGE_ICONS = {
      1: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
      2: '<path d="M3 21h18"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>',
      3: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
      4: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
      5: '<path d="M20 6L9 17l-5-5"/>',
    };

    // "Bill Details - HC" (Hospital Daily Cash / Accompanying Person) is no
    // longer a separate top-level wizard tab — it's merged into Stage 4's
    // "Additional Sections" dropdown (see card-medbilladditional). The
    // wizard stage list is always 1,2,3,4,5.
    function getMedicoStageList() {
      return [
        { id: 1, label: "Policy & Member Details" },
        { id: 2, label: "Hospital Details" },
        { id: 3, label: "Case Details" },
        { id: 4, label: "Bill Details - Health" },
        { id: 5, label: "Settlement" },
      ];
    }

    function renderWizardStageBar() {
      const bar = document.getElementById("wizardStageBar");
      const stages = getMedicoStageList();
      bar.innerHTML = stages.map((s, i) => {
        const con = i > 0 ? '<div class="wsb-connector"></div>' : "";
        const icon = WIZARD_STAGE_ICONS[s.id] || "";
        // Connector + button are grouped in one .wsb-item so flex-wrap never
        // strands a connector alone at the end of a line.
        return `<div class="wsb-item">${con}<button class="wizard-stage-btn" type="button" data-stage="${s.id}" title="${s.label}"><span class="wsb-num"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg></span><span class="wsb-label">${s.label}</span></button></div>`;
      }).join("");
      bar.querySelectorAll(".wizard-stage-btn").forEach(btn => {
        btn.addEventListener("click", () => switchMedicoStage(btn.dataset.stage));
      });
    }

    // scrollTop only defaults on when explicitly requested (first-time
    // wizard open, or a role/claim change that re-renders the wizard from
    // scratch) — a plain stepper/nav click switching between stages should
    // NOT jerk the page back to the top, since the user is deliberately
    // moving between sections of a page they're already scrolled into.
    function switchMedicoStage(n, opts) {
      const scrollTop = !!(opts && opts.scrollTop);
      n = Number(n);
      medicoActiveStage = n;
      medicoVisitedStages.add(n);

      for (let i = 1; i <= 5; i++) {
        document.getElementById(`medicoStage${i}`).classList.add("hidden");
      }
      document.getElementById(`medicoStage${n}`).classList.remove("hidden");

      let prevVisited = true;
      document.querySelectorAll("#wizardStageBar .wsb-item").forEach(item => {
        const btn = item.querySelector(".wizard-stage-btn");
        const sid = Number(btn.dataset.stage);
        const isVisited = medicoVisitedStages.has(sid);
        btn.classList.toggle("active", sid === n);
        btn.classList.toggle("visited", isVisited);
        // The connector before this stage reflects whether the PRIOR stage
        // (not this one) has been visited, so the "filled" rail segment
        // always represents ground already covered.
        const con = item.querySelector(".wsb-connector");
        if (con) con.classList.toggle("visited", prevVisited);
        prevVisited = isVisited;
      });

      renderMedicoSidebar(n);
      updateMedicoBottomBar();
      if (scrollTop) window.scrollTo(0, 0);
    }

    function openMedicoWizard(rec) {
      const currentRole = getCurrentRole();
      medicoTargetId = rec.inwardId;
      medicoVisitedStages.clear();
      medicoVisitedStages.add(1);
      renderWizardStageBar();
      switchMedicoStage(1, { scrollTop: true });

      document.getElementById("medicoDraftRef").textContent = rec.claimId;
      document.getElementById("medicoStepTitle").textContent = `Process Claim - ${rec.claimId}`;
      document.getElementById("breadcrumbProcessCurrent").textContent = `Process Claim - ${rec.claimId}`;

      // Investigation Scores card — NA (no access) for Payment Auditor per
      // the matrix, hidden outright rather than shown disabled like every
      // other read-only-for-PA field, since PA has zero visibility here.
      const isPaymentAuditorRole = currentRole === "Payment Auditor - Settlement User";
      document.getElementById("card-medinvestigation").classList.toggle("hidden", isPaymentAuditorRole);
      if (!isPaymentAuditorRole) {
        renderInvestigationScores();
      }

      const data = buildPolicyMockData(rec);
      renderReadonlyGrid("medPolicyGrid", data.policy);
      renderReadonlyGrid("medVerifyGrid", data.verify);
      renderReadonlyGrid("medVerifyAddressGrid", data.verifyAddress);
      renderReadonlyGrid("medAddressGrid", data.address);
      document.getElementById("medState").value = "-";
      document.getElementById("medCity").value = "-";
      // State/City are Read-only for every role that reaches this screen per
      // the CP-Screen Matrix, so the searchable dropdown is initialised
      // disabled — same look as an editable autocomplete field elsewhere,
      // but never opens, matching every other disabled field's behaviour.
      initSearchableDropdown({ inputId: "medState", dropdownId: "medStateDropdown", items: STATE_LIST, disabled: true });
      initSearchableDropdown({ inputId: "medCity", dropdownId: "medCityDropdown", items: [], disabled: true });
      document.getElementById("medAadhaarLast4").value = data.editable.aadhaarLast4;
      document.getElementById("medByPassPehchan").checked = data.editable.byPassPehchan;
      document.getElementById("medByPassPehchanRemark").value = data.editable.byPassPehchanRemark;
      document.getElementById("medAbhaId").value = data.editable.abhaId;
      document.getElementById("medContactNo").value = data.editable.contactNo;
      document.getElementById("medAltContactNo").value = data.editable.altContactNo;
      document.getElementById("medAltEmail").value = data.editable.altEmail;
      document.getElementById("medClaimantName").value = data.editable.claimantName;
      document.getElementById("medClaimantMobile").value = data.editable.claimantMobile;
      document.getElementById("medClaimantEmail").value = data.editable.claimantEmail;
      document.getElementById("medClaimantAddress").value = data.editable.claimantAddress;
      document.getElementById("medPartnerReferenceId").value = data.partnerReferenceId;
      applyMedIdentityAccess(currentRole);
      applyMedVerificationAccess(currentRole);
      applyMedAddressAccess(currentRole);
      applyMedClaimantAccess(currentRole);
      applyMedHospitalDetailsAccess(currentRole);
      renderHospitalizationGrid(rec);
      renderConsultantGrid(rec);
      renderPrescriptionGrid(rec);
      renderInvestigationGrid(rec);
      renderRadiologistGrid(rec);
      renderPathologistGrid(rec);

      const hosp = data.hospitalization;
      document.getElementById("medHospCaseNo").value = hosp.hospCaseNo;
      document.getElementById("medHospName").value = hosp.hospName;
      document.getElementById("medAilment").value = hosp.ailment;
      document.getElementById("medHospAddress").value = hosp.hospAddress;
      document.getElementById("medHospLocation").value = hosp.hospLocation;
      document.getElementById("medHospContactNo").value = hosp.hospContactNo;
      document.getElementById("medHospCity").value = hosp.hospCity;
      document.getElementById("medHospState").value = hosp.hospState;
      document.getElementById("medHospPinCode").value = hosp.hospPinCode;

      // Stage 2's Hospital Details card starts in sync with Stage 1's
      // Hospitalisation Details (same underlying hospital) — see
      // applySelectedHospital for how the two stay in sync afterward.
      document.getElementById("hdHospitalName").value = hosp.hospName;
      document.getElementById("hdAddress").value = hosp.hospAddress;
      document.getElementById("hdLocation").value = hosp.hospLocation;
      document.getElementById("hdContactNo").value = hosp.hospContactNo;
      document.getElementById("hdState").value = hosp.hospState;
      syncHdCityOptions();
      document.getElementById("hdCity").value = hosp.hospCity;
      document.getElementById("hdPinCode").value = hosp.hospPinCode;
      document.getElementById("medClaimedAmount").value = hosp.claimedAmount;
      document.getElementById("medDateOfAdmission").value = hosp.dateOfAdmission;
      document.getElementById("medDateOfDischarge").value = hosp.dateOfDischarge;
      document.getElementById("medAdmTime").value = hosp.admissionTime;
      document.getElementById("medDisTime").value = hosp.dischargeTime;
      document.getElementById("medAdmissionInTime").value = hosp.admissionInTime;
      document.getElementById("medDischargeOutTime").value = hosp.dischargeOutTime;
      document.getElementById("medHomeHealthCare").checked = hosp.homeHealthCare;
      document.getElementById("medDeath").checked = hosp.death;
      document.getElementById("medIsPortablePolicy").checked = hosp.isPortablePolicy;
      document.getElementById("medMajorIllness").value = hosp.majorIllness;
      refreshSearchableSelectLabel("medMajorIllness");

      // Payment Mode grid (NEFT Code through Source) is Read-only for both
      // Non Medico and Medico per the matrix, so both see the same table —
      // "Add Payment" is available to Non Medico, Medico, and QC roles as
      // the practical entry point for a first payment record (the matrix
      // marks that button NA for every role, which would mean no one could
      // ever add one).
      renderPaymentGrid(rec);
      const isNonMedicoRole = currentRole === "Non Medico" || currentRole === "Non Medico TL";
      const canAddPayment = isNonMedicoRole ||
        currentRole === "Medico" || currentRole === "Medico TL" ||
        currentRole === "QC" || currentRole === "QC TL" ||
        currentRole === "CMO" || currentRole === "CEM";
      document.getElementById('addPaymentBtn').classList.toggle('hidden', !canAddPayment);
      const gridVerifyRow = document.getElementById('paymentGridVerifyRow');
      if (isNonMedicoRole) { gridVerifyRow.style.display = 'flex'; } else { gridVerifyRow.style.display = 'none'; }
      document.getElementById('paymentGridVerifyResult').style.display = 'none';
      document.getElementById('pdProposerExpired').checked = !!rec.proposerExpired;

      // Add Payment Details (Proposer) — read-only summary shown to Medico
      // in addition to the addPaymentBtn button/modal above. Non Medico
      // already sees this same data in the Payment Mode grid above and
      // edits it via the full Add Payment page, so this summary is shown
      // to Medico only, not duplicated for Non Medico.
      const isMedicoRole = currentRole === "Medico" || currentRole === "Medico TL";
      document.getElementById("paymentProposerSummary").classList.toggle("hidden", !isMedicoRole);
      if (isMedicoRole) {
        const proposer = (rec.payments && rec.payments[0]) || {};
        document.getElementById("ppPayeeName").value = proposer.payeeName || "-";
        document.getElementById("ppPaymentMode").value = proposer.paymentMode || "-";
        document.getElementById("ppBankName").value = proposer.bankName || "-";
        document.getElementById("ppAccountNo").value = proposer.accountNo || "-";
        document.getElementById("ppIfscCode").value = proposer.ifscCode || "-";
        document.getElementById("ppBranchName").value = proposer.branchName || "-";
        document.getElementById("ppAccountType").value = proposer.accountType || "-";
        document.getElementById("ppPanNo").value = proposer.panNo || "-";
        document.getElementById("ppNeftRemark").value = proposer.neftRemark || "-";
        document.getElementById("ppEmailId").value = proposer.emailId || "-";
      }

      renderPennyDropSection(rec);
      applyPennyDropAccess(currentRole);
      renderMedicoDocuments(rec);
      renderPennyDropChecklist(rec);
      applyCaseDetailsPrefill(rec);
      applyMedCaseDetailsAccess(currentRole);
      applyMedSettlementAccess(currentRole, rec);
      renderMedicalHistoryGrid(rec);
      // applyMedCaseDetailsAccess enables cdPriorityReason whenever the
      // role permits it, regardless of whether cdPriorityClaim is
      // checked — re-apply the "only enabled while checked" rule on top.
      if (!document.getElementById("cdPriorityClaim").checked) {
        document.getElementById("cdPriorityReason").disabled = true;
      }
      refreshSearchableSelectLabel("cdPriorityReason");
      initBillItems(rec);
      renderBillHeaderStrip(rec);
      renderHCGrid(rec);
      renderHCExpGrid(rec);
      renderHCGridRO(rec);
      renderHCExpGridRO(rec);
      if (bdAdditionalSectionSelectEl) { bdAdditionalSectionSelectEl.value = "hc"; refreshSearchableSelectLabel("bdAdditionalSectionSelect"); }
      applyBillAdditionalSectionVisibility();
      rec.stageRemarks = rec.stageRemarks || defaultStageRemarks();
      // "Bill Details - HC" no longer has its own remarks trail — it's
      // merged into Stage 4's. Any remarks recorded on a record before
      // this merge (under the old "hc" key) get folded into stage 4's
      // list once, so nothing already written is lost or hidden.
      if (rec.stageRemarks["hc"] && rec.stageRemarks["hc"].length) {
        rec.stageRemarks[4] = (rec.stageRemarks[4] || []).concat(rec.stageRemarks["hc"]);
        rec.stageRemarks["hc"] = [];
      }
      renderCombinedRemarksAllStages(rec);

      if (currentRole === "QC" || currentRole === "QC TL" || currentRole === "CMO" || currentRole === "CEM") {
        applyQCViewMode(currentRole);
      }
      if (currentRole === "QC") {
        document.getElementById("card-qcCommunication").classList.remove("hidden");
        renderQcCommGrid(rec);
      }
      if (currentRole === "Payment Auditor - Settlement User") {
        populatePaymentAuditorDummyData();
        renderPennyDropSummary(rec);
        applyPaymentAuditorDecisionCards(rec);
        applyPaymentAuditorViewMode();
      }

      activateWizardView();

      // Re-sync every converted select's visible proxy label AND disabled
      // look after this whole render pass — the many applyMedFieldAccess/
      // applyQCViewMode/applyPaymentAuditorViewMode calls above set
      // select.disabled directly (read lazily by initSearchableSelect at
      // interaction time — see shared/searchable-select.js), so without
      // this the proxy would only pick up a role-switch's new disabled
      // state the next time the user focuses it, not immediately. No-op
      // on this page's very first load (before any select has been
      // wrapped yet — the blanket initSearchableSelectsIn(document) sweep
      // runs once, later, at the bottom of this file) and cheap on every
      // later re-run (role switch while a claim is open).
      refreshAllSearchableSelects();
    }

    /* ---------------- Basic Info (card-medpolicy) role access ----------------
       Per the CP-Screen Matrix (Basic Details > Basic Info). Each section below
       owns its own field-access map so the four groups (Identity, Verification,
       Address & Contact, Claimant) can be reasoned about independently — the
       matrix gives each group a different Non Medico/Medico split, most notably
       Claimant fields (Non Medico only) vs. everything else (both roles).
       QC and Payment Auditor are read-only across all four groups — enforced
       separately by the whole-wizard applyQCViewMode()/applyPaymentAuditorViewMode()
       disable pass, so these functions only need to resolve Non Medico vs Medico. */
    function medRoleKey(currentRole) {
      const isNonMedico = currentRole === "Non Medico" || currentRole === "Non Medico TL";
      const isMedico = currentRole === "Medico" || currentRole === "Medico TL";
      return isNonMedico ? "nonMedico" : isMedico ? "medico" : null;
    }

    function applyMedFieldAccess(roleKey, fieldAccess) {
      Object.entries(fieldAccess).forEach(([id, access]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const editable = roleKey ? access[roleKey] : false;
        el.disabled = !editable;
      });
    }

    // Identity & Policy: Aadhaar last-4 editable for Non Medico and Medico.
    const MED_IDENTITY_FIELD_ACCESS = {
      medAadhaarLast4: { nonMedico: true, medico: true },
    };
    function applyMedIdentityAccess(currentRole) {
      const roleKey = medRoleKey(currentRole);
      applyMedFieldAccess(roleKey, MED_IDENTITY_FIELD_ACCESS);
    }

    // Verification: By Pass Pehchan (+ its remark) and ABHA ID editable for
    // Non Medico and Medico.
    const MED_VERIFY_FIELD_ACCESS = {
      medByPassPehchan: { nonMedico: true, medico: true },
      medByPassPehchanRemark: { nonMedico: true, medico: true },
      medAbhaId: { nonMedico: true, medico: true },
    };
    function applyMedVerificationAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_VERIFY_FIELD_ACCESS);
    }

    // Address & Contact: Contact No. and Alternate Contact No. editable for
    // Non Medico and Medico; Alternate Email ID is Non Medico only.
    const MED_ADDRESS_FIELD_ACCESS = {
      medContactNo: { nonMedico: true, medico: true },
      medAltContactNo: { nonMedico: true, medico: true },
      medAltEmail: { nonMedico: true, medico: false },
    };
    function applyMedAddressAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_ADDRESS_FIELD_ACCESS);
    }

    // Claimant Details: editable for Non Medico only — Medico reads these.
    const MED_CLAIMANT_FIELD_ACCESS = {
      medClaimantName: { nonMedico: true, medico: false },
      medClaimantMobile: { nonMedico: true, medico: false },
      medClaimantEmail: { nonMedico: true, medico: false },
      medClaimantAddress: { nonMedico: true, medico: false },
    };
    function applyMedClaimantAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_CLAIMANT_FIELD_ACCESS);
    }

    /* ---------------- Hospital Details (card-medhospital, Stage 2) role access ----------------
       Per the CP-Screen Matrix (Hospital Details tab > Hospital Details
       screen): Non Medico can edit every field on this card. Medico can
       only edit Hospital Address and Hospital Registration No — every
       other field (name, provider no., type, PAN, contact, proprietor,
       location, state, city, pin code, email) is read-only for Medico.
       QC and Payment Auditor fall back to read-only here too, same as the
       rest of the wizard, enforced by applyQCViewMode()/
       applyPaymentAuditorViewMode()'s whole-wizard disable pass. */
    const MED_HOSPITAL_DETAILS_FIELD_ACCESS = {
      hdHospitalName: { nonMedico: true, medico: false },
      hdProviderNo: { nonMedico: true, medico: false },
      hdRegNo: { nonMedico: true, medico: true },
      hdAddress: { nonMedico: true, medico: true },
      hdLocation: { nonMedico: true, medico: false },
      hdState: { nonMedico: true, medico: false },
      hdCity: { nonMedico: true, medico: false },
      hdPinCode: { nonMedico: true, medico: false },
      hdHospitalType: { nonMedico: true, medico: false },
      hdPanNo: { nonMedico: true, medico: false },
      hdContactNo: { nonMedico: true, medico: false },
      hdEmailId: { nonMedico: true, medico: false },
      hdProprietorName: { nonMedico: true, medico: false },
    };
    function applyMedHospitalDetailsAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_HOSPITAL_DETAILS_FIELD_ACCESS);
    }

    /* ---------------- Case Details (card-medcase, Stage 3) role access ----------------
       Per the CP-Screen Matrix (Case Details tab): the whole stage is
       hidden for Non Medico (see isCaseDetailsStageVisible), per an
       explicit user decision — the matrix itself actually lists Non
       Medico as "Read only" (visible, disabled) for every field here, not
       NA, so the nonMedico values below document the matrix's literal
       per-field access for whenever the map is read; they never actually
       apply while the stage stays hidden for that role.
       For Medico, the matrix marks nearly everything Editable — including
       Type of Medicine, Number of Bed, both ICD Code fields, Diagnosis
       1-3 + their codes, and every CPT search-result field (short/medium
       descriptor, CPT code, concept id, parent id, descriptor), all of
       which the CP-Case Details user story had listed as Read-Only for
       Medico too. The matrix wins on that conflict per explicit
       confirmation, so these stay editable for Medico even though a
       search-picker (Ailment/CPT) is the more common way they get filled.
       QC/QC TL/Payment Auditor fall back to read-only for the whole card
       via applyQCViewMode()/applyPaymentAuditorViewMode()'s blanket
       whole-wizard disable pass, same as everywhere else. */
    const MED_CASE_DETAILS_FIELD_ACCESS = {
      cdCareTypeDomiciliary: { nonMedico: false, medico: true },
      cdCareTypeDayCare: { nonMedico: false, medico: true },
      cdCareTypeInpatient: { nonMedico: false, medico: true },
      cdCareTypeOpd: { nonMedico: false, medico: true },
      cdAssociatedConditions: { nonMedico: false, medico: true },
      cdComorbidConditions: { nonMedico: false, medico: true },
      cdClinicalFindings: { nonMedico: false, medico: true },
      cdBloodPressure: { nonMedico: false, medico: true },
      cdPerAbdomen: { nonMedico: false, medico: true },
      cdPulse: { nonMedico: false, medico: true },
      cdCardioVascular: { nonMedico: false, medico: true },
      cdRespiratory: { nonMedico: false, medico: true },
      cdCns: { nonMedico: false, medico: true },
      cdComplicationNo: { nonMedico: false, medico: true },
      cdComplicationYes: { nonMedico: false, medico: true },
      cdComplicationSelect: { nonMedico: false, medico: true },
      cdSurgeriesOptima: { nonMedico: false, medico: true },
      cdIllnessOthers: { nonMedico: false, medico: true },
      cdIllnessAlcohol: { nonMedico: false, medico: true },
      cdIllnessHiv: { nonMedico: false, medico: true },
      cdIllnessSterility: { nonMedico: false, medico: true },
      cdIllnessCosmetic: { nonMedico: false, medico: true },
      cdIllnessCongenital: { nonMedico: false, medico: true },
      cdIllnessMaternity: { nonMedico: false, medico: true },
      cdIllnessNone: { nonMedico: false, medico: true },
      cdIllnessOtherText: { nonMedico: false, medico: true },
      cdSystemOfMedicine: { nonMedico: false, medico: true },
      cdTypeOfMedicine: { nonMedico: false, medico: true },
      cdNumberOfBed: { nonMedico: false, medico: true },
      cdAilment: { nonMedico: false, medico: true },
      cdIcdCode: { nonMedico: false, medico: true },
      cdDurationOfAilment: { nonMedico: true, medico: true },
      cdDiagnosis1: { nonMedico: false, medico: true },
      cdDiagnosisCode1: { nonMedico: false, medico: true },
      cdDiagnosis2: { nonMedico: false, medico: true },
      cdDiagnosisCode2: { nonMedico: false, medico: true },
      cdDiagnosis3: { nonMedico: false, medico: true },
      cdDiagnosisCode3: { nonMedico: false, medico: true },
      cdSrfId: { nonMedico: false, medico: true },
      cdIcmrId: { nonMedico: false, medico: true },
      cdCptProcedure: { nonMedico: false, medico: true },
      cdCptCode: { nonMedico: false, medico: true },
      cdShortDescriptor: { nonMedico: false, medico: true },
      cdConceptId: { nonMedico: false, medico: true },
      cdMediumDescriptor: { nonMedico: false, medico: true },
      cdParentId: { nonMedico: false, medico: true },
      cdDescriptor: { nonMedico: false, medico: true },
      cdTreatmentType: { nonMedico: false, medico: true },
      cdDateOfAdmission: { nonMedico: false, medico: true },
      cdDateOfDischarge: { nonMedico: false, medico: true },
      cdLengthOfStay: { nonMedico: false, medico: true },
      cdDelayInSurgery: { nonMedico: false, medico: true },
      cdMentalDisability: { nonMedico: true, medico: true },
      cdAnesLA: { nonMedico: true, medico: true },
      cdAnesGA: { nonMedico: true, medico: true },
      cdAnesEpidural: { nonMedico: true, medico: true },
      cdAnesSpinal: { nonMedico: true, medico: true },
      cdAnesRegionalBlock: { nonMedico: true, medico: true },
      cdAnesOther: { nonMedico: true, medico: true },
      cdDentalClaim: { nonMedico: true, medico: true },
      cdPlasticSurgery: { nonMedico: true, medico: true },
      cdSpectacles: { nonMedico: true, medico: true },
      cdAirAmbulance: { nonMedico: true, medico: true },
      cdReserveBenefit: { nonMedico: true, medico: true },
      cdEmiHospitalization: { nonMedico: true, medico: true },
      cdRtaAccident: { nonMedico: true, medico: true },
      cdMaternity: { nonMedico: true, medico: true },
      cdPa: { nonMedico: true, medico: true },
      cdCriticalIllness: { nonMedico: true, medico: true },
      cdEnhancedSi: { nonMedico: true, medico: true },
      cdPriorityClaim: { nonMedico: true, medico: true },
      cdPriorityReason: { nonMedico: true, medico: true },
    };
    function applyMedCaseDetailsAccess(currentRole) {
      applyMedFieldAccess(medRoleKey(currentRole), MED_CASE_DETAILS_FIELD_ACCESS);
    }

    /* ---------------- Settlement (card-medsettlement) role access ----------------
       Per the CP-Settlement user stories and CP-Screen Matrix (Settlement tab):
       - Deductions & Co-payment: editable for both Non Medico and Medico.
         Zonal Copayment Amount is a system-derived read-only label for
         everyone (never in this map, so it stays disabled by default).
       - GST Details: Non Medico can edit throughout ("As a Non medico ... I
         want to view and update the taxation details"); Medico's user story
         is explicitly view-only ("As a Medico ... I want to view the
         taxation details" — recommended read-only since it isn't Medico's
         core area of interest), so every GST field is nonMedico-only here.
       - Payable Amount Summary is system-calculated for every role (not in
         this map — stays disabled), driven by the Calculate button.
       - Case Processing & Status: Any Other Cost/Expenses, Claim Payment
         Status and Payment Mode are editable for both roles.
         Claim Status and Medico Remarks/Opinion are Medico-only (the
         decision that routes the claim onward). Status (Non Medico) is
         Non-Medico-only, mirroring the Claim Status/Medico split.
       - Last Document Received Date, TAT Days and RBI Bank Rate are called
         out as "Medico only" in the matrix remarks column; Penal Interest
         is system-calculated (system-derived, so left disabled for both).
       - Processing Checkboxes (Override Validation, Send for Investigation,
         etc.) are workflow-impacting decisions the matrix recommends
         restricting to Medico — Non Medico sees them read-only.
       - Non Medico TL Remark is editable for both, matching every other
         "Processing Remarks" free-text field in the wizard.
       QC and Payment Auditor fall back to read-only here too, via the
       existing whole-wizard applyQCViewMode()/applyPaymentAuditorViewMode()
       disable pass. */
    const MED_SETTLEMENT_FIELD_ACCESS = {
      stPolicyDeduction: { nonMedico: true, medico: true },
      stPolicyDeductionRemarks: { nonMedico: true, medico: true },
      stCoPayment: { nonMedico: true, medico: true },
      stEditCopayment: { nonMedico: true, medico: true },
      stCopayRemark: { nonMedico: true, medico: true },
      stZonalCopayment: { nonMedico: false, medico: true },
      stEditZonalCopayment: { nonMedico: false, medico: true },
      stZonalCopayRemark: { nonMedico: false, medico: true },
      stTempGrossAmount: { nonMedico: false, medico: true },
      stGrossIncGst: { nonMedico: false, medico: true },
      stGrossExGst: { nonMedico: false, medico: true },
      stPremiumRecovery: { nonMedico: false, medico: true },
      stTdsAmount: { nonMedico: false, medico: true },
      stNetPayableExGst: { nonMedico: false, medico: true },
      stNetPayableIncGst: { nonMedico: false, medico: true },
      stGstApplicableRoomRent: { nonMedico: true, medico: false },
      stHospitalGstin: { nonMedico: true, medico: false },
      stGstFromState: { nonMedico: true, medico: false },
      stDummyGstin: { nonMedico: true, medico: false },
      stGstToState: { nonMedico: true, medico: false },
      stGstRoomRentAmount: { nonMedico: true, medico: false },
      stGstClaimedByHospital: { nonMedico: true, medico: false },
      gstCalcOnBillsBtn: { nonMedico: true, medico: false },
      stRoomRentIgst: { nonMedico: true, medico: false },
      stRoomRentCgst: { nonMedico: true, medico: false },
      stRoomRentSgst: { nonMedico: true, medico: false },
      stGstInvoiceDate: { nonMedico: true, medico: false },
      stGstDeductions: { nonMedico: true, medico: false },
      stEditGstDeduction: { nonMedico: true, medico: false },
      stGstDeductionRemarks: { nonMedico: true, medico: false },
      stOtherCostNo: { nonMedico: true, medico: true },
      stOtherCostYes: { nonMedico: true, medico: true },
      stNeftAccountNo: { nonMedico: true, medico: true },
      stPenalInterest: { nonMedico: false, medico: true },
      stPaymentStatusOnAccount: { nonMedico: true, medico: true },
      stPaymentStatusFinal: { nonMedico: true, medico: true },
      stClaimStatus: { nonMedico: false, medico: true },
      stMedicoRemarksReason: { nonMedico: false, medico: true },
      stMedicoOpinion: { nonMedico: false, medico: true },
      stStatusNonMedico: { nonMedico: true, medico: false },
      stPaymentMode: { nonMedico: true, medico: true },
      stLastDocDate: { nonMedico: false, medico: true },
      stTatDays: { nonMedico: false, medico: true },
      stRbiRate: { nonMedico: false, medico: true },
      stOverrideValidation: { nonMedico: false, medico: true },
      stSendForInvestigation: { nonMedico: false, medico: true },
      stOverrideHospitalizationPeriod: { nonMedico: false, medico: true },
      stReprocessApproval: { nonMedico: false, medico: true },
      stReimbursementSiAccident: { nonMedico: false, medico: true },
      stDeviationApproval: { nonMedico: false, medico: true },
      stNonDisclosure: { nonMedico: false, medico: true },
      stNonMedicoTLRemark: { nonMedico: true, medico: false },
      stMedicoTLRemark: { nonMedico: true, medico: true },
    };
    /* Settlement hides most Medico-only fields from Non Medico entirely
       (rather than the greyed-out "disabled but visible" treatment every
       other section uses), so the Non Medico view doesn't show fields it
       can never act on: Claim Status, Medico Remarks/Opinion, Last
       Document Received Date, TAT Days and RBI Bank Rate. GST fields stay
       disabled-but-visible for Medico (still relevant reference info per
       that role's "view only" story), and the Processing Checkboxes
       (workflow overrides) are likewise kept visible-but-disabled for
       Non Medico — shown read-only per the matrix's original
       recommendation rather than hidden outright — so both are excluded
       here via SETTLEMENT_HIDE_EXCLUDED_IDS. */
    const SETTLEMENT_HIDE_EXCLUDED_IDS = new Set([
      "stOverrideValidation",
      "stSendForInvestigation",
      "stOverrideHospitalizationPeriod",
      "stReprocessApproval",
      "stReimbursementSiAccident",
      "stDeviationApproval",
      "stNonDisclosure",
      // Zonal Copayment Amount + its own Edit checkbox and Remarks field —
      // kept visible-but-disabled for Non Medico rather than disappearing;
      // stZonalCopayment itself was missing from this set despite the
      // comment's original claim, leaving a gap in the Deductions &
      // Co-payment grid row where the Amount field should render.
      "stZonalCopayment",
      "stEditZonalCopayment",
      "stZonalCopayRemark",
      // Payable Amount Summary — Medico-editable, but was always visible
      // (just disabled) to every role before that access was added, so it
      // stays visible-but-disabled for Non Medico rather than switching to
      // hidden like the rest of the medico-only fields above.
      "stTempGrossAmount",
      "stGrossIncGst",
      "stGrossExGst",
      "stPremiumRecovery",
      "stTdsAmount",
      "stNetPayableExGst",
      "stNetPayableIncGst",
    ]);
    function applySettlementFieldVisibility(roleKey, fieldAccess) {
      // QC / QC TL (roleKey === null) are read-only observers — they should
      // see every field in the Settlement card, just disabled.  Only apply
      // the medico-only hide logic for the two named editing roles.
      const isQCRole = roleKey === null;
      Object.entries(fieldAccess).forEach(([id, access]) => {
        if (SETTLEMENT_HIDE_EXCLUDED_IDS.has(id)) return;
        const el = document.getElementById(id);
        if (!el) return;
        const container = el.closest(".field") || el.closest("fieldset") || el;
        const medicoOnly = access.medico && !access.nonMedico;
        const hideForRole = !isQCRole && medicoOnly && roleKey !== "medico";
        container.classList.toggle("is-role-hidden", hideForRole);
      });
    }

    /* Explicit per-field visibility overrides where the "hidden vs disabled"
       rule differs from the plain nonMedico/medico split above:
       - Non Medico TL Remark: hidden from Medico (its own TL escalation
         note), but must stay visible for Non Medico regardless of role
         parity, so it's not driven off MED_SETTLEMENT_FIELD_ACCESS at all.
       - Medico TL Remark: hidden from both roles outright — kept in the
         DOM (id preserved for the dummy-data filler / any future reuse)
         but never shown on this card. */
    const SETTLEMENT_VISIBILITY_OVERRIDES = {
      stNonMedicoTLRemark: { nonMedico: true, medico: false },
      stMedicoTLRemark: { nonMedico: false, medico: false },
    };
    function applySettlementVisibilityOverrides(roleKey) {
      // QC / QC TL (roleKey === null) should see all fields read-only,
      // including the Non Medico TL Remark that is normally hidden from Medico.
      const isQCRole = roleKey === null;
      Object.entries(SETTLEMENT_VISIBILITY_OVERRIDES).forEach(([id, visibility]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const container = el.closest(".field") || el.closest("fieldset") || el;
        // For QC: show everything except stMedicoTLRemark (always hidden)
        const shouldShow = isQCRole ? (id !== "stMedicoTLRemark") : (roleKey ? visibility[roleKey] : false);
        container.classList.toggle("is-role-hidden", !shouldShow);
      });
      // Medico TL Remark is hidden for every role — its "Processing Remarks"
      // section heading would otherwise sit above nothing, so hide it too.
      const heading = document.getElementById("stMedicoTLRemarkHeading");
      if (heading) heading.classList.add("is-role-hidden");

      // QC Checklist (checklist table + Opinions & Status) is relevant to
      // QC / QC TL / CMO / CEM — hidden for Medico, Non Medico and their TL
      // variants. Within it, which Opinion field is editable (Auditor/CEM/
      // CMO) is further narrowed per-role by applyQCViewMode().
      const qcChecklistCard = document.getElementById("card-qcchecklist");
      if (qcChecklistCard) {
        const role = getCurrentRole();
        const showForRole = role === "QC" || role === "QC TL" || role === "CMO" || role === "CEM";
        qcChecklistCard.classList.toggle("hidden", !showForRole);
      }
    }

    // Copay Remark / Zonal Copay Remarks are gated by their own Edit
    // checkbox on top of the normal role access — applyMedFieldAccess()
    // above would otherwise unconditionally re-enable them for any role
    // with edit access, regardless of whether the checkbox is checked.
    // Only re-locks a remark that the role access pass just enabled; a
    // role-disabled remark (e.g. Zonal for Non Medico) is left alone.
    function relockConditionalRemarks() {
      [["stEditCopayment", "stCopayRemark"], ["stEditZonalCopayment", "stZonalCopayRemark"]].forEach(([checkboxId, remarkId]) => {
        const checkbox = document.getElementById(checkboxId);
        const remarkInput = document.getElementById(remarkId);
        if (!remarkInput.disabled && !checkbox.checked) remarkInput.disabled = true;
      });
    }

    function applyMedSettlementAccess(currentRole, rec) {
      const roleKey = medRoleKey(currentRole);
      const claimNumberEl = document.getElementById("stClaimNumber");
      if (claimNumberEl) claimNumberEl.textContent = `Claim Number: ${(rec && rec.claimId) || "—"}`;
      applyMedFieldAccess(roleKey, MED_SETTLEMENT_FIELD_ACCESS);
      applySettlementFieldVisibility(roleKey, MED_SETTLEMENT_FIELD_ACCESS);
      applySettlementVisibilityOverrides(roleKey);
      relockConditionalRemarks();
      if (typeof syncMedicoRemarksTrigger === "function") syncMedicoRemarksTrigger();
    }

    /* ---------------- Hospitalization Details (card-medhospitalization2, Stage 2) ----------------
       Legacy screen shows this as a repeating row grid (multiple room /
       accommodation entries per stay, e.g. a room change mid-admission),
       so it's modeled as an array on the record rather than single fields
       like the rest of Stage 2. Both Non Medico and Medico can edit — the
       user story doesn't call out a role split here. */
    const ROOM_TYPE_OPTIONS = ["General", "Twin Sharing", "Single", "Deluxe"];
    const ACCOMMODATION_TYPE_OPTIONS = ["General Ward", "Semi-Private", "Private", "ICU", "ICCU"];
    const ROOM_CATEGORY_OPTIONS = ["Category A", "Category B", "Category C", "Special"];

    function selectOptionsHtml(options, selected) {
      return `<option value="" ${selected ? "" : "selected"} disabled>--Select--</option>` +
        options.map(o => `<option value="${o}" ${o === selected ? "selected" : ""}>${o}</option>`).join("");
    }

    function renderHospitalizationGrid(rec) {
      if (!rec.hospitalizationRows || !rec.hospitalizationRows.length) {
        rec.hospitalizationRows = [{
          accommodationType: "ICU", roomType: "Private", roomCategory: "Category A",
          roomNo: "204", fromDate: "2026-05-20", toDate: "2026-05-24",
        }];
      }
      const body = document.getElementById("hospitalizationGridBody");
      if (!body) return;
      const canRemove = rec.hospitalizationRows.length > 1;

      body.innerHTML = rec.hospitalizationRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><select class="hg-field" data-field="accommodationType">${selectOptionsHtml(ACCOMMODATION_TYPE_OPTIONS, row.accommodationType)}</select></td>
        <td><select class="hg-field" data-field="roomType">${selectOptionsHtml(ROOM_TYPE_OPTIONS, row.roomType)}</select></td>
        <td><select class="hg-field" data-field="roomCategory">${selectOptionsHtml(ROOM_CATEGORY_OPTIONS, row.roomCategory)}</select></td>
        <td><input type="text" class="hg-field" data-field="roomNo" value="${row.roomNo || ""}"></td>
        <td><input type="date" class="hg-field" data-field="fromDate" value="${row.fromDate || ""}"></td>
        <td><input type="date" class="hg-field" data-field="toDate" value="${row.toDate || ""}"></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".hg-field").forEach(el => {
        el.addEventListener("change", () => {
          const rowEl = el.closest("tr");
          const idx = Number(rowEl.dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.hospitalizationRows[idx][el.dataset.field] = el.value;
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.hospitalizationRows.length === 1) return;
          rec2.hospitalizationRows.splice(idx, 1);
          renderHospitalizationGrid(rec2);
        });
      });

      // Wrap each row's Accommodation/Room Type/Room Category <select>
      // (.hg-field) as a searchable-select, same post-build wiring step
      // as the row's change listener and remove-row button above.
      initSearchableSelectsIn(body);
    }

    document.getElementById("hospitalizationAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.hospitalizationRows = rec.hospitalizationRows || [];
      rec.hospitalizationRows.push({
        accommodationType: "", roomType: "", roomCategory: "", roomNo: "", fromDate: "", toDate: "",
      });
      renderHospitalizationGrid(rec);
    });

    /* ---------------- Consultant Details (card-medconsultant, Stage 2) ----------------
       Per CP-Hospital user story: repeating grid, Search button opens the
       Doctor Search modal to prefill a row, Add Row appends a blank one.
       All columns editable for both Non Medico and Medico. */
    function renderConsultantGrid(rec) {
      if (!rec.consultantRows || !rec.consultantRows.length) {
        rec.consultantRows = [{
          doctorName: "Dr. Anil Mehta", regNo: "MCI-44821", hpid: "HPID-9981123",
          contactNo: "9811022345", speciality: "Cardiology", panNo: "AXHPM4521K",
        }];
      }
      const body = document.getElementById("consultantGridBody");
      if (!body) return;
      const canRemove = rec.consultantRows.length > 1;

      body.innerHTML = rec.consultantRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><input type="text" class="cg-field" data-field="doctorName" value="${row.doctorName || ""}"></td>
        <td><input type="text" class="cg-field" data-field="regNo" value="${row.regNo || ""}"></td>
        <td><input type="text" class="cg-field" data-field="hpid" value="${row.hpid || ""}"></td>
        <td><input type="text" class="cg-field" data-field="contactNo" value="${row.contactNo || ""}"></td>
        <td><input type="text" class="cg-field" data-field="speciality" value="${row.speciality || ""}"></td>
        <td><input type="text" class="cg-field" data-field="panNo" value="${row.panNo || ""}"></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".cg-field").forEach(el => {
        el.addEventListener("change", () => {
          const idx = Number(el.closest("tr").dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.consultantRows[idx][el.dataset.field] = el.value;
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.consultantRows.length === 1) return;
          rec2.consultantRows.splice(idx, 1);
          renderConsultantGrid(rec2);
        });
      });
    }

    let consultantSearchRowIndex = null;
    document.getElementById("consultantAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.consultantRows = rec.consultantRows || [];
      rec.consultantRows.push({ doctorName: "", regNo: "", hpid: "", contactNo: "", speciality: "", panNo: "" });
      renderConsultantGrid(rec);
    });
    document.getElementById("consultantSearchBtn").addEventListener("click", () => {
      consultantSearchRowIndex = null;
      document.getElementById("doctorSearchResultsWrap").classList.add("hidden");
      document.getElementById("doctorSearchModal").classList.add("show");
    });

    /* ---------------- Consultant Advice / Prescriptions (card-medprescriptions, Stage 2) ---------------- */
    function renderPrescriptionGrid(rec) {
      if (!rec.prescriptionRows || !rec.prescriptionRows.length) {
        rec.prescriptionRows = [{
          medicine: "Atorvastatin", date: "2026-05-21", power: "20mg", dosage: "1-0-1", days: "10", consultantDetails: "",
        }];
      }
      const body = document.getElementById("prescriptionGridBody");
      if (!body) return;
      const canRemove = rec.prescriptionRows.length > 1;

      body.innerHTML = rec.prescriptionRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><input type="text" class="pg-field" data-field="medicine" value="${row.medicine || ""}"></td>
        <td><input type="date" class="pg-field" data-field="date" value="${row.date || ""}"></td>
        <td><input type="text" class="pg-field" data-field="power" value="${row.power || ""}"></td>
        <td><input type="text" class="pg-field" data-field="dosage" value="${row.dosage || ""}"></td>
        <td><input type="text" class="pg-field" data-field="days" value="${row.days || ""}"></td>
        <td><input type="text" class="pg-field" data-field="consultantDetails" value="${row.consultantDetails || ""}" style="text-transform:uppercase;" oninput="this.value=this.value.toUpperCase()"></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".pg-field").forEach(el => {
        el.addEventListener("change", () => {
          const idx = Number(el.closest("tr").dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.prescriptionRows[idx][el.dataset.field] = el.value;
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.prescriptionRows.length === 1) return;
          rec2.prescriptionRows.splice(idx, 1);
          renderPrescriptionGrid(rec2);
        });
      });
    }

    document.getElementById("prescriptionAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.prescriptionRows = rec.prescriptionRows || [];
      rec.prescriptionRows.push({ medicine: "", date: "", power: "", dosage: "", days: "", consultantDetails: "" });
      renderPrescriptionGrid(rec);
    });
    document.getElementById("prescriptionSearchBtn").addEventListener("click", () => {
      alert("Prescription/medicine search isn't built out in this version of the prototype.");
    });

    /* ---------------- Investigations (card-medinvestigationdetails, Stage 2) ---------------- */
    function renderInvestigationGrid(rec) {
      if (!rec.investigationRows || !rec.investigationRows.length) {
        rec.investigationRows = [{ investigation: "CBC", date: "2026-05-21", unit: "g/dL", consultantDetails: "Dr. Anil Mehta" }];
      }
      const body = document.getElementById("investigationGridBody");
      if (!body) return;
      const canRemove = rec.investigationRows.length > 1;

      body.innerHTML = rec.investigationRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><input type="text" class="ig-field" data-field="investigation" value="${row.investigation || ""}"></td>
        <td><input type="date" class="ig-field" data-field="date" value="${row.date || ""}"></td>
        <td><input type="text" class="ig-field" data-field="unit" value="${row.unit || ""}"></td>
        <td><input type="text" class="ig-field" data-field="consultantDetails" value="${row.consultantDetails || ""}"></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".ig-field").forEach(el => {
        el.addEventListener("change", () => {
          const idx = Number(el.closest("tr").dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.investigationRows[idx][el.dataset.field] = el.value;
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.investigationRows.length === 1) return;
          rec2.investigationRows.splice(idx, 1);
          renderInvestigationGrid(rec2);
        });
      });
    }
    document.getElementById("investigationAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.investigationRows = rec.investigationRows || [];
      rec.investigationRows.push({ investigation: "", date: "", unit: "", consultantDetails: "" });
      renderInvestigationGrid(rec);
    });
    document.getElementById("investigationSearchBtn").addEventListener("click", () => {
      alert("Investigation search isn't built out in this version of the prototype.");
    });

    /* ---------------- Radiologist / Pathologist Details (card-medinvestigationdetails, Stage 2) ----------------
       Same field shape apart from the "Registration Number" vs.
       "Pathologist Number" label the user story calls out, so one factory
       drives both grids rather than duplicating the render logic. */
    function makePersonGrid(opts) {
      const { rowsKey, bodyId, numberField, addBtnId } = opts;
      function render(rec) {
        if (!rec[rowsKey] || !rec[rowsKey].length) {
          rec[rowsKey] = [{
            name: "", address: "", pincode: "", number: "",
            emailId: "", phoneNumber: "", labName: "", nablRegNo: "", reportDateTime: "",
          }];
        }
        const body = document.getElementById(bodyId);
        if (!body) return;
        const canRemove = rec[rowsKey].length > 1;

        body.innerHTML = rec[rowsKey].map((row, i) => `
        <tr data-row-index="${i}">
          <td><input type="text" class="pg2-field" data-field="name" value="${row.name || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="address" value="${row.address || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="pincode" value="${row.pincode || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="number" value="${row.number || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="emailId" value="${row.emailId || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="phoneNumber" value="${row.phoneNumber || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="labName" value="${row.labName || ""}"></td>
          <td><input type="text" class="pg2-field" data-field="nablRegNo" value="${row.nablRegNo || ""}"></td>
          <td><input type="datetime-local" class="pg2-field" data-field="reportDateTime" value="${row.reportDateTime || ""}"></td>
          <td class="col-sticky-action">
            <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
              </svg>
            </button>
          </td>
        </tr>
      `).join("");

        body.querySelectorAll(".pg2-field").forEach(el => {
          el.addEventListener("change", () => {
            const idx = Number(el.closest("tr").dataset.rowIndex);
            const rec2 = entries.find(x => x.inwardId === medicoTargetId);
            if (!rec2) return;
            rec2[rowsKey][idx][el.dataset.field] = el.value;
          });
        });

        body.querySelectorAll("[data-remove-row]").forEach(btn => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.dataset.removeRow);
            const rec2 = entries.find(x => x.inwardId === medicoTargetId);
            if (!rec2 || rec2[rowsKey].length === 1) return;
            rec2[rowsKey].splice(idx, 1);
            render(rec2);
          });
        });
      }

      document.getElementById(addBtnId).addEventListener("click", () => {
        const rec = entries.find(x => x.inwardId === medicoTargetId);
        if (!rec) return;
        rec[rowsKey] = rec[rowsKey] || [];
        rec[rowsKey].push({
          name: "", address: "", pincode: "", number: "",
          emailId: "", phoneNumber: "", labName: "", nablRegNo: "", reportDateTime: "",
        });
        render(rec);
      });

      return render;
    }

    const renderRadiologistGrid = makePersonGrid({
      rowsKey: "radiologistRows", bodyId: "radiologistGridBody",
      numberField: "Registration Number", addBtnId: "radiologistAddRowBtn",
    });
    const renderPathologistGrid = makePersonGrid({
      rowsKey: "pathologistRows", bodyId: "pathologistGridBody",
      numberField: "Pathologist Number", addBtnId: "pathologistAddRowBtn",
    });

    /* ---------------- Doctor Search modal (Consultant Details "Search" button) ---------------- */
    document.getElementById("doctorSearchCloseBtn").addEventListener("click", () => {
      document.getElementById("doctorSearchModal").classList.remove("show");
    });
    document.getElementById("doctorSearchCloseX").addEventListener("click", () => {
      document.getElementById("doctorSearchModal").classList.remove("show");
    });
    document.getElementById("doctorSearchBtn").addEventListener("click", () => {
      document.getElementById("doctorSearchResultsWrap").classList.remove("hidden");
      document.getElementById("doctorSearchResultsBody").innerHTML = `
    <div class="doc-result-item">
      <div class="doc-result-info">
        <div class="doc-result-name">Dr. Anil Mehta</div>
        <div class="doc-result-field"><strong>Reg. No:</strong> MCI-44821</div>
        <div class="doc-result-field"><strong>HPID:</strong> HPID-9981123</div>
        <div class="doc-result-field"><strong>Contact:</strong> 9811022345</div>
        <div class="doc-result-field"><strong>Speciality:</strong> Cardiology</div>
        <div class="doc-result-field"><strong>PAN:</strong> AXHPM4521K</div>
      </div>
      <button class="btn btn-primary btn-sm" type="button" id="doctorSelectBtn">Select</button>
    </div>
  `;
      document.getElementById("doctorSelectBtn").addEventListener("click", () => {
        const rec = entries.find(x => x.inwardId === medicoTargetId);
        if (!rec) return;
        const picked = {
          doctorName: "Dr. Anil Mehta", regNo: "MCI-44821", hpid: "HPID-9981123",
          contactNo: "9811022345", speciality: "Cardiology", panNo: "AXHPM4521K",
        };
        rec.consultantRows = rec.consultantRows || [];
        if (consultantSearchRowIndex !== null && rec.consultantRows[consultantSearchRowIndex]) {
          rec.consultantRows[consultantSearchRowIndex] = picked;
        } else {
          rec.consultantRows.push(picked);
        }
        renderConsultantGrid(rec);
        document.getElementById("doctorSearchModal").classList.remove("show");
      });
    });

    function applyQCViewMode(role) {
      // Disable all inputs in the wizard except the Hospital Daily
      // Cash / Accompanying Person sections (merged into Stage 4's
      // "Additional Sections" dropdown, formerly their own HC stage) and
      // remarks textareas.
      const wizard = document.getElementById('viewMedicoWizard');
      const hcStage = document.getElementById('card-medbilladditional');
      const hcStatusCard = document.getElementById('card-medhcstatus');
      const qcCommCard = document.getElementById('card-qcCommunication');
      wizard.querySelectorAll('input, select, textarea, button.btn-primary, button.btn-full-red').forEach(el => {
        // Skip HC stage elements, including the section-picker dropdown —
        // it needs to stay usable so QC/QC TL can switch between Hospital
        // Daily Cash and Accompanying Person to reach the editable grids.
        if (hcStage && hcStage.contains(el)) return;
        // Skip QC Communication card — fully interactive for QC
        if (qcCommCard && qcCommCard.contains(el)) return;
        // Skip remarks add textareas and add remark buttons
        if (el.id && el.id.startsWith('remarksInput')) return;
        if (el.id && el.id.startsWith('remarksAddBtn')) return;
        if (el.classList.contains('remark-add-box') || el.closest('.remark-add-box')) return;
        // Skip nav buttons
        if (['medicoPrevBtn', 'medicoNextBtn', 'medicoSubmitBtn', 'medicoDecisionBtn', 'medicoSaveDraftBtn', 'backToListFromMedicoBtn'].includes(el.id)) return;
        el.disabled = true;
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.65';
        el.style.cursor = 'not-allowed';
      });
      // Re-enable remarks textareas and add buttons in HC stage — except
      // the Accompanying Person grid's Type of Room select, which stays
      // disabled for every role (it's reference-only there, unlike
      // Hospital Daily Cash's own editable Type of Room column).
      if (hcStage) {
        hcStage.querySelectorAll('input, select, textarea, button').forEach(el => {
          if (el.matches('.hcexp-field[data-field="roomType"]')) return;
          el.disabled = false;
          el.style.pointerEvents = '';
          el.style.opacity = '';
          el.style.cursor = '';
        });
      }
      // Re-enable all remarks add boxes in every stage
      wizard.querySelectorAll('.remark-add-box input, .remark-add-box textarea, .remark-add-box button').forEach(el => {
        el.disabled = false;
        el.style.pointerEvents = '';
        el.style.opacity = '';
        el.style.cursor = '';
      });
      // Re-enable role-specific Opinion field:
      // QC/QC TL → Auditor Opinion editable; CEM role → CEM Opinion
      // editable; CMO role → CMO Opinion editable. Every other Opinion
      // field for that role stays disabled from the blanket pass above.
      const auditorField = document.getElementById('qcAuditorOpinion');
      const cemField = document.getElementById('qcCemOpinion');
      const cmoField = document.getElementById('qcCmoOpinion');
      if ((role === 'QC' || role === 'QC TL') && auditorField) {
        auditorField.disabled = false;
        auditorField.style.pointerEvents = '';
        auditorField.style.opacity = '';
        auditorField.style.cursor = '';
      }
      // QC Checklist TABLE ONLY (Yes/No radios + per-row Remarks, inside
      // #qcChecklistTable) — editable for QC only; QC TL, CMO, and CEM all
      // see it read-only. Scoped to the table specifically (not the whole
      // card-qcchecklist) so this doesn't also re-enable the CEM/CMO
      // Opinion selects that live in the same card — those keep their own
      // role-scoped re-enable below, unaffected.
      if (role === 'QC') {
        const qcChecklistTable = document.getElementById('qcChecklistTable');
        if (qcChecklistTable) {
          qcChecklistTable.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = false;
            el.style.pointerEvents = '';
            el.style.opacity = '';
            el.style.cursor = '';
          });
        }
      }
      // Confirm NEFT Account Number is mandatory for QC/QC TL to fill in
      // before saving (see medicoSaveDraftBtn), so it needs to be editable
      // for both — it isn't in MED_SETTLEMENT_FIELD_ACCESS (that map only
      // defines nonMedico/medico), so applyMedFieldAccess leaves it
      // disabled for every other role including QC/QC TL.
      if (role === 'QC' || role === 'QC TL') {
        const neftInput = document.getElementById('stNeftAccountNo');
        if (neftInput) {
          neftInput.disabled = false;
          neftInput.style.pointerEvents = '';
          neftInput.style.opacity = '';
          neftInput.style.cursor = '';
        }
      }
      if (role === 'CEM' && cemField) {
        cemField.disabled = false;
        cemField.style.pointerEvents = '';
        cemField.style.opacity = '';
        cemField.style.cursor = '';
      }
      if (role === 'CMO' && cmoField) {
        cmoField.disabled = false;
        cmoField.style.pointerEvents = '';
        cmoField.style.opacity = '';
        cmoField.style.cursor = '';
      }
    }

    /* ---------------- Hospital Daily Cash (card-medhc, Stage HC) ----------------
       Legacy screen shows this as a repeating row grid (one row per room
       type/period, same pattern as Hospitalization Details), so it's
       modeled as an array on the record. Payable Amount per row is
       calculated (Days x Benefit Per Day - Deduction) and read-only;
       totals sum across all rows. */
    const HC_ROOM_TYPE_OPTIONS = ["General Ward", "Semi-Private", "Private", "ICU", "ICCU"];

    function hcRowPayable(row) {
      return Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
    }

    function renderHCGrid(rec) {
      if (!rec.hcRows || !rec.hcRows.length) {
        rec.hcRows = [{ roomType: "Private", days: 5, benefitPerDay: 2000, deduction: 500, remarks: "Standard daily cash benefit applied" }];
      }
      const body = document.getElementById("hcGridBody");
      if (!body) return;
      const canRemove = rec.hcRows.length > 1;

      body.innerHTML = rec.hcRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><select class="hc-field" data-field="roomType">${selectOptionsHtml(HC_ROOM_TYPE_OPTIONS, row.roomType)}</select></td>
        <td><input type="number" class="hc-field" data-field="days" value="${row.days || 0}" min="0"></td>
        <td><input type="number" class="hc-field" data-field="benefitPerDay" value="${row.benefitPerDay || 0}" min="0"></td>
        <td><input type="number" class="hc-field" data-field="deduction" value="${row.deduction || 0}" min="0" max="${(Number(row.days) || 0) * (Number(row.benefitPerDay) || 0)}"></td>
        <td class="mono">${fmtCurrency(hcRowPayable(row))}</td>
        <td><textarea class="hc-field" data-field="remarks" rows="2" placeholder="Enter remarks">${row.remarks || ""}</textarea></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".hc-field").forEach(el => {
        el.addEventListener("change", () => {
          const rowEl = el.closest("tr");
          const idx = Number(rowEl.dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          const field = el.dataset.field;
          const row = rec2.hcRows[idx];
          row[field] = ["days", "benefitPerDay", "deduction"].includes(field) ? (Number(el.value) || 0) : el.value;
          // Deduction can never exceed this row's claimed amount (days × benefit/day).
          const claimedAmount = (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
          if (row.deduction > claimedAmount) row.deduction = claimedAmount;
          renderHCGrid(rec2);
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.hcRows.length === 1) return;
          rec2.hcRows.splice(idx, 1);
          renderHCGrid(rec2);
        });
      });

      const totals = rec.hcRows.reduce((acc, row) => {
        acc.claimed += (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
        acc.deducted += Number(row.deduction) || 0;
        acc.approved += hcRowPayable(row);
        return acc;
      }, { claimed: 0, deducted: 0, approved: 0 });

      document.getElementById("hcTotalClaimed").textContent = fmtCurrency(totals.claimed);
      document.getElementById("hcTotalDeduction").textContent = fmtCurrency(totals.deducted);
      document.getElementById("hcTotalApproved").textContent = fmtCurrency(totals.approved);

      // Wrap each row's Room Type <select> (.hc-field) as a
      // searchable-select, same post-build wiring step as the row's
      // change listener and remove-row button above.
      initSearchableSelectsIn(body);
    }

    document.getElementById("hcAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.hcRows = rec.hcRows || [];
      rec.hcRows.push({ roomType: "", days: 0, benefitPerDay: 0, deduction: 0, remarks: "" });
      renderHCGrid(rec);
    });

    /* ---------------- Expenses on Accompanying Person (card-medhcexp, Stage HC) ----------------
       Same repeating-row pattern as Hospital Daily Cash, plus its own
       Type of Room column — shown for reference but always disabled,
       since accompanying-person expenses aren't tied to a specific
       room selection the way the patient's own Hospital Daily Cash is.
       Payable Amount per row is calculated and read-only. */
    function hcExpRowPayable(row) {
      return Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
    }

    function renderHCExpGrid(rec) {
      if (!rec.hcExpRows || !rec.hcExpRows.length) {
        rec.hcExpRows = [{ roomType: "Private", days: 3, benefitPerDay: 500, deduction: 0, remarks: "Accompanying person - spouse" }];
      }
      const body = document.getElementById("hcExpGridBody");
      if (!body) return;
      const canRemove = rec.hcExpRows.length > 1;

      body.innerHTML = rec.hcExpRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><select class="hcexp-field" data-field="roomType" disabled>${selectOptionsHtml(HC_ROOM_TYPE_OPTIONS, row.roomType)}</select></td>
        <td><input type="number" class="hcexp-field" data-field="days" value="${row.days || 0}" min="0"></td>
        <td><input type="number" class="hcexp-field" data-field="benefitPerDay" value="${row.benefitPerDay || 0}" min="0"></td>
        <td><input type="number" class="hcexp-field" data-field="deduction" value="${row.deduction || 0}" min="0" max="${(Number(row.days) || 0) * (Number(row.benefitPerDay) || 0)}"></td>
        <td class="mono">${fmtCurrency(hcExpRowPayable(row))}</td>
        <td><textarea class="hcexp-field" data-field="remarks" rows="2" placeholder="Enter remarks">${row.remarks || ""}</textarea></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".hcexp-field").forEach(el => {
        el.addEventListener("change", () => {
          const rowEl = el.closest("tr");
          const idx = Number(rowEl.dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          const field = el.dataset.field;
          const row = rec2.hcExpRows[idx];
          row[field] = ["days", "benefitPerDay", "deduction"].includes(field) ? (Number(el.value) || 0) : el.value;
          // Deduction can never exceed this row's claimed amount (days × benefit/day).
          const claimedAmount = (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
          if (row.deduction > claimedAmount) row.deduction = claimedAmount;
          renderHCExpGrid(rec2);
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.hcExpRows.length === 1) return;
          rec2.hcExpRows.splice(idx, 1);
          renderHCExpGrid(rec2);
        });
      });

      const totals = rec.hcExpRows.reduce((acc, row) => {
        acc.claimed += (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
        acc.deducted += Number(row.deduction) || 0;
        acc.approved += hcExpRowPayable(row);
        return acc;
      }, { claimed: 0, deducted: 0, approved: 0 });

      document.getElementById("hcExpTotalClaimed").textContent = fmtCurrency(totals.claimed);
      document.getElementById("hcExpTotalDeduction").textContent = fmtCurrency(totals.deducted);
      document.getElementById("hcExpTotalApproved").textContent = fmtCurrency(totals.approved);

      // Wrap each row's (always-disabled) Room Type <select> (.hcexp-field)
      // as a searchable-select — initSearchableSelect reads the static
      // `disabled` attribute from the template string above lazily at
      // interaction time, so it renders greyed/non-interactive immediately.
      initSearchableSelectsIn(body);
    }

    document.getElementById("hcExpAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.hcExpRows = rec.hcExpRows || [];
      rec.hcExpRows.push({ roomType: "", days: 0, benefitPerDay: 0, deduction: 0, remarks: "" });
      renderHCExpGrid(rec);
    });

    /* ---------------- Read-Only HC render functions (Medico role) ----------------
       These mirror renderHCGrid / renderHCExpGrid but use the *RO element IDs,
       render plain text cells (no inputs/selects/textareas), and omit the
       Add Row / Remove Row controls entirely. */
    function renderHCGridRO(rec) {
      const rows = (rec.hcRows && rec.hcRows.length) ? rec.hcRows
        : [{ roomType: "Private", days: 5, benefitPerDay: 2000, deduction: 500, remarks: "Standard daily cash benefit applied" }];
      const body = document.getElementById("hcGridBodyRO");
      if (!body) return;

      body.innerHTML = rows.map(row => {
        const payable = Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
        return `
        <tr>
          <td>${row.roomType || "—"}</td>
          <td>${row.days || 0}</td>
          <td>${fmtCurrency(Number(row.benefitPerDay) || 0)}</td>
          <td>${fmtCurrency(Number(row.deduction) || 0)}</td>
          <td class="mono">${fmtCurrency(payable)}</td>
          <td>${row.remarks || "—"}</td>
        </tr>`;
      }).join("");

      const totals = rows.reduce((acc, row) => {
        acc.claimed += (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
        acc.deducted += Number(row.deduction) || 0;
        acc.approved += Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
        return acc;
      }, { claimed: 0, deducted: 0, approved: 0 });

      document.getElementById("hcTotalClaimedRO").textContent = fmtCurrency(totals.claimed);
      document.getElementById("hcTotalDeductionRO").textContent = fmtCurrency(totals.deducted);
      document.getElementById("hcTotalApprovedRO").textContent = fmtCurrency(totals.approved);
    }

    function renderHCExpGridRO(rec) {
      const rows = (rec.hcExpRows && rec.hcExpRows.length) ? rec.hcExpRows
        : [{ roomType: "Private", days: 3, benefitPerDay: 500, deduction: 0, remarks: "Accompanying person - spouse" }];
      const body = document.getElementById("hcExpGridBodyRO");
      if (!body) return;

      body.innerHTML = rows.map(row => {
        const payable = Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
        return `
        <tr>
          <td>${row.roomType || "—"}</td>
          <td>${row.days || 0}</td>
          <td>${fmtCurrency(Number(row.benefitPerDay) || 0)}</td>
          <td>${fmtCurrency(Number(row.deduction) || 0)}</td>
          <td class="mono">${fmtCurrency(payable)}</td>
          <td>${row.remarks || "—"}</td>
        </tr>`;
      }).join("");

      const totals = rows.reduce((acc, row) => {
        acc.claimed += (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0);
        acc.deducted += Number(row.deduction) || 0;
        acc.approved += Math.max(0, (Number(row.days) || 0) * (Number(row.benefitPerDay) || 0) - (Number(row.deduction) || 0));
        return acc;
      }, { claimed: 0, deducted: 0, approved: 0 });

      document.getElementById("hcExpTotalClaimedRO").textContent = fmtCurrency(totals.claimed);
      document.getElementById("hcExpTotalDeductionRO").textContent = fmtCurrency(totals.deducted);
      document.getElementById("hcExpTotalApprovedRO").textContent = fmtCurrency(totals.approved);
    }

    function populatePaymentAuditorDummyData() {
      const dummies = {
        hdHospitalName: 'CHRISTIAN MEDICAL COLLEGE & HOSPITAL',
        hdProviderNo: 'HEGIC-HS-02666',
        hdRegNo: 'REG-CMC-2019-0041',
        hdAddress: 'BROWN ROAD',
        hdLocation: 'LUDHIANA',
        hdState: 'PUNJAB',
        hdCity: 'LUDHIANA',
        hdPinCode: '141008',
        hdPanNo: 'AAATC2820L',
        hdContactNo: '0161-2228917',
        hdEmailId: 'chscmc2@hotmail.com',
        hdProprietorName: 'Dr. Thomas John',
        cdAssociatedConditions: 'Hypertension',
        cdComorbidConditions: 'Type 2 Diabetes Mellitus',
        cdClinicalFindings: 'Chest pain on exertion, mild dyspnea',
        cdBloodPressure: '140/90 mmHg',
        cdPerAbdomen: 'Soft, non-tender',
        cdPulse: '78 bpm',
        cdCardioVascular: 'S1 S2 heard, no murmur',
        cdRespiratory: 'Clear to auscultation bilaterally',
        cdCns: 'Alert and oriented',
        cdAilment: 'Atherosclerotic heart disease of native cc',
        cdIcdCode: 'I25.10',
        cdDiagnosis1: 'Diseases of the circulatory system',
        cdDiagnosisCode1: 'I00-I99',
        cdDiagnosis2: 'Ischaemic heart diseases',
        cdDiagnosisCode2: 'I20-I25',
        cdDiagnosis3: 'Chronic ischemic heart disease',
        cdDiagnosisCode3: 'I25',
        cdLengthOfStay: '1',
        cdDelayInSurgery: '0',
        cdTypeOfMedicine: '1',
        cdNumberOfBed: '1',
        cdConceptId: '41273',
        cdDateOfAdmission: '2026-05-20',
        cdDateOfDischarge: '2026-05-20',
        cdCptCode: '93000',
        cdShortDescriptor: 'Electrocardiogram',
        cdMediumDescriptor: 'Electrocardiogram, routine ECG with at least 12 leads',
        cdDescriptor: 'Electrocardiogram, routine ECG',
        cdParentId: 'CPT-93000',
        bdBillNo: '1270',
        bdDate: '2026-05-20',
        bdUnits: '1',
        bdAmountPerUnit: '4630',
        bdClaimedAmount: '4630',
        bdTariffAmount: '4500',
        bdTariffDeduction: '0',
        bdDeduction: '0',
        bdDeductionRemark: 'No deduction applicable',
        bdDiscountAsPerTariff: '0',
        bdDiscValue: '0',
        bdBillRemarks: 'Bill Clear',
        stPolicyDeduction: '0',
        stPolicyDeductionRemarks: 'No policy deduction',
        stCoPayment: '0',
        stCopayRemark: 'Co-pay not applicable',
        stZonalCopayment: '0',
        stHospitalGstin: '03AAATC2820L1ZV',
        stGstFromState: 'Punjab',
        stDummyGstin: '27AAACH7409R1Z3',
        stGstToState: 'Maharashtra',
        stGstRoomRentAmount: '0',
        stGstClaimedByHospital: '0',
        stTotalGstCalculated: '0',
        stFinalPayableGst: '0',
        stRoomRentIgst: '0',
        stRoomRentCgst: '0',
        stRoomRentSgst: '0',
        stGstDeductions: '0',
        stGstDeductionRemarks: 'No GST deduction',
        stTempGrossAmount: '108680',
        stGrossIncGst: '108680',
        stGrossExGst: '108680',
        stPremiumRecovery: '0',
        stTdsAmount: '0',
        stNetPayableExGst: '108680',
        stNetPayableIncGst: '108680',
        stLastDocDate: '2026-07-08',
        stTatDays: '2',
        stRbiRate: '7.50 %',
        stPenalInterest: '0',
        stPaymentMode: 'NEFT',
        stMedicoOpinion: 'Claim reviewed and approved. All documents verified. No discrepancies found.',
        stMedicoTLRemark: 'Settlement approved by Payment Auditor. Net payable amount confirmed at ₹1,08,680.',
      };
      Object.entries(dummies).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = val;
      });
      // hdState's dummy value above may have just populated the field —
      // re-narrow hdCity's own dropdown item list to match (see
      // syncHdCityOptions above; harmless no-op if hdState was already
      // filled, since the `if (el && !el.value)` guard skipped it).
      syncHdCityOptions();
      // Selects
      const selects = {
        hdHospitalType: 'Hospital/Nursing Home',
        hdAccommodationType: 'ICU',
        hdRoomType: 'Private',
        hdRoomCategory: 'Category A',
        cdSystemOfMedicine: 'Allopathy',
        cdTreatmentType: 'Medical',
        cdSurgeriesOptima: 'None',
        stClaimStatus: 'Deny',
        stStatusNonMedico: 'Submitted to Medico TL',
        bdLevel1: 'Hospitalization',
        bdLevel2: 'ICU Charges',
        bdLevel3: 'ICU Charges',
      };
      Object.entries(selects).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = val;
      });
      // Re-sync every converted select's visible proxy label after the
      // bulk .value writes above (see shared/searchable-select.js) — this
      // dummy-data filler is one of the sweep points identified in
      // AGENTS.md Iterations for this change.
      refreshAllSearchableSelects();
      // Checkboxes
      ['cdIllnessOthers', 'cdCareTypeInpatient'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.checked) el.checked = true;
      });
      // Settlement radio
      document.getElementById('stPaymentStatusFinal').checked = true;
      document.getElementById('stOtherCostNo').checked = true;
    }

    // ₹5,00,000 — a high-value Priority Claim ("High Paying Customer") at
    // or above this claimAmount routes Payment Auditor's decision through
    // the High-Value Email Approval card instead of the plain Decision
    // card (see isEmailApprovalEligible / paEmailApprovalSection).
    const EMAIL_APPROVAL_SI_THRESHOLD = 500000;
    function isEmailApprovalEligible(rec) {
      return !!(rec && rec.isPriorityClaim && rec.priorityReason === "High Paying Customer" && Number(rec.claimAmount) >= EMAIL_APPROVAL_SI_THRESHOLD);
    }
    // Labels the read-only "Approval Matrix Slab" field on the High-Value
    // Email Approval card as the eligibility threshold itself — no tiered
    // bracket table exists anywhere else in this codebase to reuse.
    function approvalMatrixSlab(amount) {
      return `${fmtCurrency(EMAIL_APPROVAL_SI_THRESHOLD)} and above`;
    }

    // Read-only outcome of the Basic Details Penny Drop section (Payment
    // Auditor has no access to that section itself, per
    // applyPaymentAuditorViewMode()'s whole-wizard disable pass) —
    // Reimbursement claims only, per the CP-Payment Auditor user story.
    function renderPennyDropSummary(rec) {
      const card = document.getElementById("card-pennydropsummary");
      if (!card) return;
      const visible = rec.claimSubType === "Reimbursement";
      card.classList.toggle("hidden", !visible);
      if (!visible) return;
      let statusText = "Not Verified";
      if (rec.pennyDropVerified) statusText = "Verified";
      else if (rec.pennyDropFailed) statusText = "Failed";
      document.getElementById("pdsVerificationStatus").value = statusText;
      document.getElementById("pdsVerifiedBy").value = rec.pennyDropVerifiedBy || "-";
      document.getElementById("pdsBypassedBy").value = rec.pennyDropBypassedBy || "-";
      document.getElementById("pdsBypassReason").value = rec.pennyDropBypassReason || "-";
      document.getElementById("pdsBypassRemarks").value = rec.pennyDropBypassRemarks || "-";
    }

    // Payment Auditor Decision vs High-Value Email Approval — mutually
    // exclusive cards, both landing on Settlement (Stage 5). Populates
    // the Email Approval card's read-only fields when eligible.
    function applyPaymentAuditorDecisionCards(rec) {
      const decisionCard = document.getElementById("paDecisionSection");
      const emailCard = document.getElementById("paEmailApprovalSection");
      if (!decisionCard || !emailCard) return;
      const emailEligible = isEmailApprovalEligible(rec);
      decisionCard.classList.toggle("hidden", emailEligible);
      emailCard.classList.toggle("hidden", !emailEligible);
      if (emailEligible) {
        document.getElementById("paEmailPriorityReason").value = rec.priorityReason || "-";
        document.getElementById("paEmailSumInsured").value = fmtCurrency(rec.claimAmount);
        document.getElementById("paEmailApprovalSlab").value = approvalMatrixSlab(rec.claimAmount);
      }
    }

    function applyPaymentAuditorViewMode() {
      // Disable ALL inputs, selects, textareas, buttons across the entire wizard
      const wizard = document.getElementById('viewMedicoWizard');
      wizard.querySelectorAll('input, select, textarea, button').forEach(el => {
        if (['backToListFromMedicoBtn', 'medicoPrevBtn', 'medicoNextBtn', 'medicoSaveDraftBtn', 'medicoDecisionBtn'].includes(el.id)) return;
        // Stage-jump buttons are navigation, not data entry — a blanket
        // disable here trapped Payment Auditor on Stage 1 with no way to
        // reach Settlement at all (real pre-existing bug, fixed here).
        if (el.classList.contains('wizard-stage-btn')) return;
        el.disabled = true;
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.7';
        el.style.cursor = 'not-allowed';
      });
      // Hide submit/QC buttons but keep Claim Decision visible
      ['medicoSubmitBtn', 'qcDecisionBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      // Re-enable the Payment Auditor Decision / High-Value Email Approval
      // cards' own Select Status + Remark inputs — everything else on the
      // wizard stays view-only for this role, but these two cards are the
      // one place Payment Auditor actually records a decision.
      [document.getElementById('paDecisionSection'), document.getElementById('paEmailApprovalSection')].forEach(card => {
        if (!card) return;
        card.querySelectorAll('select, textarea').forEach(el => {
          el.disabled = false;
          el.style.pointerEvents = '';
          el.style.opacity = '';
          el.style.cursor = '';
        });
      });
      // Show a view-only banner
      const bar = document.getElementById('medicoBottomBar');
      const existing = document.getElementById('paViewBanner');
      if (existing) existing.remove();
      if (bar) {
        const banner = document.createElement('span');
        banner.id = 'paViewBanner';
        banner.style.cssText = 'font-size:12px;font-weight:700;color:var(--muted);display:flex;align-items:center;gap:6px;';
        banner.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg> View Only';
        bar.querySelector('div').before(banner);
      }
    }

    /* ---------------- Document Checklist ---------------- */
    // Shared renderer for any checklist-style checkbox-row list. `storageKey`
    // Matrix (Basic Details > Penny Drop Account Status): document
    // sub-checklist distinct from the app's own upload-category
    // DOCUMENT_CATEGORIES — kept as its own array/storage key so these
    // never leak into the document-upload "Tag as category" dropdowns.
    const PENNY_DROP_CHECKLIST_ITEMS = [
      "Duly Signed Claim Form",
      "Discharge Summary",
      "Final Bill and Receipts",
      "NEFT",
      "KYC (claim amount 1 Lakh and above)",
      "Investigation report",
      "Pharmacy details",
      "MLC (in case accidental claim)",
    ];
    // Simple 2-column checkbox grid — distinct from renderChecklistGroup's
    // Received/Missing tag style, since this list is a static required-
    // documents checklist (matches the reference screenshot), not a
    // received/missing tracker against uploaded files.
    function renderPennyDropChecklist(rec) {
      rec.pennyDropChecklist = rec.pennyDropChecklist || {};
      const container = document.getElementById("medPennyDropChecklist");

      container.innerHTML = PENNY_DROP_CHECKLIST_ITEMS.map(item => {
        const checked = !!rec.pennyDropChecklist[item];
        return `
      <label class="req-doc-item">
        <input type="checkbox" class="req-doc-checkbox" data-item="${item}" ${checked ? "checked" : ""}>
        <span>${item}</span>
      </label>
    `;
      }).join("");

      container.querySelectorAll(".req-doc-checkbox").forEach(cb => {
        cb.addEventListener("change", () => {
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.pennyDropChecklist = rec2.pennyDropChecklist || {};
          rec2.pennyDropChecklist[cb.dataset.item] = cb.checked;
        });
      });
    }

    /* ---------------- Persistent bottom bar: Previous / Save Draft / Next / Submit / Decision ---------------- */
    function updateMedicoBottomBar() {
      const currentRole = getCurrentRole();
      const stageIds = getMedicoStageList().map(s => s.id);
      const curIdx = stageIds.indexOf(medicoActiveStage);
      const isFirst = curIdx === 0;
      const isLast = curIdx === stageIds.length - 1;

      const prevBtn = document.getElementById("medicoPrevBtn");
      const nextBtn = document.getElementById("medicoNextBtn");
      const submitBtn = document.getElementById("medicoSubmitBtn");
      const decisionBtn = document.getElementById("medicoDecisionBtn");

      prevBtn.disabled = isFirst;
      prevBtn.style.opacity = isFirst ? "0.4" : "1";
      prevBtn.style.cursor = isFirst ? "not-allowed" : "pointer";

      nextBtn.classList.toggle("hidden", isLast);

      const isQC = currentRole === "QC" || currentRole === "QC TL" || currentRole === "CMO" || currentRole === "CEM";
      const isNonMedico = !isQC && (currentRole === "Non Medico" || currentRole === "Non Medico TL");
      const isMedico = currentRole === "Medico" || currentRole === "Medico TL";
      const isPaymentAuditor = currentRole === "Payment Auditor - Settlement User";

      submitBtn.classList.toggle("hidden", !(isLast && isNonMedico));
      decisionBtn.classList.toggle("hidden", !(isLast && (isMedico || isPaymentAuditor)));
      document.getElementById("qcDecisionBtn").classList.toggle("hidden", !(isLast && isQC));
      document.getElementById("qcApproveBtn") && document.getElementById("qcApproveBtn").classList.add("hidden");
      document.getElementById("qcDenyBtn") && document.getElementById("qcDenyBtn").classList.add("hidden");
      document.getElementById("qcQueryBtn") && document.getElementById("qcQueryBtn").classList.add("hidden");
    }

    function repositionMedicoBottomBar() {
      // Positioning is now handled purely by CSS (see .medico-bottom-bar /
      // .sidebar.collapsed ~ .main .medico-bottom-bar in styles.css), same
      // as the other fixed footers — clear any leftover inline left so it
      // doesn't override the CSS rule.
      const bar = document.getElementById("medicoBottomBar");
      bar.style.left = "";
    }


    document.getElementById("medicoPrevBtn").addEventListener("click", () => {
      const ids = getMedicoStageList().map(s => s.id);
      const idx = ids.indexOf(medicoActiveStage);
      if (idx > 0) switchMedicoStage(ids[idx - 1], { scrollTop: true });
    });
    document.getElementById("medicoNextBtn").addEventListener("click", () => {
      const ids = getMedicoStageList().map(s => s.id);
      const idx = ids.indexOf(medicoActiveStage);
      if (idx < ids.length - 1) switchMedicoStage(ids[idx + 1], { scrollTop: true });
    });
    // NEFT account numbers are numeric only — strip any letters/symbols
    // as the user types, same as digitsOnly() used for pin codes/contact
    // numbers elsewhere in this file.
    digitsOnly(document.getElementById("stNeftAccountNo"), 18);
    document.getElementById("stNeftAccountNo").addEventListener("input", (e) => {
      if (e.target.value.trim()) e.target.closest(".field").classList.remove("has-error");
    });

    // Clear the inline Select Status error as soon as a value is chosen —
    // same pattern as stNeftAccountNo above.
    document.getElementById("paDecisionStatus").addEventListener("change", (e) => {
      if (e.target.value) e.target.closest(".field").classList.remove("has-error");
    });
    document.getElementById("paEmailStatus").addEventListener("change", (e) => {
      if (e.target.value) e.target.closest(".field").classList.remove("has-error");
    });

    // Copay Remark / Zonal Copay Remarks become mandatory only while their
    // paired "Edit Copayment"/"Edit Zonal Copayment" checkbox is checked —
    // checking the box surfaces the requirement immediately (rather than
    // waiting for Save Draft) so the error doesn't feel like it came out of
    // nowhere; unchecking it clears any error already shown, same as typing
    // a value does.
    function toggleConditionalRemarkRequired(checkboxId, remarkId) {
      const checkbox = document.getElementById(checkboxId);
      const remarkInput = document.getElementById(remarkId);
      const remarkField = remarkInput.closest(".field");
      // Remark stays disabled/read-only until its Edit checkbox is checked
      // — checking it unlocks the field and makes it conditionally
      // mandatory; unchecking re-locks it and clears any pending error
      // (the value itself is left in place rather than cleared, in case
      // the box gets re-checked).
      checkbox.addEventListener("change", () => {
        remarkInput.disabled = !checkbox.checked;
        if (!checkbox.checked || remarkInput.value.trim()) {
          remarkField.classList.remove("has-error");
        }
      });
      remarkInput.addEventListener("input", () => {
        if (remarkInput.value.trim()) remarkField.classList.remove("has-error");
      });
    }
    toggleConditionalRemarkRequired("stEditCopayment", "stCopayRemark");
    toggleConditionalRemarkRequired("stEditZonalCopayment", "stZonalCopayRemark");

    document.getElementById("medicoSaveDraftBtn").addEventListener("click", () => {
      // Confirm NEFT Account Number is mandatory for QC/QC TL — block the
      // save and surface the error inline only (.field.has-error /
      // .err-msg, matching the app's existing pattern), no alert() popup.
      const role = getCurrentRole();
      if (role === "QC" || role === "QC TL") {
        const neftField = document.getElementById("stNeftAccountNoField");
        const neftInput = document.getElementById("stNeftAccountNo");
        const isBlank = !neftInput || !neftInput.value.trim();
        if (neftField) neftField.classList.toggle("has-error", isBlank);
        if (isBlank) {
          if (neftInput) neftInput.focus();
          return;
        }
      }
      // Copay Remark / Zonal Copay Remarks: required only when their own
      // Edit checkbox is checked, same inline-error convention as above.
      const conditionalRemarks = [
        { checkboxId: "stEditCopayment", remarkId: "stCopayRemark" },
        { checkboxId: "stEditZonalCopayment", remarkId: "stZonalCopayRemark" },
      ];
      for (const { checkboxId, remarkId } of conditionalRemarks) {
        const checkbox = document.getElementById(checkboxId);
        const remarkInput = document.getElementById(remarkId);
        const remarkField = remarkInput.closest(".field");
        const isBlank = checkbox.checked && !remarkInput.value.trim();
        remarkField.classList.toggle("has-error", isBlank);
        if (isBlank) {
          remarkInput.focus();
          return;
        }
      }
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec) rec.updatedDate = new Date().toISOString();
      alert(`Draft saved for ${medicoTargetId}.`);
    });

    document.getElementById("qcDecisionBtn").addEventListener("click", () => {
      decisionSelectedValue = null;
      document.getElementById("decisionRemarks").value = "";
      document.querySelectorAll(".decision-option").forEach(o => o.classList.remove("selected"));
      document.getElementById("decisionModal").classList.add("show");
    });

    document.getElementById("medicoSubmitBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec) {
        rec.updatedDate = new Date().toISOString();
      }
      document.getElementById("successTitle").textContent = "Claim Intimation Submitted";
      document.getElementById("successSub").textContent = `${rec ? rec.inwardId : medicoTargetId} has been marked Completed.`;
      document.getElementById("modalInwardNo").textContent = rec ? rec.claimId : medicoTargetId;
      showSuccessModal({ label: "View in Claim List", onView: goToClaimsList });
    });

    /* ---------------- Claim Decision (Medico) ---------------- */
    let decisionSelectedValue = null;

    // Payment Auditor's "Confirm Decision" doesn't open the shared
    // Approve/Reject/Raise-Query modal Medico uses — it validates and
    // records whichever of the two inline Settlement cards is actually
    // visible (paDecisionSection vs paEmailApprovalSection, mutually
    // exclusive — see applyPaymentAuditorDecisionCards), Approve/Reject
    // only, per the CP-Payment Auditor user story's UI Explanation.
    function confirmPaymentAuditorDecision() {
      const emailCard = document.getElementById("paEmailApprovalSection");
      const viaEmail = emailCard && !emailCard.classList.contains("hidden");
      const statusId = viaEmail ? "paEmailStatus" : "paDecisionStatus";
      const remarkId = viaEmail ? "paEmailRemark" : "paDecisionRemark";
      const fieldId = viaEmail ? "paEmailStatusField" : "paDecisionStatusField";
      const statusEl = document.getElementById(statusId);
      const fieldEl = document.getElementById(fieldId);
      const isBlank = !statusEl || !statusEl.value;
      if (fieldEl) fieldEl.classList.toggle("has-error", isBlank);
      if (isBlank) {
        if (statusEl) statusEl.focus();
        return;
      }
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      const decisionValue = statusEl.value;
      const remarkValue = document.getElementById(remarkId).value;
      if (rec) {
        rec.medicoStatus = decisionValue;
        rec.paymentAuditorDecisionVia = viaEmail ? "Email" : "Portal";
        rec.paymentAuditorRemark = remarkValue;
        rec.updatedDate = new Date().toISOString();
      }
      document.getElementById("successTitle").textContent = "Claim Decision Recorded";
      document.getElementById("successSub").textContent = `${rec ? rec.claimId : medicoTargetId} marked as "${decisionValue}" (via ${viaEmail ? "Email" : "Portal"}).`;
      document.getElementById("modalInwardNo").textContent = rec ? rec.claimId : medicoTargetId;
      showSuccessModal({ label: "View in Claim List", onView: goToClaimsList });
    }

    document.getElementById("medicoDecisionBtn").addEventListener("click", () => {
      if (getCurrentRole() === "Payment Auditor - Settlement User") {
        confirmPaymentAuditorDecision();
        return;
      }
      decisionSelectedValue = null;
      document.getElementById("decisionRemarks").value = "";
      document.querySelectorAll("#decisionOptionList .assign-option").forEach(o => o.classList.remove("selected"));
      document.querySelectorAll('input[name="claimDecision"]').forEach(r => r.checked = false);
      document.getElementById("decisionModal").classList.add("show");
    });

    document.querySelectorAll("#decisionOptionList .assign-option").forEach(opt => {
      opt.addEventListener("click", () => {
        decisionSelectedValue = opt.dataset.value;
        document.querySelectorAll("#decisionOptionList .assign-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        opt.querySelector('input[type="radio"]').checked = true;
      });
    });

    document.getElementById("decisionCancelBtn").addEventListener("click", () => {
      document.getElementById("decisionModal").classList.remove("show");
    });

    document.getElementById("decisionConfirmBtn").addEventListener("click", () => {
      if (!decisionSelectedValue) {
        alert("Select Approve or Reject before confirming.");
        return;
      }
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec) {
        rec.medicoStatus = decisionSelectedValue;
        rec.updatedDate = new Date().toISOString();
      }
      document.getElementById("decisionModal").classList.remove("show");

      document.getElementById("successTitle").textContent = "Claim Decision Recorded";
      document.getElementById("successSub").textContent = `${rec ? rec.claimId : medicoTargetId} marked as "${decisionSelectedValue}".`;
      document.getElementById("modalInwardNo").textContent = rec ? rec.claimId : medicoTargetId;
      showSuccessModal({ label: "View in Claim List", onView: goToClaimsList });
    });

    document.getElementById("breadcrumbClaimsLink").addEventListener("click", (e) => {
      e.preventDefault();
      goToClaimsList();
    });

    /* =====================================================================
       QC COMMUNICATION GRID — same data-backed row pattern as Hospital
       Daily Cash (renderHCGrid): rows live on rec.qcCommRows, re-rendered
       from data on every change via renderQcCommGrid. Built with
       createElement/DocumentFragment rather than innerHTML template
       strings, per the "no static HTML inside JS" rule.
    ===================================================================== */
    const QC_COMM_MODE_OPTIONS = ["Email", "SMS"];
    const QC_COMM_RECIPIENT_OPTIONS = ["Broker", "Customer"];

    function buildSelectOptions(selectEl, options, selected) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = !selected;
      placeholder.textContent = "--Select--";
      selectEl.appendChild(placeholder);
      options.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        opt.selected = o === selected;
        selectEl.appendChild(opt);
      });
    }

    function renderQcCommGrid(rec) {
      if (!rec.qcCommRows || !rec.qcCommRows.length) {
        rec.qcCommRows = [{ mode: "", recipient: "", details: "" }];
      }
      const body = document.getElementById("qcCommGridBody");
      if (!body) return;
      const canRemove = rec.qcCommRows.length > 1;

      const frag = document.createDocumentFragment();
      rec.qcCommRows.forEach((row, i) => {
        const tr = document.createElement("tr");
        tr.dataset.rowIndex = String(i);

        const modeTd = document.createElement("td");
        const modeSelect = document.createElement("select");
        modeSelect.className = "qc-comm-field";
        modeSelect.dataset.field = "mode";
        buildSelectOptions(modeSelect, QC_COMM_MODE_OPTIONS, row.mode);
        modeTd.appendChild(modeSelect);

        const recipientTd = document.createElement("td");
        const recipientSelect = document.createElement("select");
        recipientSelect.className = "qc-comm-field";
        recipientSelect.dataset.field = "recipient";
        buildSelectOptions(recipientSelect, QC_COMM_RECIPIENT_OPTIONS, row.recipient);
        recipientTd.appendChild(recipientSelect);

        const detailsTd = document.createElement("td");
        const detailsInput = document.createElement("textarea");
        detailsInput.rows = 2;
        detailsInput.className = "qc-comm-field textarea-full";
        detailsInput.dataset.field = "details";
        detailsInput.value = row.details || "";
        detailsInput.placeholder = "Enter message or email content...";
        detailsTd.appendChild(detailsInput);

        const actionTd = document.createElement("td");
        actionTd.className = "col-sticky-action";
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "row-remove-btn";
        removeBtn.dataset.removeRow = String(i);
        removeBtn.setAttribute("aria-label", "Remove row");
        removeBtn.disabled = !canRemove;
        removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>';
        actionTd.appendChild(removeBtn);

        tr.append(modeTd, recipientTd, detailsTd, actionTd);
        frag.appendChild(tr);
      });

      body.innerHTML = "";
      body.appendChild(frag);

      body.querySelectorAll(".qc-comm-field").forEach(el => {
        el.addEventListener("change", () => {
          const idx = Number(el.closest("tr").dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.qcCommRows[idx][el.dataset.field] = el.value;
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.qcCommRows.length === 1) return;
          rec2.qcCommRows.splice(idx, 1);
          renderQcCommGrid(rec2);
        });
      });

      // Wrap each row's freshly-built Mode/Recipient <select> as a
      // searchable-select, same post-build wiring step as the row's
      // .qc-comm-field change listener and remove-row button above.
      initSearchableSelectsIn(body);
    }

    document.getElementById("qcCommAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.qcCommRows = rec.qcCommRows || [];
      rec.qcCommRows.push({ mode: "", recipient: "", details: "" });
      renderQcCommGrid(rec);
    });

    document.getElementById("qcCommSendBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      const rows = (rec && rec.qcCommRows) || [];
      const valid = rows.length > 0 && rows.every(row => row.mode && row.recipient && row.details.trim());
      if (!valid) {
        alert("Please fill in all fields (Mode, Recipient, Details) for each row.");
        return;
      }
      showToast("success", "Communication Sent", rows.length + " message(s) dispatched successfully.");
      if (rec) {
        rec.qcCommRows = [{ mode: "", recipient: "", details: "" }];
        renderQcCommGrid(rec);
      }
    });

    // Basic Info > Verification action row (Update / Verify / View Policy) —
    // NA for every role per the CP-Screen Matrix, so these are placeholders
    // mirroring the existing alert() feedback convention used elsewhere on
    // this page (e.g. medicoSaveDraftBtn) rather than a real integration.
    document.getElementById("medUpdateBtn").addEventListener("click", () => {
      alert("Pehchan details updated.");
    });
    document.getElementById("medVerifyBtn").addEventListener("click", () => {
      alert("Pehchan verification requested.");
    });
    document.getElementById("medViewPolicyBtn").addEventListener("click", () => {
      alert("Pehchan details would open here.");
    });

    function digitsOnly(el, maxLen) {
      el.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, maxLen);
      });
    }
    function validateOnBlur(el, isValid) {
      el.addEventListener("blur", () => {
        const field = el.closest(".field");
        if (!field) return;
        field.classList.toggle("has-error", el.value.length > 0 && !isValid(el.value));
      });
      el.addEventListener("input", () => {
        const field = el.closest(".field");
        if (field && field.classList.contains("has-error") && isValid(el.value)) {
          field.classList.remove("has-error");
        }
      });
    }

    digitsOnly(document.getElementById("medAadhaarLast4"), 4);
    digitsOnly(document.getElementById("medContactNo"), 10);
    digitsOnly(document.getElementById("medAltContactNo"), 10);
    digitsOnly(document.getElementById("medClaimantMobile"), 10);
    const MOBILE_RE = /^[6-9]\d{9}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    validateOnBlur(document.getElementById("medAadhaarLast4"), (v) => /^\d{4}$/.test(v));
    validateOnBlur(document.getElementById("medContactNo"), (v) => MOBILE_RE.test(v));
    validateOnBlur(document.getElementById("medAltContactNo"), (v) => MOBILE_RE.test(v));
    validateOnBlur(document.getElementById("medAltEmail"), (v) => EMAIL_RE.test(v));
    validateOnBlur(document.getElementById("medClaimantMobile"), (v) => MOBILE_RE.test(v));
    validateOnBlur(document.getElementById("medClaimantEmail"), (v) => EMAIL_RE.test(v));

    document.getElementById("medByPassPehchan").addEventListener("change", (e) => {
      document.getElementById("medByPassPehchanRemark").closest(".field")
        .classList.toggle("has-warn", e.target.checked && !document.getElementById("medByPassPehchanRemark").value);
    });

    /* ---------------- Hospitalisation Details (card-medhospitalization) ---------------- */
    // Admission IN Time / Discharge OUT Time — free-text HH:MM, validated
    // against 24-hour format (matches the reference screenshot's inline
    // "Enter time in 24 hour HH:MM format" error message).
    const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    validateOnBlur(document.getElementById("medAdmissionInTime"), (v) => TIME_24H_RE.test(v));
    validateOnBlur(document.getElementById("medDischargeOutTime"), (v) => TIME_24H_RE.test(v));

    digitsOnly(document.getElementById("medClaimedAmount"), 12);

    /* ---------------- Hospital Search modal ---------------- */
    (function populateHospSearchStates() {
      const stateSel = document.getElementById("hsState");
      STATE_LIST.forEach((s) => {
        stateSel.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
      });
    })();

    function populateHospSearchCities(state) {
      const citySel = document.getElementById("hsCity");
      citySel.innerHTML = `<option value="" selected disabled>--Select--</option>`;
      (STATE_CITY_MASTER[state] || []).forEach((c) => {
        citySel.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`);
      });
      // City's <option> list was just replaced wholesale — re-sync its
      // searchable-select proxy's visible label back to the blank
      // placeholder (see shared/searchable-select.js).
      refreshSearchableSelectLabel("hsCity");
    }

    document.getElementById("hsState").addEventListener("change", (e) => {
      populateHospSearchCities(e.target.value);
      e.target.closest(".field").classList.remove("has-error");
    });
    document.getElementById("hsCity").addEventListener("change", (e) => {
      e.target.closest(".field").classList.remove("has-error");
    });

    digitsOnly(document.getElementById("hsPinCode"), 6);
    // NSP ID / IRDA ID are alphanumeric master codes (e.g. "NSP-HS-101") —
    // letters, digits and dashes only, no stray punctuation.
    function alphaNumDashOnly(el, maxLen) {
      el.addEventListener("input", (e) => {
        let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        if (maxLen) v = v.slice(0, maxLen);
        e.target.value = v;
      });
    }
    alphaNumDashOnly(document.getElementById("hsNspId"), 20);
    alphaNumDashOnly(document.getElementById("hsIrdaId"), 20);

    digitsOnly(document.getElementById("hsTelephone"), 10);

    validateOnBlur(document.getElementById("hsHospName"), (v) => v.trim().length > 0);
    validateOnBlur(document.getElementById("hsPinCode"), (v) => /^\d{6}$/.test(v));
    const PHONE_RE = /^\d{10}$/;
    validateOnBlur(document.getElementById("hsTelephone"), (v) => PHONE_RE.test(v));

    document.getElementById("hsGetDetailsBtn").addEventListener("click", () => {
      const pin = document.getElementById("hsPinCode").value.trim();
      const match = HOSPITAL_MASTER.find((h) => h.pin === pin);
      if (!match) {
        alert("No hospital master record found for this pin code.");
        return;
      }
      document.getElementById("hsState").value = match.state;
      refreshSearchableSelectLabel("hsState");
      populateHospSearchCities(match.state);
      document.getElementById("hsCity").value = match.city;
      refreshSearchableSelectLabel("hsCity");
      document.getElementById("hsLocation").value = match.location;
    });

    // Fills BOTH Stage 1's Hospitalisation Details and Stage 2's Hospital
    // Details from a single HOSPITAL_MASTER entry, and closes the search
    // modal — the two cards are kept in sync: picking (or adding) a
    // hospital from either one's autocomplete updates both. Stage 2 also
    // carries a few fields HOSPITAL_MASTER has no concept of (Provider No,
    // Registration No, PAN, Proprietor, Email) — those are left untouched.
    function applySelectedHospital(h) {
      document.getElementById("medHospName").value = h.name;
      document.getElementById("medHospAddress").value = h.address;
      document.getElementById("medHospLocation").value = h.location || "";
      document.getElementById("medHospContactNo").value = h.telephone || "";
      document.getElementById("medHospCity").value = h.city;
      document.getElementById("medHospState").value = h.state;
      document.getElementById("medHospPinCode").value = h.pin;

      document.getElementById("hdHospitalName").value = h.name;
      document.getElementById("hdAddress").value = h.address || "";
      document.getElementById("hdLocation").value = h.location || "";
      document.getElementById("hdContactNo").value = h.telephone || "";
      document.getElementById("hdState").value = h.state;
      syncHdCityOptions();
      document.getElementById("hdCity").value = h.city;
      document.getElementById("hdPinCode").value = h.pin;

      document.getElementById("hospSearchModal").classList.remove("show");
    }

    // Hospital Name is a live-typing autocomplete against HOSPITAL_MASTER —
    // matches appear as you type; when nothing matches, the dropdown offers
    // "Add New Hospital" which opens the existing search modal (Fill Data
    // and Proceed for Search) pre-filled with what was typed, same modal
    // used everywhere else in the app for registering an unlisted hospital.
    // Reused for both Stage 1's Hospital Name (medHospName) and Stage 2's
    // Hospital Name (hdHospitalName) — same markup, same behaviour, so
    // either field can be used to pick/add a hospital.
    function initHospNameAutocomplete(inputId, dropdownId) {
      const input = document.getElementById(inputId);
      const dropdown = document.getElementById(dropdownId);
      const addNewRowId = dropdownId + "AddNewRow";

      function openSearchModal() {
        document.getElementById("hsHospName").value = input.value.trim();
        ["hsHospName", "hsPinCode", "hsState", "hsCity", "hsTelephone"].forEach((id) => {
          document.getElementById(id).closest(".field").classList.remove("has-error");
        });
        document.getElementById("hospSearchModal").classList.add("show");
        dropdown.style.display = "none";
      }

      function renderDropdown(q) {
        if (!q || q.length < 2) { dropdown.style.display = "none"; return; }
        const matches = HOSPITAL_MASTER.filter((h) =>
          h.name.toLowerCase().indexOf(q.toLowerCase()) > -1 ||
          h.city.toLowerCase().indexOf(q.toLowerCase()) > -1
        );

        if (matches.length === 0) {
          dropdown.innerHTML = `<div style="padding:10px 14px;font-size:13px;color:var(--muted);">No hospital found — use <strong>Add New</strong> to register.</div>
            <div id="${addNewRowId}" style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--brand-blue);">+ Add New Hospital</div>`;
          document.getElementById(addNewRowId).addEventListener("click", openSearchModal);
        } else {
          dropdown.innerHTML = matches.map((h, i) =>
            `<div class="hosp-dd-item" data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--line);font-size:13px;">
              <div style="font-weight:600;color:var(--ink);">${h.name}</div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${h.city}, ${h.state} &nbsp;·&nbsp; PIN: ${h.pin}</div>
            </div>`
          ).join("") +
            `<div id="${addNewRowId}" style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--brand-blue);border-top:1px solid var(--line);">+ Add New Hospital</div>`;
          dropdown.querySelectorAll(".hosp-dd-item").forEach((item) => {
            item.addEventListener("mouseenter", () => { item.style.background = "var(--surface-tint)"; });
            item.addEventListener("mouseleave", () => { item.style.background = ""; });
            item.addEventListener("click", () => { applySelectedHospital(matches[Number(item.dataset.idx)]); dropdown.style.display = "none"; });
          });
          document.getElementById(addNewRowId).addEventListener("click", openSearchModal);
        }
        dropdown.style.display = "block";
      }

      input.addEventListener("input", () => renderDropdown(input.value.trim()));
      input.addEventListener("focus", () => { if (input.value.trim().length >= 2) renderDropdown(input.value.trim()); });
      input.addEventListener("blur", () => { setTimeout(() => { dropdown.style.display = "none"; }, 200); });
    }

    initHospNameAutocomplete("medHospName", "medHospDropdown");
    initHospNameAutocomplete("hdHospitalName", "hdHospitalDropdown");

    // Hospital Details (Stage 2) State/City — editable for Non Medico (see
    // MED_HOSPITAL_DETAILS_FIELD_ACCESS above), unlike Stage 1's
    // always-read-only medState/medCity. Same initSearchableDropdown +
    // STATE_CITY_MASTER cascade as that read-only pair, just not
    // initialised `disabled`. syncHdCityOptions() re-narrows City's item
    // list after a programmatic hdState.value write (hospital-selection
    // fills below) — initStateCityDropdown's own cascade only fires from a
    // live user pick via onSelect, not a plain .value assignment.
    initStateCityDropdown({
      stateInputId: "hdState", stateDropdownId: "hdStateDropdown",
      cityInputId: "hdCity", cityDropdownId: "hdCityDropdown",
    });
    function syncHdCityOptions() {
      const state = document.getElementById("hdState").value;
      initSearchableDropdown({ inputId: "hdCity", dropdownId: "hdCityDropdown", items: STATE_CITY_MASTER[state] || [] });
    }

    document.getElementById("hospSearchCloseBtn").addEventListener("click", () => {
      document.getElementById("hospSearchModal").classList.remove("show");
    });
    document.getElementById("hospSearchCloseX").addEventListener("click", () => {
      document.getElementById("hospSearchModal").classList.remove("show");
    });

    // Save adds the entered hospital straight into HOSPITAL_MASTER (so it's
    // findable via the Hospital Name autocomplete afterward, same as any
    // other network hospital) and immediately applies it to Hospitalisation
    // Details — the entered data becomes the selected/existing hospital.
    document.getElementById("hospSearchBtn").addEventListener("click", () => {
      const name = document.getElementById("hsHospName").value.trim();
      const state = document.getElementById("hsState").value;
      const city = document.getElementById("hsCity").value;
      const pin = document.getElementById("hsPinCode").value.trim();
      const telephone = document.getElementById("hsTelephone").value.trim();

      let hasError = false;
      const toggleError = (id, invalid) => {
        document.getElementById(id).closest(".field").classList.toggle("has-error", invalid);
        if (invalid) hasError = true;
      };
      toggleError("hsHospName", !name);
      toggleError("hsState", !state);
      toggleError("hsCity", !city);
      toggleError("hsPinCode", pin.length > 0 && !/^\d{6}$/.test(pin));
      toggleError("hsTelephone", telephone.length > 0 && !PHONE_RE.test(telephone));
      if (hasError) return;

      const newHospital = {
        name,
        nspId: document.getElementById("hsNspId").value.trim() || "NSP-PENDING",
        irdaId: document.getElementById("hsIrdaId").value.trim(),
        address: document.getElementById("hsAddress").value.trim(),
        state,
        city,
        location: document.getElementById("hsLocation").value.trim(),
        pin: document.getElementById("hsPinCode").value.trim(),
        telephone: document.getElementById("hsTelephone").value.trim(),
        rohini: "",
        covidTemp: document.getElementById("hsCovidTemp").checked,
        status: "Pending NSP Approval",
        fraudFlag: "NA",
      };
      HOSPITAL_MASTER.push(newHospital);
      applySelectedHospital(newHospital);
    });

    /* =====================================================================
       CASE DETAILS (Stage 3)
    ===================================================================== */
    document.getElementById("cdComplicationYes").addEventListener("change", () => {
      document.getElementById("cdComplicationSelectField").classList.remove("hidden");
    });
    document.getElementById("cdComplicationNo").addEventListener("change", () => {
      document.getElementById("cdComplicationSelectField").classList.add("hidden");
    });

    // Priority Reason only makes sense once Priority Claim is checked —
    // per the Priority Claim user story, unchecking disables the reason
    // so it doesn't float into later stages. Only re-enables it if the
    // checkbox itself isn't role-disabled (so a QC/Payment Auditor's
    // blanket read-only pass, which disables the checkbox first, is never
    // overridden by this handler).
    document.getElementById("cdPriorityClaim").addEventListener("change", (e) => {
      const reasonSelect = document.getElementById("cdPriorityReason");
      reasonSelect.disabled = !e.target.checked;
      if (!e.target.checked) reasonSelect.selectedIndex = 0;
      // cdPriorityReason is a searchable-select-wrapped <select> — its
      // visible proxy input only re-reads select.disabled lazily, on its
      // own focus/click (see shared/searchable-select.js), so a plain
      // programmatic .disabled write above leaves the proxy looking (and
      // behaving) disabled until refreshed explicitly here.
      refreshSearchableSelectLabel("cdPriorityReason");
    });

    /* ---------------- Medical History (card-medcase, Stage 3) ----------------
       Repeating grid, same pattern as Hospitalization/Consultant Details —
       Search fills the last-focused (or first) row via the shared Ailment
       Search modal, Add Row appends a blank one. */
    function renderMedicalHistoryGrid(rec) {
      if (!rec.medicalHistoryRows || !rec.medicalHistoryRows.length) {
        rec.medicalHistoryRows = [{ level: "", icdCode: "", startDate: "", endDate: "" }];
      }
      const body = document.getElementById("medicalHistoryGridBody");
      if (!body) return;
      const canRemove = rec.medicalHistoryRows.length > 1;
      // Matrix: Medical History is Read-only for Non Medico, Editable for
      // Medico. Non Medico never actually reaches this stage (hidden per
      // Stage 3 access rule), so in practice this only matters for Medico
      // vs. QC/Payment Auditor — QC/PA get blanket-disabled separately by
      // applyQCViewMode()/applyPaymentAuditorViewMode().
      const isMedico = medRoleKey(getCurrentRole()) === "medico";
      const dis = isMedico ? "" : "disabled";

      body.innerHTML = rec.medicalHistoryRows.map((row, i) => `
      <tr data-row-index="${i}">
        <td><input type="text" class="mh-field" data-field="level" value="${row.level || ""}" ${dis}></td>
        <td><input type="text" class="mh-field" data-field="icdCode" value="${row.icdCode || ""}" ${dis}></td>
        <td><input type="date" class="mh-field" data-field="startDate" value="${row.startDate || ""}" ${dis}></td>
        <td><input type="date" class="mh-field" data-field="endDate" value="${row.endDate || ""}" ${dis}></td>
        <td class="col-sticky-action">
          <button class="row-remove-btn" type="button" data-remove-row="${i}" aria-label="Remove row" ${canRemove && isMedico ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join("");

      body.querySelectorAll(".mh-field").forEach(el => {
        el.addEventListener("change", () => {
          const idx = Number(el.closest("tr").dataset.rowIndex);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2) return;
          rec2.medicalHistoryRows[idx][el.dataset.field] = el.value;
        });
        el.addEventListener("focus", () => {
          medicalHistorySearchRowIndex = Number(el.closest("tr").dataset.rowIndex);
        });
      });

      body.querySelectorAll("[data-remove-row]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.removeRow);
          const rec2 = entries.find(x => x.inwardId === medicoTargetId);
          if (!rec2 || rec2.medicalHistoryRows.length === 1) return;
          rec2.medicalHistoryRows.splice(idx, 1);
          renderMedicalHistoryGrid(rec2);
        });
      });
    }

    document.getElementById("medicalHistoryAddRowBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;
      rec.medicalHistoryRows = rec.medicalHistoryRows || [];
      rec.medicalHistoryRows.push({ level: "", icdCode: "", startDate: "", endDate: "" });
      renderMedicalHistoryGrid(rec);
    });

    /* ---------------- Ailment Search modal ----------------
       Shared by two triggers — Ailment & Diagnosis's "Ailment" search and
       Medical History's search — since both look up the same ailment
       master and differ only in which fields the picked result fills in. */
    let ailmentSearchTarget = "ailment"; // "ailment" | "medicalHistory"
    let medicalHistorySearchRowIndex = 0;
    document.getElementById("cdAilmentSearchBtn").addEventListener("click", () => {
      ailmentSearchTarget = "ailment";
      document.getElementById("ailmentResultsWrap").classList.add("hidden");
      document.getElementById("ailmentModal").classList.add("show");
    });
    document.getElementById("cdMedicalHistorySearchBtn").addEventListener("click", () => {
      ailmentSearchTarget = "medicalHistory";
      document.getElementById("ailmentResultsWrap").classList.add("hidden");
      document.getElementById("ailmentModal").classList.add("show");
    });
    document.getElementById("ailmentCloseBtn").addEventListener("click", () => {
      document.getElementById("ailmentModal").classList.remove("show");
    });
    document.getElementById("ailmentCloseX").addEventListener("click", () => {
      document.getElementById("ailmentModal").classList.remove("show");
    });
    const AILMENT_MASTER = [
      { chapter: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified", block: "General symptoms and signs", level3: "Fever of other and unknown origin", icdCode: "R50.2", icdName: "Drug induced fever" },
      { chapter: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified", block: "General symptoms and signs", level3: "Fever of other and unknown origin", icdCode: "R50.84", icdName: "Febrile nonhemolytic transfusion reaction" },
      { chapter: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified", block: "General symptoms and signs", level3: "Fever of other and unknown origin", icdCode: "R50.81", icdName: "Fever presenting with conditions classified elsewhere" },
      { chapter: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified", block: "General symptoms and signs", level3: "Fever of other and unknown origin", icdCode: "R50.9", icdName: "Fever, unspecified" },
      { chapter: "Diseases of the circulatory system", block: "Ischaemic heart diseases", level3: "Chronic ischemic heart disease", icdCode: "I25.10", icdName: "Atherosclerotic heart disease of native cc" },
      { chapter: "Diseases of the circulatory system", block: "Ischaemic heart diseases", level3: "Chronic ischemic heart disease", icdCode: "I25.2", icdName: "Old myocardial infarction" },
      { chapter: "Diseases of the circulatory system", block: "Ischaemic heart diseases", level3: "Acute myocardial infarction", icdCode: "I21.9", icdName: "Acute myocardial infarction, unspecified" },
    ];

    document.getElementById("ailmentSearchBtn").addEventListener("click", () => {
      document.getElementById("ailmentResultsWrap").classList.remove("hidden");
      const body = document.getElementById("ailmentResultsBody");
      body.innerHTML = AILMENT_MASTER.map((a, i) => `
    <tr>
      <td>${a.chapter}</td>
      <td>${a.block}</td>
      <td>${a.level3}</td>
      <td class="mono">${a.icdCode}</td>
      <td>${a.icdName}</td>
      <td><button class="btn btn-primary btn-sm" type="button" data-ailment-idx="${i}">Select</button></td>
    </tr>
  `).join("");

      body.querySelectorAll("button[data-ailment-idx]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const a = AILMENT_MASTER[Number(btn.dataset.ailmentIdx)];
          if (ailmentSearchTarget === "medicalHistory") {
            const rec = entries.find(x => x.inwardId === medicoTargetId);
            if (rec) {
              rec.medicalHistoryRows = rec.medicalHistoryRows || [{ level: "", icdCode: "", startDate: "", endDate: "" }];
              const row = rec.medicalHistoryRows[medicalHistorySearchRowIndex] || rec.medicalHistoryRows[0];
              row.level = a.icdName;
              row.icdCode = a.icdCode;
              renderMedicalHistoryGrid(rec);
            }
          } else {
            document.getElementById("cdAilment").value = a.icdName;
            document.getElementById("cdIcdCode").value = a.icdCode;
          }
          document.getElementById("ailmentModal").classList.remove("show");
        });
      });
    });

    /* ---------------- CPT Procedure Search modal ---------------- */
    document.getElementById("cdCptSearchBtn").addEventListener("click", () => {
      document.getElementById("cptResultsWrap").classList.add("hidden");
      document.getElementById("cptModal").classList.add("show");
    });
    document.getElementById("cptCloseBtn").addEventListener("click", () => {
      document.getElementById("cptModal").classList.remove("show");
    });
    document.getElementById("cptCloseX").addEventListener("click", () => {
      document.getElementById("cptModal").classList.remove("show");
    });
    document.getElementById("cptSearchBtn").addEventListener("click", () => {
      document.getElementById("cptResultsWrap").classList.remove("hidden");
      document.getElementById("cptResultsBody").innerHTML = `
    <div class="doc-result-item">
      <div class="doc-result-info">
        <div class="doc-result-name">Excision of lesion, skin</div>
        <div class="doc-result-field"><strong>CPT Code:</strong> 11400</div>
        <div class="doc-result-field"><strong>Medium Descriptor:</strong> Excision, benign lesion, trunk/arms/legs</div>
        <div class="doc-result-field"><strong>Concept ID:</strong> 24581</div>
        <div class="doc-result-field"><strong>Parent ID:</strong> 11400-11406</div>
        <div class="doc-result-field"><strong>Descriptor:</strong> Excision benign skin lesion</div>
      </div>
      <button class="btn btn-primary btn-sm" type="button" id="cptSelectBtn">Select</button>
    </div>
  `;
      document.getElementById("cptSelectBtn").addEventListener("click", () => {
        document.getElementById("cdCptProcedure").value = "Excision of lesion, skin";
        document.getElementById("cdCptCode").value = "11400";
        document.getElementById("cdShortDescriptor").value = "Excision benign lesion";
        document.getElementById("cdMediumDescriptor").value = "Excision, benign lesion, trunk/arms/legs";
        document.getElementById("cdConceptId").value = "24581";
        document.getElementById("cdParentId").value = "11400-11406";
        document.getElementById("cdDescriptor").value = "Excision benign skin lesion";
        document.getElementById("cptModal").classList.remove("show");
      });
    });

    /* ---------------- Role-based prefill ---------------- */
    function resetCaseDetailsForm() {
      [
        "cdAssociatedConditions", "cdComorbidConditions", "cdClinicalFindings",
        "cdBloodPressure", "cdPerAbdomen", "cdPulse", "cdCardioVascular", "cdRespiratory", "cdCns",
        "cdAilment", "cdIcdCode", "cdDurationOfAilment", "cdDiagnosis1", "cdDiagnosisCode1", "cdDiagnosis2", "cdDiagnosisCode2",
        "cdDiagnosis3", "cdDiagnosisCode3", "cdSrfId", "cdIcmrId", "cdCptProcedure", "cdCptCode", "cdShortDescriptor",
        "cdMediumDescriptor", "cdParentId", "cdDescriptor", "cdDateOfAdmission", "cdDateOfDischarge",
        "cdIllnessOtherText"
      ].forEach(id => { document.getElementById(id).value = ""; });
      // Medical History is now a repeating grid (rec.medicalHistoryRows),
      // reset separately so a fresh row renders instead of clearing a
      // single static field.
      const cdRec = entries.find(x => x.inwardId === medicoTargetId);
      if (cdRec) cdRec.medicalHistoryRows = [{ level: "", icdCode: "", startDate: "", endDate: "" }];

      ["cdTypeOfMedicine", "cdNumberOfBed", "cdConceptId", "cdLengthOfStay", "cdDelayInSurgery"].forEach(id => {
        document.getElementById(id).value = "0";
      });

      ["cdSurgeriesOptima", "cdSystemOfMedicine", "cdTreatmentType", "cdComplicationSelect", "cdPriorityReason"].forEach(id => {
        document.getElementById(id).selectedIndex = 0;
        refreshSearchableSelectLabel(id);
      });
      document.getElementById("cdPriorityReason").disabled = true;

      document.querySelectorAll('input[name="cdCareType"]').forEach(r => r.checked = false);
      document.getElementById("cdComplicationNo").checked = true;
      document.getElementById("cdComplicationYes").checked = false;
      document.getElementById("cdComplicationSelectField").classList.add("hidden");

      [
        "cdIllnessOthers", "cdIllnessAlcohol", "cdIllnessHiv", "cdIllnessSterility", "cdIllnessCosmetic",
        "cdIllnessCongenital", "cdIllnessMaternity", "cdIllnessNone", "cdMentalDisability",
        "cdAnesLA", "cdAnesGA", "cdAnesEpidural", "cdAnesSpinal", "cdAnesRegionalBlock", "cdAnesOther",
        "cdDentalClaim", "cdPlasticSurgery", "cdSpectacles", "cdAirAmbulance", "cdReserveBenefit",
        "cdEmiHospitalization", "cdRtaAccident", "cdMaternity", "cdPa", "cdCriticalIllness", "cdEnhancedSi",
        "cdPriorityClaim"
      ].forEach(id => { document.getElementById(id).checked = false; });
    }

    function applyCaseDetailsPrefill(rec) {
      resetCaseDetailsForm();

      const isMedico = getCurrentRole() === "Medico";
      document.getElementById("cdRoleHint").textContent = isMedico
        ? "Prefilled from case assessment"
        : "Hospital and admission details prefilled; clinical fields are completed by Medico";

      // Common to both Medico and Non Medico: claim/admin/hospital-stay basics
      document.getElementById("cdClaimNumber").textContent = `Claim Number: ${rec.claimId}`;
      document.getElementById("cdCareTypeInpatient").checked = true;
      document.getElementById("cdDateOfAdmission").value = "2026-05-20";
      document.getElementById("cdDateOfDischarge").value = "2026-05-20";
      document.getElementById("cdLengthOfStay").value = "1";

      // Priority Claim / Priority Reason — resetCaseDetailsForm() above
      // always blanks these, so any record seeded with isPriorityClaim
      // needs its own prefill here (e.g. INW/20260625/00112, used by the
      // Payment Auditor High-Value Email Approval card).
      if (rec.isPriorityClaim) {
        document.getElementById("cdPriorityClaim").checked = true;
        if (rec.priorityReason) document.getElementById("cdPriorityReason").value = rec.priorityReason;
      }

      if (!isMedico) { refreshAllSearchableSelects(); return; }

      // Medico-only: clinical assessment fields
      document.getElementById("cdIllnessOthers").checked = true;
      document.getElementById("cdSystemOfMedicine").value = "Allopathy";
      document.getElementById("cdAilment").value = "Atherosclerotic heart disease of native cc";
      document.getElementById("cdIcdCode").value = "I25.10";
      document.getElementById("cdDiagnosis1").value = "Diseases of the circulatory system";
      document.getElementById("cdDiagnosisCode1").value = "I00-I99";
      document.getElementById("cdDiagnosis2").value = "Ischaemic heart diseases";
      document.getElementById("cdDiagnosisCode2").value = "I20-I25";
      document.getElementById("cdDiagnosis3").value = "Chronic ischemic heart disease";
      document.getElementById("cdDiagnosisCode3").value = "I25";
      document.getElementById("cdTreatmentType").value = "Medical";
      // Re-sync every converted select's visible proxy label after
      // resetCaseDetailsForm()'s selectedIndex resets and this function's
      // own .value writes above (see shared/searchable-select.js).
      refreshAllSearchableSelects();
    }

    /* =====================================================================
       BILL DETAILS - HEALTH (Stage 4)
    ===================================================================== */
    function defaultBillItems() {
      return [
        {
          item: "Ambulance Charges", level2: "Ambulance Charges", level3: "Ambulance Charges", level4: "Hospitalization",
          billNo: "0863", date: "2026-05-20", units: 1, amountPerUnit: 1500, claimedAmount: 1500, tariffAmount: 0, tariffDeduction: 0, deduction: 0, approvedAmount: 1500
        },
        {
          item: "ICU Charges", level2: "ICU Charges", level3: "ICU Charges", level4: "Hospitalization",
          billNo: "1270", date: "2026-05-20", units: 1, amountPerUnit: 2000, claimedAmount: 2000, tariffAmount: 0, tariffDeduction: 0, deduction: 0, approvedAmount: 2000
        },
      ];
    }

    function initBillItems(rec) {
      if (!rec.billItems) {
        rec.billItems = defaultBillItems();
      }
      renderBillItems(rec);
    }

    // Bill Level 1/2/3 option lists mirror the entry form's static
    // <select> options (bdLevel1/2/3) so the inline-edit row's dropdowns
    // offer the same choices.
    const BILL_LEVEL1_OPTIONS = ["Ambulance Charges", "ICU Charges", "Room Rent", "Doctor Fees", "Investigation Charges"];
    const BILL_LEVEL2_OPTIONS = BILL_LEVEL1_OPTIONS;
    const BILL_LEVEL3_OPTIONS = ["Hospitalization", "Pre-Hospitalization", "Post-Hospitalization"];

    let billInlineEditIdx = null; // index into rec.billItems currently shown as an inline-editable row, or null

    function billItemPayable(b) {
      return Math.max(0, (Number(b.claimedAmount) || 0) - (Number(b.deduction) || 0) - (Number(b.tariffDeduction) || 0));
    }

    // DOM-building helpers (createElement, not innerHTML strings — see
    // AGENTS.md "no static HTML inside JS") shared by both the read-only
    // and inline-edit row builders below.
    function makeTd(text, opts) {
      const td = document.createElement("td");
      if (text !== undefined && text !== null) td.textContent = text;
      if (opts && opts.className) td.className = opts.className;
      if (opts && opts.colSpan) td.colSpan = opts.colSpan;
      return td;
    }

    function makeSelectField(field, options, selected) {
      const select = document.createElement("select");
      select.className = "bi-field";
      select.dataset.field = field;
      const blank = document.createElement("option");
      blank.value = "";
      blank.disabled = true;
      blank.selected = !selected;
      blank.textContent = "--Select--";
      select.appendChild(blank);
      options.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        opt.selected = o === selected;
        select.appendChild(opt);
      });
      return select;
    }

    function makeInputField(field, type, value) {
      const input = document.createElement("input");
      input.type = type;
      input.className = "bi-field";
      input.dataset.field = field;
      input.value = value;
      if (type === "number") input.min = "0";
      return input;
    }

    function makeIconBtn(action, idx, label, pathD) {
      const btn = document.createElement("button");
      btn.className = "icon-btn";
      btn.type = "button";
      btn.dataset.action = action;
      btn.dataset.idx = String(idx);
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pathD}</svg>`;
      return btn;
    }

    function buildBillItemRow(b, i) {
      const tr = document.createElement("tr");
      tr.dataset.rowIndex = String(i);
      tr.append(
        makeTd(b.level2),
        makeTd(b.level3),
        makeTd(b.level4),
        makeTd(b.billNo, { className: "mono" }),
        makeTd(fmtDate(b.date)),
        makeTd(b.units),
        makeTd(fmtCurrency(b.amountPerUnit), { className: "mono" }),
        makeTd(fmtCurrency(b.claimedAmount), { className: "mono" }),
        makeTd(fmtCurrency(b.tariffAmount), { className: "mono" }),
        makeTd(fmtCurrency(b.tariffDeduction), { className: "mono" }),
        makeTd(fmtCurrency(b.deduction), { className: "mono" }),
        makeTd(fmtCurrency(b.approvedAmount), { className: "mono" }),
      );

      const actionTd = makeTd(null, { className: "col-sticky-action" });
      actionTd.append(
        makeIconBtn("edit-bill-item", i, "Edit", '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
        makeIconBtn("edit-as-new-bill-item", i, "Edit As New", '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
      );
      tr.appendChild(actionTd);
      return tr;
    }

    function buildBillItemEditRow(b, i) {
      const tr = document.createElement("tr");
      tr.dataset.rowIndex = String(i);
      tr.className = "bill-item-row--editing";

      const wrap = (field) => { const td = document.createElement("td"); td.appendChild(field); return td; };
      tr.append(
        wrap(makeSelectField("level2", BILL_LEVEL1_OPTIONS, b.level2)),
        wrap(makeSelectField("level3", BILL_LEVEL2_OPTIONS, b.level3)),
        wrap(makeSelectField("level4", BILL_LEVEL3_OPTIONS, b.level4)),
        wrap(makeInputField("billNo", "text", b.billNo || "")),
        wrap(makeInputField("date", "date", b.date || "")),
        wrap(makeInputField("units", "number", b.units || 0)),
        wrap(makeInputField("amountPerUnit", "number", b.amountPerUnit || 0)),
        wrap(makeInputField("claimedAmount", "number", b.claimedAmount || 0)),
        wrap(makeInputField("tariffAmount", "number", b.tariffAmount || 0)),
        wrap(makeInputField("tariffDeduction", "number", b.tariffDeduction || 0)),
        wrap(makeInputField("deduction", "number", b.deduction || 0)),
        makeTd(fmtCurrency(billItemPayable(b)), { className: "mono" }),
      );

      const actionTd = makeTd(null, { className: "col-sticky-action" });
      actionTd.append(
        makeIconBtn("update-bill-item", i, "Update", '<path d="M20 6L9 17l-5-5"/>'),
        makeIconBtn("cancel-edit-bill-item", i, "Cancel", '<path d="M6 6l12 12M18 6L6 18"/>'),
      );
      tr.appendChild(actionTd);
      return tr;
    }

    function buildBillGroupHeadRow(label) {
      const tr = document.createElement("tr");
      tr.className = "bill-item-group-head";
      tr.appendChild(makeTd(label, { colSpan: 13 }));
      return tr;
    }

    function renderBillItems(rec) {
      const body = document.getElementById("billItemsBody");
      const items = rec.billItems || [];

      // Group rows by Bill Level 1 (legacy screen shows each level 1
      // category as its own heading + row cluster + subtotal line),
      // preserving each group's first-seen order rather than sorting.
      const groups = [];
      const groupByLevel2 = new Map();
      items.forEach((b, i) => {
        const key = b.level2 || "—";
        if (!groupByLevel2.has(key)) {
          const group = { level2: key, rows: [] };
          groupByLevel2.set(key, group);
          groups.push(group);
        }
        groupByLevel2.get(key).rows.push({ item: b, idx: i });
      });

      const frag = document.createDocumentFragment();
      groups.forEach(group => {
        const subtotal = group.rows.reduce((acc, { item: b }) => {
          acc.claimed += Number(b.claimedAmount) || 0;
          acc.tariffDeducted += Number(b.tariffDeduction) || 0;
          acc.deducted += Number(b.deduction) || 0;
          return acc;
        }, { claimed: 0, tariffDeducted: 0, deducted: 0 });

        group.rows.forEach(({ item: b, idx }) => {
          frag.appendChild(idx === billInlineEditIdx ? buildBillItemEditRow(b, idx) : buildBillItemRow(b, idx));
        });
      });

      body.replaceChildren(frag);

      body.querySelectorAll('button[data-action="edit-bill-item"]').forEach(btn => {
        btn.addEventListener("click", () => {
          billInlineEditIdx = Number(btn.dataset.idx);
          renderBillItems(rec);
        });
      });
      body.querySelectorAll('button[data-action="edit-as-new-bill-item"]').forEach(btn => {
        btn.addEventListener("click", () => loadBillItemIntoForm(rec, Number(btn.dataset.idx)));
      });
      body.querySelectorAll('button[data-action="cancel-edit-bill-item"]').forEach(btn => {
        btn.addEventListener("click", () => {
          billInlineEditIdx = null;
          renderBillItems(rec);
        });
      });
      body.querySelectorAll('button[data-action="update-bill-item"]').forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.idx);
          const rowEl = btn.closest("tr");
          const b = rec.billItems[idx];
          if (!b) return;
          rowEl.querySelectorAll(".bi-field").forEach(el => {
            const field = el.dataset.field;
            const isNumeric = ["units", "amountPerUnit", "claimedAmount", "tariffAmount", "tariffDeduction", "deduction"].includes(field);
            b[field] = isNumeric ? (Number(el.value) || 0) : el.value;
          });
          // Deduction + Tariff Deduction can never exceed the Claimed Amount.
          if ((Number(b.deduction) || 0) + (Number(b.tariffDeduction) || 0) > (Number(b.claimedAmount) || 0)) {
            alert("Deduction + Tariff Deduction cannot exceed the Claimed Amount.");
            return;
          }
          b.item = b.level2;
          b.approvedAmount = billItemPayable(b);
          billInlineEditIdx = null;
          renderBillItems(rec);
        });
      });

      const totals = items.reduce((acc, b) => {
        acc.claimed += Number(b.claimedAmount) || 0;
        acc.tariffDeducted += Number(b.tariffDeduction) || 0;
        acc.deducted += Number(b.deduction) || 0;
        return acc;
      }, { claimed: 0, tariffDeducted: 0, deducted: 0 });

      document.getElementById("billInlineClaimed").textContent = fmtCurrency(totals.claimed);
      document.getElementById("billInlineDiscount").textContent = fmtCurrency(0);
      document.getElementById("billInlineTariffDeducted").textContent = fmtCurrency(totals.tariffDeducted);
      document.getElementById("billInlineDeduction").textContent = fmtCurrency(totals.deducted);

      document.getElementById("bdHeaderClaimedAmount").textContent = fmtCurrency(totals.claimed);

      // Wrap the inline-edit row's Level 2/3/4 <select> (.bi-field) as a
      // searchable-select, same post-build wiring step as the row's other
      // button listeners above. No-op when no row is in edit mode.
      initSearchableSelectsIn(body);
    }

    /* ---------------- Bill Details header strip (card-medbillheader, Stage 4) ---------------- */
    function renderBillHeaderStrip(rec) {
      document.getElementById("bdClaimNumber").textContent = `Claim Number: ${rec.claimId || "—"}`;
      document.getElementById("bdOtherAddons").textContent = fmtCurrency(0);
      document.getElementById("bdAccClaimStatus").textContent = `AccClaim Status: ${rec.accClaimStatus || "Not Sent"}`;
    }

    function resetBillEntryForm() {
      ["bdBillNo", "bdDate", "bdUnits", "bdAmountPerUnit", "bdClaimedAmount", "bdTariffAmount", "bdTariffDeduction",
        "bdDeduction", "bdDeductionRemark", "bdDiscountAsPerTariff", "bdDiscValue", "bdBillRemarks"].forEach(id => {
          document.getElementById(id).value = "";
        });
      ["bdLevel1", "bdLevel2", "bdLevel3"].forEach(id => { document.getElementById(id).selectedIndex = 0; });
      ["bdLevel1", "bdLevel2", "bdLevel3"].forEach(refreshSearchableSelectLabel);
      document.getElementById("bdApprovedAmount").textContent = "0";
    }

    // Edit As New: prefills the entry form from an existing row so the
    // user can tweak it and Add New — always appends a fresh row, never
    // overwrites. Edit (the pencil icon) edits the row inline instead.
    function loadBillItemIntoForm(rec, idx) {
      const b = (rec.billItems || [])[idx];
      if (!b) return;
      document.getElementById("bdLevel1").value = b.level4 || "";
      document.getElementById("bdLevel2").value = b.level2 || "";
      document.getElementById("bdLevel3").value = b.level3 || "";
      ["bdLevel1", "bdLevel2", "bdLevel3"].forEach(refreshSearchableSelectLabel);
      document.getElementById("bdBillNo").value = b.billNo || "";
      document.getElementById("bdDate").value = b.date || "";
      document.getElementById("bdUnits").value = b.units || "";
      document.getElementById("bdAmountPerUnit").value = b.amountPerUnit || "";
      document.getElementById("bdClaimedAmount").value = b.claimedAmount || "";
      document.getElementById("bdTariffAmount").value = b.tariffAmount || "";
      document.getElementById("bdTariffDeduction").value = b.tariffDeduction || "";
      document.getElementById("bdDeduction").value = b.deduction || "";
      document.getElementById("bdDeductionRemark").value = b.deductionRemark || "";
      document.getElementById("bdDiscountAsPerTariff").value = b.discountAsPerTariff || "";
      document.getElementById("bdDiscValue").value = b.discValue || "";
      document.getElementById("bdBillRemarks").value = b.billRemarks || "";
      document.getElementById("bdApprovedAmount").textContent = fmtCurrency(b.approvedAmount);
      document.getElementById("card-medbill").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.getElementById("bdAddNewBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (!rec) return;

      const level2 = document.getElementById("bdLevel2").value;
      const level3 = document.getElementById("bdLevel3").value;
      if (!level2 || !document.getElementById("bdBillNo").value.trim()) {
        alert("Select Bill Level 1 and enter a Bill No before adding.");
        return;
      }

      const claimedAmount = Number(document.getElementById("bdClaimedAmount").value) || 0;
      const deduction = Number(document.getElementById("bdDeduction").value) || 0;
      const tariffDeduction = Number(document.getElementById("bdTariffDeduction").value) || 0;
      if (deduction + tariffDeduction > claimedAmount) {
        alert("Deduction + Tariff Deduction cannot exceed the Claimed Amount.");
        return;
      }
      const approved = Math.max(0, claimedAmount - deduction - tariffDeduction);

      const item = {
        item: level2,
        level2,
        level3: level3 || level2,
        level4: document.getElementById("bdLevel1").value || "Hospitalization",
        billNo: document.getElementById("bdBillNo").value.trim(),
        date: document.getElementById("bdDate").value || new Date().toISOString().slice(0, 10),
        units: Number(document.getElementById("bdUnits").value) || 0,
        amountPerUnit: Number(document.getElementById("bdAmountPerUnit").value) || 0,
        claimedAmount,
        tariffAmount: Number(document.getElementById("bdTariffAmount").value) || 0,
        tariffDeduction,
        deduction,
        deductionRemark: document.getElementById("bdDeductionRemark").value,
        discountAsPerTariff: Number(document.getElementById("bdDiscountAsPerTariff").value) || 0,
        discValue: Number(document.getElementById("bdDiscValue").value) || 0,
        billRemarks: document.getElementById("bdBillRemarks").value,
        approvedAmount: approved,
      };

      rec.billItems = rec.billItems || [];
      rec.billItems.push(item);

      document.getElementById("bdApprovedAmount").textContent = fmtCurrency(approved);
      renderBillItems(rec);
      resetBillEntryForm();
    });

    /* ---------------- Pharmacy Bill Details (full-screen view) ---------------- */
    const appShell = document.getElementById("appShell");
    const viewPharmacyDetails = document.getElementById("viewPharmacyDetails");

    function defaultPharmacyRows() {
      return [
        { billNo: "PH-11230", billDate: "2026-05-20", medicineName: "Paracetamol 500mg", units: 20, amountPerUnit: 2, claimedAmt: 40, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Clear", approvedAmount: 40, billCategory: "Pharmacy" },
        { billNo: "PH-11231", billDate: "2026-05-20", medicineName: "Azithromycin 500mg", units: 6, amountPerUnit: 45, claimedAmt: 270, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Clear", approvedAmount: 270, billCategory: "Pharmacy" },
        { billNo: "PH-11232", billDate: "2026-05-21", medicineName: "IV Cannula 20G", units: 4, amountPerUnit: 55, claimedAmt: 220, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Clear", approvedAmount: 220, billCategory: "Consumables" },
        { billNo: "PH-11233", billDate: "2026-05-21", medicineName: "Enoxaparin 40mg Injection", units: 5, amountPerUnit: 610, claimedAmt: 3050, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Unclear", approvedAmount: 0, billCategory: "Pharmacy" },
        { billNo: "PH-11234", billDate: "2026-05-22", medicineName: "IV Fluid - Normal Saline 500ml", units: 8, amountPerUnit: 65, claimedAmt: 520, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Clear", approvedAmount: 520, billCategory: "Consumables" },
        { billNo: "PH-11235", billDate: "2026-05-22", medicineName: "Atorvastatin 20mg", units: 10, amountPerUnit: 8, claimedAmt: 80, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "Bill Clear", approvedAmount: 80, billCategory: "Pharmacy" },
      ];
    }

    let pharmacyRows = [];
    let pharmacyRecId = null;

    function fieldNum(el) { return Number(el.value) || 0; }

    function renderPharmacyRows() {
      const body = document.getElementById("pharmacyRowsBody");
      body.innerHTML = pharmacyRows.map((r, i) => `
    <tr data-idx="${i}">
      <td><input type="text" class="ph-field" data-idx="${i}" data-key="billNo" value="${r.billNo}"></td>
      <td><input type="date" class="ph-field" data-idx="${i}" data-key="billDate" value="${r.billDate}"></td>
      <td><input type="text" class="ph-field" data-idx="${i}" data-key="medicineName" value="${r.medicineName}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="units" value="${r.units}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="amountPerUnit" value="${r.amountPerUnit}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="claimedAmt" value="${r.claimedAmt}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="deductionAmt" value="${r.deductionAmt}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="discTariff" value="${r.discTariff}"></td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="discValue" value="${r.discValue}"></td>
      <td><input type="text" class="ph-field" data-idx="${i}" data-key="deductionRemarks" value="${r.deductionRemarks}"></td>
      <td>
        <select class="ph-field" data-idx="${i}" data-key="billRemarks">
          <option value="" ${!r.billRemarks ? "selected" : ""} disabled>--Select--</option>
          <option ${r.billRemarks === "Bill Clear" ? "selected" : ""}>Bill Clear</option>
          <option ${r.billRemarks === "Bill Unclear" ? "selected" : ""}>Bill Unclear</option>
          <option ${r.billRemarks === "Bill Missing" ? "selected" : ""}>Bill Missing</option>
        </select>
      </td>
      <td><input type="number" class="ph-field" data-idx="${i}" data-key="approvedAmount" value="${r.approvedAmount}"></td>
      <td>
        <select class="ph-field" data-idx="${i}" data-key="billCategory">
          <option value="" ${!r.billCategory ? "selected" : ""} disabled>--Select--</option>
          <option ${r.billCategory === "Pharmacy" ? "selected" : ""}>Pharmacy</option>
          <option ${r.billCategory === "Consumables" ? "selected" : ""}>Consumables</option>
          <option ${r.billCategory === "Implants" ? "selected" : ""}>Implants</option>
        </select>
      </td>
      <td class="col-sticky-action">
        <button class="row-remove-btn" type="button" data-action="remove-ph-row" data-idx="${i}" title="Remove row" aria-label="Remove row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
          </svg>
        </button>
      </td>
    </tr>
  `).join("");

      body.querySelectorAll(".ph-field").forEach(el => {
        el.addEventListener("input", () => {
          const idx = Number(el.dataset.idx);
          const key = el.dataset.key;
          const isNumeric = ["units", "amountPerUnit", "claimedAmt", "deductionAmt", "discTariff", "discValue", "approvedAmount"].includes(key);
          pharmacyRows[idx][key] = isNumeric ? (Number(el.value) || 0) : el.value;
          updatePharmacyTotals();
        });
        el.addEventListener("change", () => {
          const idx = Number(el.dataset.idx);
          const key = el.dataset.key;
          pharmacyRows[idx][key] = el.value;
        });
      });

      body.querySelectorAll('button[data-action="remove-ph-row"]').forEach(btn => {
        btn.addEventListener("click", () => {
          pharmacyRows.splice(Number(btn.dataset.idx), 1);
          renderPharmacyRows();
          updatePharmacyTotals();
        });
      });

      // Wrap each row's Bill Remarks/Bill Category <select> (.ph-field) as
      // a searchable-select, same post-build wiring step as the row's
      // input/change listeners and remove-row button above.
      initSearchableSelectsIn(body);

      updatePharmacyTotals();
    }

    function updatePharmacyTotals() {
      const totals = pharmacyRows.reduce((acc, r) => {
        acc.claimed += Number(r.claimedAmt) || 0;
        acc.deduction += Number(r.deductionAmt) || 0;
        acc.approved += Number(r.approvedAmount) || 0;
        return acc;
      }, { claimed: 0, deduction: 0, approved: 0 });

      document.getElementById("pharmacyTotalClaimed").textContent = fmtCurrency(totals.claimed);
      document.getElementById("pharmacyTotalDeduction").textContent = fmtCurrency(totals.deduction);
      document.getElementById("pharmacyTotalApproved").textContent = fmtCurrency(totals.approved);
    }

    document.getElementById("pharmacyAddRowBtn").addEventListener("click", () => {
      pharmacyRows.push({ billNo: "", billDate: "", medicineName: "", units: 0, amountPerUnit: 0, claimedAmt: 0, deductionAmt: 0, discTariff: 0, discValue: 0, deductionRemarks: "", billRemarks: "", approvedAmount: 0, billCategory: "" });
      renderPharmacyRows();
    });

    document.getElementById("pharmacyCalculateBtn").addEventListener("click", () => {
      updatePharmacyTotals();
      const btn = document.getElementById("pharmacyCalculateBtn");
      const original = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg> Calculated`;
      setTimeout(() => { btn.innerHTML = original; }, 1400);
    });

    function openPharmacyDetails() {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      pharmacyRecId = medicoTargetId;
      pharmacyRows = (rec && rec.pharmacyRows) ? rec.pharmacyRows : defaultPharmacyRows();
      document.getElementById("pharmacyPageTitle").textContent = `Pharmacy Bill Details${rec ? " - " + rec.claimId : ""}`;
      renderPharmacyRows();

      appShell.classList.add("hidden");
      viewPharmacyDetails.classList.remove("hidden");
      window.scrollTo(0, 0);
    }

    function closePharmacyDetails() {
      viewPharmacyDetails.classList.add("hidden");
      appShell.classList.remove("hidden");
      window.scrollTo(0, 0);
    }

    document.getElementById("pharmacyDetailsLink").addEventListener("click", (e) => {
      e.preventDefault();
      openPharmacyDetails();
    });

    /* ---------------- Bill Details header strip: I3/OCR tools (stubbed) ---------------- */
    document.getElementById("bdOpenI3Btn").addEventListener("click", () => {
      alert("Opening I3 data isn't built out in this version of the prototype.");
    });
    document.getElementById("bdRefreshI3Btn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === medicoTargetId);
      if (rec) renderBillHeaderStrip(rec);
    });
    document.getElementById("bdGetOcrBtn").addEventListener("click", () => {
      alert("OCR status lookup isn't built out in this version of the prototype.");
    });
    document.getElementById("bdViewI3DocBtn").addEventListener("click", () => {
      alert("Viewing the document sent to i3 isn't built out in this version of the prototype.");
    });
    document.getElementById("backToBillFromPharmacyBtn").addEventListener("click", closePharmacyDetails);
    document.getElementById("pharmacyBackBtn2").addEventListener("click", closePharmacyDetails);
    document.getElementById("pharmacySaveBtn").addEventListener("click", () => {
      const rec = entries.find(x => x.inwardId === pharmacyRecId);
      if (rec) rec.pharmacyRows = pharmacyRows;
      closePharmacyDetails();
    });

    document.getElementById("billCalculateBtn").addEventListener("click", () => {
      const btn = document.getElementById("billCalculateBtn");
      const original = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg> Calculated`;
      setTimeout(() => { btn.innerHTML = original; }, 1400);
    });

    /* =====================================================================
       PER-STAGE REMARKS — one combined, paginated, newest-first table per
       stage card, showing every stage's remarks together (not just this
       stage's own) via the shared renderCombinedRemarksTable. Each stage
       card keeps its own independent pagination position.
    ===================================================================== */

    function truncateWords(text, max) {
      if (!text) return "";
      const words = text.trim().split(/\s+/);
      return words.length <= max ? text : words.slice(0, max).join(" ") + "\u2026";
    }

    const combinedRemarksPageState = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };

    function renderCombinedRemarksAllStages(rec) {
      const showForRole = ["Medico", "Medico TL", "Non Medico", "Non Medico TL", "QC", "QC TL", "CMO", "CEM"].includes(getCurrentRole());
      const suffixes = [1, 2, 3, 4, 5];

      suffixes.forEach(sfx => {
        const card = document.getElementById(`card-userremarks${sfx}`);
        if (!card) return;
        card.classList.toggle("hidden", !showForRole);
        if (!showForRole) return;
        renderCombinedRemarksTable(rec, {
          bodyId: `userRemarksBody${sfx}`,
          emptyId: `userRemarksEmpty${sfx}`,
          footerId: `userRemarksFooter${sfx}`,
          pagerId: `userRemarksPager${sfx}`,
          pageSizeSelectId: `userRemarksPageSize${sfx}`,
          resultCountId: `userRemarksResultCount${sfx}`,
          pageState: combinedRemarksPageState[sfx],
        });
      });
    }

    for (let i = 1; i <= 5; i++) {
      document.getElementById(`remarksAddBtn${i}`).addEventListener("click", () => {
        const textarea = document.getElementById(`remarksInput${i}`);
        const text = textarea.value.trim();
        if (!text) return;

        const rec = entries.find(x => x.inwardId === medicoTargetId);
        if (!rec) return;
        rec.stageRemarks = rec.stageRemarks || defaultStageRemarks();
        rec.stageRemarks[i] = rec.stageRemarks[i] || [];
        rec.stageRemarks[i].push({
          role: getCurrentRole(),
          name: "You",
          datetime: formatRemarkTimestamp(new Date()),
          text,
        });

        textarea.value = "";
        renderCombinedRemarksAllStages(rec);
      });
    }

    /* =====================================================================
       SETTLEMENT (Stage 5)
    ===================================================================== */
    document.getElementById("gstCalcOnBillsBtn").addEventListener("click", () => {
      alert("GST calculation on bills isn't built out in this version of the prototype.");
    });

    document.getElementById("settlementCalculateBtn").addEventListener("click", () => {
      const btn = document.getElementById("settlementCalculateBtn");
      const original = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg> Calculated`;
      setTimeout(() => { btn.innerHTML = original; }, 1400);
    });

    document.getElementById("viewAllRemarksLink").addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("card-medremarks5").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    /* ---------------- Medico Remarks / Excluded Approval Reason ----------------
       Checkbox multi-select dropdown whose option list depends on Claim
       Status (per the CP-Screen Matrix: "Query(Age proof, Alcohol
       Influence in RTA, Approval Letter, Bank Statement...), Deny(Claim
       for 3rd Child, Claim after policy Period,...)"). Every other Claim
       Status has no applicable reasons, so the panel shows an empty-state
       message instead of a checkbox list.
       The native <select multiple id="stMedicoRemarksReason"> stays the
       source of truth (kept in sync on every toggle) so applyMedFieldAccess
       and any code reading its .value/.selectedOptions keeps working
       unchanged — this widget is a visual layer on top of it, not a
       replacement for it. */
    const MEDICO_REMARKS_REASONS_BY_STATUS = {
      Query: ["Age proof", "Alcohol Influence in RTA", "Approval Letter", "Bank Statement"],
      Deny: ["Cashless Claim Closed as SI Not Utilized", "Claim After / before Policy Period", "Claim for 3rd Child"],
    };

    function getMedicoRemarksOptionsForStatus(status) {
      return MEDICO_REMARKS_REASONS_BY_STATUS[status] || [];
    }

    function renderMedicoRemarksOptions() {
      const status = document.getElementById("stClaimStatus").value;
      const options = getMedicoRemarksOptionsForStatus(status);
      const nativeSelect = document.getElementById("stMedicoRemarksReason");
      const optionList = document.getElementById("stMedicoRemarksReasonOptions");
      const emptyMsg = document.getElementById("stMedicoRemarksReasonEmpty");

      // Claim Status changed to something with a different (or no) reason
      // set — drop selections that no longer apply rather than leaving a
      // stale value the user can't see or clear.
      const validValues = new Set(options);
      Array.from(nativeSelect.options).forEach(opt => {
        if (!validValues.has(opt.value)) opt.remove();
      });
      options.forEach(reason => {
        if (!Array.from(nativeSelect.options).some(opt => opt.value === reason)) {
          const opt = document.createElement("option");
          opt.value = reason;
          nativeSelect.appendChild(opt);
        }
      });

      optionList.innerHTML = "";
      if (!options.length) {
        emptyMsg.hidden = false;
        optionList.hidden = true;
      } else {
        emptyMsg.hidden = true;
        optionList.hidden = false;
        options.forEach(reason => {
          const selected = Array.from(nativeSelect.selectedOptions).some(o => o.value === reason);
          const id = "msReason_" + reason.replace(/[^a-zA-Z0-9]/g, "");
          const row = document.createElement("label");
          row.className = "ms-option" + (selected ? " is-checked" : "");
          row.setAttribute("role", "option");
          row.setAttribute("aria-selected", String(selected));
          row.innerHTML = `<input type="checkbox" id="${id}" value="${reason}" ${selected ? "checked" : ""}><span>${reason}</span>`;
          row.querySelector("input").addEventListener("change", (e) => {
            const opt = Array.from(nativeSelect.options).find(o => o.value === reason);
            if (opt) opt.selected = e.target.checked;
            row.classList.toggle("is-checked", e.target.checked);
            row.setAttribute("aria-selected", String(e.target.checked));
            syncMedicoRemarksTrigger();
          });
          optionList.appendChild(row);
        });
      }
      syncMedicoRemarksTrigger();
    }

    function syncMedicoRemarksTrigger() {
      const nativeSelect = document.getElementById("stMedicoRemarksReason");
      const trigger = document.getElementById("stMedicoRemarksReasonTrigger");
      trigger.disabled = nativeSelect.disabled;
      if (nativeSelect.disabled) setMedicoRemarksPanelOpen(false);
      const selected = Array.from(nativeSelect.selectedOptions).map(o => o.value);
      const triggerText = document.getElementById("stMedicoRemarksReasonTriggerText");
      if (!selected.length) {
        triggerText.textContent = "--Select--";
        triggerText.classList.remove("has-selection");
      } else {
        triggerText.textContent = selected.length === 1 ? selected[0] : `${selected.length} selected`;
        triggerText.classList.add("has-selection");
      }

    }

    function setMedicoRemarksPanelOpen(open) {
      const trigger = document.getElementById("stMedicoRemarksReasonTrigger");
      const panel = document.getElementById("stMedicoRemarksReasonPanel");
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    }

    document.getElementById("stMedicoRemarksReasonTrigger").addEventListener("click", (e) => {
      const panel = document.getElementById("stMedicoRemarksReasonPanel");
      setMedicoRemarksPanelOpen(panel.hidden);
    });
    document.addEventListener("click", (e) => {
      const widget = document.getElementById("stMedicoRemarksReasonWidget");
      if (widget && !widget.contains(e.target)) setMedicoRemarksPanelOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMedicoRemarksPanelOpen(false);
    });

    document.getElementById("stClaimStatus").addEventListener("change", renderMedicoRemarksOptions);
    renderMedicoRemarksOptions();


    /* =====================================================================
       PROCESS SHEET / QUICK REFERENCE (persistent sidebar links)
       Simplified for this page: only one claim can ever be "current" here
       (the one the wizard was opened for), so no other-view checks needed.
    ===================================================================== */
    function getCurrentClaimRec() {
      return medicoTargetId ? entries.find(e => e.inwardId === medicoTargetId) : null;
    }

    function openHtmlInNewTab(htmlContent) {
      try {
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
      } catch (err) {
        try {
          const win = window.open("", "_blank");
          if (!win) return false;
          win.document.open();
          win.document.write(htmlContent);
          win.document.close();
          return true;
        } catch (err2) {
          return false;
        }
      }
    }

    let lastViewedDocHtml = "";

    function showDocViewer(title, htmlContent) {
      lastViewedDocHtml = htmlContent;
      document.getElementById("docViewerTitle").textContent = title;
      document.getElementById("docViewerFrame").srcdoc = htmlContent;
      document.getElementById("docViewerOverlay").style.display = "flex";
    }

    document.getElementById("docViewerCloseBtn").addEventListener("click", () => {
      document.getElementById("docViewerOverlay").style.display = "none";
      document.getElementById("docViewerFrame").srcdoc = "";
    });
    document.getElementById("docViewerNewTabBtn").addEventListener("click", () => {
      if (!openHtmlInNewTab(lastViewedDocHtml)) {
        alert("Your browser blocked the new tab. You can keep viewing it here instead.");
      }
    });

    async function openProcessSheet() {
      const rec = getCurrentClaimRec();
      if (!rec) {
        alert("Select a claim first to view its Process Sheet.");
        return;
      }
      const html = await getProcessSheetHTML();
      showDocViewer("Process Sheet - " + (rec.claimId || rec.inwardId), html);
    }

    function openPlaceholderDoc(title) {
      const rec = getCurrentClaimRec();
      if (!rec) {
        alert("Select a claim first to view its " + title + ".");
        return;
      }
      showDocViewer(title, placeholderDocHTML(title, rec.claimId || rec.inwardId));
    }

    document.querySelectorAll(".ref-link-process-sheet").forEach(btn => {
      btn.addEventListener("click", openProcessSheet);
    });
    document.querySelectorAll(".ref-link-claim-info").forEach(btn => {
      btn.addEventListener("click", () => openPlaceholderDoc("Claim Information Sheet"));
    });
    document.querySelectorAll(".ref-link-claim-diary").forEach(btn => {
      btn.addEventListener("click", () => openPlaceholderDoc("Claim Diary"));
    });
    document.querySelectorAll(".ref-link-claim-history").forEach(btn => {
      btn.addEventListener("click", () => openPlaceholderDoc("Claim History"));
    });

    /* =====================================================================
       INIT — open the wizard for whichever claim's inwardId was passed
       via ?id= from index.html's "Process Claim" row action, in whichever
       role was active there (?role=), so the wizard doesn't silently fall
       back to the default role on arrival.
    ===================================================================== */
    (function initFromQueryParam() {
      const params = new URLSearchParams(window.location.search);
      const role = params.get("role");
      if (role && MEDICO_STAFF_ROLES.includes(role)) {
        setCurrentRole(role);
        document.getElementById("profileRoleName").textContent = getCurrentRole();
      }
      const id = params.get("id");
      const rec = id ? entries.find(e => e.inwardId === id) : null;
      if (rec) {
        openMedicoWizard(rec);
      } else {
        alert("No claim selected. Return to the claims list and choose a claim to process.");
      }
    })();

    /* Convert every static <select> on this page into the searchable-
       select UI (shared/searchable-select.js) — every wizard stage's
       markup is present in the DOM from page parse regardless of which
       stage is currently visible, so one blanket call here covers all of
       them. Dynamic grid-row selects (Hospitalization/HC/HC Expenses/QC
       Communication/Bill Items inline-edit/Pharmacy) are wrapped
       separately, right after their own per-row rendering — the
       select.dataset.searchableSelectInit guard inside initSearchableSelect
       means calling this after openMedicoWizard() above (which may have
       already rendered some of those grids) never double-wraps anything. */
    initSearchableSelectsIn(document);
