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
      : v === "expired"
      ? { bg: "bg-gray-50", text: "text-gray-600", br: "border-gray-200", label: "Expired" }
      : { bg: "bg-amber-50", text: "text-amber-700", br: "border-amber-200", label: "Pending" };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide",
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

function TaskPill({ value }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide",
        "bg-orange-50",
        "text-orange-700",
        "border-orange-200",
      ].join(" ")}
      title={value || "-"}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {value || "-"}
    </span>
  );
}

function dateOnlyFrom(val) {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split("T")[0].split(" ")[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token)))
    return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token)))
    return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isExpired(val) {
  const d = dateOnlyFrom(val);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
function parseDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d) ? null : d;
}
function fmtDateTime(val) {
  const d = parseDateTime(val);
  return d ? d.toLocaleString() : "";
}
function peso(val) {
  if (val === null || val === undefined || val === "") return "-";
  const n = Number(val);
  if (!isNaN(n)) {
    try {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
    } catch {
      return `₱ ${n}`;
    }
  }
  return `₱ ${val}`;
}
function fmtMMDDYYYY(val) {
  const d = dateOnlyFrom(val);
  if (!d) return val || "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function fmtPreferredTime(val) {
  if (!val) return "-";
  const s = String(val).trim();
  let d = new Date(`1970-01-01T${s}`);
  if (isNaN(d)) d = new Date(`1970-01-01 ${s}`);
  if (!isNaN(d)) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(s);
  if (!m) return s;
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  let ampm = m[3];
  if (!ampm) {
    ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
  } else {
    ampm = ampm.toUpperCase();
    if (h === 0) h = 12;
  }
  const mm = String(min).padStart(2, "0");
  return `${h}:${mm} ${ampm}`;
}

export default function AdminServiceRequests() {
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

  const [expiredCount, setExpiredCount] = useState(0);
  const [sectionOpen, setSectionOpen] = useState("info");

  const isYes = (v) => {
    if (typeof v === "boolean") return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
    const s = String(v ?? "").trim().toLowerCase();
    if (["yes", "y", "true", "t"].includes(s)) return true;
    if (["no", "n", "false", "f"].includes(s)) return false;
    return false;
  };
  const rate_toNumber = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

  const summarizeCounts = (items = []) => {
    let pending = 0, approved = 0, declined = 0, expired = 0;
    for (const r of items) {
      const s = String(r?.status || "pending").toLowerCase();
      const exp = isExpired(r?.details?.preferred_date);
      if (exp) {
        expired++;
      } else if (s === "approved") {
        approved++;
      } else if (s === "declined") {
        declined++;
      } else {
        pending++;
      }
    }
    return { pending, approved, declined, total: pending + approved + declined + expired, expired };
  };

  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/servicerequests/count`, {
        withCredentials: true,
      });
      const c = res?.data || {};
      setCounts({
        pending: c.pending || 0,
        approved: c.approved || 0,
        declined: c.declined || 0,
        total: c.total || 0,
      });
    } catch {}
    try {
      const resAll = await axios.get(`${API_BASE}/api/admin/servicerequests`, {
        withCredentials: true,
      });
      const items = Array.isArray(resAll?.data?.items) ? resAll.data.items : [];
      const s = summarizeCounts(items);
      setCounts({ pending: s.pending, approved: s.approved, declined: s.declined, total: s.total });
      setExpiredCount(s.expired);
    } catch {}
  };

  const fetchItems = async (statusArg = filter, qArg = searchTerm) => {
    setLoading(true);
    setLoadError("");
    try {
      const params = {};
      if (statusArg && statusArg !== "all" && statusArg !== "expired") params.status = statusArg;
      if (qArg && qArg.trim()) params.q = qArg.trim();

      const res = await axios.get(`${API_BASE}/api/admin/servicerequests`, {
        params,
        withCredentials: true,
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((r) => {
        const i = r.info || {};
        const d = r.details || {};
        const rate = r.rate || {};
        const expired = isExpired(d.preferred_date);
        const createdRaw =
          r.created_at || r.createdAt || d.created_at || d.createdAt || r.created || d.created || null;
        const createdTs = parseDateTime(createdRaw)?.getTime() || 0;
        return {
          id: r.id,
          request_group_id: r.request_group_id,
          status: r.status || "pending",
          ui_status: expired ? "expired" : r.status || "pending",
          name_first: i.first_name || "",
          name_last: i.last_name || "",
          email: i.email_address || d.email_address || "",
          service_type: d.service_type || "",
          service_task: d.service_task || "",
          preferred_date: d.preferred_date || "",
          preferred_time: d.preferred_time || "",
          barangay: i.barangay || "",
          is_urgent: isYes(d.is_urgent) || d.is_urgent === true,
          tools_provided: isYes(d.tools_provided) || d.tools_provided === true,
          rate_type: rate.rate_type || "",
          rate_from: rate.rate_from,
          rate_to: rate_toNumber(rate.rate_to),
          rate_value: rate_toNumber(rate.rate_value),
          info: i,
          details: d,
          rate,
          _expired: expired,
          created_at_raw: createdRaw,
          created_at_ts: createdTs,
          created_at_display: createdRaw ? fmtDateTime(createdRaw) : "",
        };
      });

      let finalRows;
      if (statusArg === "expired") {
        finalRows = mapped.filter((r) => r._expired);
      } else if (statusArg === "all") {
        finalRows = mapped;
      } else {
        finalRows = mapped.filter((r) => !r._expired);
      }

      setRows(finalRows);

      if (!params.status) {
        const s = summarizeCounts(items);
        setExpiredCount(s.expired);
        setCounts({ pending: s.pending, approved: s.approved, declined: s.declined, total: s.total });
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
      setCurrentPage(1);
    }, 400);
    return () => clearInterval(t);
  }, [filter, searchTerm]);

  useEffect(() => {
    const gid = viewRow?.request_group_id;
    if (!gid) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/clientservicerequests/by-group/${gid}`, { withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const p = res?.data || {};
        setViewRow((v) =>
          v
            ? {
                ...v,
                info: { ...v.info, ...(p.info || {}) },
                details: { ...v.details, ...(p.details || {}) },
                rate: { ...v.rate, ...(p.rate || {}) },
              }
            : v
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [viewRow?.request_group_id]);

  useEffect(() => {
    if (viewRow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewRow]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    if (sort.key === "created_at_ts") {
      const dir = sort.dir === "asc" ? 1 : -1;
      return [...rows].sort((a, b) => (a.created_at_ts - b.created_at_ts) * dir);
    }
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
    await axios.post(`${API_BASE}/api/admin/servicerequests/${id}/approve`, {}, { withCredentials: true });
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "approved", ui_status: "approved" } : x)));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
  };

  const decline = async (id) => {
    await axios.post(`${API_BASE}/api/admin/servicerequests/${id}/decline`, {}, { withCredentials: true });
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "declined", ui_status: "declined" } : x)));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), declined: c.declined + 1 }));
  };

  const tabs = [
    { key: "all", label: "All", count: counts.total },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "declined", label: "Declined", count: counts.declined },
    { key: "expired", label: "Expired", count: expiredCount },
  ];

  const COLSPAN = ENABLE_SELECTION ? 9 : 8;

  const SectionButton = ({ k, label }) => {
    const active = sectionOpen === k;
    return (
      <button
        onClick={() => setSectionOpen(k)}
        className={[
          "rounded-full px-3.5 py-1.5 text-sm border transition",
          active ? "bg-[#008cfc] text-white border-[#008cfc]" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const pickDetailImage = (details = {}) => {
    const keys = [
      "image_url",
      "photo_url",
      "attachment_url",
      "image",
      "service_image",
      "service_request_image",
      "screenshot_url",
    ];
    for (const k of keys) {
      const v = details?.[k];
      if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:"))) {
        return v;
      }
    }
    return null;
  };

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

  const renderSection = () => {
    if (!viewRow) return null;
    if (sectionOpen === "all") {
      const img = pickDetailImage(viewRow?.details);
      const t = String(viewRow?.rate?.rate_type || "").toLowerCase();
      return (
        <div className="space-y-6">
          <SectionCard
            title="Personal Information"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                Client
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <Field label="First Name" value={viewRow?.info?.first_name || "-"} />
              <Field label="Last Name" value={viewRow?.info?.last_name || "-"} />
              <Field label="Email" value={viewRow?.info?.email_address || viewRow.email || "-"} />
              <Field label="Barangay" value={viewRow?.info?.barangay || "-"} />
              <Field label="Street" value={viewRow?.info?.street || "-"} />
              <Field label="Additional Address" value={viewRow?.info?.additional_address || "-"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Service Request Details"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
                <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                Request
              </span>
            }
          >
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
              <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="Service Type" value={<ServiceTypePill value={viewRow?.details?.service_type} />} />
                <Field label="Task" value={<TaskPill value={viewRow?.details?.service_task} />} />
                <Field label="Preferred Date" value={fmtMMDDYYYY(viewRow?.details?.preferred_date) || "-"} />
                <Field label="Preferred Time" value={fmtPreferredTime(viewRow?.details?.preferred_time)} />
                <Field label="Urgent" value={viewRow?.is_urgent ? "Yes" : "No"} />
                <Field label="Tools Provided" value={viewRow?.tools_provided ? "Yes" : "No"} />
                <div className="sm:col-span-2">
                  <Field
                    label="Description"
                    value={
                      <span className="whitespace-pre-line text-[15px] leading-relaxed">
                        {viewRow?.details?.service_description || viewRow?.details?.description || "-"}
                      </span>
                    }
                  />
                </div>
              </div>
              <div className="xl:col-span-2">
                <div className="aspect-[4/3] w-full rounded-xl border border-gray-200 bg-gray-50 overflow-hidden grid place-items-center">
                  {img ? (
                    <img
                      src={img}
                      alt="Service Request"
                      className="w-full h-full object-cover"
                      onError={({ currentTarget }) => {
                        currentTarget.style.display = "none";
                        const p = currentTarget.parentElement;
                        if (p) p.innerHTML = '<div class="text-sm text-gray-500">No image available</div>';
                      }}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">No image available</div>
                  )}
                </div>
              </div>
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
            {t.includes("by the job") ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl">
                <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
                <Field label="Rate Value" value={peso(viewRow?.rate?.rate_value)} />
              </div>
            ) : t.includes("hourly") ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 max-w-4xl">
                <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
                <Field label="Rate From" value={peso(viewRow?.rate?.rate_from)} />
                <Field label="Rate To" value={peso(viewRow?.rate?.rate_to)} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
                <Field label="Rate From" value={peso(viewRow?.rate?.rate_from)} />
                <Field label="Rate To" value={peso(viewRow?.rate?.rate_to)} />
                <Field label="Rate Value" value={peso(viewRow?.rate?.rate_value)} />
              </div>
            )}
          </SectionCard>
        </div>
      );
    }
    if (sectionOpen === "info") {
      return (
        <SectionCard
          title="Personal Information"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Client
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 max-w-5xl">
            <Field label="First Name" value={viewRow?.info?.first_name || "-"} />
            <Field label="Last Name" value={viewRow?.info?.last_name || "-"} />
            <Field label="Email" value={viewRow?.info?.email_address || viewRow.email || "-"} />
            <Field label="Barangay" value={viewRow?.info?.barangay || "-"} />
            <Field label="Street" value={viewRow?.info?.street || "-"} />
            <Field label="Additional Address" value={viewRow?.info?.additional_address || "-"} />
          </div>
        </SectionCard>
      );
    }
    if (sectionOpen === "details") {
      const img = pickDetailImage(viewRow?.details);
      return (
        <SectionCard
          title="Service Request Details"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Request
            </span>
          }
        >
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <Field label="Service Type" value={<ServiceTypePill value={viewRow?.details?.service_type} />} />
              <Field label="Task" value={<TaskPill value={viewRow?.details?.service_task} />} />
              <Field label="Preferred Date" value={fmtMMDDYYYY(viewRow?.details?.preferred_date) || "-"} />
              <Field label="Preferred Time" value={fmtPreferredTime(viewRow?.details?.preferred_time)} />
              <Field label="Urgent" value={viewRow?.is_urgent ? "Yes" : "No"} />
              <Field label="Tools Provided" value={viewRow?.tools_provided ? "Yes" : "No"} />
              <div className="sm:col-span-2">
                <Field
                  label="Description"
                  value={
                    <span className="whitespace-pre-line text-[15px] leading-relaxed">
                      {viewRow?.details?.service_description || viewRow?.details?.description || "-"}
                    </span>
                  }
                />
              </div>
            </div>
            <div className="xl:col-span-2">
              <div className="aspect-[4/3] w-full rounded-xl border border-gray-200 bg-gray-50 overflow-hidden grid place-items-center">
                {img ? (
                  <img
                    src={img}
                    alt="Service Request"
                    className="w-full h-full object-cover"
                    onError={({ currentTarget }) => {
                      currentTarget.style.display = "none";
                      const p = currentTarget.parentElement;
                      if (p) p.innerHTML = '<div class="text-sm text-gray-500">No image available</div>';
                    }}
                  />
                ) : (
                  <div className="text-sm text-gray-500">No image available</div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      );
    }
    if (sectionOpen === "rate") {
      const t = String(viewRow?.rate?.rate_type || "").toLowerCase();
      if (t.includes("by the job")) {
        return (
          <SectionCard
            title="Service Rate"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                Pricing
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl">
              <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
              <Field label="Rate Value" value={peso(viewRow?.rate?.rate_value)} />
            </div>
          </SectionCard>
        );
      }
      if (t.includes("hourly")) {
        return (
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
              <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
              <Field label="Rate From" value={peso(viewRow?.rate?.rate_from)} />
              <Field label="Rate To" value={peso(viewRow?.rate?.rate_to)} />
            </div>
          </SectionCard>
        );
      }
      return (
        <SectionCard
          title="Service Rate"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Pricing
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
            <Field label="Rate From" value={peso(viewRow?.rate?.rate_from)} />
            <Field label="Rate To" value={peso(viewRow?.rate?.rate_to)} />
            <Field label="Rate Value" value={peso(viewRow?.rate?.rate_value)} />
          </div>
        </SectionCard>
      );
    }
    return null;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const totalPages = useMemo(() => {
    const t = Math.ceil(sortedRows.length / pageSize);
    return t > 0 ? t : 1;
  }, [sortedRows.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage]);

  return (
    <main className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Service Requests</h1>
        <p className="text-gray-600 mt-2">Browse, search, and manage all incoming and processed client requests.</p>
      </div>

      <section className="mt-6">
        <div className="-mx-6">
          <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              {[
                { key: "all", label: "All", count: counts.total },
                { key: "pending", label: "Pending", count: counts.pending },
                { key: "approved", label: "Approved", count: counts.approved },
                { key: "declined", label: "Declined", count: counts.declined },
                { key: "expired", label: "Expired", count: expiredCount },
              ].map((t) => {
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
                  placeholder="Search Requests"
                  className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search requests"
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
                  setCurrentPage(1);
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
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200"
                          onClick={() => toggleSort("service_type")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Service Type
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200"
                          onClick={() => toggleSort("service_task")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Task
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200"
                          onClick={() => toggleSort("created_at_ts")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Created At
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
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
                      {pageRows.map((u, idx) => {
                        const disableActions =
                          u._expired || u.status === "approved" || u.status === "declined";
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
                              <ServiceTypePill value={u.service_type} />
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <TaskPill value={u.service_task} />
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              {u.created_at_display || "-"}
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <StatusPill value={u.ui_status} />
                            </td>

                            <td className={`px-4 py-4 w-40 ${ACTION_ALIGN_RIGHT ? "text-right" : "text-left"} border border-gray-200`}>
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => {
                                    setViewRow(u);
                                    setSectionOpen("all");
                                  }}
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

                      {!loading && !loadError && pageRows.length === 0 && (
                        <tr>
                          <td colSpan={COLSPAN} className="px-4 py-16 text-center text-gray-500 border border-gray-200">
                            No requests found.
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

              {!loading && !loadError && sortedRows.length > 0 && (
                <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
                  <nav className="flex items-center gap-2">
                    <button
                      className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={[
                          "h-9 min-w-9 px-3 rounded-md border",
                          p === currentPage
                            ? "border-[#008cfc] bg-[#008cfc] text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                        aria-current={p === currentPage ? "page" : undefined}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ›
                    </button>
                  </nav>
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
          aria-label="Request details"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setViewRow(null); }} />
          <div className="relative w-full max-w-[1100px] h-[86vh] rounded-2xl border border-[#008cfc] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="relative px-8 pt-10 pb-6 bg-gradient-to-b from-blue-50 to-white">
              <div className="mx-auto w-24 h-24 rounded-full ring-4 ring-white border border-blue-100 bg-white overflow-hidden shadow">
                {viewRow?.info?.profile_picture_url || viewRow?.info?.profile_picture ? (
                  <img
                    src={viewRow?.info?.profile_picture_url || viewRow?.info?.profile_picture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={({ currentTarget }) => {
                      currentTarget.style.display = "none";
                      const parent = currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full grid place-items-center text-3xl font-semibold text-[#008cfc]">${(viewRow?.name_first || "?").trim().charAt(0).toUpperCase()}</div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-3xl font-semibold text-[#008cfc]">
                    {(((viewRow?.name_first || "").trim().slice(0,1) + (viewRow?.name_last || "").trim().slice(0,1)) || "?").toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-5 text-center space-y-0.5">
                <div className="text-2xl font-semibold text-gray-900">
                  {[viewRow.name_first, viewRow.name_last].filter(Boolean).join(" ") || "-"}
                </div>
                <div className="text-sm text-gray-600">{viewRow.email || "-"}</div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="text-sm text-gray-600">
                  Created <span className="font-semibold text-gray-900">{viewRow.created_at_display || "-"}</span>
                </div>
                <StatusPill value={viewRow.ui_status} />
              </div>
            </div>

            <div className="px-6 sm:px-8 py-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] bg-gray-50">
              {renderSection()}
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
                  if (viewRow._expired) return;
                  await axios.post(`${API_BASE}/api/admin/servicerequests/${viewRow.id}/decline`, {}, { withCredentials: true });
                  setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "declined", ui_status: "declined" } : x)));
                  setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), declined: c.declined + 1 }));
                  setViewRow(null);
                }}
                className="w-full inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={viewRow._expired || viewRow.status === "declined" || viewRow.status === "approved"}
              >
                Decline
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (viewRow._expired) return;
                  await axios.post(`${API_BASE}/api/admin/servicerequests/${viewRow.id}/approve`, {}, { withCredentials: true });
                  setRows((r) => r.map((x) => (x.id === viewRow.id ? { ...x, status: "approved", ui_status: "approved" } : x)));
                  setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
                  setViewRow(null);
                }}
                className="w-full inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={viewRow._expired || viewRow.status === "approved" || viewRow.status === "declined"}
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
