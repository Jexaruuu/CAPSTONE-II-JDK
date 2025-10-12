// ClientNotifications.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    const dPart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const tPart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    return `${dPart} • ${tPart}`;
  } catch {
    return "";
  }
};

const BlueDot = () => (
  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#008cfc]" aria-hidden />
);

const Card = ({ notif, onMarkRead, onDelete }) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-white">
          <img src="/Bellicon.png" alt="Notification" className="h-5 w-5 object-contain opacity-90" draggable="false" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm md:text-base text-gray-900 font-semibold truncate">{notif.title}</p>
              {notif.message && <p className="mt-1 text-sm text-gray-600 leading-relaxed">{notif.message}</p>}
              <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">{formatDate(notif.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!notif.read && <BlueDot />}
              {!notif.read && (
                <button onClick={() => onMarkRead(notif.id)} className="rounded-md border border-gray-200 px-2 py-1 text-xs md:text-sm text-[#008cfc] hover:bg-gray-50">
                  Mark as read
                </button>
              )}
              <button onClick={() => onDelete(notif.id)} className="rounded-md border border-gray-200 px-2 py-1 text-xs md:text-sm text-gray-700 hover:bg-gray-50" aria-label="Dismiss notification" title="Dismiss">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
    const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem("auth_uid") || "";
    const e = a.email || localStorage.getItem("client_email") || localStorage.getItem("email_address") || localStorage.getItem("email") || "";
    return encodeURIComponent(JSON.stringify({ r: "client", e, au }));
  } catch {}
  return "";
}

async function ensureSession() {
  try {
    const appU = buildAppU();
    const { data } = await axios.get(`${API_BASE}/api/account/me`, {
      withCredentials: true,
      headers: appU ? { "x-app-u": appU } : {}
    });
    const uid = data?.auth_uid || "";
    const email = data?.email_address || "";
    if (uid) localStorage.setItem("auth_uid", uid);
    if (email) {
      localStorage.setItem("email_address", email);
      localStorage.setItem("email", email);
      localStorage.setItem("client_email", email);
    }
    return true;
  } catch {
    return false;
  }
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [sessionReady, setSessionReady] = useState(false);
  const esRef = useRef(null);

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ok = await ensureSession();
      setSessionReady(ok);
      try {
        const appU = buildAppU();
        const { data } = await axios.get(`${API_BASE}/api/notifications`, {
          withCredentials: true,
          headers: appU ? { "x-app-u": appU } : {}
        });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((n, i) => ({
            id: n.id ?? `${i}`,
            title: n.title ?? "Notification",
            message: n.message ?? "",
            created_at: n.created_at ?? new Date().toISOString(),
            read: !!n.read
          }));
          setNotifs(normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch {
        if (!cancelled) setNotifs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    try { if (esRef.current) { esRef.current.close(); esRef.current = null; } } catch {}
    const appU = buildAppU();
    if (!appU) return;
    const src = new EventSource(`${API_BASE}/api/notifications/stream?app_u=${appU}`, { withCredentials: true });
    esRef.current = src;
    const onNotification = (e) => {
      try {
        const j = JSON.parse(e.data || "{}");
        if (j && j.id) {
          setNotifs((prev) => {
            const next = [{ id: j.id, title: j.title || "Notification", message: j.message || "", created_at: j.created_at || new Date().toISOString(), read: !!j.read }, ...prev];
            return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      } catch {}
    };
    src.addEventListener("notification", onNotification);
    src.onerror = () => {};
    return () => {
      try { src.close(); } catch {}
      esRef.current = null;
    };
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    (async () => {
      try {
        const appU = buildAppU();
        if (appU) {
          await axios.post(`${API_BASE}/api/notifications/read-all`, {}, { withCredentials: true, headers: { "x-app-u": appU } });
        }
      } catch {}
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      try { localStorage.setItem('notifSuppressed', '1'); } catch {}
      window.dispatchEvent(new Event("client-notifications-suppress"));
      window.dispatchEvent(new Event("client-notifications-refresh"));
    })();
  }, [sessionReady]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = showUnreadOnly ? notifs.filter(n => !n.read) : notifs;
    if (!q) return base;
    return base.filter(n => (n.title || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q));
  }, [notifs, showUnreadOnly, query]);

  const mostRecent = useMemo(() => filtered[0], [filtered]);
  const earlier = useMemo(() => filtered.slice(1), [filtered]);

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const appU = buildAppU();
      await axios.post(`${API_BASE}/api/notifications/${id}/read`, {}, { withCredentials: true, headers: appU ? { "x-app-u": appU } : {} });
      try { localStorage.setItem('notifSuppressed', '1'); } catch {}
      window.dispatchEvent(new Event("client-notifications-suppress"));
      window.dispatchEvent(new Event("client-notifications-refresh"));
    } catch {}
  };

  const dismiss = async (id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      const appU = buildAppU();
      await axios.delete(`${API_BASE}/api/notifications/${id}`, { withCredentials: true, headers: appU ? { "x-app-u": appU } : {} });
      window.dispatchEvent(new Event("client-notifications-refresh"));
    } catch {}
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const appU = buildAppU();
      await axios.post(`${API_BASE}/api/notifications/read-all`, {}, { withCredentials: true, headers: appU ? { "x-app-u": appU } : {} });
      try { localStorage.setItem('notifSuppressed', '1'); } catch {}
      window.dispatchEvent(new Event("client-notifications-suppress"));
      window.dispatchEvent(new Event("client-notifications-refresh"));
    } catch {}
  };

  const unreadCount = useMemo(() => notifs.filter(n => !n.read).length, [notifs]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ClientNavigation />
      <div className="sticky top-0 z-10 bg-white">
        <div className="mx-auto w-full max-w-[1525px] px-6 py-7 flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Notifications</h1>
            <div className="text-xs text-gray-500">Stay up to date with your account activity</div>
          </div>
        </div>
      </div>
      <main className="flex-1 mx-auto w-full max-w-[1525px] px-6 mt-6 mb-12 grid grid-cols-1 gap-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Most Recent</h2>
          </div>
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
            </div>
          ) : mostRecent ? (
            <Card notif={mostRecent} onMarkRead={markRead} onDelete={dismiss} />
          ) : (
            <div className="rounded-2xl border border-dashed border-[#008cfc33] bg-white p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white grid place-items-center">
                <img src="/Bellicon.png" alt="" className="h-6 w-6 opacity-70" />
              </div>
              <div className="mt-4 text-base font-medium text-gray-900">You’re all caught up</div>
              <div className="text-sm text-gray-600">No notifications for now</div>
            </div>
          )}
          {earlier.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Earlier</h2>
              <div className="grid gap-3">
                {earlier.map((n) => (
                  <Card key={n.id} notif={n} onMarkRead={markRead} onDelete={dismiss} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <ClientFooter />
    </div>
  );
}
