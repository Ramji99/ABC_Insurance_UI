/* ==========================================================================
   ABC HCP — Shared Components
   Extracted from app.js (Step 1 of Role Split Guide) — no behaviour change
   ========================================================================== */

// Always land at the top of the page on a fresh load/refresh — some
// browsers restore the prior scroll offset on reload by default, which
// reads as broken on pages where content height changes as views/stages
// are switched. Runs on every page that loads shared-components.js.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

/* Display-only label remap for status VALUES that must keep their original
   literal string everywhere they're compared/filtered/counted (row-status
   constants like IE_ROW_STATUSES/CI_ROW_STATUSES, PAYMENT_BUCKET_DATA's
   status/payStatus, etc.) but need a different word shown to the user.
   Call this ONLY at render sites — never rename the underlying constant/
   comparison value itself, or every === "Pending" / array-membership check
   against it would silently break. Currently just one mapping (Pending →
   In Progress); extend the ternary chain here if more are ever needed. */
function statusDisplayLabel(s) {
  return s === "Pending" ? "In Progress" : s;
}

/* =====================================================================
   REUSABLE STATUS FILTER CHIP GROUP
   Rounded-pill chip row, generated dynamically from a table's current
   (already search/date/other-filtered) dataset — no hardcoded status
   names. "All" is always first. Clicking a chip filters instantly;
   clicking the active chip again (or "All") clears the filter. Counts
   always reflect the currently loaded/filtered dataset.
   `labelFn` (optional) maps a raw status VALUE to its display text — the
   click/filter value passed to onSelect and used for active-state
   comparison is always the raw, unmapped value; only the visible chip
   text goes through labelFn. Defaults to identity (no remap) so existing
   callers that don't pass it are unaffected.
===================================================================== */
function renderStatusChipGroup(containerId, baseRows, statusAccessor, classAccessor, activeValue, onSelect, labelFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const toLabel = labelFn || (s => s);

  const counts = new Map();
  baseRows.forEach(row => {
    const s = statusAccessor(row);
    if (!s) return;
    counts.set(s, (counts.get(s) || 0) + 1);
  });
  // Fixed alphabetical order so chip order stays stable as the table's
  // sort column/direction changes — counts.keys() reflects first-seen
  // order in baseRows, which shifts whenever the row sort changes.
  const statuses = Array.from(counts.keys()).sort();

  container.innerHTML = "";
  container.classList.toggle("hidden", statuses.length === 0);
  if (!statuses.length) return;

  const makeChip = (label, value, count, extraClass) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const active = activeValue === value;
    btn.className = `status-chip ${extraClass}${active ? " status-chip--active" : ""}`;
    btn.setAttribute("aria-pressed", String(active));
    btn.innerHTML = `${label} <span class="status-chip__count">(${count})</span>`;
    btn.addEventListener("click", () => onSelect(active ? null : value));
    return btn;
  };

  container.appendChild(makeChip("All", null, baseRows.length, "status-chip--all"));
  statuses.forEach(s => {
    container.appendChild(makeChip(toLabel(s), s, counts.get(s), classAccessor(s)));
  });

  const announcer = document.getElementById("statusChipAnnouncer");
  if (announcer) {
    announcer.textContent = activeValue
      ? `Showing ${toLabel(activeValue)}, ${counts.get(activeValue) || 0} records`
      : `Showing all statuses, ${baseRows.length} records`;
  }
}

function statusClass(s) {
  if (s === "Active") return "st-active";
  if (s === "Inactive") return "st-inactive";
  return "st-pending";
}

function emailStatusClass(es) {
  if (es === "Opened") return "st-open";
  if (es === "Closed") return "st-closed";
  if (es === "Under Process") return "st-underprocess";
  if (es === "Error") return "st-error";
  return "st-pending";
}

function scanTagRowStatusClass(status) {
  return {
    Active: 'st-active', Intimated: 'st-active',
    Pending: 'st-pending', 'Query Raised': 'st-warn',
    Inactive: 'st-inactive', 'Not Started': 'st-inactive',
    Error: 'st-error'
  }[status] || 'st-pending';
}

function claimStatusClass(cs) {
  if (cs === "Completed") return "st-active";
  if (cs === "In Progress") return "st-pending";
  return "st-inactive";
}

function medicoStatusClass(ms) {
  if (ms === "Approved") return "st-active";
  if (ms === "Rejected") return "st-inactive";
  return "st-pending";
}

function defaultStageRemarks() {
  return {
    1: [],
    2: [],
    3: [
      { role: "Auditor TL", name: "HCSQC Bot1", datetime: "12/06/2026 12:54:19", text: "" },
      { role: "Medico", name: "Morla Amrutha", datetime: "03/06/2026 17:25:03", text: "" },
      { role: "Non Medico", name: "Libas Kumar Sharma", datetime: "31/05/2026 18:45:22", text: "" },
    ],
    4: [
      { role: "Auditor TL", name: "HCSQC Bot1", datetime: "12/06/2026 12:54:31", text: "" },
      { role: "Non Medico", name: "Jiteendra Yadav", datetime: "11/06/2026 17:30:06", text: "" },
      { role: "Medico", name: "Morla Amrutha", datetime: "03/06/2026 17:25:09", text: "" },
      {
        role: "Non Medico", name: "Libas Kumar Sharma", datetime: "02/06/2026 18:38:11",
        text: "Claim form not available but hence entry done as per bills attached please check and process accordingly. Rs.16401/- Medicine bills not clear so hence entered in other head please check and raise the query for clear bills provide."
      },
    ],
    5: [],
    "hc": [],
  };
}

const HOSPITAL_MASTER = [
  // The first four entries match the hospitalName values used in
  // shared/entries-store.js's mock claims exactly, so Hospital Search
  // pre-filled from an open claim (see medHospSearchBtn's click handler in
  // process-claim.js) always finds a real result instead of "No hospital
  // found" — see the branch-name mismatch this fixed.
  { name: 'Apollo Hospitals - Jubilee Hills', nspId: 'NSP-HS-101', address: 'Road No. 72, Jubilee Hills', state: 'Telangana', city: 'Hyderabad', location: 'Jubilee Hills', pin: '500033', telephone: '040-23607777', rohini: 'RHN200001', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Yashoda Hospitals - Somajiguda', nspId: 'NSP-HS-102', address: 'Raj Bhavan Road, Somajiguda', state: 'Telangana', city: 'Hyderabad', location: 'Somajiguda', pin: '500082', telephone: '040-45674567', rohini: 'RHN200002', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Care Hospitals - Banjara Hills', nspId: 'NSP-HS-103', address: 'Road No. 1, Banjara Hills', state: 'Telangana', city: 'Hyderabad', location: 'Banjara Hills', pin: '500034', telephone: '040-61651000', rohini: 'RHN200003', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'KIMS Hospitals - Kondapur', nspId: 'NSP-HS-104', address: 'Kondapur Main Road', state: 'Telangana', city: 'Hyderabad', location: 'Kondapur', pin: '500084', telephone: '040-68334455', rohini: 'RHN200004', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Apollo Hospitals', nspId: 'NSP-HS-001', address: '21, Greams Lane, Off Greams Rd', state: 'Tamil Nadu', city: 'Chennai', location: 'Chennai', pin: '600006', telephone: '044-28293333', rohini: 'RHN100001', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Fortis Hospital', nspId: 'NSP-HS-002', address: 'Mulund Goregaon Link Rd', state: 'Maharashtra', city: 'Mumbai', location: 'Mulund', pin: '400078', telephone: '022-67542929', rohini: 'RHN100002', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Max Super Speciality Hospital', nspId: 'NSP-HS-003', address: 'Press Enclave Marg, Saket', state: 'Delhi', city: 'New Delhi', location: 'Saket', pin: '110017', telephone: '011-26515050', rohini: 'RHN100003', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Manipal Hospitals', nspId: 'NSP-HS-004', address: '98, HAL Airport Road', state: 'Karnataka', city: 'Bengaluru', location: 'HAL Airport Road', pin: '560017', telephone: '080-25024444', rohini: 'RHN100004', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Narayana Health', nspId: 'NSP-HS-005', address: '258/A, Bommasandra Industrial Area', state: 'Karnataka', city: 'Bengaluru', location: 'Bommasandra', pin: '560099', telephone: '080-71222222', rohini: 'RHN100005', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Kokilaben Dhirubhai Ambani Hospital', nspId: 'NSP-HS-006', address: 'Rao Saheb Achutrao Patwardhan Marg', state: 'Maharashtra', city: 'Mumbai', location: 'Andheri West', pin: '400053', telephone: '022-42696969', rohini: 'RHN100006', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'AIIMS Delhi', nspId: 'NSP-HS-007', address: 'Sri Aurobindo Marg, Ansari Nagar', state: 'Delhi', city: 'New Delhi', location: 'Ansari Nagar', pin: '110029', telephone: '011-26588500', rohini: 'RHN100007', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Medanta – The Medicity', nspId: 'NSP-HS-008', address: 'CH Baktawar Singh Road, Sector 38', state: 'Haryana', city: 'Gurugram', location: 'Sector 38', pin: '122001', telephone: '0124-4141414', rohini: 'RHN100008', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  { name: 'Manipal Hospitals Eastern India', nspId: 'NSP-HS-009', address: '127 Mukundapur', state: 'West Bengal', city: 'Kolkata', location: 'Kolkata', pin: '700099', telephone: '033-66284444', rohini: 'RHN100009', covidTemp: false, status: 'NETWORK', fraudFlag: 'NA' },
  // Only covidTemp: true record — lets the Covid Temporary Hospital checkbox
  // filter in the Hospital Search modal be demonstrated/tested.
  { name: 'GHMC Covid Care Centre - Gachibowli', nspId: 'NSP-HS-201', address: 'Gachibowli Stadium Complex', state: 'Telangana', city: 'Hyderabad', location: 'Gachibowli', pin: '500032', telephone: '040-29800000', rohini: 'RHN300001', covidTemp: true, status: 'TEMPORARY', fraudFlag: 'NA' },
];

// Previous Claim Details popup (Medico wizard, Basic Info) — dummy claim
// history for the policy. Status vocabulary matches the Claim Intimation
// list's Status column (see PREVIOUS_CLAIMS_STATUS_CLASS below).
const PREVIOUS_CLAIMS_MOCK = [
  { claimNo: 'CLM/2025/009134', intimationDate: '11/11/2025', hospital: 'Apollo Hospitals, Mumbai', claimType: 'Cashless', claimedAmt: '₹1,20,500', status: 'Settled' },
  { claimNo: 'CLM/2025/006672', intimationDate: '03/08/2025', hospital: 'Fortis Hiranandani Hospital', claimType: 'Reimbursement', claimedAmt: '₹32,800', status: 'Query Raised' },
  { claimNo: 'CLM/2023/007744', intimationDate: '14/10/2023', hospital: 'Lilavati Hospital & Research Centre', claimType: 'Cashless', claimedAmt: '₹28,600', status: 'Settled' },
];
const PREVIOUS_CLAIMS_STATUS_CLASS = { 'Under Process': 'st-pending', 'Settled': 'st-active', 'Query Raised': 'st-warn', 'Rejected': 'st-inactive' };

// Compact India state -> major cities master, used by State/City searchable
// dropdown fields (see initSearchableDropdown below).
const STATE_CITY_MASTER = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  "Delhi": ["New Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat"],
  "Telangana": ["Hyderabad", "Warangal"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
};
const STATE_LIST = Object.keys(STATE_CITY_MASTER);

// Generic type-to-filter dropdown, reusing the .autocomplete-wrap /
// .autocomplete-dropdown component (markup: an input inside
// .autocomplete-wrap, with a sibling .autocomplete-dropdown to render
// matches into). Distinct from initHospitalSearch, which is hospital-
// field-specific and drives its own inline-styled dropdown; this helper
// is for any single-select type-to-filter field (e.g. State, City).
//
// opts: { inputId, dropdownId, items, disabled, onSelect }
//   items    — array of strings to filter/select from
//   disabled — if true, the field never opens (used for read-only fields
//              per the CP-Screen Matrix — still visually an autocomplete
//              field, just non-interactive, matching every other
//              disabled field's state on the same screen)
function initSearchableDropdown(opts) {
  const input = document.getElementById(opts.inputId);
  const dropdown = document.getElementById(opts.dropdownId);
  if (!input || !dropdown) return;
  const items = opts.items || [];

  if (opts.disabled) {
    input.disabled = true;
    return;
  }

  function renderDropdown(q) {
    const matches = q
      ? items.filter((item) => item.toLowerCase().indexOf(q.toLowerCase()) > -1)
      : items;
    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-empty">No match found.</div>`;
    } else {
      dropdown.innerHTML = matches.map((item) => `<div class="autocomplete-item">${item}</div>`).join("");
      dropdown.querySelectorAll(".autocomplete-item").forEach((el) => {
        el.addEventListener("click", () => {
          input.value = el.textContent;
          dropdown.classList.remove("open");
          if (typeof opts.onSelect === "function") opts.onSelect(el.textContent);
        });
      });
    }
    dropdown.classList.add("open");
  }

  input.addEventListener("input", () => renderDropdown(input.value.trim()));
  // Opening (focus/click) always shows the FULL list, not one filtered by
  // whatever value is already sitting in the field — same fix applied to
  // shared/searchable-select.js's identical bug in Iteration 68 (re-opening
  // a field already set to e.g. "-" or a prior state must show every
  // option, matching native <select>/hsState-hsCity behaviour; only typing
  // should filter). This mattered less while initSearchableDropdown only
  // backed disabled read-only fields (medState/medCity), but now also
  // backs genuinely interactive State/City pairs (hdState/hdCity, the
  // index.html "Add New Hospital" pairs) where a pre-filled or placeholder
  // value would otherwise make the dropdown open empty.
  input.addEventListener("focus", () => renderDropdown(""));
  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.classList.remove("open"), 200);
  });
}

// State -> City cascade wiring for a pair of initSearchableDropdown fields,
// built on STATE_CITY_MASTER/STATE_LIST above. Generalises the exact same
// cascade the real <select>-based hsState/hsCity pair already uses
// (populateHospSearchCities() in process-claim.js, driving two
// searchable-select-wrapped <select>s) to this lighter
// initSearchableDropdown component instead, so both State/City patterns in
// this codebase resolve a selection the same way — pick a State, City's
// own item list narrows to STATE_CITY_MASTER[state], and City is cleared
// since a City chosen under the old State may no longer be valid.
//
// opts: { stateInputId, stateDropdownId, cityInputId, cityDropdownId,
//         onSelect } — onSelect(field, value) fires after either a State
//         or a City pick, `field` being "state" or "city" (optional).
function initStateCityDropdown(opts) {
  const cityInput = document.getElementById(opts.cityInputId);
  const cityDropdown = document.getElementById(opts.cityDropdownId);
  if (!cityInput || !cityDropdown) return;

  function wireCity(items) {
    initSearchableDropdown({
      inputId: opts.cityInputId,
      dropdownId: opts.cityDropdownId,
      items: items,
      onSelect: (val) => {
        if (typeof opts.onSelect === "function") opts.onSelect("city", val);
      },
    });
  }

  initSearchableDropdown({
    inputId: opts.stateInputId,
    dropdownId: opts.stateDropdownId,
    items: STATE_LIST,
    onSelect: (state) => {
      // A State pick invalidates whatever City was previously chosen —
      // clear it and re-wire City's own dropdown against the new state's
      // city list (initSearchableDropdown has no live "items" setter, so
      // re-calling it is how hsState/hsCity's own cascade — via
      // populateHospSearchCities()'s innerHTML rebuild — achieves the same
      // effect for the <select>-based pattern).
      cityInput.value = "";
      wireCity(STATE_CITY_MASTER[state] || []);
      if (typeof opts.onSelect === "function") opts.onSelect("state", state);
    },
  });

  // Initial wiring — empty until a State is picked, same as hsCity's
  // "--Select--"-only starting state before populateHospSearchCities() runs.
  wireCity([]);
}

function initHospitalSearch(opts) {
  /* opts: { inputId, dropdownId, addBtnId, formId, cancelBtnId, saveBtnId,
             addrId, stateId, cityId, pinId, rohiniId, nameDisplayId,
             nameInputId, addrInputId, stateInputId, cityInputId, pinInputId, rohiniInputId,
             admitDateId, dischargeDateId, daysCountId, onChange } */
  const input = document.getElementById(opts.inputId);
  const dropdown = document.getElementById(opts.dropdownId);
  if (!input || !dropdown) return;

  // "Add New Hospital" State/City — editable fields (opts.stateInputId/
  // cityInputId, e.g. ieNewHospState/ieNewHospCity), distinct from
  // opts.stateId/cityId below (the auto-filled READ-ONLY display fields,
  // e.g. ieHospState/ieHospCity, left as plain disabled inputs). Wired the
  // same State->City cascade as Stage 2's hdState/hdCity in
  // process-claim.js — see initStateCityDropdown above. Dropdown panel ids
  // follow the "<inputId>Dropdown" convention already used by every other
  // .autocomplete-wrap field in this codebase.
  if (opts.stateInputId && opts.cityInputId) {
    initStateCityDropdown({
      stateInputId: opts.stateInputId, stateDropdownId: opts.stateInputId + "Dropdown",
      cityInputId: opts.cityInputId, cityDropdownId: opts.cityInputId + "Dropdown",
    });
  }

  // Sets .value for a real form control (input/select/textarea) so a
  // disabled <input> displays correctly, or .textContent for a plain
  // element (e.g. a <p class="readonly-value">) — supports both patterns
  // since different pages use one or the other for these auto-filled
  // read-only hospital fields.
  function setFieldDisplay(el, val) {
    if (!el) return;
    if ('value' in el) el.value = val;
    else el.textContent = val;
  }

  function fillDetails(h) {
    setFieldDisplay(document.getElementById(opts.nameDisplayId), h.name || '—');
    setFieldDisplay(document.getElementById(opts.addrId), h.address || '—');
    setFieldDisplay(document.getElementById(opts.stateId), h.state || '—');
    setFieldDisplay(document.getElementById(opts.cityId), h.city || '—');
    setFieldDisplay(document.getElementById(opts.pinId), h.pin || '—');
    setFieldDisplay(document.getElementById(opts.rohiniId), h.rohini || '—');
    input.value = h.name;
    dropdown.style.display = 'none';
    if (typeof opts.onChange === 'function') opts.onChange();
  }

  function renderDropdown(q) {
    if (!q || q.length < 2) { dropdown.style.display = 'none'; return; }
    const matches = HOSPITAL_MASTER.filter(function(h) {
      return h.name.toLowerCase().indexOf(q.toLowerCase()) > -1 ||
             h.city.toLowerCase().indexOf(q.toLowerCase()) > -1;
    });
    if (matches.length === 0) {
      dropdown.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--muted);">No hospital found — use <strong>Add New</strong> to register.</div>';
    } else {
      dropdown.innerHTML = matches.map(function(h, i) {
        return '<div class="hosp-dd-item" data-idx="' + i + '" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--line);font-size:13px;">' +
          '<div style="font-weight:600;color:var(--ink);">' + h.name + '</div>' +
          '<div style="font-size:11.5px;color:var(--muted);margin-top:2px;">' + h.city + ', ' + h.state + ' &nbsp;·&nbsp; PIN: ' + h.pin + '</div>' +
          '</div>';
      }).join('');
      dropdown.querySelectorAll('.hosp-dd-item').forEach(function(item) {
        item.addEventListener('mouseenter', function() { item.style.background = 'var(--surface,#f8f9fb)'; });
        item.addEventListener('mouseleave', function() { item.style.background = ''; });
        item.addEventListener('click', function() { fillDetails(matches[parseInt(item.dataset.idx)]); });
      });
    }
    dropdown.style.display = 'block';
  }

  input.addEventListener('input', function() { renderDropdown(input.value.trim()); });
  input.addEventListener('blur', function() { setTimeout(function() { dropdown.style.display = 'none'; }, 200); });
  input.addEventListener('focus', function() { if (input.value.trim().length >= 2) renderDropdown(input.value.trim()); });

  /* Add New toggle */
  const addBtn    = document.getElementById(opts.addBtnId);
  const form      = document.getElementById(opts.formId);
  const cancelBtn = document.getElementById(opts.cancelBtnId);
  const saveBtn   = document.getElementById(opts.saveBtnId);
  // Toggle via the .info-panel.show class (not inline style) — the form
  // starts hidden by CSS default (display:none, no inline style set), so
  // checking form.style.display on the first click read '' rather than
  // 'none' and the ternary read as a no-op, requiring a second click to
  // actually open it.
  if (addBtn && form)    addBtn.addEventListener('click', function() { form.classList.toggle('show'); });
  if (cancelBtn && form) cancelBtn.addEventListener('click', function() { form.classList.remove('show'); });
  if (saveBtn && form) {
    saveBtn.addEventListener('click', function() {
      const name = document.getElementById(opts.nameInputId).value.trim();
      if (!name) { alert('Hospital name is required.'); return; }
      const newH = {
        name: name,
        address: document.getElementById(opts.addrInputId).value.trim(),
        state:   document.getElementById(opts.stateInputId).value.trim(),
        city:    document.getElementById(opts.cityInputId).value.trim(),
        pin:     document.getElementById(opts.pinInputId).value.trim(),
        rohini:  document.getElementById(opts.rohiniInputId).value.trim()
      };
      HOSPITAL_MASTER.push(newH);
      fillDetails(newH);
      form.classList.remove('show');
      /* NSP approval banner — inserted right after the Add-New form by default,
         or immediately before opts.bannerBeforeId (e.g. the Hospital Details
         sub-heading) when that option is supplied. */
      const formEl = form;
      const bannerId = opts.formId + '-nsp-banner';
      const existing = document.getElementById(bannerId);
      if (existing) existing.remove();
      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.style.cssText = 'margin-top:10px;display:flex;align-items:flex-start;gap:10px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:9px;padding:11px 14px;font-size:13px;';
      banner.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#B45309" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4M12 17h.01"/><path d="M12 3l9 16H3L12 3z"/></svg><span style="color:#78350F;"><strong style="color:#92400E;">Pending NSP Approval —</strong> This hospital is yet to be approved by NSP. Claims for this hospital may require additional verification.</span>';
      const beforeEl = opts.bannerBeforeId ? document.getElementById(opts.bannerBeforeId) : null;
      if (beforeEl) {
        beforeEl.parentNode.insertBefore(banner, beforeEl);
      } else {
        formEl.parentNode.insertBefore(banner, formEl.nextSibling);
      }
    });
  }

  /* Days auto-calculation */
  if (opts.admitDateId && opts.dischargeDateId && opts.daysCountId) {
    function recalcDays() {
      const a    = document.getElementById(opts.admitDateId);
      const d    = document.getElementById(opts.dischargeDateId);
      const span = document.getElementById(opts.daysCountId);
      if (!a || !d || !span) return;
      if (a.value && d.value) {
        const diff = Math.round((new Date(d.value) - new Date(a.value)) / 86400000);
        setFieldDisplay(span, diff >= 0 ? diff + ' day' + (diff !== 1 ? 's' : '') : 'Invalid dates');
      } else {
        setFieldDisplay(span, '');
      }
      if (typeof opts.onChange === 'function') opts.onChange();
    }
    const aEl = document.getElementById(opts.admitDateId);
    const dEl = document.getElementById(opts.dischargeDateId);
    if (aEl) aEl.addEventListener('change', recalcDays);
    if (dEl) dEl.addEventListener('change', recalcDays);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

const DOCUMENT_CATEGORIES = ["Duly Signed Claim Form", "Discharge Summary", "Final Bill and Receipts", "NEFT", "KYC (claim amount 1 Lakh and above)", "Investigation report", "Pharmacy details", "MLC (in case accidental claim)"];

function renderDocTileList(containerId, docs) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const entriesList = Object.entries(docs || {});

  if (entriesList.length === 0) {
    container.innerHTML = `<p style="font-size:13px;color:var(--muted);margin:0;">No documents received yet.</p>`;
    return;
  }

  container.innerHTML = entriesList.map(([cat, doc]) => {
    const catOptions = DOCUMENT_CATEGORIES.includes(cat) ? DOCUMENT_CATEGORIES : [cat, ...DOCUMENT_CATEGORIES];
    return `
    <div class="doc-tile filled doc-tile-stacked" data-cat="${cat}">
      <div class="doc-tile-row">
        <div class="dt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg></div>
        <div class="doc-tile-body">
          <div class="dt-category">${doc.fileName}</div>
          <div class="dt-meta">${doc.fileSize}</div>
        </div>
        <div class="doc-tile-actions">
          <button class="btn btn-outline btn-sm" type="button" data-action="view-claim-doc" data-cat="${cat}">View</button>
          <button class="btn btn-outline btn-sm" type="button" data-action="download-claim-doc" data-cat="${cat}">Download</button>
        </div>
      </div>
      <div class="doc-tile-category-row">
        <label class="doc-tile-category-label">Tag as category</label>
        <select class="ci-doc-select dt-category-select" data-cat="${cat}">
          ${catOptions.map(c => `<option value="${c}" ${c === cat ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
  }).join("");

  // Editable category tag — lets the user retag a received/pre-attached
  // document without re-uploading it. Rekeys the same docs object (kept
  // by reference from the caller) so View/Download and any other
  // lookups by category stay in sync, then re-renders this list.
  container.querySelectorAll("select.dt-category-select").forEach((sel) => {
    sel.addEventListener("click", (e) => e.stopPropagation());
    sel.addEventListener("change", () => {
      const oldCat = sel.dataset.cat;
      const newCat = sel.value;
      if (!docs || newCat === oldCat || !docs[oldCat]) return;
      docs[newCat] = docs[oldCat];
      delete docs[oldCat];
      renderDocTileList(containerId, docs);
    });
  });
}

function remarkInitials(name) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function renderRemarksTrail(stageNum, rec) {
  const container = document.getElementById(`remarksTrail${stageNum}`);
  if (!container) return;
  const items = (rec.stageRemarks && rec.stageRemarks[stageNum]) || [];

  if (items.length === 0) {
    container.innerHTML = `<p style="font-size:13px;color:var(--muted);margin:0;">No remarks added yet for this stage.</p>`;
    return;
  }

  container.innerHTML = items.map(r => `
    <div class="remark-trail-item">
      <div class="remark-trail-avatar">${remarkInitials(r.name)}</div>
      <div class="remark-trail-body">
        <div class="remark-trail-head">
          <span class="remark-trail-role">${r.role}</span>
          <span class="remark-trail-name">${r.name}</span>
          <span class="remark-trail-time">${r.datetime}</span>
        </div>
        <div class="remark-trail-text ${r.text ? "" : "empty"}">${r.text || "No remark provided"}</div>
      </div>
    </div>
  `).join("");
}

function renderRemarksTrailHC(rec) {
  const container = document.getElementById("remarksTrailHC");
  if (!container) return;
  const items = (rec.stageRemarks && rec.stageRemarks["hc"]) || [];
  if (items.length === 0) {
    container.innerHTML = `<p style="font-size:13px;color:var(--muted);margin:0;">No remarks added yet for this stage.</p>`;
    return;
  }
  container.innerHTML = items.map(r => `
    <div class="remark-trail-item">
      <div class="remark-trail-avatar">${remarkInitials(r.name)}</div>
      <div class="remark-trail-body">
        <div class="remark-trail-head">
          <span class="remark-trail-role">${r.role}</span>
          <span class="remark-trail-name">${r.name}</span>
          <span class="remark-trail-time">${r.datetime}</span>
        </div>
        <div class="remark-trail-text ${r.text ? "" : "empty"}">${r.text || "No remark provided"}</div>
      </div>
    </div>
  `).join("");
}

function initStageRemarks(rec) {
  if (!rec.stageRemarks) {
    rec.stageRemarks = defaultStageRemarks();
  }
  for (let i = 1; i <= 5; i++) {
    renderRemarksTrail(i, rec);
  }
  renderRemarksTrailHC(rec);
}

function formatRemarkTimestamp(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// Single source of truth for stage-key -> human label, used wherever a
// combined remarks table needs to show which stage a remark came from.
const STAGE_LABELS = {
  1: "Policy & Member Details",
  2: "Hospital Details",
  3: "Case Details",
  4: "Bill Details - Health",
  "hc": "Bill Details - HC",
  5: "Settlement",
};
const STAGE_KEYS = [1, 2, 3, 4, "hc", 5];

// Parses the dd/mm/yyyy hh:mm:ss strings produced by formatRemarkTimestamp
// (and matched by the static seed data in defaultStageRemarks) into a
// sortable number, so the combined table can order newest-first without
// changing the stored string format everything else already relies on.
function parseRemarkTimestamp(datetime) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(datetime || "");
  if (!m) return 0;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  return new Date(+yyyy, +mm - 1, +dd, +hh, +min, +ss).getTime();
}

// Rebuilds a .pager's prev/numbered/next buttons — the same button-rebuild
// logic renderTable() has always used for the main entries list (app.js),
// generalized here so any other paginated view (the combined remarks
// table) can reuse it instead of re-implementing it.
function buildPager(pagerEl, page, pageCount, onPageChange) {
  if (!pagerEl) return;
  pagerEl.innerHTML = "";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.textContent = "‹";
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => onPageChange(page - 1));
  pagerEl.appendChild(prev);

  for (let p = 1; p <= pageCount; p++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p;
    if (p === page) b.classList.add("active");
    b.addEventListener("click", () => onPageChange(p));
    pagerEl.appendChild(b);
  }

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "›";
  next.disabled = page >= pageCount;
  next.addEventListener("click", () => onPageChange(page + 1));
  pagerEl.appendChild(next);
}

// Combines every stage's remarks for a claim into one newest-first,
// paginated table — the single rendering path for every "remarks" surface
// in the Medico/QC wizard (replacing the per-stage remark-trail +
// "Processing Remarks" sections previously rendered by renderRemarksTrail /
// renderRemarksTrailHC).
//
// opts: { bodyId, emptyId, footerId, pagerId, pageSizeSelectId,
//         resultCountId, pageState, pageSize }
//   pageState — a plain object (e.g. {}) owned by the caller that this
//               function stores { page, pageSize } on, so each card on a
//               page (e.g. each wizard stage) keeps its own independent
//               pagination position across re-renders.
function renderCombinedRemarksTable(rec, opts) {
  const body = document.getElementById(opts.bodyId);
  const empty = opts.emptyId ? document.getElementById(opts.emptyId) : null;
  const footer = opts.footerId ? document.getElementById(opts.footerId) : null;
  const pager = opts.pagerId ? document.getElementById(opts.pagerId) : null;
  const pageSizeSelect = opts.pageSizeSelectId ? document.getElementById(opts.pageSizeSelectId) : null;
  const resultCount = opts.resultCountId ? document.getElementById(opts.resultCountId) : null;
  if (!body) return;

  const state = opts.pageState || {};
  if (!state.pageSize) state.pageSize = opts.pageSize || 10;
  if (!state.page) state.page = 1;
  if (pageSizeSelect) {
    // Idempotent — initSearchableSelect() no-ops via its own init guard on
    // every call after the first, so it's safe to call on every render.
    initSearchableSelect(opts.pageSizeSelectId);
    pageSizeSelect.value = String(state.pageSize);
    refreshSearchableSelectLabel(opts.pageSizeSelectId);
  }

  // opts.stageKeys lets a caller scope this table to specific stage(s)
  // instead of the full STAGE_KEYS history — used by Inward Entry/Claim
  // Intimation (stage 1 only, since that's the only stage they ever write
  // to) so a claim that later moves through the Medico wizard doesn't
  // start surfacing stage 2-5 remarks in a view that isn't about those
  // stages. The Medico wizard itself omits this option to keep showing
  // the full combined history.
  const stageRemarks = rec.stageRemarks || {};
  const keysToShow = opts.stageKeys || STAGE_KEYS;
  const allRemarks = [];
  keysToShow.forEach(key => {
    (stageRemarks[key] || []).forEach(r => {
      allRemarks.push({ ...r, stageLabel: STAGE_LABELS[key] });
    });
  });
  allRemarks.sort((a, b) => parseRemarkTimestamp(b.datetime) - parseRemarkTimestamp(a.datetime));

  const total = allRemarks.length;

  if (total === 0) {
    body.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    if (footer) footer.classList.add("hidden");
    if (resultCount) resultCount.textContent = "0 results";
    if (pager) pager.innerHTML = "";
    return;
  }
  if (empty) empty.classList.add("hidden");
  if (footer) footer.classList.remove("hidden");

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;
  const start = (state.page - 1) * state.pageSize;
  const pageRows = allRemarks.slice(start, start + state.pageSize);

  body.innerHTML = `
    <table class="all-remarks-grid">
      <thead>
        <tr>
          <th>Stage</th>
          <th>User Role</th>
          <th>User Name</th>
          <th>Date &amp; Time</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(r => `
        <tr>
          <td>${r.stageLabel || ""}</td>
          <td><span class="all-remarks-role">${r.role}</span></td>
          <td>${r.name}</td>
          <td>${r.datetime}</td>
          <td class="${r.text ? "" : "all-remarks-empty"}">${r.text || "No Remarks Provided"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;

  if (resultCount) resultCount.textContent = `${total} result${total === 1 ? "" : "s"}`;
  if (pager) {
    buildPager(pager, state.page, pageCount, (p) => {
      state.page = p;
      renderCombinedRemarksTable(rec, opts);
    });
  }
  if (pageSizeSelect && !pageSizeSelect._combinedRemarksWired) {
    pageSizeSelect._combinedRemarksWired = true;
    pageSizeSelect.addEventListener("change", () => {
      state.pageSize = Number(pageSizeSelect.value);
      state.page = 1;
      renderCombinedRemarksTable(rec, opts);
    });
  }
}

// ─── Toast System ─────────────────────────────────────────────────
function showToast(type, title, sub) {
  const container = document.getElementById('toastContainer');
  const id = 'toast_' + Date.now();

  const iconMap = {
    success: `<svg class="toast-icon success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg class="toast-icon error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon warning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon info" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${iconMap[type] || iconMap.info}
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      ${sub ? `<span class="toast-sub">${sub}</span>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

/* =====================================================================
   ENTER-KEY SEARCH (all pages)
   Policy Search, Scan Tag Search, Claim Search, Lookup Forms, Filter
   Forms, Search Dialogs. Scoped via [data-enter-search-scope] on the
   containing card/modal/popover and [data-enter-search-btn] on that
   container's own Search/Apply button (looked up within the same scope,
   so duplicate ids elsewhere in the document can never cause the wrong
   button to fire). A second, simpler [data-enter-search-scope-self] on
   the input itself covers inline lookup rows (e.g. Ailment/CPT Procedure
   in Case Details) that pair a single input with a single adjacent
   button rather than a card.
===================================================================== */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  var el = e.target;
  if (!el || !(el.matches('input, select'))) return;
  if (el.tagName === 'TEXTAREA') return;

  var selfBtnId = el.getAttribute('data-enter-search-scope-self');
  if (selfBtnId) {
    var selfBtn = document.getElementById(selfBtnId);
    if (selfBtn && !selfBtn.disabled) { e.preventDefault(); selfBtn.click(); }
    return;
  }

  var scope = el.closest('[data-enter-search-scope]');
  if (!scope) return;
  var btn = scope.querySelector('[data-enter-search-btn]');
  if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
});

/* =====================================================================
   MODAL FOCUS TRAP (all pages)
   A single delegated Tab/Shift+Tab handler that keeps keyboard focus
   cycling within whichever .modal-backdrop currently has .show, instead
   of escaping into the page content behind it. Works for every modal on
   every page (hospSearchModal, doctorSearchModal, ailmentModal,
   paymentModal, successModal, index.html's searchCriteriaModal, etc.)
   without needing per-modal wiring at each open/close call site — this
   listens for whichever modal is open at the moment Tab is pressed.
===================================================================== */
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const openModal = document.querySelector('.modal-backdrop.show .modal');
  if (!openModal) return;

  const focusable = Array.from(openModal.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!openModal.contains(document.activeElement)) {
    // Focus somehow landed outside the modal (e.g. it just opened) —
    // pull it back in rather than letting Tab continue into the page.
    e.preventDefault();
    first.focus();
  }
});

/* =====================================================================
   MODAL ACCESSIBILITY: initial focus, focus return, Escape/outside-click
   (all pages)
   Runs once at load and watches every .modal-backdrop on the page via
   MutationObserver, so it works no matter which script/page opens or
   closes a given modal (classList.add/remove("show")) — no per-modal
   wiring needed at each open/close call site.
   - On open: move focus to the modal's first focusable element (or the
     modal panel itself if none), and remember what had focus before.
   - On close: return focus to whatever triggered the modal, so keyboard
     users don't lose their place in the page.
   - Escape-to-close / click-outside-to-close only applies to modals
     marked data-dismissible="1" (pure lookup/search modals with nothing
     to lose). Deliberately NOT applied to confirmation/form modals
     (success, payment, decision, etc.), where an accidental Escape or
     outside click could discard in-progress input.
===================================================================== */
function initModalAccessibility() {
  let lastFocusedBeforeModal = null;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal-backdrop[data-dismissible="1"].show');
    if (open) open.classList.remove('show');
  });

  document.querySelectorAll('.modal-backdrop[data-dismissible="1"]').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    const observer = new MutationObserver(() => {
      const isOpen = backdrop.classList.contains('show');
      const panel = backdrop.querySelector('.modal');
      if (!panel) return;

      if (isOpen) {
        lastFocusedBeforeModal = document.activeElement;
        const focusable = panel.querySelector(FOCUSABLE_SELECTOR);
        (focusable || panel).focus({ preventScroll: true });
      } else if (lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)) {
        lastFocusedBeforeModal.focus({ preventScroll: true });
        lastFocusedBeforeModal = null;
      }
    });
    observer.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    // The modal panel itself needs to be a valid focus target for the
    // "no focusable children" fallback above (e.g. a modal that's pure
    // read-only content before its Close button renders in).
    if (!backdrop.querySelector('.modal')?.hasAttribute('tabindex')) {
      backdrop.querySelector('.modal')?.setAttribute('tabindex', '-1');
    }
  });
}
document.addEventListener('DOMContentLoaded', initModalAccessibility);
