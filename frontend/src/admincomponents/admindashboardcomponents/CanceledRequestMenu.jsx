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
      ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", label: "Approved" }
      : v === "declined"
      ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", label: "Declined" }
      : v === "cancelled"
      ? { bg: "bg-orange-50", text: "text-orange-700", br: "border-orange-200", label: "Cancelled" }
      : v === "expired"
      ? { bg: "bg-gray-50", text: "text-gray-600", br: "border-gray-200", label: "Expired" }
      : { bg: "bg-amber-50", text: "text-amber-700", br: "border-amber-200", label: "Pending" };
  return (
    <span className={["inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide", cfg.bg, cfg.text, cfg.br].join(" ")}>
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {cfg.label}
    </span>
  );
}

function ServiceTypePill({ value }) {
  const v = String(value || "").toLowerCase().trim();
  let cfg;
  if (v === "car washing" || v === "car wash") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "carpentry") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "electrical works" || v === "electrical work" || v === "electrical") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "laundry") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "plumbing") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  }
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
        "bg-violet-50",
        "text-violet-700",
        "border-violet-200",
      ].join(" ")}
      title={value || "-"}
    >
      <span className="h-3 w-3 rounded-full bg-violet-500 opacity-30" />
      {value || "-"}
    </span>
  );
}

function YesNoPill({ yes }) {
  const truthy = yes === true || yes === 1 || String(yes).toLowerCase() === "yes" || String(yes).toLowerCase() === "true";
  const falsy = yes === false || yes === 0 || String(yes).toLowerCase() === "no" || String(yes).toLowerCase() === "false";
  const cfg = truthy
    ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", label: "Yes" }
    : falsy
    ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", label: "No" }
    : { bg: "bg-gray-50", text: "text-gray-600", br: "border-gray-200", label: "-" };
  return (
    <span className={["inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide", cfg.bg, cfg.text, cfg.br].join(" ")}>
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {cfg.label}
    </span>
  );
}

function dateOnlyFrom(val) {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split("T")[0].split(" ")[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token))) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
const isYes = (v) => {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "t"].includes(s)) return true;
  if (["no", "n", "false", "f"].includes(s)) return false;
  return false;
};
const pickDetailImage = (details = {}) => {
  const keys = ["image_url", "photo_url", "attachment_url", "image", "service_image", "service_request_image", "screenshot_url"];
  for (const k of keys) {
    const v = details?.[k];
    if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:"))) return v;
  }
  return null;
};

export default function AdminCancelledRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: "full_name", dir: "asc" });
  const [viewRow, setViewRow] = useState(null);
  const [reasonRow, setReasonRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionOpen, setSectionOpen] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const fetchItems = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { status: "cancelled" };
      if (searchTerm && searchTerm.trim()) params.q = searchTerm.trim();
      const res = await axios.get(`${API_BASE}/api/admin/servicerequests`, { params, withCredentials: true });
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((r) => {
        const i = r.info || {};
        const d = r.details || {};
        const rate = r.rate || {};
        const createdRaw = r.created_at || r.createdAt || d.created_at || d.createdAt || r.created || d.created || null;
        const createdTs = parseDateTime(createdRaw)?.getTime() || 0;
        return {
          id: r.id,
          request_group_id: r.request_group_id,
          status: "cancelled",
          ui_status: "cancelled",
          name_first: i.first_name || "",
          name_last: i.last_name || "",
          full_name: [i.first_name, i.last_name].filter(Boolean).join(" ") || "",
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
          rate_to: rate.rate_to,
          rate_value: rate.rate_value,
          info: i,
          details: d,
          rate,
          created_at_raw: createdRaw,
          created_at_ts: createdTs,
          created_at_display: createdRaw ? fmtDateTime(createdRaw) : "",
          reason_choice: r.reason_choice || null,
          reason_other: r.reason_other || null,
          canceled_at: r.canceled_at || null
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

  useEffect(() => {
    fetchItems();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      fetchItems();
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

  const categoryMap = (service) => {
    const s = String(service || "").trim().toLowerCase();
    if (s === "car washing" || s === "carwasher" || s === "car washer" || /car\s*wash/.test(s)) return "carwasher";
    if (s === "carpentry" || s === "carpenter") return "carpenter";
    if (s === "electrical works" || s === "electrical work" || s === "electrician" || /electric/.test(s)) return "electrician";
    if (s === "laundry" || /laund/.test(s)) return "laundry";
    if (s === "plumbing" || s === "plumber") return "plumber";
    return "";
  };

  const filteredRows = useMemo(() => {
    if (serviceFilter === "all") return rows;
    return rows.filter((r) => categoryMap(r.service_type) === serviceFilter);
  }, [rows, serviceFilter]);

  const serviceCounts = useMemo(() => {
    const counts = { all: rows.length, carwasher: 0, carpenter: 0, electrician: 0, laundry: 0, plumber: 0 };
    for (const r of rows) {
      const k = categoryMap(r.service_type);
      if (k && counts[k] !== undefined) counts[k]++;
    }
    return counts;
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return filteredRows;
    if (sort.key === "created_at_ts") {
      const dir = sort.dir === "asc" ? 1 : -1;
      return [...filteredRows].sort((a, b) => (a.created_at_ts - b.created_at_ts) * dir);
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [filteredRows, sort]);

  const toggleSort = (key) => setSort((prev) => (prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }));

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

  const Field = ({ label, value }) => (
    <div className="text-left">
      <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-gray-900 break-words">{value ?? "-"}</div>
    </div>
  );

  const SectionCard = ({ title, children, badge }) => (
    <section className="relative rounded-2xl border border-gray-300 bg-white shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
      <div className="px-6 py-5 rounded-t-2xl bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/70"></span>
          {title}
        </h3>
        {badge || (
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
            <span className="h-3 w-3 rounded-full bg-white/60" />
            Info
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-60"></div>
    </section>
  );

  const SectionButton = ({ k, label }) => {
    const active = sectionOpen === k;
    return (
      <button
        onClick={() => setSectionOpen(k)}
        className={["rounded-full px-3.5 py-1.5 text-sm border transition", active ? "bg-[#008cfc] text-white border-[#008cfc]" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"].join(" ")}
      >
        {label}
      </button>
    );
  };

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
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
                Client
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <Field label="Barangay" value={viewRow?.info?.barangay || "-"} />
              <Field label="Street" value={viewRow?.info?.street || "-"} />
              <Field label="Additional Address" value={viewRow?.info?.additional_address || "-"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Service Request Details"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
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
                <Field label="Urgent" value={<YesNoPill yes={viewRow?.is_urgent} />} />
                <Field label="Tools Provided" value={<YesNoPill yes={viewRow?.tools_provided} />} />
                <div className="sm:col-span-2">
                  <Field
                    label="Description"
                    value={<span className="whitespace-pre-line text-[15px] leading-relaxed">{viewRow?.details?.service_description || viewRow?.details?.description || "-"}</span>}
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
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
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
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
              <span className="h-3 w-3 rounded-full bg-white/60" />
              Client
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 max-w-5xl">
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
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
              <span className="h-3 w-3 rounded-full bg-white/60" />
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
              <Field label="Urgent" value={<YesNoPill yes={viewRow?.is_urgent} />} />
              <Field label="Tools Provided" value={<YesNoPill yes={viewRow?.tools_provided} />} />
              <div className="sm:col-span-2">
                <Field
                  label="Description"
                  value={<span className="whitespace-pre-line text-[15px] leading-relaxed">{viewRow?.details?.service_description || viewRow?.details?.description || "-"}</span>}
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
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
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
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
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
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
              <span className="h-3 w-3 rounded-full bg-white/60" />
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

  const combineReason = (choice, other) => {
    const a = String(choice || "").trim();
    const b = String(other || "").trim();
    if (a && b) return `${a} — ${b}`;
    return a || b || "-";
  };

  const getCancelReason = (row) => {
    if (row?.reason_choice || row?.reason_other) return combineReason(row.reason_choice, row.reason_other);
    const d = row?.details || {};
    const i = row || {};
    return (
      d.cancel_reason ||
      d.cancellation_reason ||
      d.cancelled_reason ||
      d.reason ||
      i.cancel_reason ||
      i.cancellation_reason ||
      i.cancelled_reason ||
      i.reason ||
      "-"
    );
  };

  const serviceTabs = [
    { key: "all", label: "All" },
    { key: "carwasher", label: "Car Washing" },
    { key: "carpenter", label: "Carpentry" },
    { key: "electrician", label: "Electrical Works" },
    { key: "laundry", label: "Laundry" },
    { key: "plumber", label: "Plumbing" },
  ];

  return (
    <>
      <style>{`
        .blue-scroll {
          scrollbar-width: thin;
          scrollbar-color: #0b82ff #e6f0ff;
        }
        .blue-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .blue-scroll::-webkit-scrollbar-track {
          background: #e6f0ff;
          border-radius: 8px;
        }
        .blue-scroll::-webkit-scrollbar-thumb {
          background: #0b82ff;
          border-radius: 8px;
        }
        .blue-scroll::-webkit-scrollbar-thumb:hover {
          background: #086bd4;
        }
      `}</style>

      <main className="p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Cancelled Requests</h1>
          <p className="text-gray-600 mt-2">All service requests that have been cancelled.</p>
        </div>

        <section className="mt-6">
          <div className="-mx-6">
            <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Filter</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {serviceTabs.map((t) => {
                    const active = serviceFilter === t.key;
                    const count =
                      t.key === "all"
                        ? serviceCounts.all
                        : serviceCounts[t.key] ?? 0;
                    return (
                      <button
                        key={t.key}
                        onClick={() => {
                          setServiceFilter(t.key);
                          setCurrentPage(1);
                        }}
                        className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${
                          active ? "border-[#0b82ff] bg-[#0b82ff] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{t.label}</span>
                        <span
                          className={`inline-flex items-center justify-center min-w-6 rounded-full px-1.5 text-xs font-semibold ${
                            active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Requests"
                    className="mt-7 h-10 w-72 rounded-md border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Search requests"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-3.5 absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-gray-500 hover:bg-gray-100"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    fetchItems();
                    setCurrentPage(1);
                  }}
                  className="mt-7 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#0b82ff] hover:bg-blue-50"
                >
                  ⟳ Refresh
                </button>
              </div>
            </div>

            <div className="px-6 mt-3">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                {loading && <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b border-blue-100">Loading…</div>}
                {loadError && !loading && <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{loadError}</div>}

                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                  <div className="max-h-[520px] md:max-h-[63vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-sm text-gray-600">
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200 w-[180px] min-w-[180px]"
                            onClick={() => toggleSort("full_name")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Client Name
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200 w-[260px] whitespace-nowrap">
                            Email
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200 min-w-[260px]"
                            onClick={() => toggleSort("service_type")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Service Type
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200 min-w-[220px]"
                            onClick={() => toggleSort("service_task")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Service Task
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200 whitespace-nowrap w-[220px]"
                            onClick={() => toggleSort("created_at_ts")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Created At
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200 w-[160px] min-w-[160px]">
                            Status
                          </th>
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 w-40 font-semibold text-gray-700 border border-gray-200">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-sm text-gray-800 font-semibold">
                        {pageRows.map((u, idx) => {
                          const fullName = u.full_name || [u.name_first, u.name_last].filter(Boolean).join(" ");
                          return (
                            <tr key={u.id} className={`border-t border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}>
                              <td className="px-4 py-4 border border-gray-200 w-[180px] min-w-[180px]">
                                <div className="min-w-0">
                                  <div className="text-gray-900 truncate font-semibold">
                                    {fullName || "-"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 border border-gray-200 w-[260px] whitespace-nowrap">
                                <div className="truncate">{u.email || "-"}</div>
                              </td>
                              <td className="px-4 py-4 border border-gray-200 align-top min-w-[260px]">
                                <div className="whitespace-nowrap">
                                  <ServiceTypePill value={u.service_type} />
                                </div>
                              </td>
                              <td className="px-4 py-4 border border-gray-200 align-top min-w-[220px]">
                                <div className="whitespace-nowrap">
                                  <TaskPill value={u.service_task} />
                                </div>
                              </td>
                              <td className="px-4 py-4 border border-gray-200 whitespace-nowrap w-[220px]">
                                {u.created_at_display || "-"}
                              </td>
                              <td className="px-4 py-4 border border-gray-200 w-[160px] min-w-[160px]">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <StatusPill value="cancelled" />
                                </div>
                              </td>
                              <td className="px-4 py-4 w-40 text-left border border-gray-200">
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
                                    onClick={() => {
                                      setReasonRow(u);
                                    }}
                                    className="inline-flex items-center rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50"
                                  >
                                    Reason
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {!loading && !loadError && pageRows.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-16 text-center text-gray-500 border border-gray-200">
                              No cancelled requests.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

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
                          className={["h-9 min-w-9 px-3 rounded-md border", p === currentPage ? "border-[#0b82ff] bg-[#0b82ff] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"].join(" ")}
                          aria-current={p === currentPage ? "page" : undefined}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
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
          <div role="dialog" aria-modal="true" aria-label="Request details" tabIndex={-1} className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
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
                          parent.innerHTML = `<div class="w-full h-full grid place-items-center text-3xl font-semibold text-[#008cfc]">${(((viewRow?.name_first || "").trim().slice(0,1) + (viewRow?.name_last || "").trim().slice(0,1)) || "?").toUpperCase()}</div>`;
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
                    Created <span className="font-semibold text-[#008cfc]">{viewRow.created_at_display || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <StatusPill value="cancelled" />
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-6 flex-1 overflow-y-auto blue-scroll bg-gray-50">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <SectionButton k="all" label="All" />
                  <SectionButton k="info" label="Personal Information" />
                  <SectionButton k="details" label="Service Request Details" />
                  <SectionButton k="rate" label="Service Rate" />
                </div>
                {renderSection()}
              </div>

              <div className="px-6 sm:px-8 pb-8 pt-6 grid grid-cols-1 sm:grid-cols-1 gap-3 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => { setViewRow(null); }}
                  className="w-full inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {reasonRow && (
          <div role="dialog" aria-modal="true" aria-label="Cancellation reason" tabIndex={-1} className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setReasonRow(null); }} />
            <div className="relative w-full max-w-[720px] rounded-2xl border border-orange-300 bg-white shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-orange-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-700">Cancellation Reason</h3>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                    <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                    {reasonRow?.service_type || "Request"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">Created {reasonRow?.created_at_display || "-"}</div>
                <div className="text-xs text-gray-500">{reasonRow?.canceled_at ? `Cancelled ${fmtDateTime(reasonRow.canceled_at)}` : ""}</div>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                  <div className="text-[11px] font-semibold tracking-widest text-orange-700 uppercase">Reason</div>
                  <div className="mt-2 text-[15px] font-semibold text-gray-900 whitespace-pre-line">
                    {getCancelReason(reasonRow)}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Client</div>
                    <div className="mt-1 text-[15px] font-semibold text-gray-900">
                      {[reasonRow?.name_first, reasonRow?.name_last].filter(Boolean).join(" ") || "-"}
                    </div>
                    <div className="text-sm text-gray-600">{reasonRow?.email || "-"}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Service</div>
                    <div className="mt-1 text-[15px] font-semibold text-gray-900">{reasonRow?.service_task || "-"}</div>
                    <div className="text-sm text-gray-600">{reasonRow?.service_type || "-"}</div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 pt-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => { setReasonRow(null); }}
                  className="w-full inline-flex items-center justify-center rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
