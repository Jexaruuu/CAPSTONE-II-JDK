// ServiceRequestMenu.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronsUpDown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

function StatusPill({ value }) {
  const v = String(value || "").toLowerCase();
  const cfg =
    v === "approved"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", dot: "bg-emerald-500" }
      : v === "declined"
      ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", dot: "bg-red-500" }
      : { bg: "bg-amber-50", text: "text-amber-800", br: "border-amber-200", dot: "bg-amber-500" };
  const label =
    v === "approved" ? "Approved" : v === "declined" ? "Declined" : "Pending";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
        cfg.bg,
        cfg.text,
        cfg.br,
      ].join(" ")}
      aria-label={`Status: ${label}`}
      title={label}
    >
      <span className={["h-2 w-2 rounded-full", cfg.dot].join(" ")} />
      <span className="leading-none">{label}</span>
    </span>
  );
}

export default function AdminServiceRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);
  const [viewRow, setViewRow] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE}/api/admin/servicerequests?status=pending`, { withCredentials: true });
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((r) => {
        const i = r.info || {};
        const d = r.details || {};
        const rate = r.rate || {};
        return {
          id: r.id,
          request_group_id: r.request_group_id,
          status: r.status || "pending",
          name_first: i.first_name || "",
          name_last: i.last_name || "",
          email: i.email_address || d.email_address || "",
          service_type: d.service_type || "",
          service_task: d.service_task || "",
          preferred_date: d.preferred_date || "",
          preferred_time: d.preferred_time || "",
          barangay: i.barangay || "",
          is_urgent: !!d.is_urgent,
          tools_provided: !!d.tools_provided,
          rate_type: rate.rate_type || "",
          rate_from: rate.rate_from,
          rate_to: rate.rate_to,
          rate_value: rate.rate_value,
          info: i,
          details: d,
          rate,
        };
      });
      setRows(mapped);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    if (selected.size === 0) { el.indeterminate = false; el.checked = false; }
    else if (selected.size === rows.length) { el.indeterminate = false; el.checked = true; }
    else { el.indeterminate = true; }
  }, [selected, rows.length]);

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
    setSort((prev) => (prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }));

  const allSelected = selected.size === rows.length && rows.length > 0;
  const toggleSelectAll = () => { setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id))); };
  const toggleSelectRow = (id) =>
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const approve = async (id) => {
    await axios.post(`${API_BASE}/api/admin/servicerequests/${id}/approve`, {}, { withCredentials: true });
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const decline = async (id) => {
    await axios.post(`${API_BASE}/api/admin/servicerequests/${id}/decline`, {}, { withCredentials: true });
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "declined" } : x)));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  return (
    <main className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Service Requests</h1>
        <p className="text-gray-600 mt-2">Incoming client service requests pending review.</p>
      </div>

      <section className="mt-8">
        <div className="-mx-6">
          <div className="px-6 flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Clients Service Requests</h2>
            <div className="flex items-center gap-2">
              <button onClick={fetchItems} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Refresh</button>
            </div>
          </div>

          <div className="px-6">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {loading && <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b border-blue-100">Loading…</div>}
              {loadError && !loading && <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{loadError}</div>}

              <div className="overflow-x-auto">
                <div className="max-h-[520px] md:max-h-[63vh] overflow-y-auto">
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
                            aria-label="Select all"
                          />
                        </th>

                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]" onClick={() => toggleSort("name_first")}>
                          <span className="inline-flex items-center gap-1">First Name<ChevronsUpDown className="h-4 w-4 text-gray-400" /></span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]" onClick={() => toggleSort("name_last")}>
                          <span className="inline-flex items-center gap-1">Last Name<ChevronsUpDown className="h-4 w-4 text-gray-400" /></span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">Email</th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">Service</th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-medium text-gray-700">Status</th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 w-40 font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>

                    <tbody className="text-sm text-gray-800">
                      {sortedRows.map((u, idx) => (
                        <tr key={u.id} className={`border-t border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selected.has(u.id)}
                              onChange={() => toggleSelectRow(u.id)}
                              aria-label={`Select ${u.name_first} ${u.name_last}`}
                            />
                          </td>

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
                                      parent.innerHTML = `<div class="h-9 w-9 grid place-items-center bg-blue-100 text-blue-700 text-xs font-semibold">${(u.name_first || "?").trim().charAt(0).toUpperCase()}</div>`;
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{u.name_first || "-"}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">{u.name_last || "-"}</td>
                          <td className="px-4 py-4"><div className="truncate">{u.email || "-"}</div></td>
                          <td className="px-4 py-4">
                            <div className="truncate">{u.service_type || "-"}{u.service_task ? ` • ${u.service_task}` : ""}</div>
                          </td>
                          <td className="px-4 py-4"><StatusPill value={u.status} /></td>

                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex gap-3">
                              <button onClick={() => setViewRow(u)} className="text-blue-600 hover:underline font-medium">View</button>
                              <button onClick={() => approve(u.id)} className="text-emerald-600 hover:underline font-medium" disabled={u.status === "approved"}>Approve</button>
                              <button onClick={() => decline(u.id)} className="text-red-600 hover:underline font-medium" disabled={u.status === "declined"}>Decline</button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!loading && !loadError && sortedRows.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-500">No pending requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selected.size > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                  <div className="text-gray-700">{selected.size} selected</div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50" onClick={() => setSelected(new Set())}>Clear</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold">Service Request</div>
              <button onClick={() => setViewRow(null)} className="text-gray-500">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Client</div>
                <div>{viewRow.name_first} {viewRow.name_last}</div>
                <div>{viewRow.email}</div>
                <div>{viewRow.barangay}</div>
              </div>
              <div>
                <div className="font-medium">Schedule</div>
                <div>{viewRow.preferred_date}</div>
                <div>{viewRow.preferred_time}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">Service</div>
                <div>{viewRow.service_type} {viewRow.service_task ? `• ${viewRow.service_task}` : ''}</div>
                <div>Urgent: {viewRow.is_urgent ? 'Yes' : 'No'} | Tools Provided: {viewRow.tools_provided ? 'Yes' : 'No'}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">Rate</div>
                <div>
                  {viewRow.rate_type === 'Hourly Rate' ? `₱${viewRow.rate_from || 0} - ₱${viewRow.rate_to || 0} / hr` :
                   viewRow.rate_type === 'By the Job Rate' ? `₱${viewRow.rate_value || 0} per job` : '-'}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setViewRow(null)} className="rounded-lg border border-gray-300 px-3 py-1.5">Close</button>
              <button
                onClick={async () => {
                  await axios.post(`${API_BASE}/api/admin/servicerequests/${viewRow.id}/decline`, {}, { withCredentials: true });
                  setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "declined" } : x)));
                  setViewRow(null);
                }}
                className="rounded-lg px-3 py-1.5 bg-red-600 text-white"
              >
                Decline
              </button>
              <button
                onClick={async () => {
                  await axios.post(`${API_BASE}/api/admin/servicerequests/${viewRow.id}/approve`, {}, { withCredentials: true });
                  setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "approved" } : x)));
                  setViewRow(null);
                }}
                className="rounded-lg px-3 py-1.5 bg-emerald-600 text-white"
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
