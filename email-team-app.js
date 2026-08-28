/* =============================================================================
   EMAIL TEAM DASHBOARD — page behaviour
   Header interactions (hamburger nav dropdown, profile/role dropdown toggle)
   are the same generic open/close functions used in index.html's header.
   Global search dropdown + advanced search modal + team dashboard logic below
   is this page's own (unchanged from the original inline script).
   ============================================================================= */

/* ---------------- Shared Header — Hamburger Nav Dropdown ---------------- */
(function () {
  var hamburgerWrap = document.getElementById("hamburgerWrap");
  var hamburgerBtn = document.getElementById("hamburgerBtn");
  var navDropdownMenu = document.getElementById("navDropdownMenu");
  if (!hamburgerWrap || !hamburgerBtn || !navDropdownMenu) return;

  hamburgerBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var willOpen = navDropdownMenu.classList.contains("hidden");
    navDropdownMenu.classList.toggle("hidden");
    hamburgerBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });
  document.addEventListener("click", function (e) {
    if (!hamburgerWrap.contains(e.target)) {
      navDropdownMenu.classList.add("hidden");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      navDropdownMenu.classList.add("hidden");
      hamburgerBtn.setAttribute("aria-expanded", "false");
    }
  });
})();

/* ---------------- Shared Header — Profile / Role Dropdown (matches index.html app.js) ---------------- */
(function () {
  var profileWrap = document.getElementById("profileWrap");
  var profileBtn = document.getElementById("profileBtn");
  var roleDropdown = document.getElementById("roleDropdown");
  var roleList = document.getElementById("roleList");
  var profileRoleName = document.getElementById("profileRoleName");
  if (!profileWrap || !profileBtn || !roleDropdown || !roleList) return;

  /* Same role list as index.html app.js */
  var ROLES = [
    "Scan Tag",
    "Scan Tag TL",
    "Non Medico TL",
    "Non Medico",
    "Medico TL",
    "Medico",
    "QC TL",
    "QC",
    "Payment Auditor - Settlement User",
    "Payment"
  ];

  /* Initialise to the role already shown on the page, otherwise the first role */
  var currentRole = (profileRoleName && ROLES.indexOf(profileRoleName.textContent) !== -1)
    ? profileRoleName.textContent
    : ROLES[0];

  function renderRoleList() {
    roleList.innerHTML = ROLES.map(function (role) {
      return '<label class="role-option ' + (currentRole === role ? "selected" : "") + '" data-role="' + role + '">' +
        '<input type="radio" name="userRole" value="' + role + '"' + (currentRole === role ? " checked" : "") + '>' +
        '<span>' + role + '</span>' +
        '</label>';
    }).join("");

    roleList.querySelectorAll(".role-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        currentRole = opt.getAttribute("data-role");
        if (profileRoleName) profileRoleName.textContent = currentRole;
        renderRoleList();
        roleDropdown.classList.add("hidden");
      });
    });
  }

  profileBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var willOpen = roleDropdown.classList.contains("hidden");
    roleDropdown.classList.toggle("hidden");
    if (willOpen) renderRoleList();
  });

  document.addEventListener("click", function (e) {
    if (!profileWrap.contains(e.target)) {
      roleDropdown.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      roleDropdown.classList.add("hidden");
    }
  });
})();

/* ---------------- Email Team Dashboard page content (unchanged from original inline script) ---------------- */
    (function () {
      "use strict";

      /* ══════════════════════════════════════════════════════
       TEAM TABLE — all rows live in HTML, JS reads DOM only
       ══════════════════════════════════════════════════════ */
      var tbody = document.getElementById("tableBody");
      var resultCount = document.getElementById("resultCount");
      var pager = document.getElementById("pager");
      var rowsPerPage = document.getElementById("rowsPerPage");
      var searchInput = document.getElementById("fSearch");
      var resetBtn = document.getElementById("resetBtn");
      var sortSelect = document.getElementById("sortSelect");
      var toast = document.getElementById("toast");
      var toastMsg = document.getElementById("toastMsg");

      var teamState = { sort: "assigned-desc", page: 1, perPage: 5 };

      function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () {
          toast.classList.remove("show");
        }, 2200);
      }

      function allTeamRows() {
        return Array.from(tbody.querySelectorAll("tr"));
      }

      /* KPIs — read data-* from DOM rows */
      function updateKpis() {
        // If we sync from email-pool via localStorage, KPI should be computed from those emails.
        // Fallback to DOM mock counts if queue isn't initialized.
        var ls = null;
        try {
          var raw = localStorage.getItem(QUEUE_LS_KEY);
          ls = raw ? JSON.parse(raw) : null;
        } catch (e) {
          ls = null;
        }

        var emails = ls && Array.isArray(ls.emails) ? ls.emails : null;
        if (emails && emails.length) {
          // Team members are derived from assignee values.
          var byMember = {};
          emails.forEach(function (em) {
            var m = em.assignee || "Unassigned";
            byMember[m] = byMember[m] || { assigned: 0, pending: 0 };
            byMember[m].assigned += 1;
            // pending>15mins: we treat tatMin >= 15mins (=15). This is aligned to UI label.
            if (parseInt(em.tatMin, 10) >= 15) byMember[m].pending += 1;
          });

          var members = Object.keys(byMember);
          document.getElementById("kpiMembers").textContent = members.length;
          document.getElementById("kpiTotal").textContent = members.reduce(
            function (s, m) {
              return s + byMember[m].assigned;
            },
            0,
          );
          document.getElementById("kpiPending").textContent = members.reduce(
            function (s, m) {
              return s + byMember[m].pending;
            },
            0,
          );
          document.getElementById("kpiClean").textContent = members.filter(
            function (m) {
              return byMember[m].pending === 0;
            },
          ).length;
          return;
        }

        // DOM mock KPI fallback
        var rows = allTeamRows();
        document.getElementById("kpiMembers").textContent = rows.length;
        document.getElementById("kpiTotal").textContent = rows.reduce(
          function (s, r) {
            return s + parseInt(r.dataset.assigned, 10);
          },
          0,
        );
        document.getElementById("kpiPending").textContent = rows.reduce(
          function (s, r) {
            return s + parseInt(r.dataset.pending, 10);
          },
          0,
        );
        document.getElementById("kpiClean").textContent = rows.filter(
          function (r) {
            return parseInt(r.dataset.pending, 10) === 0;
          },
        ).length;
      }

      /* Sort — reorder <tr> nodes directly */
      function sortTeam() {
        var rows = allTeamRows();
        rows.sort(function (a, b) {
          var av, bv;
          switch (teamState.sort) {
            case "assigned-asc":
              return (
                parseInt(a.dataset.assigned, 10) -
                parseInt(b.dataset.assigned, 10)
              );
            case "pending-desc":
              return (
                parseInt(b.dataset.pending, 10) -
                parseInt(a.dataset.pending, 10)
              );
            case "pending-asc":
              return (
                parseInt(a.dataset.pending, 10) -
                parseInt(b.dataset.pending, 10)
              );
            case "name-asc":
              return (a.dataset.name || "").localeCompare(
                b.dataset.name || "",
              );
            default:
              return (
                parseInt(b.dataset.assigned, 10) -
                parseInt(a.dataset.assigned, 10)
              );
          }
        });
        rows.forEach(function (tr) {
          tbody.appendChild(tr);
        });
      }

      /* Pagination */
      function teamTotalPages(vis) {
        return Math.max(1, Math.ceil(vis / teamState.perPage));
      }

      function applyTeamPagination() {
        var visible = allTeamRows().filter(function (tr) {
          return !tr.hidden;
        });
        var s = (teamState.page - 1) * teamState.perPage;
        visible.forEach(function (tr, i) {
          tr.style.display =
            i >= s && i < s + teamState.perPage ? "" : "none";
        });
        return visible.length;
      }

      function renderTeamPager(vis) {
        pager.innerHTML = "";
        var tp = teamTotalPages(vis);
        if (teamState.page > tp) teamState.page = tp;
        function mk(lbl, pg, opts) {
          opts = opts || {};
          var b = document.createElement("button");
          b.type = "button";
          b.className = "pg-btn" + (opts.active ? " active" : "");
          b.innerHTML = lbl;
          b.disabled = !!opts.disabled;
          b.addEventListener("click", function () {
            teamState.page = pg;
            renderTeam();
          });
          return b;
        }
        pager.appendChild(
          mk("&laquo;", 1, { disabled: teamState.page === 1 }),
        );
        pager.appendChild(
          mk("&lsaquo;", Math.max(1, teamState.page - 1), {
            disabled: teamState.page === 1,
          }),
        );
        var maxB = 5,
          sP = Math.max(1, teamState.page - 2),
          eP = Math.min(tp, sP + maxB - 1);
        sP = Math.max(1, eP - maxB + 1);
        for (var p = sP; p <= eP; p++)
          pager.appendChild(
            mk(String(p), p, { active: p === teamState.page }),
          );
        pager.appendChild(
          mk("&rsaquo;", Math.min(tp, teamState.page + 1), {
            disabled: teamState.page === tp,
          }),
        );
        pager.appendChild(
          mk("&raquo;", tp, { disabled: teamState.page === tp }),
        );
      }

      function renderTeam() {
        updateKpis();
        sortTeam();
        var q = searchInput.value.trim().toLowerCase();

        // Keep KPI filter and search filter working together.
        allTeamRows().forEach(function (tr) {
          var name = (tr.dataset.name || "").toLowerCase();
          var handle = (tr.dataset.handle || "").toLowerCase();
          var searchHidden = !!(
            q &&
            name.indexOf(q) === -1 &&
            handle.indexOf(q) === -1
          );

          var kpiHidden = false;
          if (teamKpiActive === "overdue")
            kpiHidden = parseInt(tr.dataset.pending, 10) <= 0;
          else if (teamKpiActive === "clean")
            kpiHidden = parseInt(tr.dataset.pending, 10) !== 0;

          tr.hidden = searchHidden || kpiHidden;
        });

        var vis = applyTeamPagination();
        renderTeamPager(vis);
        resultCount.textContent = vis + (vis === 1 ? " member" : " members");
        document
          .querySelectorAll("th.sortable[data-sort]")
          .forEach(function (th) {
            th.classList.toggle(
              "sort-active",
              teamState.sort.startsWith(th.dataset.sort),
            );
          });
      }

      searchInput.addEventListener("input", function () {
        teamState.page = 1;
        renderTeam();
      });
      sortSelect.addEventListener("change", function () {
        teamState.sort = sortSelect.value;
        teamState.page = 1;
        renderTeam();
      });
      rowsPerPage.addEventListener("change", function () {
        teamState.perPage = parseInt(rowsPerPage.value, 10);
        teamState.page = 1;
        renderTeam();
      });
      // Both are static <select>s with hardcoded HTML options — safe to
      // wrap immediately (see shared/searchable-select.js). Every
      // programmatic `sortSelect.value = ...` write below is followed by
      // refreshSearchableSelectLabel('sortSelect') so the visible proxy
      // label stays in sync.
      initSearchableSelect("sortSelect");
      initSearchableSelect("rowsPerPage");
      resetBtn.addEventListener("click", function () {
        searchInput.value = "";
        sortSelect.value = "assigned-desc";
        refreshSearchableSelectLabel("sortSelect");
        teamState.sort = "assigned-desc";
        teamState.page = 1;
        renderTeam();
        showToast("Filters reset");
      });

      document
        .querySelectorAll("th.sortable[data-sort]")
        .forEach(function (th) {
          function doSort() {
            var k = th.dataset.sort;
            var asc = k + "-asc";
            var desc = k + "-desc";
            teamState.sort = teamState.sort === desc ? asc : desc;
            sortSelect.value = teamState.sort;
            refreshSearchableSelectLabel("sortSelect");
            renderTeam();
          }
          th.addEventListener("click", doSort);
          th.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              doSort();
            }
          });
        });

      /* ══════════════════════════════════════════════════════
       DRILL-DOWN PANEL — email list for a specific agent
       ══════════════════════════════════════════════════════ */
      var drillPanel = document.getElementById("drilldownPanel");
      var drillLabel = document.getElementById("drilldownLabel");
      var backBtn = document.getElementById("backBtn");
      var ddBody = document.getElementById("ddTableBody");
      var ddPager = document.getElementById("ddPager");
      var ddRowsPerPage = document.getElementById("ddRowsPerPage");
      var ddSelectAll = document.getElementById("ddSelectAll");
      var mainSection = document.querySelector("main#main");

      var ddState = {
        member: "",
        sortKey: "created",
        sortDir: 1,
        page: 1,
        perPage: 5,
        statusChip: null,
      };

      function ddRowStatus(tr) {
        var m = (tr.className || "").match(/row-status-([A-Za-z]+)/);
        return m ? m[1] : "";
      }

      function renderDDStatusChipGroup() {
        var container = document.getElementById("ddStatusChipGroup");
        if (!container) return;
        var memberRows = allDDRows().filter(function (tr) { return tr.dataset.member === ddState.member; });
        var counts = {};
        var order = [];
        memberRows.forEach(function (tr) {
          var s = ddRowStatus(tr);
          if (!s) return;
          if (!(s in counts)) order.push(s);
          counts[s] = (counts[s] || 0) + 1;
        });
        container.innerHTML = "";
        container.classList.toggle("hidden", !order.length);
        if (!order.length) return;

        function makeChip(label, value, count, extraClass) {
          var btn = document.createElement("button");
          btn.type = "button";
          var active = ddState.statusChip === value;
          btn.className = "status-chip " + extraClass + (active ? " status-chip--active" : "");
          btn.setAttribute("aria-pressed", String(active));
          btn.innerHTML = label + ' <span class="status-chip__count">(' + count + ")</span>";
          btn.addEventListener("click", function () {
            ddState.statusChip = active ? null : value;
            ddState.page = 1;
            renderDD();
          });
          return btn;
        }

        container.appendChild(makeChip("All", null, memberRows.length, "status-chip--all"));
        order.forEach(function (s) {
          container.appendChild(makeChip(s, s, counts[s], "status-" + s));
        });

        var announcer = document.getElementById("ddStatusChipAnnouncer");
        if (announcer) {
          announcer.textContent = ddState.statusChip
            ? "Showing " + ddState.statusChip + ", " + (counts[ddState.statusChip] || 0) + " records"
            : "Showing all statuses, " + memberRows.length + " records";
        }
      }

      function allDDRows() {
        return Array.from(ddBody.querySelectorAll("tr.dd-row"));
      }

      function sortDD() {
        var rows = allDDRows();
        var key = ddState.sortKey,
          dir = ddState.sortDir;
        rows.sort(function (a, b) {
          var av, bv;
          if (key === "created") {
            av = parseInt(a.dataset.createdTs, 10);
            bv = parseInt(b.dataset.createdTs, 10);
          } else if (key === "updated") {
            av = parseInt(a.dataset.updatedTs, 10);
            bv = parseInt(b.dataset.updatedTs, 10);
          } else if (key === "tat") {
            av = parseInt(a.dataset.tatMin, 10);
            bv = parseInt(b.dataset.tatMin, 10);
          } else return 0;
          return (av - bv) * dir;
        });
        rows.forEach(function (tr) {
          ddBody.appendChild(tr);
        });
      }

      function applyDDPagination() {
        var visible = allDDRows().filter(function (tr) {
          return !tr.hidden;
        });

        var s = (ddState.page - 1) * ddState.perPage;
        visible.forEach(function (tr, i) {
          tr.style.display = i >= s && i < s + ddState.perPage ? "" : "none";
        });
        return visible.length;
      }

      function renderDDPager(vis) {
        ddPager.innerHTML = "";
        var tp = Math.max(1, Math.ceil(vis / ddState.perPage));
        if (ddState.page > tp) ddState.page = tp;
        function mk(lbl, pg, opts) {
          opts = opts || {};
          var b = document.createElement("button");
          b.type = "button";
          b.className = "pg-btn" + (opts.active ? " active" : "");
          b.innerHTML = lbl;
          b.disabled = !!opts.disabled;
          b.addEventListener("click", function () {
            ddState.page = pg;
            renderDD();
          });
          return b;
        }
        ddPager.appendChild(
          mk("&laquo;", 1, { disabled: ddState.page === 1 }),
        );
        ddPager.appendChild(
          mk("&lsaquo;", Math.max(1, ddState.page - 1), {
            disabled: ddState.page === 1,
          }),
        );
        var maxB = 5,
          sP = Math.max(1, ddState.page - 2),
          eP = Math.min(tp, sP + maxB - 1);
        sP = Math.max(1, eP - maxB + 1);
        for (var p = sP; p <= eP; p++)
          ddPager.appendChild(
            mk(String(p), p, { active: p === ddState.page }),
          );
        ddPager.appendChild(
          mk("&rsaquo;", Math.min(tp, ddState.page + 1), {
            disabled: ddState.page === tp,
          }),
        );
        ddPager.appendChild(
          mk("&raquo;", tp, { disabled: ddState.page === tp }),
        );
      }

      function renderDD() {
        sortDD();
        renderDDStatusChipGroup();
        allDDRows().forEach(function (tr) {
          var memberMatch = tr.dataset.member === ddState.member;
          var statusMatch = !ddState.statusChip || ddRowStatus(tr) === ddState.statusChip;
          tr.hidden = !(memberMatch && statusMatch);
        });
        var vis = applyDDPagination();
        renderDDPager(vis);
        /* select-all state */
        var page = allDDRows().filter(function (tr) {
          return tr.style.display !== "none" && !tr.hidden;
        });
        var chk = page.filter(function (tr) {
          return tr.querySelector(".dd-row-check").checked;
        }).length;
        ddSelectAll.checked = page.length > 0 && chk === page.length;
        ddSelectAll.indeterminate = chk > 0 && chk < page.length;
        document
          .querySelectorAll("th.sortable[data-ddsort]")
          .forEach(function (th) {
            th.classList.toggle(
              "sort-active",
              th.dataset.ddsort === ddState.sortKey,
            );
          });
      }

      function openDrilldown(memberName, count) {
        ddState.member = memberName;
        ddState.page = 1;
        ddState.sortKey = "created";
        ddState.sortDir = 1;
        ddState.statusChip = null;
        /* clear checkboxes */
        allDDRows().forEach(function (tr) {
          tr.querySelector(".dd-row-check").checked = false;
          tr.classList.remove("row-selected");
        });
        ddSelectAll.checked = false;
        ddSelectAll.indeterminate = false;
        drillLabel.textContent = memberName + " (" + count + ")";
        mainSection.hidden = true;
        drillPanel.hidden = false;
        drillPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        renderDD();
      }

      function closeDrilldown() {
        drillPanel.hidden = true;
        mainSection.hidden = false;
        mainSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      /* task-link click on team table */
      tbody.addEventListener("click", function (e) {
        var btn = e.target.closest(".task-link");
        if (!btn) return;
        openDrilldown(btn.dataset.member, btn.dataset.count);
      });

      backBtn.addEventListener("click", closeDrilldown);

      /* drill-down header column sorts */
      document
        .querySelectorAll("th.sortable[data-ddsort]")
        .forEach(function (th) {
          function doSort() {
            var key = th.dataset.ddsort;
            if (ddState.sortKey === key) {
              ddState.sortDir *= -1;
            } else {
              ddState.sortKey = key;
              ddState.sortDir = 1;
            }
            renderDD();
          }
          th.addEventListener("click", doSort);
          th.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              doSort();
            }
          });
        });

      /* drill-down rows per page */
      ddRowsPerPage.addEventListener("change", function () {
        ddState.perPage = parseInt(ddRowsPerPage.value, 10);
        ddState.page = 1;
        renderDD();
      });
      initSearchableSelect("ddRowsPerPage");

      /* drill-down select-all */
      ddSelectAll.addEventListener("change", function () {
        var page = allDDRows().filter(function (tr) {
          return tr.style.display !== "none" && !tr.hidden;
        });
        page.forEach(function (tr) {
          tr.querySelector(".dd-row-check").checked = ddSelectAll.checked;
          tr.classList.toggle("row-selected", ddSelectAll.checked);
        });
        renderDD();
      });

      ddBody.addEventListener("change", function (e) {
        var cb = e.target.closest(".dd-row-check");
        if (!cb) return;
        cb.closest("tr").classList.toggle("row-selected", cb.checked);
        renderDD();
      });

      ddBody.addEventListener("click", function (e) {
        if (e.target.closest(".icon-btn-sm")) showToast("Opening email…");
      });

      /* ── Assign / Reassign popup (drilldown) ── */
      var teamAssignPop = document.getElementById("teamAssignPop");
      var teamAssignSearch = document.getElementById("teamAssignSearch");
      var teamAssignReason = document.getElementById("teamAssignReason");
      var teamAssignSaveBtn = document.getElementById("teamAssignSaveBtn");
      var teamAssignCancelBtn = document.getElementById(
        "teamAssignCancelBtn",
      );
      var teamAssignTargetLabel = document.getElementById(
        "teamAssignTargetLabel",
      );
      var teamAssignUserList = document.getElementById("teamAssignUserList");

      var ddAssignTarget = null; // { ddr, row }
      var selectedUserName = null;
      var selectedUserHandle = null;

      function getDdRowByDdr(ddr) {
        return (
          Array.from(ddBody.querySelectorAll("tr.dd-row")).find(
            function (tr) {
              var btn = tr.querySelector(".avatar-pill[data-ddr]");
              return btn && String(btn.dataset.ddr) === String(ddr);
            },
          ) || null
        );
      }

      function setTeamSelectedOpt(opt) {
        selectedUserName = opt ? opt.dataset.user : null;
        selectedUserHandle = opt ? opt.dataset.handle || "" : null;
        if (!teamAssignUserList) return;
        Array.from(
          teamAssignUserList.querySelectorAll(".popover-opt"),
        ).forEach(function (b) {
          b.setAttribute("aria-checked", String(!!(opt && b === opt)));
        });
      }

      function closeTeamAssignPop() {
        if (!teamAssignPop) return;
        teamAssignPop.classList.remove("open");
        teamAssignPop.hidden = true;
        ddAssignTarget = null;
        selectedUserName = null;
        selectedUserHandle = null;
        setTeamSelectedOpt(null);
        if (teamAssignSearch) teamAssignSearch.value = "";
        if (teamAssignReason) teamAssignReason.value = "";
        if (teamAssignTargetLabel) teamAssignTargetLabel.textContent = "";
      }

      // Shared queue persistence (static sync using localStorage)
      var QUEUE_LS_KEY = "dummy_email_queue_v1";

      function loadQueueFromLS() {
        try {
          var raw = localStorage.getItem(QUEUE_LS_KEY);
          var parsed = raw ? JSON.parse(raw) : null;
          if (parsed && Array.isArray(parsed.emails)) return parsed.emails;
        } catch (e) { }
        return null;
      }

      function saveQueueToLS(emails) {
        var payload = {
          version: 1,
          updatedAt: new Date().toISOString(),
          emails: emails || [],
        };
        localStorage.setItem(QUEUE_LS_KEY, JSON.stringify(payload));
      }

      function ensureQueueInitialized() {
        // Team has the authoritative drilldown rows for now; initialize LS using current DOM if empty.
        var existing = loadQueueFromLS();
        if (existing && existing.length) return existing;

        // Build LS emails based on current drilldown dataset.
        var built = [];
        allDDRows().forEach(function (tr) {
          var member = tr.dataset.member || "";
          // Use createdTs/updatedTs/tatMin/member as a stable-ish identity fallback.
          // Pool uses real email id; later we’ll map by email row order when sync triggers.
          var createdTs = tr.dataset.createdTs || "0";
          var tatMin = tr.dataset.tatMin || "0";
          built.push({
            uid: "team-dd-" + createdTs + "-" + tatMin + "-" + member,
            assignee: member,
            handle:
              member === "Unassigned"
                ? ""
                : tr.querySelector(".avatar-pill[data-ddr]")
                  ? tr.querySelector(".avatar-pill[data-ddr]").dataset.ddr
                  : "",
            tatMin: parseInt(tr.dataset.tatMin || "0", 10),
            status:
              (tr.className || "").indexOf("row-status-") > -1
                ? (tr.className.match(/row-status-([A-Za-z]+)/) || [, ""])[1]
                : "",
            updatedAt: new Date().toISOString(),
          });
        });

        saveQueueToLS(built);
        return built;
      }

      // Initialize on load
      var queueEmails = ensureQueueInitialized();

      function openTeamAssignPopForBtn(btn) {
        if (!teamAssignPop) return;
        var ddr = btn.dataset.ddr;
        ddAssignTarget = { ddr: ddr, row: getDdRowByDdr(ddr) };
        selectedUserName = null;
        selectedUserHandle = null;
        setTeamSelectedOpt(null);
        if (teamAssignSearch) teamAssignSearch.value = "";
        if (teamAssignReason) teamAssignReason.value = "";

        if (teamAssignTargetLabel) {
          var current =
            ddAssignTarget.row && ddAssignTarget.row.dataset.member
              ? ddAssignTarget.row.dataset.member
              : "";
          teamAssignTargetLabel.textContent = current
            ? "Target: " + current
            : "";
        }

        var rect = btn.getBoundingClientRect();
        teamAssignPop.style.top = rect.bottom + window.scrollY + 6 + "px";
        var left = rect.left + window.scrollX;
        if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
        if (left < 10) left = 10;
        teamAssignPop.style.left = left + "px";

        teamAssignPop.hidden = false;
        teamAssignPop.classList.add("open");
      }

      document.addEventListener("click", function (e) {
        var btn = e.target.closest(".avatar-pill[data-ddr]");
        if (btn && btn.closest("#ddTableBody")) {
          e.preventDefault();
          e.stopPropagation();
          openTeamAssignPopForBtn(btn);
          return;
        }
        if (
          teamAssignPop &&
          !teamAssignPop.contains(e.target) &&
          !e.target.closest(".avatar-pill[data-ddr]")
        ) {
          closeTeamAssignPop();
        }
      });

      if (teamAssignSearch) {
        teamAssignSearch.addEventListener("input", function () {
          var q = this.value.trim().toLowerCase();
          Array.from(
            teamAssignUserList.querySelectorAll(".popover-opt"),
          ).forEach(function (opt) {
            var name = (opt.dataset.user || "").toLowerCase();
            opt.style.display = !q || name.indexOf(q) > -1 ? "flex" : "none";
          });
        });
      }

      if (teamAssignUserList) {
        teamAssignUserList.addEventListener("click", function (e) {
          var opt = e.target.closest(".popover-opt");
          if (!opt) return;
          setTeamSelectedOpt(opt);
        });
      }

      if (teamAssignCancelBtn) {
        teamAssignCancelBtn.addEventListener("click", function () {
          closeTeamAssignPop();
        });
      }

      if (teamAssignSaveBtn) {
        teamAssignSaveBtn.addEventListener("click", function () {
          if (!ddAssignTarget || !ddAssignTarget.row) {
            showToast("Select target email first");
            return;
          }
          if (!selectedUserName) {
            showToast("Select a user first");
            return;
          }
          var reason = teamAssignReason ? teamAssignReason.value.trim() : "";
          if (!reason) {
            showToast("Reason is required");
            return;
          }

          var tr = ddAssignTarget.row;
          var curBtn = tr.querySelector(".avatar-pill[data-ddr]");
          if (curBtn) {
            // Update button label + avatar circle
            curBtn.dataset.ddr = ddAssignTarget.ddr;
            curBtn.querySelector(".name-part").textContent = selectedUserName;

            // Match pool avatar style: use same handle initials mapping as team table (for known names)
            var initMap = {
              "Ajay Rai": "AR",
              "Payal Saluja": "PS",
              "Sumitra S": "SS",
              "Vijayashree D": "VD",
              "Renson Dsouza": "RD",
              "Bhuvaneshwari Y": "BY",
              "Nagendra Rajawat": "NR",
              "Greeshma Shetty": "GS",
              Unassigned: "—",
            };

            var init =
              initMap[selectedUserName] ||
              (selectedUserName === "Unassigned"
                ? "—"
                : selectedUserName
                  .split(" ")
                  .map(function (p) {
                    return p[0] || "";
                  })
                  .join("")
                  .slice(0, 2));
            curBtn.querySelector(".av-circle").textContent = init;

            // Update assign style
            curBtn.classList.remove("assign-Assigned", "assign-Unassigned");
            if (selectedUserName === "Unassigned")
              curBtn.classList.add("assign-Unassigned");
            else curBtn.classList.add("assign-Assigned");

            // --- Sync team table counts + drilldown label (so counts update in both places) ---
            // Update the underlying email row's member dataset.
            ddAssignTarget.row.dataset.member = selectedUserName;

            // Update member counts based on current drilldown rows in DOM.
            var memberRowCounts = {};
            allDDRows().forEach(function (tr) {
              var m = tr.dataset.member || "";
              memberRowCounts[m] = (memberRowCounts[m] || 0) + 1;
            });

            // Update team table task-link counts for visible task rows.
            tbody.querySelectorAll("tr").forEach(function (teamTr) {
              var nm = teamTr.dataset.name;
              var cnt = memberRowCounts[nm] || 0;
              var taskLink = teamTr.querySelector(".task-link");
              var pendingCell = teamTr.querySelector(".pending-pill");

              if (taskLink) {
                taskLink.dataset.count = String(cnt);
                // Keep text formatting: "X Task(s)"
                var label = cnt + " Task" + (cnt !== 1 ? "s" : "");
                taskLink.childNodes[
                  taskLink.childNodes.length - 1
                ].textContent = label;
              }

              // Keep pending value unchanged (we don't recalc pending in this DOM mock), but adjust assigned to keep KPI in sync.
              teamTr.dataset.assigned = String(cnt);
              var avatar = teamTr.querySelector(".pending-pill .p-count");
              if (avatar) {
                // pending-pill already contains pending; do not modify
              }

              // Update progress bar width based on maxAssigned
              // maxAssigned isn't available here; approximate by using max across team rows.
            });
          }

          // Update drilldown header label counts
          var newCount =
            ddAssignTarget.row && ddAssignTarget.row.dataset.member
              ? allDDRows().filter(function (tr) {
                return (
                  tr.dataset.member === ddAssignTarget.row.dataset.member
                );
              }).length
              : 0;
          if (ddAssignTarget.row && ddAssignTarget.row.dataset.member) {
            drillLabel.textContent =
              ddAssignTarget.row.dataset.member + " (" + newCount + ")";
          }

          showToast(
            selectedUserName === "Unassigned"
              ? "Email unassigned"
              : "Assigned to " + selectedUserName,
          );
          closeTeamAssignPop();
        });
      }

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeTeamAssignPop();
      });

      /* ══════════════════════════════════════════════════════
       USER ROLE-SWITCH MENU
       ══════════════════════════════════════════════════════ */

      // ------- KPI card clicks (team dashboard drilldown) -------
      function clearKpiActiveAll() {
        document.querySelectorAll(".kpi-card").forEach(function (c) {
          c.classList.remove("kpi-selected");
          c.setAttribute("aria-pressed", "false");
        });
      }

      function setKpiActive(selector) {
        clearKpiActiveAll();
        document.querySelectorAll(selector).forEach(function (c) {
          c.classList.add("kpi-selected");
          c.setAttribute("aria-pressed", "true");
        });
      }

      var teamKpiActive = "all"; // all | overdue | clean

      var kpiMembersCard = document.querySelector(".kpi-card.kpi-total");
      var kpiAssignedCard = document.querySelector(".kpi-card.kpi-active");
      var kpiPendingCard = document.querySelector(".kpi-card.kpi-overdue");
      var kpiCleanCard = document.querySelector(".kpi-card.kpi-closed");

      function applyTeamKpiFilter() {
        // Filter team table rows based on DOM datasets.
        // Reset hidden flags.
        allTeamRows().forEach(function (tr) {
          tr.hidden = false;
        });

        if (teamKpiActive === "overdue") {
          allTeamRows().forEach(function (tr) {
            tr.hidden = parseInt(tr.dataset.pending, 10) > 0;
          });
        } else if (teamKpiActive === "clean") {
          allTeamRows().forEach(function (tr) {
            tr.hidden = parseInt(tr.dataset.pending, 10) !== 0;
          });
        }

        applyTeamPagination();
        renderTeamPager(
          allTeamRows().filter(function (tr) {
            return !tr.hidden;
          }).length,
        );
        var visCount = allTeamRows().filter(function (tr) {
          return !tr.hidden;
        }).length;
        resultCount.textContent =
          visCount + (visCount === 1 ? " member" : " members");
      }

      function wireKpiCard(card, kpiKey) {
        if (!card) return;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-pressed", String(teamKpiActive === kpiKey));
        card.addEventListener("click", function (e) {
          e.preventDefault();
          if (teamKpiActive === kpiKey) teamKpiActive = "all";
          else teamKpiActive = kpiKey;

          setKpiActive(
            kpiKey === "all"
              ? ".kpi-card.kpi-total"
              : kpiKey === "overdue"
                ? ".kpi-card.kpi-overdue"
                : kpiKey === "clean"
                  ? ".kpi-card.kpi-closed"
                  : ".kpi-card.kpi-active",
          );
          teamState.page = 1;
          applyTeamKpiFilter();
        });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            card.click();
          }
        });
      }

      wireKpiCard(kpiMembersCard, "all");
      wireKpiCard(kpiAssignedCard, "all");
      wireKpiCard(kpiPendingCard, "overdue");
      wireKpiCard(kpiCleanCard, "clean");

      // ------- end KPI card clicks -------

      var AVATARS = {
        /* kept for reference — not used in DOM-only approach */

        "Ajay Rai": { bg: "#e9f0fe", fg: "#2451c4", init: "AR" },
        "Payal Saluja": { bg: "#fdeef0", fg: "#c8102e", init: "PS" },
        "Sumitra S": { bg: "#fef3e2", fg: "#b7791f", init: "SS" },
        "Vijayashree D": { bg: "#e6f6ec", fg: "#1e7d3c", init: "VD" },
        "Renson Dsouza": { bg: "#f3f0fe", fg: "#6d28d9", init: "RD" },
        "Bhuvaneshwari Y": { bg: "#fce8e8", fg: "#b3161c", init: "BY" },
        "Nagendra Rajawat": { bg: "#e9f0fe", fg: "#1e3a8a", init: "NR" },
        "Greeshma Shetty": { bg: "#e6f6ec", fg: "#1e7d3c", init: "GS" },
      };

      /* AVATARS kept for reference only — DOM rows already have inline colors */

/* ── Global Search Bar Interactive ── */
      (function initGlobalSearch() {
        var input = document.getElementById('globalSearchInput');
        var clear = document.getElementById('globalSearchClear');
        var submit = document.getElementById('globalSearchSubmit');
        var dropdown = document.getElementById('gsDropdown');
        var trigger = document.getElementById('gsDropdownTrigger');
        var label = document.getElementById('gsDropdownLabel');
        var menu = document.getElementById('gsDropdownMenu');
        var overlay = document.getElementById('gsDropdownOverlay');

        if (!input || !clear || !submit || !dropdown || !trigger || !label || !menu) return;

        var OPTIONS = [
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

        var ICON_MAP = {
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

        var selectedValue = OPTIONS[0].value;

        function renderOptions() {
          menu.innerHTML = OPTIONS.map(function (o) {
            return '<div class="gs-dropdown__option ' + (o.value === selectedValue ? 'is-selected' : '') + '" data-value="' + o.value + '" role="option" aria-selected="' + (o.value === selectedValue) + '" tabindex="-1">' +
              '<span class="gs-dropdown__option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICON_MAP[o.icon] || ICON_MAP['file-text']) + '" /></svg></span>' +
              '<span>' + o.label + '</span>' +
              '<svg class="gs-dropdown__option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>' +
              '</div>';
          }).join('');
        }

        function selectOption(value) {
          var opt = OPTIONS.find(function (o) { return o.value === value; });
          if (!opt) return;
          selectedValue = value;
          label.textContent = opt.label;
          renderOptions();
          closeDropdown();
        }

        function openDropdown() {
          var rect = dropdown.getBoundingClientRect();
          menu.style.top = (rect.bottom + 6) + 'px';
          menu.style.left = rect.left + 'px';
          menu.style.width = Math.max(rect.width, Math.min(rect.width + 360, 500)) + 'px';
          dropdown.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          var selectedEl = menu.querySelector('.gs-dropdown__option.is-selected');
          if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
        }

        function closeDropdown() {
          dropdown.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }

        function toggleDropdown() {
          if (dropdown.classList.contains('open')) closeDropdown();
          else openDropdown();
        }

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
          var optEl = e.target.closest('.gs-dropdown__option');
          if (!optEl) return;
          selectOption(optEl.dataset.value);
          input.focus();
        });

        menu.addEventListener('keydown', function (e) {
          var items = [...menu.querySelectorAll('.gs-dropdown__option')];
          var idx = items.indexOf(e.target.closest('.gs-dropdown__option'));
          if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
          if (e.key === 'Enter') { e.preventDefault(); if (idx >= 0) selectOption(items[idx].dataset.value); input.focus(); }
          if (e.key === 'Escape') { closeDropdown(); trigger.focus(); }
        });

        document.addEventListener('click', function (e) {
          if (dropdown.classList.contains('open') && !dropdown.contains(e.target)) closeDropdown();
        });

        function updateClear() {
          clear.classList.toggle('visible', (input.value || '').trim().length > 0);
        }

        function executeSearch() {
          var term = (input.value || '').trim();
          if (!term) { input.focus(); return; }
          searchInput.value = term;
          searchInput.dispatchEvent(new Event('input'));
          showToast('Searching ' + label.textContent + ' for "' + term + '"');
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

        renderOptions();
        updateClear();
      })();

      /* ── Advanced Search Modal ── */
      (function initAdvancedSearch() {
        var advBtn = document.getElementById('gsAdvancedBtn');
        var overlay = document.getElementById('gsAdvancedOverlay');
        var closeBtn = document.getElementById('gsAdvancedClose');
        var modal = document.getElementById('gsAdvancedModal');
        var categorySel = document.getElementById('gsAdvCategory');
        var keywordInp = document.getElementById('gsAdvKeyword');
        var dateInp = document.getElementById('gsAdvDateRange');
        var toggleName = document.getElementById('gsAdvToggleName');
        var toggleDob = document.getElementById('gsAdvToggleDob');
        var condField = document.getElementById('gsAdvConditionalField');
        var condLabel = document.getElementById('gsAdvConditionalLabel');
        var condInput = document.getElementById('gsAdvConditionalInput');
        var clearAllBtn = document.getElementById('gsAdvancedClearAll');
        var searchBtn = document.getElementById('gsAdvancedSearch');

        if (!advBtn || !overlay || !modal) return;

        var CATEGORIES = [
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

        if (categorySel) {
          categorySel.innerHTML = CATEGORIES.map(function (c) { return '<option value="' + c.value + '">' + c.label + '</option>'; }).join('');
          initSearchableSelect('gsAdvCategory');
        }

        advBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          overlay.classList.add('open');
          document.body.style.overflow = 'hidden';
        });

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

        var activeToggle = 'name';

        function setToggle(type) {
          activeToggle = type;
          toggleName.classList.toggle('active', type === 'name');
          toggleDob.classList.toggle('active', type === 'dob');
          if (type === 'name') {
            condLabel.textContent = 'Insured Name';
            condInput.type = 'text';
            condInput.placeholder = 'Enter insured name\u2026';
          } else {
            condLabel.textContent = 'Date of Birth';
            condInput.type = 'date';
            condInput.placeholder = '';
          }
        }

        toggleName.addEventListener('click', function () { setToggle('name'); });
        toggleDob.addEventListener('click', function () { setToggle('dob'); });

        clearAllBtn.addEventListener('click', function () {
          if (categorySel) categorySel.selectedIndex = 0;
          refreshSearchableSelectLabel('gsAdvCategory');
          keywordInp.value = '';
          dateInp.value = '';
          setToggle('name');
          condInput.value = '';
        });

        function executeAdvancedSearch() {
          var keyword = (keywordInp.value || '').trim();
          if (!keyword) { keywordInp.focus(); return; }
          searchInput.value = keyword;
          searchInput.dispatchEvent(new Event('input'));
          showToast('Advanced search: ' + keyword);
          closeAdvanced();
        }

        searchBtn.addEventListener('click', executeAdvancedSearch);
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

      /* ── Init ── */
      renderTeam();
    })();
