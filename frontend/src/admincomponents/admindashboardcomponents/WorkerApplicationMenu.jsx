import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronsUpDown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ENABLE_SELECTION = false;
const BOLD_FIRST_NAME = false;
const ACTION_ALIGN_RIGHT = false;

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

function StatusPill({ value }) {
  const v = String(value || "").toLowerCase();
  const cfg =
    v === "approved"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", label: "Approved" }
      : v === "declined"
      ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", label: "Declined" }
      : { bg: "bg-amber-50", text: "text-amber-700", br: "border-amber-200", label: "Pending" };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        cfg.bg,
        cfg.text,
        cfg.br,
      ].join(" ")}
      aria-label={`Status: ${cfg.label}`}
      title={cfg.label}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {cfg.label}
    </span>
  );
}

const isYes = (v) => String(v ?? "").toLowerCase() === "yes";
const rate_toNumber = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

export default function WorkerApplicationMenu() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: "name_first", dir: "asc" });
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);
  const [viewRow, setViewRow] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });

  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/workerapplications/count`, { withCredentials: true });
      const c = res?.data || {};
      setCounts({
        pending: c.pending || 0,
        approved: c.approved || 0,
        declined: c.declined || 0,
        total: c.total || 0,
      });
    } catch {}
  };

  const fetchItems = async (statusArg = filter, qArg = searchTerm) => {
    setLoading(true);
    setLoadError("");
    try {
      const params = {};
      if (statusArg && statusArg !== "all") params.status = statusArg;
      if (qArg && qArg.trim()) params.q = qArg.trim();

      const res = await axios.get(`${API_BASE}/api/admin/workerapplications`, {
        params,
        withCredentials: true,
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((r) => {
        const i = r.info || {};
        const w = r.work || {};
        const rate = r.rate || {};
        const st = Array.isArray(w.service_types) ? w.service_types : [];
        return {
          id: r.id,
          request_group_id: r.request_group_id,
          status: r.status || "pending",
          name_first: i.first_name || "",
          name_last: i.last_name || "",
          email: r.email_address || i.email_address || "",
          barangay: i.barangay || "",
          age: i.age ?? null,
          years_experience: w.years_experience ?? "",
          tools_provided: isYes(w.tools_provided) || w.tools_provided === true,
          service_types: st,
          primary_service: st[0] || "",
          rate_type: rate.rate_type || "",
          rate_from: rate.rate_from,
          rate_to: rate_toNumber(rate.rate_to),
          rate_value: rate_toNumber(rate.rate_value),
          info: i,
          work: w,
          rate,
        };
      });

      setRows(mapped);

      if (!params.status && !params.q) {
        setCounts({
          pending: mapped.filter((x) => x.status === "pending").length,
          approved: mapped.filter((x) => x.status === "approved").length,
          declined: mapped.filter((x) => x.status === "declined").length,
          total: mapped.length,
        });
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchItems();
  }, []);

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

  useEffect(() => {
    const t = setTimeout(() => {
      fetchItems(filter, searchTerm);
    }, 400);
    return () => clearInterval(t);
  }, [filter, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [rows, sort]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    );

  const allSelected = ENABLE_SELECTION && selected.size === rows.length && rows.length > 0;

  const toggleSelectAll = () => {
    if (!ENABLE_SELECTION) return;
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleSelectRow = (id) =>
    setSelected((prev) => {
      if (!ENABLE_SELECTION) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const approve = async (id) => {
    setLoadError("");
    try {
      await axios.post(`${API_BASE}/api/admin/workerapplications/${id}/approve`, {}, { withCredentials: true });
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to approve");
    }
  };

  const decline = async (id) => {
    setLoadError("");
    try {
      await axios.post(`${API_BASE}/api/admin/workerapplications/${id}/decline`, {}, { withCredentials: true });
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "declined" } : x)));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), declined: c.declined + 1 }));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to decline");
    }
  };

  const tabs = [
    { key: "all", label: "All", count: counts.total },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "declined", label: "Declined", count: counts.declined },
  ];

  const COLSPAN = ENABLE_SELECTION ? 7 : 6;

  return (
    <main className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Worker Applications</h1>
        <p className="text-gray-600 mt-2">Browse, search, and manage all incoming and processed worker applications.</p>
      </div>

      <section className="mt-6">
        <div className="-mx-6">
          <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              {tabs.map((t) => {
                const active = filter === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setFilter(t.key)}
                    className={[
                      "rounded-full px-3.5 py-1.5 text-sm border",
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <span>{t.label}</span>
                    <span
                      className={[
                        "ml-2 inline-flex items-center justify-center min-w-6 rounded-full px-1.5 text-xs font-semibold",
                        active ? "bg-white/20" : "bg-gray-100 text-gray-700",
                      ].join(" ")}
                    >
                      {typeof t.count === "number" ? t.count : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Applications"
                  className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search applications"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-gray-500 hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  fetchCounts();
                  fetchItems(filter, searchTerm);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="px-6 mt-3">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {loading && (
                <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b border-blue-100">
                  Loading…
                </div>
              )}
              {loadError && !loading && (
                <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
                  {loadError}
                </div>
              )}

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
                              aria-label="Select all"
                            />
                          </th>
                        )}

                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("name_first")}
                        >
                          <span className="inline-flex items-center gap-1">
                            First Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                          onClick={() => toggleSort("name_last")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Last Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">
                          Email
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">
                          Primary Service
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">
                          Status
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 w-40 font-medium text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="text-sm text-gray-800">
                      {sortedRows.map((u, idx) => {
                        const disableActions = u.status === "approved" || u.status === "declined";
                        return (
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
                                  aria-label={`Select ${u.name_first} ${u.name_last}`}
                                />
                              </td>
                            )}

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-300">
                                  <img
                                    src={avatarFromName(`${u.name_first} ${u.name_last}`.trim())}
                                    alt={`${u.name_first} ${u.name_last}`}
                                    className="h-full w-full object-cover"
                                    onError={({ currentTarget }) => {
                                      currentTarget.style.display = "none";
                                      const parent = currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="h-9 w-9 grid place-items-center bg-blue-100 text-blue-700 text-xs font-semibold">${(u.name_first || "?")
                                          .trim()
                                          .charAt(0)
                                          .toUpperCase()}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-gray-900 truncate ${BOLD_FIRST_NAME ? "font-medium" : "font-normal"}`}>
                                    {u.name_first || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">{u.name_last || "-"}</td>
                            <td className="px-4 py-4">
                              <div className="truncate">{u.email || "-"}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="truncate">{u.primary_service || "-"}</div>
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill value={u.status} />
                            </td>

                            <td className={`px-4 py-4 w-40 ${ACTION_ALIGN_RIGHT ? "text-right" : "text-left"}`}>
                              <div className="inline-flex gap-3">
                                <button
                                  onClick={() => setViewRow(u)}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => decline(u.id)}
                                  className="font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed text-red-600 hover:underline"
                                  disabled={disableActions}
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => approve(u.id)}
                                  className="font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed text-emerald-600 hover:underline"
                                  disabled={disableActions}
                                >
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!loading && !loadError && sortedRows.length === 0 && (
                        <tr>
                          <td colSpan={COLSPAN} className="px-4 py-16 text-center text-gray-500">
                            No applications found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {ENABLE_SELECTION && selected.size > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                  <div className="text-gray-700">{selected.size} selected</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {viewRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewRow(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold">Worker Application</div>
              <button onClick={() => setViewRow(null)} className="text-gray-500">
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Worker</div>
                <div>{viewRow.name_first} {viewRow.name_last}</div>
                <div>{viewRow.email}</div>
                <div>{viewRow.barangay}</div>
                <div>{viewRow.age ? `Age: ${viewRow.age}` : ""}</div>
              </div>
              <div>
                <div className="font-medium">Work</div>
                <div>{viewRow.primary_service || "-"}</div>
                <div>Years: {viewRow.years_experience || "-"}</div>
                <div>Tools Provided: {viewRow.tools_provided ? "Yes" : "No"}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">Service Types</div>
                <div className="text-gray-800">
                  {Array.isArray(viewRow.service_types) && viewRow.service_types.length
                    ? viewRow.service_types.join(", ")
                    : "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">Rate</div>
                <div>
                  {viewRow.rate_type === "Hourly Rate"
                    ? `₱${viewRow.rate_from ?? 0} - ₱${viewRow.rate_to ?? 0} / hr`
                    : viewRow.rate_type === "By the Job Rate"
                    ? `₱${viewRow.rate_value ?? 0} per job`
                    : "-"}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setViewRow(null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/api/admin/workerapplications/${viewRow.id}/decline`, {}, { withCredentials: true });
                    setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "declined" } : x)));
                    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), declined: c.declined + 1 }));
                    setViewRow(null);
                  } catch (err) {
                    setLoadError(err?.response?.data?.message || err?.message || "Failed to decline");
                  }
                }}
                className="rounded-lg px-3 py-1.5 bg-red-600 text-white disabled:bg-gray-200 disabled:text-gray-500"
                disabled={viewRow.status === "declined" || viewRow.status === "approved"}
              >
                Decline
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/api/admin/workerapplications/${viewRow.id}/approve`, {}, { withCredentials: true });
                    setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "approved" } : x)));
                    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
                    setViewRow(null);
                  } catch (err) {
                    setLoadError(err?.response?.data?.message || err?.message || "Failed to approve");
                  }
                }}
                className="rounded-lg px-3 py-1.5 bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-500"
                disabled={viewRow.status === "approved" || viewRow.status === "declined"}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
