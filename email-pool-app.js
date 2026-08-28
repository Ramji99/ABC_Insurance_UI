/* =============================================================================
   EMAIL POOL — page behaviour
   Hamburger nav dropdown + profile/role dropdown below are the same generic
   open/close functions used in index.html's header. Global search dropdown and
   advanced search modal below are this page's own (unchanged from the original
   inline script). The profile/role dropdown is self-contained here (no app.js
   dependency), matching index.html's app.js behaviour and styles.
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

/* ---------------- Email Pool page content (unchanged from original inline script) ---------------- */
    (function () {
      "use strict";

      var DATA = [
        {
          id: "renson.dsouza@dummy.com",
          subject: "[EXT]Fwd: Pre-Authorization Request For...",
          created: "29/06/2026 14:50",
          createdTs: 1,
          updated: "29/06/2026 14:51",
          updatedTs: 1,
          tat: "0 Days 0h 2min",
          tatMin: 2,
          priority: "Normal",
          bucket: "0 Days 0h 2min",
          status: "UnderProcess",
          statusLabel: "Under Process",
          assignee: "Renson Dsouza",
          handle: "Nivrenson.Dsouza",
        },
        {
          id: "renson.dsouza@dummy.com",
          subject: "[EXT]Fwd: Pre-Authorization Request For...",
          created: "29/06/2026 14:28",
          createdTs: 2,
          updated: "29/06/2026 14:33",
          updatedTs: 2,
          tat: "0 Days 0h 4min",
          tatMin: 4,
          priority: "Normal",
          bucket: "0 Days 0h 22min",
          status: "Closed",
          statusLabel: "Closed",
          assignee: "Renson Dsouza",
          handle: "Nivrenson.Dsouza",
        },
        {
          id: "bhuvaneshwari.y@dummy.com",
          subject: "[EXT]Fwd: Preauth Request",
          created: "29/06/2026 13:30",
          createdTs: 3,
          updated: "29/06/2026 13:36",
          updatedTs: 3,
          tat: "0 Days 0h 5min",
          tatMin: 5,
          priority: "Normal",
          bucket: "0 Days 1h 19min",
          status: "Closed",
          statusLabel: "Closed",
          assignee: "Bhuvaneshwari Y",
          handle: "Nivbhuvaneshwari.y",
        },
        {
          id: "Shubham.Thakare@dummy.com",
          subject: "Fw: Pre-Authorization Request For Shubha…",
          created: "29/06/2026 12:50",
          createdTs: 4,
          updated: "29/06/2026 12:54",
          updatedTs: 4,
          tat: "0 Days 2h 3min",
          tatMin: 123,
          priority: "Normal",
          bucket: "0 Days 2h 1min",
          status: "UnderProcess",
          statusLabel: "Under Process",
          assignee: "Nagendra Rajawat",
          handle: "nagendra.rajawat",
        },
        {
          id: "bhuvaneshwari.y@dummy.com",
          subject: "[EXT]Fwd: Preauth Request",
          created: "29/06/2026 12:24",
          createdTs: 5,
          updated: "-",
          updatedTs: 0,
          tat: "0 Days 2h 28min",
          tatMin: 148,
          priority: "Normal",
          bucket: "0 Days 2h 24min",
          status: "Pending",
          statusLabel: "Pending",
          assignee: "Bhuvaneshwari Y",
          handle: "Nivbhuvaneshwari.y",
        },
        {
          id: "bhuvaneshwari.y@dummy.com",
          subject: "[EXT]Fwd: Preauth Request",
          created: "29/06/2026 12:16",
          createdTs: 6,
          updated: "-",
          updatedTs: 0,
          tat: "0 Days 2h 36min",
          tatMin: 156,
          priority: "Normal",
          bucket: "0 Days 2h 30min",
          status: "Pending",
          statusLabel: "Pending",
          assignee: "Bhuvaneshwari Y",
          handle: "Nivbhuvaneshwari.y",
        },
        {
          id: "Vikram.Singh@dummy.com",
          subject: "Reimbursement Documents Attached — sync failed",
          created: "29/06/2026 11:58",
          createdTs: 7,
          updated: "-",
          updatedTs: 0,
          tat: "0 Days 2h 53min",
          tatMin: 173,
          priority: "Urgent",
          bucket: "0 Days 2h 53min",
          status: "Error",
          statusLabel: "Error",
          assignee: "Unassigned",
          handle: "",
        },
        {
          id: "akshay.bhat@dummy.com",
          subject: "[EXT]Fwd: Preauth Request",
          created: "29/06/2026 12:01",
          createdTs: 8,
          updated: "29/06/2026 12:12",
          updatedTs: 8,
          tat: "0 Days 0h 11min",
          tatMin: 11,
          priority: "Normal",
          bucket: "0 Days 2h 43min",
          status: "Closed",
          statusLabel: "Closed",
          assignee: "Akshay Bhat",
          handle: "akshay.bhat",
        },
        {
          id: "Greeshma.Shetty@dummy.com",
          subject: "Subject: Pre-Authorization Request For (Poli…",
          created: "29/06/2026 12:01",
          createdTs: 9,
          updated: "29/06/2026 12:07",
          updatedTs: 9,
          tat: "0 Days 0h 6min",
          tatMin: 6,
          priority: "Normal",
          bucket: "0 Days 2h 52min",
          status: "Closed",
          statusLabel: "Closed",
          assignee: "Greeshma Shetty",
          handle: "Greeshma.Shetty",
        },
        {
          id: "akshay.bhat@dummy.com",
          subject: "[EXT]Fwd: Preauth Request",
          created: "29/06/2026 11:50",
          createdTs: 10,
          updated: "29/06/2026 11:52",
          updatedTs: 10,
          tat: "0 Days 0h 5min",
          tatMin: 5,
          priority: "Normal",
          bucket: "0 Days 3h 3min",
          status: "Closed",
          statusLabel: "Closed",
          assignee: "Akshay Bhat",
          handle: "akshay.bhat",
        },
      ];

      var state = {
        rows: DATA.slice(),
        filtered: DATA.slice(),
        selected: new Set(),
        view: "All",
        kpiFilter: "All", // All | Unassigned | Overdue | Mine
        sortKey: "created",
        sortDir: -1,
        page: 1,
        perPage: 15,
        reassignTarget: null,
        filtersOpen: false,
        statusChip: null,
      };

      var tableBody = document.getElementById("tableBody");
      var resultCount = document.getElementById("resultCount");
      var selectAll = document.getElementById("selectAll");
      var bulkBtn = document.getElementById("bulkAssignBtn");
      var bulkBar = document.getElementById("bulkBar");
      var bulkCount = document.getElementById("bulkCount");
      var pager = document.getElementById("pager");
      var rowsPerPage = document.getElementById("rowsPerPage");
      var searchInput = document.getElementById("fSearch");
      var resetBtn = document.getElementById("resetBtn");
      var filterToggle = document.getElementById("filterToggle");
      var filtersDrawer = document.getElementById("filtersDrawer");
      var filterCount = document.getElementById("filterCount");
      var popover = document.getElementById("reassignPop");
      var toast = document.getElementById("toast");
      var toastMsg = document.getElementById("toastMsg");

      function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[c];
        });
      }

      function initials(name) {
        if (name === "Unassigned") return "—";
        var parts = name.trim().split(" ");
        return ((parts[0] || "")[0] || "") + ((parts[1] || "")[0] || "");
      }

      function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () {
          toast.classList.remove("show");
        }, 2200);
      }

      function updateKpis() {
        var total = state.rows.length;
        var unassigned = state.rows.filter(function (r) {
          return r.assignee === "Unassigned";
        }).length;
        var overdue = state.rows.filter(function (r) {
          return r.tatMin >= 120 || r.status === "Error";
        }).length;
        var mine = state.rows.filter(function (r) {
          return r.assignee === "Nagendra Rajawat";
        }).length;
        document.getElementById("kpiTotal").textContent = total;
        document.getElementById("kpiUnassigned").textContent = unassigned;
        document.getElementById("kpiOverdue").textContent = overdue;
        document.getElementById("kpiMine").textContent = mine;
      }

      function applyKpiFilterToRow(item) {
        if (state.kpiFilter === "All") return true;
        if (state.kpiFilter === "Unassigned") {
          return item.assignee === "Unassigned";
        }
        if (state.kpiFilter === "Overdue") {
          return item.tatMin >= 120 || item.status === "Error";
        }
        if (state.kpiFilter === "Mine") {
          return item.assignee === "Nagendra Rajawat";
        }
        return true;
      }

      function setActiveKpi(kpiKey) {
        state.kpiFilter = kpiKey || "All";
        document
          .querySelectorAll(".kpi-card[data-kpi]")
          .forEach(function (card) {
            var active = card.dataset.kpi === state.kpiFilter;
            card.classList.toggle("kpi-active", active);
            card.setAttribute("aria-pressed", String(active));
          });
      }

      function sortRows(rows) {
        var key = state.sortKey;
        var dir = state.sortDir;
        return rows.slice().sort(function (a, b) {
          var av, bv;
          if (key === "id") {
            av = a.id;
            bv = b.id;
            return av.localeCompare(bv) * dir;
          }
          if (key === "created") {
            av = a.createdTs;
            bv = b.createdTs;
            return (av - bv) * dir;
          }
          if (key === "updated") {
            av = a.updatedTs;
            bv = b.updatedTs;
            return (av - bv) * dir;
          }
          if (key === "tat") {
            av = a.tatMin;
            bv = b.tatMin;
            return (av - bv) * dir;
          }
          return 0;
        });
      }

      function paginate(rows) {
        var start = (state.page - 1) * state.perPage;
        return rows.slice(start, start + state.perPage);
      }
      function totalPages() {
        return Math.max(1, Math.ceil(state.filtered.length / state.perPage));
      }

      function renderPager() {
        pager.innerHTML = "";
        var tp = totalPages();
        var mk = function (label, page, opts) {
          opts = opts || {};
          var b = document.createElement("button");
          b.type = "button";
          b.className = "pg-btn" + (opts.active ? " active" : "");
          b.innerHTML = label;
          b.disabled = !!opts.disabled;
          b.addEventListener("click", function () {
            state.page = page;
            render();
          });
          return b;
        };
        pager.appendChild(mk("&laquo;", 1, { disabled: state.page === 1 }));
        pager.appendChild(
          mk("&lsaquo;", Math.max(1, state.page - 1), {
            disabled: state.page === 1,
          }),
        );
        var maxBtns = 5;
        var startP = Math.max(1, state.page - 2);
        var endP = Math.min(tp, startP + maxBtns - 1);
        startP = Math.max(1, endP - maxBtns + 1);
        for (var p = startP; p <= endP; p++)
          pager.appendChild(mk(String(p), p, { active: p === state.page }));
        pager.appendChild(
          mk("&rsaquo;", Math.min(tp, state.page + 1), {
            disabled: state.page === tp,
          }),
        );
        pager.appendChild(mk("&raquo;", tp, { disabled: state.page === tp }));
      }

      function rowHtml(item) {
        var idx = DATA.indexOf(item);
        var key = item.id + idx;
        var selected = state.selected.has(key);
        var assignClass =
          item.assignee === "Unassigned"
            ? "assign-Unassigned"
            : "assign-Assigned";
        var tatClass = item.tatMin >= 120 ? "tat-warn" : "";
        var rowClasses = ["row-status-" + item.status];
        if (selected) rowClasses.push("row-selected");
        var assignLabel =
          item.assignee === "Unassigned"
            ? "Unassigned"
            : '<span class="name-part">' +
            escapeHtml(item.assignee) +
            "</span>";
        return (
          '<tr class="' +
          rowClasses.join(" ") +
          '" data-key="' +
          escapeHtml(key) +
          '">' +
          '<td><input type="checkbox" class="checkbox row-check" data-key="' +
          escapeHtml(key) +
          '" ' +
          (selected ? "checked" : "") +
          ' aria-label="Select ' +
          escapeHtml(item.subject) +
          '"></td>' +
          '<td><div class="cell-subject"><span class="cell-id">' +
          escapeHtml(item.id) +
          '</span><span class="cell-sub" title="' +
          escapeHtml(item.subject) +
          '">' +
          escapeHtml(item.subject) +
          "</span></div></td>" +
          "<td>" +
          escapeHtml(item.created) +
          "</td>" +
          "<td>" +
          escapeHtml(item.updated) +
          "</td>" +
          '<td><span class="tat-chip ' +
          tatClass +
          '">' +
          (tatClass
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 9v4l2.5 2.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
            : "") +
          escapeHtml(item.tat) +
          "</span></td>" +
          '<td><span class="priority-tag priority-' +
          item.priority +
          '"><span class="priority-dot"></span>' +
          item.priority +
          "</span></td>" +
          "<td>" +
          escapeHtml(item.bucket) +
          "</td>" +
          '<td><span class="status-pill status-' +
          item.status +
          '">' +
          item.statusLabel +
          "</span></td>" +
          '<td><div class="assign-cell">' +
          '<button class="avatar-pill ' +
          assignClass +
          '" data-reassign="' +
          escapeHtml(key) +
          '"><span class="av-circle">' +
          initials(item.assignee) +
          "</span>" +
          assignLabel +
          "</button>" +
          '<td style="text-align:center; display:flex; gap:10px; align-items:center"><button class="icon-btn-sm" data-view="' +
          escapeHtml(key) +
          '" aria-label="View ' +
          escapeHtml(item.subject) +
          '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg></button> <a class="icon-btn-sm" href="./index.html"><span class="material-icons">edit</span></a></td>' +
          "</div></td>" +
          "</tr>"
        );
      }

      function renderStatusChipGroup(containerId, baseRows, statusAccessor, labelAccessor, activeValue, onSelect) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var counts = {};
        var labels = {};
        var order = [];
        baseRows.forEach(function (row) {
          var s = statusAccessor(row);
          if (!s) return;
          if (!(s in counts)) { order.push(s); labels[s] = labelAccessor(row); }
          counts[s] = (counts[s] || 0) + 1;
        });
        container.innerHTML = "";
        container.classList.toggle("hidden", !order.length);
        if (!order.length) return;

        function makeChip(label, value, count, extraClass) {
          var btn = document.createElement("button");
          btn.type = "button";
          var active = activeValue === value;
          btn.className = "status-chip " + extraClass + (active ? " status-chip--active" : "");
          btn.setAttribute("aria-pressed", String(active));
          btn.innerHTML = label + ' <span class="status-chip__count">(' + count + ")</span>";
          btn.addEventListener("click", function () { onSelect(active ? null : value); });
          return btn;
        }

        container.appendChild(makeChip("All", null, baseRows.length, "status-chip--all"));
        order.forEach(function (s) {
          container.appendChild(makeChip(labels[s], s, counts[s], "status-" + s));
        });

        var announcer = document.getElementById("statusChipAnnouncer");
        if (announcer) {
          announcer.textContent = activeValue
            ? "Showing " + labels[activeValue] + ", " + (counts[activeValue] || 0) + " records"
            : "Showing all statuses, " + baseRows.length + " records";
        }
      }

      function render() {
        updateKpis();

        var q = searchInput.value.trim().toLowerCase();
        var f = state.rows.filter(function (item) {
          // KPI filter
          if (!applyKpiFilterToRow(item)) return false;

          // Segmented view filter
          if (state.view === "Unassigned" && item.assignee !== "Unassigned")
            return false;
          if (state.view === "Assigned" && item.assignee === "Unassigned")
            return false;

          if (!q) return true;
          return (
            item.id.toLowerCase().indexOf(q) > -1 ||
            item.subject.toLowerCase().indexOf(q) > -1
          );
        });

        renderStatusChipGroup(
          "statusChipGroup", f,
          function (item) { return item.status; },
          function (item) { return item.statusLabel; },
          state.statusChip,
          function (status) {
            state.statusChip = status;
            state.page = 1;
            render();
          }
        );

        if (state.statusChip) {
          f = f.filter(function (item) { return item.status === state.statusChip; });
        }

        state.filtered = sortRows(f);

        if (state.page > totalPages()) state.page = totalPages();
        var pageRows = paginate(state.filtered);

        resultCount.textContent =
          state.filtered.length +
          (state.filtered.length === 1 ? " email" : " emails");

        if (!pageRows.length) {
          tableBody.innerHTML =
            '<tr><td colspan="10" style="padding:0;">' +
            '<div class="empty-state">' +
            '<svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M3 8l9 6 9-6M3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M3 8l9-5 9 5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
            "<h3>No emails match your filters</h3>" +
            "<p>Try a different search term or switch views, then try again.</p>" +
            "</div></td></tr>";
        } else {
          tableBody.innerHTML = pageRows.map(rowHtml).join("");
        }

        renderPager();

        document.querySelectorAll("th.sortable").forEach(function (th) {
          th.classList.toggle(
            "sort-active",
            th.dataset.sort === state.sortKey,
          );
        });

        var allKeys = pageRows.map(function (item) {
          return item.id + DATA.indexOf(item);
        });
        var allChecked =
          allKeys.length > 0 &&
          allKeys.every(function (k) {
            return state.selected.has(k);
          });
        selectAll.checked = allChecked;

        bulkBtn.disabled = state.selected.size === 0;
        bulkBar.classList.toggle("show", state.selected.size > 0);
        bulkCount.innerHTML = "<b>" + state.selected.size + "</b> selected";

        var activeFilterCount =
          (document.getElementById("fPolicy").value ? 1 : 0) +
          (document.getElementById("fClaim").value ? 1 : 0);
        filterCount.style.display = activeFilterCount
          ? "inline-flex"
          : "none";
        filterCount.textContent = activeFilterCount;
      }

      // ------- search / view -------
      searchInput.addEventListener("input", function () {
        state.page = 1;
        render();
      });

      document.querySelectorAll(".seg-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          document.querySelectorAll(".seg-btn").forEach(function (b) {
            b.classList.remove("active");
          });
          btn.classList.add("active");
          state.view = btn.dataset.view;
          state.page = 1;
          render();
        });
      });

      document.querySelectorAll("th.sortable").forEach(function (th) {
        function doSort() {
          var key = th.dataset.sort;
          if (state.sortKey === key) {
            state.sortDir *= -1;
          } else {
            state.sortKey = key;
            state.sortDir = 1;
          }
          render();
        }
        th.addEventListener("click", doSort);
        th.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            doSort();
          }
        });
      });

      // ------- filters drawer -------
      filterToggle.addEventListener("click", function () {
        state.filtersOpen = !state.filtersOpen;
        filtersDrawer.classList.toggle("open", state.filtersOpen);
        filterToggle.classList.toggle("active", state.filtersOpen);
        filterToggle.setAttribute("aria-expanded", String(state.filtersOpen));
      });

      ["fPolicy", "fClaim"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", render);
      });

      resetBtn.addEventListener("click", function () {
        searchInput.value = "";
        document.getElementById("fPolicy").value = "";
        document.getElementById("fClaim").value = "";
        document.querySelectorAll(".seg-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        document
          .querySelector('.seg-btn[data-view="All"]')
          .classList.add("active");
        state.view = "All";
        state.kpiFilter = "All";
        clearKpiActiveExcept("All");
        state.sortKey = "created";
        state.sortDir = -1;
        state.page = 1;
        render();
        showToast("Filters reset");
      });

      // ------- rows per page -------
      rowsPerPage.addEventListener("change", function () {
        state.perPage = parseInt(rowsPerPage.value, 10);
        state.page = 1;
        render();
      });
      // Static options already in the HTML — safe to wrap immediately
      // (see shared/searchable-select.js); the 'change' event this
      // dispatches on selection is caught by the listener just above,
      // unchanged.
      initSearchableSelect("rowsPerPage");

      // ------- selection -------
      document.addEventListener("change", function (e) {
        var cb = e.target.closest(".row-check");
        if (!cb) return;
        if (cb.checked) state.selected.add(cb.dataset.key);
        else state.selected.delete(cb.dataset.key);
        render();
      });

      selectAll.addEventListener("change", function () {
        var pageRows = paginate(state.filtered);
        pageRows.forEach(function (item) {
          var key = item.id + DATA.indexOf(item);
          if (selectAll.checked) state.selected.add(key);
          else state.selected.delete(key);
        });
        render();
      });

      function assignSelectedToMe() {
        if (!state.selected.size) return;
        state.rows.forEach(function (item, idx) {
          if (state.selected.has(item.id + idx)) {
            item.assignee = "Nagendra Rajawat";
            item.handle = "nagendra.rajawat";
          }
        });
        var count = state.selected.size;
        state.selected.clear();
        render();
        showToast(
          count + " email" + (count === 1 ? "" : "s") + " assigned to you",
        );
      }
      bulkBtn.addEventListener("click", assignSelectedToMe);
      document
        .getElementById("bulkAssignMini")
        .addEventListener("click", assignSelectedToMe);
      document
        .getElementById("bulkClear")
        .addEventListener("click", function () {
          state.selected.clear();
          render();
        });

      // ------- view action -------
      document.addEventListener("click", function (e) {
        var vb = e.target.closest("[data-view]");
        if (vb && vb.tagName === "BUTTON") {
          showToast("Opening email…");
        }
      });

      // ------- KPI card clicks -------
      function clearKpiActiveExcept(key) {
        document
          .querySelectorAll(".kpi-card[data-kpi]")
          .forEach(function (card) {
            card.classList.toggle("kpi-active", card.dataset.kpi === key);
            card.setAttribute(
              "aria-pressed",
              String(card.dataset.kpi === key),
            );
          });
      }

      function setSegmentView(view) {
        state.view = view;
        document.querySelectorAll(".seg-btn").forEach(function (b) {
          b.classList.toggle("active", b.dataset.view === view);
        });
      }

      function setSegmentFromKpi(kpi) {
        if (kpi === "Unassigned") return setSegmentView("Unassigned");
        if (kpi === "Mine") return setSegmentView("Assigned");
        // All/Overdue => treat as All segment
        return setSegmentView("All");
      }

      document
        .querySelectorAll(".kpi-card[data-kpi]")
        .forEach(function (card) {
          var kpi = card.dataset.kpi;
          var onPick = function () {
            // toggle behavior: click active KPI => reset to All
            if (state.kpiFilter === kpi) {
              state.kpiFilter = "All";
              clearKpiActiveExcept("All");
              setSegmentView("All");
              state.page = 1;
              render();
              return;
            }
            state.kpiFilter = kpi;
            clearKpiActiveExcept(kpi);
            setSegmentFromKpi(kpi);
            state.page = 1;
            render();
          };

          card.addEventListener("click", function (e) {
            e.preventDefault();
            onPick();
          });

          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick();
            }
          });
        });

      // ------- reassign popover -------
      var reassignSearch = document.getElementById("reassignSearch");
      var reassignReason = document.getElementById("reassignReason");
      var reassignSaveBtn = document.getElementById("reassignSaveBtn");
      var reassignCancelBtn = document.getElementById("reassignCancelBtn");
      var selectedUserName = null;
      var selectedUserHandle = null;

      function setSelectedOpt(opt) {
        selectedUserName = opt ? opt.dataset.name : null;
        selectedUserHandle = opt ? opt.dataset.handle || "" : null;
        popover.querySelectorAll(".reassign-user-item").forEach(function (b) {
          b.classList.toggle("is-selected", !!(opt && b === opt));
        });
      }

      function closePopover() {
        popover.classList.remove("open");
        state.reassignTarget = null;
        selectedUserName = null;
        selectedUserHandle = null;
        setSelectedOpt(null);
        if (reassignSearch) reassignSearch.value = "";
        if (reassignReason) reassignReason.value = "";
      }

      function openPopoverForTarget(rb) {
        state.reassignTarget = rb.dataset.reassign;
        selectedUserName = null;
        selectedUserHandle = null;
        setSelectedOpt(null);
        if (reassignSearch) reassignSearch.value = "";
        if (reassignReason) reassignReason.value = "";

        var rect = rb.getBoundingClientRect();
        popover.style.top = rect.bottom + window.scrollY + 6 + "px";
        var left = rect.left + window.scrollX;
        if (left + 320 > window.innerWidth) left = window.innerWidth - 340;
        if (left < 10) left = 10;
        popover.style.left = left + "px";
        popover.classList.add("open");
      }

      document.addEventListener("click", function (e) {
        var rb = e.target.closest("[data-reassign]");
        if (rb) {
          openPopoverForTarget(rb);
          e.stopPropagation();
          return;
        }
        if (!e.target.closest("#reassignPop")) closePopover();
      });

      if (reassignSearch) {
        reassignSearch.addEventListener("input", function () {
          var q = this.value.trim().toLowerCase();
          popover.querySelectorAll(".reassign-user-item").forEach(function (opt) {
            var name = (
              opt.dataset.user ||
              opt.dataset.name ||
              ""
            ).toLowerCase();
            opt.style.display = !q || name.indexOf(q) > -1 ? "flex" : "none";
          });
        });
      }

      popover.addEventListener("click", function (e) {
        var opt = e.target.closest(".reassign-user-item");
        if (!opt || !state.reassignTarget) return;
        setSelectedOpt(opt);
      });

      function applyReassign() {
        if (!state.reassignTarget) return;
        if (!selectedUserName) {
          showToast("Select a user first");
          return;
        }
        var reason = reassignReason ? reassignReason.value.trim() : "";
        if (!reason) {
          showToast("Reason is required");
          return;
        }

        state.rows.forEach(function (item, idx) {
          if (item.id + idx === state.reassignTarget) {
            item.assignee = selectedUserName;
            item.handle = selectedUserHandle || "";
            item.reassignReason = reason;
          }
        });

        var name = selectedUserName;
        closePopover();
        render();
        showToast(
          name === "Unassigned" ? "Email unassigned" : "Assigned to " + name,
        );
      }

      reassignSaveBtn.addEventListener("click", function () {
        applyReassign();
      });
      reassignCancelBtn.addEventListener("click", function () {
        closePopover();
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closePopover();
      });

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

      render();
    })();
