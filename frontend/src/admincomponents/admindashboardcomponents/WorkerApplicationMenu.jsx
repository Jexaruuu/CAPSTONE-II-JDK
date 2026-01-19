import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronsUpDown, RotateCcw, X, Mail, ShieldCheck, CalendarDays, ClipboardList, Briefcase } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ENABLE_SELECTION = false;
const BOLD_FIRST_NAME = false;
const ACTION_ALIGN_RIGHT = false;

const REASONS_ADMIN = [
  "Incomplete details",
  "Not clear documents",
  "Outside service area",
  "Pricing too high"
];

const parseMaybe = (v) => {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v;
};

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

const normalizeServiceTask = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .map(x => ({
        category: String(x?.category || 'General'),
        tasks: (Array.isArray(x?.tasks) ? x.tasks : [])
          .map(t => String(t || '').trim())
          .filter(Boolean)
      }))
      .filter(g => g.tasks.length);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([k, v]) => ({
      category: String(k || 'General'),
      tasks: (Array.isArray(v) ? v : [v])
        .map(t => String(t || '').trim())
        .filter(Boolean)
    })).filter(g => g.tasks.length);
  }
  return [];
};

const isYes = (v) => String(v ?? "").toLowerCase() === "yes";
const rate_toNumber = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

function ServiceTypePill({ value }) {
  const v = String(value || "").toLowerCase().trim();
  let cfg;
  if (
    v === "car washing" ||
    v === "car wash" ||
    v === "carwashing" ||
    v === "carwasher" ||
    v === "car washer"
  ) {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "carpentry" || v === "carpenter") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (
    v === "electrical works" ||
    v === "electrical work" ||
    v === "electrical" ||
    v === "electrician"
  ) {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "laundry") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else if (v === "plumbing" || v === "plumber") {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  } else {
    cfg = { bg: "bg-blue-50", text: "text-blue-700", br: "border-blue-200" };
  }
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap",
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
        "max-w-full min-w-0 shrink overflow-hidden text-ellipsis whitespace-nowrap",
      ].join(" ")}
      title={value || "-"}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30 shrink-0" />
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {value || "-"}
      </span>
    </span>
  );
}
function YesNoPill({ yes }) {
  const truthy =
    yes === true ||
    yes === 1 ||
    String(yes).toLowerCase() === "yes" ||
    String(yes).toLowerCase() === "true";
  const falsy =
    yes === false ||
    yes === 0 ||
    String(yes).toLowerCase() === "no" ||
    String(yes).toLowerCase() === "false";

  const cfg = truthy
    ? { bg: "bg-emerald-50", text: "text-emerald-700", br: "border-emerald-200", label: "Yes" }
    : falsy
    ? { bg: "bg-red-50", text: "text-red-700", br: "border-red-200", label: "No" }
    : { bg: "bg-gray-50", text: "text-gray-600", br: "border-gray-200", label: "-" };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap",
        cfg.bg,
        cfg.text,
        cfg.br,
      ].join(" ")}
    >
      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
      {cfg.label}
    </span>
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

function ServiceTasksInline({ list, fallback }) {
  const base = Array.isArray(list) ? list.filter(Boolean) : [];
  const arr = base.length ? base : (fallback ? [fallback] : []);
  if (!arr.length) return <span className="text-gray-500 text-sm">-</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0">
      {arr.map((s, i) => (
        <TaskPill key={`${s}-${i}`} value={s} />
      ))}
    </div>
  );
}

const Field = ({ label, value }) => (
  <div className="text-left space-y-0.5">
    <div className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">{label}</div>
    <div className="text-[14px] font-semibold text-gray-900 break-words">{value ?? "-"}</div>
  </div>
);

const SectionCard = ({ title, children, badge }) => (
  <section className="relative rounded-xl border border-gray-200 bg-white">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {badge || null}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const QuickItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
    <div className="mt-0.5 rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-700">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-500">{label}</div>

      {value === null || value === undefined || value === "" ? (
        <div className="text-sm font-semibold text-gray-900 break-words">-</div>
      ) : typeof value === "string" || typeof value === "number" ? (
        <div className="text-sm font-semibold text-gray-900 break-words">{value}</div>
      ) : (
        <div className="min-w-0 w-full break-words">{value}</div>
      )}
    </div>
  </div>
);

const QuickItemRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
    <div className="mt-0.5 rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-700">
      {icon}
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 whitespace-nowrap">
          {label}
        </div>

        <div className="min-w-0 flex-1 flex justify-end">
          {value === null || value === undefined || value === "" ? (
            <div className="text-sm font-semibold text-gray-900">-</div>
          ) : typeof value === "string" || typeof value === "number" ? (
            <div className="text-sm font-semibold text-gray-900 break-words text-right">{value}</div>
          ) : (
            <div className="min-w-0 text-right">{value}</div>
          )}
        </div>
      </div>
    </div>
  </div>
);

function parseDateTime(val) {
  if (!val) return null;
  const raw = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    return isNaN(dt) ? null : dt;
  }
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}
function fmtDateTime(val) {
  const d = parseDateTime(val);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}
function fmtDateOnly(val) {
  const d = parseDateTime(val);
  return d ? d.toLocaleDateString() : "";
}
function computeAgeFrom(val) {
  const d = parseDateTime(val);
  if (!d) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

function resolveDoc(docs, keys, fuzzy) {
  if (!docs) return null;
  for (const k of keys || []) {
    if (docs[k]) return docs[k];
  }
  const allKeys = Object.keys(docs || {});
  if (!allKeys.length || !fuzzy) return null;
  for (const k of allKeys) {
    const lk = k.toLowerCase();
    if (fuzzy.all && fuzzy.all.length && !fuzzy.all.every((s) => lk.includes(s))) continue;
    if (fuzzy.any && fuzzy.any.length && !fuzzy.any.some((s) => lk.includes(s))) continue;
    return docs[k];
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

const firstNonEmpty = (...vals) => vals.find((x) => String(x || "").trim().length > 0) || "";

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
      .filter(
        (it) =>
          !primaryService ||
          String(it.service || it.service_type || it.category || "").toLowerCase() ===
            String(primaryService).toLowerCase()
      )
      .map((it) => {
        const direct = grab(it);
        if (direct) return direct;
        if (Array.isArray(it.tasks)) {
          const t = it.tasks
            .map((x) => (typeof x === "string" ? x : grab(x || {})))
            .filter(Boolean)[0];
          if (t) return t;
        }
        if (Array.isArray(it.service_tasks)) {
          const t = it.service_tasks
            .map((x) => (typeof x === "string" ? x : grab(x || {})))
            .filter(Boolean)[0];
          if (t) return t;
        }
        if (Array.isArray(it.serviceTasks)) {
          const t = it.serviceTasks
            .map((x) => (typeof x === "string" ? x : grab(x || {})))
            .filter(Boolean)[0];
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
            const t = it.tasks
              .map((x) => (typeof x === "string" ? x : grab(x || {})))
              .filter(Boolean)[0];
            if (t) return t;
          }
          if (Array.isArray(it.service_tasks)) {
            const t = it.service_tasks
              .map((x) => (typeof x === "string" ? x : grab(x || {})))
              .filter(Boolean)[0];
            if (t) return t;
          }
          if (Array.isArray(it.serviceTasks)) {
            const t = it.serviceTasks
              .map((x) => (typeof x === "string" ? x : grab(x || {})))
              .filter(Boolean)[0];
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
        if (Array.isArray(scoped.service_tasks) && scoped.service_tasks.length) {
          const first = scoped.service_tasks[0];
          if (typeof first === "string") return first;
          if (first && typeof first === "object") {
            const direct = grab(first);
            if (direct) return direct;
          }
        }
        if (Array.isArray(scoped.serviceTasks) && scoped.serviceTasks.length) {
          const first = scoped.serviceTasks[0];
          if (typeof first === "string") return first;
          if (first && typeof first === "object") {
            const direct = grab(first);
            if (direct) return direct;
          }
        }
        const direct = grab(scoped);
        if (direct) return direct;
        if (Array.isArray(scoped.tasks)) {
          const t = scoped.tasks
            .map((x) => (typeof x === "string" ? x : grab(x || {})))
            .filter(Boolean)[0];
          if (t) return t;
        }
      }
    }
    if (Array.isArray(job_details.service_tasks) && job_details.service_tasks.length) {
      const first = job_details.service_tasks[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const direct = grab(first);
        if (direct) return direct;
      }
    }
    if (Array.isArray(job_details.serviceTasks) && job_details.serviceTasks.length) {
      const first = job_details.serviceTasks[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const direct = grab(first);
        if (direct) return direct;
      }
    }
    const direct = grab(job_details);
    if (direct) return direct;
    if (Array.isArray(job_details.tasks)) {
      const t = job_details.tasks
        .map((x) => (typeof x === "string" ? x : grab(x || {})))
        .filter(Boolean)[0];
      if (t) return t;
    }
  }

  return "";
}

function extractTasksListFromJobDetails(job_details, primaryService) {
  const tasks = [];
  const add = (val) => {
    const v = String(val || "").trim();
    if (!v) return;
    if (!tasks.includes(v)) tasks.push(v);
  };
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
  if (!job_details) return tasks;
  if (typeof job_details === "string") {
    job_details
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(add);
    return tasks;
  }
  if (Array.isArray(job_details)) {
    job_details.forEach((it) => {
      if (!it) return;
      if (typeof it === "string") {
        add(it);
        return;
      }
      if (typeof it === "object") {
        const svc = String(it.service || it.service_type || it.category || "").toLowerCase();
        if (!primaryService || svc === String(primaryService).toLowerCase()) {
          const direct = grab(it);
          if (direct) add(direct);
          if (Array.isArray(it.tasks)) {
            it.tasks.forEach((x) => {
              if (typeof x === "string") add(x);
              else if (x && typeof x === "object") add(grab(x));
            });
          }
          if (Array.isArray(it.service_tasks)) {
            it.service_tasks.forEach((x) => {
              if (typeof x === "string") add(x);
              else if (x && typeof x === "object") add(grab(x));
            });
          }
          if (Array.isArray(it.serviceTasks)) {
            it.serviceTasks.forEach((x) => {
              if (typeof x === "string") add(x);
              else if (x && typeof x === "object") add(grab(x));
            });
          }
        }
      }
    });
    return tasks;
  }
  if (typeof job_details === "object") {
    if (primaryService && job_details[primaryService]) {
      const scoped = job_details[primaryService];
      const inner = extractTasksListFromJobDetails(scoped, "");
      inner.forEach(add);
    }
    const keys = Object.keys(job_details);
    keys.forEach((k) => {
      const v = job_details[k];
      if (!v) return;
      if (typeof v === "string") {
        add(v);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((x) => {
          if (typeof x === "string") add(x);
          else if (x && typeof x === "object") add(grab(x));
        });
        return;
      }
      if (typeof v === "object") {
        const inner = extractTasksListFromJobDetails(v, "");
        inner.forEach(add);
      }
    });
    const direct = grab(job_details);
    if (direct) add(direct);
    if (Array.isArray(job_details.tasks)) {
      job_details.tasks.forEach((x) => {
        if (typeof x === "string") add(x);
        else if (x && typeof x === "object") add(grab(x));
      });
    }
    if (Array.isArray(job_details.service_tasks)) {
      job_details.service_tasks.forEach((x) => {
        if (typeof x === "string") add(x);
        else if (x && typeof x === "object") add(grab(x));
      });
    }
    if (Array.isArray(job_details.serviceTasks)) {
      job_details.serviceTasks.forEach((x) => {
        if (typeof x === "string") add(x);
        else if (x && typeof x === "object") add(grab(x));
      });
    }
  }
  return tasks;
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

function parseMultiLinks(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  if (typeof v === "object") {
    const url = v.url || v.link || v.href || "";
    return url ? [String(url).trim()] : [];
  }
  const s = String(v || "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map((x) => String(x || "").trim()).filter(Boolean);
    } catch {}
  }
  if (s.includes("|")) return s.split("|").map((x) => String(x || "").trim()).filter(Boolean);
  if (s.includes("\n")) return s.split("\n").map((x) => String(x || "").trim()).filter(Boolean);
  return [s];
}

function isImageUrl(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s)) return true;
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(s);
}


export default function WorkerApplicationMenu() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: "full_name", dir: "asc" });
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);
  const [viewRow, setViewRow] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  const [showDocs, setShowDocs] = useState(false);

  const [docsFetched, setDocsFetched] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [showDecline, setShowDecline] = useState(false);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineOther, setDeclineOther] = useState("");
  const [declineErr, setDeclineErr] = useState("");
  const [submittingDecline, setSubmittingDecline] = useState(false);

  const [showReason, setShowReason] = useState(false);
  const [reasonTarget, setReasonTarget] = useState(null);

  const [submittingConfirmCancel, setSubmittingConfirmCancel] = useState(false);
  const [showConfirmCancelSuccess, setShowConfirmCancelSuccess] = useState(false);
  const prevSubmittingRef = useRef(submittingConfirmCancel);

  const [showDeclineLoading, setShowDeclineLoading] = useState(false);
  const [showDeclineSuccess, setShowDeclineSuccess] = useState(false);
  const [logoBrokenDecline, setLogoBrokenDecline] = useState(false);
  const [logoBrokenDecline2, setLogoBrokenDecline2] = useState(false);

  const [sectionOpen, setSectionOpen] = useState("info");

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

  const closeView = () => setViewRow(null);

  const initialsFrom = (first, last) => {
    const a = (String(first || "").trim().slice(0, 1) + String(last || "").trim().slice(0, 1)).toUpperCase();
    return a || "?";
  };

  const viewStatusPills = (r) => (
    <div className="flex flex-nowrap gap-2 whitespace-nowrap">
      <StatusPill value={r?.status} />
    </div>
  );

  const fetchItems = async (_statusArg = filter, qArg = searchTerm) => {
    setLoading(true);
    setLoadError("");
    try {
      const params = {};
      if (_statusArg && _statusArg !== "all") params.status = String(_statusArg).trim().toLowerCase();
      if (qArg && qArg.trim()) params.q = qArg.trim();
      const res = await axios.get(`${API_BASE}/api/admin/workerapplications`, {
        params,
        withCredentials: true,
      });
      const rawItems = Array.isArray(res?.data?.items) ? res.data.items : [];
      const items = rawItems.filter((r) => String(r.status || "").toLowerCase() !== "cancelled");
      const mapped = items.map((r) => {
        const i = parseMaybe(r.info || r.information || r.profile || {});
        const w = parseMaybe(r.work || r.details || r.work_details || {});
        const rate = parseMaybe(r.rate || {});
        const st = Array.isArray(w.service_types)
          ? w.service_types
          : Array.isArray(r.service_types)
          ? r.service_types
          : [];
        const createdRaw =
          r.created_at || r.createdAt || i.created_at || i.createdAt || null;
        const createdTs = parseDateTime(createdRaw)?.getTime() || 0;
        const s = String(r.status ?? "").trim().toLowerCase();
        const primaryService = st[0] || "";
        const taskFromDetails = extractTaskFromJobDetails(w.job_details, primaryService);
        const taskOrRole = firstNonEmpty(w.primary_task, w.role, taskFromDetails, w.work_description);
        const tasksList = [];
        const addTask = (val) => {
          const v = String(val || "").trim();
          if (!v) return;
          if (!tasksList.includes(v)) tasksList.push(v);
        };
        const fromDetailsList = extractTasksListFromJobDetails(w.job_details, primaryService);
        fromDetailsList.forEach(addTask);
        addTask(w.primary_task);
        addTask(w.role);
        addTask(taskFromDetails);
        if (Array.isArray(w.service_tasks)) {
          w.service_tasks.forEach(addTask);
        }
        if (Array.isArray(w.serviceTasks)) {
          w.serviceTasks.forEach(addTask);
        }
        if (typeof w.service_tasks === "string") {
          w.service_tasks
            .split([/,/])
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach(addTask);
        }
        if (typeof w.serviceTasks === "string") {
          w.serviceTasks
            .split([/,/])
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach(addTask);
        }
        const groupsFromServiceTask = normalizeServiceTask(w.service_task);
        groupsFromServiceTask.forEach(g => g.tasks.forEach(addTask));

        const dobRaw = firstNonEmpty(
          i.date_of_birth,
          i.birth_date,
          i.birthdate,
          i.birthDate,
          i.dateOfBirth,
          i.dob,
          r.date_of_birth,
          r.dob,
          r.dateOfBirth,
          r.birth_date,
          r.birthDate,
          r.date_of_birth_raw,
          i.date_of_birth_raw
        ) || null;

        const dobDisplay = firstNonEmpty(
          i.date_of_birth_display,
          r.date_of_birth_display,
          i.birth_date_display,
          r.birth_date_display,
          fmtDateOnly(dobRaw)
        );

        const ageValue = (() => {
          const a = i.age ?? r.age;
          if (a !== undefined && a !== null && String(a).trim() !== "") return a;
          return computeAgeFrom(dobRaw);
        })();

        return {
          id: r.id,
          request_group_id: r.request_group_id,
          status: s || "pending",
          name_first: i.first_name || "",
          name_last: i.last_name || "",
          full_name: [i.first_name, i.last_name].filter(Boolean).join(" ") || "",
          email: r.email_address || i.email_address || "",
          barangay: i.barangay || "",
          additional_address: i.additional_address || i.street || "",
          date_of_birth_raw: dobRaw,
          date_of_birth_display: dobDisplay || "-",
          age: ageValue ?? "-",
          contact_number:
            i.contact_number ||
            i.contactNumber ||
            r.contact_number ||
            r.phone_number ||
            i.phone_number ||
            "",
          years_experience: w.years_experience ?? "",
          tools_provided: isYes(w.tools_provided) || w.tools_provided === true,
          service_types: st,
          primary_service: primaryService,
          service_types_lex: st.join(", "),
          task_or_role: taskOrRole || "",
          service_tasks: tasksList,
          service_description: w.work_description || "",
          rate_type: rate.rate_type || "",
          rate_from: rate.rate_from,
          rate_to: rate_toNumber(rate.rate_to),
          rate_value: rate_toNumber(rate.rate_value),
          info: i,
          work: w,
          rate,
         docs: r.docs || {},
required_documents: r.required_documents || r.requiredDocuments || null,
          created_at_raw: createdRaw,
          created_at_ts: createdTs,
          created_at_display: createdRaw ? fmtDateTime(createdRaw) : "",
          profile_picture_url: i.profile_picture_url || null,
          reason_choice: r.reason_choice || r.decline_reason_choice || null,
          reason_other: r.reason_other || r.decline_reason_other || null,
          decision_reason: r.decision_reason || r.reason || null,
          decided_at_raw: r.decided_at || null,
          decided_at_display: r.decided_at ? fmtDateTime(r.decided_at) : r.decided_at_display || ""
        };
      });

      setRows(mapped);
      const norm = (x) => String(x ?? "").trim().toLowerCase();
      const pc = mapped.filter((x) => norm(x.status) === "pending").length;
      const ac = mapped.filter((x) => norm(x.status) === "approved").length;
      const dc = mapped.filter((x) => norm(x.status) === "declined").length;
      setCounts({ pending: pc, approved: ac, declined: dc, total: pc + ac + dc });
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load");
      setRows([]);
      setCounts({ pending: 0, approved: 0, declined: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

const fetchRequiredDocs = async (gid) => {
  if (!gid) return null;
  setDocsLoading(true);
  setDocsError("");

  const unwrapRoot = (data) => {
    if (!data) return {};
    return data.item || data.application || data.record || data.worker || data;
  };

  const pickDocs = (root) => {
    const rdRaw =
      root.required_documents ||
      root.requiredDocuments ||
      root.required_docs ||
      root.docs ||
      root.documents ||
      root.requiredDocs ||
      null;

    const topLevel =
      (root?.data && (root.data.required_documents || root.data.requiredDocuments)) ||
      null;

    const rd = parseMaybe(rdRaw || topLevel);

    if (rd && typeof rd === "object") return rd;
    return null;
  };

  try {
    const urls = [
      `${API_BASE}/api/admin/workerapplications/group/${encodeURIComponent(gid)}`,
      `${API_BASE}/api/workerapplications/group/${encodeURIComponent(gid)}`
    ];

    let merged = null;

    for (const url of urls) {
      try {
        const res = await axios.get(url, { withCredentials: true });
        const data = res?.data || {};
        const root = unwrapRoot(data);
        const docs = pickDocs(root) || pickDocs(data) || null;

        if (docs) {
          merged = docs;
          break;
        }
      } catch {}
    }

    setDocsFetched(merged || null);

    if (!merged) {
      setDocsError("No documents found for this application.");
      return null;
    }

    return merged;
  } catch (e) {
    setDocsFetched(null);
    setDocsError(e?.response?.data?.message || e?.message || "Failed to load documents");
    return null;
  } finally {
    setDocsLoading(false);
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
    return () => clearTimeout(t);
  }, [filter, searchTerm]);

  useEffect(() => {
    if (viewRow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setShowDocs(false);
      setDocsFetched(null);
      setDocsError("");
      setDocsLoading(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewRow]);

  useEffect(() => {
    if (showDocs && viewRow?.request_group_id) {
      fetchRequiredDocs(viewRow.request_group_id);
    }
  }, [showDocs, viewRow?.request_group_id]);

  useEffect(() => {
    if (showConfirmCancelSuccess) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showConfirmCancelSuccess]);

  useEffect(() => {
    if (prevSubmittingRef.current && !submittingConfirmCancel) {
      setShowConfirmCancelSuccess(true);
    }
    prevSubmittingRef.current = submittingConfirmCancel;
  }, [submittingConfirmCancel]);

  useEffect(() => {
    if (showDeclineLoading || showDeclineSuccess) {
      document.body.style.overflow = "hidden";
    } else if (!viewRow && !showConfirmCancelSuccess) {
      document.body.style.overflow = "";
    }
  }, [showDeclineLoading, showDeclineSuccess, viewRow, showConfirmCancelSuccess]);

  const filteredRows = useMemo(() => {
    const f = String(filter || "all").toLowerCase();
    if (f === "all") return rows;
    return rows.filter((r) => String(r.status || "").trim().toLowerCase() === f);
  }, [rows, filter]);

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
      setCounts((c) => ({
        ...c,
        pending: Math.max(0, c.pending - 1),
        approved: c.approved + 1,
        total: Math.max(0, c.pending - 1) + c.approved + 1 + c.declined
      }));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to approve");
    }
  };

  const decline = async (id, payload = null) => {
    setLoadError("");
    try {
      const res = await axios.post(`${API_BASE}/api/admin/workerapplications/${id}/decline`, payload || {}, { withCredentials: true });
      const d = res?.data || {};
      setRows((r) =>
        r.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "declined",
                reason_choice: d.reason_choice ?? payload?.reason_choice ?? x.reason_choice ?? null,
                reason_other: d.reason_other ?? payload?.reason_other ?? x.reason_other ?? null,
                decision_reason: d.decision_reason ?? x.decision_reason ?? null,
                decided_at_raw: d.decided_at || x.decided_at_raw || null,
                decided_at_display: d.decided_at ? fmtDateTime(d.decided_at) : (x.decided_at_display || "")
              }
            : x
        )
      );
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setCounts((c) => ({
        ...c,
        pending: Math.max(0, c.pending - 1),
        declined: c.declined + 1,
        total: Math.max(0, c.pending - 1) + c.approved + c.declined + 1
      }));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to decline");
      throw err;
    }
  };

  const openDeclineModal = (row) => {
    setDeclineErr("");
    setDeclineReason("");
    setDeclineOther("");
    setDeclineTarget(row);
    setShowDecline(true);
  };

  const submitDecline = async () => {
    const other = declineOther.trim();
    if (!declineReason && !other) {
      setDeclineErr("Please select a reason or write one.");
      return;
    }
    setDeclineErr("");
    setShowDecline(false);
    await new Promise((r) => setTimeout(r, 30));
    setShowDeclineLoading(true);
    setSubmittingDecline(true);
    try {
      await decline(declineTarget.id, { reason_choice: declineReason || null, reason_other: other || null });
      setDeclineTarget(null);
      await Promise.all([fetchCounts(), fetchItems(filter, searchTerm)]);
      setShowDeclineLoading(false);
      setShowDeclineSuccess(true);
    } catch (e) {
      setDeclineErr(e?.response?.data?.message || "Failed to decline. Try again.");
      setShowDecline(true);
      setShowDeclineLoading(false);
    } finally {
      setSubmittingDecline(false);
    }
  };

  const openReasonModal = (row) => {
    setReasonTarget(row);
    setShowReason(true);
  };

  const getReasonText = (row) => {
    const parts = [];
    const rc = row?.reason_choice;
    const ro = row?.reason_other;
    if (rc) parts.push(rc);
    if (ro) parts.push(ro);
    const fb = row?.decision_reason;
    if (!parts.length && fb) parts.push(fb);
    return parts.join(" — ") || "No reason provided.";
  };

  const tabs = [
    { key: "all", label: "All", count: counts.total },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "declined", label: "Declined", count: counts.declined },
  ];

  const COLSPAN = ENABLE_SELECTION ? 7 : 6;

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

  const SectionButton = ({ k, label }) => {
    const active = sectionOpen === k;
    return (
      <button
        onClick={() => setSectionOpen(k)}
        className={[
          "rounded-full px-3 py-1.5 text-xs md:text-sm border transition",
          active ? "bg-[#0b82ff] text-white border-[#0b82ff] shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const renderSection = () => {
    if (!viewRow) return null;

    if (sectionOpen === "info") {
      return (
        <SectionCard
          title="Personal Information"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700 border-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0b82ff]" />
              Worker
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 max-w-5xl">
            <Field label="Date of Birth" value={viewRow?.date_of_birth_display || "-"} />
            <Field label="Age" value={viewRow?.age ?? "-"} />
            <Field label="Contact Number" value={<ContactDisplay number={viewRow?.contact_number} />} />
            <Field label="Barangay" value={viewRow?.barangay || "-"} />
            <Field label="Street" value={viewRow?.additional_address || "-"} />
          </div>
        </SectionCard>
      );
    }

    if (sectionOpen === "work") {
      const toolsText =
        viewRow?.tools_provided === true ? "Yes" : viewRow?.tools_provided === false ? "No" : "-";

      return (
        <SectionCard
          title="Work Details"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700 border-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0b82ff]" />
              Experience
            </span>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div>
              <Field label="Tools Provided" value={toolsText} />
            </div>

            <div>
              <Field label="Years of Experience" value={viewRow?.years_experience || "-"} />
            </div>

            <div className="lg:col-span-3">
              <Field
                label="Service Type(s)"
                value={<ServiceTypesInline list={viewRow?.service_types} />}
              />
            </div>

            <div className="lg:col-span-3">
              <Field
                label="Service Task(s)"
                value={<ServiceTasksInline list={viewRow?.service_tasks} fallback={viewRow?.task_or_role} />}
              />
            </div>

            <div className="lg:col-span-3">
              <Field label="Service Description" value={viewRow?.service_description || "-"} />
            </div>
          </div>
        </SectionCard>
      );
    }

    return null;
  };

  const [serviceFilter, setServiceFilter] = useState("all");
  const categoryMap = (serviceOrTask) => {
    const s = String(serviceOrTask || "").trim().toLowerCase();
    if (s === "car washing" || s === "carwasher" || s === "car washer" || /car\s*wash/.test(s)) return "carwasher";
    if (s === "carpentry" || s === "carpenter") return "carpenter";
    if (s === "electrical works" || s === "electrical work" || s === "electrician" || /electric/.test(s)) return "electrician";
    if (s === "laundry" || /laund/.test(s)) return "laundry";
    if (s === "plumbing" || s === "plumber") return "plumber";
    return "";
  };
  const serviceCounts = useMemo(() => {
    const counts = { all: rows.length, carwasher: 0, carpenter: 0, electrician: 0, laundry: 0, plumber: 0 };
    for (const r of rows) {
      const cand =
        r.primary_service ||
        (Array.isArray(r.service_types) && r.service_types.length ? r.service_types[0] : "") ||
        r.task_or_role;
      const k = categoryMap(cand);
      if (k && counts[k] !== undefined) counts[k]++;
    }
    return counts;
  }, [rows]);
  const serviceTabs = [
    { key: "all", label: "All" },
    { key: "carwasher", label: "Carwasher" },
    { key: "carpenter", label: "Carpenter" },
    { key: "electrician", label: "Electrician" },
    { key: "laundry", label: "Laundry" },
    { key: "plumber", label: "Plumber" }
  ];

  const docsObj = useMemo(() => {
    const fallback = viewRow?.docs || {};
    return docsFetched || viewRow?.required_documents || fallback;
  }, [docsFetched, viewRow?.docs, viewRow?.required_documents]);

  const docCards = useMemo(() => {
  const d = docsObj || {};

  const getLinks = (keys, fuzzy = null) => {
    const picked = resolveDoc(d, keys, fuzzy);
    return parseMultiLinks(picked);
  };

  return [
    {
      label: "Primary ID (Front)",
      links: getLinks(
        [
          "primary_id_front",
          "primaryIdFront",
          "primary_id_front_url",
          "primary_id_front_link",
          "primary_id_front_image",
        ],
        { all: ["primary"], any: ["front"] }
      ),
    },
    {
      label: "Primary ID (Back)",
      links: getLinks(
        [
          "primary_id_back",
          "primaryIdBack",
          "primary_id_back_url",
          "primary_id_back_link",
          "primary_id_back_image",
        ],
        { all: ["primary"], any: ["back"] }
      ),
    },
    {
      label: "Secondary ID",
      links: getLinks(
        [
          "secondary_id",
          "secondaryId",
          "secondary_id_url",
          "secondary_id_link",
          "secondary_id_image",
        ],
        { all: ["secondary"], any: ["id"] }
      ),
    },
    {
      label: "NBI/Police Clearance",
      links: getLinks(
        [
          "nbi_police_clearance",
          "nbiPoliceClearance",
          "police_clearance",
          "policeClearance",
          "nbi_clearance",
          "nbiClearance",
        ],
        { any: ["nbi", "police", "clearance"] }
      ),
    },
    {
      label: "Proof of Address",
      links: getLinks(
        [
          "proof_of_address",
          "proofOfAddress",
          "address_proof",
          "addressProof",
          "billing_proof",
          "billingProof",
        ],
        { all: ["proof"], any: ["address", "billing"] }
      ),
    },
    {
      label: "Medical Certificate",
      links: getLinks(
        [
          "medical_certificate",
          "medicalCertificate",
          "med_certificate",
          "medCertificate",
        ],
        { all: ["medical"], any: ["certificate", "cert"] }
      ),
    },

    {
      label: "TESDA Carpentry Certificate",
      links: getLinks(
        [
          "tesda_carpentry_certificate",
          "tesdaCarpentryCertificate",
          "tesda_carpentry",
          "tesdaCarpentry",
          "carpentry_certificate",
          "carpentryCertificate",
        ],
        { all: ["tesda"], any: ["carpentry"] }
      ),
    },
    {
      label: "TESDA Electrician Certificate",
      links: getLinks(
        [
          "tesda_electrician_certificate",
          "tesdaElectricianCertificate",
          "tesda_electrician",
          "tesdaElectrician",
          "electrician_certificate",
          "electricianCertificate",
          "electrical_certificate",
          "electricalCertificate",
        ],
        { all: ["tesda"], any: ["electric", "electrical"] }
      ),
    },
    {
      label: "TESDA Plumbing Certificate",
      links: getLinks(
        [
          "tesda_plumbing_certificate",
          "tesdaPlumbingCertificate",
          "tesda_plumbing",
          "tesdaPlumbing",
          "plumbing_certificate",
          "plumbingCertificate",
        ],
        { all: ["tesda"], any: ["plumb"] }
      ),
    },
    {
      label: "TESDA Carwashing Certificate",
      links: getLinks(
        [
          "tesda_carwashing_certificate",
          "tesdaCarwashingCertificate",
          "tesda_car_washing_certificate",
          "tesdaCarWashingCertificate",
          "tesda_carwashing",
          "tesdaCarwashing",
          "carwashing_certificate",
          "carwashingCertificate",
          "car_wash_certificate",
          "carWashCertificate",
        ],
        { all: ["tesda"], any: ["carwash", "car washing", "carwashing"] }
      ),
    },
    {
      label: "TESDA Laundry Certificate",
      links: getLinks(
        [
          "tesda_laundry_certificate",
          "tesdaLaundryCertificate",
          "tesda_laundry",
          "tesdaLaundry",
          "laundry_certificate",
          "laundryCertificate",
        ],
        { all: ["tesda"], any: ["laundry"] }
      ),
    },
  ];
}, [docsObj]);

  return (
    <>
      <style>{`
        .blue-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.blue-scroll::-webkit-scrollbar {
  width: 0px;
  height: 0px;
  display: none;
}

      `}</style>

      <main className="p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Worker Applications</h1>
          <p className="text-gray-600 mt-2">Browse, search, and manage all incoming and processed worker applications.</p>
        </div>

        <section className="mt-6">
          <div className="-mx-6">
            <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Filter</span>
                <div className="flex items-center gap-2">
                  {[{ key:"all",label:"All",count:counts.total },{ key:"pending",label:"Pending",count:counts.pending },{ key:"approved",label:"Approved",count:counts.approved },{ key:"declined",label:"Declined",count:counts.declined }].map((t) => {
                    const active = filter === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setFilter(t.key)}
                        className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm transition ${
                          active
                            ? "border-[#0b82ff] bg-[#0b82ff] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        title={`${t.label} (${typeof t.count === "number" ? t.count : "0"})`}
                      >
                        <span>{t.label}</span>
                        <span
                          className={`inline-flex items-center justify-center min-w-6 rounded-full px-1.5 text-xs font-semibold ${
                            active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {typeof t.count === "number" ? t.count : "—"}
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
                    fetchCounts();
                    fetchItems(filter, searchTerm);
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  className="mt-7 inline-flex items-center gap-2 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#0b82ff] hover:bg-blue-50 disabled:opacity-60"
                >
                  <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
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
                          const sLower = String(u.status || "").toLowerCase();
                          const isDeclined = sLower === "declined";
                          const isApproved = sLower === "approved";
                          const disableActions = isApproved || isDeclined;
                          const fullName = u.full_name || [u.name_first, u.name_last].filter(Boolean).join(" ");
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
                                <ServiceTypesInline list={u.service_types} nowrap />
                              </td>
                              <td className="px-4 py-4 border border-gray-200 whitespace-nowrap w-[220px]">
                                {u.created_at_display || "-"}
                              </td>
                              <td className="px-4 py-4 border border-gray-200 w-[160px] min-w-[160px]">
                                <StatusPill value={u.status} />
                              </td>

                              <td className={`px-4 py-4 w-40 ${ACTION_ALIGN_RIGHT ? "text-right" : "text-left"} border border-gray-200`}>
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => { setViewRow(u); setSectionOpen("info"); }}
                                    className="inline-flex items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                  >
                                    View
                                  </button>
                                  {isDeclined ? (
                                    <button
                                      onClick={() => openReasonModal(u)}
                                      className="inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                      Reason
                                    </button>
                                  ) : isApproved ? null : (
                                    <>
                                      <button
                                        onClick={() => openDeclineModal(u)}
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
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {!loading && !loadError && pageRows.length === 0 && (
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
                              ? "border-[#0b82ff] bg-[#0b82ff] text-white"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50",
                          ].join(" ")}
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
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Worker application details"
            tabIndex={-1}
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeView} />

            <div className="relative w-full max-w-6xl max-h-[86vh] rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="relative border-b border-gray-200 bg-gradient-to-r from-blue-50 via-white to-white">
                <div className="px-6 sm:px-8 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold tracking-[0.25em] uppercase text-gray-500">
                        Worker Application
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                        <ShieldCheck className="h-4 w-4" />
                        Admin View
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row max-h-[calc(86vh-76px)]">
                <aside className="md:w-[320px] lg:w-[360px] border-b md:border-b-0 md:border-r border-gray-200 bg-white">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden shadow-sm">
                        {viewRow?.profile_picture_url ? (
                          <img
                            src={viewRow.profile_picture_url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={({ currentTarget }) => {
                              currentTarget.style.display = "none";
                              const parent = currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">${initialsFrom(viewRow?.name_first, viewRow?.name_last)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">
                            {initialsFrom(viewRow?.name_first, viewRow?.name_last)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {[viewRow?.name_first, viewRow?.name_last].filter(Boolean).join(" ") || "-"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{viewRow?.email || "-"}</div>
                        <div className="mt-2 flex flex-wrap gap-2">{viewStatusPills(viewRow)}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3">
                      <QuickItem
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Created"
                        value={viewRow?.created_at_display || "-"}
                      />
                    </div>

                    <div className="mt-5">
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-500">
                            Application ID
                          </div>
                          <div className="mt-1 font-mono text-[13px] text-gray-900 break-all">
                            {viewRow?.id || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setDocsFetched(null);
                          setDocsError("");
                          setShowDocs(true);
                        }}
                        className="w-full inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium bg-[#0b82ff] text-white border border-[#0b82ff] hover:bg-[#086bd4]"
                      >
                        View Documents
                      </button>
                    </div>
                  </div>
                </aside>

                <section className="flex-1 bg-gray-50">
                  <div className="p-5 sm:p-6 flex flex-col h-full">
                    <div className="mb-3 flex flex-wrap items-center justify-start gap-3 pb-2 border-b border-gray-200 shrink-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SectionButton k="info" label="Personal Information" />
                        <SectionButton k="work" label="Work Details" />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto blue-scroll pt-3">
                      {renderSection()}
                    </div>

                    <div className="pt-4 flex justify-end shrink-0">
                      <button
                        type="button"
                        onClick={closeView}
                        className="inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      >
                        Done
                      </button>
                    </div>

                  </div>
                </section>
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
            <div
              className="absolute inset-0 bg-black/0.5 backdrop-blur-sm"
              onClick={() => setShowDocs(false)}
            />

            <div className="relative w-full max-w-6xl max-h-[86vh] rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="relative border-b border-gray-200 bg-gradient-to-r from-blue-50 via-white to-white">
                <div className="px-6 sm:px-8 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold tracking-[0.25em] uppercase text-gray-500">
                        Worker Application
                      </div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">Documents</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                        <ShieldCheck className="h-4 w-4" />
                        Admin View
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row max-h-[calc(86vh-76px)]">
                <aside className="md:w-[320px] lg:w-[360px] border-b md:border-b-0 md:border-r border-gray-200 bg-white">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden shadow-sm">
                        {viewRow?.profile_picture_url ? (
                          <img
                            src={viewRow.profile_picture_url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={({ currentTarget }) => {
                              currentTarget.style.display = "none";
                              const parent = currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">${initialsFrom(
                                  viewRow?.name_first,
                                  viewRow?.name_last
                                )}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">
                            {initialsFrom(viewRow?.name_first, viewRow?.name_last)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {[viewRow?.name_first, viewRow?.name_last].filter(Boolean).join(" ") || "-"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{viewRow?.email || "-"}</div>
                        <div className="mt-2 flex flex-wrap gap-2">{viewStatusPills(viewRow)}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3">
                      <QuickItem
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Created"
                        value={viewRow?.created_at_display || "-"}
                      />
                    </div>

                    <div className="mt-5">
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-500">
                            Application ID
                          </div>
                          <div className="mt-1 font-mono text-[13px] text-gray-900 break-all">
                            {viewRow?.id || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setShowDocs(false)}
                        className="w-full inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium bg-[#0b82ff] text-white border border-[#0b82ff] hover:bg-[#086bd4]"
                      >
                        Back to Details
                      </button>
                    </div>
                  </div>
                </aside>

                <section className="flex-1 bg-gray-50">
                  <div className="p-5 sm:p-6 flex flex-col h-full relative">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200 shrink-0">
                      <div className="text-sm font-semibold text-gray-900">Submitted Documents</div>
                    </div>

                    <div className="flex-1 overflow-y-auto blue-scroll pt-3">
                      {docsLoading ? (
                        <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl">
                          Loading documents…
                        </div>
                      ) : docsError ? (
                        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                          {docsError}
                        </div>
                      ) : docCards.some((x) => (x.links || []).length > 0) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {docCards.map((cfg) => {
                            const links = Array.isArray(cfg.links) ? cfg.links.filter(Boolean) : [];
                            const first = links[0] || "";
                            const img = first && isImageUrl(first);
                            return (
                              <div key={cfg.label} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="p-4">
                                  {img && first ? (
                                    <img src={first} alt={cfg.label} className="w-full h-44 object-contain" />
                                  ) : (
                                    <div className="h-44 grid place-items-center text-sm text-gray-500">
                                      {first ? "Preview not available" : "No document"}
                                    </div>
                                  )}
                                </div>
                                <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex-1 min-w-0 overflow-hidden">
    <div className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-800">
      <span className="h-2 w-2 rounded-full bg-gray-500/70 shrink-0" />
      <span className="truncate min-w-0">{cfg.label}</span>
    </div>

    {links.length > 1 && (
      <div className="text-[11px] text-gray-500 mt-0.5">
        {links.length} files
      </div>
    )}
  </div>

  {first ? (
    <a
      href={first}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 inline-flex items-center justify-center rounded-md border border-blue-300 px-4 h-9 text-sm font-medium text-blue-600 hover:bg-blue-50 whitespace-nowrap"
    >
      Open
    </a>
  ) : (
    <span className="text-sm text-gray-400 shrink-0 whitespace-nowrap">No link</span>
  )}
</div>

                                {links.length > 1 && (
                                  <div className="px-4 pb-4">
                                    <div className="flex flex-wrap gap-2">
                                      {links.slice(1).map((u, idx) => (
                                        <a
                                          key={`${cfg.label}-${idx}`}
                                          href={u}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 h-8 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                        >
                                          Open #{idx + 2}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-600">No documents.</div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-end shrink-0"></div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
