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

function ServiceTypePill({ value }) {
  const cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide",
        cfg.bg,
        cfg.text,
        cfg.br,
      ].join(" ")}
      title={value || "-"}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {value || "-"}
    </span>
  );
}

const Field = ({ label, value }) => (
  <div className="text-left">
    <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">{label}</div>
    <div className="mt-1 text-[15px] font-semibold text-gray-900 break-words">{value ?? "-"}</div>
  </div>
);

const SectionCard = ({ title, children, badge }) => (
  <section className="relative rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-200 ring-1 ring-gray-100 hover:ring-blue-100">
    <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500"></span>
        {title}
      </h3>
      {badge || null}
    </div>
    <div className="p-6">{children}</div>
    <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-60"></div>
  </section>
);

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

              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                <div className="max-h-[520px] md:max-h-[63vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-sm text-gray-600">
                        {ENABLE_SELECTION && (
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 w-12 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200">
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
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                          onClick={() => toggleSort("name_first")}
                        >
                          <span className="inline-flex items-center gap-1">
                            First Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                          onClick={() => toggleSort("name_last")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Last Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200">
                          Email
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200">
                          Primary Service
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200">
                          Status
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 w-40 font-semibold text-gray-700 border border-gray-200">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="text-sm text-gray-800 font-semibold">
                      {sortedRows.map((u, idx) => {
                        const disableActions = u.status === "approved" || u.status === "declined";
                        return (
                          <tr
                            key={u.id}
                            className={`border-t border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}
                          >
                            {ENABLE_SELECTION && (
                              <td className="px-4 py-4 border border-gray-200">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  checked={selected.has(u.id)}
                                  onChange={() => toggleSelectRow(u.id)}
                                  aria-label={`Select ${u.name_first} ${u.name_last}`}
                                />
                              </td>
                            )}

                            <td className="px-4 py-4 border border-gray-200">
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
                                  <div className={`text-gray-900 truncate ${BOLD_FIRST_NAME ? "font-medium" : "font-normal"} font-semibold`}>
                                    {u.name_first || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 border border-gray-200">{u.name_last || "-"}</td>
                            <td className="px-4 py-4 border border-gray-200">
                              <div className="truncate">{u.email || "-"}</div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <ServiceTypePill value={u.primary_service} />
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <StatusPill value={u.status} />
                            </td>

                            <td className={`px-4 py-4 w-40 ${ACTION_ALIGN_RIGHT ? "text-right" : "text-left"} border border-gray-200`}>
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => setViewRow(u)}
                                  className="inline-flex items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => decline(u.id)}
                                  className="inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={disableActions}
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => approve(u.id)}
                                  className="inline-flex items-center rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <td colSpan={COLSPAN} className="px-4 py-16 text-center text-gray-500 border border-gray-200">
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
          role="dialog"
          aria-modal="true"
          aria-label="Worker application details"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setViewRow(null); }} />
          <div className="relative w-full max-w-[1100px] h-[86vh] rounded-2xl border border-[#008cfc] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="relative px-8 pt-10 pb-6 bg-gradient-to-b from-blue-50 to-white">
              <div className="mx-auto w-24 h-24 rounded-full ring-4 ring-white border border-blue-100 bg-white overflow-hidden shadow">
                <img
                  src={avatarFromName(`${viewRow.name_first} ${viewRow.name_last}`.trim())}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={({ currentTarget }) => {
                    currentTarget.style.display = "none";
                    const parent = currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full grid place-items-center text-3xl font-semibold text-[#008cfc]">${((viewRow?.name_first || "").trim().slice(0,1) + (viewRow?.name_last || "").trim().slice(0,1) || "?").toUpperCase()}</div>`;
                    }
                  }}
                />
              </div>

              <div className="mt-5 text-center space-y-0.5">
                <div className="text-2xl font-semibold text-gray-900">
                  {[viewRow.name_first, viewRow.name_last].filter(Boolean).join(" ") || "-"}
                </div>
                <div className="text-sm text-gray-600">{viewRow.email || "-"}</div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="text-sm text-gray-600">
                  Primary Service <span className="font-semibold text-gray-900">{viewRow.primary_service || "-"}</span>
                </div>
                <StatusPill value={viewRow.status} />
              </div>
            </div>

            <div className="px-6 sm:px-8 py-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] bg-gray-50">
              <div className="space-y-6">
                <SectionCard
                  title="Personal Information"
                  badge={
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                      Worker
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 max-w-5xl">
                    <Field label="First Name" value={viewRow?.name_first || "-"} />
                    <Field label="Last Name" value={viewRow?.name_last || "-"} />
                    <Field label="Email" value={viewRow?.email || "-"} />
                    <Field label="Barangay" value={viewRow?.barangay || "-"} />
                    <Field label="Age" value={viewRow?.age ?? "-"} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Work Details"
                  badge={
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
                      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                      Experience
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    <Field label="Primary Service" value={<ServiceTypePill value={viewRow?.primary_service} />} />
                    <Field label="Years of Experience" value={viewRow?.years_experience || "-"} />
                    <Field label="Tools Provided" value={viewRow?.tools_provided ? "Yes" : "No"} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Service Types"
                  badge={
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
                      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                      Skills
                    </span>
                  }
                >
                  <div className="text-[15px] font-semibold text-gray-900">
                    {Array.isArray(viewRow.service_types) && viewRow.service_types.length
                      ? viewRow.service_types.join(", ")
                      : "-"}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Service Rate"
                  badge={
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                      Pricing
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 max-w-4xl">
                    <Field label="Rate Type" value={viewRow?.rate_type || "-"} />
                    {String(viewRow?.rate_type || "").toLowerCase().includes("hourly") ? (
                      <>
                        <Field label="Rate From" value={viewRow?.rate_from != null ? `₱${viewRow.rate_from}` : "-"} />
                        <Field label="Rate To" value={viewRow?.rate_to != null ? `₱${viewRow.rate_to}` : "-"} />
                      </>
                    ) : String(viewRow?.rate_type || "").toLowerCase().includes("by the job") ? (
                      <>
                        <Field label="Rate Value" value={viewRow?.rate_value != null ? `₱${viewRow.rate_value}` : "-"} />
                        <div />
                      </>
                    ) : (
                      <>
                        <Field label="Rate From" value={viewRow?.rate_from != null ? `₱${viewRow.rate_from}` : "-"} />
                        <Field label="Rate To" value={viewRow?.rate_to != null ? `₱${viewRow.rate_to}` : "-"} />
                      </>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => { setViewRow(null); }}
                className="w-full inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Close
              </button>
              <button
                type="button"
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
                className="w-full inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={viewRow.status === "declined" || viewRow.status === "approved"}
              >
                Decline
              </button>
              <button
                type="button"
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
                className="w-full inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
