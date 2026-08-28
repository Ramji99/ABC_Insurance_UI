/* ==========================================================================
   ABC HCP — Shared Role/Router State
   Extracted from app.js (shared data/router layer, precursor to splitting
   process-claim.html out of index.html) — no behaviour change.

   `currentRole` used to be a plain mutable `let` in app.js. ES module
   imports are read-only bindings, so any page that needs to read AND write
   the active role (e.g. index.html and, later, process-claim.html) must go
   through these getter/setter functions instead of importing the value
   directly.
   ========================================================================== */

// Persisted via the page's own URL (?role=...), not sessionStorage — this
// app is opened as a local file:// page, where sessionStorage is
// unreliable (Chrome/Edge often origin-isolate file:// pages, so writes
// don't survive a reload). The URL query string has none of that problem:
// setCurrentRole() below updates it via history.replaceState (no reload,
// no new history entry), so a plain refresh re-reads the same URL and
// keeps the previously selected role instead of resetting to ROLES[0]
// ("Scan Tag"). sessionStorage is still written as a harmless best-effort
// fallback for browsers/setups where it does work.
const ROLE_STORAGE_KEY = "hcp_currentRole";
function readRoleFromUrl() {
  const fromUrl = new URLSearchParams(window.location.search).get("role");
  if (fromUrl && ROLES.includes(fromUrl)) return fromUrl;
  try {
    const fromStorage = sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (fromStorage && ROLES.includes(fromStorage)) return fromStorage;
  } catch (e) { /* sessionStorage inaccessible under some file:// setups */ }
  return null;
}
let currentRole = readRoleFromUrl() || ROLES[0];
function getCurrentRole() { return currentRole; }
function setCurrentRole(role) {
  currentRole = role;
  try { sessionStorage.setItem(ROLE_STORAGE_KEY, role); } catch (e) { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.set("role", role);
  history.replaceState(null, "", url);
}

// Which content the merged "Scan Tag" module shows — independent of
// currentRole, so switching tabs never changes the role/module name shown
// in the header or breadcrumb. Only meaningful while currentRole === "Scan Tag".
let scanTagTab = "inward"; // "inward" | "claim"
function getScanTagTab() { return scanTagTab; }
function setScanTagTab(tab) { scanTagTab = tab; }
