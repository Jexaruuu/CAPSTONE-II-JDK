// AdminManageUser.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, ChevronsUpDown, Check } from "lucide-react";

/* ---------------- Helpers ---------------- */
const formatPrettyDate = (iso) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};
const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;

/* ------------- Demo data (swap with API/Supabase) ------------- */
const INITIAL_USERS = [
  { id: "u1", name: "Jamie Croquetas", email: "jamie@example.com", date: "2024-02-01", jobTitle: "Chief Editor", employmentType: "Employment" },
  { id: "u2", name: "Encarna Homie", email: "encarna@example.com", date: "2024-02-01", jobTitle: "Account Manager", employmentType: "Employment" },
  { id: "u3", name: "Cibeles Veterinario", email: "cibeles@example.com", date: "2024-09-08", jobTitle: "Brand Designer", employmentType: "Contractor" },
  { id: "u4", name: "Esteban BBVA", email: "esteban.rivera@example.com", date: "2024-10-22", jobTitle: "Client Support Manager", employmentType: "Employment" },
  { id: "u5", name: "Iver Make Up", email: "iver204@example.com", date: "2024-10-17", jobTitle: "Account Director", employmentType: "Contractor" },
  { id: "u6", name: "Agustín Trabajo", email: "trabajo.mitc@example.com", date: "2024-09-08", jobTitle: "Motion Graphics Designer", employmentType: "Employment" },
  { id: "u7", name: "Iyamirís Cel Santander", email: "iyamiris.young@example.com", date: "2024-09-21", jobTitle: "Marketing Director", employmentType: "Employment" },
  { id: "u8", name: "Robert Fox", email: "robert@example.com", date: "2024-09-08", jobTitle: "Client Support Manager", employmentType: "Contractor" },
  { id: "u9", name: "Uziel Renta", email: "renta.reid@example.com", date: "2024-05-16", jobTitle: "UI&UX Designer", employmentType: "Employment" },
  { id: "u10", name: "Valerie Ahorro", email: "ahorro@example.com", date: "2024-05-24", jobTitle: "Backend Developer", employmentType: "Employment" },
];

/* ---------------- Page ---------------- */
export default function AdminManageUser() {
  const [rows, setRows] = useState(INITIAL_USERS);
  const [sort, setSort] = useState({ key: null, dir: "asc" }); // 'date'|'jobTitle'|'employmentType'
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);

  // Header checkbox indeterminate logic
  useEffect(() => {
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

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "date") {
        return (new Date(a.date) - new Date(b.date)) * dir;
      }
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [rows, sort]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    );

  const allSelected = selected.size === rows.length && rows.length > 0;
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleSelectRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
      <section className="mt-8">
        <div className="-mx-6">
          <div className="px-6 flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>

          <div className="px-6">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {/* Horizontal + vertical scroll only INSIDE the table area.
                  Height is capped so the page doesn't grow */}
              <div className="overflow-x-auto">
                <div
                  className="
                    max-h-[520px] md:max-h-[63vh]
                    overflow-y-auto
                  "
                >
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-sm text-gray-600">
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
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
                          Name
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("date")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Date
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("jobTitle")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Job title
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("employmentType")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Employment Type
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 w-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]" />
                      </tr>
                    </thead>

                    <tbody className="text-sm text-gray-800">
                      {sortedRows.map((u, idx) => (
                        <tr
                          key={u.id}
                          className={`border-t border-gray-100 ${
                            idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selected.has(u.id)}
                              onChange={() => toggleSelectRow(u.id)}
                              aria-label={`Select ${u.name}`}
                            />
                          </td>

                          {/* Name + email + avatar */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-300">
                                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                                <img
                                  src={avatarFromName(u.name)}
                                  alt={u.name}
                                  className="h-full w-full object-cover"
                                  onError={({ currentTarget }) => {
                                    currentTarget.style.display = "none";
                                    const parent = currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="h-9 w-9 grid place-items-center bg-blue-100 text-blue-700 text-xs font-semibold">${(u.name || "?")
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase()}</div>`;
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {u.name}
                                </div>
                                <div className="text-gray-500 truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-gray-700">
                            {formatPrettyDate(u.date)}
                          </td>

                          <td className="px-4 py-4">{u.jobTitle}</td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                                u.employmentType === "Employment"
                                  ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                  : "border-amber-200 text-amber-700 bg-amber-50"
                              }`}
                            >
                              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                              {u.employmentType}
                            </span>
                          </td>

                          <td className="px-2 py-4 text-right">
                            <RowMenu
                              onView={() => alert(`View ${u.name}`)}
                              onEdit={() => alert(`Edit ${u.name}`)}
                              onRemove={() => {
                                setRows((prev) => prev.filter((r) => r.id !== u.id));
                                setSelected((prev) => {
                                  const n = new Set(prev);
                                  n.delete(u.id);
                                  return n;
                                });
                              }}
                            />
                          </td>
                        </tr>
                      ))}

                      {sortedRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-16 text-center text-gray-500">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer actions (outside scroll so it stays visible) */}
              {selected.size > 0 && (
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

/* ------------- Row menu (headless popover) ------------- */
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

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
        aria-label="Open row menu"
      >
        <MoreHorizontal className="h-5 w-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onView?.();
            }}
          >
            View
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onEdit?.();
            }}
          >
            Edit
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onRemove?.();
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
