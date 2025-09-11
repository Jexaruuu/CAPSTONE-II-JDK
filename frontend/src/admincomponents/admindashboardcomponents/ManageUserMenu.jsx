// AdminManageUser.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MoreHorizontal, ChevronsUpDown, Check } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* ---------------- Feature Flags (keep code, toggle visibility/behavior) ---------------- */
const ENABLE_SELECTION = false; // ⬅️ set true to show tick boxes + footer again
const BOLD_FIRST_NAME = false; // ⬅️ set true if you want first name bold again

/* ---------------- Helpers ---------------- */
const formatPrettyDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};
const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

/* ---------------- Page ---------------- */
export default function AdminManageUser() {
  // Start empty so placeholders are not shown
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  // Sort keys now reflect new columns: 'first_name' | 'last_name' | 'sex' | 'email' | 'role'
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);

  // NEW: role filter (same tab UX as Service Requests)
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'client' | 'worker'

  // NEW: search bar (same style/behavior as Service Requests)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Normalize API payload into our new columns
  const normalizeUsers = (list) => {
    return (list || []).map((u) => {
      const first_name =
        u.first_name ||
        (u.name ? String(u.name).trim().split(" ")[0] : "") ||
        "";
      const last_name =
        u.last_name ||
        (u.name ? String(u.name).trim().split(" ").slice(1).join(" ") : "") ||
        "";
      const email = u.email || u.email_address || "";
      const role =
        (u.role && String(u.role).toLowerCase()) ||
        (u.jobTitle === "Worker" ? "worker" : "client");
      const sex = u.sex || "-";

      return {
        id: u.id || u.auth_uid || email,
        first_name,
        last_name,
        sex,
        email,
        role, // "client" | "worker" (lowercase)
      };
    });
  };

  // Fetch Clients + Workers from API
  const fetchUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE}/api/admin/users`, { withCredentials: true });
      const list = Array.isArray(res?.data?.users) ? res.data.users : [];
      const mapped = normalizeUsers(list);
      setRows(mapped);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load users");
      setRows([]); // ensure no placeholders
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchUsers();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, []);

  // Header checkbox indeterminate logic (no-op when selection disabled)
  useEffect(() => {
    if (!ENABLE_SELECTION) return;
    const el = headerCheckboxRef.current;
    if (!el) return;
    if (selected.size === 0) {
      el.indeterminate = false;
      el.checked = false;
    } else if (selected.size === rows.length) {
      el.indeterminate = false;
      el.checked = true;
    } else {
      el.indeterminate = true;
    }
  }, [selected, rows.length]);

  // NEW: compute role counts (like counts in Service Requests tabs)
  const roleCounts = useMemo(() => {
    const acc = { client: 0, worker: 0, total: 0 };
    for (const u of rows) {
      const r = String(u.role || "").toLowerCase() === "worker" ? "worker" : "client";
      acc[r] += 1;
      acc.total += 1;
    }
    return acc;
  }, [rows]);

  // NEW: filter by role first
  const filteredByRole = useMemo(() => {
    if (roleFilter === "all") return rows;
    return rows.filter((u) => String(u.role || "").toLowerCase() === roleFilter);
  }, [rows, roleFilter]);

  // NEW: then filter by search (first name, last name, full name, email, sex, role)
  const baseRows = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return filteredByRole;
    return filteredByRole.filter((u) => {
      const fn = String(u.first_name || "").toLowerCase();
      const ln = String(u.last_name || "").toLowerCase();
      const full = `${fn} ${ln}`.trim();
      const email = String(u.email || "").toLowerCase();
      const sex = String(u.sex || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      return (
        fn.includes(term) ||
        ln.includes(term) ||
        full.includes(term) ||
        email.includes(term) ||
        sex.includes(term) ||
        role.includes(term)
      );
    });
  }, [filteredByRole, debouncedSearch]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return baseRows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...baseRows].sort((a, b) => {
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [baseRows, sort]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    );

  const allSelected = ENABLE_SELECTION && selected.size === baseRows.length && baseRows.length > 0;

  const toggleSelectAll = () => {
    if (!ENABLE_SELECTION) return;
    setSelected(allSelected ? new Set() : new Set(baseRows.map((r) => r.id)));
  };
  const toggleSelectRow = (id) =>
    setSelected((prev) => {
      if (!ENABLE_SELECTION) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Adjust colSpan depending on whether selection column is visible
  const COLSPAN = ENABLE_SELECTION ? 7 : 6;

  // NEW: role tabs like Service Requests
  const roleTabs = [
    { key: "all", label: "All", count: roleCounts.total },
    { key: "client", label: "Client", count: roleCounts.client },
    { key: "worker", label: "Worker", count: roleCounts.worker },
  ];

  return (
    <main className="p-6">
      {/* Page title (kept same spacing) */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 mt-2">
          Employees can be enrolled in one sick policy. Make sure that your policy is compliant with your state rules.
        </p>
      </div>

      {/* Section wrapper preserved (-mx-6 / px-6 like your other pages) */}
      <section className="mt-6">
        <div className="-mx-6">
          {/* Keep this block but hide it so the 'Users' text is removed visually */}
          <div className="px-6 mb-3 hidden">
            <h2 className="text-lg font-semibold text-gray-900 sr-only">Users</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsers}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Role filter tabs + search + Refresh (exact layout like Service Requests) */}
          <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
            <div className="flex items-center gap-2">
              {roleTabs.map(t => {
                const active = roleFilter === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setRoleFilter(t.key)}
                    className={[
                      "rounded-full px-3.5 py-1.5 text-sm border",
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    ].join(" ")}
                  >
                    <span>{t.label}</span>
                    <span
                      className={[
                        "ml-2 inline-flex items-center justify-center min-w-6 rounded-full px-1.5 text-xs font-semibold",
                        active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                      ].join(" ")}
                    >
                      {typeof t.count === "number" ? t.count : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right controls — Search + Refresh (matches Service Requests) */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Users"
                  className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search users"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-gray-500 hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={fetchUsers}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="px-6">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {/* Loading / error banners */}
              {loading && (
                <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b border-blue-100">
                  Loading users…
                </div>
              )}
              {loadError && !loading && (
                <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
                  {loadError}
                </div>
              )}

              {/* Horizontal + vertical scroll only INSIDE the table area. */}
              <div className="overflow-x-auto">
                <div className="max-h-[520px] md:max-h-[63vh] overflow-y-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-sm text-gray-600">
                        {ENABLE_SELECTION && (
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 w-12 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                            <input
                              ref={headerCheckboxRef}
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onChange={toggleSelectAll}
                              checked={allSelected}
                              aria-label="Select all users"
                            />
                          </th>
                        )}

                        {/* New columns */}
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("first_name")}
                        >
                          <span className="inline-flex items-center gap-1">
                            First Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("last_name")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Last Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("sex")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Sex
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("email")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Email
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("role")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Role
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>

                        {/* Action Header */}
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 w-24 font-medium text-gray-700 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="text-sm text-gray-800">
                      {sortedRows.map((u, idx) => (
                        <tr
                          key={u.id}
                          className={`border-t border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}
                        >
                          {ENABLE_SELECTION && (
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selected.has(u.id)}
                                onChange={() => toggleSelectRow(u.id)}
                                aria-label={`Select ${u.first_name} ${u.last_name}`}
                              />
                            </td>
                          )}

                          {/* First Name */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-300">
                                <img
                                  src={avatarFromName(`${u.first_name} ${u.last_name}`.trim())}
                                  alt={`${u.first_name} ${u.last_name}`}
                                  className="h-full w-full object-cover"
                                  onError={({ currentTarget }) => {
                                    currentTarget.style.display = "none";
                                    const parent = currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="h-9 w-9 grid place-items-center bg-blue-100 text-blue-700 text-xs font-semibold">${(u.first_name || "?")
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase()}</div>`;
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className={`text-gray-900 truncate ${BOLD_FIRST_NAME ? "font-medium" : "font-normal"}`}>
                                  {u.first_name || "-"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Last Name */}
                          <td className="px-4 py-4">{u.last_name || "-"}</td>

                          {/* Sex */}
                          <td className="px-4 py-4">{u.sex || "-"}</td>

                          {/* Email */}
                          <td className="px-4 py-4">
                            <div className="text-gray-700 truncate">{u.email}</div>
                          </td>

                          {/* Role — Service Requests-style badge */}
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                (u.role || "").toLowerCase() === "worker"
                                  ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                                  : "border-emerald-200 text-emerald-700 bg-emerald-50"
                              }`}
                            >
                              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                              {u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                            </span>
                          </td>

                          {/* Actions: align to Action header (left & fixed width) */}
                          <td className="px-4 py-4 w-24 text-left">
                            <RowMenu
                              onView={() => alert(`View ${u.first_name} ${u.last_name}`)}
                            />
                          </td>
                        </tr>
                      ))}

                      {!loading && !loadError && sortedRows.length === 0 && (
                        <tr>
                          <td colSpan={COLSPAN} className="px-4 py-16 text-center text-gray-500">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer actions (outside scroll; hidden when selection disabled) */}
              {ENABLE_SELECTION && selected.size > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    {selected.size} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                      onClick={() => alert("Bulk action")}
                    >
                      Bulk action
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ------------- Row menu (plain text "View" under Action column; component kept) ------------- */
function RowMenu({ onView, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Render a non-button link-style control
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <span
        role="link"
        tabIndex={0}
        onClick={() => {
          setOpen(false);
          onView?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView?.();
          }
        }}
        className="cursor-pointer text-blue-600 hover:underline font-medium inline-flex items-center"
        aria-label="View user"
      >
        {/* Keep icon in codebase but hide it visually so only 'View' appears */}
        <MoreHorizontal className="hidden" aria-hidden="true" />
        View
      </span>
    </div>
  );
}
