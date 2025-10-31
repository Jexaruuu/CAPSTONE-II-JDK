import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";
import { Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const timeAgo = (iso) => {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    const opts = { month: "short", day: "numeric", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
};

const formatTime12 = (t) => {
  try {
    const raw = String(t || "").trim();
    if (!raw) return "-";
    if (/[ap]\s*\.?\s*m\.?/i.test(raw)) {
      const up = raw.toUpperCase().replace(/\./g, "");
      return up.includes("AM") || up.includes("PM") ? up.replace(/\s*(AM|PM)$/, " $1") : up;
    }
    const timePart = raw.split(" ")[0];
    const [hh, mm = "00"] = timePart.split(":");
    let h = parseInt(hh, 10);
    if (isNaN(h)) return raw;
    const m = String(parseInt(mm, 10)).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return String(t || "-");
  }
};

const peso = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (/₱|php/i.test(s)) return s;
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(n)) return `₱${n.toLocaleString()}`;
  return `₱${s}`;
};

const formatRateType = (t) => {
  const s = String(t || "").replace(/_/g, " ").trim().toLowerCase();
  if (!s) return "-";
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const RateText = ({ rate }) => {
  const t = String(rate?.rate_type || "").toLowerCase();
  const from = rate?.rate_from;
  const to = rate?.rate_to;
  const val = rate?.rate_value;
  if (t.includes("fixed") || t.includes("by job") || t.includes("by_the_job")) return <span>{val ? `${peso(val)}` : "-"}</span>;
  if (t.includes("hour") || t.includes("range")) return <span>{from || to ? `${from ? peso(from) : ""}${from && to ? " - " : ""}${to ? peso(to) : ""}` : "-"}</span>;
  if (val) return <span>{peso(val)}</span>;
  if (from || to) return <span>{from ? peso(from) : ""}{from && to ? " - " : ""}{to ? peso(to) : ""}</span>;
  return <span>-</span>;
};

const iconForService = (serviceType) => {
  const s = String(serviceType || "").toLowerCase();
  if (s.includes("car wash") || s.includes("car washing")) return Car;
  if (s.includes("carpentry") || s.includes("carpenter")) return Hammer;
  if (s.includes("electric")) return Zap;
  if (s.includes("plumb")) return Wrench;
  if (s.includes("laundry")) return Shirt;
  return Hammer;
};

const getWorkerEmail = () => {
  try {
    const raw = localStorage.getItem("workerAuth") || "";
    if (!raw) return "";
    const j = JSON.parse(raw);
    return j?.email_address || j?.email || j?.user?.email || "";
  } catch {
    return "";
  }
};

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "Worker")}`;

const Card = ({ item, onView, onReason }) => {
  const info = item.info || {};
  const work = item.work || {};
  const rate = item.rate || {};
  const Icon = iconForService(work?.service_types?.[0] || work?.work_description);
  const statusLower = String(item.status || "").toLowerCase();
  const isPending = statusLower === "pending";
  const isApproved = statusLower === "approved";
  const isDeclined = statusLower === "declined";
  const isCancelled = statusLower === "cancelled" || statusLower === "canceled";
  const cardBase = "rounded-2xl border p-5 md:p-6 shadow-sm transition-all duration-300";
  const cardState = isDeclined
    ? "border-gray-300 bg-white hover:border-red-500 hover:ring-2 hover:ring-red-500 hover:shadow-xl"
    : isApproved
    ? "border-gray-300 bg-white hover:border-emerald-600 hover:ring-2 hover:ring-emerald-600 hover:shadow-xl"
    : isCancelled
    ? "border-gray-200 bg-gray-50"
    : "border-gray-300 bg-white hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl";
  const profileUrl = info?.profile_picture_url || avatarFromName(info?.first_name || "Worker");
  const title = work?.work_description || "Worker Application";
  return (
    <div className={`${cardBase} ${cardState}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="shrink-0">
            <img
              src={profileUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border border-blue-300"
              onError={(e) => { e.currentTarget.src = avatarFromName(info?.first_name || "Worker"); }}
            />
          </div>
          <div className="min-w-0">
            <h3 className={`text-xl md:text-2xl font-semibold truncate ${isCancelled ? "text-gray-700" : ""}`}>
              <span className="text-gray-700">Application:</span>{" "}
              <span className={isCancelled ? "text-gray-500" : "text-[#008cfc]"}>{title}</span>
            </h3>
            <div className={`mt-0.5 text-base md:text-lg truncate ${isCancelled ? "text-gray-600" : "text-black"}`}>
              <span className="font-semibold">Primary Service:</span>{" "}
              {Array.isArray(work?.service_types) && work.service_types.length ? work.service_types[0] : "-"}
            </div>
            <p className="mt-1 text-base text-gray-500">Created {timeAgo(item.created_at)} by You</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 md:gap-x-16 text-base text-gray-700">
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-gray-700 font-semibold">Preferred Date:</span>
                  <span className={isCancelled ? "text-gray-500 font-medium" : "text-[#008cfc] font-medium"}>
                    {work?.preferred_date ? formatDate(work.preferred_date) : "-"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-gray-700 font-semibold">Tools Provided:</span>
                  <span className={isCancelled ? "text-gray-500 font-medium" : "text-[#008cfc] font-medium"}>
                    {work?.tools_provided || "-"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-gray-700 font-semibold">Experience:</span>
                  <span className={isCancelled ? "text-gray-500 font-medium" : "text-[#008cfc] font-medium"}>
                    {work?.years_experience !== undefined && work?.years_experience !== null ? `${work.years_experience} yr${Number(work.years_experience) === 1 ? "" : "s"}` : "-"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 md:pl-10">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-gray-700 font-semibold">Rate Type:</span>
                  <span className={isCancelled ? "text-gray-500 font-medium" : "text-[#008cfc] font-medium"}>{formatRateType(rate?.rate_type)}</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-gray-700 font-semibold">Rate:</span>
                  <span className={isCancelled ? "text-gray-500 font-medium" : "text-[#008cfc] font-medium"}><RateText rate={rate} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCancelled && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Canceled
            </span>
          )}
          {!isCancelled && isDeclined && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border-red-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Declined
            </span>
          )}
          {!isCancelled && !isDeclined && isApproved && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Approved
            </span>
          )}
          {!isCancelled && !isDeclined && isPending && (
            <span className="relative inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
              <span className="relative inline-flex">
                <span className="absolute inline-flex h-3 w-3 rounded-full bg-current opacity-30 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
              </span>
              Pending
            </span>
          )}
          <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${isCancelled || isDeclined ? "border-gray-300 text-gray-500" : "border-gray-300 text-[#008cfc]"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="-mt-9 flex justify-end gap-2">
        {isDeclined || isCancelled ? (
          <Link
            to={`/workerpostapplication?id=${encodeURIComponent(item.id)}`}
            onClick={(e) => { e.preventDefault(); onReason(item); }}
            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${isCancelled ? "border-orange-300 text-orange-600 hover:bg-orange-50" : "border-red-300 text-red-600 hover:bg-red-50"}`}
          >
            View Reason
          </Link>
        ) : (
          <Link
            to={`/workerpostapplication?id=${encodeURIComponent(item.id)}`}
            onClick={(e) => { e.preventDefault(); onView(item); }}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
};

export default function WorkerCurrentApplication() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showReason, setShowReason] = useState(false);
  const [reasonTarget, setReasonTarget] = useState(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const PAGE_SIZE = 5;
  const navigate = useNavigate();

  const fetchByStatus = async (statusKey) => {
    setLoading(true);
    try {
      const email = getWorkerEmail();
      const statusParam = statusKey === "all" ? "all" : statusKey;
      const { data } = await axios.get(`${API_BASE}/api/admin/workerapplications`, {
        params: { status: statusParam, q: email || undefined },
        withCredentials: true,
      });
      const arr = Array.isArray(data?.items) ? data.items : [];
      const normalized = arr.map((r, i) => ({
        id: r.request_group_id ?? r.id ?? `${i}`,
        status: String(r.status || "pending").toLowerCase(),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.decided_at || r.created_at || new Date().toISOString(),
        info: r.info || {},
        work: r.work || {},
        rate: r.rate || {},
        decision_reason: r.decision_reason || null,
        reason_choice: r.reason_choice || null,
        reason_other: r.reason_other || null,
        decided_at: r.decided_at || null,
        email_address: r.email_address || email || null,
      }));
      setItems(normalized.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchByStatus(statusFilter);
  }, [statusFilter]);

  const onRefresh = async () => {
    fetchByStatus(statusFilter);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (statusFilter === "pending") list = list.filter((i) => (i.status || "").toLowerCase() === "pending");
    if (statusFilter === "approved") list = list.filter((i) => (i.status || "").toLowerCase() === "approved");
    if (statusFilter === "declined") list = list.filter((i) => (i.status || "").toLowerCase() === "declined");
    if (statusFilter === "cancelled") list = list.filter((i) => (i.status || "").toLowerCase() === "cancelled" || (i.status || "").toLowerCase() === "canceled");
    if (!q) return list;
    return list.filter((i) => {
      const s1 = (i.work?.work_description || "").toLowerCase();
      const s2 = (Array.isArray(i.work?.service_types) ? i.work.service_types.join(" ") : "").toLowerCase();
      return s1.includes(q) || s2.includes(q);
    });
  }, [items, query, statusFilter]);

  const PAGE_SIZE_USE = PAGE_SIZE || 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_USE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE_USE;
    return filtered.slice(start, start + PAGE_SIZE_USE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pages = useMemo(() => {
    const t = totalPages;
    const p = page;
    const out = [];
    if (t <= 7) {
      for (let i = 1; i <= t; i++) out.push(i);
    } else {
      out.push(1);
      if (p > 4) out.push("…");
      const start = Math.max(2, p - 1);
      const end = Math.min(t - 1, p + 1);
      for (let i = start; i <= end; i++) out.push(i);
      if (p < t - 3) out.push("…");
      out.push(t);
    }
    return out;
  }, [totalPages, page]);

  const onView = async (item) => {
    try {
      sessionStorage.setItem("wa_view_payload", JSON.stringify(item));
    } catch {}
    navigate(`/workerpostapplication?id=${encodeURIComponent(item.id)}`);
  };

  const getReasonText = (row) => {
    const rc = row?.reason_choice;
    const ro = row?.reason_other;
    const parts = [];
    if (rc) parts.push(rc);
    if (ro) parts.push(ro);
    const fb = row?.decision_reason;
    if (!parts.length && fb) parts.push(fb);
    return parts.join(" — ") || "No reason provided.";
  };

  const onReason = (item) => {
    setReasonTarget(item);
    setShowReason(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <WorkerNavigation />

      <div className="flex-1 flex flex-col">
        <header className="mx-auto w-full max-w-[1525px] px-6 pt-6 md:pt-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Current Applications
          </h1>
        </header>

        <div className="mx-auto w-full max-w-[1525px] px-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">Filter</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "all" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "pending" ? "all" : "pending"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "pending" ? "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "approved" ? "all" : "approved"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "approved" ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "declined" ? "all" : "declined"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "declined" ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Declined
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "cancelled" ? "all" : "cancelled"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "cancelled" ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Canceled
                </button>
              </div>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2 sm:ml-auto">
              <div className="mt-6 flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white">
                <span className="text-gray-500 text-lg">🔍︎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search applications"
                  className="border-none outline-none text-black w-full sm:w-64 md:w-80 h-full placeholder:text-gray-400 bg-transparent"
                />
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="mt-6 inline-flex items-center gap-2 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#008cfc] hover:bg-blue-50 disabled:opacity-50"
                title="Refresh"
                aria-label="Refresh"
              >
                ⟳ Refresh
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1525px] px-6 mt-6 space-y-4 pb-10">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
              <div className="h-5 w-64 bg-gray-200 rounded" />
              <div className="mt-3 h-3 w-40 bg-gray-200 rounded" />
              <div className="mt-5 h-3 w-52 bg-gray-200 rounded" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
              No applications found.
            </div>
          ) : (
            paginated.map((item) => (
              <Card
                key={item.id}
                item={item}
                onView={onView}
                onReason={onReason}
              />
            ))
          )}

          {!loading && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? "application" : "applications"}
              </div>

              <nav className="flex items-center gap-2">
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {pages.map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={`${p}-${idx}`}
                      onClick={() => setPage(p)}
                      className={`h-9 min-w-9 px-3 rounded-md border text-sm ${
                        p === page
                          ? "border-[#008cfc] bg-[#008cfc] text-white"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={`dots-${idx}`} className="px-1 text-gray-500 select-none">…</span>
                  )
                )}
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </nav>
            </div>
          )}
        </main>
      </div>

      <WorkerFooter />

      {showReason && (
        <>
          {(() => {
            const isCancel = String(reasonTarget?.status || "").toLowerCase() === "cancelled" || String(reasonTarget?.status || "").toLowerCase() === "canceled";
            const headGrad = isCancel ? "from-orange-50" : "from-red-50";
            const borderCol = isCancel ? "border-orange-300" : "border-red-300";
            const titleCol = isCancel ? "text-orange-700" : "text-red-700";
            const badgeBg = isCancel ? "bg-orange-50" : "bg-red-50";
            const badgeText = isCancel ? "text-orange-700" : "text-red-700";
            const badgeBorder = isCancel ? "border-orange-200" : "border-red-200";
            const panelBorder = isCancel ? "border-orange-200" : "border-red-200";
            const panelBg = isCancel ? "bg-orange-50/60" : "bg-red-50/60";
            const closeBorder = isCancel ? "border-orange-300" : "border-red-300";
            const closeText = isCancel ? "text-orange-600" : "text-red-600";
            const closeHover = isCancel ? "hover:bg-orange-50" : "hover:bg-red-50";
            const title = isCancel ? "Cancel Reason" : "Decline Reason";
            const work = reasonTarget?.work || {};
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
              >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReason(false)} />
                <div className={`relative w-full max-w-[720px] rounded-2xl border ${borderCol} bg-white shadow-2xl overflow-hidden`}>
                  <div className={`px-6 py-4 bg-gradient-to-r ${headGrad} to-white border-b ${isCancel ? "border-orange-200" : "border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${titleCol}`}>{title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeBg} ${badgeText} ${badgeBorder}`}>
                        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                        {(Array.isArray(work?.service_types) && work.service_types[0]) || "Application"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Created {reasonTarget?.created_at ? `${formatDate(reasonTarget.created_at)}` : "-"}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className={`rounded-xl border ${panelBorder} ${panelBg} p-4`}>
                      <div className={`text-[11px] font-semibold tracking-widest ${isCancel ? "text-orange-700" : "text-red-700"} uppercase`}>Reason</div>
                      <div className="mt-2 text-[15px] font-semibold text-gray-900 whitespace-pre-line">
                        {getReasonText(reasonTarget)}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Work Description</div>
                        <div className="mt-1 text-[15px] font-semibold text-gray-900">
                          {work?.work_description || "-"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {(Array.isArray(work?.service_types) && work.service_types[0]) || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Preferred Schedule</div>
                        <div className="mt-1 text-[15px] font-semibold text-gray-900">
                          {work?.preferred_date ? formatDate(work.preferred_date) : "-"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {work?.preferred_time ? formatTime12(work.preferred_time) : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4 border-t border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => { setShowReason(false); }}
                      className={`w-full inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${closeBorder} ${closeText} ${closeHover}`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {false && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opening application"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{ borderWidth: "10px", borderStyle: "solid", borderColor: "#008cfc22", borderTopColor: "#008cfc", borderRadius: "9999px" }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center space-y-1">
              <div className="text-lg font-semibold text-gray-900">Opening Application</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
