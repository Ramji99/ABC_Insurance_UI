# Task: Replace `user-menu-wrap` with `profile-wrap` in Email Pages

## Steps

### Step 1: HTML - email-pool-dashboard-modern3.html
- [x] Replace `div.user-menu-wrap` (with all its contents: user-chip, user-menu, role-list, logout-row, last-login) with `div.profile-wrap` (from index.html's header pattern)

### Step 2: JS - email-pool-app.js
- [x] Remove the `user role-switch menu` JS code block (userChipBtn, userMenu, userMenuCollapse, userRoleLabel, logoutBtn event handlers, role-opt click handlers, star-btn click handlers)

### Step 3: CSS - email-pool-styles.css
- [x] Remove `.user-menu-wrap`, `.user-chip`, `.user-menu`, `.user-menu-head`, `.user-avatar`, `.user-meta`, `.user-name`, `.user-role`, `.chip-chev`, `.logout-row`, `.last-login`, `.star-btn`, `.role-opt` related styles

### Step 4: HTML - email-team-dashboard.html
- [x] Replace `div.user-menu-wrap` (with all its contents) with `div.profile-wrap`

### Step 5: JS - email-team-app.js
- [x] Remove the `User role-switch menu` JS code block (userChipBtn, userMenu, userMenuCollapse, userRoleLabel, logoutBtn event handlers, role-opt click handlers, star-btn click handlers)

### Step 6: CSS - email-team-styles.css
- [x] Remove `.user-menu-wrap`, `.user-chip`, `.user-menu`, `.user-menu-head`, `.user-avatar`, `.user-meta`, `.user-name`, `.user-role`, `.chip-chev`, `.logout-row`, `.last-login`, `.star-btn`, `.role-opt` related styles

### Step 7: Self-contained profile/role dropdown (matching index.html)
- [x] Add the same profile/role dropdown JS block (ROLES list, `renderRoleList`, toggle/hide/Escape handlers) to `email-pool-app.js` and `email-team-app.js` — identical to the `app.js` logic used by index.html
- [x] Add the same `.role-dropdown` / `.role-list` / `.role-option` CSS (from shared `styles.css`) to `email-pool-styles.css` and `email-team-styles.css`
- [x] Remove the shared `app.js` include from both `email-pool-dashboard-modern3.html` and `email-team-dashboard.html` — `app.js` is index.html-specific (references `navDropdownListView`, `docViewerOverlay`, `switchToListView`, `#gridBody`, etc.) and would crash on the email pages; the email scripts are now self-contained

### Step 8: Cleanup leftovers
- [x] Remove stale `user-meta` media query reference in `email-pool-styles.css` (leftover from the old header pattern)
- [x] Remove nested `document.addEventListener("click", ...)` referencing undefined `profileWrap`/`roleDropdown` inside the keydown handler in `email-pool-app.js` (profile dropdown is now handled by the self-contained block)
- [x] Update `email-pool-app.js` header comment to no longer reference `app.js` as the profile dropdown owner

### Step 9: Verification
- [x] `profile-wrap` present on both `email-pool-dashboard-modern3.html` and `email-team-dashboard.html` (identical structure + IDs: `profileWrap`, `profileBtn`, `profileAvatar`, `profileUserName`, `profileRoleName`, `roleDropdown`, `roleList`)
- [x] `styles.css` (shared) loaded on both pages; `.role-dropdown`/`.role-list`/`.role-option`/`.profile-wrap` styles now also present in the email page stylesheets
- [x] Profile/role dropdown JS is self-contained in `email-pool-app.js` and `email-team-app.js` (same ROLES + render/toggle logic as index.html's `app.js`)
- [x] No stale `user-menu-wrap` / `user-chip` / `chip-chev` / `logout-row` / `last-login` / `userChipBtn` / `userMenuCollapse` / `userRoleLabel` / `logoutBtn` / `role-opt` / `star-btn` references remain in any `.html`, `.js`, or `.css` file
- [x] Shared `app.js` no longer loaded on email pages (avoids index.html-specific crashes and double-binding the hamburger)

