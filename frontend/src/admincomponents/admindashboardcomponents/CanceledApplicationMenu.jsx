import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronsUpDown, RotateCcw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ENABLE_SELECTION = false;
const BOLD_FIRST_NAME = false;
const ACTION_ALIGN_RIGHT = false;

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

function StatusPill({ value }) {
  const v = String(value || "").toLowerCase();
  const isCancelled = v === "cancelled" || v === "canceled";
  const cfg =
    v === "approved"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", label: "Approved" }
      : v === "declined"
      ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", label: "Declined" }
      : isCancelled
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
  const cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap",
        cfg.bg,
        cfg.text,
        cfg.br
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
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap",
        "bg-violet-50",
        "text-violet-700",
        "border-violet-200"
      ].join(" ")}
      title={value || "-"}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
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

function resolveDoc(docs, keys, fuzzy) {
  if (!docs) return null;
  for (const k of keys || []) {
    if (docs[k]) return docs[k];
  }
  const all = Object.keys(docs || {});
  if (!all.length || !fuzzy) return null;
  for (const k of all) {
    const lk = k.toLowerCase();
    const allOk = !fuzzy.all || !fuzzy.all.length || fuzzy.all.every((s) => lk.includes(s));
    const anyOk = !fuzzy.any || !fuzzy.any.length || fuzzy.any.some((s) => lk.includes(s));
    if (allOk && anyOk) return docs[k];
  }
  return null;
}

function toDocUrl(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && first.url) return first.url;
  }
  if (typeof v === "object") {
    if (v.url) return v.url;
    if (v.link) return v.link;
  }
  return "";
}

function dateOnlyFrom(val) {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split("T")[0].split(" ")[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
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
function fmtMMDDYYYY(val) {
  const d = dateOnlyFrom(val);
  if (!d) return val || "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const firstNonEmpty = (...vals) => vals.find((x) => String(x || "").trim().length > 0) || "";
const isYes = (v) => {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "t"].includes(s)) return true;
  if (["no", "n", "false", "f"].includes(s)) return false;
  return false;
};

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}
function pickFirstString(val) {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : "")).filter(Boolean)[0] || "";
  if (isObj(val)) {
    for (const k of Object.keys(val)) {
      const v = val[k];
      if (typeof v === "string" && v.trim()) return v;
      if (isObj(v)) {
        const deep = pickFirstString(v);
        if (deep) return deep;
      }
    }
  }
  return "";
}
function extractTaskFromJobDetails(job_details, primaryService) {
  const grab = (obj) =>
    firstNonEmpty(
      obj.task,
      obj.role,
      obj.task_role,
      obj.service_task,
      obj.position,
      obj.title,
      typeof obj.name === "string" ? obj.name : ""
    );

  if (!job_details) return "";

  if (typeof job_details === "string") return job_details;

  if (Array.isArray(job_details)) {
    const fromService = job_details
      .map((it) => (typeof it === "object" && it ? it : {}))
      .filter((it) => !primaryService || String(it.service || it.service_type || it.category || "").toLowerCase() === String(primaryService).toLowerCase())
      .map((it) => {
        const direct = grab(it);
        if (direct) return direct;
        if (Array.isArray(it.tasks)) {
          const t = it.tasks.map((x) => (typeof x === "string" ? x : grab(x || {}))).filter(Boolean)[0];
          if (t) return t;
        }
        return "";
      })
      .filter(Boolean)[0];
    if (fromService) return fromService;

    const any = job_details
      .map((it) => {
        if (typeof it === "string") return it;
        if (typeof it === "object" && it) {
          const direct = grab(it);
          if (direct) return direct;
          if (Array.isArray(it.tasks)) {
            const t = it.tasks.map((x) => (typeof x === "string" ? x : grab(x || {}))).filter(Boolean)[0];
            if (t) return t;
          }
        }
        return "";
      })
      .filter(Boolean)[0];
    return any || "";
  }

  if (typeof job_details === "object") {
    if (primaryService && job_details[primaryService]) {
      const scoped = job_details[primaryService];
      if (typeof scoped === "string") return scoped;
      if (Array.isArray(scoped)) return extractTaskFromJobDetails(scoped, "");
      if (typeof scoped === "object") {
        const direct = grab(scoped);
        if (direct) return direct;
        if (Array.isArray(scoped.tasks)) {
          const t = scoped.tasks.map((x) => (typeof x === "string" ? x : grab(x || {}))).filter(Boolean)[0];
          if (t) return t;
        }
      }
    }
    const direct = grab(job_details);
    if (direct) return direct;
    if (Array.isArray(job_details.tasks)) {
      const t = job_details.tasks.map((x) => (typeof x === "string" ? x : grab(x || {}))).filter(Boolean)[0];
      if (t) return t;
    }
  }

  return "";
}

function fmtMoney(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(String(v).toString().replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return String(v);
  return `₱${n.toLocaleString()}`;
}

function rate_toNumber(x) {
  return x === null || x === undefined || x === "" ? null : Number(x);
}
function peso(val) {
  if (val === null || val === undefined || val === "") return "-";
  const n = Number(val);
  if (!isNaN(n)) {
    try {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
    } catch {
      return `₱${n}`;
    }
  }
  return `₱${val}`;
}
function normalizeLocalPH10(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("63")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(-10);
  if (d.length === 10 && d[0] === "9") return d;
  return "";
}
function ContactDisplay({ number }) {
  const local10 = normalizeLocalPH10(number);
  return (
    <div className="inline-flex items-center gap-2">
      <img src="/philippines.png" alt="PH" className="h-4 w-6 rounded-sm object-cover" />
      <span className="text-gray-700 text-sm">+63</span>
      <span className={`text-[15px] font-semibold ${local10 ? "text-black-500" : "text-gray-400"}`}>
        {local10 || "9XXXXXXXXX"}
      </span>
    </div>
  );
}
function ServiceTypesInline({ list, nowrap }) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  if (arr.length === 0) return <span className="text-gray-500 text-sm">-</span>;
  return (
    <div
      className={
        nowrap
          ? "flex items-center gap-1.5 whitespace-nowrap"
          : "flex items-center gap-1.5 whitespace-nowrap flex-wrap"
      }
    >
      {arr.map((s, i) => (
        <ServiceTypePill key={`${s}-${i}`} value={s} />
      ))}
    </div>
  );
}

export default function CanceledApplicationMenu() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: "full_name", dir: "asc" });
  const [viewRow, setViewRow] = useState(null);
  const [reasonRow, setReasonRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionOpen, setSectionOpen] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [showDocs, setShowDocs] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { status: "canceled" };
      if (searchTerm && searchTerm.trim()) params.q = searchTerm.trim();
      const res = await axios.get(`${API_BASE}/api/admin/workerapplications`, { params, withCredentials: true });
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((r) => {
        const i = r.info || {};
        const w = r.work || {};
        const d = r.documents || r.docs || {};
        const rate = r.rate || w.rate || {};
        const createdRaw = r.created_at || r.createdAt || i.created_at || w.created_at || null;
        const createdTs = parseDateTime(createdRaw)?.getTime() || 0;
        const serviceTypes = toArray(w.service_types).filter(Boolean);
        const primaryService =
          firstNonEmpty(
            w.primary_service,
            w.service_type,
            serviceTypes[0],
            r.service_type
          ) || "";
        const taskFromDetails = extractTaskFromJobDetails(w.job_details, primaryService);
        const taskOrRole = firstNonEmpty(
          w.primary_task,
          w.role,
          r.task,
          r.position,
          taskFromDetails,
          w.work_description
        );
        const rate_type = firstNonEmpty(rate.rate_type, w.rate_type, w.payment_type, w.billing_type);
        const rate_from = firstNonEmpty(rate.rate_from, w.rate_from, w.hourly_from, w.hourly_rate, w.rate_per_hour, w.rate_min, w.minimum_rate);
        const rate_to = firstNonEmpty(rate.rate_to, w.rate_to, w.hourly_to, w.rate_max);
        const rate_value = firstNonEmpty(rate.rate_value, w.rate_value, w.daily_rate, w.rate_per_day);
        const dob = firstNonEmpty(
          i.date_of_birth,
          i.dob,
          i.birthdate,
          i.birth_date,
          r.date_of_birth,
          r.dob,
          r.birthdate,
          r.birth_date,
          w.date_of_birth,
          w.dob,
          w.birthdate,
          w.birth_date
        );
        const infoNormalized = { ...i, date_of_birth: dob || i.date_of_birth };

        const first_name = infoNormalized.first_name || r.first_name || "";
        const last_name = infoNormalized.last_name || r.last_name || "";
        const full_name = [first_name, last_name].filter(Boolean).join(" ");

        return {
          id: r.id,
          status: "canceled",
          ui_status: "cancelled",
          name_first: first_name,
          name_last: last_name,
          full_name,
          email: infoNormalized.email_address || infoNormalized.email || r.email || "",
          info: infoNormalized,
          work: w,
          rate: { rate_type, rate_from, rate_to, rate_value },
          documents: d,
          service_types: serviceTypes,
          service_types_lex: serviceTypes.join(", "),
          primary_service: primaryService,
          task_or_role: taskOrRole,
          years_experience: w.years_experience ?? w.experience_years ?? r.years_experience,
          tools_provided: isYes(w.tools_provided) || w.tools_provided === true,
          has_certifications: isYes(w.has_certifications) || w.has_certifications === true || isYes(w.certified),
          service_description: w.work_description || w.description || "",
          created_at_raw: createdRaw,
          created_at_ts: createdTs,
          created_at_display: createdRaw ? fmtDateTime(createdRaw) : "",
          reason_choice: r.reason_choice || null,
          reason_other: r.reason_other || null,
          canceled_at: r.canceled_at || r.cancelled_at || null,
          profile_picture: infoNormalized.profile_picture_url || infoNormalized.profile_picture || r.profile_picture || ""
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
    const onCancelled = () => fetchItems();
    window.addEventListener("worker-application-cancelled", onCancelled);
    return () => window.removeEventListener("worker-application-cancelled", onCancelled);
  }, []);

  useEffect(() => {
    if (viewRow) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
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
    return rows.filter((r) => {
      const cand =
        r.primary_service ||
        (Array.isArray(r.work?.service_types) ? r.work.service_types[0] : "") ||
        r.task_or_role;
      return categoryMap(cand) === serviceFilter;
    });
  }, [rows, serviceFilter]);

  const serviceCounts = useMemo(() => {
    const counts = { all: rows.length, carwasher: 0, carpenter: 0, electrician: 0, laundry: 0, plumber: 0 };
    for (const r of rows) {
      const cand =
        r.primary_service ||
        (Array.isArray(r.work?.service_types) ? r.work.service_types[0] : "") ||
        r.task_or_role;
      const k = categoryMap(cand);
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
      <div className="px-6 py-5 rounded-2xl bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white flex items-center justify-between">
        <h3 className="text-base font-semibold flex.items-center gap-2">
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
      <div className="pointer-events-none.absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent.opacity-60"></div>
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

  const combineReason = (choice, other) => {
    const a = String(choice || "").trim();
    const b = String(other || "").trim();
    if (a && b) return `${a} — ${b}`;
    return a || b || "-";
  };

  const getCancelReason = (row) => {
    if (row?.reason_choice || row?.reason_other) return combineReason(row.reason_choice, row.reason_other);
    const i = row?.info || {};
    const w = row?.work || {};
    const r = row || {};
    return (
      r.cancel_reason ||
      r.cancellation_reason ||
      r.cancelled_reason ||
      i.cancel_reason ||
      i.cancellation_reason ||
      w.cancel_reason ||
      w.cancellation_reason ||
      "-"
    );
  };

  const serviceTabs = [
    { key: "all", label: "All" },
    { key: "carwasher", label: "Carwasher" },
    { key: "carpenter", label: "Carpenter" },
    { key: "electrician", label: "Electrician" },
    { key: "laundry", label: "Laundry" },
    { key: "plumber", label: "Plumber" }
  ];

  const renderServiceRateSection = () => {
    if (!viewRow) return null;
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
            <Field label="Rate Value" value={peso(rate_toNumber(viewRow?.rate?.rate_value))} />
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
            <Field label="Rate From" value={peso(rate_toNumber(viewRow?.rate?.rate_from))} />
            <Field label="Rate To" value={peso(rate_toNumber(viewRow?.rate?.rate_to))} />
          </div>
        </SectionCard>
      );
    }
    return (
      <SectionCard
        title="Service Rate"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text.white border-white/20">
            <span className="h-3 w-3 rounded-full bg-white/60" />
            Pricing
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
          <Field label="Rate Type" value={viewRow?.rate?.rate_type || "-"} />
          <Field label="Rate From" value={peso(rate_toNumber(viewRow?.rate?.rate_from))} />
          <Field label="Rate To" value={peso(rate_toNumber(viewRow?.rate?.rate_to))} />
          <Field label="Rate Value" value={peso(rate_toNumber(viewRow?.rate?.rate_value))} />
        </div>
      </SectionCard>
    );
  };

  const renderSection = () => {
    if (!viewRow) return null;
    if (sectionOpen === "all") {
      return (
        <div className="space-y-6">
          <SectionCard
            title="Personal Information"
            badge={
              <span className="inline-flex.items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
                Worker
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 max-w-5xl">
              <Field label="Date of Birth" value={fmtMMDDYYYY(viewRow?.info?.date_of_birth)} />
              <Field label="Age" value={viewRow?.info?.age ?? "-"} />
              <Field label="Contact Number:" value={<ContactDisplay number={viewRow?.info?.contact_number} />} />
              <Field label="Barangay" value={viewRow?.info?.barangay || "-"} />
              <Field label="Additional Address" value={viewRow?.info?.additional_address || viewRow?.info?.street || "-"} />
            </div>
          </SectionCard>

          <SectionCard
            title="Work Details"
            badge={
              <span className="inline-flex.items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
                Experience
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <Field label="Service Type(s)" value={<ServiceTypesInline list={viewRow?.service_types?.length ? viewRow.service_types : toArray(viewRow?.work?.service_types)} />} />
              <Field label="Service Task(s)" value={<TaskPill value={viewRow?.task_or_role} />} />
              <Field label="Tools Provided" value={<YesNoPill yes={viewRow?.tools_provided} />} />
              <Field label="Years of Experience" value={viewRow?.years_experience || "-"} />
              <Field label="Service Description" value={viewRow?.service_description || "-"} />
            </div>
          </SectionCard>

          {renderServiceRateSection()}
        </div>
      );
    }
    if (sectionOpen === "info") {
      return (
        <SectionCard
          title="Personal Information"
          badge={
            <span className="inline-flex.items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
              <span className="h-3 w-3 rounded-full bg-white/60" />
              Worker
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 max-w-5xl">
            <Field label="Date of Birth" value={fmtMMDDYYYY(viewRow?.info?.date_of_birth)} />
            <Field label="Age" value={viewRow?.info?.age ?? "-"} />
            <Field label="Contact Number:" value={<ContactDisplay number={viewRow?.info?.contact_number} />} />
            <Field label="Barangay" value={viewRow?.info?.barangay || "-"} />
            <Field label="Additional Address" value={viewRow?.info?.additional_address || viewRow?.info?.street || "-"} />
          </div>
        </SectionCard>
      );
    }
    if (sectionOpen === "work") {
      return (
        <SectionCard
          title="Work Details"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
              <span className="h-3 w-3 rounded-full bg-white/60" />
              Experience
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <Field label="Service Type(s)" value={<ServiceTypesInline list={viewRow?.service_types?.length ? viewRow.service_types : toArray(viewRow?.work?.service_types)} />} />
            <Field label="Service Task(s)" value={<TaskPill value={viewRow?.task_or_role} />} />
            <Field label="Tools Provided" value={<YesNoPill yes={viewRow?.tools_provided} />} />
            <Field label="Years of Experience" value={viewRow?.years_experience || "-"} />
            <Field label="Service Description" value={viewRow?.service_description || "-"} />
          </div>
        </SectionCard>
      );
    }
    if (sectionOpen === "rate") {
      return renderServiceRateSection();
    }
    return null;
  };

  return (
    <main className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Cancelled Applications</h1>
        <p className="text-gray-600 mt-2">All worker applications that have been cancelled.</p>
      </div>

      <section className="mt-6">
        <div className="-mx-6">
          <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
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
                        active ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
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
                  placeholder="Search Applications"
                  className="mt-7 h-10 w-72 rounded-md border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search applications"
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
                disabled={loading}
                className="mt-7 inline-flex items-center gap-2 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#008cfc] hover:bg-blue-50 disabled:opacity-60"
              >
                <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="px-6">
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
                            Worker Name
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </th>
                        <th className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 border border-gray-200 w-[260px] whitespace-nowrap">
                          Email
                        </th>
                        <th
                          className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none border border-gray-200 min-w-[260px]"
                          onClick={() => toggleSort("service_types_lex")}
                        >
                          <span className="inline-flex items-center">
                            Service Type
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
                                <div className={`text-gray-900 truncate ${BOLD_FIRST_NAME ? "font-medium" : "font-normal"} font-semibold`}>
                                  {fullName || "-"}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200 w-[260px] whitespace-nowrap">
                              <div className="truncate">{u.email || "-"}</div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200 align-top">
                              <ServiceTypesInline list={u.service_types?.length ? u.service_types : toArray(u.work?.service_types)} nowrap />
                            </td>
                            <td className="px-4 py-4 border border-gray-200 whitespace-nowrap w-[220px]">{u.created_at_display || "-"}</td>
                            <td className="px-4 py-4 border border-gray-200 w-[160px] min-w-[160px]">
                              <div className="flex items-center gap-1 flex-wrap">
                                <StatusPill value="cancelled" />
                              </div>
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
                          <td colSpan={6} className="px-4 py-16 text-center text-gray-500 border border-gray-200">
                            No cancelled applications.
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
                        className={["h-9 min-w-9 px-3 rounded-md border", p === currentPage ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"].join(" ")}
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
        <div role="dialog" aria-modal="true" aria-label="Worker application details" tabIndex={-1} className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setViewRow(null); setShowDocs(false); }} />
          <div className="relative w-full max-w-[1100px] h-[86vh] rounded-2xl border border-[#008cfc] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="relative px-8 pt-10 pb-6 bg-gradient-to-b from-blue-50 to-white">
              <div className="mx-auto w-24 h-24 rounded-full ring-4 ring-white border border-blue-100 bg.white overflow-hidden shadow">
                <img
                  src={(viewRow?.profile_picture && String(viewRow.profile_picture).startsWith("http")) ? viewRow.profile_picture : avatarFromName(`${viewRow?.name_first || ""} ${viewRow?.name_last || ""}`.trim())}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  data-fallback="primary"
                  onError={({ currentTarget }) => {
                    const parent = currentTarget.parentElement;
                    if (currentTarget.dataset.fallback === "primary") {
                      currentTarget.dataset.fallback = "dice";
                      currentTarget.src = avatarFromName(`${viewRow?.name_first || ""} ${viewRow?.name_last || ""}`.trim());
                      return;
                    }
                    currentTarget.style.display = "none";
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

              <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                <div className="text-sm text-gray-600">
                  Created <span className="font-semibold text-[#008cfc]">{viewRow.created_at_display || "-"}</span>
                </div>
                <StatusPill value="cancelled" />
              </div>
            </div>

            <div className="px-6 sm:px-8 py-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] bg-gray-50">
              <div className="mb-4 flex items-center justify-center gap-2">
                <SectionButton k="all" label="All" />
                <SectionButton k="info" label="Personal Information" />
                <SectionButton k="work" label="Work Details" />
                <SectionButton k="rate" label="Service Rate" />
              </div>
              {renderSection()}
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-6.grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => { setViewRow(null); setShowDocs(false); }}
                className="w-full inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowDocs(true)}
                className="w-full inline-flex items-center justify-center rounded-lg border border-[#008cfc] bg-[#008cfc] px-3 py-1.5 text-sm font-medium text.white hover:bg-[#0077d6]"
              >
                View Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {viewRow && showDocs && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="View documents"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDocs(false)} />
          <div className="relative w-full max-w-[900px] max-h-[80vh] overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl">
            <div className="px-6.py-4 border-b bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white">
              <div className="text-base font-semibold">Documents</div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh] [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
              {viewRow && (viewRow.documents || viewRow.docs) && Object.keys(viewRow.documents || viewRow.docs).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Primary ID (Front)", keys: ["primary_id_front", "primaryIdFront", "primary_front", "primary_front_id", "primary_id_front_url", "primary_front_url"] },
                    { label: "Primary ID (Back)", keys: ["primary_id_back", "primaryIdBack", "primary_back", "primary_back_id", "primary_id_back_url", "primary_back_url"] },
                    { label: "Secondary ID", keys: ["secondary_id", "secondaryId", "secondary_id_url"] },
                    { label: "NBI/Police Clearance", keys: ["nbi_police_clearance", "nbi_clearance", "police_clearance", "nbi", "police"] },
                    { label: "Proof of Address", keys: ["proof_of_address","proofOfAddress","address_proof","proof_address","billing_proof","utility_bill","proof_of_residence","proofOfResidence","residence_proof","residency_proof","barangay_clearance","barangay_certificate","electric_bill","water_bill","meralco_bill"], fuzzy: { any: ["address","residence","residency","billing","utility","bill","proof","poa","barangay","clearance"] } },
                    { label: "Medical Certificate", keys: ["medical_certificate", "med_cert"], fuzzy: { any: ["medical", "med_cert", "medcert", "health", "fit_to_work", "fit-to-work", "fit2work", "med"] } },
                    { label: "Certificates", keys: ["certificates", "training_certificates", "certs"] },
                  ].map((cfg) => {
                    const d = viewRow.documents || viewRow.docs || {};
                    const found = resolveDoc(d, cfg.keys, cfg.fuzzy);
                    const url = toDocUrl(found);
                    const isImg = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url);
                    return (
                      <div key={cfg.label} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
                        <div className="p-3">
                          {isImg && url ? (
                            <img src={url} alt={cfg.label} className="w-full h-40 object-contain" />
                          ) : (
                            <div className="text-sm text-gray-500 h-40 grid place-items-center">{url ? "Preview not available" : "No document"}</div>
                          )}
                        </div>
                        <div className="p-3 border-t flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-gray-500/70" />
                            {cfg.label}
                          </div>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex.items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">No link</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-600">No documents.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-white">
              <button
                onClick={() => setShowDocs(false)}
                className="w-full inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Done
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
                <span className="inline-flex.items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                  <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                  {reasonRow?.primary_service || "Application"}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">Created {reasonRow?.created_at_display || "-"}</div>
              <div className="text-xs text-gray-500">{reasonRow?.canceled_at ? `Cancelled ${fmtDateTime(reasonRow.canceled_at)}` : ""}</div>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="text-[11px] font-semibold tracking-widest text-orange-700 uppercase">Reason</div>
                <div className="mt-2 text-[15px] font-semibold text-gray-900 whitespace-pre-line">
                  {(() => {
                    if (reasonRow?.reason_choice || reasonRow?.reason_other) return [reasonRow.reason_choice, reasonRow.reason_other].filter(Boolean).join(" — ") || "-";
                    return "-";
                  })()}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Applicant</div>
                  <div className="mt-1 text-[15px] font-semibold text-gray-900">
                    {[reasonRow?.name_first, reasonRow?.name_last].filter(Boolean).join(" ") || "-"}
                  </div>
                  <div className="text-sm text-gray-600">{reasonRow?.email || "-"}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Primary Service</div>
                  <div className="mt-1 text-[15px] font-semibold text-gray-900">{reasonRow?.task_or_role || "-"}</div>
                  <div className="text-sm text-gray-600">{reasonRow?.primary_service || "-"}</div>
                </div>
              </div>
            </div>
            <div className="px-6.pb-6 pt-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => { setReasonRow(null); }}
                className="w-full.inline-flex.items-center justify-center rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
