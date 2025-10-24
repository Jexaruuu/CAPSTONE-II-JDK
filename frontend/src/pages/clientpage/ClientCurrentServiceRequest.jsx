import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";
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

const peso = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (/₱|php/i.test(s)) return s;
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(n)) return `₱${n.toLocaleString()}`;
  return `₱${s}`;
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

const RateText = ({ rate }) => {
  const t = String(rate?.rate_type || "").toLowerCase();
  const from = rate?.rate_from;
  const to = rate?.rate_to;
  const val = rate?.rate_value;
  if (t === "fixed" || t === "by_job" || t === "by the job" || t === "by_the_job") return <span>{val ? `${peso(val)}` : "-"}</span>;
  if (t === "hourly" || t === "range") return <span>{from || to ? `${from ? peso(from) : ""}${from && to ? " - " : ""}${to ? peso(to) : ""}` : "-"}</span>;
  if (val) return <span>{peso(val)}</span>;
  if (from || to) return <span>{from ? peso(from) : ""}{from && to ? " - " : ""}{to ? peso(to) : ""}</span>;
  return <span>-</span>;
};

const iconForService = (serviceType) => {
  const s = String(serviceType || "").toLowerCase();
  if (s.includes("car wash")) return Car;
  if (s.includes("car washing")) return Car;
  if (s.includes("carpentry") || s.includes("carpenter")) return Hammer;
  if (s.includes("electric")) return Zap;
  if (s.includes("plumb")) return Wrench;
  if (s.includes("laundry")) return Shirt;
  return Hammer;
};

const formatRateType = (t) => {
  const s = String(t || "").replace(/_/g, " ").trim().toLowerCase();
  if (!s) return "-";
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const Card = ({ item, onEdit, onOpenMenu, onView }) => {
  const d = item.details || {};
  const r = item.rate || {};
  const Icon = iconForService(d.service_type || d.service_task);
  return (
    <div className="rounded-2xl border border-gray-300 bg-white p-5 md:p-6 shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to={`/clientreviewservicerequest?id=${encodeURIComponent(item.id)}`} className="block pointer-events-none select-text">
            <h3 className="text-xl md:text-2xl font-semibold truncate">
              <span className="text-gray-700">Service Type:</span>{" "}
              <span className="text-[#008cfc]">{d.service_type || "Service"}</span>
            </h3>
            <div className="mt-0.5 text-base md:text-lg truncate text-black">
              <span className="font-semibold">Service Task:</span> {d.service_task || "Task"}
            </div>
          </Link>
          <p className="mt-1 text-base text-gray-500">Created {timeAgo(item.created_at)} by You</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 md:gap-x-16 text-base text-gray-700">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-gray-700 font-semibold">Preferred Date:</span>
                <span className="font-medium text-[#008cfc]">{d.preferred_date ? formatDate(d.preferred_date) : "-"}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-gray-700 font-semibold">Preferred Time:</span>
                <span className="font-medium text-[#008cfc]">{d.preferred_time ? formatTime12(d.preferred_time) : "-"}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-gray-700 font-semibold">Urgency:</span>
                <span className="font-medium text-[#008cfc]">{d.is_urgent || "-"}</span>
              </div>
            </div>
            <div className="space-y-1.5 md:pl-10">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-gray-700 font-semibold">Rate Type:</span>
                <span className="font-medium text-[#008cfc]">{formatRateType(r.rate_type)}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-gray-700 font-semibold">Service Rate:</span>
                <span className="font-medium text-[#008cfc]"><RateText rate={r} /></span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 w-10 rounded-lg border border-gray-300 text-[#008cfc] flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="-mt-9 flex justify-end gap-2">
        <Link
          to={`/current-service-request/${encodeURIComponent(item.id)}`}
          onClick={(e) => { e.preventDefault(); onView(item.id); }}
          className="inline-flex items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          View
        </Link>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
        >
          Edit Request
        </button>
      </div>
    </div>
  );
};

export default function ClientCurrentServiceRequest() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isOpeningView, setIsOpeningView] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const PAGE_SIZE = 5;
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/client/service-requests?scope=current`, { withCredentials: true });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((r, i) => ({
            id: r.id ?? `${i}`,
            status: (r.status || "pending").toLowerCase(),
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.created_at || new Date().toISOString(),
            details: r.details || {},
            rate: r.rate || {}
          }));
          setItems(normalized.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const lock = isOpeningView;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    if (lock) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";
    }
    return () => {
      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";
    };
  }, [isOpeningView]);

  const onRefresh = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/client/service-requests?scope=current`, { withCredentials: true });
      const arr = Array.isArray(data) ? data : data?.items || [];
      const normalized = arr.map((r, i) => ({
        id: r.id ?? `${i}`,
        status: (r.status || "pending").toLowerCase(),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.created_at || new Date().toISOString(),
        details: r.details || {},
        rate: r.rate || {}
      }));
      setItems(normalized.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (statusFilter === "approved") list = list.filter((i) => (i.status || "").toLowerCase() === "approved");
    if (statusFilter === "declined") list = list.filter((i) => (i.status || "").toLowerCase() === "declined");
    if (!q) return list;
    return list.filter((i) => {
      const s1 = (i.details?.service_type || "").toLowerCase();
      const s2 = (i.details?.service_task || "").toLowerCase();
      return s1.includes(q) || s2.includes(q);
    });
  }, [items, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
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

  const onEdit = (item) => {
    navigate(`/clientreviewservicerequest?id=${encodeURIComponent(item.id)}`);
  };

  const onOpenMenu = () => {};

  const onView = (id) => {
    setIsOpeningView(true);
    setTimeout(() => {
      navigate(`/current-service-request/${encodeURIComponent(id)}`);
    }, 700);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <ClientNavigation />

      <div className="flex-1 flex flex-col">
        <header className="mx-auto w-full max-w-[1525px] px-6 pt-6 md:pt-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Service Requests Status
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
                  onClick={() => setStatusFilter((v) => (v === "approved" ? "all" : "approved"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "approved" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Approved Requests
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "declined" ? "all" : "declined"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "declined" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Declined Requests
                </button>
              </div>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2 sm:ml-auto">
              <div className="mt-6 flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white">
                <span className="text-gray-500 text-lg">🔍︎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search service requests"
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
              No service requests found.
            </div>
          ) : (
            paginated.map((item) => (
              <Card
                key={item.id}
                item={item}
                onEdit={onEdit}
                onOpenMenu={onOpenMenu}
                onView={onView}
              />
            ))
          )}

          {!loading && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? "request" : "requests"}
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

      <ClientFooter />

      {isOpeningView && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opening request"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
              <div className="text-lg font-semibold text-gray-900">Opening Request</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
