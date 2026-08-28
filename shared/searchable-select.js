/* ==========================================================================
   ABC HCP — Searchable Select
   Generalises the Hospital Name autocomplete pattern (process-claim.js'
   initHospNameAutocomplete / shared-components.js' initSearchableDropdown —
   same .autocomplete-wrap / .autocomplete-dropdown / .autocomplete-item /
   .autocomplete-icon-trailing component) into a drop-in replacement for a
   native <select>: a filterable text proxy shown to the user, backed by the
   original <select> kept in the DOM (visually hidden via .sr-only, not
   display:none) as the single source of truth for value/disabled/change.

   Why the original <select> stays: ~50+ existing call sites across
   app.js/process-claim.js/payment.js/email-pool-app.js/email-team-app.js
   read/write select state via plain DOM APIs — document.getElementById(id)
   .value, .disabled = true/false, addEventListener("change", ...), dynamic
   <option> population via innerHTML. None of that call-site code changes;
   this file only adds a UI layer on top. See AGENTS.md Iterations for the
   entry documenting this addition and the design rationale in full.
   ========================================================================== */

/**
 * Wraps an existing <select id="..."> with a searchable-input UI.
 *
 * Markup produced (inserted immediately after the <select>, inside the
 * same parent — works whether that parent is a .field, a table <td>, or a
 * bare <label>, since no assumption is made about siblings):
 *
 *   <select id="theId" class="sr-only" ...>            (unchanged, now visually hidden)
 *   <div class="searchable-select-wrap" data-for="theId">
 *     <input type="text" class="searchable-select-input" autocomplete="off" ...>
 *     <svg class="autocomplete-icon-trailing">...</svg>
 *     <div class="autocomplete-dropdown"></div>
 *   </div>
 *
 * Behaviour:
 * - The proxy input always displays the <select>'s current selected
 *   option's label (kept in sync — see refresh functions below).
 * - Typing filters the option list by substring match (case-insensitive)
 *   against each option's visible text, same as HOSPITAL_MASTER.filter in
 *   initHospNameAutocomplete.
 * - Clicking/keying an item sets select.value and dispatches a bubbling
 *   "change" Event on the select, so every existing change listener on
 *   that id keeps firing unchanged.
 * - select.disabled is read LAZILY at interaction time (on focus/click),
 *   not observed live — this avoids needing to touch the many external
 *   call sites that do `document.getElementById(id).disabled = true/false`
 *   (e.g. applyMedFieldAccess()/MED_SETTLEMENT_FIELD_ACCESS). The proxy
 *   input's own `disabled`/style is refreshed to match at the same time.
 * - Options are read fresh from select.options on every open, not cached
 *   at init — this covers selects whose <option> list is populated or
 *   replaced by JS after page load (e.g. #gsAdvCategory's innerHTML
 *   population in app.js), with no extra call-site work needed.
 * - Blank-value placeholder options (value="") and the SELECT's own
 *   "disabled" scaffold option are never shown as a real choice. Any
 *   other <option disabled> found is rendered but unselectable (greyed,
 *   non-clickable) — see AGENTS.md Known Standards Violations sweep,
 *   though as of this rollout only blank placeholder options carry
 *   `disabled` anywhere in this codebase.
 *
 * opts:
 *   selectId   — id of the native <select> to wrap (required)
 *   placeholder — shown when no option is selected (defaults to the
 *                 select's own blank/disabled placeholder option's label,
 *                 or "Select" if none is found)
 */
function initSearchableSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return null;
  if (select.multiple) return null; // multi-selects are out of scope (see stMedicoRemarksReason, already custom-built)
  if (select.dataset.searchableSelectInit === "1") return SEARCHABLE_SELECT_REGISTRY[selectId] || null;
  select.dataset.searchableSelectInit = "1";

  // Preserve any page-specific styling hook classes the original <select>
  // carried (e.g. payment.html's rdRecoveryType uses .u-w-110-input for a
  // narrow fixed width) by carrying them over onto the proxy input, since
  // the select itself is about to become invisible (.sr-only below) and
  // no longer paints anything a class like that would target.
  const extraClasses = Array.prototype.slice.call(select.classList);

  // Hide the real control visually but keep it in the layout/focus/
  // validation tree (sr-only technique — position:absolute, 1px box,
  // clipped — NOT display:none).
  select.classList.add("sr-only");
  select.setAttribute("tabindex", "-1");
  select.setAttribute("aria-hidden", "true");

  const wrap = document.createElement("div");
  wrap.className = "searchable-select-wrap";
  wrap.dataset.for = selectId;
  // Also carried onto the wrap div itself, not just the input — some of
  // the original select's classes size it as a flex/grid ITEM within its
  // parent row (e.g. .ci-doc-select's `flex: 1 1 16rem` inside
  // .ci-doc-row), and the wrap div, not the input, is what actually sits
  // in that flex row now that the select is between them and the select
  // is .sr-only. Harmless duplication for classes that only style the
  // input's own box (e.g. .u-w-110-input) since .searchable-select-wrap's
  // own position:relative doesn't conflict with anything box-sizing/width
  // related.
  extraClasses.forEach((c) => wrap.classList.add(c));

  const input = document.createElement("input");
  input.type = "text";
  input.className = "searchable-select-input";
  extraClasses.forEach((c) => input.classList.add(c));
  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", selectId + "SearchDropdown");
  const labelEl = document.querySelector('label[for="' + cssEscape(selectId) + '"]');
  if (labelEl && !labelEl.id) labelEl.id = selectId + "Label";
  if (labelEl) input.setAttribute("aria-labelledby", labelEl.id);

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "15");
  icon.setAttribute("height", "15");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("class", "autocomplete-icon-trailing");
  // Chevron-down (not the magnifying-glass search icon) — this generic
  // factory backs every converted <select> across the app, none of which
  // are a text-search field; only the two dedicated Hospital Name search
  // inputs (medHospName/hdHospitalName in process-claim.html, wired via
  // initHospNameAutocomplete, not this factory) keep the magnifying glass.
  // See AGENTS.md Iterations v2.7.2.
  icon.innerHTML = '<path d="M6 9l6 6 6-6"></path>';

  // Appended to <body> (a single reused "portal" node, not left nested
  // inside .searchable-select-wrap) and positioned with `position: fixed`
  // computed from the input's getBoundingClientRect() on every open — same
  // technique already used by #rowMenu/.gs-dropdown__menu elsewhere in
  // this codebase (see openRowMenu() in app.js) specifically to escape
  // .table-scroll's overflow-x clipping, which also clips overflow-y per
  // the CSS spec once any axis is non-visible. Every grid-row select
  // (Hospitalization/HC/HC Expenses/QC Communication/Bill Items/Pharmacy)
  // lives inside a .table-scroll, so a plain position:absolute dropdown
  // nested in the wrap (fine for the non-grid Hospital Name pattern this
  // component generalises) would silently render invisible there —
  // confirmed via Playwright during this rollout (see AGENTS.md Iterations).
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown searchable-select-portal";
  dropdown.id = selectId + "SearchDropdown";
  dropdown.setAttribute("role", "listbox");
  document.body.appendChild(dropdown);

  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    dropdown.style.left = rect.left + "px";
    dropdown.style.width = rect.width + "px";
    const GAP = 4;
    const EDGE_PAD = 8; // keep clear of the viewport edge / fixed bottom bar
    const maxH = 220; // px, matches .autocomplete-dropdown's max-height: 22rem @ 10px root
    // The sticky .topbar sits fixed at the very top of the viewport and
    // stays visually on top of page content while scrolled — a field's
    // rect.top can be small simply because it's scrolled up close behind
    // the header, but that space isn't actually free: opening upward
    // without accounting for the header's own height let the dropdown's
    // top edge render behind/under the header instead of stopping below
    // it (confirmed via screenshot: options above the header's bottom
    // edge were invisible, clipped by the header's own opaque background
    // and stacking, even though z-index alone would've painted them on
    // top — the header occupies real layout space the panel must respect
    // if it isn't to overlap the header itself).
    const topbarEl = document.querySelector(".topbar");
    const topbarBottom = topbarEl ? topbarEl.getBoundingClientRect().bottom : 0;
    const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE_PAD;
    const spaceAbove = rect.top - Math.max(0, topbarBottom) - GAP - EDGE_PAD;
    // Prefer opening BELOW at full height whenever there's room for it.
    // Only flip to open ABOVE when below can't fit the full panel — and
    // when flipping, prefer above even if it doesn't fit fully either, as
    // long as above has more room than below (so a field pinned near the
    // bottom edge, e.g. next to the fixed bottom action bar, opens
    // upward at its largest possible height instead of staying below and
    // getting squeezed down to whatever sliver of space remains there).
    // max-height is still capped to the chosen side's real available
    // space so the panel never overruns the viewport, but that cap is
    // only ever less than `maxH` as a last resort, not the default.
    // Explicitly set BOTH top and bottom to "auto" (not "", which merely
    // clears the inline override and lets .autocomplete-dropdown's own
    // `top: calc(100% + 0.4rem)` base rule show through — meaningless
    // under position:fixed, but the browser still honors it, leaving both
    // top and bottom constrained at once and collapsing the computed
    // height to near-zero). Only the side actually being positioned this
    // time gets a real px value; the other side is forced to auto.
    const openBelow = spaceBelow >= maxH || spaceBelow >= spaceAbove;
    if (openBelow) {
      dropdown.style.bottom = "auto";
      dropdown.style.top = (rect.bottom + GAP) + "px";
      dropdown.style.maxHeight = Math.max(80, Math.min(maxH, spaceBelow)) + "px";
    } else {
      dropdown.style.top = "auto";
      dropdown.style.bottom = (window.innerHeight - rect.top + GAP) + "px";
      dropdown.style.maxHeight = Math.max(80, Math.min(maxH, spaceAbove)) + "px";
    }
  }

  wrap.appendChild(input);
  wrap.appendChild(icon);
  select.insertAdjacentElement("afterend", wrap);

  function placeholderLabel() {
    const blank = Array.prototype.find.call(select.options, (o) => o.value === "");
    return (blank && blank.textContent.trim()) || "Select";
  }

  // Re-reads select.value/select.options and updates the proxy input's
  // displayed text. Safe to call any time (open, close, after a
  // programmatic value change elsewhere, after options are repopulated).
  function syncLabel() {
    const selected = select.options[select.selectedIndex];
    if (selected && selected.value !== "") {
      input.value = selected.textContent.trim();
    } else {
      input.value = "";
    }
    input.placeholder = placeholderLabel();
  }

  function syncDisabledStyle() {
    const isDisabled = select.disabled;
    input.disabled = isDisabled;
    wrap.classList.toggle("searchable-select-wrap--disabled", isDisabled);
  }

  function closeDropdown() {
    dropdown.classList.remove("open");
    input.setAttribute("aria-expanded", "false");
  }

  function currentOptions() {
    return Array.prototype.filter.call(select.options, (o) => o.value !== "");
  }

  function selectOption(optionEl) {
    select.value = optionEl.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    syncLabel();
    closeDropdown();
  }

  function renderDropdown(query) {
    // Lazily bail if the select has been disabled programmatically since
    // this wrapper was built — no live observer needed (see file header).
    if (select.disabled) { closeDropdown(); return; }

    const q = (query || "").trim().toLowerCase();
    const all = currentOptions();
    const matches = q ? all.filter((o) => o.textContent.toLowerCase().indexOf(q) > -1) : all;

    dropdown.textContent = "";
    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "autocomplete-empty";
      empty.textContent = "No match found.";
      dropdown.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      matches.forEach((optionEl) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.setAttribute("role", "option");
        item.textContent = optionEl.textContent.trim();
        if (optionEl.disabled) {
          item.classList.add("autocomplete-item--disabled");
          item.setAttribute("aria-disabled", "true");
        } else {
          item.addEventListener("mousedown", (e) => {
            // mousedown (not click) so it fires before the input's blur handler
            e.preventDefault();
            selectOption(optionEl);
          });
        }
        frag.appendChild(item);
      });
      dropdown.appendChild(frag);
    }
    positionDropdown();
    dropdown.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  }

  // Closes the fixed-position portal dropdown on scroll or viewport
  // resize while it's open — simpler and less error-prone than trying to
  // keep it glued to the input as the page moves (the earlier
  // follow-on-scroll approach was the root of several positioning/
  // clipping bugs fixed in prior iterations); closing outright matches
  // how a native <select>'s open list behaves on scroll in most browsers.
  function onScrollOrResize() {
    if (dropdown.classList.contains("open")) closeDropdown();
  }
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);

  // Opening (focus/click) always shows the FULL option list rather than
  // filtering by whatever the input currently displays — deliberately
  // different from initSearchableDropdown's plain-typeahead behaviour
  // (shared-components.js), matching a native <select> instead: clicking
  // a <select> with "Allopathy" already chosen still shows every option,
  // not just ones matching "Allopathy". Typing after that still filters
  // normally via the "input" listener below.
  //
  // Both focus AND click pass "" (not input.value) — the input's value
  // at open time is the SELECTED OPTION'S LABEL (set by syncLabel()), not
  // user-typed search text, so filtering by it on open would wrongly
  // narrow the list to whatever already happens to be selected (e.g.
  // opening a field already set to "Good" would show only options
  // containing "good"). Real click-driven typeahead filtering only ever
  // happens through the "input" listener below, which only fires once
  // the user actually starts typing.
  input.addEventListener("input", () => renderDropdown(input.value));
  input.addEventListener("focus", () => {
    syncDisabledStyle();
    if (select.disabled) return;
    renderDropdown("");
  });
  input.addEventListener("click", () => {
    syncDisabledStyle();
    if (select.disabled) return;
    renderDropdown("");
  });
  input.addEventListener("blur", () => {
    // 200ms delay so a click on a dropdown item registers first — same
    // pattern as initHospNameAutocomplete/initSearchableDropdown.
    setTimeout(() => { closeDropdown(); syncLabel(); }, 200);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDropdown(); input.blur(); }
    if (e.key === "Enter") {
      e.preventDefault();
      const firstMatch = dropdown.querySelector(".autocomplete-item:not(.autocomplete-item--disabled)");
      if (firstMatch && dropdown.classList.contains("open")) {
        const q = input.value.trim().toLowerCase();
        const all = currentOptions();
        const matches = q ? all.filter((o) => o.textContent.toLowerCase().indexOf(q) > -1) : all;
        if (matches.length === 1) selectOption(matches[0]);
      }
    }
  });

  syncDisabledStyle();
  syncLabel();

  const handle = { select, input, wrap, dropdown, syncLabel, syncDisabledStyle };
  SEARCHABLE_SELECT_REGISTRY[selectId] = handle;
  return handle;
}

// Registry of every wrapped select on the current page, keyed by the
// original select's id — lets refreshSearchableSelectLabel/
// refreshAllSearchableSelects find a wrapper without the caller needing
// to keep its own reference around.
const SEARCHABLE_SELECT_REGISTRY = {};

// Call after a programmatic `document.getElementById(id).value = ...` (or
// `.selectedIndex = ...`) write to a converted select, so the visible
// proxy label stays in sync. No-op if that id was never wrapped (e.g. the
// select doesn't exist on the current page, or is the one multi-select
// left native).
function refreshSearchableSelectLabel(selectId) {
  const handle = SEARCHABLE_SELECT_REGISTRY[selectId];
  if (handle) { handle.syncLabel(); handle.syncDisabledStyle(); }
}

// Blanket re-sync of every wrapped select's visible label on the current
// page. Cheap (just a textContent read per wrapper) — used at the end of
// the handful of reset/prefill functions that write many select values
// in one pass (populatePaymentAuditorDummyData, resetCaseDetailsForm,
// applyCaseDetailsPrefill, resetForm, resetBillEntryForm, etc.) instead of
// touching every individual `.value =`/`.selectedIndex =` line inside them.
function refreshAllSearchableSelects() {
  Object.keys(SEARCHABLE_SELECT_REGISTRY).forEach(refreshSearchableSelectLabel);
}

// Initialises every <select> within a container that hasn't been wrapped
// yet — used for static page selects (call once per page on load) and for
// dynamically-rendered grid rows (call after each render, same place the
// row's other listeners already get attached; already-wrapped selects
// from a prior render of the same row are skipped automatically via the
// select.dataset.searchableSelectInit guard, but grid rows are rebuilt via
// innerHTML each render so this mainly matters for repeated calls over a
// container that mixes fresh and already-processed nodes).
function initSearchableSelectsIn(container) {
  const root = container || document;
  root.querySelectorAll("select").forEach((sel) => {
    if (sel.multiple) return;
    initSearchableSelect(sel.id || ensureSelectId(sel));
  });
}

// Grid-row <select> elements built via template strings (e.g. .hg-field,
// .hc-field, .hcexp-field, .ph-field) have no id attribute — they're
// addressed by class + closest("tr")/data-idx instead. Assign a
// throwaway-but-stable-for-this-render id so initSearchableSelect has
// something to key its registry/wrap-lookup off; existing code that reads
// these selects by class/closest() is completely unaffected since the id
// is additive, not a replacement for the class.
let _searchableSelectAutoIdSeq = 0;
function ensureSelectId(sel) {
  _searchableSelectAutoIdSeq += 1;
  const id = "searchableSelectAuto" + _searchableSelectAutoIdSeq;
  sel.id = id;
  return id;
}

// Minimal CSS.escape fallback for selector-safe id interpolation (ids in
// this codebase are always plain camelCase/kebab-case, but guard anyway).
function cssEscape(id) {
  return String(id).replace(/([^\w-])/g, "\\$1");
}
