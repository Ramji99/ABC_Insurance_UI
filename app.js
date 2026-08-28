/* ==========================================================================
   ABC Health Claims Portal — Application JavaScript
   Separated from: ABC_Reimbursement_Claim_updated_v9.html
   Standards: AGENTS.md
   - No inline event handlers (all via addEventListener)
   - No innerHTML for static markup (DOM APIs used for dynamic content)
   - No global variable leakage
   - Behaviour only: state, events, API communication, DOM updates
   ========================================================================== */

    /* statusClass, emailStatusClass, scanTagRowStatusClass, claimStatusClass,
       medicoStatusClass, defaultStageRemarks, formatRemarkTimestamp, showToast,
       formatFileSize, HOSPITAL_MASTER, initHospitalSearch, remarkInitials,
       renderRemarksTrail, renderRemarksTrailHC, initStageRemarks,
       DOCUMENT_CATEGORIES, renderDocTileList, fmtDate, fmtDateTime, fmtCurrency,
       renderStatusChipGroup, statusDisplayLabel come from shared/shared-components.js; ROLES from
       shared/role-config.js; entries/EXISTING_BARCODES from shared/entries-store.js;
       getCurrentRole/setCurrentRole/getScanTagTab/setScanTagTab from
       shared/role-state.js; getProcessSheetHTML from shared/process-sheet-loader.js;
       placeholderDocHTML from shared/placeholder-doc-template.js — all loaded
       as classic <script> tags before this file, so their top-level
       declarations are already global by the time this script runs. */

    /* =====================================================================
       DEMO DATA STORE
    ===================================================================== */
    /* Script-scope handles to the Claim Intimation Document Upload widget
       and its header/checklist controls. Assigned inside the
       DOMContentLoaded handler where they're created, but called from
       top-level flow functions (e.g. openClaimIntimationFlow) — so they
       must live at script scope, not inside that handler's closure. */
    let ciUploadWidget = null;
    let ciDocHeaderControls = null;
    let ciChecklist = null;


    // ─── State ────────────────────────────────────────────────────────
    const state = {
      cin: '',
      draftSaved: false,
      policyFetched: false,
      docRows: [],
      slaSeconds: 4 * 60 * 60,
      slaTotal: 4 * 60 * 60,
      slaInterval: null,
      scrollLocked: false,
      currentSection: 0,
      uploadedDocs: {},   // { categoryId: { file, name, url, type } }
      bulkFiles: [],   // [{ file, name, url, assignedTo }]
      currentViewFile: null,
    };

    // ─── Field Labels (shared) ─────────────────────────────────────────
    const FIELD_LABELS = {
      instanceType: 'Instance Type',
      sourceChannel: 'Source Channel',
      priorityLevel: 'Priority Level',
      dateReceived: 'Date Received',
      hospitalName: 'Hospital Name',
      hospitalCity: 'Hospital City',
      contactPerson: 'Contact Person',
      contactPhone: 'Contact Phone',
      policyNumber: 'Policy Number',
      insuredName: 'Insured Name',
      relationship: 'Relationship',
      insuredDob: 'Date of Birth',
      admissionDate: 'Admission Date',
      dischargeDate: 'Date of Discharge',
      claimedAmount: 'Claimed Amount (₹)',
      routingQueue: 'Routing Queue',
      slaCategory: 'SLA Category',
      assignTo: 'Assign To',
      routingRemarks: 'Routing Remarks',
      declaration: 'Declaration Checkbox',
    };

    let editingId = null;             // Inward ID currently being edited, null when creating new
    let confirmAction = null;         // {type:'hold'|'deactivate'|'activate'|'withdraw', id}
    let assignTargetId = null;        // Inward ID currently being assigned
    let rowMenuTargetId = null;       // Inward ID whose row-status menu is currently open, null when closed

    const AVAILABLE_USERS = ["Priya Sharma", "Arjun Mehta", "Fatima Ali", "Rohit Verma", "Sneha Kapoor"];

    function initials(name) {
      return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    }

    /* =====================================================================
       VIEW SWITCHING
    ===================================================================== */
    const viewCreate = document.getElementById("viewCreate");
    const viewList = document.getElementById("viewList");
    const viewUpload = document.getElementById("viewUpload");
    const viewClaimIntimation = document.getElementById("viewClaimIntimation");
    const sidebarCreateContent = document.getElementById("sidebarCreateContent");
    const sidebarListContent = document.getElementById("sidebarListContent");
    const sidebarUploadContent = document.getElementById("sidebarUploadContent");
    const sidebarClaimContent = document.getElementById("sidebarClaimContent");

    function hideAllViews() {
      viewCreate.classList.add("hidden");
      viewList.classList.add("hidden");
      viewUpload.classList.add("hidden");
      viewClaimIntimation.classList.add("hidden");
      sidebarCreateContent.classList.add("hidden");
      sidebarListContent.classList.add("hidden");
      sidebarUploadContent.classList.add("hidden");
      sidebarClaimContent.classList.add("hidden");
      // Every switchTo*View() calls this first, so resetting scroll here
      // covers all of them — without it, switching views kept whatever
      // scroll offset the previous (now-hidden) view was at.
      window.scrollTo(0, 0);
      // The email thread split panel is scoped to Claim Intimation only —
      // navigating to any other view (back/cancel/list/etc.) should close
      // it instead of leaving it open (and .main shrunk) on a screen it
      // has nothing to do with.
      if (typeof closeEmailSplitPanel === "function") closeEmailSplitPanel();
    }

    function switchToListView() {
      hideAllViews();
      appShell.classList.remove("hidden");
      viewList.classList.remove("hidden");
      sidebarListContent.classList.remove("hidden");
      renderTable();
    }

    function switchToCreateView() {
      hideAllViews();
      viewCreate.classList.remove("hidden");
      sidebarCreateContent.classList.remove("hidden");
      if (typeof resetIeLeftPanel === "function" && !editingId) resetIeLeftPanel();
    }

    function switchToUploadView() {
      hideAllViews();
      viewUpload.classList.remove("hidden");
      sidebarUploadContent.classList.remove("hidden");
      document.querySelectorAll("#sidebarUploadContent .step").forEach((s, i) => s.classList.toggle("active", i === 0));
    }

    function switchToClaimView() {
      hideAllViews();
      viewClaimIntimation.classList.remove("hidden");
      sidebarClaimContent.classList.remove("hidden");
      document.querySelectorAll("#sidebarClaimContent .step").forEach((s, i) => s.classList.toggle("active", i === 0));
    }

    /* Configures the shared success modal's "View" button per calling flow,
       since the same modal/button is reused by Inward Entry, Claim
       Intimation, Medico and Payment submissions. */
    let successModalOnView = switchToListView;
    function showSuccessModal(opts) {
      const btn = document.getElementById("modalViewBtn");
      btn.textContent = (opts && opts.label) || "View in Inward Entries";
      successModalOnView = (opts && opts.onView) || switchToListView;
      // Show "Claim Number" label only on the intimation submission screen
      const claimLabel = document.getElementById("modalClaimLabel");
      if (claimLabel) {
        claimLabel.style.display = (opts && opts.showClaimLabel) ? "" : "none";
      }
      document.getElementById("successModal").classList.add("show");
    }

    /* =====================================================================
       CREATE / EDIT FORM LOGIC
    ===================================================================== */
    const barcodeRow = document.getElementById("barcodeRow");
    const barcodeInput = document.getElementById("barcodeInput");
    // const summaryBarcodeStatus = document.getElementById("summaryBarcodeStatus");
    // const summarySource = document.getElementById("summarySource");

    function currentBarcodeSet(excludeInwardId) {
      const set = new Set(EXISTING_BARCODES);
      entries.forEach(e => { if (e.inwardId !== excludeInwardId) set.add(e.barcode.toUpperCase()); });
      return set;
    }

    function checkBarcode() {
      const val = barcodeInput.value.trim();
      const dupSet = currentBarcodeSet(editingId);
      const isDup = val && dupSet.has(val.toUpperCase());
      barcodeRow.classList.toggle("error", !!isDup);
      if (isDup) {
        const barcodeRowMsg = document.getElementById("barcodeRowMsg");
        barcodeRowMsg.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>This barcode already exists`;
      }
      // if (!val) { summaryBarcodeStatus.textContent = "Not entered"; }
      // else if (isDup) { summaryBarcodeStatus.textContent = "Duplicate flagged"; }
      // else { summaryBarcodeStatus.textContent = "Captured"; }
    }
    barcodeInput.addEventListener("input", checkBarcode);

    const docCondition = document.getElementById("docCondition");
    const remarksField = document.getElementById("remarksField");
    docCondition.addEventListener("change", () => {
      const needsRemarks = ["Damaged", "Partial"].includes(docCondition.value);
      remarksField.classList.toggle("show", needsRemarks);
    });

    // const sourceChannel = document.getElementById("sourceChannel");
    // sourceChannel.addEventListener("change", () => { summarySource.textContent = sourceChannel.value || "Not yet set"; });

    const receivedDate = document.getElementById("receivedDate");

    const referenceId = document.getElementById("referenceId");
    referenceId.addEventListener("blur", () => {
      const field = document.getElementById("f-refid");
      const isDup = referenceId.value.trim().toUpperCase() === "REF-88213";
      field.classList.toggle("has-warn", isDup);
    });

    const fetchBtn = document.getElementById("fetchPolicyBtn");
    const lookupMsg = document.getElementById("lookupMsg");
    // const summaryPolicyStatus = document.getElementById("summaryPolicyStatus");

    fetchBtn.addEventListener("click", () => {
      const pid = document.getElementById("policyId").value.trim();
      const srk = document.getElementById("surakshaId").value.trim();

      document.getElementById("f-policyid").classList.remove("has-error");

      const matched = pid.toUpperCase().startsWith("HE/HGP") || srk.toUpperCase().startsWith("SRK");

      if (matched) {
        document.getElementById("patientName").value = "Shubham Thakre";
        document.getElementById("proposerName").value = "Ayushi P";
        document.getElementById("contactNumber").value = "9876540102";
        document.getElementById("hospitalName").value = "Yashoda Hospitals - Somajiguda";
        lookupMsg.className = "lookup-msg show";
        lookupMsg.innerHTML = `<span class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>Policy Verified - member details auto-filled</span>`;
        summaryPolicyStatus.textContent = "Verified match";
      } else {
        lookupMsg.className = "lookup-msg show";
        lookupMsg.innerHTML = `<span class="unverified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 17h.01"/><path d="M12 3l9 16H3L12 3z"/></svg>Policy not found - you may proceed, flagged for verification</span>`;
        summaryPolicyStatus.textContent = "Unverified - proceed with caution";
      }
    });

    document.getElementById("contactNumber").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });

    /* ---------------- Sidebar collapse ---------------- */
    const sidebar = document.getElementById("sidebar");
    const collapseBtn = document.getElementById("collapseBtn");
    collapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      // Expanding the sidebar while the email split panel is already open
      // (e.g. dragged out to 50%) leaves too little room for the form —
      // shrink the panel back to its minimum width live, same as it does
      // when first opened. Collapsing the sidebar back doesn't auto-widen
      // the panel again — only re-narrowing needs to happen automatically.
      if (!sidebar.classList.contains("collapsed") && document.body.classList.contains("email-split-open")) {
        document.body.style.removeProperty("--email-split-w");
      }
    });

    /* ---------------- Sidebar click-to-scroll (create view) ---------------- */
    document.querySelectorAll(".step").forEach(step => {
      const activate = () => {
        document.getElementById(step.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      step.addEventListener("click", activate);
      step.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });

    /* ---------------- Scroll-spy (all sidebar step lists, page-wide) ---------------- */
    const stepEls = [...document.querySelectorAll(".step")];
    const sectionTargets = stepEls
      .map(s => ({ step: s, el: document.getElementById(s.dataset.target) }))
      .filter(x => x.el);

    function isAtPageBottom() {
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
    }

    function activateLastVisibleStep() {
      // sectionTargets spans every .step on the page (all sidebars/views,
      // not just the currently active one) — .hidden alone isn't enough to
      // scope to "on screen right now" since a section can be non-.hidden
      // while its whole view/sidebar is inactive. getClientRects() is empty
      // for anything not actually laid out (display:none on itself or an
      // ancestor), so it reliably narrows to what's really on screen.
      const visible = sectionTargets.filter(x => x.el.getClientRects().length > 0);
      const last = visible[visible.length - 1];
      if (last) {
        stepEls.forEach(s => s.classList.remove("active"));
        last.step.classList.add("active");
      }
    }

    const spy = new IntersectionObserver((entries) => {
      // At/near the bottom of the page the last section(s) may never enter
      // this observer's mid-viewport trigger band (there's no more room to
      // scroll them into it) — an earlier section can stay "intersecting"
      // indefinitely and keep re-winning here. Once scrolled to the bottom,
      // always defer to the last visible section instead of whatever this
      // batch of entries reports.
      if (isAtPageBottom()) {
        activateLastVisibleStep();
        return;
      }
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const match = sectionTargets.find(x => x.el === entry.target);
          if (match) {
            stepEls.forEach(s => s.classList.remove("active"));
            match.step.classList.add("active");
          }
        }
      });
    }, { root: null, rootMargin: "-35% 0px -55% 0px", threshold: 0 });

    sectionTargets.forEach(x => spy.observe(x.el));

    window.addEventListener("scroll", () => {
      if (isAtPageBottom()) activateLastVisibleStep();
    }, { passive: true });

    /* ---------------- TAT countdown ---------------- */
    let remainingSeconds = 30 * 60;
    const tatEl = document.getElementById("tatRemaining");
    setInterval(() => {
      if (remainingSeconds <= 0) return;
      remainingSeconds--;
      const m = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
      const s = String(remainingSeconds % 60).padStart(2, "0");
      tatEl.textContent = `${m}:${s}`;
      tatEl.classList.toggle("green", remainingSeconds > 300);
      tatEl.style.color = remainingSeconds <= 300 ? "var(--danger)" : "";
    }, 1000);

    /* ---------------- Reset / prefill form helpers ---------------- */
    function resetForm() {
      editingId = null;
      hidePolicyCard('policySummaryCardCreate');
      document.getElementById("stepHeadTitle").textContent = "Package & Barcode Details";
      document.getElementById("breadcrumbCurrent").textContent = "New Inward Entry";
      document.getElementById("submitBtnLabel").textContent = "Submit Inward Entry";

      barcodeInput.value = ""; barcodeInput.disabled = false;
      document.getElementById("totalSheets").value = "";
      docCondition.value = "Good"; refreshSearchableSelectLabel(docCondition.id); remarksField.classList.remove("show");
      document.getElementById("remarks").value = "";
      sourceChannel.selectedIndex = 0; refreshSearchableSelectLabel(sourceChannel.id); summarySource.textContent = "Not yet set";
      receivedDate.valueAsDate = new Date();
      referenceId.value = "";
      document.getElementById("policyId").value = "";
      document.getElementById("surakshaId").value = "";
      document.getElementById("patientName").value = "";
      document.getElementById("proposerName").value = "";
      document.getElementById("contactNumber").value = "";
      document.getElementById("hospitalName").value = "";

      // Excludes #ieHospDetailsGrid/#ieHospGrid's auto-filled read-only
      // fields (Hospital Name/Address/State/City/PIN/Rohini/Type, Number of
      // Days, ICD Code) — those are permanently disabled by design, not
      // part of the "locked until barcode scanned" state this reset undoes.
      // Scoped to #viewCreate — this used to be a document-wide selector
      // with a hand-maintained exclusion list, which silently re-enabled
      // unrelated fields elsewhere in the document that also happen to sit
      // inside a .field wrapper (e.g. Claim Intimation's cgSource, meant to
      // stay permanently disabled/auto-derived) whenever this ran.
      document.querySelectorAll("#viewCreate .field input:not(#ieHospNameDisplay, #ieHospAddr, #ieHospState, #ieHospCity, #ieHospPin, #ieHospRohini, #ieHospType, #ieHospDaysCount, #ieHospIcdCode), #viewCreate .field select, #viewCreate .field textarea, #barcodeInput").forEach(el => el.disabled = false);
      document.getElementById("fetchPolicyBtn").disabled = false;
      document.getElementById("submitBtn").disabled = false;

      lookupMsg.classList.remove("show");
      document.querySelectorAll(".field").forEach(f => f.classList.remove("has-error", "has-warn"));
      document.getElementById("validationSummary").classList.remove("show");
      summaryPolicyStatus.textContent = "Not searched";
      summaryBarcodeStatus.textContent = "Not entered";

      const pill = document.getElementById("statusPill");
      pill.classList.add("status-pending");
      pill.innerHTML = '<span class="dot"></span> Draft - In Progress';

      checkBarcode();

      // Re-sync every converted select's visible proxy label (docCondition,
      // sourceChannel, etc.) after this reset's field writes and the
      // blanket .disabled = false pass above (see shared/searchable-select.js).
      refreshAllSearchableSelects();
    }

    function prefillFormForEdit(rec) {
      editingId = rec.inwardId;
      document.getElementById("stepHeadTitle").textContent = "Edit Package & Barcode Details";
      document.getElementById("breadcrumbCurrent").textContent = "Edit Inward Entry";
      document.getElementById("submitBtnLabel").textContent = "Update Inward Entry";

      barcodeInput.value = rec.barcode;
      document.getElementById("totalSheets").value = rec.totalSheets;
      docCondition.value = rec.docCondition;
      refreshSearchableSelectLabel(docCondition.id);
      remarksField.classList.toggle("show", ["Damaged", "Partial"].includes(rec.docCondition));
      sourceChannel.value = rec.source; refreshSearchableSelectLabel(sourceChannel.id); summarySource.textContent = rec.source;
      receivedDate.value = rec.receivedDate;
      referenceId.value = rec.referenceId || "";
      document.getElementById("policyId").value = rec.policyId || "";
      document.getElementById("surakshaId").value = rec.surakshaId || "";
      document.getElementById("patientName").value = rec.patientName;
      document.getElementById("proposerName").value = rec.proposerName || "";
      document.getElementById("contactNumber").value = rec.contactNumber;
      document.getElementById("hospitalName").value = rec.hospitalName;

      // Excludes #ieHospDetailsGrid/#ieHospGrid's auto-filled read-only
      // fields (Hospital Name/Address/State/City/PIN/Rohini/Type, Number of
      // Days, ICD Code) — those are permanently disabled by design, not
      // part of the "locked until barcode scanned" state this reset undoes.
      // Scoped to #viewCreate — this used to be a document-wide selector
      // with a hand-maintained exclusion list, which silently re-enabled
      // unrelated fields elsewhere in the document that also happen to sit
      // inside a .field wrapper (e.g. Claim Intimation's cgSource, meant to
      // stay permanently disabled/auto-derived) whenever this ran.
      document.querySelectorAll("#viewCreate .field input:not(#ieHospNameDisplay, #ieHospAddr, #ieHospState, #ieHospCity, #ieHospPin, #ieHospRohini, #ieHospType, #ieHospDaysCount, #ieHospIcdCode), #viewCreate .field select, #viewCreate .field textarea, #barcodeInput").forEach(el => el.disabled = false);
      document.getElementById("fetchPolicyBtn").disabled = false;
      document.getElementById("submitBtn").disabled = false;

      document.querySelectorAll(".field").forEach(f => f.classList.remove("has-error", "has-warn"));
      document.getElementById("validationSummary").classList.remove("show");
      summaryPolicyStatus.textContent = (rec.policyId || rec.surakshaId) ? "Previously verified" : "Not searched";
      lookupMsg.classList.remove("show");

      const pill = document.getElementById("statusPill");
      pill.classList.remove("status-pending");
      const pillStatusLabel = rec.status === "Pending - Claim Intimation" ? "In Progress - Claim Intimation" : rec.status;
      pill.innerHTML = `<span class="dot"></span> ${pillStatusLabel}`;

      checkBarcode();

      // Re-sync every converted select's visible proxy label (docCondition,
      // sourceChannel, etc.) after this prefill's field writes and the
      // blanket .disabled = false pass above (see shared/searchable-select.js).
      refreshAllSearchableSelects();
    }

    /* ---------------- Cancel ---------------- */
    document.getElementById("cancelBtn").addEventListener("click", () => {
      if (confirm("Discard unsaved changes and return to Inward Entries?")) {
        resetForm();
        switchToListView();
      }
    });

    document.getElementById("backToListBtn").addEventListener("click", () => {
      switchToListView();
    });
    document.getElementById("breadcrumbListLink").addEventListener("click", (e) => {
      e.preventDefault();
      switchToListView();
    });

    /* ---------------- Submit / Validation ---------------- */
    function setFieldError(fieldId, isError) {
      document.getElementById(fieldId).classList.toggle("has-error", isError);
    }

    document.getElementById("saveBtn").addEventListener("click", () => {
      const barcodeVal = barcodeInput.value.trim();
      if (editingId) {
        const rec = entries.find(e => e.inwardId === editingId);
        if (rec) rec.updatedDate = new Date().toISOString();
        alert(`Draft saved for ${editingId}.`);
      } else {
        alert(barcodeVal ? `Draft saved for barcode ${barcodeVal}.` : "Draft saved.");
      }
    });

    document.getElementById("submitBtn").addEventListener("click", () => {
      const errors = [];

      const barcodeVal = barcodeInput.value.trim();
      const dupSet = currentBarcodeSet(editingId);
      const barcodeIsDup = barcodeVal && dupSet.has(barcodeVal.toUpperCase());
      if (!barcodeVal) { errors.push("Enter the package barcode to continue."); }
      if (barcodeIsDup) { errors.push("This barcode is already inwarded - resolve the duplicate before submitting."); }

      const sheets = document.getElementById("totalSheets");
      const sheetsInvalid = !sheets.value || Number(sheets.value) <= 0;
      setFieldError("f-sheets", sheetsInvalid);
      if (sheetsInvalid) errors.push("Enter a valid number of physical sheets (greater than 0).");

      const condInvalid = !docCondition.value;
      setFieldError("f-condition", condInvalid);
      if (condInvalid) errors.push("Select a Document Condition.");

      const remarks = document.getElementById("remarks");
      const remarksNeeded = ["Damaged", "Partial"].includes(docCondition.value);
      const remarksInvalid = remarksNeeded && !remarks.value.trim();
      document.getElementById("remarksField").classList.toggle("has-error", remarksInvalid);
      if (remarksInvalid) errors.push("Remarks are required when Document Condition is Damaged or Partial.");

      const sourceInvalid = !sourceChannel.value;
      setFieldError("f-source", sourceInvalid);
      if (sourceInvalid) errors.push("Select a Source for the package.");

      const dateInvalid = !receivedDate.value || new Date(receivedDate.value) > new Date();
      setFieldError("f-date", dateInvalid);
      if (dateInvalid) errors.push("Received Date cannot be a future date.");

      const pid = document.getElementById("policyId").value.trim();
      const srk = document.getElementById("surakshaId").value.trim();

      const patient = document.getElementById("patientName");
      const patientInvalid = !patient.value.trim();
      setFieldError("f-patient", patientInvalid);
      if (patientInvalid) errors.push("Patient Name is required.");

      const contact = document.getElementById("contactNumber");
      const contactInvalid = contact.value.trim().length !== 10;
      setFieldError("f-contact", contactInvalid);
      if (contactInvalid) errors.push("Enter a valid 10-digit contact number.");

      const hospital = document.getElementById("hospitalName");
      const hospitalInvalid = !hospital.value.trim();
      setFieldError("f-hospital", hospitalInvalid);
      if (hospitalInvalid) errors.push("Hospital Name is required.");

      const summary = document.getElementById("validationSummary");
      const list = document.getElementById("validationList");

      if (errors.length) {
        list.innerHTML = errors.map(e => `<li>${e}</li>`).join("");
        // summary.classList.add("show");
        summary.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // summary.classList.remove("show");

      const nowIso = new Date().toISOString();
      const formData = {
        barcode: barcodeVal,
        totalSheets: Number(sheets.value),
        docCondition: docCondition.value,
        source: sourceChannel.value,
        receivedDate: receivedDate.value,
        referenceId: referenceId.value.trim(),
        policyId: pid,
        surakshaId: srk,
        patientName: patient.value.trim(),
        proposerName: document.getElementById("proposerName").value.trim(),
        contactNumber: contact.value.trim(),
        hospitalName: hospital.value.trim(),
      };

      let inwardNo;
      let claimNo;
      let isEdit = !!editingId;

      if (isEdit) {
        const rec = entries.find(e => e.inwardId === editingId);
        Object.assign(rec, formData);
        rec.updatedDate = nowIso;
        inwardNo = rec.inwardId;
        claimNo = rec.claimId;
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const seq = String(Math.floor(100 + Math.random() * 899)).padStart(5, "0");
        inwardNo = `INW/${yyyy}${mm}${dd}/${seq}`;
        claimNo = `CLM-${yyyy}${mm}${dd}-${seq}`;
        entries.push({
          inwardId: inwardNo, ...formData,
          createdDate: nowIso, updatedDate: nowIso, status: "Pending - Claim Intimation", assignedUser: null, claimStatus: "Not Started",
          claimId: claimNo, priority: "Medium", claimType: "Health", claimAmount: 0, medicoStatus: "In Progress", emailStatus: "Pending"
        });
      }

      document.getElementById("successTitle").textContent = isEdit ? "Inward Entry Updated" : "Claim Intimation Submitted";
      document.getElementById("successSub").textContent = isEdit
        ? "Your changes have been saved."
        : `${inwardNo} has been marked Completed.`;
      document.getElementById("modalInwardNo").textContent = claimNo || inwardNo;
      showSuccessModal({ label: "View in Inward Entries", onView: switchToListView });
      showToast("success", "Inward submitted successfully", inwardNo);
    });

    document.getElementById("modalViewBtn").addEventListener("click", () => {
      document.getElementById("successModal").classList.remove("show");
      resetForm();
      successModalOnView();
    });

    document.getElementById("searchCriteriaOkBtn").addEventListener("click", () => {
      document.getElementById("searchCriteriaModal").classList.remove("show");
    });

    /* Global helper used by all Search Policy / Search Claims buttons */
    window.showSearchCriteriaModal = function() {
      document.getElementById('searchCriteriaModal').classList.add('show');
    };

    /* =====================================================================
       LIST VIEW LOGIC
    ===================================================================== */
    const gridBody = document.getElementById("gridBody");
    const emptyState = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");
    const pager = document.getElementById("pager");
    const chipRow = document.getElementById("chipRow");
    const listSearch = document.getElementById("listSearch");
    const pageSizeSelect = document.getElementById("pageSizeSelect");

    let listState = {
      search: "",
      status: ["Active", "Inactive", "Pending - Claim Intimation"],
      statusChip: null, // active Status Filter Chip (reusable component) — separate from the advanced-filter status checkboxes above
      createdFrom: "", createdTo: "",
      receivedFrom: "", receivedTo: "",
      updatedFrom: "", updatedTo: "",
      barcode: "", source: "", policyNumber: "",
      emailStatus: "", assignFilter: "all",
      sortCol: "createdDate", sortDir: "desc",
      page: 1, pageSize: 10
    };


    /* Deterministic display-status for a row, matching the badge already shown
       in the table (extracted here so the Status Filter Chips and the table
       badge always agree, with no duplicate/divergent data). */
    const IE_ROW_STATUSES = ['Pending', 'Inactive', 'Error'];
    const CI_ROW_STATUSES = ['Pending', 'Intimated', 'Not Started', 'Error', 'Query Raised', 'Pending', 'Error', 'Intimated'];
    function ieRowStatus(rec) {
      return IE_ROW_STATUSES[parseInt(rec.inwardId.replace(/\D/g, '').slice(-1) || '0') % IE_ROW_STATUSES.length];
    }
    function ciRowStatus(rec) {
      return CI_ROW_STATUSES[parseInt(rec.inwardId.replace(/\D/g, '').slice(-1) || '0') % CI_ROW_STATUSES.length];
    }
    function scanTagRowStatus(rec) {
      return isClaimContentActive() ? ciRowStatus(rec) : ieRowStatus(rec);
    }

    function isMedicoQcRole() {
      const currentRole = getCurrentRole();
      return currentRole === "Medico TL" || currentRole === "Non Medico TL" ||
        currentRole === "Medico" || currentRole === "Non Medico" ||
        currentRole === "QC" || currentRole === "QC TL" ||
        currentRole === "CMO" || currentRole === "CEM" ||
        currentRole === "Payment Auditor - Settlement User";
    }
    function currentListRowStatus(rec) {
      return isMedicoQcRole() ? rec.medicoStatus : scanTagRowStatus(rec);
    }
    function currentListRowStatusClass(status) {
      return isMedicoQcRole() ? medicoStatusClass(status) : scanTagRowStatusClass(status);
    }

    function getFiltered() {
      let rows = getFilteredExcludingStatusChip();
      if (listState.statusChip) {
        rows = rows.filter(e => currentListRowStatus(e) === listState.statusChip);
      }
      return rows;
    }

    function getFilteredExcludingStatusChip() {
      let rows = entries.filter(e => listState.status.includes(e.status));

      if (listState.search.trim()) {
        const q = listState.search.trim().toLowerCase();
        rows = rows.filter(e => {
          const policyNum = e.policyId || e.surakshaId || "";
          return [e.inwardId, e.claimId, policyNum, e.barcode]
            .some(v => (v || "").toLowerCase().includes(q));
        });
      }

      if (listState.createdFrom) { rows = rows.filter(e => new Date(e.createdDate) >= new Date(listState.createdFrom)); }
      if (listState.createdTo) { rows = rows.filter(e => new Date(e.createdDate) <= new Date(listState.createdTo + "T23:59:59")); }
      if (listState.receivedFrom) { rows = rows.filter(e => new Date(e.receivedDate) >= new Date(listState.receivedFrom)); }
      if (listState.receivedTo) { rows = rows.filter(e => new Date(e.receivedDate) <= new Date(listState.receivedTo + "T23:59:59")); }
      if (listState.updatedFrom) { rows = rows.filter(e => e.updatedDate && new Date(e.updatedDate) >= new Date(listState.updatedFrom)); }
      if (listState.updatedTo) { rows = rows.filter(e => e.updatedDate && new Date(e.updatedDate) <= new Date(listState.updatedTo + "T23:59:59")); }

      if (listState.barcode.trim()) { const q = listState.barcode.trim().toLowerCase(); rows = rows.filter(e => (e.barcode || "").toLowerCase().includes(q)); }
      if (listState.source) { rows = rows.filter(e => e.source === listState.source); }
      if (listState.policyNumber.trim()) { const q = listState.policyNumber.trim().toLowerCase(); rows = rows.filter(e => ((e.policyId || e.surakshaId || "")).toLowerCase().includes(q)); }
      if (listState.emailStatus) { rows = rows.filter(e => e.emailStatus === listState.emailStatus); }
      if (listState.assignFilter === "assigned") { rows = rows.filter(e => !!e.assignedUser); }
      else if (listState.assignFilter === "unassigned") { rows = rows.filter(e => !e.assignedUser); }

      rows.sort((a, b) => {
        const aHigh = a.priority === "High" ? 0 : 1;
        const bHigh = b.priority === "High" ? 0 : 1;
        if (aHigh !== bHigh) return aHigh - bHigh;
        const av = new Date(a[listState.sortCol]).getTime();
        const bv = new Date(b[listState.sortCol]).getTime();
        return listState.sortDir === "asc" ? av - bv : bv - av;
      });

      return rows;
    }

    function renderChips() {
      const chips = [];
      if (listState.search.trim()) {
        chips.push({ label: `Search: "${listState.search.trim()}"`, onClear: () => { listSearch.value = ""; listState.search = ""; listState.page = 1; renderTable(); } });
      }
      if (listState.status.length < 3) {
        const statusLabels = listState.status.map(s => s === "Pending - Claim Intimation" ? "In Progress - Claim Intimation" : s);
        chips.push({
          label: `Status: ${statusLabels.join(", ")}`, onClear: () => {
            listState.status = ["Active", "Inactive", "Pending - Claim Intimation"];
            document.querySelectorAll(".status-chk").forEach(c => c.checked = true);
            listState.page = 1; renderTable();
          }
        });
      }
      if (listState.createdFrom || listState.createdTo) {
        chips.push({
          label: `Created: ${listState.createdFrom || "..."} to ${listState.createdTo || "..."}`, onClear: () => {
            document.getElementById("createdFrom").value = ""; document.getElementById("createdTo").value = "";
            listState.createdFrom = ""; listState.createdTo = ""; listState.page = 1; renderTable();
          }
        });
      }
      if (listState.receivedFrom || listState.receivedTo) {
        chips.push({
          label: `Received: ${listState.receivedFrom || "..."} to ${listState.receivedTo || "..."}`, onClear: () => {
            document.getElementById("receivedFrom").value = ""; document.getElementById("receivedTo").value = "";
            listState.receivedFrom = ""; listState.receivedTo = ""; listState.page = 1; renderTable();
          }
        });
      }
      if (listState.updatedFrom || listState.updatedTo) {
        chips.push({
          label: `Updated: ${listState.updatedFrom || "..."} to ${listState.updatedTo || "..."}`, onClear: () => {
            document.getElementById("updatedFrom").value = ""; document.getElementById("updatedTo").value = "";
            listState.updatedFrom = ""; listState.updatedTo = ""; listState.page = 1; renderTable();
          }
        });
      }
      if (listState.barcode.trim()) {
        chips.push({ label: `Barcode: "${listState.barcode.trim()}"`, onClear: () => { document.getElementById("filterBarcode").value = ""; listState.barcode = ""; listState.page = 1; renderTable(); } });
      }
      if (listState.policyNumber.trim()) {
        chips.push({ label: `Policy #: "${listState.policyNumber.trim()}"`, onClear: () => { document.getElementById("filterPolicyNumber").value = ""; listState.policyNumber = ""; listState.page = 1; renderTable(); } });
      }
      if (listState.source) {
        chips.push({ label: `Source: ${listState.source}`, onClear: () => { document.getElementById("filterSource").value = ""; refreshSearchableSelectLabel("filterSource"); listState.source = ""; listState.page = 1; renderTable(); } });
      }
      if (listState.emailStatus) {
        chips.push({ label: `Email Status: ${listState.emailStatus}`, onClear: () => { document.getElementById("filterEmailStatus").value = ""; refreshSearchableSelectLabel("filterEmailStatus"); listState.emailStatus = ""; listState.page = 1; renderTable(); } });
      }
      if (listState.assignFilter !== "all") {
        chips.push({
          label: `Assign: ${listState.assignFilter === "assigned" ? "Assigned" : "Unassigned"}`, onClear: () => {
            document.querySelectorAll(".assign-radio").forEach(r => r.checked = (r.value === "all"));
            listState.assignFilter = "all"; listState.page = 1; renderTable();
          }
        });
      }

      chipRow.innerHTML = "";
      chipRow.classList.toggle("empty", chips.length === 0);
      chips.forEach(c => {
        const el = document.createElement("span");
        el.className = "chip";
        el.innerHTML = `${c.label} <button type="button" aria-label="Clear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
        el.querySelector("button").addEventListener("click", c.onClear);
        chipRow.appendChild(el);
      });
    }

    /* =====================================================================
       REUSABLE STATUS FILTER CHIP GROUP
       Rounded-pill chip row, generated dynamically from a table's current
       (already search/date/other-filtered) dataset — no hardcoded status
       names. "All" is always first. Clicking a chip filters instantly;
       clicking the active chip again (or "All") clears the filter. Counts
       always reflect the currently loaded/filtered dataset.
    ===================================================================== */

    function selectScanTagStatusChip(status) {
      listState.statusChip = status;
      listState.page = 1;
      renderTable();
    }

    const DEFAULT_THEAD_HTML = `
  <th>Inward ID</th>
  <th>Barcode</th>
  <th>Source</th>
  <th>Claim Number</th>
  <th>Patient Name</th>
  <th class="sortable" data-sort="receivedDate">Received Date <span class="sort-arrow">&#9650;</span></th>
  <th>Policy Number</th>
  <th>Status</th>
  <th class="assign-col">Assign User</th>
  <th>Actions</th>
`;
    const CLAIM_THEAD_HTML = `
  <th>Barcode / Interaction ID</th>
  <th>Patient Name</th>
  <th>Policy Number</th>
  <th>Claim Number</th>
  <th>Source</th>
  <th class="sortable" data-sort="receivedDate">Received Date <span class="sort-arrow">&#9650;</span></th>
  <th>Status</th>
  <th>Actions</th>
`;
    const MEDICO_THEAD_HTML = `
  <th>Claim ID</th>
  <th>Patient Name</th>
  <th>Policy Number</th>
  <th>Priority</th>
  <th>Claim Type</th>
  <th class="sortable" data-sort="createdDate">Submission Date <span class="sort-arrow">&#9660;</span></th>
  <th>Claim Amount</th>
  <th>Current Status</th>
  <th>Assigned User</th>
`;
    const MEDICO_STAFF_THEAD_HTML = `
  <th>Claim ID</th>
  <th>Patient Name</th>
  <th>Policy Number</th>
  <th>Priority</th>
  <th>Claim Type</th>
  <th class="sortable" data-sort="createdDate">Submission Date <span class="sort-arrow">&#9660;</span></th>
  <th>Claim Amount</th>
  <th>Current Status</th>
  <th>Actions</th>
`;


    function priorityClass(p) {
      if (p === "High") return "pr-high";
      if (p === "Low") return "pr-low";
      return "pr-medium";
    }


    function bindSortableHeaders() {
      document.querySelectorAll("th.sortable").forEach(th => {
        th.addEventListener("click", () => {
          const col = th.dataset.sort;
          if (listState.sortCol === col) {
            listState.sortDir = listState.sortDir === "asc" ? "desc" : "asc";
          } else {
            listState.sortCol = col;
            listState.sortDir = "desc";
          }
          listState.page = 1;
          renderTable();
        });
      });
    }

    function updateScanTagPendingBadges() {
      const badgeInward = document.getElementById("scanTagBadgeInward");
      const badgeClaim = document.getElementById("scanTagBadgeClaim");
      const tabInward = document.getElementById("scanTagTabInward");
      const tabClaim = document.getElementById("scanTagTabClaim");
      if (!badgeInward && !badgeClaim) return;

      // Same underlying dataset for both queues — reuse the existing
      // (search/date/etc.) filtered set, just read through each queue's own
      // status mapping, so no duplicate dataset is created.
      const base = getFilteredExcludingStatusChip();
      const inwardPending = base.filter(e => ieRowStatus(e) === "Pending").length;
      const claimPending = base.filter(e => ciRowStatus(e) === "Pending").length;

      if (badgeInward) badgeInward.textContent = String(inwardPending);
      if (badgeClaim) badgeClaim.textContent = String(claimPending);
      if (tabInward) tabInward.setAttribute("aria-label", `Inward Entries, ${inwardPending} in progress`);
      if (tabClaim) tabClaim.setAttribute("aria-label", `Claim Intimation, ${claimPending} in progress`);
    }

    // Claim Intimation list "Source" column value for a record. Demo data cycles
    // Internal Email / External Email by inwardId, except PKG-0000631 which is
    // pinned to Physical Document (source row for the Physical Document quick-flow).
    function ciSourceForRec(rec) {
      if (rec.barcode === "PKG-0000631") return "Physical Document";
      const ciSources = ["Internal Email", "External Email", "Internal Email", "External Email", "Internal Email", "External Email", "Internal Email", "External Email"];
      return ciSources[parseInt(rec.inwardId.replace(/\D/g, "").slice(-1) || "0") % ciSources.length];
    }

    function populateCiBarcodeSource(rec) {
      const field = document.getElementById("ci-barcode-source-field");
      const input = document.getElementById("ci-barcode-source-input");
      if (!field || !input) return;
      // Shown for every source (Internal Email, External Email, Physical
      // Document, Courier, Post, etc.), not just Internal/External Email —
      // the ID field next to it always has a source worth surfacing.
      field.classList.remove("hidden");
      input.value = ciSourceForRec(rec);
    }

    // Mock email thread linked to barcode PKG-0000299 — the only interaction
    // "Click to view email" is wired up for (see openClaimIntimationFlow's
    // ciViewEmailThreadBtn toggle).
    const EMAIL_THREAD_MOCK = [
      {
        from: "vikram.nair@example.com",
        to: "claims@abchealthclaims.com",
        date: "25 Jun 2026, 10:12 AM",
        subject: "Claim Intimation — Care Hospitals, Banjara Hills",
        body: "Hello,\n\nPlease find attached the discharge summary and hospital bills for my recent hospitalization at Care Hospitals, Banjara Hills. Kindly process the claim at the earliest.\n\nRegards,\nVikram Nair",
      },
      {
        from: "claims@abchealthclaims.com",
        to: "vikram.nair@example.com",
        date: "25 Jun 2026, 11:40 AM",
        subject: "RE: Claim Intimation — Care Hospitals, Banjara Hills",
        body: "Dear Mr. Nair,\n\nThank you for reaching out. We have logged your claim intimation and assigned reference PKG-0000299 for tracking. Our team will review the attached documents and get back to you within 2 business days.\n\nRegards,\nABC Health Claims Team",
      },
      {
        from: "vikram.nair@example.com",
        to: "claims@abchealthclaims.com",
        date: "25 Jun 2026, 2:05 PM",
        subject: "RE: Claim Intimation — Care Hospitals, Banjara Hills",
        body: "Thank you for the update. Please let me know if any additional documents are required.",
      },
    ];

    function emailInitials(from) {
      const name = String(from).split("@")[0].replace(/[._]+/g, " ").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
      return initials.toUpperCase();
    }

    function renderEmailThread() {
      const body = document.getElementById("emailSplitBody");
      if (!body) return;
      // Single conversation card holding every message, newest first, each
      // fully visible (From/To/Subject/Date/Body) and separated by a
      // divider — no per-message accordion/collapse.
      const subject = EMAIL_THREAD_MOCK.length ? EMAIL_THREAD_MOCK[0].subject.replace(/^RE:\s*/i, "") : "";
      const ordered = EMAIL_THREAD_MOCK.map((m, i) => ({ ...m, idx: i })).slice().reverse();

      const card = document.createElement("div");
      card.className = "email-thread-card";

      const subjectEl = document.createElement("div");
      subjectEl.className = "email-thread-subject";
      subjectEl.textContent = subject;
      card.appendChild(subjectEl);

      ordered.forEach(m => {
        const msg = document.createElement("div");
        msg.className = "email-thread-msg";
        msg.dataset.idx = String(m.idx);

        const avatar = document.createElement("span");
        avatar.className = "email-thread-msg-avatar";
        avatar.textContent = emailInitials(m.from);
        msg.appendChild(avatar);

        const text = document.createElement("div");
        text.className = "email-thread-msg-text";

        const head = document.createElement("div");
        head.className = "email-thread-msg-head";
        const from = document.createElement("span");
        from.className = "email-thread-msg-from";
        from.textContent = m.from;
        const date = document.createElement("span");
        date.className = "email-thread-msg-date";
        date.textContent = m.date;
        head.append(from, date);
        text.appendChild(head);

        const to = document.createElement("div");
        to.className = "email-thread-msg-to";
        to.textContent = "To: " + m.to;
        text.appendChild(to);

        const subjLine = document.createElement("div");
        subjLine.className = "email-thread-msg-subject";
        subjLine.textContent = m.subject;
        text.appendChild(subjLine);

        const bodyEl = document.createElement("div");
        bodyEl.className = "email-thread-msg-body";
        bodyEl.textContent = m.body;
        text.appendChild(bodyEl);

        msg.appendChild(text);
        card.appendChild(msg);
      });

      body.textContent = "";
      body.appendChild(card);
    }

    function openEmailSplitPanel() {
      renderEmailThread();
      document.getElementById("emailSplitOverlay").classList.remove("hidden");
      // Clear any inline --email-split-w left over from a previous drag —
      // otherwise it permanently overrides the CSS default (which opens the
      // panel at its minimum width every time) and every reopen would stay
      // stuck at whatever width it was last dragged to.
      document.body.style.removeProperty("--email-split-w");
      // .main reads the same --email-split-w var (see styles.css) to shrink
      // and reflow alongside the panel, instead of the panel just sitting
      // as an overlay on top of an unchanged main content area.
      document.body.classList.add("email-split-open");
      updateEmailSplitBottomInset();
    }
    function closeEmailSplitPanel() {
      document.getElementById("emailSplitOverlay").classList.add("hidden");
      document.body.classList.remove("email-split-open");
    }

    const ciViewEmailThreadBtnEl = document.getElementById("ciViewEmailThreadBtn");
    if (ciViewEmailThreadBtnEl) ciViewEmailThreadBtnEl.addEventListener("click", openEmailSplitPanel);
    const emailSplitCloseBtnEl = document.getElementById("emailSplitCloseBtn");
    if (emailSplitCloseBtnEl) emailSplitCloseBtnEl.addEventListener("click", closeEmailSplitPanel);

    // The panel is full-height by default (--email-split-bottom: 0) and
    // only shrinks to clear the Claim Intimation flow's fixed decision/
    // submit footer (.action-bar--fixed, e.g. #card-claimdecision) once
    // that footer is actually visible — it's toggled .hidden/shown at
    // various points, so this recomputes on open and keeps watching while
    // the panel stays open, rather than always reserving the space.
    function updateEmailSplitBottomInset() {
      const overlay = document.getElementById("emailSplitOverlay");
      if (!overlay || overlay.classList.contains("hidden")) return;
      const footer = document.querySelector('#viewClaimIntimation .action-bar.action-bar--fixed:not(.hidden)');
      const height = footer ? footer.getBoundingClientRect().height : 0;
      overlay.style.setProperty("--email-split-bottom", height ? height + "px" : "0");
    }
    (function watchEmailSplitFooter() {
      const claimView = document.getElementById("viewClaimIntimation");
      if (!claimView) return;
      const mo = new MutationObserver(updateEmailSplitBottomInset);
      mo.observe(claimView, { attributes: true, attributeFilter: ["class"], subtree: true });
      window.addEventListener("resize", updateEmailSplitBottomInset);
    })();

    // Drag-to-resize: the panel's width is a % of the viewport, held in
    // --email-split-w on the overlay. Dragging the resizer left/right lets
    // the user rebalance the split (e.g. 60/40 either direction) so both
    // the form and the email thread can be sized to taste, not fixed.
    (function initEmailSplitResizer() {
      const overlay = document.getElementById("emailSplitOverlay");
      const resizer = document.getElementById("emailSplitResizer");
      if (!overlay || !resizer) return;
      let dragging = false;

      function onPointerMove(e) {
        if (!dragging) return;
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const panelWidthPx = window.innerWidth - x;
        let pct = (panelWidthPx / window.innerWidth) * 100;
        // Capped at 50% — the panel should never take over half the
        // viewport, leaving the Claim Intimation form squeezed.
        pct = Math.max(20, Math.min(50, pct));
        // Past 40%, the left sidebar (if still expanded) is auto-collapsed
        // to free up room for the wider panel instead of both fighting the
        // form for space.
        const sidebar = document.getElementById("sidebar");
        if (pct > 40 && sidebar && !sidebar.classList.contains("collapsed")) {
          sidebar.classList.add("collapsed");
        }
        // Set on body (not the overlay) so .main's margin-right — which
        // reads the same variable — tracks the drag live too.
        document.body.style.setProperty("--email-split-w", pct + "%");
      }
      function stopDrag() {
        if (!dragging) return;
        dragging = false;
        resizer.classList.remove("dragging");
        document.body.classList.remove("email-split-resizing");
      }
      resizer.addEventListener("mousedown", () => {
        dragging = true;
        resizer.classList.add("dragging");
        document.body.classList.add("email-split-resizing");
      });
      resizer.addEventListener("touchstart", () => {
        dragging = true;
        resizer.classList.add("dragging");
        document.body.classList.add("email-split-resizing");
      }, { passive: true });
      document.addEventListener("mousemove", onPointerMove);
      document.addEventListener("touchmove", onPointerMove, { passive: true });
      document.addEventListener("mouseup", stopDrag);
      document.addEventListener("touchend", stopDrag);
    })();

    function renderTable() {
      document.getElementById("totalEntriesCount").textContent = entries.length;

      const currentRole = getCurrentRole();
      const isClaimRole = isClaimContentActive();
      const isMedicoTLRole = currentRole === "Medico TL" || currentRole === "Non Medico TL";
      const isMedicoStaffRole = currentRole === "Medico" || currentRole === "Non Medico" || currentRole === "QC" || currentRole === "QC TL" || currentRole === "CMO" || currentRole === "CEM" || currentRole === "Payment Auditor - Settlement User";
      document.getElementById("gridHeadRow").innerHTML = isMedicoTLRole ? MEDICO_THEAD_HTML : (isMedicoStaffRole ? MEDICO_STAFF_THEAD_HTML : (isClaimRole ? CLAIM_THEAD_HTML : DEFAULT_THEAD_HTML));
      document.querySelector("table").classList.toggle("claim-list-table", isClaimRole);
      bindSortableHeaders();

      const filtered = getFiltered();
      const total = filtered.length;
      const pageCount = Math.max(1, Math.ceil(total / listState.pageSize));
      if (listState.page > pageCount) listState.page = pageCount;
      const start = (listState.page - 1) * listState.pageSize;
      const pageRows = filtered.slice(start, start + listState.pageSize);

      renderChips();
      updateScanTagPendingBadges();

      const isScanTagListContext = currentRole === "Scan Tag" || currentRole === "Scan Tag TL";
      const statusChipGroupEl = document.getElementById("statusChipGroup");
      if (statusChipGroupEl) {
        if (isScanTagListContext || isMedicoTLRole || isMedicoStaffRole) {
          renderStatusChipGroup(
            "statusChipGroup",
            getFilteredExcludingStatusChip(),
            currentListRowStatus,
            currentListRowStatusClass,
            listState.statusChip,
            selectScanTagStatusChip,
            statusDisplayLabel
          );
        } else {
          statusChipGroupEl.classList.add("hidden");
          statusChipGroupEl.innerHTML = "";
        }
      }

      gridBody.innerHTML = "";
      emptyState.classList.toggle("hidden", total > 0);

      pageRows.forEach(rec => {
        const policyNum = rec.policyId || rec.surakshaId || "-";
        const tr = document.createElement("tr");

        if (isClaimRole) {
          const ciClaimNums = ['CLM/20260610/00042', 'CLM/20260520/00031', '', 'CLM/20260415/00007', '', 'CLM/20260501/00018', '', 'CLM/20260308/00011'];
          const ciClaimNum = ciClaimNums[parseInt(rec.inwardId.replace(/\D/g, '').slice(-1) || '0') % ciClaimNums.length] || '';
          const ciClaimNumWrapped = ciClaimNum.length > 8 ? ciClaimNum.slice(0, 8) + ciClaimNum.slice(8) : ciClaimNum;
          const ciSource = ciSourceForRec(rec);
          const ciStatus = ciRowStatus(rec);
          const ciStatusClass = { Pending: 'st-pending', Intimated: 'st-active', 'Not Started': 'st-inactive', Error: 'st-error', 'Query Raised': 'st-warn' }[ciStatus] || 'st-inactive';
          const ciDisabled = ciStatus === 'Query Raised' || ciStatus === 'Intimated';
          tr.classList.add("claim-row-clickable");
          tr.dataset.claimRowId = rec.inwardId;
          tr.innerHTML = `
        <td class="mono">${rec.barcode || rec.inwardId || '-'}</td>
        <td class="strong">${rec.patientName}</td>
        <td class="mono">${policyNum}</td>
        <td class="mono">${ciClaimNum ? `<span style="font-size:11.5px;">${ciClaimNumWrapped}</span>` : '<span style="color:var(--muted);font-size:11px;">—</span>'}</td>
        <td>${ciSource}</td>
        <td>${fmtDate(rec.receivedDate)}</td>
        <td><span class="status-badge ${ciStatusClass}">${statusDisplayLabel(ciStatus)}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-sm ${ciDisabled ? 'btn-outline' : 'btn-primary'}" type="button" data-action="admit-claim" data-id="${rec.inwardId}" ${ciDisabled ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              ${ciDisabled ? ciStatus : 'Intimate Claim'}
            </button>
          </div>
        </td>
      `;
          gridBody.appendChild(tr);
          return;
        }

        if (isMedicoTLRole) {
          const claimIdW = rec.claimId.length > 8 ? rec.claimId.slice(0, 8) + rec.claimId.slice(8) : rec.claimId;
          const patientW = rec.patientName.split(' ')[0] + (rec.patientName.includes(' ') ? ' ' + rec.patientName.slice(rec.patientName.indexOf(' ') + 1) : '');
          const policyW = policyNum.length > 8 ? policyNum.slice(0, 8) + policyNum.slice(8) : policyNum;
          tr.innerHTML = `
        <td class="strong mono">${claimIdW}</td>
        <td class="strong">${patientW}</td>
        <td class="mono">${policyW}</td>
        <td><span class="priority-badge ${priorityClass(rec.priority)}">${rec.priority}</span></td>
        <td>${rec.claimType}</td>
        <td>${fmtDate(rec.createdDate)}</td>
        <td class="mono">${fmtCurrency(rec.claimAmount)}</td>
        <td><span class="status-badge ${medicoStatusClass(rec.medicoStatus)}">${rec.medicoStatus}</span></td>
        <td>
          <button class="assign-chip ${rec.assignedUser ? "" : "unassigned"}" type="button" data-action="assign" data-id="${rec.inwardId}">
            ${rec.assignedUser
              ? `<span class="assign-avatar">${initials(rec.assignedUser)}</span><span>${rec.assignedUser}</span>`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg><span>Unassigned</span>`
            }
          </button>
        </td>
      `;
          gridBody.appendChild(tr);
          return;
        }

        if (isMedicoStaffRole) {
          const claimIdW = rec.claimId.length > 8 ? rec.claimId.slice(0, 8) + rec.claimId.slice(8) : rec.claimId;
          const patientW = rec.patientName.split(' ')[0] + (rec.patientName.includes(' ') ? ' ' + rec.patientName.slice(rec.patientName.indexOf(' ') + 1) : '');
          const policyW = policyNum.length > 8 ? policyNum.slice(0, 8) + policyNum.slice(8) : policyNum;
          tr.innerHTML = `
        <td class="strong mono">${claimIdW}</td>
        <td class="strong">${patientW}</td>
        <td class="mono">${policyW}</td>
        <td><span class="priority-badge ${priorityClass(rec.priority)}">${rec.priority}</span></td>
        <td>${rec.claimType}</td>
        <td>${fmtDate(rec.createdDate)}</td>
        <td class="mono">${fmtCurrency(rec.claimAmount)}</td>
        <td><span class="status-badge ${medicoStatusClass(rec.medicoStatus)}">${rec.medicoStatus}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-primary btn-sm" type="button" data-action="process-claim" data-id="${rec.inwardId}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6M9 16h6M9 8h2"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Process Claim
            </button>
          </div>
        </td>
      `;
          gridBody.appendChild(tr);
          return;
        }

        const inwardIdWrapped = rec.inwardId.length > 8 ? rec.inwardId.slice(0, 8) + rec.inwardId.slice(8) : rec.inwardId;
        const policyWrapped = policyNum.length > 8 ? policyNum.slice(0, 8) + policyNum.slice(8) : policyNum;
        const nameParts = rec.patientName.split(' ');
        const patientWrapped = nameParts.length > 1 ? nameParts[0] + ' ' + nameParts.slice(1).join(' ') : rec.patientName;
        const dummyClaimNums = ['CLM/20260610/00042', 'CLM/20260520/00031', '', 'CLM/20260415/00007', '', 'CLM/20260501/00018', '', ''];
        const claimNumVal = dummyClaimNums[parseInt(rec.inwardId.replace(/\D/g, '').slice(-1) || '0') % dummyClaimNums.length] || '';
        const rowStatus = ieRowStatus(rec);
        const rowStatusClass = { Pending: 'st-pending', Inactive: 'st-inactive', Error: 'st-error' }[rowStatus] || 'st-pending';
        if (rec.status === "Inactive" || rec.status === "Hold" || rec.status === "Withdrawn") tr.classList.add("inactive-row");
        tr.innerHTML = `
      <td class="strong mono">${inwardIdWrapped}</td>
      <td class="mono">${rec.barcode}</td>
      <td>${rec.source}</td>
      <td class="mono">${claimNumVal ? `<span class="mono">${claimNumVal}</span>` : '<span style="color:var(--muted);">—</span>'}</td>
      <td class="strong">${patientWrapped}</td>
      <td>${fmtDate(rec.receivedDate)}</td>
      <td class="mono">${policyWrapped}</td>
      <td><span class="status-badge ${rowStatusClass}">${statusDisplayLabel(rowStatus)}</span></td>
      <td class="assign-col">
        <button class="assign-chip ${rec.assignedUser ? '' : 'unassigned'}" type="button" data-action="assign" data-id="${rec.inwardId}">
          ${rec.assignedUser
            ? `<span class="assign-avatar">${initials(rec.assignedUser)}</span><span>${rec.assignedUser}</span>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg><span>Assign</span>`
          }
        </button>
      </td>
      <td>
        <div class="row-actions">
          ${currentRole === "Inward Entry - Document Upload"
            ? ``
            : `<button class="icon-btn" title="Edit" data-action="edit" data-id="${rec.inwardId}" ${rec.status === "Inactive" ? "disabled" : ""}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
               </button>
               <button class="icon-btn" title="More actions" data-action="row-menu" data-id="${rec.inwardId}" aria-haspopup="menu" aria-expanded="false">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
               </button>`
          }
        </div>
      </td>
    `;
        gridBody.appendChild(tr);
      });

      resultCount.textContent = `${total} result${total === 1 ? "" : "s"}`;

      pager.innerHTML = "";
      const prev = document.createElement("button");
      prev.textContent = "\u2039"; prev.disabled = listState.page <= 1;
      prev.addEventListener("click", () => { listState.page--; renderTable(); });
      pager.appendChild(prev);

      for (let p = 1; p <= pageCount; p++) {
        const b = document.createElement("button");
        b.textContent = p;
        if (p === listState.page) b.classList.add("active");
        b.addEventListener("click", () => { listState.page = p; renderTable(); });
        pager.appendChild(b);
      }

      const next = document.createElement("button");
      next.textContent = "\u203a"; next.disabled = listState.page >= pageCount;
      next.addEventListener("click", () => { listState.page++; renderTable(); });
      pager.appendChild(next);

      document.querySelectorAll("th.sortable").forEach(th => {
        th.classList.toggle("sort-active", th.dataset.sort === listState.sortCol);
        const arrow = th.querySelector(".sort-arrow");
        arrow.innerHTML = (th.dataset.sort === listState.sortCol && listState.sortDir === "asc") ? "&#9650;" : "&#9660;";
      });
    }

    /* ---------------- Search ---------------- */
    listSearch.addEventListener("input", () => {
      listState.search = listSearch.value;
      listState.page = 1;
      renderTable();
    });

    /* ---------------- Sort ---------------- */
    /* Sortable headers are rebound on every renderTable() call via bindSortableHeaders(),
       since the header row content now changes per role. */

    /* ---------------- Page size ---------------- */
    pageSizeSelect.addEventListener("change", () => {
      listState.pageSize = Number(pageSizeSelect.value);
      listState.page = 1;
      renderTable();
    });

    /* ---------------- Sidebar filters ---------------- */
    document.getElementById("applyFiltersBtn").addEventListener("click", () => {
      const cf = document.getElementById("createdFrom").value;
      const ct = document.getElementById("createdTo").value;
      const rf = document.getElementById("receivedFrom").value;
      const rt = document.getElementById("receivedTo").value;
      const uf = document.getElementById("updatedFrom").value;
      const ut = document.getElementById("updatedTo").value;

      const createdErr = document.getElementById("createdDateErr");
      const receivedErr = document.getElementById("receivedDateErr");
      const updatedErr = document.getElementById("updatedDateErr");
      let hasErr = false;

      if (cf && ct && new Date(cf) > new Date(ct)) { createdErr.classList.add("show"); hasErr = true; }
      else { createdErr.classList.remove("show"); }

      if (rf && rt && new Date(rf) > new Date(rt)) { receivedErr.classList.add("show"); hasErr = true; }
      else { receivedErr.classList.remove("show"); }

      if (uf && ut && new Date(uf) > new Date(ut)) { updatedErr.classList.add("show"); hasErr = true; }
      else { updatedErr.classList.remove("show"); }

      if (hasErr) return;

      listState.status = [...document.querySelectorAll(".status-chk")].filter(c => c.checked).map(c => c.value);
      listState.createdFrom = cf; listState.createdTo = ct;
      listState.receivedFrom = rf; listState.receivedTo = rt;
      listState.updatedFrom = uf; listState.updatedTo = ut;
      listState.barcode = document.getElementById("filterBarcode").value;
      listState.policyNumber = document.getElementById("filterPolicyNumber").value;
      listState.source = document.getElementById("filterSource").value;
      listState.emailStatus = document.getElementById("filterEmailStatus").value;
      const assignRadio = document.querySelector(".assign-radio:checked");
      listState.assignFilter = assignRadio ? assignRadio.value : "all";
      listState.page = 1;
      renderTable();
      updateFiltersBadge();
      closeFiltersPopover();
    });

    document.getElementById("clearFiltersBtn").addEventListener("click", clearAllFilters);
    document.getElementById("emptyClearBtn").addEventListener("click", clearAllFilters);
    document.getElementById("listResetBtn").addEventListener("click", clearAllFilters);

    /* ---------------- Filters right panel (main section) ---------------- */
    const filtersToggleBtn = document.getElementById("filtersToggleBtn");
    const filtersPopover = document.getElementById("filtersPopover");
    const filtersPopoverClose = document.getElementById("filtersPopoverClose");
    const filtersTriggerWrap = document.getElementById("filtersTriggerWrap");
    const filtersPanelOverlay = document.getElementById("filtersPanelOverlay");

    function openFiltersPopover() {
      filtersPopover.classList.remove("hidden");
      if (filtersPanelOverlay) filtersPanelOverlay.classList.remove("hidden");
      filtersToggleBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function closeFiltersPopover() {
      filtersPopover.classList.add("hidden");
      if (filtersPanelOverlay) filtersPanelOverlay.classList.add("hidden");
      filtersToggleBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    filtersToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (filtersPopover.classList.contains("hidden")) openFiltersPopover();
      else closeFiltersPopover();
    });
    filtersPopoverClose.addEventListener("click", closeFiltersPopover);
    if (filtersPanelOverlay) {
      filtersPanelOverlay.addEventListener("click", closeFiltersPopover);
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeFiltersPopover();
    });
    updateFiltersBadge();

    function updateFiltersBadge() {
      const badge = document.getElementById("filtersBadge");
      const resetBtn = document.getElementById("listResetBtn");
      let count = 0;
      if (listState.status.length < 3) count++;
      if (listState.createdFrom || listState.createdTo) count++;
      if (listState.receivedFrom || listState.receivedTo) count++;
      if (listState.updatedFrom || listState.updatedTo) count++;
      if (listState.barcode.trim()) count++;
      if (listState.policyNumber.trim()) count++;
      if (listState.source) count++;
      if (listState.emailStatus) count++;
      if (listState.assignFilter !== "all") count++;
      badge.textContent = count;
      badge.classList.toggle("hidden", count === 0);
      resetBtn.classList.toggle("hidden", count === 0);
    }

    function clearAllFilters() {
      document.querySelectorAll(".status-chk").forEach(c => c.checked = true);
      document.getElementById("createdFrom").value = "";
      document.getElementById("createdTo").value = "";
      document.getElementById("receivedFrom").value = "";
      document.getElementById("receivedTo").value = "";
      document.getElementById("updatedFrom").value = "";
      document.getElementById("updatedTo").value = "";
      document.getElementById("filterBarcode").value = "";
      document.getElementById("filterPolicyNumber").value = "";
      document.getElementById("filterSource").value = "";
      refreshSearchableSelectLabel("filterSource");
      document.getElementById("filterEmailStatus").value = "";
      refreshSearchableSelectLabel("filterEmailStatus");
      document.querySelectorAll(".assign-radio").forEach(r => r.checked = (r.value === "all"));
      document.getElementById("createdDateErr").classList.remove("show");
      document.getElementById("receivedDateErr").classList.remove("show");
      document.getElementById("updatedDateErr").classList.remove("show");
      listSearch.value = "";
      listState = {
        ...listState, search: "", status: ["Active", "Inactive", "Pending - Claim Intimation"],
        createdFrom: "", createdTo: "", receivedFrom: "", receivedTo: "",
        updatedFrom: "", updatedTo: "", barcode: "", policyNumber: "",
        source: "", emailStatus: "", assignFilter: "all", page: 1
      };
      renderTable();
      updateFiltersBadge();
      // Re-sync filterSource/filterEmailStatus's searchable-select proxy
      // labels after the .value = "" writes above.
      refreshAllSearchableSelects();
    }

    /* ---------------- Row actions: Edit / Row Status Menu (Hold / Deactivate / Activate / Withdraw) ---------------- */

    // Maps each row-menu action to the rec.status value it writes and the confirm-modal copy it shows.
    // Mirrors the old binary inactivate/reactivate pattern, extended to four possible transitions.
    const ROW_STATUS_ACTIONS = {
      hold: { nextStatus: "Hold", title: "Place this entry on hold?", sub: id => `${id} will be marked Hold and paused from normal processing.`, warnIcon: true },
      deactivate: { nextStatus: "Inactive", title: "Deactivate this entry?", sub: id => `${id} will no longer appear as an active record.`, warnIcon: true },
      activate: { nextStatus: "Active", title: "Activate this entry?", sub: id => `${id} will be marked Active again.`, warnIcon: false },
      withdraw: { nextStatus: "Withdrawn", title: "Withdraw this entry?", sub: id => `${id} will be marked Withdrawn.`, warnIcon: true }
    };

    // Which row-menu actions are offered for a given current rec.status — mirrors the old
    // `rec.status === "Inactive" ? <Reactivate> : <Inactivate>` binary, extended to four statuses.
    function availableRowStatusActions(status) {
      switch (status) {
        case "Inactive": return ["activate"];
        case "Hold": return ["activate", "deactivate", "withdraw"];
        case "Withdrawn": return ["activate"];
        default: return ["hold", "deactivate", "withdraw"]; // "Active" and any other/legacy value
      }
    }

    const ROW_MENU_ITEM_LABELS = { hold: "Hold", deactivate: "Deactivate", activate: "Activate", withdraw: "Withdraw" };
    const ROW_MENU_ITEM_ICONS = {
      hold: `<path d="M8 4v16M16 4v16"/>`,
      deactivate: `<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>`,
      activate: `<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>`,
      withdraw: `<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>`
    };
    const ROW_MENU_ITEM_CLASS = { hold: "", deactivate: "danger", activate: "success", withdraw: "danger" };

    const rowMenu = document.getElementById("rowMenu");

    function closeRowMenu() {
      rowMenu.classList.add("hidden");
      if (rowMenuTargetId) {
        const trigger = gridBody.querySelector(`button[data-action="row-menu"][data-id="${CSS.escape(rowMenuTargetId)}"]`);
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
      rowMenuTargetId = null;
    }

    function openRowMenu(trigger, rec) {
      rowMenuTargetId = rec.inwardId;
      rowMenu.innerHTML = "";
      availableRowStatusActions(rec.status).forEach(action => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "row-menu-item" + (ROW_MENU_ITEM_CLASS[action] ? " " + ROW_MENU_ITEM_CLASS[action] : "");
        item.setAttribute("role", "menuitem");
        item.dataset.action = action;
        item.dataset.id = rec.inwardId;
        item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">${ROW_MENU_ITEM_ICONS[action]}</svg><span>${ROW_MENU_ITEM_LABELS[action]}</span>`;
        rowMenu.appendChild(item);
      });

      // Position as a fixed-position "portal" menu, same technique as .gs-dropdown__menu —
      // computed from the trigger's rect so it escapes .table-scroll's overflow-x clipping.
      const rect = trigger.getBoundingClientRect();
      rowMenu.classList.remove("hidden");
      const menuRect = rowMenu.getBoundingClientRect();
      let left = rect.right - menuRect.width;
      if (left < 8) left = 8;
      let top = rect.bottom + 6;
      if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 6;
      rowMenu.style.top = top + "px";
      rowMenu.style.left = left + "px";
      trigger.setAttribute("aria-expanded", "true");
    }

    rowMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".row-menu-item");
      if (!item) return;
      const action = item.dataset.action;
      const id = item.dataset.id;
      closeRowMenu();

      const cfg = ROW_STATUS_ACTIONS[action];
      if (!cfg) return;
      confirmAction = { type: action, id };
      const confirmTitle = document.getElementById("confirmTitle");
      const confirmSub = document.getElementById("confirmSub");
      const confirmIcon = document.querySelector("#confirmModal .modal-icon");
      confirmTitle.textContent = cfg.title;
      confirmSub.textContent = cfg.sub(id);
      confirmIcon.classList.toggle("warn", cfg.warnIcon);
      document.getElementById("confirmModal").classList.add("show");
    });

    document.addEventListener("click", (e) => {
      if (!rowMenu.classList.contains("hidden") && !rowMenu.contains(e.target) && !e.target.closest('button[data-action="row-menu"]')) {
        closeRowMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !rowMenu.classList.contains("hidden")) {
        closeRowMenu();
      }
    });

    gridBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) {
        const row = e.target.closest(".claim-row-clickable");
        if (row) {
          const rec = entries.find(x => x.inwardId === row.dataset.claimRowId);
          if (rec) {
            if (ciSourceForRec(rec) === "Physical Document") {
              openClaimIntimationFromPhysicalDoc(rec);
            } else {
              openClaimIntimationFlow(rec);
            }
          }
        }
        return;
      }
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const rec = entries.find(x => x.inwardId === id);
      if (!rec) return;

      if (action === "edit") {
        prefillFormForEdit(rec);
        switchToCreateView();
        return;
      }

      if (action === "assign") {
        openAssignModal(rec);
        return;
      }

      if (action === "upload-docs") {
        openUploadFlow(rec);
        return;
      }

      if (action === "admit-claim") {
        if (ciSourceForRec(rec) === "Physical Document") {
          openClaimIntimationFromPhysicalDoc(rec);
        } else {
          openClaimIntimationFlow(rec);
        }
        return;
      }

      if (action === "process-claim") {
        window.location.href = "./process-claim.html?id=" + encodeURIComponent(rec.inwardId) + "&role=" + encodeURIComponent(getCurrentRole());
        return;
      }

      if (action === "row-menu") {
        if (rowMenuTargetId === rec.inwardId) {
          closeRowMenu();
        } else {
          openRowMenu(btn, rec);
        }
        return;
      }
    });

    document.getElementById("confirmCancelBtn").addEventListener("click", () => {
      confirmAction = null;
      document.getElementById("confirmModal").classList.remove("show");
    });

    document.getElementById("confirmOkBtn").addEventListener("click", () => {
      if (!confirmAction) return;
      const rec = entries.find(x => x.inwardId === confirmAction.id);
      const cfg = ROW_STATUS_ACTIONS[confirmAction.type];
      if (rec && cfg) {
        rec.status = cfg.nextStatus;
        rec.updatedDate = new Date().toISOString();
      }
      confirmAction = null;
      document.getElementById("confirmModal").classList.remove("show");
      renderTable();
    });

    /* ---------------- Assign User modal (modern card style) ---------------- */
    let assignSelectedUser = null;

    function openAssignModal(rec) {
      assignTargetId = rec.inwardId;
      assignSelectedUser = rec.assignedUser || null;
      document.getElementById("assignSub").textContent = `Select a user to assign ${rec.inwardId} to.`;
      document.getElementById("assignReasonInput").value = "";
      document.getElementById("assignReasonWrap").classList.remove("has-error");
      renderAssignUserList();
      document.getElementById("assignModal").classList.add("show");
    }

    const ASSIGN_USERS_DATA = [
      { name: 'Priya Mehta', active: 12 }, { name: 'Arjun Sharma', active: 7 }, { name: 'Sneha Patel', active: 19 }, { name: 'Ravi Kumar', active: 4 },
      { name: 'Neha Joshi', active: 9 }, { name: 'Amit Verma', active: 15 }, { name: 'Kavya Nair', active: 3 }, { name: 'Deepak Singh', active: 11 }
    ];

    function renderAssignUserList(filter) {
      const container = document.getElementById('assignUserCards');
      const filtered = filter ? ASSIGN_USERS_DATA.filter(u => u.name.toLowerCase().includes(filter.toLowerCase())) : ASSIGN_USERS_DATA;
      container.innerHTML = filtered.map(u => `
        <div class="assign-card ${assignSelectedUser === u.name ? 'selected' : ''}" data-user="${u.name}">
          <input type="radio" name="assignUser" value="${u.name}" ${assignSelectedUser === u.name ? 'checked' : ''}>
          <span class="assign-card-avatar">${initials(u.name)}</span>
          <div class="assign-card-info">
            <span class="assign-card-name">${u.name}</span>
            <span class="assign-card-email">${u.active} active application${u.active !== 1 ? 's' : ''}</span>
          </div>
          <span class="assign-card-badge">${u.active}</span>
        </div>
      `).join('');
      container.querySelectorAll('.assign-card').forEach(card => {
        card.addEventListener('click', () => {
          assignSelectedUser = card.dataset.user;
          renderAssignUserList(document.getElementById('assignSearchInput').value);
        });
      });
    }

    document.getElementById('assignSearchInput').addEventListener('input', function () {
      renderAssignUserList(this.value);
    });
    document.getElementById('assignCloseX').addEventListener('click', () => {
      assignTargetId = null;
      document.getElementById('assignReasonInput').value = "";
      document.getElementById('assignReasonWrap').classList.remove("has-error");
      document.getElementById('assignModal').classList.remove('show');
    });

    document.getElementById("assignCancelBtn").addEventListener("click", () => {
      assignTargetId = null;
      document.getElementById('assignReasonInput').value = "";
      document.getElementById('assignReasonWrap').classList.remove("has-error");
      document.getElementById("assignModal").classList.remove("show");
    });

    document.getElementById("assignSubmitBtn").addEventListener("click", () => {
      if (!assignTargetId || !assignSelectedUser) return;
      const reason = document.getElementById('assignReasonInput').value.trim();
      if (!reason) {
        document.getElementById('assignReasonWrap').classList.add("has-error");
        return;
      }
      document.getElementById('assignReasonWrap').classList.remove("has-error");
      const rec = entries.find(x => x.inwardId === assignTargetId);
      if (rec) {
        rec.assignedUser = assignSelectedUser;
        rec.assignmentReason = reason;
        rec.updatedDate = new Date().toISOString();
      }
      assignTargetId = null;
      document.getElementById('assignReasonInput').value = "";
      document.getElementById("assignModal").classList.remove("show");
      renderTable();
    });

    /* ---------------- Create New Inward Entry (top-right of grid) ---------------- */
    document.getElementById("createNewBtn").addEventListener("click", () => {
      resetForm();
      switchToCreateView();
    });

    /* =====================================================================
       UPLOAD DOCUMENTS FLOW (reuses the Inward Entry screen shell)
    ===================================================================== */
    const ALLOWED_DOC_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "tiff", "tif"];

    let uploadTargetId = null;
    let uploadClaimType = null;
    let uploadedDocs = {};

    function openUploadFlow(rec) {
      uploadTargetId = rec.inwardId;
      uploadClaimType = null;
      uploadedDocs = {};

      document.getElementById("uploadDraftRef").textContent = rec.inwardId;
      document.getElementById("uploadStepSub").textContent = `Confirm the claim type, review the package details, then upload scanned documents for ${rec.inwardId}.`;

      document.getElementById("ro-inwardId").textContent = rec.inwardId;
      document.getElementById("ro-barcode").textContent = rec.barcode;
      document.getElementById("ro-source").textContent = rec.source;
      document.getElementById("ro-patient").textContent = rec.patientName;
      document.getElementById("ro-policy").textContent = rec.policyId || rec.surakshaId || "-";
      document.getElementById("ro-received").textContent = fmtDate(rec.receivedDate);

      document.getElementById("ro-policyid").textContent = rec.policyId || "-";
      document.getElementById("ro-suraksha").textContent = rec.surakshaId || "-";
      document.getElementById("ro-proposer").textContent = rec.proposerName || "-";
      document.getElementById("ro-contact").textContent = rec.contactNumber || "-";
      document.getElementById("ro-hospital").textContent = rec.hospitalName || "-";

      document.querySelectorAll('input[name="claimType"]').forEach(r => r.checked = false);
      document.querySelectorAll(".claim-type-option").forEach(o => o.classList.remove("selected"));
      document.getElementById("card-barcodeinfo").classList.add("hidden");
      document.getElementById("card-policyhospital").classList.add("hidden");
      document.getElementById("card-docupload").classList.add("hidden");
      document.getElementById("card-eu-search").classList.add("hidden");
      document.getElementById("card-eu-grid").classList.add("hidden");
      document.getElementById("card-eu-selected").classList.add("hidden");
      document.getElementById("card-upload-remarks").classList.add("hidden");
      document.getElementById("uploadValidationSummary").classList.remove("show");

      renderUploadRemarksGrid(rec);
      renderDocTiles();
      switchToUploadView();
    }

    document.querySelectorAll(".claim-type-option").forEach(opt => {
      opt.addEventListener("click", () => {
        uploadClaimType = opt.dataset.value;
        document.querySelectorAll(".claim-type-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        opt.querySelector('input[type="radio"]').checked = true;

        document.getElementById("card-barcodeinfo").classList.remove("hidden");
        document.getElementById("card-upload-remarks").classList.remove("hidden");

        if (uploadClaimType === "New Claim") {
          document.getElementById("card-policyhospital").classList.remove("hidden");
          document.getElementById("card-docupload").classList.remove("hidden");
          document.getElementById("card-eu-search").classList.add("hidden");
          document.getElementById("card-eu-grid").classList.add("hidden");
          document.getElementById("card-eu-selected").classList.add("hidden");
        } else {
          document.getElementById("card-policyhospital").classList.add("hidden");
          document.getElementById("card-docupload").classList.add("hidden");
          resetExistingClaimSearch();
          document.getElementById("card-eu-search").classList.remove("hidden");
        }
      });
    });

    /* ---------------- Existing Claim: Policy Search -> Grid -> Select ---------------- */
    function resetExistingClaimSearch() {
      document.querySelectorAll(".eu-search-field").forEach(el => el.value = "");
      document.getElementById("euSearchBtn").disabled = true;
      document.getElementById("card-eu-grid").classList.add("hidden");
      document.getElementById("card-eu-selected").classList.add("hidden");
      document.getElementById("card-docupload").classList.add("hidden");
      document.getElementById("euGridEmptyState").classList.add("hidden");
    }

    document.querySelectorAll(".eu-search-field").forEach(el => {
      el.addEventListener("input", () => {
        const anyFilled = [...document.querySelectorAll(".eu-search-field")].some(f => f.value.trim());
        document.getElementById("euSearchBtn").disabled = !anyFilled;
      });
    });

    document.getElementById("euSearchBtn").addEventListener("click", () => {
      // Demo search: any claim with a Claim ID is treated as a match (mirrors Claim Intimation's mock search)
      const results = entries.filter(e => e.claimId && e.inwardId !== uploadTargetId);

      const body = document.getElementById("euGridBody");
      const empty = document.getElementById("euGridEmptyState");
      document.getElementById("card-eu-grid").classList.remove("hidden");
      document.getElementById("card-eu-selected").classList.add("hidden");
      document.getElementById("card-docupload").classList.add("hidden");

      if (results.length === 0) {
        body.innerHTML = "";
        empty.classList.remove("hidden");
        return;
      }
      empty.classList.add("hidden");

      body.innerHTML = results.map(r => `
    <tr>
      <td class="strong mono">${r.claimId}</td>
      <td class="strong">${r.patientName}</td>
      <td class="mono">${r.policyId || r.surakshaId || "-"}</td>
      <td>${fmtDate(r.createdDate)}</td>
      <td><span class="status-badge ${claimStatusClass(r.claimStatus)}">${r.claimStatus}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" type="button" data-action="select-eu-claim" data-id="${r.inwardId}">Select</button>
      </td>
    </tr>
  `).join("");

      body.querySelectorAll('button[data-action="select-eu-claim"]').forEach(btn => {
        btn.addEventListener("click", () => selectExistingClaim(btn.dataset.id));
      });
    });

    function selectExistingClaim(inwardId) {
      const rec = entries.find(x => x.inwardId === inwardId);
      if (!rec) return;

      document.getElementById("euSelectedClaimId").textContent = rec.claimId;
      const data = buildPolicyMockData(rec);
      renderReadonlyGrid("euPolicyGrid", data.policy);

      document.getElementById("card-eu-selected").classList.remove("hidden");

      // Documents uploaded now attach to this existing claim, not the originally scanned package
      uploadTargetId = inwardId;
      uploadedDocs = {};
      renderDocTiles();
      renderUploadRemarksGrid(rec);
      document.getElementById("card-docupload").classList.remove("hidden");
      document.getElementById("card-eu-selected").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ---------------- User Remarks (view-only, aggregated across all stages) ---------------- */
    const UPLOAD_REMARKS_STAGE_LABELS = { 1: "Policy & Member Details", 2: "Hospital Details", 3: "Case Details", 4: "Bill Details", 5: "Settlement" };

    function renderUploadRemarksGrid(rec) {
      const trail = document.getElementById("uploadRemarksTrail");
      const emptyMsg = document.getElementById("uploadRemarksEmpty");
      const stageRemarks = rec.stageRemarks || {};

      let allRemarks = [];
      for (let s = 1; s <= 5; s++) {
        (stageRemarks[s] || []).forEach(r => allRemarks.push({ ...r, stage: UPLOAD_REMARKS_STAGE_LABELS[s] }));
      }

      if (allRemarks.length === 0) {
        trail.innerHTML = "";
        emptyMsg.classList.remove("hidden");
        return;
      }
      emptyMsg.classList.add("hidden");

      trail.innerHTML = allRemarks.map(r => `
    <div class="remark-trail-item">
      <div class="remark-trail-avatar">${remarkInitials(r.name)}</div>
      <div class="remark-trail-body">
        <div class="remark-trail-head">
          <span class="remark-trail-role">${r.role}</span>
          <span class="remark-trail-name">${r.name}</span>
          <span class="remark-trail-time">${r.datetime}</span>
        </div>
        <div class="remark-trail-text ${r.text ? '' : 'empty'}">${r.text || 'No remark provided'}</div>
      </div>
    </div>
  `).join("");
    }


    function renderDocTiles() {
      const list = document.getElementById("docTileList");
      list.innerHTML = DOCUMENT_CATEGORIES.map(cat => {
        const doc = uploadedDocs[cat];
        if (doc) {
          return `
        <div class="doc-tile filled" data-cat="${cat}">
          <div class="dt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg></div>
          <div class="doc-tile-body">
            <div class="dt-category">${cat}</div>
            <div class="dt-meta">${doc.fileName} - ${doc.fileSize}</div>
          </div>
          <div class="doc-tile-actions">
            <button class="btn btn-outline btn-sm" type="button" data-action="view-doc" data-cat="${cat}">View</button>
            <button class="btn btn-outline btn-sm" type="button" data-action="reupload-doc" data-cat="${cat}">Re-upload</button>
            <button class="btn btn-outline btn-sm" type="button" data-action="delete-doc" data-cat="${cat}" style="color:var(--danger);">Delete</button>
          </div>
        </div>
      `;
        }
        return `
      <div class="doc-tile" data-cat="${cat}">
        <div class="dt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.5V7a4 4 0 0 0-8 0v9a2.5 2.5 0 0 0 5 0V9"/></svg></div>
        <div class="doc-tile-body">
          <div class="dt-category">${cat}</div>
          <div class="dt-meta">No document uploaded</div>
          <div class="dt-error-text">This file type isn't supported. Upload a PDF, JPEG, PNG or TIFF file.</div>
        </div>
        <div class="doc-tile-actions">
          <label class="btn btn-primary btn-sm" style="cursor:pointer;margin:0;">
            Upload
            <input type="file" style="display:none;" data-cat="${cat}" class="doc-file-input" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif">
          </label>
        </div>
      </div>
    `;
      }).join("");

      list.querySelectorAll(".doc-file-input").forEach(input => {
        input.addEventListener("change", (e) => handleDocFileSelect(e.target.files[0], input.dataset.cat));
      });
    }

    function handleDocFileSelect(file, category) {
      if (!file) return;
      const tile = document.querySelector(`.doc-tile[data-cat="${CSS.escape(category)}"]`);
      const ext = file.name.split(".").pop().toLowerCase();
      if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
        if (tile) tile.classList.add("error");
        return;
      }
      uploadedDocs[category] = { fileName: file.name, fileSize: formatFileSize(file.size), file: file };
      renderDocTiles();
    }

    function openDocPreview(category, docsSource) {
      const doc = (docsSource || uploadedDocs)[category];
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

    document.getElementById("docTileList").addEventListener("click", (e) => {
      const viewBtn = e.target.closest('button[data-action="view-doc"]');
      const delBtn = e.target.closest('button[data-action="delete-doc"]');
      const reBtn = e.target.closest('button[data-action="reupload-doc"]');

      if (viewBtn) {
        openDocPreview(viewBtn.dataset.cat);
        return;
      }

      if (delBtn) {
        const cat = delBtn.dataset.cat;
        if (confirm(`Delete the document uploaded for ${cat}?`)) {
          delete uploadedDocs[cat];
          renderDocTiles();
        }
        return;
      }

      if (reBtn) {
        const cat = reBtn.dataset.cat;
        const tempInput = document.createElement("input");
        tempInput.type = "file";
        tempInput.accept = ".pdf,.jpg,.jpeg,.png,.tiff,.tif";
        tempInput.addEventListener("change", (ev) => handleDocFileSelect(ev.target.files[0], cat));
        tempInput.click();
      }
    });

    document.getElementById("backToListFromUploadBtn").addEventListener("click", () => {
      switchToListView();
    });

    document.getElementById("uploadCancelBtn").addEventListener("click", () => {
      if (confirm("Discard this upload progress and return to Inward Entries?")) {
        switchToListView();
      }
    });

    document.getElementById("uploadSubmitBtn").addEventListener("click", () => {
      const errors = [];
      if (!uploadClaimType) { errors.push("Select a Claim Type to continue."); }
      if (uploadClaimType === "New Claim" && Object.keys(uploadedDocs).length === 0) {
        errors.push("Upload at least one document before submitting.");
      }

      const summary = document.getElementById("uploadValidationSummary");
      const list = document.getElementById("uploadValidationList");
      if (errors.length) {
        list.innerHTML = errors.map(e => `<li>${e}</li>`).join("");
        summary.classList.add("show");
        summary.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      summary.classList.remove("show");

      const rec = entries.find(x => x.inwardId === uploadTargetId);
      if (rec) {
        rec.updatedDate = new Date().toISOString();
        const taggedDocs = {};
        Object.entries(uploadedDocs).forEach(([cat, doc]) => { taggedDocs[cat] = { ...doc, uploadedBy: "previous" }; });
        rec.documents = { ...(rec.documents || {}), ...taggedDocs };
      }

      document.getElementById("successTitle").textContent = "Documents Uploaded";
      document.getElementById("successSub").textContent = `${Object.keys(uploadedDocs).length} document(s) submitted for ${uploadTargetId}.`;
      document.getElementById("modalInwardNo").textContent = uploadTargetId;
      showSuccessModal({ label: "View in Inward Entries", onView: switchToListView });
    });

    /* =====================================================================
       CLAIM INTIMATION FLOW (Intimate Claim - reuses the Inward Entry screen shell)
    ===================================================================== */
    let claimTargetId = null;
    let lastCaregiver = null;

    /* Physical Document Policy Card (Claim Intimation) — populates every row directly from the
       same rec / buildPolicyMockData(rec) already used elsewhere in this flow (no new data model).
       Written as its own function rather than the generic populatePolicyCard() label-matcher
       because several sections here have two stacked value rows, and that matcher only ever
       fills the first row per section. Policy Duration (Start/End Date) has no source field in
       buildPolicyMockData() — those two rows intentionally stay at "—". */
    function populatePhysicalDocPolicyCard(rec, data) {
      var find = function (label) {
        var pair = data.policy.find(function (p) { return p[0] === label; });
        return (pair && pair[1] && pair[1] !== "-") ? pair[1] : null;
      };
      var setText = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = (val === undefined || val === null || val === "") ? "—" : val;
      };

      setText("pscAvatar", initials(rec.patientName));
      setText("pscPatientName", rec.patientName);
      var relationship = find("Relationship");
      var ageDob = find("Age / DOB");
      var age = ageDob ? ageDob.split("/")[0].trim() : null;
      var gender = find("Gender");
      var metaParts = [];
      if (relationship) metaParts.push(relationship);
      if (age && gender) metaParts.push(age + "Y (" + gender + ")");
      setText("pscPatientMeta", metaParts.join(" \u2022 "));

      setText("pscProductName", find("Product Name"));
      setText("pscPolicyNumber", find("Policy Number"));

      setText("pscProposerName", find("Proposer Name"));
      setText("pscProposerPhone", (data.editable && data.editable.contactNo) || null);

      setText("pscHegicNo", find("HEGIC Card No."));
      setText("pscPehchanNo", find("Pehchan Number"));

      document.getElementById("policySummaryCardClaim").classList.remove("hidden");
    }

    function buildPolicyMockData(rec) {
      const policyNum = rec.policyId || rec.surakshaId || "2856208465622800";
      return {
        policy: [
          ["HEGIC Card No.", "2026610060895563"],
          ["Policy Number", policyNum],
          ["Product Name", "Optima Secure - Family"],
          ["Product Code", "5023"],
          ["Product Type", "Health Product"],
          ["Proposer Name", rec.proposerName || rec.patientName],
          ["Employee Name", rec.patientName],
          ["Employee Group", "Optima Secure"],
          ["Employee ID", "NA"],
          ["Patient Name", rec.patientName],
          ["Relationship", "Self"],
          ["Age / DOB", "42 / 24-02-1984"],
          ["Gender", "Male"],
          ["Aadhaar Card No. (Last 4 digits)", "-"],
          ["Patient ID", "-"],
          ["ABHA ID", "-"],
          ["Pehchan Number", "LN7R62PA68"],
          ["Email ID", "-"],
          ["Partner Reference ID", "-"],
        ],
        editable: {
          contactNo: rec.contactNumber || "",
          altContactNo: "",
          altEmail: "",
        },
        hospitalization: [
          ["Date of Admission", fmtDate(rec.receivedDate)],
          ["Expected Date of Discharge", "-"],
          ["Admission In-Time", "11:00"],
          ["Discharge Out-Time", "-"],
          ["Ailment as per Discharge Card", "-"],
          ["Approximate Claim Amount", "-"],
          ["Hospital Case Number", "-"],
          ["Home Health Care Applied", "No"],
          ["Hospital Name", rec.hospitalName || "-"],
          ["Hospital Address", "-"],
          ["Hospital State", "-"],
          ["Hospital City", "-"],
          ["Complaint on Admission", "-"],
          ["Barcode", rec.barcode],
        ],
      };
    }

    function renderReadonlyGrid(containerId, pairs) {
      // Rendered as disabled inputs (not .readonly-value divs) so read-only
      // fields share the same markup/look — and the same WCAG-audited
      // --disabled-bg/--disabled-text tokens — as every editable field on
      // the same card, consistent with the rest of the app.
      document.getElementById(containerId).innerHTML = pairs.map(([label, value]) => `
    <div class="field">
      <label>${label}</label>
      <input type="text" value="${(value || "-").toString().replace(/"/g, "&quot;")}" disabled>
    </div>
  `).join("");
    }

    /* =====================================================================
       POLICY SUMMARY CARD — generic label-based auto-mapping
       The top Policy Card stays hidden until a policy search succeeds. Its
       fields are populated by matching each .policy-section__label already
       present inside the card against the labels already rendered in the
       existing Policy Details sections (read from #card-claimpolicy /
       #card-claimhospitalization for Claim Intimation, and their Inward
       Entry equivalents). No field is hardcoded — any label added to those
       sections in future will automatically populate the card as long as
       the label text matches. Missing/unmatched labels are ignored, never
       thrown as errors.
    ===================================================================== */
    function normalizePolicyLabel(text) {
      return (text || "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function findPolicyDetailValue(labelText, sourceSelectors) {
      const target = normalizePolicyLabel(labelText);
      if (!target) return null;
      for (const sel of sourceSelectors) {
        const container = document.querySelector(sel);
        if (!container) continue;
        const labelEls = container.querySelectorAll("label, .policy-section__label");
        for (const lbl of labelEls) {
          if (normalizePolicyLabel(lbl.textContent) !== target) continue;
          const field = lbl.closest(".field") || lbl.parentElement;
          if (!field) continue;
          const valueEl = field.querySelector(".readonly-value, input, textarea");
          if (!valueEl) continue;
          const raw = "value" in valueEl ? valueEl.value : valueEl.textContent;
          const value = (raw || "").toString().trim();
          if (value && value !== "-" && value !== "—") return value;
        }
      }
      return null;
    }

    function populatePolicyCard(cardEl, sourceSelectors) {
      if (!cardEl) return;
      cardEl.querySelectorAll(".policy-section__label").forEach(labelEl => {
        const value = findPolicyDetailValue(labelEl.textContent, sourceSelectors);
        if (value == null) return; // no matching source label found — leave as-is, never error
        const section = labelEl.closest(".policy-section, .patient-section");
        if (!section) return;
        const valueEl = section.querySelector(".policy-section__value, .patient-name");
        if (valueEl) valueEl.textContent = value;
      });
    }

    function showPolicyCard(cardId, sourceSelectors) {
      const cardEl = document.getElementById(cardId);
      if (!cardEl) return;
      populatePolicyCard(cardEl, sourceSelectors);
      cardEl.classList.remove("hidden");
    }

    function hidePolicyCard(cardId) {
      const cardEl = document.getElementById(cardId);
      if (cardEl) cardEl.classList.add("hidden");
    }

    function slugify(label) {
      return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    function renderEditableGrid(containerId, pairs, idPrefix) {
      document.getElementById(containerId).innerHTML = pairs.map(([label, value]) => `
    <div class="field">
      <label>${label}</label>
      <input type="text" id="${idPrefix}-${slugify(label)}" value="${(value || "").toString().replace(/"/g, "&quot;")}">
    </div>
  `).join("");
    }

    /* Documents card (received + "Uploaded by You") was removed for Claim
       Intimation, Inward Entry New Claim and Inward Entry Existing Claim —
       these flows now show only the Document Upload card, same as Medico.
       Rebuilds the Document Upload card's file list from rec.documents —
       needed because re-opening the claim intimation flow for a record
       whose documents were already tagged/received on an earlier visit
       would otherwise show an empty panel despite the documents being
       safely saved on rec.documents. Mirrors process-claim.js's
       renderMedicoDocuments(rec) -> rehydrateMedUploadList(rec). */
    function renderClaimDocuments(rec) {
      ciActiveClaimDocs = null;
      if (ciUploadWidget) ciUploadWidget.rehydrate(rec ? rec.documents : null);
      if (ciDocHeaderControls) ciDocHeaderControls.renderCategoryOptions();
      if (ciChecklist) ciChecklist.render();
    }


    document.getElementById('ciExCancelBtn').addEventListener('click', () => {
      if (confirm('Discard progress and return to Inward Entries?')) switchToListView();
    });
    document.getElementById('ciExSaveBtn').addEventListener('click', () => {
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (rec) { rec.updatedDate = new Date().toISOString(); }
      showToast('success', 'Draft saved successfully');
    });
    document.getElementById('ciExSubmitBtn').addEventListener('click', () => {
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (rec) { rec.claimStatus = 'Completed'; rec.updatedDate = new Date().toISOString(); }
      document.getElementById('successTitle').textContent = 'Claim Intimation Submitted';
      document.getElementById('successSub').textContent = `${claimTargetId} has been marked Completed.`;
      document.getElementById('modalInwardNo').textContent = (rec && rec.claimId) ? rec.claimId : claimTargetId;
      showSuccessModal({ label: 'View in Claim List', onView: switchToListView, showClaimLabel: true });
    });
    // Same rich Stage/Role/Name/Date/Remarks table (with pagination) that
    // the Medico wizard's own Remarks cards use (see
    // shared/shared-components.js's renderCombinedRemarksTable /
    // process-claim.js's renderCombinedRemarksAllStages) — reused here so
    // Claim Intimation's Remarks card (every role that reaches it,
    // including Scan Tag/Scan Tag TL) matches that same trail style instead
    // of the plainer avatar-card list it used to show.
    const ciNewRemarksPageState = {};
    function renderCiNewRemarksTrail(rec) {
      renderCombinedRemarksTable(rec, {
        bodyId: 'ciNewUserRemarksBody',
        emptyId: 'ciNewUserRemarksEmpty',
        footerId: 'ciNewUserRemarksFooter',
        pagerId: 'ciNewUserRemarksPager',
        pageSizeSelectId: 'ciNewUserRemarksPageSize',
        resultCountId: 'ciNewUserRemarksResultCount',
        pageState: ciNewRemarksPageState,
        stageKeys: [1],
      });
    }

    document.getElementById('ciNewRemarksAddBtn').addEventListener('click', () => {
      const textarea = document.getElementById('ciNewRemarksInput');
      const text = textarea.value.trim();
      if (!text) return;
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (!rec) return;
      rec.stageRemarks = rec.stageRemarks || defaultStageRemarks();
      rec.stageRemarks[1] = rec.stageRemarks[1] || [];
      rec.stageRemarks[1].push({
        role: getCurrentRole(),
        name: 'You',
        datetime: formatRemarkTimestamp(new Date()),
        text,
      });
      textarea.value = '';
      renderCiNewRemarksTrail(rec);
    });

    const ciExRemarksPageState = {};
    function renderCiExRemarksTrail(rec) {
      renderCombinedRemarksTable(rec, {
        bodyId: 'ciExUserRemarksBody',
        emptyId: 'ciExUserRemarksEmpty',
        footerId: 'ciExUserRemarksFooter',
        pagerId: 'ciExUserRemarksPager',
        pageSizeSelectId: 'ciExUserRemarksPageSize',
        resultCountId: 'ciExUserRemarksResultCount',
        pageState: ciExRemarksPageState,
        stageKeys: [1],
      });
    }

    document.getElementById('ciExRemarksAddBtn').addEventListener('click', () => {
      const textarea = document.getElementById('ciExRemarksInput');
      const text = textarea.value.trim();
      if (!text) return;
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (!rec) return;
      rec.stageRemarks = rec.stageRemarks || defaultStageRemarks();
      rec.stageRemarks[1] = rec.stageRemarks[1] || [];
      rec.stageRemarks[1].push({
        role: getCurrentRole(),
        name: 'You',
        datetime: formatRemarkTimestamp(new Date()),
        text,
      });
      textarea.value = '';
      renderCiExRemarksTrail(rec);
      renderUploadRemarksGrid(rec);
    });

    function resetPolicySearchForm() {
      document.querySelectorAll(".policy-search-field").forEach(el => el.value = "");
    }

    function openClaimIntimationFlow(rec) {
      claimTargetId = rec.inwardId;

      document.getElementById("claimDraftRef").textContent = rec.inwardId;
      document.getElementById("claimValidationSummary").classList.remove("show");

      if (ciUploadWidget) ciUploadWidget.reset();
      if (ciDocHeaderControls) ciDocHeaderControls.renderCategoryOptions();
      if (ciChecklist) ciChecklist.render();

      document.getElementById("cgName").value = "";
      document.getElementById("cgMobile").value = "";
      document.getElementById("cgEmail").value = "";
      document.getElementById("cgAddress").value = "";
      document.getElementById("cgSource").value = ciSourceForRec(rec) === "Physical Document" ? "" : ciSourceForRec(rec);
      document.getElementById("cgSource").disabled = true;
      document.getElementById("cgSourceEmail").value = "";
      populateCiBarcodeSource(rec);
      document.querySelectorAll("#card-claimcaregiver .field").forEach(f => f.classList.remove("has-error"));

      // Show the policy search card directly; hide existing claim search path
      resetPolicySearchForm();
      const ciBarcodeField = document.getElementById('ci-barcode-id');
      if (ciBarcodeField) { ciBarcodeField.value = rec.barcode || rec.inwardId || ''; ciBarcodeField.disabled = true; }
      // "Click to view email" only applies to this one demo interaction —
      // its linked email thread is mocked against this specific barcode.
      const viewEmailBtn = document.getElementById('ciViewEmailThreadBtn');
      if (viewEmailBtn) viewEmailBtn.classList.toggle('hidden', rec.barcode !== 'PKG-0000299');
      document.getElementById('card-claimsearch').classList.remove('hidden');
      document.getElementById('card-ci-ex-search').classList.add('hidden');
      document.getElementById('card-ci-ex-grid').classList.add('hidden');
      ciSelectedPickerPolicy = null;
      ciActiveClaimDocs = null;
      ['card-claimpolicy', 'card-claimpolicy-picker', 'card-claimclaims-grid', 'card-claimhospitalization', 'card-claimcaregiver',
        'card-ci-checklist', 'card-claimuploadnew', 'card-claimdecision', 'card-upload-remarks', 'card-ci-ex-remarks',
        'card-ci-ex-decision', 'card-ci-new-remarks'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      // Every non-Physical-Document entry point keeps its existing layout —
      // the sticky Policy Card only ever appears for openClaimIntimationFromPhysicalDoc().
      hidePolicyCard('policySummaryCardClaim');

      switchToClaimView();
    }

    // Physical Document source row quick-flow: skip the policy search step,
    // prefill everything from the linked inward record, and land the user
    // directly on the Documents section with focus set there.
    function openClaimIntimationFromPhysicalDoc(rec) {
      claimTargetId = rec.inwardId;

      document.getElementById("claimDraftRef").textContent = rec.inwardId;
      document.getElementById("claimValidationSummary").classList.remove("show");

      if (ciUploadWidget) ciUploadWidget.reset();
      if (ciDocHeaderControls) ciDocHeaderControls.renderCategoryOptions();
      if (ciChecklist) ciChecklist.render();

      // Physical Document flow: prefill caregiver details from the inward record
      document.getElementById("cgName").value = rec.patientName || "";
      document.getElementById("cgMobile").value = rec.contactNumber || "";
      document.getElementById("cgEmail").value = "";
      document.getElementById("cgAddress").value = "";
      document.getElementById("cgSource").value = "Physical Document";
      document.getElementById("cgSource").disabled = true;
      document.getElementById("cgSourceEmail").value = "";
      populateCiBarcodeSource(rec);
      document.querySelectorAll("#card-claimcaregiver .field").forEach(f => f.classList.remove("has-error"));

      resetPolicySearchForm();
      document.getElementById("card-claimsearch").classList.add("hidden");
      document.getElementById("card-ci-ex-search").classList.add("hidden");
      document.getElementById("card-ci-ex-grid").classList.add("hidden");
      document.getElementById("card-claimpolicy-picker").classList.add("hidden");
      document.getElementById("card-claimclaims-grid").classList.add("hidden");
      ciSelectedPickerPolicy = null;
      ciActiveClaimDocs = null;

      const barcodeField = document.getElementById("ci-barcode-id");
      if (barcodeField) {
        barcodeField.value = rec.barcode || rec.inwardId || "";
        barcodeField.disabled = true;
      }

      const data = buildPolicyMockData(rec);
      renderReadonlyGrid("claimPolicyGrid", data.policy);
      document.getElementById("claimContactNo").value = data.editable.contactNo;
      document.getElementById("claimAltContactNo").value = data.editable.altContactNo;
      document.getElementById("claimAltEmail").value = data.editable.altEmail;
      (function(hosp) {
        const map = {
          "hosp-date-of-admission": hosp[0] && hosp[0][1],
          "hosp-expected-date-of-discharge": hosp[1] && hosp[1][1],
          "hosp-admission-in-time": hosp[2] && hosp[2][1],
          "hosp-discharge-out-time": hosp[3] && hosp[3][1],
          "hosp-ailment-as-per-discharge-card": hosp[4] && hosp[4][1],
          "hosp-approximate-claim-amount": hosp[5] && hosp[5][1],
          "hosp-hospital-case-number": hosp[6] && hosp[6][1],
          "hosp-complaint-on-admission": hosp[12] && hosp[12][1]
        };
        Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el && map[id] && map[id] !== "-") el.value = map[id]; });
        const ciHospSearch = document.getElementById("ciHospSearchInput");
        if (ciHospSearch && hosp[8] && hosp[8][1] && hosp[8][1] !== "-") ciHospSearch.value = hosp[8][1];
        const ciHospAddr = document.getElementById("ciHospAddr"); if (ciHospAddr) ciHospAddr.value = (hosp[9] && hosp[9][1]) || "—";
        const ciHospState = document.getElementById("ciHospState"); if (ciHospState) ciHospState.value = (hosp[10] && hosp[10][1]) || "—";
        const ciHospCity = document.getElementById("ciHospCity"); if (ciHospCity) ciHospCity.value = (hosp[11] && hosp[11][1]) || "—";
      })(data.hospitalization);

      renderClaimDocuments(rec);
      renderUploadRemarksGrid(rec);

      ["card-claimpolicy", "card-claimhospitalization", "card-claimcaregiver",
        "card-ci-checklist", "card-claimuploadnew", "card-upload-remarks", "card-ci-ex-remarks", "card-ci-ex-decision"
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
      });
      ["card-claimdecision", "card-ci-new-remarks"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });

      renderCiExRemarksTrail(rec);

      // Sticky Policy Card — shown only for this Physical Document entry point,
      // populated directly from the same rec / buildPolicyMockData(rec) used above
      // (no duplicate data model).
      populatePhysicalDocPolicyCard(rec, data);

      switchToClaimView();

      // After view transition completes, scroll to and focus the Document Upload card
      const docCard = document.getElementById("card-claimuploadnew");
      if (docCard) {
        // Use setTimeout to ensure the view is fully rendered before scrolling
        setTimeout(() => {
          docCard.scrollIntoView({ behavior: "smooth", block: "start" });
          docCard.focus({ preventScroll: true });
        }, 80);
      }
    }

    // Barcode/Interaction card shows a single readonly Email ID field whose
    // label ("Internal Email ID" / "External Email ID") and value are derived
    // from the record's Source (ciSourceForRec) — see populateCiBarcodeSource
    // below, called from every Claim Intimation entry point. It is
    // system-derived, not user-typed, hence disabled/no dropdown.

    document.getElementById('ciExSearchBtn').addEventListener('click', () => {
      const anyFilled = [...document.querySelectorAll('.ci-ex-sf')].some(f => f.value.trim());
      if (!anyFilled) { showSearchCriteriaModal(); return; }
      const results = entries.filter(e => e.policyId || e.surakshaId);
      const body = document.getElementById('ciExGridBody');
      const empty = document.getElementById('ciExGridEmpty');
      document.getElementById('card-ci-ex-grid').classList.remove('hidden');

      ['card-claimpolicy', 'card-claimhospitalization', 'card-claimcaregiver', 'card-ci-checklist', 'card-claimuploadnew', 'card-claimdecision'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
      });
      document.getElementById('card-claimpolicy-picker').classList.add('hidden');
      document.getElementById('card-claimclaims-grid').classList.add('hidden');

      if (results.length === 0) {
        body.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      const claimNumbers = ['CLM/20260610/00042', 'CLM/20260520/00031', 'CLM/20260501/00018', 'CLM/20260415/00007'];
      body.innerHTML = results.map((r, i) => {
        const isActive = r.status === 'Active';
        const claimNo = claimNumbers[i % claimNumbers.length];
        return `<tr style="${!isActive ? 'opacity:0.55;' : ''}">
      <td class="strong">${r.patientName}</td>
      <td class="mono">${r.policyId || r.surakshaId || '-'}</td>
      <td class="mono">${claimNo}</td>
      <td>${r.hospitalName}</td>
      <td>${fmtDate(r.receivedDate)}</td>
      <td><span class="status-badge ${statusClass(r.status)}">${r.status}</span></td>
      <td>${isActive ? `<button class="btn btn-primary btn-sm" type="button" data-action="ci-ex-select" data-id="${r.inwardId}">Select</button>` : `<span style="color:var(--muted);font-size:12px;">Unavailable</span>`}</td>
    </tr>`;
      }).join('');

      body.querySelectorAll('button[data-action="ci-ex-select"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const rec = entries.find(x => x.inwardId === btn.dataset.id);
          if (!rec) return;
          claimTargetId = rec.inwardId;
          const data = buildPolicyMockData(rec);
          renderReadonlyGrid('claimPolicyGrid', data.policy);
          document.getElementById('claimContactNo').value = data.editable.contactNo;
          document.getElementById('claimAltContactNo').value = data.editable.altContactNo;
          document.getElementById('claimAltEmail').value = data.editable.altEmail;
          /* Populate static hospital admission fields from mock data */
          (function(hosp) {
            var map = {
              'hosp-date-of-admission': hosp[0]&&hosp[0][1],
              'hosp-expected-date-of-discharge': hosp[1]&&hosp[1][1],
              'hosp-admission-in-time': hosp[2]&&hosp[2][1],
              'hosp-discharge-out-time': hosp[3]&&hosp[3][1],
              'hosp-ailment-as-per-discharge-card': hosp[4]&&hosp[4][1],
              'hosp-approximate-claim-amount': hosp[5]&&hosp[5][1],
              'hosp-hospital-case-number': hosp[6]&&hosp[6][1],
              'hosp-complaint-on-admission': hosp[12]&&hosp[12][1]
            };
            Object.keys(map).forEach(function(id){ var el=document.getElementById(id); if(el&&map[id]&&map[id]!=='-') el.value=map[id]; });
            var ciHospSearch = document.getElementById('ciHospSearchInput');
            if (ciHospSearch && hosp[8] && hosp[8][1] && hosp[8][1] !== '-') ciHospSearch.value = hosp[8][1];
            var ciHospAddr = document.getElementById('ciHospAddr'); if (ciHospAddr) ciHospAddr.value = (hosp[9]&&hosp[9][1])||'—';
            var ciHospState = document.getElementById('ciHospState'); if (ciHospState) ciHospState.value = (hosp[10]&&hosp[10][1])||'—';
            var ciHospCity = document.getElementById('ciHospCity'); if (ciHospCity) ciHospCity.value = (hosp[11]&&hosp[11][1])||'—';
          })(data.hospitalization);
          renderClaimDocuments(rec);
          renderUploadRemarksGrid(rec);
          ['card-claimpolicy', 'card-claimhospitalization', 'card-claimcaregiver', 'card-ci-checklist', 'card-claimuploadnew', 'card-upload-remarks', 'card-ci-ex-remarks', 'card-ci-ex-decision'].forEach(id => {
            document.getElementById(id).classList.remove('hidden');
          });
          renderCiExRemarksTrail(rec);
          document.getElementById('card-claimpolicy').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });

    /* ---------------- Search for Policy (New Claim) ---------------- */

    // Mock dataset for HEGIC numbers that resolve to more than one active policy.
    // Same demo triggers as Inward Entry's "Search for Policy": enter 9999999999
    // for the original 3-policy demo, or HEGIC0001–HEGIC0004 to walk through the
    // no-claims / single-claim / multi-policy / multi-policy-with-active-claims
    // scenarios (kept identical to IE_MULTI_POLICY_MOCK so both modules behave
    // the same way for the same HEGIC no.).
    var CI_MULTI_POLICY_MOCK = {
      '9999999999': [
        { policyNumber: '2800 0000 3218 2200', product: 'Optima Secure - Individual', proposer: 'Ayushi P', patient: 'Shubham Thakre', dob: '12/03/1995', relationship: 'Self', gender: 'Male', hegic: '9999999999', startDate: '15/06/2026', endDate: '14/06/2027', sumInsured: '₹5,00,000', corporate: 'Individual', status: 'Active' },
        { policyNumber: '2800 0000 4471 9013', product: 'Optima Secure - Family Floater', proposer: 'Ayushi P', patient: 'Shubham Thakre', dob: '12/03/1995', relationship: 'Self', gender: 'Male', hegic: '9999999999', startDate: '02/01/2025', endDate: '01/01/2026', sumInsured: '₹10,00,000', corporate: 'ABC Corp Pvt Ltd', status: 'Active' },
        { policyNumber: '2800 0000 5528 6647', product: 'Health Suraksha - Group', proposer: 'Ayushi P', patient: 'Shubham Thakre', dob: '12/03/1995', relationship: 'Self', gender: 'Male', hegic: '9999999999', startDate: '10/09/2023', endDate: '09/09/2024', sumInsured: '₹3,00,000', corporate: 'ABC Corp Pvt Ltd', status: 'Expired' }
      ],
      /* Scenario 1: Single policy, no active claims */
      'HEGIC0001': [
        { policyNumber: '2800 0000 7712 4401', product: 'Optima Restore - Individual', proposer: 'Vikram Mehta', patient: 'Vikram Mehta', dob: '15/07/1988', relationship: 'Self', gender: 'Male', hegic: 'HEGIC0001', startDate: '01/04/2026', endDate: '31/03/2027', sumInsured: '₹10,00,000', corporate: 'Individual', status: 'Active' }
      ],
      /* Scenario 2: Single policy, with active claims */
      'HEGIC0002': [
        { policyNumber: '2800 0000 8834 5502', product: 'Optima Secure - Family Floater', proposer: 'Anita Desai', patient: 'Anita Desai', dob: '22/11/1980', relationship: 'Self', gender: 'Female', hegic: 'HEGIC0002', startDate: '15/01/2026', endDate: '14/01/2027', sumInsured: '₹15,00,000', corporate: 'Individual', status: 'Active' }
      ],
      /* Scenario 3: Multiple policies, no active claims */
      'HEGIC0003': [
        { policyNumber: '2800 0000 9901 6603', product: 'Optima Secure - Individual', proposer: 'Rajesh Kumar', patient: 'Rajesh Kumar', dob: '08/04/1991', relationship: 'Self', gender: 'Male', hegic: 'HEGIC0003', startDate: '01/06/2026', endDate: '31/05/2027', sumInsured: '₹5,00,000', corporate: 'TechMinds Pvt Ltd', status: 'Active' },
        { policyNumber: '2800 0000 9901 7704', product: 'Health Suraksha - Group', proposer: 'Rajesh Kumar', patient: 'Rajesh Kumar', dob: '08/04/1991', relationship: 'Self', gender: 'Male', hegic: 'HEGIC0003', startDate: '10/03/2026', endDate: '09/03/2027', sumInsured: '₹3,00,000', corporate: 'TechMinds Pvt Ltd', status: 'Active' },
        { policyNumber: '2800 0000 9901 8805', product: 'Optima Restore - Family', proposer: 'Rajesh Kumar', patient: 'Rajesh Kumar', dob: '08/04/1991', relationship: 'Self', gender: 'Male', hegic: 'HEGIC0003', startDate: '01/01/2024', endDate: '31/12/2024', sumInsured: '₹8,00,000', corporate: 'Individual', status: 'Expired' }
      ],
      /* Scenario 4: Multiple policies, with active claims */
      'HEGIC0004': [
        { policyNumber: '2800 0000 1122 3344', product: 'Optima Secure - Individual', proposer: 'Priya Sharma', patient: 'Priya Sharma', dob: '19/09/1993', relationship: 'Self', gender: 'Female', hegic: 'HEGIC0004', startDate: '01/05/2026', endDate: '30/04/2027', sumInsured: '₹7,50,000', corporate: 'Individual', status: 'Active' },
        { policyNumber: '2800 0000 5566 7788', product: 'Optima Restore - Family Floater', proposer: 'Priya Sharma', patient: 'Priya Sharma', dob: '19/09/1993', relationship: 'Self', gender: 'Female', hegic: 'HEGIC0004', startDate: '15/02/2026', endDate: '14/02/2027', sumInsured: '₹12,00,000', corporate: 'DataFlow Systems', status: 'Active' },
        { policyNumber: '2800 0000 9900 1122', product: 'Health Suraksha - Individual', proposer: 'Priya Sharma', patient: 'Priya Sharma', dob: '19/09/1993', relationship: 'Self', gender: 'Female', hegic: 'HEGIC0004', startDate: '01/08/2023', endDate: '31/07/2024', sumInsured: '₹4,00,000', corporate: 'Individual', status: 'Expired' }
      ]
    };

    /* Mock claims data keyed by policy number — identical to Inward Entry's
       IE_CLAIMS_MOCK so the demo HEGIC numbers behave the same in both modules. */
    var CI_CLAIMS_MOCK = {
      '2800 0000 3218 2200': [
        { claimNo: 'CLM/2026/004821', intimationDate: '18/06/2026', hospital: 'Kokilaben Dhirubhai Ambani Hospital', claimedAmt: '₹45,200', status: 'Under Process' },
        { claimNo: 'CLM/2025/009134', intimationDate: '11/11/2025', hospital: 'Apollo Hospitals, Mumbai', claimedAmt: '₹1,20,500', status: 'Settled' },
        { claimNo: 'CLM/2025/006672', intimationDate: '03/08/2025', hospital: 'Fortis Hiranandani Hospital', claimedAmt: '₹32,800', status: 'Query Raised' }
      ],
      '2800 0000 4471 9013': [
        { claimNo: 'CLM/2026/003341', intimationDate: '28/04/2026', hospital: 'Nanavati Max Super Speciality', claimedAmt: '₹78,200', status: 'Under Process' },
        { claimNo: 'CLM/2025/011002', intimationDate: '22/12/2025', hospital: 'Wockhardt Hospital, Mumbai Central', claimedAmt: '₹55,000', status: 'Settled' }
      ],
      '2800 0000 5528 6647': [
        { claimNo: 'CLM/2023/007744', intimationDate: '14/10/2023', hospital: 'Lilavati Hospital & Research Centre', claimedAmt: '₹28,600', status: 'Settled' }
      ],
      /* HEGIC0001 — no claims (key intentionally absent) */
      /* HEGIC0002 — single policy with active claims */
      '2800 0000 8834 5502': [
        { claimNo: 'CLM/2026/005917', intimationDate: '12/07/2026', hospital: 'Hinduja Hospital, Mahim', claimedAmt: '₹1,85,000', status: 'Under Process' },
        { claimNo: 'CLM/2026/004102', intimationDate: '05/05/2026', hospital: 'Breach Candy Hospital', claimedAmt: '₹62,400', status: 'Query Raised' },
        { claimNo: 'CLM/2025/010455', intimationDate: '18/11/2025', hospital: 'Jaslok Hospital', claimedAmt: '₹97,800', status: 'Settled' }
      ],
      /* HEGIC0003 — multiple policies, no claims (keys intentionally absent) */
      /* HEGIC0004 — multiple policies with active claims */
      '2800 0000 1122 3344': [
        { claimNo: 'CLM/2026/006210', intimationDate: '20/07/2026', hospital: 'Max Super Speciality, Saket', claimedAmt: '₹2,10,000', status: 'Under Process' },
        { claimNo: 'CLM/2026/005003', intimationDate: '03/06/2026', hospital: 'Medanta - The Medicity', claimedAmt: '₹1,45,000', status: 'Under Process' }
      ],
      '2800 0000 5566 7788': [
        { claimNo: 'CLM/2026/004588', intimationDate: '14/05/2026', hospital: 'BLK-Max Super Speciality Hospital', claimedAmt: '₹78,500', status: 'Settled' }
      ]
    };

    /* Dummy pre-existing documents shown when the user picks the single
       enabled "Active" claim off the Active Claims grid — mirrors Inward
       Entry's IE_NEW_ACTIVE_CLAIM_DOCS_MOCK. */
    var CI_ACTIVE_CLAIM_DOCS_MOCK = {
      'Discharge Sheet': { fileName: 'discharge-summary.pdf', fileSize: '842 KB', file: new File([new Blob(['Mock discharge summary'], { type: 'application/pdf' })], 'discharge-summary.pdf', { type: 'application/pdf' }), uploadedBy: 'received' },
      'Bill Entries': { fileName: 'hospital-bill.pdf', fileSize: '1.1 MB', file: new File([new Blob(['Mock hospital bill'], { type: 'application/pdf' })], 'hospital-bill.pdf', { type: 'application/pdf' }), uploadedBy: 'received' },
      'KYC Documents': { fileName: 'kyc-proof.pdf', fileSize: '512 KB', file: new File([new Blob(['Mock KYC document'], { type: 'application/pdf' })], 'kyc-proof.pdf', { type: 'application/pdf' }), uploadedBy: 'received' }
    };

    /* Holds the mock docs for the currently-selected "Active" claim off the
       Search-for-Policy claims grid, purely for the doc comment trail below
       — the actual seeding now writes straight into rec.documents (see
       ciRenderPolicyDetailsFromMock) so the Document Upload card renders
       every document, mock or real, through the same committed-row path as
       Medico. Reset to null by renderClaimDocuments() so every other flow
       keeps using rec.documents. */
    var ciActiveClaimDocs = null;

    function ciRenderPolicyDetailsFromMock(policy, existingDocs) {
      claimTargetId = claimTargetId || (entries[0] && entries[0].inwardId) || null;
      renderReadonlyGrid("claimPolicyGrid", [
        ["Policy Number", policy.policyNumber], ["Product Name", policy.product], ["Proposer Name", policy.proposer],
        ["Patient Name", policy.patient], ["Date of Birth", policy.dob], ["Relationship", policy.relationship],
        ["Gender", policy.gender], ["HEGIC Card No.", policy.hegic], ["Policy Start Date", policy.startDate],
        ["Policy End Date", policy.endDate], ["Sum Insured", policy.sumInsured], ["Corporate Name", policy.corporate]
      ]);
      document.getElementById("claimContactNo").value = "9876543210";
      document.getElementById("claimAltContactNo").value = "";
      document.getElementById("claimAltEmail").value = "";
      /* Hospital fields are now static HTML — just clear values */
      ['hosp-date-of-admission','hosp-expected-date-of-discharge','hosp-discharge-date',
       'hosp-admission-in-time','hosp-discharge-out-time','hosp-ailment-as-per-discharge-card',
       'hosp-approximate-claim-amount','hosp-hospital-case-number','hosp-complaint-on-admission'
      ].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
      var ciDays = document.getElementById('ciHospDaysCount');
      if (ciDays) ciDays.value = '';
      var ciHospSearch = document.getElementById('ciHospSearchInput');
      if (ciHospSearch) ciHospSearch.value = '';
      ['ciHospNameDisplay','ciHospAddr','ciHospState','ciHospCity','ciHospPin','ciHospRohini','ciHospType'].forEach(function(id){
        var el = document.getElementById(id); if (el) el.value = '';
      });

      /* The Documents (received) card was removed for Claim Intimation —
         only the Document Upload card is shown now, same as Medico. Any
         pre-existing documents (e.g. from the Active Claims grid) are
         written straight into rec.documents below, then rendered through
         ciUploadWidget.rehydrate() same as every other document — no
         separate seeded-tile code path. */
      ciActiveClaimDocs = existingDocs || null;
      document.getElementById('card-claimuploadnew').classList.remove('hidden');
      var ciChecklistCard = document.getElementById('card-ci-checklist');
      if (ciChecklistCard) ciChecklistCard.classList.remove('hidden');
      // Active Claims / multiple-policy scenario: the claim already has
      // documents on file (mirrors Inward Entry's behaviour above) — merge
      // them into rec.documents (without clobbering anything already tagged
      // by the user) and rehydrate the widget from rec.documents, matching
      // Medico's rehydrateMedUploadList exactly.
      (function () {
        var rec = entries.find(function (x) { return x.inwardId === claimTargetId; });
        if (rec && existingDocs) {
          rec.documents = rec.documents || {};
          Object.keys(existingDocs).forEach(function (cat) {
            if (!(cat in rec.documents)) rec.documents[cat] = existingDocs[cat];
          });
        }
        if (ciUploadWidget) ciUploadWidget.rehydrate(rec ? rec.documents : null);
        if (ciDocHeaderControls) ciDocHeaderControls.renderCategoryOptions();
        if (ciChecklist) ciChecklist.render();
      })();

      document.getElementById('card-claimclaims-grid').classList.add('hidden');
      document.getElementById('card-claimpolicy-picker').classList.add('hidden');
      ["card-claimpolicy", "card-claimhospitalization", "card-claimcaregiver", "card-ci-new-remarks"].forEach(id => {
        document.getElementById(id).classList.remove("hidden");
      });
      document.getElementById("card-claimdecision").classList.remove("hidden");
      document.getElementById("card-claimpolicy").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    var ciSelectedPickerPolicy = null;

    /* Active Claims grid for the Claim Intimation "Search for Policy" flow —
       mirrors Inward Entry's ieRenderClaimsGrid: only one in-flight claim
       (Under Process / Query Raised) per policy can ever be selected. It's
       shown as status "Active" with its documents already attached; any
       other in-flight claim on the same policy is locked out. Settled /
       Rejected claims are unaffected. */
    function ciRenderClaimsGrid(policy) {
      var claims = CI_CLAIMS_MOCK[policy.policyNumber] || [];
      var tbody = document.getElementById('ciClaimsGridBody');
      var empty = document.getElementById('ciClaimsGridEmpty');
      var proceedBtn = document.getElementById('ciClaimsGridProceedBtn');
      document.getElementById('ciClaimsGridHint').textContent = 'Policy ' + policy.policyNumber + ' — ' + policy.patient;
      ["card-claimpolicy", "card-claimhospitalization", "card-claimcaregiver",
        "card-ci-checklist", "card-claimuploadnew", "card-ci-new-remarks", "card-claimdecision"
      ].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });

      if (!claims.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        if (proceedBtn) proceedBtn.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        if (proceedBtn) proceedBtn.classList.add('hidden');
        var statusClass = { 'Under Process': 'st-processing', 'Settled': 'st-active', 'Query Raised': 'st-warn', 'Rejected': 'st-inactive', 'Active': 'st-active' };
        var ACTIVE_CLAIM_STATUSES = ['Under Process', 'Query Raised'];
        var firstActiveIdx = -1;
        claims.forEach(function (c, i) {
          if (firstActiveIdx === -1 && ACTIVE_CLAIM_STATUSES.indexOf(c.status) !== -1) firstActiveIdx = i;
        });
        tbody.innerHTML = claims.map(function (c, i) {
          var isActiveClaim = ACTIVE_CLAIM_STATUSES.indexOf(c.status) !== -1;
          var isEnabledActive = isActiveClaim && i === firstActiveIdx;
          var isLocked = isActiveClaim && !isEnabledActive;
          var displayStatus = isEnabledActive ? 'Active' : c.status;
          var sc = statusClass[displayStatus] || 'st-processing';
          var docsNote = isEnabledActive
            ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;">Existing documents already attached</div>'
            : '';
          var actionCell = isLocked
            ? '<button type="button" class="btn btn-outline btn-sm" disabled title="Only one active claim can be selected for this policy">Locked</button>'
            : '<button type="button" class="btn btn-outline btn-sm ci-claim-pick-btn" data-cidx="' + i + '">Select</button>';
          return '<tr data-cidx="' + i + '"' + (isLocked ? ' style="opacity:.55;"' : '') + '><td class="mono" style="font-size:12.5px;">' + c.claimNo + '</td><td>' + c.intimationDate + '</td><td>' + c.hospital + '</td><td style="font-weight:600;">' + c.claimedAmt + '</td><td><span class="status-badge ' + sc + '">' + displayStatus + '</span>' + docsNote + '</td><td>' + actionCell + '</td></tr>';
        }).join('');
        tbody.querySelectorAll('.ci-claim-pick-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            tbody.querySelectorAll('tr').forEach(function (r) { r.classList.remove('row-selected'); });
            tbody.querySelectorAll('.ci-claim-pick-btn').forEach(function (b) { b.classList.remove('btn-primary'); b.textContent = 'Select'; });
            this.closest('tr').classList.add('row-selected');
            this.classList.add('btn-primary'); this.textContent = '✓ Selected';
            var cidx = parseInt(this.dataset.cidx);
            var isTheActiveClaim = cidx === firstActiveIdx;
            ciRenderPolicyDetailsFromMock(policy, isTheActiveClaim ? CI_ACTIVE_CLAIM_DOCS_MOCK : null);
          });
        });
      }
      document.getElementById('card-claimclaims-grid').classList.remove('hidden');
      document.getElementById('card-claimclaims-grid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    document.getElementById('ciClaimsGridProceedBtn').addEventListener('click', function () {
      if (ciSelectedPickerPolicy) ciRenderPolicyDetailsFromMock(ciSelectedPickerPolicy);
    });

    function ciRenderPolicyPicker(policies) {
      var tbody = document.getElementById('ciPolicyPickBody');
      tbody.innerHTML = policies.map(function (p, i) {
        var badgeClass = p.status === 'Active' ? 'st-active' : 'st-inactive';
        return '<tr data-idx="' + i + '">' +
          '<td>' + p.patient + '</td>' +
          '<td class="mono">' + p.policyNumber + '</td>' +
          '<td>' + p.product + '</td>' +
          '<td>' + p.corporate + '</td>' +
          '<td>' + p.startDate + ' – ' + p.endDate + '</td>' +
          '<td><span class="status-badge ' + badgeClass + '">' + p.status + '</span></td>' +
          '<td><button type="button" class="btn btn-outline btn-sm ci-policy-pick-btn" data-idx="' + i + '">Select</button></td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('.ci-policy-pick-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = this.dataset.idx;
          document.querySelectorAll('#ciPolicyPickBody tr').forEach(function (r) { r.classList.remove('row-selected'); });
          document.querySelectorAll('.ci-policy-pick-btn').forEach(function (b) { b.classList.remove('btn-primary'); b.textContent = 'Select'; });
          document.querySelector('#ciPolicyPickBody tr[data-idx="' + idx + '"]').classList.add('row-selected');
          this.classList.add('btn-primary'); this.textContent = '✓ Selected';
          ciSelectedPickerPolicy = policies[idx];
          var claims = CI_CLAIMS_MOCK[ciSelectedPickerPolicy.policyNumber] || [];
          if (claims.length) {
            ciRenderClaimsGrid(ciSelectedPickerPolicy);
          } else {
            document.getElementById('card-claimclaims-grid').classList.add('hidden');
            ciRenderPolicyDetailsFromMock(ciSelectedPickerPolicy);
          }
        });
      });
    }

    document.getElementById("policySearchBtn").addEventListener("click", () => {
      const anyFilled = [...document.querySelectorAll(".policy-search-field")].some(f => f.value.trim());
      if (!anyFilled) { showSearchCriteriaModal(); return; }
      // document.getElementById('ciRetrieveErr').style.display = 'none';
      const hegicVal = document.getElementById("sf-hegic").value.trim().toUpperCase();
      let matches = CI_MULTI_POLICY_MOCK[hegicVal];
      if (matches) matches = matches.filter(p => p.status === "Active");

      if (matches && matches.length > 1) {
        // Multiple active policies found for this HEGIC no. -> show as a selectable grid.
        ["card-claimpolicy", "card-claimhospitalization", "card-claimcaregiver", "card-ci-checklist", "card-claimuploadnew", "card-ci-new-remarks", "card-claimdecision"].forEach(id => {
          document.getElementById(id).classList.add("hidden");
        });
        document.getElementById("card-claimclaims-grid").classList.add("hidden");
        ciRenderPolicyPicker(matches);
        document.getElementById("card-claimpolicy-picker").classList.remove("hidden");
        document.getElementById("card-claimpolicy-picker").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (matches && matches.length === 1) {
        // Exactly one active policy for this HEGIC no. -> skip the picker.
        document.getElementById("card-claimpolicy-picker").classList.add("hidden");
        var singlePolicy = matches[0];
        ciSelectedPickerPolicy = singlePolicy;
        var singlePolicyClaims = CI_CLAIMS_MOCK[singlePolicy.policyNumber] || [];
        if (singlePolicyClaims.length) {
          // Has claims -> show the Active Claims grid for selection.
          ciRenderClaimsGrid(singlePolicy);
        } else {
          // No claims -> go straight to details.
          document.getElementById("card-claimclaims-grid").classList.add("hidden");
          ciRenderPolicyDetailsFromMock(singlePolicy);
        }
        return;
      }

      // No mock match -> default single-policy flow tied to the inward record, as before.
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (!rec) return;

      const data = buildPolicyMockData(rec);
      renderReadonlyGrid("claimPolicyGrid", data.policy);
      document.getElementById("claimContactNo").value = data.editable.contactNo;
      document.getElementById("claimAltContactNo").value = data.editable.altContactNo;
      document.getElementById("claimAltEmail").value = data.editable.altEmail;
      /* Populate static hospital fields */
      (function(hosp) {
        var map = {
          'hosp-date-of-admission': hosp[0]&&hosp[0][1],
          'hosp-expected-date-of-discharge': hosp[1]&&hosp[1][1],
          'hosp-admission-in-time': hosp[2]&&hosp[2][1],
          'hosp-discharge-out-time': hosp[3]&&hosp[3][1],
          'hosp-ailment-as-per-discharge-card': hosp[4]&&hosp[4][1],
          'hosp-approximate-claim-amount': hosp[5]&&hosp[5][1],
          'hosp-hospital-case-number': hosp[6]&&hosp[6][1],
          'hosp-complaint-on-admission': hosp[12]&&hosp[12][1]
        };
        Object.keys(map).forEach(function(id){ var el=document.getElementById(id); if(el&&map[id]&&map[id]!=='-') el.value=map[id]; });
        var inp = document.getElementById('ciHospSearchInput');
        if (inp && hosp[8] && hosp[8][1] !== '-') inp.value = hosp[8][1];
        var ciHospAddr = document.getElementById('ciHospAddr'); if (ciHospAddr) ciHospAddr.value = (hosp[9]&&hosp[9][1])||'—';
        var ciHospState = document.getElementById('ciHospState'); if (ciHospState) ciHospState.value = (hosp[10]&&hosp[10][1])||'—';
        var ciHospCity = document.getElementById('ciHospCity'); if (ciHospCity) ciHospCity.value = (hosp[11]&&hosp[11][1])||'—';
      })(data.hospitalization);
      renderClaimDocuments(rec);

      document.getElementById("card-claimpolicy-picker").classList.add("hidden");
      document.getElementById("card-claimclaims-grid").classList.add("hidden");
      ["card-claimpolicy", "card-claimhospitalization", "card-claimcaregiver", "card-ci-checklist", "card-claimuploadnew", "card-ci-new-remarks"].forEach(id => {
        document.getElementById(id).classList.remove("hidden");
      });
      document.getElementById("card-claimdecision").classList.remove("hidden");
      renderCiNewRemarksTrail(rec);

      document.getElementById("card-claimpolicy").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    /* Clear button — New Claim Intimation policy search */
    document.getElementById('policySearchClearBtn').addEventListener('click', function () {
      document.querySelectorAll('.policy-search-field').forEach(function (f) { f.value = ''; });
      document.getElementById('card-claimpolicy-picker').classList.add('hidden');
      document.getElementById('card-claimclaims-grid').classList.add('hidden');
      ciSelectedPickerPolicy = null;
      ciActiveClaimDocs = null;
      ['card-claimpolicy', 'card-claimhospitalization', 'card-claimcaregiver',
       'card-ci-checklist', 'card-claimuploadnew', 'card-ci-new-remarks', 'card-claimdecision'
      ].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
      var errBanner = document.getElementById('ciPolicyIntegrationErr');
      if (errBanner) errBanner.classList.add('hidden');
    });

    /* Clear button — Existing Claims search */
    document.getElementById('ciExSearchClearBtn').addEventListener('click', function () {
      document.querySelectorAll('.ci-ex-sf').forEach(function (f) { f.value = ''; });
      var grid = document.getElementById('card-ci-ex-grid');
      if (grid) grid.classList.add('hidden');
      document.getElementById('card-claimpolicy-picker').classList.add('hidden');
      document.getElementById('card-claimclaims-grid').classList.add('hidden');
      ['card-claimpolicy', 'card-claimhospitalization', 'card-claimcaregiver',
       'card-ci-checklist', 'card-claimuploadnew', 'card-claimdecision'
      ].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
    });

    document.getElementById("breadcrumbIntimationsLink").addEventListener("click", (e) => {
      e.preventDefault();
      switchToListView();
    });
    document.getElementById("claimCancelBtn").addEventListener("click", () => {
      if (confirm("Discard progress and return to Inward Entries?")) switchToListView();
    });

    document.getElementById("cgMobile").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });

    document.getElementById("claimContactNo").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });
    document.getElementById("claimAltContactNo").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });

    /* ---------------- Decision: Submit / Raise Query ---------------- */
    function updateClaimEntryHospital() {
      const rec = entries.find(x => x.inwardId === claimTargetId);
      const hospNameField = document.getElementById("hosp-hospital-name");
      if (rec && hospNameField && hospNameField.value.trim()) {
        rec.hospitalName = hospNameField.value.trim();
      }
    }

    function saveCaregiverIfProvided() {
      const name = document.getElementById("cgName").value.trim();
      if (!name) return;
      const caregiverData = {
        name,
        mobile: document.getElementById("cgMobile").value.trim(),
        email: document.getElementById("cgEmail").value.trim(),
        address: document.getElementById("cgAddress").value.trim(),
        source: document.getElementById("cgSource").value.trim(),
        sourceEmail: document.getElementById("cgSourceEmail").value.trim(),
      };
      lastCaregiver = caregiverData;
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (rec) rec.caregiver = caregiverData;
    }

    document.getElementById("claimSubmitBtn").addEventListener("click", () => {
      const errors = [];
      const mobile = document.getElementById("cgMobile").value.trim();
      if (mobile && mobile.length !== 10) { errors.push("Enter a valid 10-digit caregiver mobile number."); }

      const barcodeEl = document.getElementById("ci-barcode-id");
      if (barcodeEl && !barcodeEl.disabled && !barcodeEl.value.trim()) {
        errors.push("Barcode/Interaction ID is required.");
        const bf = barcodeEl.closest(".field"); if (bf) bf.classList.add("has-error");
      } else if (barcodeEl) {
        const bf = barcodeEl.closest(".field"); if (bf) bf.classList.remove("has-error");
      }

      const dischargeDateEl = document.getElementById("hosp-discharge-date");
      if (dischargeDateEl && !dischargeDateEl.value.trim()) {
        errors.push("Date of Discharge is required.");
        const df = dischargeDateEl.closest(".field"); if (df) df.classList.add("has-error");
      } else if (dischargeDateEl) {
        const df = dischargeDateEl.closest(".field"); if (df) df.classList.remove("has-error");
      }

      const summary = document.getElementById("claimValidationSummary");
      const list = document.getElementById("claimValidationList");
      if (errors.length) {
        list.innerHTML = errors.map(e => `<li>${e}</li>`).join("");
        summary.classList.add("show");
        summary.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      summary.classList.remove("show");

      saveCaregiverIfProvided();
      updateClaimEntryHospital();

      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (rec) {
        rec.contactNumber = document.getElementById("claimContactNo").value.trim() || rec.contactNumber;
        rec.altContactNumber = document.getElementById("claimAltContactNo").value.trim();
        rec.altEmail = document.getElementById("claimAltEmail").value.trim();
        rec.claimStatus = "Completed";
        rec.updatedDate = new Date().toISOString();
      }

      document.getElementById("successTitle").textContent = "Claim Intimation Submitted";
      document.getElementById("successSub").textContent = `${claimTargetId} has been marked Completed.`;
      document.getElementById("modalInwardNo").textContent = (rec && rec.claimId) ? rec.claimId : claimTargetId;
      showSuccessModal({ label: "View in Claim List", onView: switchToListView, showClaimLabel: true });
    });

    document.getElementById("claimSaveBtn").addEventListener("click", () => {
      saveCaregiverIfProvided();
      updateClaimEntryHospital();
      const rec = entries.find(x => x.inwardId === claimTargetId);
      if (rec) {
        rec.contactNumber = document.getElementById("claimContactNo").value.trim() || rec.contactNumber;
        rec.altContactNumber = document.getElementById("claimAltContactNo").value.trim();
        rec.altEmail = document.getElementById("claimAltEmail").value.trim();
        rec.updatedDate = new Date().toISOString();
      }
      showToast('success', 'Draft saved successfully');
    });

    /* =====================================================================
       PROCESS SHEET (persistent sidebar link - opens full summary in a new tab)
    ===================================================================== */
    function getCurrentClaimRec() {
      if (!viewUpload.classList.contains("hidden") && uploadTargetId) {
        return entries.find(e => e.inwardId === uploadTargetId);
      }
      if (!viewClaimIntimation.classList.contains("hidden") && claimTargetId) {
        return entries.find(e => e.inwardId === claimTargetId);
      }
      if (!viewCreate.classList.contains("hidden") && editingId) {
        return entries.find(e => e.inwardId === editingId);
      }
      return null;
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
       ROLE SWITCHER (top-right profile)
    ===================================================================== */
    function isClaimContentActive() {
      return (getCurrentRole() === "Scan Tag" && getScanTagTab() === "claim") || getCurrentRole() === "Claim Intimation User";
    }

    function roleInitials(role) {
      return role.split(/[\s-]+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    }

    const MATRIX_COLS = ["PRE-AUTH", "CASHLESS", "REIMB.", "CASH OPD", "REIMB OPD"];
    const MATRIX_DATA = [
      { row: "CHG REQ",     cols: [0,   0,  11,  0,  1] },
      { row: "DOC RCVD",    cols: [0,   7, 151,  0,  5] },
      { row: "PA ENH DOC",  cols: [1,   0,   0,  0,  0] },
      { row: "PA ENH REQ",  cols: [2,   0,   0,  0,  0] },
      { row: "QRY RPLY",    cols: [0,   1,  14,  0,  1] },
    ];
    let tlMatrixFilter = null; // { row, col } or null

    function applyTLMatrixFilter(filter) {
      tlMatrixFilter = filter;
      const label = document.getElementById("tlMatrixFilterLabel");
      const clearBtn = document.getElementById("tlMatrixClearBtn");
      if (filter) {
        label.textContent = `Filtered: ${filter.row} × ${filter.col}`;
        label.style.display = "inline";
        clearBtn.style.display = "inline-block";
        listState.search = filter.row + " " + filter.col;
      } else {
        label.style.display = "none";
        clearBtn.style.display = "none";
        listState.search = "";
        const si = document.getElementById("listSearch");
        if (si) si.value = "";
      }
      listState.page = 1;
      renderTable();
      renderTLMatrix();
    }

    function renderTLMatrix() {
      const max = Math.max(...MATRIX_DATA.flatMap(r => r.cols));
      const tbody = document.getElementById("tlMatrixBody");
      if (!tbody) return;
      tbody.innerHTML = MATRIX_DATA.map(rowData => `
        <tr>
          <td style="font-size:11px;font-weight:700;color:#64748B;letter-spacing:.05em;padding:4px 6px;white-space:nowrap;">${rowData.row}</td>
          ${rowData.cols.map((v, ci) => {
            const intensity = v === 0 ? 0 : Math.max(0.08, v / max);
            const isBig = v === max;
            const isActive = tlMatrixFilter && tlMatrixFilter.row === rowData.row && tlMatrixFilter.col === MATRIX_COLS[ci];
            const bg = isActive ? '#1E40AF' : v === 0 ? '#F8FAFC' : `rgba(227,31,38,${intensity * 0.85})`;
            const color = isActive ? '#fff' : intensity > 0.45 ? '#fff' : v === 0 ? '#CBD5E1' : '#B91C1C';
            const border = isActive ? '2px solid #1E40AF' : isBig ? '2px solid #E31F26' : '1.5px solid transparent';
            const cursor = v > 0 ? 'pointer' : 'default';
            const interactiveAttrs = v > 0 ? `role="button" tabindex="0" aria-label="${rowData.row} / ${MATRIX_COLS[ci]}: ${v}"` : '';
            return `<td style="text-align:center;padding:0;" data-row="${rowData.row}" data-col="${MATRIX_COLS[ci]}" ${interactiveAttrs}>
              <div style="background:${bg};border:${border};border-radius:7px;padding:9px 6px;font-size:${v > 99 ? '14px' : '15px'};font-weight:800;color:${color};cursor:${cursor};min-width:44px;line-height:1;transition:background .15s;">
                ${v === 0 ? '<span style="color:#CBD5E1;font-size:12px;font-weight:500;">0</span>' : v}
              </div>
            </td>`;
          }).join('')}
        </tr>
      `).join('');

      tbody.querySelectorAll("td[data-row]").forEach(td => {
        const activate = () => {
          const v = parseInt(td.querySelector("div").textContent.trim()) || 0;
          if (v === 0) return;
          const r = td.dataset.row, c = td.dataset.col;
          if (tlMatrixFilter && tlMatrixFilter.row === r && tlMatrixFilter.col === c) {
            applyTLMatrixFilter(null);
          } else {
            applyTLMatrixFilter({ row: r, col: c });
          }
        };
        td.addEventListener("click", activate);
        td.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        });
      });

      const clearBtn = document.getElementById("tlMatrixClearBtn");
      if (clearBtn) clearBtn.onclick = () => applyTLMatrixFilter(null);
    }

    /* =====================================================================
       TL DASHBOARD — My Claims Queue / Team Workload tabs
       Scoped to #tlDashboard (Medico TL / Non Medico TL / QC TL). The
       Queue panel is the pre-existing KPI + matrix content, unchanged.
       Team Workload derives its per-member, per-claim-type breakdown from
       ASSIGN_USERS_DATA (the same roster used by the assign-claim modal)
       so it reflects real handler names rather than a separate dataset.
    ===================================================================== */
    let tlDashView = "queue"; // "queue" | "team"
    let twSelectedUser = null;

    const TW_TYPE_KEYS = ["preauth", "enhance", "discharge", "early", "reimb"];
    const TW_TYPE_LABELS = ["Pre-Auth", "Pre-Auth Enh.", "Discharge", "Early Disch.", "Reimb."];
    // The five --series-* tokens (variables.css) — one per claim type, kept
    // in lockstep with --brand-blue/--teal/--violet/--warn/--brand-red so a
    // claim type reads the same colour everywhere in the app. Referenced as
    // var() here (not hex) so a token edit repaints every consumer,
    // including inline style/SVG-fill attributes, which resolve var() fine.
    const TW_TYPE_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
    const TW_TYPE_SOFT = ["var(--series-1-soft)", "var(--series-2-soft)", "var(--series-3-soft)", "var(--series-4-soft)", "var(--series-5-soft)"];
    const TW_AVATAR_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "#0e7490", "#be185d"];
    // Paired 1:1 with TW_AVATAR_COLORS — a light tint for the avatar-ring
    // halo behind each colour. Kept as a plain array (not color-mix()) so
    // the ring renders identically on browsers without CSS Color 5 support.
    const TW_AVATAR_SOFT = ["var(--series-1-soft)", "var(--series-2-soft)", "var(--series-3-soft)", "var(--series-4-soft)", "var(--series-5-soft)", "#cffafe", "#fce7f3"];

    // Deterministic per-member breakdown across the five claim types, seeded
    // from each member's existing `active` count so totals stay consistent
    // with what the assign-claim modal already shows.
    function twBreakdownFor(user, idx) {
      const weights = [0.28, 0.14, 0.22, 0.10, 0.26];
      const seedShift = idx % TW_TYPE_KEYS.length;
      const out = {};
      let assigned = 0;
      TW_TYPE_KEYS.forEach((key, i) => {
        const w = weights[(i + seedShift) % weights.length];
        const v = Math.round(user.active * w);
        out[key] = v;
        assigned += v;
      });
      // Reconcile rounding drift against the member's true active count.
      const diff = user.active - assigned;
      if (diff !== 0) {
        const bump = TW_TYPE_KEYS[seedShift];
        out[bump] = Math.max(0, out[bump] + diff);
      }
      return out;
    }

    function twLoadTier(total, max) {
      const ratio = max ? total / max : 0;
      if (ratio >= 0.66) return "high";
      if (ratio >= 0.33) return "mid";
      return "low";
    }
    function twLoadLabel(tier) {
      return tier === "high" ? "Heavy load" : tier === "mid" ? "Moderate load" : "Light load";
    }

    function switchTLDashView(view) {
      tlDashView = view === "team" ? "team" : "queue";
      const isQueue = tlDashView === "queue";
      document.getElementById("tlDashPanelQueue")?.classList.toggle("hidden", !isQueue);
      document.getElementById("tlDashPanelTeam")?.classList.toggle("hidden", isQueue);
      document.getElementById("tlDashTabQueue")?.classList.toggle("tl-dash-tab--active", isQueue);
      document.getElementById("tlDashTabQueue")?.setAttribute("aria-selected", String(isQueue));
      document.getElementById("tlDashTabTeam")?.classList.toggle("tl-dash-tab--active", !isQueue);
      document.getElementById("tlDashTabTeam")?.setAttribute("aria-selected", String(!isQueue));
      // Team Workload shows only its own cards — the claims/entries table
      // section below the TL dashboard (heading, toolbar, chips, table)
      // hides for it and returns for My Claims Queue.
      document.getElementById("tlListSection")?.classList.toggle("hidden", !isQueue);
      if (!isQueue) renderTeamWorkload();
    }

    document.getElementById("tlDashTabQueue")?.addEventListener("click", () => switchTLDashView("queue"));
    document.getElementById("tlDashTabTeam")?.addEventListener("click", () => switchTLDashView("team"));
    document.getElementById("twSearch")?.addEventListener("input", (e) => renderTeamWorkload(e.target.value));

    const TW_SUM_ICONS = {
      all: '<path d="M9 12h6M9 16h6M9 8h2" /><rect x="4" y="4" width="16" height="16" rx="2" />',
      preauth: '<path d="M12 3l7 3v6c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6l7-3z" />',
      enhance: '<path d="M12 5v14M5 12h14" />',
      discharge: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />',
      early: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />',
      reimb: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />',
    };

    function renderTeamWorkload(searchValue) {
      const q = (searchValue ?? document.getElementById("twSearch")?.value ?? "").trim().toLowerCase();
      const roster = ASSIGN_USERS_DATA.map((u, i) => ({ ...u, idx: i, breakdown: twBreakdownFor(u, i) }));
      const rows = q ? roster.filter(u => u.name.toLowerCase().includes(q)) : roster;

      // Summary strip: All + one card per claim type, across the full roster.
      const typeIds = ["preauth", "enhance", "discharge", "early", "reimb"];
      const sum = (key) => roster.reduce((a, u) => a + u.breakdown[key], 0);
      const totalAll = TW_TYPE_KEYS.reduce((a, k) => a + sum(k), 0);
      const summaryGrid = document.getElementById("twSummaryGrid");
      if (summaryGrid) {
        const cards = [{ id: "all", cls: "tw-sum-card--all", label: "All Records", value: totalAll, color: "var(--ink)", soft: "var(--surface-alt)" }]
          .concat(TW_TYPE_KEYS.map((k, i) => ({
            id: typeIds[i],
            cls: `tw-sum-card--${typeIds[i]}`,
            label: TW_TYPE_LABELS[i],
            value: sum(k),
            color: TW_TYPE_COLORS[i],
            soft: TW_TYPE_SOFT[i],
          })));
        summaryGrid.innerHTML = cards.map(c => `
          <div class="tw-sum-card ${c.cls}">
            <div class="tw-sum-icon" style="background:${c.soft};color:${c.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${TW_SUM_ICONS[c.id]}</svg>
            </div>
            <div>
              <div class="u-text-xs-upper-label">${c.label}</div>
              <div class="tw-sum-value">${c.value}</div>
            </div>
          </div>
        `).join("");
      }

      // Legend.
      const legend = document.getElementById("twLegend");
      if (legend) {
        legend.innerHTML = TW_TYPE_KEYS.map((k, i) => `
          <span class="tw-legend-item">
            <span class="tw-legend-swatch" style="background:${TW_TYPE_COLORS[i]}"></span>${TW_TYPE_LABELS[i]}
          </span>
        `).join("");
      }

      // Roster rows, sorted heaviest-load first so triage priority reads
      // top-down; a compact list (not big cards) so it can sit next to a
      // persistent detail rail instead of pushing the donut far below the fold.
      const maxTotal = Math.max(1, ...roster.map(u => u.active));
      const sortedRows = [...rows].sort((a, b) => b.active - a.active);
      const grid = document.getElementById("twGrid");
      if (grid) {
        if (!sortedRows.length) {
          grid.innerHTML = `
            <div class="empty-state tw-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              <h3>No matching teammates</h3>
              <p>Try a different search term.</p>
            </div>`;
        } else {
          grid.innerHTML = sortedRows.map((u, rank) => {
            const total = u.active;
            const tier = twLoadTier(total, maxTotal);
            const avatarColor = TW_AVATAR_COLORS[u.idx % TW_AVATAR_COLORS.length];
            const avatarSoft = TW_AVATAR_SOFT[u.idx % TW_AVATAR_SOFT.length];
            const topTypeIdx = TW_TYPE_KEYS.reduce((best, k, i) => u.breakdown[k] > u.breakdown[TW_TYPE_KEYS[best]] ? i : best, 0);
            const segs = TW_TYPE_KEYS.map((k, ki) => {
              const w = total ? (u.breakdown[k] / total * 100) : 0;
              return w > 0
                ? `<div class="tw-bar-seg" style="width:${w}%;background:${TW_TYPE_COLORS[ki]}" title="${TW_TYPE_LABELS[ki]}: ${u.breakdown[k]}"></div>`
                : "";
            }).join("");
            const selected = twSelectedUser === u.name;
            return `
              <div class="tw-row${selected ? " tw-row--selected" : ""}" data-user="${u.name}"
                role="button" tabindex="0" aria-pressed="${selected}">
                <span class="tw-row-rank">${rank + 1}</span>
                <div class="tw-row-avatar-ring" style="--ring-color:${avatarColor};--ring-soft:${avatarSoft}">
                  <div class="tw-row-avatar" style="background:${avatarColor}">${initials(u.name)}</div>
                </div>
                <div class="tw-row-meta">
                  <div class="tw-row-name">${u.name}</div>
                  <div class="tw-row-sub">Top: <span style="color:${TW_TYPE_COLORS[topTypeIdx]}">${TW_TYPE_LABELS[topTypeIdx]}</span></div>
                  <div class="tw-bar-track">${segs}</div>
                </div>
                <div class="tw-row-end">
                  <span class="tw-load-badge tw-load-badge--${tier}"><span class="tw-load-dot"></span>${twLoadLabel(tier)}</span>
                  <div class="tw-row-total"><b>${total}</b><span>active</span></div>
                </div>
                <svg class="tw-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6" /></svg>
              </div>`;
          }).join("");
        }

        grid.querySelectorAll(".tw-row").forEach(row => {
          const activate = () => { twSelectedUser = row.dataset.user; renderTeamWorkload(q); };
          row.addEventListener("click", activate);
          row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
          });
        });
      }

      const activeUser = roster.find(u => u.name === twSelectedUser) || sortedRows[0] || roster[0];
      renderTeamWorkloadDetail(activeUser, maxTotal);
    }

    // Modern ring chart: five stroked arcs on a shared circle (not hand-built
    // pie wedges) so `stroke-linecap: round` gives every segment a soft
    // rounded end for free, with a small angular gap between segments
    // achieved via stroke-dasharray rather than trimming each arc's path.
    function twDonutRing(breakdown, total, cx, cy, r) {
      const circumference = 2 * Math.PI * r;
      const gapDeg = total > 0 ? 3.2 : 0; // visual gap between segments, in degrees
      let cursorDeg = -90; // start at 12 o'clock
      return TW_TYPE_KEYS.map((k, i) => {
        const v = breakdown[k];
        if (!v || !total) return "";
        const sweepDeg = (v / total) * 360;
        const drawDeg = Math.max(0, sweepDeg - gapDeg);
        const dashLen = (drawDeg / 360) * circumference;
        const dashGap = circumference - dashLen;
        const rotate = cursorDeg + gapDeg / 2;
        cursorDeg += sweepDeg;
        const pct = Math.round(v / total * 100);
        return `<circle class="tw-donut-arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TW_TYPE_COLORS[i]}"
          stroke-width="26" stroke-linecap="round" stroke-dasharray="${dashLen} ${dashGap}"
          transform="rotate(${rotate} ${cx} ${cy})" data-label="${TW_TYPE_LABELS[i]}" data-count="${v}" data-pct="${pct}"></circle>`;
      }).join("");
    }

    function renderTeamWorkloadDetail(u, maxTotal) {
      const card = document.getElementById("twDetailCard");
      if (!card || !u) return;
      const total = u.active;
      const tier = twLoadTier(total, maxTotal);
      const avatarColor = TW_AVATAR_COLORS[u.idx % TW_AVATAR_COLORS.length];
      const avatarSoft = TW_AVATAR_SOFT[u.idx % TW_AVATAR_SOFT.length];
      const cx = 130, cy = 130, r = 96;

      const legendRows = TW_TYPE_KEYS.map((k, i) => {
        const v = u.breakdown[k];
        const pct = total ? Math.round(v / total * 100) : 0;
        return `
          <div class="tw-donut-legend-row">
            <div class="tw-donut-legend-swatch" style="background:${TW_TYPE_COLORS[i]}"></div>
            <span class="tw-donut-legend-label">${TW_TYPE_LABELS[i]}</span>
            <div class="tw-donut-legend-track"><div class="tw-donut-legend-fill" style="width:${pct}%;background:${TW_TYPE_COLORS[i]}"></div></div>
            <span class="tw-donut-legend-value">${v}</span>
            <span class="tw-donut-legend-pct">${pct}%</span>
          </div>`;
      }).join("");

      const topTypeIdx = TW_TYPE_KEYS.reduce((best, k, i) => u.breakdown[k] > u.breakdown[TW_TYPE_KEYS[best]] ? i : best, 0);
      const pctOfTeamMax = maxTotal ? Math.round(total / maxTotal * 100) : 0;

      card.innerHTML = `
        <div class="tw-detail-head">
          <div class="tw-detail-avatar-ring" style="--ring-color:${avatarColor};--ring-soft:${avatarSoft}">
            <div class="tw-detail-avatar" style="background:${avatarColor}">${initials(u.name)}</div>
          </div>
          <div class="tw-detail-meta">
            <div class="u-text-xl-bold">${u.name}</div>
            <div class="u-text-sm-muted-plain">Claims Handler</div>
            <span class="tw-load-badge tw-load-badge--${tier} u-mt-6"><span class="tw-load-dot"></span>${twLoadLabel(tier)}</span>
          </div>
        </div>
        <div class="tw-donut-wrap">
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line-soft)" stroke-width="26"></circle>
            ${twDonutRing(u.breakdown, total, cx, cy, r)}
            <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="32" font-weight="800" fill="var(--ink)" font-family="Inter,sans-serif">${total}</text>
            <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11.5" font-weight="700" letter-spacing="0.06em" fill="var(--muted-soft)" font-family="Inter,sans-serif">ACTIVE RECORDS</text>
          </svg>
          <div class="tw-donut-tooltip" id="twDonutTooltip"></div>
        </div>
        <div class="tw-detail-stats">
          <div class="tw-detail-stat">
            <span class="tw-detail-stat-value" style="color:${TW_TYPE_COLORS[topTypeIdx]}">${TW_TYPE_LABELS[topTypeIdx]}</span>
            <span class="tw-detail-stat-label">Top claim type</span>
          </div>
          <div class="tw-detail-stat">
            <span class="tw-detail-stat-value">${pctOfTeamMax}%</span>
            <span class="tw-detail-stat-label">Of team peak</span>
          </div>
        </div>
        <div class="tw-donut-legend">${legendRows}</div>`;

      const tooltip = document.getElementById("twDonutTooltip");
      card.querySelectorAll(".tw-donut-arc").forEach(arc => {
        arc.addEventListener("mouseenter", () => {
          arc.classList.add("tw-donut-arc--hover");
          tooltip.style.display = "block";
          tooltip.textContent = `${arc.dataset.label}: ${arc.dataset.count} (${arc.dataset.pct}%)`;
        });
        arc.addEventListener("mousemove", (e) => {
          tooltip.style.left = (e.clientX + 12) + "px";
          tooltip.style.top = (e.clientY - 32) + "px";
        });
        arc.addEventListener("mouseleave", () => {
          arc.classList.remove("tw-donut-arc--hover");
          tooltip.style.display = "none";
        });
      });
    }

    function updateRoleBasedListUI() {
      const currentRole = getCurrentRole();
      const showAssignment = currentRole === "Scan Tag TL";
      const isPlainScanTag = currentRole === "Scan Tag";
      const isClaimIntimation = isClaimContentActive();
      const isMedicoTL = currentRole === "Medico TL" || currentRole === "Non Medico TL";
      const isMedicoStaff = currentRole === "Medico" || currentRole === "Non Medico" || currentRole === "QC" || currentRole === "QC TL" || currentRole === "CMO" || currentRole === "CEM" || currentRole === "Payment Auditor - Settlement User";
      const isTLRole = currentRole === "Medico TL" || currentRole === "Non Medico TL" || currentRole === "QC TL";

      // TL Dashboard
      const tlDash = document.getElementById("tlDashboard");
      if (tlDash) {
        tlDash.classList.toggle("hidden", !isTLRole);
        if (isTLRole) renderTLMatrix();
      }

      // Claims/entries table section: hidden only for a TL role currently
      // viewing Team Workload (which shows just its own cards); visible for
      // every non-TL role and for a TL role on My Claims Queue.
      const tlListSection = document.getElementById("tlListSection");
      if (tlListSection) {
        tlListSection.classList.toggle("hidden", isTLRole && tlDashView === "team");
      }

      const showReferencePanel = isMedicoTL || isMedicoStaff;
      document.querySelectorAll(".reference-panel").forEach(el => el.classList.toggle("hidden", !showReferencePanel));

      document.querySelector("#gridBody").closest("table").classList.toggle("hide-assign", !showAssignment);
      document.getElementById("createNewBtn").classList.toggle("hidden", isClaimIntimation || isMedicoTL || isMedicoStaff);

      // Module name: the "Scan Tag" module always shows "Scan Tag" as its
      // heading, whichever tab (Inward Entries / Claim Intimation) is
      // selected — the tab only changes the page content below it, never
      // the module/menu name. "Scan Tag TL" is a separate dedicated page and
      // keeps its own heading.
      if (isPlainScanTag) {
        document.getElementById("listHeading").textContent = "Scan Tag";
      } else if (showAssignment) {
        document.getElementById("listHeading").textContent = "Inward Entries";
      } else if (isMedicoTL || isMedicoStaff) {
        document.getElementById("listHeading").textContent = "Claims List";
      } else {
        document.getElementById("listHeading").textContent = "Inward Entries";
      }

      if (isMedicoStaff) {
        document.getElementById("listSubHeading").textContent = "Select a claim to process it step by step.";
      } else if (isMedicoTL) {
        document.getElementById("listSubHeading").textContent = "Review claims pending medical evaluation and sign-off.";
      } else if (isClaimIntimation) {
        document.getElementById("listSubHeading").textContent = "Select a claim to view policy details and admit it.";
      } else {
        document.getElementById("listSubHeading").textContent = "Search, filter and manage physical document inward entries.";
      }

      // Scan Tag: rounded-tab switcher between the merged Inward Entries / Claim
      // Intimation entry points. Shown ONLY within the main "Scan Tag" module —
      // never on "Scan Tag TL" or any other dedicated role page.
      const scanTagTabs = document.getElementById("scanTagTabs");
      const scanTagTabInward = document.getElementById("scanTagTabInward");
      const scanTagTabClaim = document.getElementById("scanTagTabClaim");
      if (scanTagTabs && scanTagTabInward && scanTagTabClaim) {
        scanTagTabs.classList.toggle("hidden", !isPlainScanTag);
        if (isPlainScanTag) {
          scanTagTabInward.classList.toggle("scan-tag-tab--active", !isClaimIntimation);
          scanTagTabInward.setAttribute("aria-selected", String(!isClaimIntimation));
          scanTagTabClaim.classList.toggle("scan-tag-tab--active", isClaimIntimation);
          scanTagTabClaim.setAttribute("aria-selected", String(isClaimIntimation));
        }
      }
    }

    function switchScanTagTab(target) {
      // target: "inward" | "claim" — content-only switch. currentRole stays
      // "Scan Tag" throughout, so the module name never changes.
      setScanTagTab(target === "claim" ? "claim" : "inward");
      tlMatrixFilter = null;
      listState.statusChip = null;
      updateRoleBasedListUI();
      listState.page = 1;
      renderTable();
    }

    document.getElementById("scanTagTabInward")?.addEventListener("click", () => switchScanTagTab("inward"));
    document.getElementById("scanTagTabClaim")?.addEventListener("click", () => switchScanTagTab("claim"));

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
          document.getElementById("roleDropdown").classList.add("hidden");
          if (role === "Payment") {
            window.location.href = "./payment.html";
            return;
          }
          setCurrentRole(role);
          tlMatrixFilter = null;
          listState.statusChip = null;
          twSelectedUser = null;
          switchTLDashView("queue");
          setScanTagTab("inward");
          document.getElementById("profileRoleName").textContent = getCurrentRole();
          renderRoleList();
          updateRoleBasedListUI();
          document.getElementById("docViewerOverlay").style.display = "none";
          document.getElementById("docViewerFrame").srcdoc = "";
          switchToListView();
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

    /* ---------------- Hamburger dropdown menu (Version 2) ---------------- */
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
    document.getElementById("navDropdownListView").addEventListener("click", (e) => {
      e.preventDefault();
      navDropdownMenu.classList.add("hidden");
      switchToListView();
    });
    //document.getElementById("navDropdownCreateEntry").addEventListener("click", (e) => {
    //  e.preventDefault();
    //  navDropdownMenu.classList.add("hidden");
    //  switchToCreateView();
    //});

    /* =====================================================================
       INIT
    ===================================================================== */
    const DEMO_PDF_TEMPLATE = (title) => `%PDF-1.1
%\xA5\xB1\xEB

1 0 obj
  << /Type /Catalog
     /Pages 2 0 R
  >>
endobj

2 0 obj
  << /Type /Pages
     /Kids [3 0 R]
     /Count 1
     /MediaBox [0 0 400 250]
  >>
endobj

3 0 obj
  <<  /Type /Page
      /Parent 2 0 R
      /Resources
       << /Font
           << /F1
               << /Type /Font
                  /Subtype /Type1
                  /BaseFont /Helvetica
               >>
           >>
       >>
      /Contents 4 0 R
  >>
endobj

4 0 obj
  << /Length ${44 + title.length} >>
stream
  BT
    /F1 16 Tf
    30 200 Td
    (${title}) Tj
  ET
endstream
endobj

trailer
  <<  /Root 1 0 R
      /Size 5
  >>
%%EOF
`;

    function makeDemoFile(fileName, label) {
      const blob = new Blob([DEMO_PDF_TEMPLATE(label)], { type: "application/pdf" });
      return new File([blob], fileName, { type: "application/pdf" });
    }

    function seedDemoDocuments(inwardId, docsMap) {
      const rec = entries.find(e => e.inwardId === inwardId);
      if (!rec) return;
      rec.documents = rec.documents || {};
      Object.entries(docsMap).forEach(([category, fileName]) => {
        const file = makeDemoFile(fileName, `${category} - ${inwardId}`);
        // Each category holds an array of documents — append rather than
        // overwrite so this doesn't clobber whatever's already attached
        // under the same category (e.g. from entries-store.js's own seed).
        rec.documents[category] = rec.documents[category] || [];
        rec.documents[category].push({ fileName, fileSize: formatFileSize(file.size), file, uploadedBy: "previous", uploadedAt: new Date(rec.createdDate || Date.now()).getTime() });
      });
    }

    seedDemoDocuments("INW/20260609/00071", {
      "Case Summary": "case-summary-00071.pdf",
      "Discharge Sheet": "discharge-sheet-00071.pdf",
    });
    seedDemoDocuments("INW/20260625/00112", {
      "Bill Entries": "bill-entries-00112.pdf",
      "Investigation Reports": "investigation-reports-00112.pdf",
    });
    seedDemoDocuments("INW/20260710/00179", {
      "Case Summary": "case-summary-00179.pdf",
      "Photo ID": "photo-id-00179.pdf",
      "Others": "misc-00179.pdf",
    });

    function seedDemoRemarks(inwardId, stageMap) {
      const rec = entries.find(e => e.inwardId === inwardId);
      if (!rec) return;
      rec.stageRemarks = rec.stageRemarks || { 1: [], 2: [], 3: [], 4: [], 5: [] };
      Object.entries(stageMap).forEach(([stage, items]) => {
        rec.stageRemarks[stage] = [...(rec.stageRemarks[stage] || []), ...items];
      });
    }

    seedDemoRemarks("INW/20260609/00071", {
      1: [
        { role: "Non Medico", name: "Jiteendra Yadav", datetime: "10/06/2026 10:12:04", text: "Package scanned and verified against the physical folder. Discharge summary is slightly smudged - flagging for Medico review." },
        { role: "Medico", name: "Morla Amrutha", datetime: "10/06/2026 15:40:21", text: "Reviewed discharge summary. Diagnosis is legible enough to proceed; no re-scan needed." },
      ],
      3: [
        { role: "Auditor TL", name: "HCSQC Bot1", datetime: "11/06/2026 09:05:00", text: "" },
        { role: "Medico TL", name: "Ritika Sen", datetime: "11/06/2026 11:20:47", text: "Case details look consistent with the diagnosis on file. Approved for bill review." },
      ],
    });

    seedDemoRemarks("INW/20260625/00112", {
      1: [
        { role: "Non Medico", name: "Libas Kumar Sharma", datetime: "26/06/2026 14:02:11", text: "Bill entries and investigation reports received. Ambulance bill original copy missing - requesting from hospital." },
      ],
      4: [
        { role: "Medico", name: "Morla Amrutha", datetime: "27/06/2026 09:30:55", text: "ICU charges appear justified per the case notes. Deduction not warranted at this stage." },
      ],
    });

    seedDemoRemarks("INW/20260710/00179", {
      1: [
        { role: "Claim Intimation User", name: "Ayesha Khan", datetime: "10/07/2026 16:05:33", text: "Photo ID doesn't match the proposer name on the policy - please confirm relationship before uploading further documents." },
        { role: "Non Medico", name: "Rohit Verma", datetime: "11/07/2026 08:47:12", text: "Confirmed with hospital desk - Photo ID belongs to the patient's spouse who accompanied for admission. No issue." },
      ],
    });

    // role-state.js already restores currentRole from ?role= (or its
    // sessionStorage fallback) at load time — this just syncs the header
    // label to match, since that DOM update has to happen after the page
    // (and #profileRoleName) exists.
    document.getElementById("profileRoleName").textContent = getCurrentRole();

    receivedDate.valueAsDate = new Date();
    checkBarcode();
    updateRoleBasedListUI();
    renderTable();
    // NOTE: the page-wide initSearchableSelectsIn(document) sweep runs
    // later, inside the DOMContentLoaded handler below, after
    // autoPlaceholders() has finished relabeling "--Select--" placeholder
    // options to "Select <Field Label>" — see that call site for why it
    // has to run after, not here.
    document.body.classList.remove("role-init-pending");

    // ─── Initialisation ───────────────────────────────────────────────
    function initCIN() { }
    function initDates() { }
    function startSLATimer() { }
    function setupScrollSpy() { }
    function setupFooter() { }
    function addDocRow() { }
    function updateProgress() { }
    function updateStats() { }
    function updateTabStatuses() { }
    document.addEventListener('DOMContentLoaded', () => {
      initCIN();
      initDates();
      startSLATimer();
      setupScrollSpy();
      setupFooter();
      addDocRow();
      renderDocUploadList();
      updateProgress();
      updateStats();
      updateTabStatuses();   // show red on pre-filled defaults immediately

      /* ---- CI Hospital Search ---- */
      initHospitalSearch({
        inputId: 'ciHospSearchInput', dropdownId: 'ciHospDropdown',
        addBtnId: 'ciAddNewHospBtn', formId: 'ciAddNewHospForm',
        cancelBtnId: 'ciAddNewHospCancelBtn', saveBtnId: 'ciAddNewHospSaveBtn',
        nameDisplayId: 'ciHospNameDisplay',
        addrId: 'ciHospAddr', stateId: 'ciHospState', cityId: 'ciHospCity',
        pinId: 'ciHospPin', rohiniId: 'ciHospRohini',
        nameInputId: 'ciNewHospName', addrInputId: 'ciNewHospAddress',
        stateInputId: 'ciNewHospState', cityInputId: 'ciNewHospCity',
        pinInputId: 'ciNewHospPin', rohiniInputId: 'ciNewHospRohini',
        admitDateId: 'hosp-date-of-admission', dischargeDateId: 'hosp-discharge-date', daysCountId: 'ciHospDaysCount'
      });
      initClaimAmtValidation('hosp-approximate-claim-amount', 'ciClaimAmtErr');
      initIntegrationErrDemo('policySearchBtn', '#sf-policy', 'ciPolicyIntegrationErr');
      var ciRetryBtn = document.getElementById('ciRetrySearchBtn');
      if (ciRetryBtn) {
        ciRetryBtn.addEventListener('click', function() {
          document.getElementById('sf-policy').value = '';
          document.getElementById('ciPolicyIntegrationErr').style.display = 'none';
        });
      }
    });
    // ─── Document Upload System ───────────────────────────────────────
    function renderDocUploadList() {
      const list = document.getElementById('docUploadList');
      if (!list) return;
      list.innerHTML = DOC_CATEGORIES.map(cat => {
        const up = state.uploadedDocs[cat.id];
        return `
      <div class="doc-upload-row${up ? ' is-uploaded' : ''}" id="docRow-${cat.id}">
        <div class="doc-upload-info">
          <span class="doc-upload-label">${cat.label}${cat.required
            ? ' <span class="req-star">*</span>'
            : ' <span class="doc-optional">optional</span>'}</span>
          ${up
            ? `<span class="doc-upload-filename" onclick="viewFile('${cat.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ${up.name}</span>`
            : `<span class="doc-upload-empty">No file uploaded</span>`}
        </div>
        <div class="doc-upload-actions">
          ${up
            ? `<button class="doc-act-btn doc-act-view" target="_self" onclick="viewFile('${cat.id}')" title="Preview">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
               <button class="doc-act-btn doc-act-remove" onclick="removeDoc('${cat.id}')" title="Remove">
                <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg></button>`
            : `<label class="doc-act-btn doc-act-upload">
                <input type="file" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="onSingleFileSelected('${cat.id}',event)" />
                <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M7,9l1.41,1.41L11,7.83V16h2V7.83l2.59,2.58L17,9l-5-5L7,9z"/></g></svg>
                </label>`}
        </div>
      </div>`;
      }).join('');
    }

    function onSingleFileSelected(catId, event) {
      const file = event.target.files[0];
      if (!file) return;
      if (state.uploadedDocs[catId]?.url) URL.revokeObjectURL(state.uploadedDocs[catId].url);
      state.uploadedDocs[catId] = { file, name: file.name, url: URL.createObjectURL(file), type: file.type };
      const cat = DOC_CATEGORIES.find(c => c.id === catId);
      if (cat) { const chk = document.getElementById(cat.chkId); if (chk) chk.checked = true; }
      renderDocUploadList();
      updateDocChecklist();
      showToast('success', 'File Uploaded', `"${file.name}" → ${cat?.label || catId}`);
    }

    function removeDoc(catId) {
      if (state.uploadedDocs[catId]?.url) URL.revokeObjectURL(state.uploadedDocs[catId].url);
      delete state.uploadedDocs[catId];
      const cat = DOC_CATEGORIES.find(c => c.id === catId);
      if (cat) { const chk = document.getElementById(cat.chkId); if (chk) chk.checked = false; }
      renderDocUploadList();
      updateDocChecklist();
    }
    // ─── Document Checklist ───────────────────────────────────────────
    function updateDocChecklist() {
      const mandCats = DOC_CATEGORIES.filter(c => c.required);
      const uploaded = mandCats.filter(c => !!state.uploadedDocs[c.id]).length;
      const total = mandCats.length;
      const pct = (uploaded / total) * 100;
      const text = `${uploaded} / ${total} mandatory documents uploaded`;

      const fillHint = document.getElementById('checklistFill');
      const textHint = document.getElementById('checklistText');
      if (fillHint) fillHint.style.width = pct + '%';
      if (textHint) textHint.textContent = text;

      const fillDrawer = document.getElementById('checklistFillDrawer');
      const textDrawer = document.getElementById('checklistTextDrawer');
      if (fillDrawer) fillDrawer.style.width = pct + '%';
      if (textDrawer) textDrawer.textContent = text;

      const trigBadge = document.getElementById('docTriggerBadge');
      const hintBadge = document.getElementById('docDrawerBadge');
      if (trigBadge) trigBadge.textContent = `${uploaded}`;
      if (hintBadge) hintBadge.textContent = `${uploaded}/${total}`;

      const trigger = document.getElementById('docDrawerTrigger');
      if (trigger) trigger.classList.toggle('has-missing', uploaded < total);

      onFieldChange();
    }
    // ─── Field Change Handler ─────────────────────────────────────────
    function onFieldChange() {
      updateTabStatuses();
      updateProgress();
      updateStats();
      checkSubmitReady();
    }

    // ─── Bulk Upload ──────────────────────────────────────────────────
    function triggerBulkUpload() {
      document.getElementById('bulkStaging')?.classList.toggle('open');
    }

    function onBulkFilesSelected(event) {
      Array.from(event.target.files).forEach(f => {
        if (!state.bulkFiles.some(b => b.name === f.name && b.file.size === f.size))
          state.bulkFiles.push({ file: f, name: f.name, url: URL.createObjectURL(f), assignedTo: null });
      });
      event.target.value = '';
      renderBulkFileList();
    }

    function onBulkDrop(event) {
      event.preventDefault();
      document.getElementById('bulkDropZone')?.classList.remove('drag-over');
      Array.from(event.dataTransfer.files).forEach(f => {
        if (!state.bulkFiles.some(b => b.name === f.name && b.file.size === f.size))
          state.bulkFiles.push({ file: f, name: f.name, url: URL.createObjectURL(f), assignedTo: null });
      });
      renderBulkFileList();
    }

    function renderBulkFileList() {
      const list = document.getElementById('bulkFileList');
      const footer = document.getElementById('bulkFooter');
      if (!list) return;
      if (!state.bulkFiles.length) { list.innerHTML = ''; if (footer) footer.style.display = 'none'; return; }

      const alreadyUploaded = new Set(Object.keys(state.uploadedDocs));
      const alreadyAssigned = new Set(state.bulkFiles.filter(b => b.assignedTo).map(b => b.assignedTo));

      list.innerHTML = state.bulkFiles.map((b, idx) => `
    <div class="bulk-file-row">
      <div class="bulk-file-meta">
        <span class="bulk-file-name" title="${b.name}">${b.name}</span>
        <span class="bulk-file-size">${formatFileSize(b.file.size)}</span>
      </div>
      <div class="bulk-file-assign">
        <div class="select-wrap" style="min-width:172px;">
          <select class="form-select" onchange="assignBulkFile(${idx},this.value)">
            <option value="">— Tag as category —</option>
            ${DOC_CATEGORIES.map(cat => {
        const taken = (alreadyUploaded.has(cat.id) || alreadyAssigned.has(cat.id)) && b.assignedTo !== cat.id;
        return `<option value="${cat.id}"${b.assignedTo === cat.id ? ' selected' : ''}${taken ? ' disabled' : ''}>${cat.label}${cat.required ? ' *' : ''}${taken ? ' (taken)' : ''}</option>`;
      }).join('')}
          </select>
        </div>
        <button class="doc-act-btn doc-act-remove" onclick="removeBulkFile(${idx})" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 4C15.25 3.66848 15.1182 3.35063 14.8838 3.11621C14.6494 2.88179 14.3315 2.75 14 2.75H10C9.66848 2.75 9.35063 2.88179 9.11621 3.11621C8.88179 3.35063 8.75 3.66848 8.75 4V5.25H15.25V4ZM5.75 20C5.75 20.3315 5.88179 20.6494 6.11621 20.8838C6.35063 21.1182 6.66848 21.25 7 21.25H17C17.3315 21.25 17.6494 21.1182 17.8838 20.8838C18.1182 20.6494 18.25 20.3315 18.25 20V6.75H5.75V20ZM16.75 5.25H21C21.4142 5.25 21.75 5.58579 21.75 6C21.75 6.41421 21.4142 6.75 21 6.75H19.75V20C19.75 20.7293 19.4601 21.4286 18.9443 21.9443C18.4286 22.4601 17.7293 22.75 17 22.75H7C6.27065 22.75 5.57139 22.4601 5.05566 21.9443C4.53994 21.4286 4.25 20.7293 4.25 20V6.75H3C2.58579 6.75 2.25 6.41421 2.25 6C2.25 5.58579 2.58579 5.25 3 5.25H7.25V4C7.25 3.27065 7.53994 2.57139 8.05566 2.05566C8.57139 1.53994 9.27065 1.25 10 1.25H14C14.7293 1.25 15.4286 1.53994 15.9443 2.05566C16.4601 2.57139 16.75 3.27065 16.75 4V5.25Z"
            fill="currentColor" /></svg>
        </button>
      </div>
    </div>`).join('');

      if (footer) footer.style.display = state.bulkFiles.some(b => b.assignedTo) ? 'flex' : 'none';

      // Wrap each row's freshly-rendered <select class="form-select"> as a
      // searchable-select — same post-build wiring step as this list's
      // other per-row behaviour (inline onchange/onclick above stay as-is
      // and keep firing, since the wrapper dispatches a real "change"
      // event on the underlying <select>).
      initSearchableSelectsIn(list);
    }

    function assignBulkFile(idx, catId) {
      if (catId) {
        const dupBulk = state.bulkFiles.some((b, i) => i !== idx && b.assignedTo === catId);
        const dupUploaded = !!state.uploadedDocs[catId];
        if (dupBulk || dupUploaded) {
          showToast('warning', 'Duplicate Tag', dupUploaded
            ? 'That category already has an uploaded file. Remove it first.'
            : 'Another file in this batch is already tagged to that category.');
          setTimeout(() => renderBulkFileList(), 50);
          return;
        }
      }
      state.bulkFiles[idx].assignedTo = catId || null;
      renderBulkFileList();
    }

    function removeBulkFile(idx) {
      URL.revokeObjectURL(state.bulkFiles[idx]?.url);
      state.bulkFiles.splice(idx, 1);
      renderBulkFileList();
    }

    function confirmBulkUpload() {
      const assigned = state.bulkFiles.filter(b => b.assignedTo);
      if (!assigned.length) { showToast('warning', 'No Tags', 'Tag at least one file to a category first.'); return; }
      assigned.forEach(b => {
        const cat = DOC_CATEGORIES.find(c => c.id === b.assignedTo);
        state.uploadedDocs[b.assignedTo] = { file: b.file, name: b.name, url: b.url, type: b.file.type };
        if (cat) { const chk = document.getElementById(cat.chkId); if (chk) chk.checked = true; }
      });
      state.bulkFiles = state.bulkFiles.filter(b => !b.assignedTo);
      document.getElementById('bulkStaging')?.classList.remove('open');
      renderBulkFileList();
      renderDocUploadList();
      updateDocChecklist();
      showToast('success', 'Files Uploaded', `${assigned.length} file(s) tagged and confirmed.`);
    }

    function cancelBulkUpload() {
      state.bulkFiles.forEach(b => URL.revokeObjectURL(b.url));
      state.bulkFiles = [];
      renderBulkFileList();
      document.getElementById('bulkStaging')?.classList.remove('open');
    }

    // ─── File Viewer ──────────────────────────────────────────────────
    function viewFile(catId) {
      const doc = state.uploadedDocs[catId];
      if (!doc) return;
      const cat = DOC_CATEGORIES.find(c => c.id === catId);
      state.currentViewFile = doc;
      document.getElementById('fvFilename').textContent = doc.name;
      document.getElementById('fvCatname').textContent = cat?.label || '';
      const body = document.getElementById('fvBody');
      if (doc.type.startsWith('image/')) {
        body.innerHTML = `<img src="${doc.url}" alt="${doc.name}" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
      } else if (doc.type === 'application/pdf') {
        body.innerHTML = `<iframe src="${doc.url}#toolbar=1" style="width:100%;height:100%;border:none;"></iframe>`;
      } else {
        body.innerHTML = `<div class="fv-no-preview">
      <svg width="48" hesight="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <p>${doc.name}</p>
      <p style="font-size:11px;margin-top:4px;color:#94A3B8;">Preview not available for this file type.</p>
      <a href="${doc.url}" download="${doc.name}" class="btn btn-sm btn-secondary" style="margin-top:16px;">Download</a>
    </div>`;
      }
      document.getElementById('fvModal')?.classList.add('open');
      document.getElementById('fvOverlay')?.classList.add('open');
    }

    function openCurrentFileInNewTab() {
      if (!state.currentViewFile) return;
      const w = window.open(state.currentViewFile.url, '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes');
      if (!w) showToast('warning', 'Popup Blocked', 'Allow popups to open files in a new window. Then Alt+Tab to switch back.');
    }

    function closeFileViewer() {
      document.getElementById('fvModal')?.classList.remove('open');
      document.getElementById('fvOverlay')?.classList.remove('open');
      const body = document.getElementById('fvBody');
      if (body) body.innerHTML = '';
      state.currentViewFile = null;
    }

    const DOC_CATEGORIES = [
      { id: 'discharge', label: 'Discharge Summary', required: true, chkId: 'chk_discharge' },
      { id: 'bills', label: 'Original Bills & Receipts', required: true, chkId: 'chk_bills' },
      { id: 'prescription', label: "Doctor's Prescriptions", required: true, chkId: 'chk_prescription' },
      { id: 'kyc', label: 'KYC / ID Proof', required: true, chkId: 'chk_kyc' },
      { id: 'claim_a', label: 'Claim Form Part A (Insured)', required: true, chkId: 'chk_claim_a' },
      { id: 'claim_b', label: 'Claim Form Part B (Hospital)', required: false, chkId: 'chk_claim_b' },
      { id: 'investigation', label: 'Investigation / Lab Reports', required: false, chkId: 'chk_investigation' },
      { id: 'consent', label: 'Patient Consent Form', required: false, chkId: 'chk_consent' },
    ];
    // ─── Document Drawer ─────────────────────────────────────────────
    function openDocDrawer() {
      document.getElementById('docDrawer')?.classList.add('open');
      document.getElementById('docDrawerOverlay')?.classList.add('open');
    }

    function closeDocDrawer() {
      document.getElementById('docDrawer')?.classList.remove('open');
      document.getElementById('docDrawerOverlay')?.classList.remove('open');
    }

    function toggleDocDrawer() {
      const drawer = document.getElementById('docDrawer');
      if (drawer?.classList.contains('open')) {
        closeDocDrawer();
      } else {
        openDocDrawer();
      }
    }

    // Close drawer/viewer on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeFileViewer(); closeDocDrawer(); }
    });

    // ─── Missing Fields per Section ───────────────────────────────────
    function getMissingFields(idx) {
      const missing = [];
      if (idx === 2) {
        DOC_CATEGORIES.filter(c => c.required).forEach(c => {
          if (!state.uploadedDocs[c.id]) missing.push(`Upload: ${c.label}`);
        });
        return missing;
      }
      if (idx === 3) {
        MANDATORY[3].forEach(id => {
          if (id === 'declaration') {
            if (!document.getElementById(id)?.checked) missing.push(FIELD_LABELS[id] || id);
          } else {
            const el = document.getElementById(id);
            if (!el || !(el.value || '').trim()) missing.push(FIELD_LABELS[id] || id);
          }
        });
        if (!document.querySelector('input[name="finalAction"]:checked')) {
          missing.push('Final Action selection');
        }
        return missing;
      }
      (MANDATORY[idx] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el || !(el.value || '').trim()) missing.push(FIELD_LABELS[id] || id);
      });
      return missing;
    }

    /* ──────────── Global Search Bar Interactive ──────────── */
    (function initGlobalSearch() {
      const input = document.getElementById('globalSearchInput');
      const clear = document.getElementById('globalSearchClear');
      const submit = document.getElementById('globalSearchSubmit');
      const dropdown = document.getElementById('gsDropdown');
      const trigger = document.getElementById('gsDropdownTrigger');
      const label = document.getElementById('gsDropdownLabel');
      const menu = document.getElementById('gsDropdownMenu');
      const overlay = document.getElementById('gsDropdownOverlay');

      if (!input || !clear || !submit || !dropdown || !trigger || !label || !menu) return;

      /* ── Dropdown options data ── */
      const OPTIONS = [
        { value: 'claim_policy_num', label: 'Claim Policy Num', icon: 'file-text' },
        { value: 'insured_name', label: 'Insured Name', icon: 'user' },
        { value: 'mobile_number', label: 'Mobile Number', icon: 'phone' },
        { value: 'email_id', label: 'Email ID', icon: 'mail' },
        { value: 'hegic_card_no', label: 'Hegic Card No', icon: 'credit-card' },
        { value: 'cust_id', label: 'Cust ID', icon: 'hash' },
        { value: 'pan_card_no', label: 'Pan Card No', icon: 'file' },
        { value: 'pehchaan_id', label: 'Pehchaan ID', icon: 'id' },
        { value: 'abha_id', label: 'Abha ID', icon: 'heart' },
        { value: 'passport_id', label: 'Passport ID', icon: 'globe' },
        { value: 'corporate_name', label: 'Corporate Name', icon: 'briefcase' }
      ];

      const ICON_MAP = {
        'file-text': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M9 13h6 M9 17h6',
        'user': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 20c1-5 3.5-7 7-7s6 2 7 7',
        'phone': 'M4.5 4h3.4l1.4 4-2 1.4a12 12 0 0 0 5.3 5.3l1.4-2 4 1.4v3.4c0 1-1 1.8-2 1.6C9.6 18 6 14.4 4.9 8.9c-.2-1 .6-2 1.6-1.9z',
        'mail': 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
        'credit-card': 'M2 8h20M6 14h4M10 17h-2M2 5h20v14H2z',
        'hash': 'M4 9h16M4 15h16M9 3v18M15 3v18',
        'file': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6',
        'id': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 20c1-5 3.5-7 7-7s6 2 7 7 M3 12h2 M19 12h2',
        'heart': 'M12 21s-7-4.6-7-9a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 12c0 4.4-7 9-7 9z',
        'globe': 'M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10z M2 12h20 M12 2c-2.5 2.6-3.6 5.8-3.6 9s1.1 6.4 3.6 9c2.5-2.6 3.6-5.8 3.6-9s-1.1-6.4-3.6-9z',
        'briefcase': 'M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2 M3 7h18v12H3z M7 7v12 M17 7v12'
      };

      let selectedValue = OPTIONS[0].value;

      /* ── Render menu options ── */
      function renderOptions() {
        menu.innerHTML = OPTIONS.map(o => `
          <div class="gs-dropdown__option ${o.value === selectedValue ? 'is-selected' : ''}" data-value="${o.value}" role="option" aria-selected="${o.value === selectedValue}" tabindex="-1">
            <span class="gs-dropdown__option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_MAP[o.icon] || ICON_MAP['file-text']}" /></svg></span>
            <span>${o.label}</span>
            <svg class="gs-dropdown__option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        `).join('');
      }

      /* ── Select an option ── */
      function selectOption(value) {
        const opt = OPTIONS.find(o => o.value === value);
        if (!opt) return;
        selectedValue = value;
        label.textContent = opt.label;
        renderOptions();
        closeDropdown();
      }

      /* ── Open / Close ── */
      function openDropdown() {
        // Position portal relative to trigger using getBoundingClientRect (fixed positioning)
        const rect = dropdown.getBoundingClientRect();
        menu.style.top = (rect.bottom + 6) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.width = Math.max(rect.width, Math.min(rect.width + 360, 500)) + 'px';
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        const selectedEl = menu.querySelector('.gs-dropdown__option.is-selected');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
        // Move focus into the menu so the Arrow Up/Down keydown handler
        // below (which listens on menu, not trigger) can actually fire —
        // without this, opening via keyboard left focus on trigger and the
        // menu was never keyboard-navigable.
        const focusTarget = selectedEl || menu.querySelector('.gs-dropdown__option');
        if (focusTarget) focusTarget.focus();
      }

      function closeDropdown() {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }

      function toggleDropdown() {
        if (dropdown.classList.contains('open')) closeDropdown();
        else openDropdown();
      }

      /* ── Event listeners ── */
      trigger.addEventListener('click', toggleDropdown);

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') {
          e.preventDefault();
          toggleDropdown();
        }
        if (e.key === 'Escape') closeDropdown();
      });

      overlay.addEventListener('click', closeDropdown);

      menu.addEventListener('click', function (e) {
        const optEl = e.target.closest('.gs-dropdown__option');
        if (!optEl) return;
        selectOption(optEl.dataset.value);
        input.focus();
      });

      menu.addEventListener('keydown', function (e) {
        const items = [...menu.querySelectorAll('.gs-dropdown__option')];
        const idx = items.indexOf(e.target.closest('.gs-dropdown__option'));
        if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
        if (e.key === 'Enter') { e.preventDefault(); if (idx >= 0) selectOption(items[idx].dataset.value); input.focus(); }
        if (e.key === 'Escape') { closeDropdown(); trigger.focus(); }
      });

      /* Close on outside click */
      document.addEventListener('click', function (e) {
        if (dropdown.classList.contains('open') && !dropdown.contains(e.target)) closeDropdown();
      });

      /* ── Search functionality ── */
      function updateClear() {
        clear.classList.toggle('visible', (input.value || '').trim().length > 0);
      }

      function executeSearch() {
        const term = (input.value || '').trim();
        const category = selectedValue;
        if (!term) {
          input.focus();
          return;
        }
        console.log(`[Global Search] category="${category}" term="${term}"`);
        document.dispatchEvent(new CustomEvent('globalsearch', { detail: { category, term } }));
        const toast = document.createElement('div');
        toast.textContent = `Searching ${OPTIONS.find(o => o.value === category)?.label || category} for "${term}"…`;
        Object.assign(toast.style, {
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#fff',
          padding: '1rem 2rem',
          borderRadius: '1rem',
          fontSize: '1.3rem',
          fontWeight: '600',
          zIndex: '9999',
          boxShadow: '0 .8rem 2.4rem rgba(0,0,0,.25)',
          opacity: '0',
          transition: 'opacity .2s ease'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 250);
        }, 2000);
      }

      input.addEventListener('input', updateClear);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); executeSearch(); }
      });

      clear.addEventListener('click', function () {
        input.value = '';
        input.focus();
        updateClear();
      });

      submit.addEventListener('click', executeSearch);

      /* ── Init ── */
      renderOptions();
      updateClear();
    })();

    /* ---------- Advanced Search Modal ---------- */
    (function initAdvancedSearch() {
      const advBtn = document.getElementById('gsAdvancedBtn');
      const overlay = document.getElementById('gsAdvancedOverlay');
      const closeBtn = document.getElementById('gsAdvancedClose');
      const modal = document.getElementById('gsAdvancedModal');
      const categorySel = document.getElementById('gsAdvCategory');
      const keywordInp = document.getElementById('gsAdvKeyword');
      const dateInp = document.getElementById('gsAdvDateRange');
      const toggleName = document.getElementById('gsAdvToggleName');
      const toggleDob = document.getElementById('gsAdvToggleDob');
      const condField = document.getElementById('gsAdvConditionalField');
      const condLabel = document.getElementById('gsAdvConditionalLabel');
      const condInput = document.getElementById('gsAdvConditionalInput');
      const clearAllBtn = document.getElementById('gsAdvancedClearAll');
      const searchBtn = document.getElementById('gsAdvancedSearch');

      if (!advBtn || !overlay || !modal) return;

      // Same categories as main search
      const CATEGORIES = [
        { value: 'claim_policy_num', label: 'Claim Policy Num' },
        { value: 'insured_name', label: 'Insured Name' },
        { value: 'mobile_number', label: 'Mobile Number' },
        { value: 'email_id', label: 'Email ID' },
        { value: 'hegic_card_no', label: 'Hegic Card No' },
        { value: 'cust_id', label: 'Cust ID' },
        { value: 'pan_card_no', label: 'Pan Card No' },
        { value: 'pehchaan_id', label: 'Pehchaan ID' },
        { value: 'abha_id', label: 'Abha ID' },
        { value: 'passport_id', label: 'Passport ID' },
        { value: 'corporate_name', label: 'Corporate Name' }
      ];

      // Populate dropdown
      if (categorySel) {
        categorySel.innerHTML = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
      }

      // Open modal
      advBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });

      // Close modal
      function closeAdvanced() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }

      closeBtn.addEventListener('click', closeAdvanced);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAdvanced();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeAdvanced();
      });

      // Toggle: Insured Name / DOB
      let activeToggle = 'name'; // 'name' or 'dob'

      function setToggle(type) {
        activeToggle = type;
        toggleName.classList.toggle('active', type === 'name');
        toggleDob.classList.toggle('active', type === 'dob');

        if (type === 'name') {
          condLabel.textContent = 'Insured Name';
          condInput.type = 'text';
          condInput.placeholder = 'Enter insured name…';
        } else {
          condLabel.textContent = 'Date of Birth';
          condInput.type = 'date';
          condInput.placeholder = '';
        }
      }

      toggleName.addEventListener('click', function () { setToggle('name'); });
      toggleDob.addEventListener('click', function () { setToggle('dob'); });

      // Clear All
      clearAllBtn.addEventListener('click', function () {
        if (categorySel) { categorySel.selectedIndex = 0; refreshSearchableSelectLabel(categorySel.id); }
        keywordInp.value = '';
        dateInp.value = '';
        setToggle('name');
        condInput.value = '';
      });

      // Search
      function executeAdvancedSearch() {
        const category = categorySel ? categorySel.value : '';
        const keyword = (keywordInp.value || '').trim();
        const dateRange = (dateInp.value || '').trim();
        const condVal = (condInput.value || '').trim();

        if (!keyword && !dateRange && !condVal) {
          keywordInp.focus();
          return;
        }

        console.log('[Advanced Search]', { category, keyword, dateRange, activeToggle, condVal });
        document.dispatchEvent(new CustomEvent('globalsearch', {
          detail: {
            category,
            term: keyword || condVal,
            advanced: true,
            dateRange,
            searchBy: activeToggle,
            searchValue: condVal
          }
        }));

        // Toast notification
        const toast = document.createElement('div');
        toast.textContent = `Advanced search: ${CATEGORIES.find(c => c.value === category)?.label || category}`;
        Object.assign(toast.style, {
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#0F172A', color: '#fff', padding: '1rem 2rem', borderRadius: '1rem',
          fontSize: '1.3rem', fontWeight: '600', zIndex: '9999',
          boxShadow: '0 .8rem 2.4rem rgba(0,0,0,.25)', opacity: '0', transition: 'opacity .2s ease'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 250);
        }, 2000);

        closeAdvanced();
      }

      searchBtn.addEventListener('click', executeAdvancedSearch);

      // Keyboard: Enter to search
      keywordInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') executeAdvancedSearch();
      });
      condInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') executeAdvancedSearch();
      });
      dateInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') executeAdvancedSearch();
      });
    })();


/* ==========================================================================
   INWARD ENTRIES — NEW CLAIM + EXISTING CLAIM FLOWS
   ========================================================================== */

    /* =====================================================================
       INWARD ENTRIES — NEW CLAIM + EXISTING CLAIM FLOWS
       (Consolidated: policy search, policy details, hospitalization,
        caregiver, documents, upload widget, remarks, query, decision)
    ===================================================================== */

    /* ------------------------------------------------------------------
       GLOBAL SHARED HELPERS — declared at script scope so they are
       available to ALL DOMContentLoaded handlers (CI, IE, etc.)
    ------------------------------------------------------------------ */
    /* Claim Amount validation (min 1000) */
    function initClaimAmtValidation(inputId, errId) {
      var el  = document.getElementById(inputId);
      var err = document.getElementById(errId);
      if (!el || !err) return;
      el.addEventListener('blur', function() {
        var v = parseFloat(el.value);
        err.style.display = (el.value && (isNaN(v) || v < 1000)) ? 'block' : 'none';
      });
    }

    /* Integration error demo: type "FAIL" in the policy input and click Search */
    function initIntegrationErrDemo(searchBtnId, policyInputSelector, errBannerId) {
      var btn = document.getElementById(searchBtnId);
      if (!btn) return;
      btn.addEventListener('click', function() {
        var policyField = document.querySelector(policyInputSelector);
        var banner = document.getElementById(errBannerId);
        if (policyField && policyField.value.trim().toUpperCase() === 'FAIL') {
          if (banner) banner.style.display = 'block';
          return;
        }
        if (banner) banner.style.display = 'none';
      }, true);
    }

    document.addEventListener('DOMContentLoaded', function () {

      /* ---------- Card lists ---------- */
      var IE_NEW_CARDS = [
        'card-ie-new-search', 'card-ie-policy-picker', 'card-ie-claims-grid',
        'card-ie-policy', 'card-ie-hospitalization',
        'card-ie-caregiver', 'card-ie-uploadnew',
        'card-ie-new-remarks', 'card-ie-new-decision'
      ];
      var IE_EX_CARDS = [
        'card-ie-ex-search', 'card-ie-ex-grid',
        'card-ie-ex-policy', 'card-ie-ex-hospitalization', 'card-ie-ex-caregiver',
        'card-ie-ex-uploadnew',
        'card-ie-ex-remarks', 'card-ie-ex-decision'
      ];

      function ieHideAll() {
        IE_NEW_CARDS.concat(IE_EX_CARDS).forEach(function (id) {
          var el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
      }

      /* ---------- Multi-policy mock dataset ---------- */
      var IE_MULTI_POLICY_MOCK = {
        '9999999999': [
          { hegic: '9999999999', policyNumber: '2800 0000 3218 2200', product: 'Optima Secure - Individual', productCode: '5023', productType: 'Health Product', proposer: 'Ayushi P', employeeName: 'Shubham Thakre', employeeGroup: 'Optima Secure', employeeId: 'NA', patient: 'Shubham Thakre', relationship: 'Self', dob: '42 / 12-03-1995', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'LN7R62PA68', emailId: '-', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '02 Jul 2026', partnerRefId: '-', startDate: '15/06/2026', endDate: '14/06/2027', sumInsured: '₹5,00,000', corporate: 'Individual', status: 'Active', contactNo: '9876543210', altContactNo: '', altEmail: '' },
          { hegic: '9999999999', policyNumber: '2800 0000 4471 9013', product: 'Optima Secure - Family Floater', productCode: '5024', productType: 'Health Product', proposer: 'Ayushi P', employeeName: 'Shubham Thakre', employeeGroup: 'Optima Secure', employeeId: 'NA', patient: 'Shubham Thakre', relationship: 'Self', dob: '42 / 12-03-1995', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'LN7R62PA68', emailId: '-', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '02 Jul 2026', partnerRefId: '-', startDate: '02/01/2025', endDate: '01/01/2026', sumInsured: '₹10,00,000', corporate: 'ABC Corp Pvt Ltd', status: 'Active', contactNo: '9876543210', altContactNo: '', altEmail: '' },
          { hegic: '9999999999', policyNumber: '2800 0000 5528 6647', product: 'Health Suraksha - Group', productCode: '5010', productType: 'Health Product', proposer: 'Ayushi P', employeeName: 'Shubham Thakre', employeeGroup: 'Health Suraksha', employeeId: 'NA', patient: 'Shubham Thakre', relationship: 'Self', dob: '42 / 12-03-1995', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'LN7R62PA68', emailId: '-', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '02 Jul 2026', partnerRefId: '-', startDate: '10/09/2023', endDate: '09/09/2024', sumInsured: '₹3,00,000', corporate: 'ABC Corp Pvt Ltd', status: 'Expired', contactNo: '', altContactNo: '', altEmail: '' }
        ],
        /* Scenario 1: Single policy, no active claims */
        'HEGIC0001': [
          { hegic: 'HEGIC0001', policyNumber: '2800 0000 7712 4401', product: 'Optima Restore - Individual', productCode: '5031', productType: 'Health Product', proposer: 'Vikram Mehta', employeeName: 'Vikram Mehta', employeeGroup: 'Optima Restore', employeeId: 'NA', patient: 'Vikram Mehta', relationship: 'Self', dob: '38 / 15-07-1988', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'QR8T45YW12', emailId: 'vikram.mehta@email.com', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '04 Aug 2026', partnerRefId: '-', startDate: '01/04/2026', endDate: '31/03/2027', sumInsured: '₹10,00,000', corporate: 'Individual', status: 'Active', contactNo: '9823456781', altContactNo: '', altEmail: '' }
        ],
        /* Scenario 2: Single policy, with active claims */
        'HEGIC0002': [
          { hegic: 'HEGIC0002', policyNumber: '2800 0000 8834 5502', product: 'Optima Secure - Family Floater', productCode: '5024', productType: 'Health Product', proposer: 'Anita Desai', employeeName: 'Anita Desai', employeeGroup: 'Optima Secure', employeeId: 'NA', patient: 'Anita Desai', relationship: 'Self', dob: '45 / 22-11-1980', gender: 'Female', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'MK3P78NB55', emailId: 'anita.desai@email.com', sourceOfIntimation: 'Hospital Walk-in', intimationGivenBy: '-', intimationDate: '01 Aug 2026', partnerRefId: '-', startDate: '15/01/2026', endDate: '14/01/2027', sumInsured: '₹15,00,000', corporate: 'Individual', status: 'Active', contactNo: '9812345670', altContactNo: '9898765432', altEmail: 'anita.alt@email.com' }
        ],
        /* Scenario 3: Multiple policies, no active claims */
        'HEGIC0003': [
          { hegic: 'HEGIC0003', policyNumber: '2800 0000 9901 6603', product: 'Optima Secure - Individual', productCode: '5023', productType: 'Health Product', proposer: 'Rajesh Kumar', employeeName: 'Rajesh Kumar', employeeGroup: 'Optima Secure', employeeId: 'EMP-4421', patient: 'Rajesh Kumar', relationship: 'Self', dob: '35 / 08-04-1991', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'WT5D23KL90', emailId: 'rajesh.kumar@corp.com', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '30 Jul 2026', partnerRefId: '-', startDate: '01/06/2026', endDate: '31/05/2027', sumInsured: '₹5,00,000', corporate: 'TechMinds Pvt Ltd', status: 'Active', contactNo: '9765432100', altContactNo: '', altEmail: '' },
          { hegic: 'HEGIC0003', policyNumber: '2800 0000 9901 7704', product: 'Health Suraksha - Group', productCode: '5010', productType: 'Health Product', proposer: 'Rajesh Kumar', employeeName: 'Rajesh Kumar', employeeGroup: 'Health Suraksha', employeeId: 'EMP-4421', patient: 'Rajesh Kumar', relationship: 'Self', dob: '35 / 08-04-1991', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'WT5D23KL90', emailId: 'rajesh.kumar@corp.com', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '30 Jul 2026', partnerRefId: '-', startDate: '10/03/2026', endDate: '09/03/2027', sumInsured: '₹3,00,000', corporate: 'TechMinds Pvt Ltd', status: 'Active', contactNo: '9765432100', altContactNo: '', altEmail: '' },
          { hegic: 'HEGIC0003', policyNumber: '2800 0000 9901 8805', product: 'Optima Restore - Family', productCode: '5032', productType: 'Health Product', proposer: 'Rajesh Kumar', employeeName: 'Rajesh Kumar', employeeGroup: 'Optima Restore', employeeId: 'EMP-4421', patient: 'Rajesh Kumar', relationship: 'Self', dob: '35 / 08-04-1991', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'WT5D23KL90', emailId: 'rajesh.kumar@corp.com', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '30 Jul 2026', partnerRefId: '-', startDate: '01/01/2024', endDate: '31/12/2024', sumInsured: '₹8,00,000', corporate: 'Individual', status: 'Expired', contactNo: '9765432100', altContactNo: '', altEmail: '' }
        ],
        /* Scenario 4: Multiple policies, with active claims */
        'HEGIC0004': [
          { hegic: 'HEGIC0004', policyNumber: '2800 0000 1122 3344', product: 'Optima Secure - Individual', productCode: '5023', productType: 'Health Product', proposer: 'Priya Sharma', employeeName: 'Priya Sharma', employeeGroup: 'Optima Secure', employeeId: 'NA', patient: 'Priya Sharma', relationship: 'Self', dob: '32 / 19-09-1993', gender: 'Female', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'AB9C12XY34', emailId: 'priya.sharma@email.com', sourceOfIntimation: 'Call Centre', intimationGivenBy: '-', intimationDate: '02 Aug 2026', partnerRefId: '-', startDate: '01/05/2026', endDate: '30/04/2027', sumInsured: '₹7,50,000', corporate: 'Individual', status: 'Active', contactNo: '9845671230', altContactNo: '9876001234', altEmail: 'priya.alt@email.com' },
          { hegic: 'HEGIC0004', policyNumber: '2800 0000 5566 7788', product: 'Optima Restore - Family Floater', productCode: '5032', productType: 'Health Product', proposer: 'Priya Sharma', employeeName: 'Priya Sharma', employeeGroup: 'Optima Restore', employeeId: 'NA', patient: 'Priya Sharma', relationship: 'Self', dob: '32 / 19-09-1993', gender: 'Female', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'AB9C12XY34', emailId: 'priya.sharma@email.com', sourceOfIntimation: 'Call Centre', intimationGivenBy: '-', intimationDate: '02 Aug 2026', partnerRefId: '-', startDate: '15/02/2026', endDate: '14/02/2027', sumInsured: '₹12,00,000', corporate: 'DataFlow Systems', status: 'Active', contactNo: '9845671230', altContactNo: '', altEmail: '' },
          { hegic: 'HEGIC0004', policyNumber: '2800 0000 9900 1122', product: 'Health Suraksha - Individual', productCode: '5010', productType: 'Health Product', proposer: 'Priya Sharma', employeeName: 'Priya Sharma', employeeGroup: 'Health Suraksha', employeeId: 'NA', patient: 'Priya Sharma', relationship: 'Self', dob: '32 / 19-09-1993', gender: 'Female', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'AB9C12XY34', emailId: 'priya.sharma@email.com', sourceOfIntimation: 'Call Centre', intimationGivenBy: '-', intimationDate: '02 Aug 2026', partnerRefId: '-', startDate: '01/08/2023', endDate: '31/07/2024', sumInsured: '₹4,00,000', corporate: 'Individual', status: 'Expired', contactNo: '9845671230', altContactNo: '', altEmail: '' }
        ]
      };

      function ieDefaultPolicy() {
        return { hegic: 'MI260000366639', policyNumber: '2800 0000 3218 2200', product: 'Optima Secure - Individual', productCode: '5023', productType: 'Health Product', proposer: 'Ravi Kapoor', employeeName: 'Neha Kapoor', employeeGroup: 'Optima Secure', employeeId: 'NA', patient: 'Neha Kapoor', relationship: 'Self', dob: '42 / 24-02-1984', gender: 'Male', aadhaar: '-', patientId: '-', abhaId: '-', pehchan: 'LN7R62PA68', emailId: '-', sourceOfIntimation: 'Courier', intimationGivenBy: '-', intimationDate: '02 Jul 2026', partnerRefId: '-', startDate: '15/06/2026', endDate: '14/06/2027', sumInsured: '₹5,00,000', corporate: 'Individual', status: 'Active', contactNo: '9988776655', altContactNo: '', altEmail: '' };
      }

      /* ---------- Helpers ---------- */
      function ieRenderPolicyGrid(containerId, policy, contactId, altContactId, altEmailId) {
        var grid = document.getElementById(containerId);
        if (!grid) return;
        grid.innerHTML = [
          ['HEGIC Card No.',                     policy.hegic        || '-'],
          ['Policy Number',                      policy.policyNumber || '-'],
          ['Product Name',                       policy.product      || '-'],
          ['Product Code',                       policy.productCode  || '-'],
          ['Product Type',                       policy.productType  || '-'],
          ['Proposer Name',                      policy.proposer     || '-'],
          ['Employee Name',                      policy.employeeName || policy.patient || '-'],
          ['Employee Group',                     policy.employeeGroup|| '-'],
          ['Employee ID',                        policy.employeeId   || '-'],
          ['Patient Name',                       policy.patient      || '-'],
          ['Relationship',                       policy.relationship || '-'],
          ['Age / DOB',                          policy.dob          || '-'],
          ['Gender',                             policy.gender       || '-'],
          ['Aadhaar Card No. (Last 4 digits)',   policy.aadhaar      || '-'],
          ['Patient ID',                         policy.patientId    || '-'],
          ['ABHA ID',                            policy.abhaId       || '-'],
          ['Pehchan Number',                     policy.pehchan      || '-'],
          ['Email ID',                           policy.emailId      || '-'],
          ['Partner Reference ID',               policy.partnerRefId       || '-']
        ].map(function (f) {
          return '<div class="field"><label>' + f[0] + '</label><input type="text" value="' + (f[1]||'').replace(/"/g,'&quot;') + '" disabled></div>';
        }).join('');
        if (contactId) document.getElementById(contactId).value = policy.contactNo || '9876543210';
        if (altContactId) document.getElementById(altContactId).value = policy.altContactNo || '';
        if (altEmailId) document.getElementById(altEmailId).value = policy.altEmail || '';
      }

      function ieRenderHospGrid(containerId, idPrefix) {
        /* Static HTML cards are now used for hospital grids (see card-ie-hospitalization / card-ie-ex-hospitalization).
           This function is kept for compatibility but no longer rebuilds the grid. */
        var grid = document.getElementById(containerId);
        if (!grid) return;
        /* Clear only if grid is truly empty (first call) so we don't clobber the static fields */
      }

      /* HOSPITAL_MASTER, initHospitalSearch, initClaimAmtValidation, initIntegrationErrDemo
         are now declared at script-scope above — accessible from all DOMContentLoaded handlers */

      /* ieRemarkRow() removed — Inward Entry Remarks cards (New & Existing
         Claim flows) now render through renderCombinedRemarksTable() the
         same way Claim Intimation's do (see ieNewRemarksLocal /
         ieExRemarksLocal and renderIeNewRemarksTrail / renderIeExRemarksTrail
         below), so the old innerHTML-append row builder is unused. */

      /* =====================================================================
         SHARED: Document Management upload widget (drag & drop + tag +
         preview + "Uploaded by You" list). This single factory backs the
         Document Upload card for every module that has one — Inward Entry
         (#card-ie-uploadnew, both New- and Existing-claim paths) and Claim
         Intimation (#card-claimuploadnew). Same markup, CSS classes, icons,
         validation and interactions everywhere; any future enhancement here
         automatically applies to all modules that consume it.
      ===================================================================== */
      function createDocUploadWidget(opts) {
        /* opts: { dropzoneId, fileInputId, docListId, previewEmptyId, previewBodyId,
                   previewNameId, previewFrameId, previewNewTabId, mandatoryCountId, bulkBtnId,
                   getRecord }
           previewNewTabId (optional): id of an "open in new tab" icon button
           in the preview header (mirrors Medico's medUploadPreviewNewTab) —
           wired in renderPreview() to window.open() the same object URL
           used for the iframe/img preview.
           getRecord (optional): () => current target record, or null/undefined
           if there isn't one yet (e.g. a brand-new claim that hasn't been
           created/saved). Mirrors process-claim.js's medUpload* widget: when
           a record is available, tagging a row's category commits the file
           straight into rec.documents (single source of truth, matching
           Medico); when it isn't, the row just remembers its category locally
           until a record exists (matching Medico's own `if (!rec)` fallback
           in its category-select change handler). */
        var DOC_ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
        var DOC_MANDATORY_TARGET = 5;
        var files = [], selectedId = null, seq = 0;
        /* Categories collapsed (closed) in the grouped/accordion section
           below the upload footer — tracked by category name so state
           survives a re-render (e.g. after tagging another file). All
           categories start collapsed. */
        var groupedCollapsed = {};
        /* Backing store for the grouped/accordion view when there's no
           record yet (getRecord() returns null) — mirrors rec.documents'
           shape ({ category: { fileName, fileSize, file, uploadedBy } })
           so saveFiles()/renderGroupedList() can treat both cases the
           same way. */
        var localSavedDocs = {};

        function ext(name) { return name.split('.').pop().toLowerCase(); }
        function getRecord() { return typeof opts.getRecord === 'function' ? opts.getRecord() : null; }

        function addFiles(fileList) {
          var rejected = [];
          Array.from(fileList).forEach(function (file) {
            if (!DOC_ALLOWED_EXT.includes(ext(file.name))) { rejected.push(file.name); return; }
            seq++;
            files.push({ id: 'doc-f-' + seq, file: file, category: '' });
          });
          if (rejected.length) alert('Unsupported type, skipped: ' + rejected.join(', '));
          renderDocList(); updateCount();
        }

        /* Same category list used across every Document Upload card
           (see DOCUMENT_CATEGORIES near the top of this file) — kept as a
           single source of truth instead of a per-module duplicate. */

        function makeIconBtn(className, action, id, label, pathD) {
          var btn = document.createElement('button');
          btn.className = className;
          btn.type = 'button';
          if (action) btn.dataset.action = action;
          btn.dataset.id = id;
          btn.title = label;
          btn.setAttribute('aria-label', label);
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + pathD + '</svg>';
          return btn;
        }

        /* Grouped/accordion view of already-attached documents, shown below
           the upload footer (opts.groupedListId) — separate from the flat
           dropzone list above so freshly-added-this-session uploads keep
           behaving exactly as before. Every committed file is grouped by
           its tagged category (the same DOCUMENT_CATEGORIES used in the
           category select), one collapsible accordion section per
           category. Files you uploaded get View/Download/Delete; files
           received/uploaded by someone else get View/Download only. */
        function buildGroupedFileRow(f) {
          var row = document.createElement('div');
          row.className = 'ci-doc-row ci-doc-row--grouped';
          row.dataset.id = f.id;

          /* Filename on its own line (ellipsis if too long to fit), with
             size + status badge on a second line below it — keeps a long
             filename from crowding out the size/badge/actions on a single
             row. */
          var meta = document.createElement('div');
          meta.className = 'ci-doc-meta';
          var name = document.createElement('div');
          name.className = 'ci-doc-name';
          name.title = f.file.name;
          name.textContent = f.file.name;
          meta.appendChild(name);

          var metaRow2 = document.createElement('div');
          metaRow2.className = 'ci-doc-meta-row2';
          var size = document.createElement('div');
          size.className = 'ci-doc-size';
          size.textContent = typeof formatFileSize === 'function' ? formatFileSize(f.file.size) :
            (f.file.size > 1048576 ? (f.file.size / 1048576).toFixed(1) + ' MB' : Math.round(f.file.size / 1024) + ' KB');
          metaRow2.appendChild(size);

          var badge = document.createElement('span');
          badge.className = 'badge' + (f.uploadedBy === 'you' ? ' amber' : '');
          badge.textContent = f.uploadedBy === 'you' ? 'Uploaded by You' : 'Received';
          metaRow2.appendChild(badge);

          if (f.uploadedAt) {
            var stamp = document.createElement('div');
            stamp.className = 'ci-doc-timestamp';
            stamp.textContent = typeof fmtDateTime === 'function' ? fmtDateTime(f.uploadedAt) : new Date(f.uploadedAt).toLocaleString();
            metaRow2.appendChild(stamp);
          }
          meta.appendChild(metaRow2);
          row.appendChild(meta);

          var actions = document.createElement('div');
          actions.className = 'ci-doc-actions';
          actions.appendChild(makeIconBtn('icon-btn', 'view-staged-doc', f.id, 'View ' + f.file.name,
            '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>'));
          actions.appendChild(makeIconBtn('icon-btn', 'download-staged-doc', f.id, 'Download ' + f.file.name,
            '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="M12 4v12"/><path d="M8 11l4 4 4-4"/>'));
          if (f.uploadedBy === 'you') {
            actions.appendChild(makeIconBtn('row-remove-btn', 'delete-staged-doc', f.id, 'Delete ' + f.file.name,
              '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
          }
          row.appendChild(actions);
          return row;
        }

        /* Reads the current saved-documents map: rec.documents when a
           record exists, localSavedDocs (this widget's own no-record
           fallback store, written by saveFiles()) otherwise. */
        function savedDocsMap() {
          var rec = getRecord();
          return (rec && rec.documents) || localSavedDocs;
        }

        function renderGroupedList() {
          if (!opts.groupedListId) return;
          var container = document.getElementById(opts.groupedListId);
          if (!container) return;
          var docs = savedDocsMap();
          /* Both received/pre-existing docs and files uploaded by the
             current user in this session share this one grouped view now —
             there is no separate flat pre-uploaded card anymore. Indices
             still refer to the doc's position in the FULL docs[cat] array
             (not a filtered view) so View/Download/Delete keep targeting
             the right file. */
          var cats = Object.keys(docs).filter(function (c) {
            return docs[c] && docs[c].length;
          });
          if (!cats.length) { container.innerHTML = ''; container.classList.add('hidden'); return; }
          container.classList.remove('hidden');

          var byCategory = {};
          cats.forEach(function (cat) {
            /* Sorted for display only (newest upload first) — the id keeps
               referring to the doc's original position in docs[cat] so
               View/Download/Delete still target the right one regardless
               of display order. */
            byCategory[cat] = docs[cat]
              .map(function (doc, i) { return { id: cat + '::' + i, category: cat, index: i, file: doc.file, uploadedBy: doc.uploadedBy, uploadedAt: doc.uploadedAt || 0 }; })
              .sort(function (a, b) { return b.uploadedAt - a.uploadedAt; });
          });
          var orderedCats = DOCUMENT_CATEGORIES.filter(function (c) { return byCategory[c]; })
            .concat(cats.filter(function (c) { return !DOCUMENT_CATEGORIES.includes(c); }));

          container.textContent = '';
          var subhead = document.createElement('div');
          subhead.className = 'section-subhead';
          subhead.textContent = 'Attached Documents';
          container.appendChild(subhead);
          var accordion = document.createElement('div');
          accordion.className = 'ci-doc-accordion';
          container.appendChild(accordion);
          orderedCats.forEach(function (cat) {
            var group = byCategory[cat];
            var collapsed = groupedCollapsed[cat] !== false; // default collapsed
            var section = document.createElement('div');
            section.className = 'ci-doc-accordion-section' + (collapsed ? '' : ' expanded');
            section.dataset.category = cat;

            var head = document.createElement('button');
            head.type = 'button';
            head.className = 'ci-doc-accordion-head';
            head.setAttribute('aria-expanded', String(!collapsed));

            var title = document.createElement('span');
            title.className = 'ci-doc-accordion-title';
            title.textContent = cat;
            head.appendChild(title);

            var count = document.createElement('span');
            count.className = 'ci-doc-accordion-count';
            count.textContent = String(group.length);
            head.appendChild(count);

            var chevronNs = 'http://www.w3.org/2000/svg';
            var chevron = document.createElementNS(chevronNs, 'svg');
            chevron.setAttribute('class', 'ci-doc-accordion-chevron');
            chevron.setAttribute('viewBox', '0 0 24 24');
            chevron.setAttribute('width', '16');
            chevron.setAttribute('height', '16');
            chevron.setAttribute('fill', 'none');
            chevron.setAttribute('stroke', 'currentColor');
            chevron.setAttribute('stroke-width', '2');
            var polyline = document.createElementNS(chevronNs, 'polyline');
            polyline.setAttribute('points', '6 9 12 15 18 9');
            chevron.appendChild(polyline);
            head.appendChild(chevron);

            head.addEventListener('click', function () {
              var nowCollapsed = section.classList.contains('expanded');
              groupedCollapsed[cat] = nowCollapsed;
              section.classList.toggle('expanded', !nowCollapsed);
              head.setAttribute('aria-expanded', String(!nowCollapsed));
              body.classList.toggle('hidden', nowCollapsed);
            });
            section.appendChild(head);

            var body = document.createElement('div');
            body.className = 'ci-doc-accordion-body' + (collapsed ? ' hidden' : '');
            group.forEach(function (f) { body.appendChild(buildGroupedFileRow(f)); });
            section.appendChild(body);

            accordion.appendChild(section);
          });

          function parseGroupedId(id) {
            var sep = id.lastIndexOf('::');
            return { category: id.slice(0, sep), index: Number(id.slice(sep + 2)) };
          }

          accordion.querySelectorAll('button[data-action="view-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var ref = parseGroupedId(btn.dataset.id);
              var doc = docs[ref.category] && docs[ref.category][ref.index];
              if (!doc) return;
              window.open(URL.createObjectURL(doc.file), '_blank', 'noopener');
            });
          });
          accordion.querySelectorAll('button[data-action="download-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var ref = parseGroupedId(btn.dataset.id);
              var doc = docs[ref.category] && docs[ref.category][ref.index];
              if (!doc) return;
              var url = URL.createObjectURL(doc.file);
              var a = document.createElement('a');
              a.href = url; a.download = doc.file.name; document.body.appendChild(a); a.click(); a.remove();
            });
          });
          accordion.querySelectorAll('button[data-action="delete-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var ref = parseGroupedId(btn.dataset.id);
              if (docs[ref.category]) {
                docs[ref.category].splice(ref.index, 1);
                if (!docs[ref.category].length) delete docs[ref.category];
              }
              renderGroupedList();
              updateCount();
            });
          });
        }

        function buildDocRow(f) {
          var row = document.createElement('div');
          row.className = 'ci-doc-row' + (selectedId === f.id ? ' selected' : '');
          row.dataset.id = f.id;
          row.setAttribute('role', 'button');
          row.tabIndex = 0;
          row.setAttribute('aria-label', 'Preview ' + f.file.name);

          var meta = document.createElement('div');
          meta.className = 'ci-doc-meta';
          var nameRow = document.createElement('div');
          nameRow.className = 'ci-doc-name-row';
          var name = document.createElement('div');
          name.className = 'ci-doc-name';
          name.title = f.file.name;
          name.textContent = f.file.name;
          nameRow.appendChild(name);
          if (f.committed) {
            var badge = document.createElement('span');
            badge.className = 'badge' + (f.uploadedBy === 'you' ? ' amber' : '');
            badge.textContent = f.uploadedBy === 'you' ? 'Uploaded by You' : 'Received';
            nameRow.appendChild(badge);
          }
          var size = document.createElement('div');
          size.className = 'ci-doc-size';
          size.textContent = typeof formatFileSize === 'function' ? formatFileSize(f.file.size) :
            (f.file.size > 1048576 ? (f.file.size / 1048576).toFixed(1) + ' MB' : Math.round(f.file.size / 1024) + ' KB');
          meta.appendChild(nameRow); meta.appendChild(size);
          row.appendChild(meta);

          var select = document.createElement('select');
          select.className = 'ci-doc-select';
          select.dataset.id = f.id;
          if (!f.committed) {
            var placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.selected = !f.category;
            placeholder.disabled = true;
            placeholder.textContent = '— Tag as category —';
            select.appendChild(placeholder);
          }
          var catOptions = (DOCUMENT_CATEGORIES.includes(f.category) || !f.category) ? DOCUMENT_CATEGORIES : [f.category].concat(DOCUMENT_CATEGORIES);
          catOptions.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            opt.selected = f.category === c;
            select.appendChild(opt);
          });
          row.appendChild(select);

          var actions = document.createElement('div');
          actions.className = 'ci-doc-actions';
          if (f.committed) {
            actions.appendChild(makeIconBtn('icon-btn', 'view-staged-doc', f.id, 'View ' + f.file.name,
              '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>'));
            actions.appendChild(makeIconBtn('icon-btn', 'download-staged-doc', f.id, 'Download ' + f.file.name,
              '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="M12 4v12"/><path d="M8 11l4 4 4-4"/>'));
            if (f.uploadedBy !== 'received') {
              actions.appendChild(makeIconBtn('row-remove-btn', 'delete-staged-doc', f.id, 'Delete ' + f.file.name,
                '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
            }
          } else {
            actions.appendChild(makeIconBtn('row-remove-btn', null, f.id, 'Remove ' + f.file.name,
              '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>'));
          }
          row.appendChild(actions);

          return row;
        }

        /* The Save Files bar only makes sense once there's something
           tagged-but-unsaved to commit — stays hidden otherwise instead of
           sitting there as a dead button. */
        function updateSaveBarVisibility() {
          if (!opts.saveBarId) return;
          var bar = document.getElementById(opts.saveBarId);
          if (!bar) return;
          var hasUnsaved = files.some(function (f) { return f.committed && !f.saved; });
          bar.classList.toggle('hidden', !hasUnsaved);
        }

        function renderDocList() {
          var list = document.getElementById(opts.docListId);
          if (!list) return;
          list.textContent = '';
          files.forEach(function (f) { list.appendChild(buildDocRow(f)); });
          updateSaveBarVisibility();

          list.querySelectorAll('.ci-doc-row').forEach(function (row) {
            var activate = function () { selectedId = row.dataset.id; renderDocList(); renderPreview(); };
            row.addEventListener('click', function (e) {
              if (e.target.closest('select') || e.target.closest('button')) return;
              activate();
            });
            row.addEventListener('keydown', function (e) {
              if (e.target.closest('select') || e.target.closest('button')) return;
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
            });
          });
          list.querySelectorAll('.ci-doc-select').forEach(function (sel) {
            sel.addEventListener('click', function (e) { e.stopPropagation(); });
            sel.addEventListener('change', function () {
              var f = files.find(function (x) { return x.id === sel.dataset.id; });
              if (!f || !sel.value) return;
              /* Tagging marks the file committed locally (badge + icon-button
                 View/Download/Delete instead of the plain "Remove") so the
                 flat list's own look/behaviour is unchanged — but it no
                 longer writes into rec.documents or the grouped/accordion
                 view immediately. That write only happens when the user
                 clicks Save Files (see saveBtn below), so uploads don't
                 silently appear as "already attached" before being saved. */
              f.category = sel.value;
              f.committed = true;
              f.uploadedBy = 'you';
              renderDocList(); renderPreview(); updateCount();
            });
          });
          list.querySelectorAll('.row-remove-btn[data-id]:not([data-action])').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              files = files.filter(function (x) { return x.id !== btn.dataset.id; });
              if (selectedId === btn.dataset.id) selectedId = null;
              renderDocList(); renderPreview(); updateCount();
            });
          });
          list.querySelectorAll('button[data-action="view-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var f = files.find(function (x) { return x.id === btn.dataset.id; });
              if (!f) return;
              selectedId = f.id; renderDocList(); renderPreview();
            });
          });
          list.querySelectorAll('button[data-action="download-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var f = files.find(function (x) { return x.id === btn.dataset.id; });
              if (!f) return;
              var url = URL.createObjectURL(f.file);
              var a = document.createElement('a');
              a.href = url; a.download = f.file.name; document.body.appendChild(a); a.click(); a.remove();
            });
          });
          list.querySelectorAll('button[data-action="delete-staged-doc"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var f = files.find(function (x) { return x.id === btn.dataset.id; });
              var rec = getRecord();
              if (f && f.saved && rec && rec.documents && rec.documents[f.category]) {
                var idx = rec.documents[f.category].indexOf(f.savedDocEntry);
                if (idx !== -1) rec.documents[f.category].splice(idx, 1);
                if (!rec.documents[f.category].length) delete rec.documents[f.category];
              }
              files = files.filter(function (x) { return x.id !== btn.dataset.id; });
              if (selectedId === btn.dataset.id) selectedId = null;
              renderDocList(); renderPreview(); updateCount(); renderGroupedList();
            });
          });

          // Wrap each row's freshly-rendered .ci-doc-select as a
          // searchable-select, same post-build wiring step as the row's
          // other listeners above.
          initSearchableSelectsIn(list);
        }

        /* Clears the flat in-progress (staged/tagged-but-unsaved) list —
           called when switching to a different claim/record. When a real
           record exists, the grouped/pre-uploaded views read savedDocsMap()
           (rec.documents) live, so nothing further is needed. When there
           is NO record (Inward Entry's mock policy-picker flows), those
           views fall back to localSavedDocs — which starts empty and is
           otherwise only ever written by saveFiles() — so a `docs` map
           passed in here (e.g. the Active Claims scenario's mock
           pre-existing documents) is copied into localSavedDocs, marking
           every entry uploadedBy 'received' unless already tagged
           otherwise, so it shows in the pre-uploaded card exactly like a
           real record's rec.documents would. */
        function rehydrate(docs) {
          files = [];
          selectedId = null;
          localSavedDocs = {};
          if (docs && !getRecord()) {
            Object.keys(docs).forEach(function (cat) {
              var entry = docs[cat];
              var list = Array.isArray(entry) ? entry : [entry];
              localSavedDocs[cat] = list.map(function (doc) {
                return {
                  fileName: doc.fileName, fileSize: doc.fileSize, file: doc.file,
                  uploadedBy: doc.uploadedBy || 'received', uploadedAt: doc.uploadedAt || 0
                };
              });
            });
          }
          renderDocList(); renderPreview(); updateCount(); renderGroupedList();
        }

        /* Commits every currently-tagged-but-unsaved file (f.committed &&
           !f.saved) into rec.documents, then removes it from the flat
           in-progress list — it now only shows in the grouped/accordion
           view below, matching an already-attached/received document
           exactly. No record yet (e.g. a brand-new claim not yet created)
           -> mark saved locally instead, same as commitSingleFile's own
           no-record fallback. */
        function saveFiles() {
          var rec = getRecord();
          var toSave = files.filter(function (f) { return f.committed && !f.saved; });
          if (!toSave.length) return;
          toSave.forEach(function (f) {
            f.saved = true;
            var docEntry = { fileName: f.file.name, fileSize: formatFileSize(f.file.size), file: f.file, uploadedBy: 'you', uploadedAt: Date.now() };
            f.savedDocEntry = docEntry;
            /* Appends to the category's array instead of overwriting — a
               category can already hold earlier saved/received files, and
               adding another shouldn't delete them. */
            if (rec) {
              rec.documents = rec.documents || {};
              rec.documents[f.category] = rec.documents[f.category] || [];
              rec.documents[f.category].push(docEntry);
            } else {
              localSavedDocs[f.category] = localSavedDocs[f.category] || [];
              localSavedDocs[f.category].push(docEntry);
            }
          });
          files = files.filter(function (f) { return !f.saved; });
          if (selectedId && !files.some(function (f) { return f.id === selectedId; })) selectedId = null;
          renderDocList(); renderPreview(); updateCount(); renderGroupedList();
        }

        function renderPreview() {
          var empty = document.getElementById(opts.previewEmptyId);
          var body = document.getElementById(opts.previewBodyId);
          var f = files.find(function (x) { return x.id === selectedId; });
          if (!f) { if (empty) empty.classList.remove('hidden'); if (body) body.classList.add('hidden'); return; }
          if (empty) empty.classList.add('hidden');
          if (body) body.classList.remove('hidden');
          var nameEl = document.getElementById(opts.previewNameId);
          if (nameEl) nameEl.textContent = f.file.name;
          var frame = document.getElementById(opts.previewFrameId);
          if (!frame) return;
          var e = ext(f.file.name), url = URL.createObjectURL(f.file);
          if (['jpg', 'jpeg', 'png'].includes(e)) frame.innerHTML = '<img src="' + url + '" alt="' + f.file.name + '">';
          else if (e === 'pdf') frame.innerHTML = '<iframe src="' + url + '"></iframe>';
          else frame.innerHTML = '<span class="ci-no-preview">Preview not available for .' + e + ' files.</span>';
          if (opts.previewNewTabId) {
            var newTabBtn = document.getElementById(opts.previewNewTabId);
            if (newTabBtn) newTabBtn.onclick = function () { window.open(url, '_blank', 'noopener'); };
          }
        }

        /* Counts saved documents (rec.documents, or localSavedDocs when
           there's no record yet) against the mandatory target — a file
           only counts once it's been through Save Files, not the moment
           it's tagged, matching the grouped/accordion view it feeds. */
        function updateCount() {
          var docs = savedDocsMap();
          var total = Object.keys(docs).filter(function (c) { return docs[c] && docs[c].length; }).length;
          var el = document.getElementById(opts.mandatoryCountId);
          if (el) el.textContent = Math.min(total, DOC_MANDATORY_TARGET) + ' / ' + DOC_MANDATORY_TARGET + ' mandatory documents uploaded';
        }

        /* wire dropzone */
        var dz = document.getElementById(opts.dropzoneId);
        var fi = document.getElementById(opts.fileInputId);
        if (dz && fi) {
          dz.addEventListener('click', function () { fi.click(); });
          fi.addEventListener('change', function (e) { if (e.target.files.length) addFiles(e.target.files); fi.value = ''; });
          ['dragenter', 'dragover'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
          });
          ['dragleave', 'drop'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); });
          });
          dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
        }
        var bulkBtn = document.getElementById(opts.bulkBtnId);
        if (bulkBtn && fi) bulkBtn.addEventListener('click', function () { fi.click(); });

        renderDocList(); renderPreview(); updateCount(); renderGroupedList();

        /* Public API — lets callers (e.g. Cancel actions) clear the widget
           back to its empty state without recreating it, and rehydrate it
           from a documents map when the target record/claim becomes known
           or changes (selection, re-opening an existing claim, etc). */
        return {
          reset: function () {
            files = []; selectedId = null; seq = 0;
            localSavedDocs = {};
            if (fi) fi.value = '';
            renderDocList(); renderPreview(); updateCount(); renderGroupedList();
          },
          rehydrate: rehydrate,
          /* Stages a single file as an already-tagged, committed row in the
             flat in-progress list — same as tagging a dropzone upload via
             the category select — instead of writing straight into
             rec.documents. It only moves into the grouped/accordion view
             once the user clicks Save Files, same as every other upload
             path here. */
          commitSingleFile: function (file, category) {
            seq++;
            files.push({ id: 'doc-f-' + seq, file: file, category: category, committed: true, uploadedBy: 'you' });
            renderDocList(); renderPreview(); updateCount();
          },
          saveFiles: saveFiles
        };
      }

      /* =====================================================================
         SHARED: Document Checklist card ("Required Claim Documents
         Received"). Mirrors process-claim.js's PENNY_DROP_CHECKLIST_ITEMS /
         renderPennyDropChecklist exactly (same 8 items, same markup), but
         generalised to work against either a real record (Claim Intimation)
         or a plain local state object (IE New / IE Existing, which have no
         backing `entries` record — see createDocUploadWidget's own
         getRecord fallback for the same pattern). Checkbox state persists
         on rec.pennyDropChecklist when a record is available; otherwise it
         persists on the local object passed in as `localState`. */
      var PENNY_DROP_CHECKLIST_ITEMS = [
        'Duly Signed Claim Form',
        'Discharge Summary',
        'Final Bill and Receipts',
        'NEFT',
        'KYC (claim amount 1 Lakh and above)',
        'Investigation report',
        'Pharmacy details',
        'MLC (in case accidental claim)'
      ];

      function createPennyDropChecklist(opts) {
        /* opts: { containerId, getRecord, localState }
           getRecord (optional): () => current target record, or null/undefined.
           localState (optional): plain object used as the checklist's
           backing store when getRecord() returns nothing — e.g. IE New/Ex,
           which never create or touch an `entries` record. */
        function store() {
          var rec = typeof opts.getRecord === 'function' ? opts.getRecord() : null;
          if (rec) { rec.pennyDropChecklist = rec.pennyDropChecklist || {}; return rec.pennyDropChecklist; }
          return opts.localState || (opts.localState = {});
        }
        function render() {
          var container = document.getElementById(opts.containerId);
          if (!container) return;
          var checklist = store();
          container.innerHTML = PENNY_DROP_CHECKLIST_ITEMS.map(function (item) {
            var checked = !!checklist[item];
            return '<label class="req-doc-item"><input type="checkbox" class="req-doc-checkbox" data-item="' +
              item + '" ' + (checked ? 'checked' : '') + '><span>' + item + '</span></label>';
          }).join('');
          container.querySelectorAll('.req-doc-checkbox').forEach(function (cb) {
            cb.addEventListener('change', function () {
              store()[cb.dataset.item] = cb.checked;
            });
          });
        }
        render();
        return { render: render };
      }

      /* =====================================================================
         SHARED: Documents card header quick-upload control (category select
         + Upload button + "Other (specify)" custom-type field). Mirrors
         process-claim.js's renderMedicoDocCategoryOptions / medDocFileInput
         change handler exactly — the select lists DOCUMENT_CATEGORIES minus
         whatever's already in rec.documents, plus a trailing "Other
         (specify)" option; picking a file commits it straight into the
         shared document-upload widget via commitSingleFile(), so this and
         the dropzone/bulk-upload path stay two entry points into the same
         state (files / rec.documents), exactly as in Medico. */
      function createDocHeaderControls(opts) {
        /* opts: { selectId, fileInputId, otherFieldId, otherLabelId,
                   getRecord, widget } */
        var ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];

        function getRecord() { return typeof opts.getRecord === 'function' ? opts.getRecord() : null; }

        function renderCategoryOptions() {
          var select = document.getElementById(opts.selectId);
          if (!select) return;
          /* Every category stays selectable, even ones that already have
             saved documents — a category can hold more than one file, so
             uploading another under an already-used category adds to it
             instead of being blocked. */
          select.innerHTML = DOCUMENT_CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') +
            '<option value="__other__">Other (specify)</option>';
          // The <option> list was just replaced wholesale — re-sync the
          // searchable-select proxy's visible label (see
          // shared/searchable-select.js). No-op before this select has
          // been wrapped yet (first page-load call, before the blanket
          // initSearchableSelectsIn(document) sweep runs).
          refreshSearchableSelectLabel(opts.selectId);
        }

        var select = document.getElementById(opts.selectId);
        var otherField = document.getElementById(opts.otherFieldId);
        var otherLabel = document.getElementById(opts.otherLabelId);
        var fileInput = document.getElementById(opts.fileInputId);

        if (select && otherField) {
          select.addEventListener('change', function (e) {
            otherField.classList.toggle('hidden', e.target.value !== '__other__');
          });
        }

        if (fileInput) {
          fileInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var category = select ? select.value : '';

            if (category === '__other__') {
              category = otherLabel ? otherLabel.value.trim() : '';
              if (!category) {
                alert('Enter a custom document type before uploading.');
                e.target.value = '';
                return;
              }
            }

            var ext = file.name.split('.').pop().toLowerCase();
            if (ALLOWED_EXTS.indexOf(ext) === -1) {
              alert("This file type isn't supported. Upload a PDF, JPEG, PNG or TIFF file.");
              e.target.value = '';
              return;
            }

            opts.widget.commitSingleFile(file, category);

            if (otherField) otherField.classList.add('hidden');
            if (otherLabel) otherLabel.value = '';
            e.target.value = '';
            renderCategoryOptions();
          });
        }

        renderCategoryOptions();
        return { renderCategoryOptions: renderCategoryOptions };
      }

      /* ---------- Initialise upload widgets (Inward Entry + Claim Intimation) ---------- */
      /* IE New / IE Existing Claim are both mock policy-picker flows that
         never create or touch an `entries` record (unlike Medico / Claim
         Intimation, which always process an already-created inward record)
         — so neither widget gets a getRecord callback and both stay on the
         local-only "no record yet" path permanently, exactly like Medico's
         own `if (!rec)` fallback. Their pre-existing ("Received") documents
         are rehydrated straight from the mock docs object instead of
         rec.documents — see ieRenderPolicyDetails / the Existing Claim
         select handler below. */
      var ieNewUploadWidget = createDocUploadWidget({
        dropzoneId: 'ieNewDropzone', fileInputId: 'ieNewFileInput', docListId: 'ieNewUploadList',
        previewEmptyId: 'ieNewPreviewEmpty', previewBodyId: 'ieNewPreviewBody',
        previewNameId: 'ieNewPreviewName', previewFrameId: 'ieNewPreviewFrame', previewNewTabId: 'ieNewPreviewNewTab',
        mandatoryCountId: 'ieNewMandatoryCount', bulkBtnId: 'ieNewBulkUploadBtn',
        groupedListId: 'ieNewDocGroupedList', saveBarId: 'ieNewDocSaveBar'
      });
      var ieNewDocSaveBtnEl = document.getElementById('ieNewDocSaveBtn');
      if (ieNewDocSaveBtnEl) ieNewDocSaveBtnEl.addEventListener('click', function () { ieNewUploadWidget.saveFiles(); });
      var ieExUploadWidget = createDocUploadWidget({
        dropzoneId: 'ieExDropzone', fileInputId: 'ieExFileInput', docListId: 'ieExUploadList',
        previewEmptyId: 'ieExPreviewEmpty', previewBodyId: 'ieExPreviewBody',
        previewNameId: 'ieExPreviewName', previewFrameId: 'ieExPreviewFrame', previewNewTabId: 'ieExPreviewNewTab',
        mandatoryCountId: 'ieExMandatoryCount', bulkBtnId: 'ieExBulkUploadBtn',
        groupedListId: 'ieExDocGroupedList', saveBarId: 'ieExDocSaveBar'
      });
      var ieExDocSaveBtnEl = document.getElementById('ieExDocSaveBtn');
      if (ieExDocSaveBtnEl) ieExDocSaveBtnEl.addEventListener('click', function () { ieExUploadWidget.saveFiles(); });
      /* Claim Intimation always processes an already-created inward record
         (openClaimIntimationFlow / openClaimIntimationFromPhysicalDoc /
         ciRenderPolicyDetailsFromMock all set claimTargetId to a real
         entries[] row before the Document Upload card is shown), so it gets
         a getRecord callback and commits tagged files straight into
         rec.documents, matching Medico exactly. */
      ciUploadWidget = createDocUploadWidget({
        dropzoneId: 'ciDropzone', fileInputId: 'ciFileInput', docListId: 'ciDocList',
        previewEmptyId: 'ciPreviewEmpty', previewBodyId: 'ciPreviewBody',
        previewNameId: 'ciPreviewName', previewFrameId: 'ciPreviewFrame', previewNewTabId: 'ciPreviewNewTab',
        mandatoryCountId: 'ciMandatoryCount', bulkBtnId: 'ciBulkUploadBtn',
        groupedListId: 'ciDocGroupedList', saveBarId: 'ciDocSaveBar',
        getRecord: function () { return entries.find(function (x) { return x.inwardId === claimTargetId; }); }
      });
      var ciDocSaveBtnEl = document.getElementById('ciDocSaveBtn');
      if (ciDocSaveBtnEl) ciDocSaveBtnEl.addEventListener('click', function () { ciUploadWidget.saveFiles(); });

      var ieNewDocHeaderControls = createDocHeaderControls({
        selectId: 'ieNewDocCategorySelect', fileInputId: 'ieNewDocFileInput',
        otherFieldId: 'ieNewDocOtherField', otherLabelId: 'ieNewDocOtherLabel',
        widget: ieNewUploadWidget
      });
      var ieExDocHeaderControls = createDocHeaderControls({
        selectId: 'ieExDocCategorySelect', fileInputId: 'ieExDocFileInput',
        otherFieldId: 'ieExDocOtherField', otherLabelId: 'ieExDocOtherLabel',
        widget: ieExUploadWidget
      });
      ciDocHeaderControls = createDocHeaderControls({
        selectId: 'ciDocCategorySelect', fileInputId: 'ciDocFileInput',
        otherFieldId: 'ciDocOtherField', otherLabelId: 'ciDocOtherLabel',
        widget: ciUploadWidget,
        getRecord: function () { return entries.find(function (x) { return x.inwardId === claimTargetId; }); }
      });

      ciChecklist = createPennyDropChecklist({
        containerId: 'ciPennyDropChecklist',
        getRecord: function () { return entries.find(function (x) { return x.inwardId === claimTargetId; }); }
      });

      /* index.html's own Medico section (#card-medchecklist / #card-meddocuments,
         formerly #card-meduploadnew) sits inside a standalone "Member &
         Hospital" mock block that no button, step, or other script anywhere
         in this file ever shows, targets by id, or otherwise wires up — the
         full Medico wizard actually lives in process-claim.html/js. It was
         confirmed orphaned/dead markup before this change and stays that
         way structurally; it's initialised here only so the Document
         Checklist + Documents card behave correctly on the rare chance the
         card is unhidden manually, using the same local-only "no backing
         record" pattern as IE New/Existing above (nothing in this file ever
         creates a real record for it). */
      var medDocLocalChecklist = {};
      var medUploadWidget = createDocUploadWidget({
        dropzoneId: 'medUploadDropzone', fileInputId: 'medUploadFileInput', docListId: 'medUploadDocList',
        previewEmptyId: 'medUploadPreviewEmpty', previewBodyId: 'medUploadPreviewBody',
        previewNameId: 'medUploadPreviewName', previewFrameId: 'medUploadPreviewFrame', previewNewTabId: 'medUploadPreviewNewTab',
        mandatoryCountId: 'medUploadMandatoryCount', bulkBtnId: 'medBulkUploadBtn'
      });
      var medDocHeaderControls = createDocHeaderControls({
        selectId: 'medDocCategorySelect', fileInputId: 'medDocFileInput',
        otherFieldId: 'medDocOtherField', otherLabelId: 'medDocOtherLabel',
        widget: medUploadWidget
      });
      var medChecklist = createPennyDropChecklist({ containerId: 'medPennyDropChecklist', localState: medDocLocalChecklist });

      /* ieNewActiveClaimDocs / ieExSelectedDocs formerly fed the "Documents"
         (received) list cards for these two flows via bindDocTileListActions;
         those cards were removed (only the Document Upload card remains, same
         as Medico), so that wiring is gone too. */
      var ieNewActiveClaimDocs = null;

      /* ============================================================
         NEW CLAIM FLOW
      ============================================================ */

      /* Search criteria validation helper — also defined globally below */

      /* Dummy pre-existing documents shown when the user picks the single
         enabled "Active" claim off the Active Claims grid (see
         ieRenderClaimsGrid) — that claim was already intimated earlier, so
         its documents are already on file rather than needing a fresh
         upload. */
      var IE_NEW_ACTIVE_CLAIM_DOCS_MOCK = {
        'Discharge Sheet': [{ fileName: 'discharge-summary.pdf', fileSize: '842 KB', file: new File([new Blob(['Mock discharge summary'], { type: 'application/pdf' })], 'discharge-summary.pdf', { type: 'application/pdf' }), uploadedBy: 'received' }],
        'Bill Entries': [{ fileName: 'hospital-bill.pdf', fileSize: '1.1 MB', file: new File([new Blob(['Mock hospital bill'], { type: 'application/pdf' })], 'hospital-bill.pdf', { type: 'application/pdf' }), uploadedBy: 'received' }],
        'KYC Documents': [{ fileName: 'kyc-proof.pdf', fileSize: '512 KB', file: new File([new Blob(['Mock KYC document'], { type: 'application/pdf' })], 'kyc-proof.pdf', { type: 'application/pdf' }), uploadedBy: 'received' }]
      };

      /* Left Reference Panel (Inward Entry sidebar) — Claim Summary + Hospitalisation Details.
         Reuses the existing New Claim policy object, hospitalisation fields, and record store —
         no new data model, no new API. Safe to call at any time (falls back to '—' / hides the
         Hospitalisation section when the underlying data isn't there yet). */
      var ieLeftPanelCurrentPolicy = null;
      var ieLeftPanelClaimNo = null;
      var ieLeftPanelClaimStatus = '—';

      function updateIeLeftPanel() {
        var setVal = function (id, val) {
          var el = document.getElementById(id);
          if (el) el.textContent = (val === undefined || val === null || val === '') ? '—' : val;
        };

        var policy = ieLeftPanelCurrentPolicy;
        setVal('lpsClaimNo', ieLeftPanelClaimNo);
        setVal('lpsPolicyNo', policy ? policy.policyNumber : null);
        setVal('lpsPatientName', policy ? policy.patient : null);
        var hospName = (document.getElementById('ieHospSearchInput') && document.getElementById('ieHospSearchInput').value.trim()) ||
                        (document.getElementById('ieNewHospName') && document.getElementById('ieNewHospName').value.trim());
        setVal('lpsHospitalName', hospName);
        setVal('lpsClaimStatus', ieLeftPanelClaimStatus !== '—' ? ieLeftPanelClaimStatus : (policy ? 'New' : null));

        var admit = document.getElementById('ieHosp0');
        var discharge = document.getElementById('ieHosp-discharge-date');
        var los = document.getElementById('ieHospDaysCount');
        var room = document.getElementById('ieHosp-room-category');
        var diagnosis = document.getElementById('ieHosp4');
        var hospType = document.getElementById('ieHospType');

        var hasHospData = !!((admit && admit.value) || (discharge && discharge.value) ||
          (room && room.value) || (diagnosis && diagnosis.value.trim()));

        var hospSection = document.getElementById('ieLeftPanelHospDetails');
        if (hospSection) hospSection.classList.toggle('hidden', !hasHospData);

        if (hasHospData) {
          setVal('lpsAdmissionDate', admit && admit.value ? fmtDate(admit.value) : null);
          setVal('lpsDischargeDate', discharge && discharge.value ? fmtDate(discharge.value) : null);
          setVal('lpsLOS', los ? los.value : null);
          setVal('lpsRoomCategory', room ? room.value : null);
          setVal('lpsDiagnosis', diagnosis ? diagnosis.value.trim() : null);
          setVal('lpsTreatingDoctor', null); /* no source field exists yet on this form */
          setVal('lpsHospitalType', hospType ? hospType.value : null);
        }
      }

      function resetIeLeftPanel() {
        ieLeftPanelCurrentPolicy = null;
        ieLeftPanelClaimNo = null;
        ieLeftPanelClaimStatus = '—';
        ['lpsClaimNo', 'lpsPolicyNo', 'lpsPatientName', 'lpsHospitalName', 'lpsClaimStatus',
         'lpsAdmissionDate', 'lpsDischargeDate', 'lpsLOS', 'lpsRoomCategory', 'lpsDiagnosis',
         'lpsTreatingDoctor', 'lpsHospitalType'
        ].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = '—'; });
        var hospSection = document.getElementById('ieLeftPanelHospDetails');
        if (hospSection) hospSection.classList.add('hidden');
      }

      function ieRenderPolicyDetails(policy, isDefaultPolicy, existingDocs) {
        ieRenderPolicyGrid('iePolicyGrid', policy, 'ieContactNo', 'ieAltContactNo', 'ieAltEmail');
        ieRenderHospGrid('ieHospGrid', 'ieHosp');
        ['card-ie-policy', 'card-ie-hospitalization', 'card-ie-caregiver',
          'card-ie-new-remarks', 'card-ie-new-decision'
        ].forEach(function (id) { document.getElementById(id).classList.remove('hidden'); });
        // Active Claims / multiple-policy scenario: the selected claim
        // already has documents on file (existingDocs, the mock docs
        // object) — rehydrate the widget so they show in the pre-uploaded
        // Documents card above the upload card. A fresh/no-existing-docs
        // selection just resets to the empty upload-only state.
        ieNewActiveClaimDocs = existingDocs || null;
        document.getElementById('card-ie-uploadnew').classList.remove('hidden');
        if (ieNewUploadWidget) {
          if (existingDocs) ieNewUploadWidget.rehydrate(existingDocs);
          else ieNewUploadWidget.reset();
        }
        if (ieNewDocHeaderControls) ieNewDocHeaderControls.renderCategoryOptions();
        renderIeNewUserRemarks(policy, !!isDefaultPolicy);
        // Inward Entry update: the top Policy Card is intentionally not shown
        // for this workflow — users rely on the Policy Details section
        // (#card-ie-policy / #card-ie-hospitalization) rendered above instead.
        // The shared policySummaryCardCreate element stays hidden (no space
        // reserved) and hidePolicyCard() calls elsewhere keep it that way.
        ieLeftPanelCurrentPolicy = policy;
        if (!existingDocs) { ieLeftPanelClaimNo = null; ieLeftPanelClaimStatus = '—'; }
        updateIeLeftPanel();
      }

      /* Mock claims data keyed by policy number */
      var IE_CLAIMS_MOCK = {
        '2800 0000 3218 2200': [
          { claimNo: 'CLM/2026/004821', intimationDate: '18/06/2026', hospital: 'Kokilaben Dhirubhai Ambani Hospital', claimedAmt: '₹45,200', status: 'Under Process' },
          { claimNo: 'CLM/2025/009134', intimationDate: '11/11/2025', hospital: 'Apollo Hospitals, Mumbai', claimedAmt: '₹1,20,500', status: 'Settled' },
          { claimNo: 'CLM/2025/006672', intimationDate: '03/08/2025', hospital: 'Fortis Hiranandani Hospital', claimedAmt: '₹32,800', status: 'Query Raised' }
        ],
        '2800 0000 4471 9013': [
          { claimNo: 'CLM/2026/003341', intimationDate: '28/04/2026', hospital: 'Nanavati Max Super Speciality', claimedAmt: '₹78,200', status: 'Under Process' },
          { claimNo: 'CLM/2025/011002', intimationDate: '22/12/2025', hospital: 'Wockhardt Hospital, Mumbai Central', claimedAmt: '₹55,000', status: 'Settled' }
        ],
        '2800 0000 5528 6647': [
          { claimNo: 'CLM/2023/007744', intimationDate: '14/10/2023', hospital: 'Lilavati Hospital & Research Centre', claimedAmt: '₹28,600', status: 'Settled' }
        ],
        /* HEGIC0001 — no claims (key intentionally absent) */
        /* HEGIC0002 — single policy with active claims */
        '2800 0000 8834 5502': [
          { claimNo: 'CLM/2026/005917', intimationDate: '12/07/2026', hospital: 'Hinduja Hospital, Mahim', claimedAmt: '₹1,85,000', status: 'Under Process' },
          { claimNo: 'CLM/2026/004102', intimationDate: '05/05/2026', hospital: 'Breach Candy Hospital', claimedAmt: '₹62,400', status: 'Query Raised' },
          { claimNo: 'CLM/2025/010455', intimationDate: '18/11/2025', hospital: 'Jaslok Hospital', claimedAmt: '₹97,800', status: 'Settled' }
        ],
        /* HEGIC0003 — multiple policies, no claims (keys intentionally absent) */
        /* HEGIC0004 — multiple policies with active claims */
        '2800 0000 1122 3344': [
          { claimNo: 'CLM/2026/006210', intimationDate: '20/07/2026', hospital: 'Max Super Speciality, Saket', claimedAmt: '₹2,10,000', status: 'Under Process' },
          { claimNo: 'CLM/2026/005003', intimationDate: '03/06/2026', hospital: 'Medanta - The Medicity', claimedAmt: '₹1,45,000', status: 'Under Process' }
        ],
        '2800 0000 5566 7788': [
          { claimNo: 'CLM/2026/004588', intimationDate: '14/05/2026', hospital: 'BLK-Max Super Speciality Hospital', claimedAmt: '₹78,500', status: 'Settled' }
        ]
      };

      /* ---------------------------------------------------------------
         Inward Entry Remarks (New Claim & Existing Claim flows)
         ---------------------------------------------------------------
         Neither flow has a backing `entries` record (pure mock
         policy/claim picker UI, no save path) — so unlike Claim
         Intimation's rec.stageRemarks, remarks added here have nowhere
         real to live. We keep a small module-scope pseudo-remarks array
         per flow (same closure-scope local-state convention as
         ieNewActiveClaimDocs above) and feed it into the same
         renderCombinedRemarksTable() used by Claim Intimation and the
         Medico wizard, wrapped in a minimal fake record shape
         ({ stageRemarks: { 1: <local array> } }) — single-stage, exactly
         like Claim Intimation's own rec.stageRemarks[1] usage. This
         reuses the shared Stage/Role/Name/Date/Remarks table + pagination
         UI instead of the old plain avatar-card trail, without touching
         renderCombinedRemarksTable itself. */
      var ieNewRemarksLocal = [];
      var ieExRemarksLocal = [];

      /* Same 2 mock items ieOtherUserRemarksMock() used to return — seeded
         once per flow into the local array so re-renders don't duplicate. */
      function ieSeedRemarksMock(arr) {
        if (arr.length) return;
        arr.push(
          { role: 'Non Medico', name: 'Libas Kumar Sharma', datetime: '31/05/2026 18:45:22', text: 'Policy and claim history verified against HEGIC card; proceeding with intimation checks.' },
          { role: 'Medico', name: 'Morla Amrutha', datetime: '01/06/2026 09:12:47', text: 'Awaiting hospital discharge summary before further review.' }
        );
      }

      var ieNewRemarksPageState = {};
      function renderIeNewRemarksTrail() {
        var fakeRec = { stageRemarks: { 1: ieNewRemarksLocal } };
        renderCombinedRemarksTable(fakeRec, {
          bodyId: 'ieNewUserRemarksBody',
          emptyId: 'ieNewUserRemarksEmpty',
          footerId: 'ieNewUserRemarksFooter',
          pagerId: 'ieNewUserRemarksPager',
          pageSizeSelectId: 'ieNewUserRemarksPageSize',
          resultCountId: 'ieNewUserRemarksResultCount',
          pageState: ieNewRemarksPageState,
          stageKeys: [1],
        });
      }

      /* Render the merged Remarks card (card-ie-new-remarks) for the New
         Claim flow. The card itself is now shown unconditionally by
         ieRenderPolicyDetails() alongside its sibling cards (Policy,
         Hospitalisation, Caregiver, Decision) — it holds the add-box, which
         should stay usable regardless of whether a real policy was matched.
         The old card-ie-new-userremarks rule (mock trail hidden for the
         default/no-match policy, since there's no real "other users'"
         history to show for a claim that isn't real yet) now only governs
         whether the mock trail is SEEDED, not whether the whole card shows —
         a fresh empty state still renders correctly either way. */
      function renderIeNewUserRemarks(policy, isDefaultPolicy) {
        var card = document.getElementById('card-ie-new-remarks');
        if (!card) return;
        card.classList.remove('hidden');
        if (!isDefaultPolicy) ieSeedRemarksMock(ieNewRemarksLocal);
        renderIeNewRemarksTrail();
      }

      var ieExRemarksPageState = {};
      function renderIeExRemarksTrail() {
        var fakeRec = { stageRemarks: { 1: ieExRemarksLocal } };
        renderCombinedRemarksTable(fakeRec, {
          bodyId: 'ieExUserRemarksBody',
          emptyId: 'ieExUserRemarksEmpty',
          footerId: 'ieExUserRemarksFooter',
          pagerId: 'ieExUserRemarksPager',
          pageSizeSelectId: 'ieExUserRemarksPageSize',
          resultCountId: 'ieExUserRemarksResultCount',
          pageState: ieExRemarksPageState,
          stageKeys: [1],
        });
      }

      /* Existing Claim flow's Remarks card (card-ie-ex-remarks) has no
         default-policy concept — it's shown unconditionally once a claim
         row is selected (see the ie-ex-select-btn handler), same as
         before this merge. Seeds the mock trail once per claim selection. */
      function renderIeExUserRemarks() {
        ieSeedRemarksMock(ieExRemarksLocal);
        renderIeExRemarksTrail();
      }

      var iePickerPolicies = [];
      var ieSelectedPickerPolicy = null;

      function ieRenderPickerRows(policies, filter) {
        var tbody = document.getElementById('iePolicyPickBody');
        var filtered = filter ? policies.filter(function(p) {
          var q = filter.toLowerCase();
          return (p.patient||'').toLowerCase().includes(q) ||
                 (p.policyNumber||'').toLowerCase().includes(q) ||
                 (p.product||'').toLowerCase().includes(q) ||
                 (p.corporate||'').toLowerCase().includes(q);
        }) : policies;
        if (!filtered.length) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-size:13px;padding:18px;">No policies match your search.</td></tr>';
          return;
        }
        tbody.innerHTML = filtered.map(function (p, i) {
          var realIdx = policies.indexOf(p);
          var bc = p.status === 'Active' ? 'st-active' : 'st-inactive';
          return '<tr data-idx="' + realIdx + '"><td>' + p.patient + '</td><td class="mono">' + p.policyNumber + '</td><td>' + p.product + '</td><td>' + p.corporate + '</td><td>' + p.startDate + ' – ' + p.endDate + '</td><td><span class="status-badge ' + bc + '">' + p.status + '</span></td><td><button type="button" class="btn btn-outline btn-sm ie-policy-pick-btn" data-idx="' + realIdx + '">Select</button></td></tr>';
        }).join('');
        document.querySelectorAll('.ie-policy-pick-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var idx = parseInt(this.dataset.idx);
            document.querySelectorAll('#iePolicyPickBody tr').forEach(function (r) { r.classList.remove('row-selected'); });
            document.querySelectorAll('.ie-policy-pick-btn').forEach(function (b) { b.classList.remove('btn-primary'); b.textContent = 'Select'; });
            this.closest('tr').classList.add('row-selected');
            this.classList.add('btn-primary'); this.textContent = '✓ Selected';
            ieSelectedPickerPolicy = iePickerPolicies[idx];
            ieRenderClaimsGrid(ieSelectedPickerPolicy);
          });
        });
      }

      function ieRenderClaimsGrid(policy) {
        var claims = IE_CLAIMS_MOCK[policy.policyNumber] || [];
        var tbody = document.getElementById('ieClaimsGridBody');
        var empty = document.getElementById('ieClaimsGridEmpty');
        var proceedBtn = document.getElementById('ieClaimsGridProceedBtn');
        document.getElementById('ieClaimsGridHint').textContent = 'Policy ' + policy.policyNumber + ' — ' + policy.patient;
        /* hide downstream cards until claim selected */
        ['card-ie-policy','card-ie-hospitalization','card-ie-caregiver',
         'card-ie-uploadnew','card-ie-new-remarks','card-ie-new-decision'
        ].forEach(function(id){ document.getElementById(id).classList.add('hidden'); });
        hidePolicyCard('policySummaryCardCreate');
        if (!claims.length) {
          tbody.innerHTML = '';
          empty.classList.remove('hidden');
          if (proceedBtn) proceedBtn.classList.remove('hidden');
        } else {
          empty.classList.add('hidden');
          if (proceedBtn) proceedBtn.classList.add('hidden');
          var statusClass = { 'Under Process': 'st-processing', 'Settled': 'st-active', 'Query Raised': 'st-warn', 'Rejected': 'st-inactive', 'Active': 'st-active' };
          /* An "active" claim is one still in flight (not finalised/closed). Only one
             active claim per policy may ever be selected — it already has documents
             attached from the prior intimation, so it's surfaced as the single
             enabled row (status shown as "Active") while any other active claims
             on the same policy are locked out. Settled/Rejected rows are unaffected. */
          var ACTIVE_CLAIM_STATUSES = ['Under Process', 'Query Raised'];
          var firstActiveIdx = -1;
          claims.forEach(function (c, i) {
            if (firstActiveIdx === -1 && ACTIVE_CLAIM_STATUSES.indexOf(c.status) !== -1) firstActiveIdx = i;
          });
          tbody.innerHTML = claims.map(function(c, i) {
            var isActiveClaim = ACTIVE_CLAIM_STATUSES.indexOf(c.status) !== -1;
            var isEnabledActive = isActiveClaim && i === firstActiveIdx;
            var isLocked = isActiveClaim && !isEnabledActive;
            var displayStatus = isEnabledActive ? 'Active' : c.status;
            var sc = statusClass[displayStatus] || 'st-processing';
            var docsNote = isEnabledActive
              ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;">Existing documents already attached</div>'
              : '';
            var actionCell = isLocked
              ? '<button type="button" class="btn btn-outline btn-sm" disabled title="Only one active claim can be selected for this policy">Locked</button>'
              : '<button type="button" class="btn btn-outline btn-sm ie-claim-pick-btn" data-cidx="' + i + '">Select</button>';
            return '<tr data-cidx="' + i + '"' + (isLocked ? ' style="opacity:.55;"' : '') + '><td class="mono" style="font-size:12.5px;">' + c.claimNo + '</td><td>' + c.intimationDate + '</td><td>' + c.hospital + '</td><td style="font-weight:600;">' + c.claimedAmt + '</td><td><span class="status-badge ' + sc + '">' + displayStatus + '</span>' + docsNote + '</td><td>' + actionCell + '</td></tr>';
          }).join('');
          document.querySelectorAll('.ie-claim-pick-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              document.querySelectorAll('#ieClaimsGridBody tr').forEach(function(r){ r.classList.remove('row-selected'); });
              document.querySelectorAll('.ie-claim-pick-btn').forEach(function(b){ b.classList.remove('btn-primary'); b.textContent = 'Select'; });
              this.closest('tr').classList.add('row-selected');
              this.classList.add('btn-primary'); this.textContent = '✓ Selected';
              var cidx = parseInt(this.dataset.cidx);
              var isTheActiveClaim = cidx === firstActiveIdx;
              ieLeftPanelClaimNo = claims[cidx].claimNo;
              ieLeftPanelClaimStatus = isTheActiveClaim ? 'Active' : claims[cidx].status;
              ieRenderPolicyDetails(ieSelectedPickerPolicy, false, isTheActiveClaim ? IE_NEW_ACTIVE_CLAIM_DOCS_MOCK : null);
            });
          });
        }
        document.getElementById('card-ie-claims-grid').classList.remove('hidden');
        document.getElementById('card-ie-claims-grid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function ieRenderPolicyPicker(policies) {
        iePickerPolicies = policies;
        var searchInput = document.getElementById('iePolicyPickSearch');
        searchInput.value = '';
        ieRenderPickerRows(policies, '');
        searchInput.oninput = function() { ieRenderPickerRows(iePickerPolicies, this.value.trim()); };
        document.getElementById('card-ie-claims-grid').classList.add('hidden');
      }

      /* "Proceed as New Claim" button — shown when claims grid has no active claims */
      document.getElementById('ieClaimsGridProceedBtn').addEventListener('click', function () {
        if (ieSelectedPickerPolicy) {
          ieRenderPolicyDetails(ieSelectedPickerPolicy);
        }
      });

      document.getElementById('ieNewSearchBtn').addEventListener('click', function () {
        var any = Array.from(document.querySelectorAll('.ie-new-sf')).some(function (f) { return f.value.trim(); });
        if (!any) { showSearchCriteriaModal(); return; }
        var hegicVal = document.getElementById('ie-new-hegic').value.trim().toUpperCase();
        var pickerCard = document.getElementById('card-ie-policy-picker');
        var matches = IE_MULTI_POLICY_MOCK[hegicVal];
        if (matches) matches = matches.filter(function (p) { return p.status === 'Active'; });

        // document.getElementById('ieNewRetrieveErr').style.display = 'none';
        if (matches && matches.length > 1) {
          ['card-ie-policy', 'card-ie-hospitalization', 'card-ie-caregiver',
            'card-ie-uploadnew', 'card-ie-new-remarks', 'card-ie-new-decision'
          ].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
          hidePolicyCard('policySummaryCardCreate');
          ieRenderPolicyPicker(matches);
          pickerCard.classList.remove('hidden');
        } else if (matches && matches.length === 1) {
          pickerCard.classList.add('hidden');
          /* Check if the single matched policy has active claims */
          var singlePolicy = matches[0];
          var policyClaims = IE_CLAIMS_MOCK[singlePolicy.policyNumber] || [];
          if (policyClaims.length > 0) {
            /* Has claims — show claims grid for selection */
            ieSelectedPickerPolicy = singlePolicy;
            ieRenderClaimsGrid(singlePolicy);
          } else {
            /* No claims — render policy details directly */
            document.getElementById('card-ie-claims-grid').classList.add('hidden');
            ieRenderPolicyDetails(singlePolicy);
          }
        } else {
          pickerCard.classList.add('hidden');
          document.getElementById('card-ie-claims-grid').classList.add('hidden');
          ieRenderPolicyDetails(ieDefaultPolicy(), true);
        }
        this.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> Search';
      });

      document.getElementById('ieNewClearSearchBtn').addEventListener('click', function () {
        document.querySelectorAll('.ie-new-sf').forEach(function (f) { f.value = ''; });
        document.getElementById('card-ie-policy-picker').classList.add('hidden');
        document.getElementById('card-ie-claims-grid').classList.add('hidden');
        ['card-ie-policy','card-ie-hospitalization','card-ie-caregiver',
         'card-ie-uploadnew','card-ie-new-remarks','card-ie-new-decision'
        ].forEach(function(id){ document.getElementById(id).classList.add('hidden'); });
        hidePolicyCard('policySummaryCardCreate');
        // document.getElementById('ieNewRetrieveErr').style.display = 'none';
        document.getElementById('ieNewSearchBtn').textContent = '';
        document.getElementById('ieNewSearchBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> Search';
        ieSelectedPickerPolicy = null;
        iePickerPolicies = [];
        resetIeLeftPanel();
      });

      document.getElementById('ieCgMobile').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });

      /* Remarks — new flow */
      document.getElementById('ieNewRemarksAddBtn').addEventListener('click', function () {
        var inp = document.getElementById('ieNewRemarksInput');
        var text = inp.value.trim();
        if (!text) return;
        ieNewRemarksLocal.push({
          role: 'Inward Entry',
          name: 'Rahul Sharma',
          datetime: formatRemarkTimestamp(new Date()),
          text: text,
        });
        inp.value = '';
        renderIeNewRemarksTrail();
      });

      /* Decision — new flow */
      document.getElementById('ieSaveBtn').addEventListener('click', function () { alert('Draft saved.'); });
      document.getElementById('ieSubmitBtn').addEventListener('click', function () {
        var mobile = document.getElementById('ieCgMobile').value.trim();
        if (mobile && mobile.length !== 10) { alert('Enter a valid 10-digit caregiver mobile number.'); return; }
        var inwardNo = 'INW/' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '/00' + Math.floor(100 + Math.random() * 900);
        document.getElementById('successTitle').textContent = 'Inward Entry Submitted';
        document.getElementById('successSub').textContent = 'Inward entry has been submitted successfully.';
        document.getElementById('modalInwardNo').textContent = inwardNo;
        showSuccessModal({ label: 'View in Inward Entries', onView: switchToListView });
      });
      document.getElementById('ieCancelBtn').addEventListener('click', function () {
        if (confirm('Discard progress and return to Inward Entries?')) {
          document.getElementById('backToListBtn').click();
        }
      });

      /* ============================================================
         EXISTING CLAIM FLOW
      ============================================================ */

      document.getElementById('ieExSearchBtn').addEventListener('click', function () {
        var any = Array.from(document.querySelectorAll('.ie-ex-sf')).some(function (f) { return f.value.trim(); });
        if (!any) { showSearchCriteriaModal(); return; }
        document.getElementById('ieExRetrieveErr').style.display = 'none';
        var tbody = document.getElementById('ieExGridBody');
        var IE_EX_MOCK = [
          { patient: 'Shubham Thakre', policy: '2800 0000 3218 2200', claim: 'CLM/20260610/00042', hospital: 'Apollo Hospital', date: '10/06/2026', status: 'Active' },
          { patient: 'Shubham Thakre', policy: '2800 0000 3218 2200', claim: 'CLM/20260520/00031', hospital: 'Fortis Hospital', date: '20/05/2026', status: 'Closed' }
        ];
        tbody.innerHTML = IE_EX_MOCK.map(function (r) {
          var active = r.status === 'Active';
          return '<tr>' +
            '<td>' + r.patient + '</td><td class="mono">' + r.policy + '</td>' +
            '<td class="mono">' + r.claim + '</td><td>' + r.hospital + '</td>' +
            '<td>' + r.date + '</td>' +
            '<td><span class="status-badge ' + (active ? 'st-active' : 'st-inactive') + '">' + r.status + '</span></td>' +
            '<td>' + (active ? '<button class="btn btn-outline btn-sm ie-ex-select-btn" data-claim="' + r.claim + '" data-policy="' + r.policy + '" data-patient="' + r.patient + '" data-hospital="' + r.hospital + '">Select</button>' : '<span style="color:var(--muted);font-size:12px;">Unavailable</span>') + '</td>' +
            '</tr>';
        }).join('');

        document.getElementById('card-ie-ex-grid').classList.remove('hidden');
        // Hide details cards until a claim row is selected
        ['card-ie-ex-policy', 'card-ie-ex-hospitalization', 'card-ie-ex-caregiver',
          'card-ie-ex-uploadnew', 'card-ie-ex-remarks', 'card-ie-ex-decision'
        ].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
        hidePolicyCard('policySummaryCardCreate');

        document.querySelectorAll('.ie-ex-select-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var wasActive = this.dataset.claim === 'CLM/20260610/00042';
            document.querySelectorAll('.ie-ex-select-btn').forEach(function (b) { b.classList.remove('btn-primary'); b.textContent = 'Select'; });
            this.classList.add('btn-primary'); this.textContent = '✓ Selected';

            /* Render policy details for selected existing claim */
            var mockPolicy = {
              hegic: 'MI260000366639',
              policyNumber: btn.dataset.policy || '2800 0000 3218 2200',
              product: 'Optima Secure - Individual',
              productCode: '5023',
              productType: 'Health Product',
              proposer: 'Ayushi P',
              employeeName: btn.dataset.patient || 'Shubham Thakre',
              employeeGroup: 'Optima Secure',
              employeeId: 'NA',
              patient: btn.dataset.patient || 'Shubham Thakre',
              relationship: 'Self',
              dob: '42 / 12-03-1995',
              gender: 'Male',
              aadhaar: '-',
              patientId: '-',
              abhaId: '-',
              pehchan: 'LN7R62PA68',
              emailId: '-',
              partnerRefId: '-',
              startDate: '15/06/2026',
              endDate: '14/06/2027',
              sumInsured: '₹5,00,000',
              corporate: 'Individual',
              status: 'Active',
              contactNo: '9876543210',
              altContactNo: '',
              altEmail: ''
            };
            ieRenderPolicyGrid('ieExPolicyGrid', mockPolicy, 'ieExContactNo', 'ieExAltContactNo', 'ieExAltEmail');
            ieRenderHospGrid('ieExHospGrid', 'ieExHosp');

            ['card-ie-ex-policy', 'card-ie-ex-hospitalization', 'card-ie-ex-caregiver',
              'card-ie-ex-uploadnew', 'card-ie-ex-remarks', 'card-ie-ex-decision'
            ].forEach(function (id) { document.getElementById(id).classList.remove('hidden'); });
            renderIeExUserRemarks();
            // "Existing Claim" already has documents on file from the
            // earlier intimation (mirrors IE_NEW_ACTIVE_CLAIM_DOCS_MOCK) —
            // rehydrate the widget so they show in the pre-uploaded
            // Documents card above the upload card.
            if (ieExUploadWidget) {
              if (wasActive) ieExUploadWidget.rehydrate(IE_NEW_ACTIVE_CLAIM_DOCS_MOCK);
              else ieExUploadWidget.reset();
            }
            if (ieExDocHeaderControls) ieExDocHeaderControls.renderCategoryOptions();
            // Inward Entry update: Policy Card removed for this workflow —
            // Policy Details section (#card-ie-ex-policy / #card-ie-ex-hospitalization)
            // is the sole source of policy info here now.
            document.getElementById('card-ie-ex-policy').scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      });

      document.getElementById('ieExCgMobile').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
      document.getElementById('ieContactNo').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
      document.getElementById('ieAltContactNo').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
      document.getElementById('ieExContactNo').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
      document.getElementById('ieExAltContactNo').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });

      /* Remarks — existing flow */
      document.getElementById('ieExRemarksAddBtn').addEventListener('click', function () {
        var inp = document.getElementById('ieExRemarksInput');
        var text = inp.value.trim();
        if (!text) return;
        ieExRemarksLocal.push({
          role: 'Inward Entry',
          name: 'Rahul Sharma',
          datetime: formatRemarkTimestamp(new Date()),
          text: text,
        });
        inp.value = '';
        renderIeExRemarksTrail();
      });

      /* Decision — existing flow */
      document.getElementById('ieExSubmitBtn').addEventListener('click', function () {
        var mobile = document.getElementById('ieExCgMobile').value.trim();
        if (mobile && mobile.length !== 10) { alert('Enter a valid 10-digit caregiver mobile number.'); return; }
        var inwardNo = 'INW/' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '/00' + Math.floor(100 + Math.random() * 900);
        document.getElementById('successTitle').textContent = 'Inward Entry Submitted';
        document.getElementById('successSub').textContent = 'Documents linked to existing claim successfully.';
        document.getElementById('modalInwardNo').textContent = inwardNo;
        showSuccessModal({ label: 'View in Inward Entries', onView: switchToListView });
      });
      document.getElementById('ieExCancelBtn').addEventListener('click', function () {
        if (confirm('Discard progress and return to Inward Entries?')) {
          document.getElementById('backToListBtn').click();
        }
      });

      /* ---- Hospital Search: IE New Claim ---- */
      initHospitalSearch({
        inputId: 'ieHospSearchInput', dropdownId: 'ieHospDropdown',
        addBtnId: 'ieAddNewHospBtn', formId: 'ieAddNewHospForm',
        cancelBtnId: 'ieAddNewHospCancelBtn', saveBtnId: 'ieAddNewHospSaveBtn',
        nameDisplayId: 'ieHospNameDisplay',
        addrId: 'ieHospAddr', stateId: 'ieHospState', cityId: 'ieHospCity',
        pinId: 'ieHospPin', rohiniId: 'ieHospRohini',
        nameInputId: 'ieNewHospName', addrInputId: 'ieNewHospAddress',
        stateInputId: 'ieNewHospState', cityInputId: 'ieNewHospCity',
        pinInputId: 'ieNewHospPin', rohiniInputId: 'ieNewHospRohini',
        admitDateId: 'ieHosp0', dischargeDateId: 'ieHosp-discharge-date', daysCountId: 'ieHospDaysCount',
        onChange: updateIeLeftPanel
      });

      /* ---- Left Reference Panel (Claim Summary + Hospitalisation Details): keep in sync
             with the Room Category / Diagnosis fields, which aren't covered by initHospitalSearch's
             own onChange (admission/discharge date + hospital selection already wired above). ---- */
      ['ieHosp-room-category', 'ieHosp4'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', updateIeLeftPanel);
        if (el) el.addEventListener('change', updateIeLeftPanel);
      });

      /* ---- Hospital Search: IE Existing Claim ---- */
      initHospitalSearch({
        inputId: 'ieExHospSearchInput', dropdownId: 'ieExHospDropdown',
        addBtnId: 'ieExAddNewHospBtn', formId: 'ieExAddNewHospForm',
        cancelBtnId: 'ieExAddNewHospCancelBtn', saveBtnId: 'ieExAddNewHospSaveBtn',
        addrId: 'ieExHospAddr', stateId: 'ieExHospState', cityId: 'ieExHospCity',
        pinId: 'ieExHospPin', rohiniId: 'ieExHospRohini',
        nameInputId: 'ieExNewHospName', addrInputId: 'ieExNewHospAddress',
        stateInputId: 'ieExNewHospState', cityInputId: 'ieExNewHospCity',
        pinInputId: 'ieExNewHospPin', rohiniInputId: 'ieExNewHospRohini',
        admitDateId: 'ieExHosp0', dischargeDateId: 'ieExHosp-discharge-date', daysCountId: 'ieExHospDaysCount'
      });

      /* ---- Claim Amount Validation (IE) ---- */
      initClaimAmtValidation('ieHosp5', 'ieClaimAmtErr');
      initClaimAmtValidation('ieExHosp5', 'ieExClaimAmtErr');

      /* ---- Integration Error Demo (type "FAIL" in Policy Number, click Search) ---- */
      initIntegrationErrDemo('ieNewSearchBtn', '#ie-new-policy', 'ieNewPolicyIntegrationErr');
      initIntegrationErrDemo('ieExSearchBtn', '#ie-ex-policy', 'ieExPolicyIntegrationErr');

      var ieNewRetryBtn = document.getElementById('ieNewRetrySearchBtn');
      if (ieNewRetryBtn) {
        ieNewRetryBtn.addEventListener('click', function() {
          document.getElementById('ie-new-policy').value = '';
          document.getElementById('ieNewPolicyIntegrationErr').style.display = 'none';
        });
      }
      var ieExRetryBtn = document.getElementById('ieExRetrySearchBtn');
      if (ieExRetryBtn) {
        ieExRetryBtn.addEventListener('click', function() {
          document.getElementById('ie-ex-policy').value = '';
          document.getElementById('ieExPolicyIntegrationErr').style.display = 'none';
        });
      }

      // Enter-key search handling (data-enter-search-scope /
      // data-enter-search-scope-self) now lives in shared-components.js
      // (initEnterKeySearch) so it works on every page, not just this one.

      /* ---- Meaningful placeholders: search/filter/lookup fields only, and only
             where a placeholder is currently missing — existing, already-descriptive
             placeholders (e.g. "Search by Inward ID, barcode…") are left untouched. ---- */
      (function autoPlaceholders() {
        var scopeSelector = [
          '.ie-new-sf', '.ie-ex-sf', '.eu-search-field', '.policy-search-field',
          '#rdChequeFrom', '#rdChequeTo', '#ailmentModal input[type="text"]'
        ].join(', ');
        document.querySelectorAll(scopeSelector).forEach(function (input) {
          if (input.placeholder) return;
          var field = input.closest('.field');
          var labelEl = field ? field.querySelector('label') : null;
          if (!labelEl) return;
          var labelText = labelEl.textContent.replace(/\*/g, '').replace(/\(optional\)/i, '').trim();
          if (!labelText) return;
          input.placeholder = 'Enter ' + labelText;
        });

        /* Selects inside search dialogs whose first option is a generic
           "--Select--" placeholder: relabel it "Select <Field Label>". Filter
           dropdowns elsewhere (e.g. Source / Email Status) already default to a
           meaningful "All …" option and are left as-is. */
        document.querySelectorAll('#ailmentModal select').forEach(function (select) {
          var firstOpt = select.querySelector('option[value=""]');
          if (!firstOpt || firstOpt.textContent.trim() !== '--Select--') return;
          var field = select.closest('.field');
          var labelEl = field ? field.querySelector('label') : null;
          if (!labelEl) return;
          var labelText = labelEl.textContent.replace(/\*/g, '').trim();
          if (!labelText) return;
          firstOpt.textContent = 'Select ' + labelText;
        });
      })();

      /* Convert every static <select> on this page into the searchable-
         select UI (shared/searchable-select.js), replacing the native
         Room Type/Source/Category/etc. dropdowns with a filterable text
         proxy over the same Hospital Name autocomplete pattern used
         elsewhere in this app. The original <select> stays in the DOM
         (now .sr-only) as the source of truth, so every existing
         .value/.disabled/addEventListener("change", ...) call site for
         these ids keeps working unchanged — see AGENTS.md Iterations.
         Selects rendered later inside dynamic grid rows (Bulk Upload
         category assignment) are wrapped separately, right after their
         own per-row rendering, not here. */
      initSearchableSelectsIn(document);

    });
