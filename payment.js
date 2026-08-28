/* ==========================================================================
   ABC HCP — Payment Page Behaviour
   Extracted from app.js (Role Split Guide, Step 4) — no behaviour change
   ========================================================================== */

    /* fmtDate, fmtCurrency, renderStatusChipGroup, statusDisplayLabel come from
       shared/shared-components.js; ROLES comes from shared/role-config.js —
       both loaded as classic <script> tags before this file, so their
       top-level declarations are already global by the time this script runs. */

    /* =====================================================================
       ROLE SWITCHER (top-right profile)
       Payment page only participates in the shared role list for display;
       switching to any non-Payment role navigates back to index.html.
    ===================================================================== */
    let currentRole = "Payment";

    function renderRoleList() {
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
            currentRole = role;
            document.getElementById("profileRoleName").textContent = currentRole;
            renderRoleList();
            return;
          }
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

    /* =====================================================================
       SUCCESS MODAL (local — Payment page only ever views its own list)
    ===================================================================== */
    function showSuccessModal(opts) {
      const btn = document.getElementById("modalViewBtn");
      btn.textContent = (opts && opts.label) || "View in Payment List";
      document.getElementById("successModal").classList.add("show");
    }
    document.getElementById("modalViewBtn").addEventListener("click", () => {
      document.getElementById("successModal").classList.remove("show");
    });

    /* =====================================================================
       PAYMENT ROLE — TABS
    ===================================================================== */
    const PAYMENT_BUCKET_DATA = [
      { claimId: "CLM-20260609-0071", policy: "HE/HGP/21020101/00/000451", hegic: "2026610060895563", patient: "Ramesh Iyer", claimType: "Health", payType: "NEFT", tdsAmount: 1850, utrn: "UTR2026060900123", status: "Pending", payStatus: null },
      { claimId: "CLM-20260625-0112", policy: "SRK-2026-004299", hegic: "2026610060895564", patient: "Vikram Nair", claimType: "Critical Illness", payType: "NEFT", tdsAmount: 6200, utrn: "UTR2026062500445", status: "Pending", payStatus: null },
      { claimId: "CLM-20260702-0135", policy: "SRK-2026-004560", hegic: "2026610060895565", patient: "Neha Kapoor", claimType: "Death", payType: "RTGS", tdsAmount: 9500, utrn: "UTR2026070200788", status: "Processed", payStatus: null },
      { claimId: "CLM-20260706-0159", policy: "HE/HGP/21020101/00/000602", hegic: "2026610060895566", patient: "Arjun Reddy", claimType: "Critical Illness", payType: "NEFT", tdsAmount: 4100, utrn: "-", status: "On Hold", payStatus: "Hold" },
      { claimId: "CLM-20260710-0179", policy: "SRK-2026-004648", hegic: "2026610060895567", patient: "Shubham Thakre", claimType: "Health", payType: "NEFT", tdsAmount: 1380, utrn: "UTR2026071000999", status: "Pending", payStatus: null },
    ];

    const PAYMENT_REVERSE_DATA = [
      { claimId: "CLM-20260609-0071", patient: "Ramesh Iyer", utr: "UTR2026060900123", date: "2026-06-15", amount: 185000, bank: "Dummy Bank", reason: "Account Number Mismatch", status: "Reversed" },
      { claimId: "CLM-20260628-0120", patient: "Anitha Rao", utr: "UTR2026062800445", date: "2026-07-01", amount: 28500, bank: "ICICI Bank", reason: "Beneficiary Name Mismatch", status: "Reversed" },
      { claimId: "CLM-20260703-0140", patient: "Suresh Pillai", utr: "UTR2026070300788", date: "2026-07-05", amount: 31000, bank: "SBI", reason: "Invalid IFSC", status: "Under Review" },
    ];

    let activePayTab = "bucket";

    // Pending-count badge per tab, matching index.html's Scan Tag tab badges
    // (updateScanTagPendingBadges()): each badge shows the count of that
    // tab's own actionable status, read from the same dataset the table
    // renders from — no duplicate/derived dataset.
    function updatePayTabBadges() {
      const bucketPending = PAYMENT_BUCKET_DATA.filter(r => (r.payStatus || r.status) === "Pending").length;
      const reverseUnderReview = PAYMENT_REVERSE_DATA.filter(r => r.status === "Under Review").length;

      const badgeBucket = document.getElementById("payTabBadgeBucket");
      const badgeReverse = document.getElementById("payTabBadgeReverse");
      const tabBucket = document.querySelector('.pay-tab-btn[data-tab="bucket"]');
      const tabReverse = document.querySelector('.pay-tab-btn[data-tab="reverse"]');

      if (badgeBucket) badgeBucket.textContent = String(bucketPending);
      if (badgeReverse) badgeReverse.textContent = String(reverseUnderReview);
      if (tabBucket) tabBucket.setAttribute("aria-label", `Payment Bucket, ${bucketPending} in progress`);
      if (tabReverse) tabReverse.setAttribute("aria-label", `Payment Recovery, ${reverseUnderReview} under review`);
    }

    function renderPaymentTabs() {
      renderPayBucket("");
      renderPayReverse("");
      updatePayTabBadges();
      document.querySelectorAll(".pay-tab-btn").forEach(btn => {
        const isActive = btn.dataset.tab === activePayTab;
        btn.classList.toggle("pay-tab--active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      document.getElementById("payTabBucket").classList.toggle("hidden", activePayTab !== "bucket");
      document.getElementById("payTabReverse").classList.toggle("hidden", activePayTab !== "reverse");
    }

    // Inserts a soft-wrap break after the Nth character so long identifiers
    // (claim/policy/HEGIC numbers) can wrap inside a narrow table column
    // instead of forcing horizontal scroll.
    function wrapAfter(str, n) {
      if (!str || str === "-") return "-";
      return str.length > n ? str.slice(0, n) + "<wbr>" + str.slice(n) : str;
    }

    let payBucketStatusChip = null;
    function renderPayBucket(q) {
      let rows = PAYMENT_BUCKET_DATA.filter(r =>
        !q || [r.claimId, r.policy].some(v => v.toLowerCase().includes(q.toLowerCase()))
      );

      const bucketStatusOf = r => r.payStatus || r.status;
      const bucketStatusClass = effStatus =>
        effStatus === "Processed" || effStatus === "Process" ? "st-active" :
        effStatus === "Hold" || effStatus === "Cancel" || effStatus === "On Hold" ? "st-inactive" : "st-pending";

      renderStatusChipGroup(
        "payBucketStatusChipGroup", rows,
        bucketStatusOf, bucketStatusClass,
        payBucketStatusChip,
        status => { payBucketStatusChip = status; renderPayBucket(q); },
        statusDisplayLabel
      );
      const bucketAnnouncer = document.getElementById("payBucketStatusChipAnnouncer");
      if (bucketAnnouncer) {
        bucketAnnouncer.textContent = payBucketStatusChip
          ? `Showing ${statusDisplayLabel(payBucketStatusChip)}, ${rows.filter(r => bucketStatusOf(r) === payBucketStatusChip).length} records`
          : `Showing all statuses, ${rows.length} records`;
      }
      if (payBucketStatusChip) rows = rows.filter(r => bucketStatusOf(r) === payBucketStatusChip);

      const body = document.getElementById("payBucketBody");
      document.getElementById("payBucketEmpty").classList.toggle("hidden", rows.length > 0);
      body.innerHTML = rows.map((r, i) => {
        const isHold = r.payStatus === "Hold";
        const isCancel = r.payStatus === "Cancel";
        const rowStyle = isHold || isCancel ? `background:var(--danger-bg);` : ``;
        const effStatus = r.payStatus || r.status;
        const sc = effStatus === "Processed" || effStatus === "Process" ? "st-active" : effStatus === "Hold" || effStatus === "Cancel" || effStatus === "On Hold" ? "st-inactive" : "st-pending";
        return `<tr style="${rowStyle}" data-idx="${i}">
      <td><input type="checkbox" class="pay-row-chk" data-idx="${i}" style="width:15px;height:15px;accent-color:var(--brand-red);"></td>
      <td class="strong mono">${wrapAfter(r.claimId, 8)}</td>
      <td class="mono">${wrapAfter(r.policy, 8)}</td>
      <td class="mono">${wrapAfter(r.hegic, 8)}</td>
      <td class="strong">${r.patient}</td>
      <td>${r.claimType}</td>
      <td>${r.payType}</td>
      <td class="mono">${fmtCurrency(r.tdsAmount)}</td>
      <td class="mono">${r.utrn || '-'}</td>
      <td><span class="status-badge ${sc}">${statusDisplayLabel(effStatus)}</span></td>
      <td>
        <button class="btn btn-outline btn-sm pay-action-btn" data-idx="${i}" type="button">
          Actions
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </td>
    </tr>`;
      }).join("");

      body.querySelectorAll(".pay-action-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const idx = Number(btn.dataset.idx);
          openPayActionModal([PAYMENT_BUCKET_DATA[idx]]);
        });
      });

      // Row checkboxes
      const updateBulkBar = () => {
        const checked = [...body.querySelectorAll(".pay-row-chk:checked")];
        const bar = document.getElementById("payBulkBar");
        bar.style.display = checked.length ? "flex" : "none";
        bar.classList.toggle("hidden", !checked.length);
        document.getElementById("payBulkCount").textContent = checked.length + " selected";
      };
      body.querySelectorAll(".pay-row-chk").forEach(chk => chk.addEventListener("change", updateBulkBar));

      const selectAll = document.getElementById("payBucketSelectAll");
      if (selectAll) {
        selectAll.checked = false;
        selectAll.onchange = () => {
          body.querySelectorAll(".pay-row-chk").forEach(c => c.checked = selectAll.checked);
          updateBulkBar();
        };
      }
    }

    let payReverseStatusChip = null;
    function renderPayReverse(q) {
      let rows = PAYMENT_REVERSE_DATA.filter(r =>
        !q || [r.claimId].some(v => v.toLowerCase().includes(q.toLowerCase()))
      );

      renderStatusChipGroup(
        "payReverseStatusChipGroup", rows,
        r => r.status,
        s => s === "Reversed" ? "st-inactive" : "st-pending",
        payReverseStatusChip,
        status => { payReverseStatusChip = status; renderPayReverse(q); }
      );
      const announcer = document.getElementById("payReverseStatusChipAnnouncer");
      if (announcer) {
        announcer.textContent = payReverseStatusChip
          ? `Showing ${payReverseStatusChip}, ${rows.filter(r => r.status === payReverseStatusChip).length} records`
          : `Showing all statuses, ${rows.length} records`;
      }
      if (payReverseStatusChip) rows = rows.filter(r => r.status === payReverseStatusChip);

      const body = document.getElementById("payReverseBody");
      document.getElementById("payReverseEmpty").classList.toggle("hidden", rows.length > 0);
      body.innerHTML = rows.map(r => {
        const sc = r.status === "Reversed" ? "st-inactive" : "st-pending";
        return `<tr>
      <td class="strong mono"><a href="#" class="pay-reversal-link" data-claimid="${r.claimId}" style="color:var(--brand-blue);text-decoration:underline;">${wrapAfter(r.claimId, 8)}</a></td>
      <td class="strong">${r.patient}</td>
      <td class="mono">${wrapAfter(r.utr, 8)}</td>
      <td>${fmtDate(r.date)}</td>
      <td class="mono">${fmtCurrency(r.amount)}</td>
      <td>${r.bank}</td>
      <td>${wrapAfter(r.reason, 8)}</td>
      <td><span class="status-badge ${sc}">${r.status}</span></td>
    </tr>`;
      }).join("");

      body.querySelectorAll(".pay-reversal-link").forEach(link => {
        link.addEventListener("click", e => {
          e.preventDefault();
          const rec = PAYMENT_REVERSE_DATA.find(r => r.claimId === link.dataset.claimid);
          openReversalDetail(rec);
        });
      });
    }

    const REVERSAL_DETAIL_MOCK = {
      recoveryFrom: "ABCD", totalRecovery: "10,000", bankName: "DUMMY BANK LTD.",
      branchName: "NOIDA", accountNo: "1234567", recoveryMode: "ElectronicTransfer",
      serialNo: "222222", chequeDate: "03/07/2024", ifsc: "DUMY0000123",
      paymentFrom: "Hospital", bankAddr1: "", state: "UTTAR PRADESH",
      bankAddr2: "", city: "NOIDA", bankAddr3: "", pinCode: "201301", remarks: "Test"
    };

    function openReversalDetail(rec) {
      const d = REVERSAL_DETAIL_MOCK;
      document.getElementById("rd-recoveryFrom").value = d.recoveryFrom;
      document.getElementById("rd-totalRecovery").value = d.totalRecovery;
      document.getElementById("rd-bankName").value = d.bankName;
      document.getElementById("rd-branchName").value = d.branchName;
      document.getElementById("rd-accountNo").value = d.accountNo;
      document.getElementById("rd-recoveryMode").value = d.recoveryMode;
      document.getElementById("rd-serialNo").value = d.serialNo;
      document.getElementById("rd-chequeDate").value = d.chequeDate;
      document.getElementById("rd-ifsc").value = d.ifsc;
      document.getElementById("rd-paymentFrom").value = d.paymentFrom;
      document.getElementById("rd-bankAddr1").value = d.bankAddr1 || "—";
      document.getElementById("rd-state").value = d.state;
      document.getElementById("rd-bankAddr2").value = d.bankAddr2 || "—";
      document.getElementById("rd-city").value = d.city;
      document.getElementById("rd-bankAddr3").value = d.bankAddr3 || "—";
      document.getElementById("rd-pinCode").value = d.pinCode;
      document.getElementById("rd-remarks").value = d.remarks;
      document.getElementById("rdClaimSearch").classList.remove("hidden");
      document.getElementById("rdSearchResults").classList.add("hidden");
      document.getElementById("rdRecoveryPayment").classList.add("hidden");
      document.getElementById("payTabBucket").classList.add("hidden");
      document.getElementById("payTabReverse").classList.add("hidden");
      document.querySelectorAll(".pay-tab-btn").forEach(b => b.style.display = "none");
      document.getElementById("viewReversalDetail").classList.remove("hidden");
      document.getElementById("rdActionBar").classList.remove("hidden");
    }

    document.getElementById("rdSearchBtn").addEventListener("click", () => {
      document.getElementById("rdSearchResults").classList.remove("hidden");
      document.getElementById("rdRecoveryPayment").classList.add("hidden");
    });
    document.getElementById("rdBackBtn").addEventListener("click", () => {
      document.getElementById("rdSearchResults").classList.add("hidden");
      document.getElementById("rdRecoveryPayment").classList.add("hidden");
      document.getElementById("rdClaimNoSearch").value = "";
      document.getElementById("rdChequeFrom").value = "";
      document.getElementById("rdChequeTo").value = "";
    });
    document.getElementById("rdAttachClaimBtn").addEventListener("click", () => {
      document.getElementById("rdRecoveryPayment").classList.remove("hidden");
      document.getElementById("rdRecoveryPayment").scrollIntoView({ behavior: "smooth", block: "start" });
      recalcRecoveryPayment();
    });
    document.getElementById("rdSubmitBtn").addEventListener("click", () => {
      document.getElementById("viewReversalDetail").classList.add("hidden");
      document.getElementById("rdActionBar").classList.add("hidden");
      document.getElementById("rdRecoveryPayment").classList.add("hidden");
      document.getElementById("rdSearchResults").classList.add("hidden");
      document.getElementById("rdClaimSearch").classList.add("hidden");
      document.querySelectorAll(".pay-tab-btn").forEach(b => b.style.display = "");
      activePayTab = "reverse";
      renderPaymentTabs();
      showSuccessModal({ label: "View in Payment Recovery" });
      document.getElementById("successTitle").textContent = "Recovery Submitted";
      document.getElementById("successSub").textContent = "The recovery payment has been recorded.";
      document.getElementById("modalInwardNo").textContent = document.getElementById("rdrClaimNo").textContent;
    });
    document.getElementById("rdCancelBtn").addEventListener("click", () => {
      document.getElementById("viewReversalDetail").classList.add("hidden");
      document.getElementById("rdActionBar").classList.add("hidden");
      document.getElementById("rdRecoveryPayment").classList.add("hidden");
      document.getElementById("rdSearchResults").classList.add("hidden");
      document.getElementById("rdClaimSearch").classList.add("hidden");
      document.querySelectorAll(".pay-tab-btn").forEach(b => b.style.display = "");
      activePayTab = "reverse";
      renderPaymentTabs();
    });

    /* =====================================================================
       RECOVERY PAYMENT — live TDS Amount / Total Gross Amount calculation
       TDS Amt = Recovery Amt * TDS% / 100; Total Gross = Recovery Amt + TDS Amt
    ===================================================================== */
    function recalcRecoveryPayment() {
      const recoveryAmt = parseFloat(document.getElementById("rdRecoveryAmt").value) || 0;
      const tdsPct = parseFloat(document.getElementById("rdTdsPct").value) || 0;
      const tdsAmt = recoveryAmt * tdsPct / 100;
      const totalGross = recoveryAmt + tdsAmt;
      document.getElementById("rdTdsAmt").textContent = fmtCurrencyPlain(tdsAmt);
      document.getElementById("rdTotalGross").textContent = fmtCurrencyPlain(totalGross);
    }
    function fmtCurrencyPlain(n) {
      return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    ["rdRecoveryAmt", "rdTdsPct"].forEach(id => {
      document.getElementById(id).addEventListener("input", recalcRecoveryPayment);
    });

    document.getElementById("backToReversalBtn").addEventListener("click", () => {
      document.getElementById("viewReversalDetail").classList.add("hidden");
      document.getElementById("rdActionBar").classList.add("hidden");
      document.querySelectorAll(".pay-tab-btn").forEach(b => b.style.display = "");
      activePayTab = "reverse";
      renderPaymentTabs();
    });

    document.querySelectorAll(".pay-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activePayTab = btn.dataset.tab;
        renderPaymentTabs();
      });
    });

    document.getElementById("payBulkActionBtn").addEventListener("click", () => {
      const checked = [...document.querySelectorAll(".pay-row-chk:checked")];
      const selected = checked.map(c => PAYMENT_BUCKET_DATA[Number(c.dataset.idx)]).filter(Boolean);
      if (selected.length) openPayActionModal(selected);
    });
    document.getElementById("payBulkClearBtn").addEventListener("click", () => {
      document.querySelectorAll(".pay-row-chk").forEach(c => c.checked = false);
      const selectAll = document.getElementById("payBucketSelectAll");
      if (selectAll) selectAll.checked = false;
      const bar = document.getElementById("payBulkBar");
      bar.style.display = "none"; bar.classList.add("hidden");
    });

    document.getElementById("payBucketSearch").addEventListener("input", e => renderPayBucket(e.target.value));
    document.getElementById("payReverseSearch").addEventListener("input", e => renderPayReverse(e.target.value));

    let payActionTarget = null;
    let payActionSelected = null;

    function openPayActionModal(recs) {
      payActionTarget = recs;
      payActionSelected = null;
      document.getElementById("payActionSub").textContent = recs.length === 1
        ? `Claim: ${recs[0].claimId} — ${recs[0].patient}`
        : `${recs.length} claims selected`;
      document.querySelectorAll("#payActionList .assign-option").forEach(opt => {
        opt.classList.remove("selected");
        opt.querySelector("input").checked = false;
      });
      document.getElementById("payActionModal").classList.add("show");
    }

    document.querySelectorAll("#payActionList .assign-option").forEach(opt => {
      opt.addEventListener("click", () => {
        payActionSelected = opt.dataset.action;
        document.querySelectorAll("#payActionList .assign-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        opt.querySelector("input").checked = true;
      });
    });

    document.getElementById("payActionCancelBtn").addEventListener("click", () => {
      document.getElementById("payActionModal").classList.remove("show");
    });

    document.getElementById("payActionConfirmBtn").addEventListener("click", () => {
      if (!payActionSelected) { alert("Select an action before confirming."); return; }
      const targets = Array.isArray(payActionTarget) ? payActionTarget : [payActionTarget];
      targets.forEach(r => { if (r) r.payStatus = payActionSelected; });
      document.getElementById("payActionModal").classList.remove("show");
      renderPayBucket(document.getElementById("payBucketSearch").value);
      updatePayTabBadges();
      document.getElementById("successTitle").textContent = "Action Applied";
      document.getElementById("successSub").textContent = `"${payActionSelected}" applied to ${targets.length} claim${targets.length > 1 ? "s" : ""}.`;
      document.getElementById("modalInwardNo").textContent = targets.map(r => r.claimId).join(", ");
      showSuccessModal({ label: "View in Payment List" });
    });

    /* =====================================================================
       INIT
    ===================================================================== */
    // Converts every native <select> on this page (gsAdvCategory,
    // rdRecoveryType) to the shared searchable-select UI — see
    // shared/searchable-select.js and AGENTS.md Iterations. Safe to call
    // once at load time since this page has no dynamically-rendered grid
    // rows containing a <select>.
    initSearchableSelectsIn(document);
    renderPaymentTabs();
    recalcRecoveryPayment();
