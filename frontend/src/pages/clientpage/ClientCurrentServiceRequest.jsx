import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";
import { Hammer, Zap, Wrench, Car, Shirt, Trash2 } from "lucide-react";

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
    if (isNaN(d)) return "";
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const y = d.getFullYear();
    return `${m}/${day}/${y}`;
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

const toBoolStrict = (v) => {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "t"].includes(s)) return true;
  if (["no", "n", "false", "f"].includes(s)) return false;
  return false;
};

const dateOnlyFrom = (val) => {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split("T")[0].split(" ")[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token))) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const isExpired = (val) => {
  const d = dateOnlyFrom(val);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

const parseHM24 = (val) => {
  if (!val) return { h: 23, m: 59 };
  const s = String(val).trim();
  let d = new Date(`1970-01-01T${s}`);
  if (isNaN(d)) d = new Date(`1970-01-01 ${s}`);
  if (!isNaN(d)) return { h: d.getHours(), m: d.getMinutes() };
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(s);
  if (!m) return { h: 23, m: 59 };
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (!ap && h > 23) h = 23;
  if (min > 59) min = 59;
  return { h, m: min };
};
const isExpiredDT = (dateVal, timeVal) => {
  const d = dateOnlyFrom(dateVal);
  if (!d) return false;
  const { h, m } = parseHM24(timeVal);
  d.setHours(h, m, 0, 0);
  const now = new Date();
  return d.getTime() < now.getTime();
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

const avatarFromName = (name) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "Client")}`;

const StatusBadge = ({ status, expired }) => {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled" || s === "canceled")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
        Canceled Request
      </span>
    );
  if (s === "declined")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border-red-200">
        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
        Declined Request
      </span>
    );
  if (s === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
        Approved Request
      </span>
    );
  if (s === "pending" && !expired)
    return (
      <span className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
        <span className="relative inline-flex">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-current opacity-30 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
        </span>
        Pending Request
      </span>
    );
  if (expired && s !== "cancelled" && s !== "declined")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-700 border-gray-200">
        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
        Expired Request
      </span>
    );
  return null;
};

const Card = ({ item, onEdit, onOpenMenu, onView, onReason, onDelete }) => {
  const d = item.details || {};
  const rate = item.rate || {};
  const Icon = iconForService(d.service_type || d.service_task);
  const hasUrgency = d.is_urgent !== undefined && d.is_urgent !== null && String(d.is_urgent).trim() !== "";
  const urgentBool = toBoolStrict(d.is_urgent);
  const statusLower = String(item.status || "").toLowerCase();
  const userCancelled = !!item.user_cancelled;
  const isCancelled = statusLower === "cancelled" || userCancelled;
  const isPending = statusLower === "pending";
  const isApproved = statusLower === "approved";
  const isDeclined = statusLower === "declined";
  const isExpiredReq = isExpiredDT(d.preferred_date, d.preferred_time);
  const profileUrl = React.useMemo(() => {
    const u = item?.info?.profile_picture_url || "";
    if (u) return u;
    const name = item?.info?.first_name || "Client";
    return avatarFromName(name);
  }, [item]);
  const createdAgo = item.created_at ? timeAgo(item.created_at) : "";

  return (
    <div className="relative overflow-hidden bg-white border border-gray-300 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
      <div className="absolute inset-0 bg-[url('/Bluelogo.png')] bg-no-repeat bg-[length:400px] bg-[position:right_50%] opacity-10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0">
              <img
                src={profileUrl}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-blue-300"
                onError={(e) => { e.currentTarget.src = avatarFromName(item?.info?.first_name || "Client"); }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xl md:text-2xl font-semibold truncate">
                <span className="text-gray-700">Service Type:</span>{" "}
                <span className="text-gray-900">{d.service_type || "Service"}</span>
              </div>
              <div className="mt-1 text-base md:text-lg truncate">
                <span className="font-semibold text-gray-700">Service Task:</span>{" "}
                <span className="text-[#008cfc] font-semibold">{d.service_task || "Task"}</span>
              </div>
              <div className="mt-1 text-base text-gray-500">
                {createdAgo ? `Created ${createdAgo}` : ""}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 md:gap-x-16 text-base text-gray-700">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-gray-700 font-semibold">Preferred Date:</span>
                    <span className="text-[#008cfc] font-semibold">{d.preferred_date ? formatDate(d.preferred_date) : "-"}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-gray-700 font-semibold">Preferred Time:</span>
                    <span className="text-[#008cfc] font-semibold">{d.preferred_time ? formatTime12(d.preferred_time) : "-"}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-gray-700 font-semibold">Urgency:</span>
                    <span className="text-[#008cfc] font-semibold">
                      {hasUrgency ? (urgentBool ? "Yes" : "No") : "-"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 md:pl-10">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-gray-700 font-semibold">Rate Type:</span>
                    <span className="text-[#008cfc] font-semibold">{formatRateType(rate.rate_type)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-gray-700 font-semibold">Service Rate:</span>
                    <span className="text-[#008cfc] font-semibold"><RateText rate={rate} /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="h-10 w-10 rounded-lg border flex items-center justify-center border-gray-300 text-[#008cfc]">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="-mt-9 flex justify-end gap-2">
          {(isDeclined || isCancelled) ? (
            <Link
              to={`/current-service-request/${encodeURIComponent(item.id)}`}
              onClick={(e) => { e.preventDefault(); onReason(item); }}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              View Reason
            </Link>
          ) : (
            <Link
              to={`/current-service-request/${encodeURIComponent(item.id)}`}
              onClick={(e) => { e.preventDefault(); onView(item.id); }}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              View
            </Link>
          )}
          {isApproved && !isCancelled && !isDeclined && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="h-10 px-4 rounded-md transition bg-[#008cfc] text-white hover:bg-blue-700"
            >
              Edit Request
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="h-10 w-10 rounded-md border border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center"
            aria-label="Delete Request"
            title="Delete Request"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
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
  const [showReason, setShowReason] = useState(false);
  const [reasonTarget, setReasonTarget] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteBusy, setShowDeleteBusy] = useState(false);
  const [showDeleteDone, setShowDeleteDone] = useState(false);
  const PAGE_SIZE = 5;
  const navigate = useNavigate();

  useEffect(() => {
    if (showReason || showDelete || showDeleteConfirm || showDeleteBusy || showDeleteDone) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showReason, showDelete, showDeleteConfirm, showDeleteBusy, showDeleteDone]);

  const getHiddenSet = () => {
    try {
      const ids = JSON.parse(localStorage.getItem("clientPostHiddenIds") || "[]");
      return new Set((ids || []).map(String));
    } catch {
      return new Set();
    }
  };

  const markUserCancelled = (arr) => {
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem("clientPostHiddenIds") || "[]");
    } catch {}
    const setIds = new Set((ids || []).map(String));
    return arr.map((r) => {
      const idStr = String(r.id);
      if (setIds.has(idStr)) return { ...r, status: "cancelled", user_cancelled: true };
      return r;
    });
  };

  const excludeHidden = (arr) => {
    const hidden = getHiddenSet();
    return (arr || []).filter(r => !hidden.has(String(r.id)));
  };

  const enrichProfiles = async (arr) => {
    const out = Array.isArray(arr) ? arr.slice() : [];
    for (let i = 0; i < out.length; i++) {
      const it = out[i] || {};
      const has = it?.info?.profile_picture_url;
      if (has) continue;
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(it.id)}`, { withCredentials: true });
        const info = data?.info || {};
        out[i] = {
          ...it,
          info: {
            ...it.info,
            profile_picture_url: info.profile_picture_url || it.info?.profile_picture_url || null,
            first_name: it.info?.first_name || info.first_name || null,
            last_name: it.info?.last_name || info.last_name || null
          }
        };
      } catch {}
    }
    return out;
  };

  const getCancelledIds = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/clientservicerequests`, {
        params: { scope: "cancelled", email: getClientEmail() },
        withCredentials: true,
      });
        const arr = Array.isArray(data?.items) ? data.items : [];
        const ids = arr.map(r => r.details?.request_group_id || r.info?.request_group_id || r.rate?.request_group_id || r.id).filter(Boolean);
        return new Set(ids.map(String));
    } catch {
      return new Set();
    }
  };

  const applyCancelledOverride = (arr, cancelledSet) => {
    return arr.map(r => cancelledSet.has(String(r.id)) ? { ...r, status: "cancelled" } : r);
  };

  const getClientEmail = () => {
    try {
      const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
      if (a?.email_address) return String(a.email_address).trim();
      if (a?.email) return String(a.email).trim();
    } catch {}
    try {
      const p = JSON.parse(localStorage.getItem("clientProfile") || localStorage.getItem("client_profile") || "{}");
      if (p?.email_address) return String(p.email_address).trim();
      if (p?.email) return String(p.email).trim();
    } catch {}
    try {
      const i = JSON.parse(localStorage.getItem("clientInformation") || "{}");
      if (i?.email_address) return String(i.email_address).trim();
      if (i?.email) return String(i.email).trim();
    } catch {}
    return "";
  };

  const fetchByStatus = async (statusKey) => {
    setLoading(true);
    try {
      const email = getClientEmail();
      if (statusKey === "cancelled") {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests`, {
          params: { scope: "cancelled", email },
          withCredentials: true,
        });
        const arr = Array.isArray(data?.items) ? data.items : [];
        const normalized = arr.map((r, i) => {
          const gid = r.request_group_id || r.details?.request_group_id || r.info?.request_group_id || r.rate?.request_group_id || r.id || `${i}`;
          return {
            id: gid,
            status: "cancelled",
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.canceled_at || r.cancelled_at || r.decided_at || r.created_at || new Date().toISOString(),
            details: r.details || {},
            rate: r.rate || {},
            info: r.info || {},
            decision_reason: r.decision_reason || null,
            reason_choice: r.reason_choice || null,
            reason_other: r.reason_other || null,
            decided_at: r.decided_at || null,
            canceled_at: r.canceled_at || r.cancelled_at || null
          };
        });
        const withAvatars = await enrichProfiles(normalized);
        const hiddenExcluded = excludeHidden(markUserCancelled(withAvatars));
        setItems(hiddenExcluded.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      } else {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests`, {
          params: { scope: "current", email },
          withCredentials: true,
        });
        const arr = Array.isArray(data?.items) ? data.items : [];
        const normalized = arr.map((r, i) => {
          const gid = r.id || r.request_group_id || r.details?.request_group_id || r.info?.request_group_id || r.rate?.request_group_id || `${i}`;
          return {
            id: gid,
            status: String(r.status || "pending").toLowerCase(),
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.decided_at || r.created_at || new Date().toISOString(),
            details: r.details || {},
            rate: r.rate || {},
            info: r.info || {},
            decision_reason: r.decision_reason || null,
            reason_choice: r.reason_choice || null,
            reason_other: r.reason_other || null,
            decided_at: r.decided_at || null
          };
        });
        const cancelledIds = await getCancelledIds();
        const overridden = applyCancelledOverride(normalized, cancelledIds);
        const withAvatars = await enrichProfiles(overridden);
        const hiddenExcluded = excludeHidden(markUserCancelled(withAvatars));
        setItems(hiddenExcluded.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      }
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
    if (statusFilter === "pending") list = list.filter((i) => (i.status || "").toLowerCase() === "pending" && !i.user_cancelled && !isExpiredDT(i?.details?.preferred_date, i?.details?.preferred_time));
    if (statusFilter === "approved") list = list.filter((i) => (i.status || "").toLowerCase() === "approved" && !i.user_cancelled);
    if (statusFilter === "declined") list = list.filter((i) => (i.status || "").toLowerCase() === "declined" && !i.user_cancelled);
    if (statusFilter === "cancelled") list = list.filter((i) => ((i.status || "").toLowerCase() === "cancelled") || i.user_cancelled);
    if (statusFilter === "expired") list = list.filter((i) => isExpiredDT(i?.details?.preferred_date, i?.details?.preferred_time));
    if (!q) return list;
    return list.filter((i) => {
      const s1 = (i.details?.service_type || "").toLowerCase();
      const s2 = (i.details?.service_task || "").toLowerCase();
      return s1.includes(q) || s2.includes(q);
    });
  }, [items, query, statusFilter]);

  const PAGE_SIZE_LOCAL = 5;
  const PAGE_SIZE_USE = PAGE_SIZE || PAGE_SIZE_LOCAL;

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

  const onEdit = (item) => {
    const navId = item.id;
    if (navId !== undefined && navId !== null) {
      navigate(`/clientreviewservicerequest?id=${encodeURIComponent(navId)}`);
    }
  };

  const onOpenMenu = () => {};

  const onView = async (id) => {
    setIsOpeningView(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(id)}`, {
        withCredentials: true,
      });
      try {
        sessionStorage.setItem("csr_view_payload", JSON.stringify(data));
      } catch {}
      navigate(`/current-service-request/${encodeURIComponent(id)}`);
    } catch {
      setIsOpeningView(false);
    }
  };

  const getReasonText = (row) => {
    const rc =
      row?.reason_choice ||
      row?.details?.reason_choice ||
      row?.details?.decline_reason_choice ||
      row?.details?.cancel_reason_choice ||
      row?.details?.cancellation_reason_choice ||
      row?.cancel_reason_choice ||
      row?.cancellation_reason_choice;
    const ro =
      row?.reason_other ||
      row?.details?.reason_other ||
      row?.details?.decline_reason_other ||
      row?.details?.cancel_reason_other ||
      row?.details?.cancellation_reason_other ||
      row?.cancel_reason_other ||
      row?.cancellation_reason_other;
    const parts = [];
    if (rc) parts.push(rc);
    if (ro) parts.push(ro);
    const fallback =
      row?.decision_reason ||
      row?.details?.decline_reason ||
      row?.details?.cancel_reason ||
      row?.details?.cancellation_reason ||
      row?.reason ||
      row?.reason_text ||
      row?.cancel_reason_text ||
      row?.cancellation_reason_text;
    if (!parts.length && fallback) parts.push(fallback);
    return parts.join(" — ") || "No reason provided.";
  };

  const onReason = async (item) => {
    const isCancel = (String(item?.status || "").toLowerCase() === "cancelled") || !!item?.user_cancelled;
    let row = item;
    if (isCancel && !item?.canceled_at) {
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests`, {
          params: { scope: "cancelled", groupId: item.id, email: getClientEmail() },
          withCredentials: true,
        });
        const arr = Array.isArray(data?.items) ? data.items : [];
        const match = arr.find((r) => {
          const gid = r.request_group_id || r.id || r.details?.request_group_id || r.info?.request_group_id || r.rate?.request_group_id;
          return String(gid) === String(item.id);
        });
        if (match) {
          row = {
            ...item,
            canceled_at: match.canceled_at || match.cancelled_at || null,
            reason_choice: item.reason_choice || match.reason_choice || null,
            reason_other: item.reason_other || match.reason_other || null,
            decision_reason: item.decision_reason || match.decision_reason || null
          };
        }
      } catch {}
    }
    setReasonTarget(row);
    setShowReason(true);
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const pushHiddenId = (id) => {
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem("clientPostHiddenIds") || "[]");
    } catch {}
    const setIds = new Set((ids || []).map(String));
    if (!setIds.has(String(id))) {
      const out = [...setIds, String(id)];
      localStorage.setItem("clientPostHiddenIds", JSON.stringify(out));
    }
  };

  const removeFromList = (id) => {
    setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget.id;
    try {
      await axios.delete(`${API_BASE}/api/clientservicerequests/${encodeURIComponent(id)}`, { withCredentials: true });
    } catch {}
    pushHiddenId(id);
    removeFromList(id);
    try { window.dispatchEvent(new CustomEvent('client-request-deleted', { detail: { id: String(id) } })); } catch {}
    setShowDelete(false);
    setDeleteTarget(null);
    setDeleting(false);
  };

  const confirmDeleteNow = async () => {
    if (!deleteTarget?.id) return;
    setShowDeleteConfirm(false);
    setShowDeleteBusy(true);
    setDeleting(true);
    const id = deleteTarget.id;
    try {
      await axios.delete(`${API_BASE}/api/clientservicerequests/${encodeURIComponent(id)}`, { withCredentials: true });
      pushHiddenId(id);
      removeFromList(id);
      setShowDeleteBusy(false);
      setShowDeleteDone(true);
      setDeleteTarget(null);
    } catch {
      pushHiddenId(id);
      removeFromList(id);
      setShowDeleteBusy(false);
      setShowDeleteDone(true);
      setDeleteTarget(null);
    } finally {
      try { window.dispatchEvent(new CustomEvent('client-request-deleted', { detail: { id: String(id) } })); } catch {}
      setDeleting(false);
    }
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
                  onClick={() => setStatusFilter((v) => (v === "pending" ? "all" : "pending"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "pending" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Pending Requests
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
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "cancelled" ? "all" : "cancelled"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "cancelled" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Canceled Requests
                </button>
               <button
  type="button"
  onClick={() => setStatusFilter((v) => (v === "expired" ? "all" : "expired"))}
  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${
    statusFilter === "expired"
      ? "border-[#008cfc] bg-[#008cfc] text-white"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  }`}
>
  Expired Requests
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
            paginated.map((item) => {
              const expired = isExpiredDT(item?.details?.preferred_date, item?.details?.preferred_time);
              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-end gap-2 pr-1">
                    <span className="text-gray-700 font-semibold">Status:</span>
                    <StatusBadge status={item.status} expired={expired} />
                  </div>
                  <Card
                    item={item}
                    onEdit={onEdit}
                    onOpenMenu={onOpenMenu}
                    onView={onView}
                    onReason={onReason}
                    onDelete={openDelete}
                  />
                </div>
              );
            })
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

      {showReason && (
        <>
          {(() => {
            const isCancel = (String(reasonTarget?.status || "").toLowerCase() === "cancelled") || !!reasonTarget?.user_cancelled;
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
            const title = isCancel ? "Cancellation Reason" : "Decline Reason";
            const createdStr = reasonTarget?.created_at ? new Date(reasonTarget.created_at).toLocaleString() : "-";
            const canceledStr = (reasonTarget?.canceled_at || reasonTarget?.decided_at) ? new Date(reasonTarget.canceled_at || reasonTarget.decided_at).toLocaleString() : "-";
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
              >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReason(false)} />
                <div className={`relative w-full max-w-[720px] max-h-[80vh] rounded-2xl border ${borderCol} bg-white shadow-2xl overflow-auto`}>
                  <div className={`px-6 py-4 bg-gradient-to-r ${headGrad} to-white ${isCancel ? "border-b border-orange-200" : "border-b border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${titleCol}`}>{title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${badgeBg} ${badgeText} ${badgeBorder}`}>
                        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                        {(reasonTarget?.details?.service_type || "Request")}
                      </span>
                    </div>
                    {isCancel ? (
                      <div className="mt-1 text-sm text-gray-600 flex items-center justify-between">
                        <span>Created {createdStr}</span>
                        <span>Canceled {canceledStr}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-600">
                        Created {createdStr}
                      </div>
                    )}
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
                        <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Service Task</div>
                        <div className="mt-1 text-[15px] font-semibold text-gray-900">
                          {reasonTarget?.details?.service_task || "-"}
                        </div>
                        <div className="text-sm text-gray-600">{reasonTarget?.details?.service_type || "-"}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Preferred Schedule</div>
                        <div className="mt-1 text-[15px] font-semibold text-gray-900">
                          {reasonTarget?.details?.preferred_date ? formatDate(reasonTarget.details.preferred_date) : "-"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {reasonTarget?.details?.preferred_time ? formatTime12(reasonTarget.details.preferred_time) : "-"}
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

      {showDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete service request"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative w-full max-w-[460px] rounded-2xl border border-red-300 bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-700">Delete Service Request</h3>
              <div className="mt-1 text-sm text-gray-600">This action cannot be undone.</div>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
                <div className="text-[11px] font-semibold tracking-widest text-red-700 uppercase">You are deleting</div>
                <div className="mt-2 text-[15px] font-semibold text-gray-900">
                  {(deleteTarget?.details?.service_type || "Request")} — {(deleteTarget?.details?.service_task || "-")}
                </div>
                <div className="text-sm text-gray-600">
                  ID: {deleteTarget?.id}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-3 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDelete(false)}
                  className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="h-10 px-4 rounded-md border border-red-300 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Are you sure do you get to delete this request?</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmDeleteNow}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteBusy && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-32 h-32">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '8px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-4 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="Logo" className="w-14 h-14 object-contain" onError={() => setLogoBroken(true)} />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-base font-semibold text-gray-900">Deleting Request</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait</div>
            </div>
          </div>
        </div>
      )}

      {showDeleteDone && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteDone(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Request Successfully Deleted</div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteDone(false)}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
