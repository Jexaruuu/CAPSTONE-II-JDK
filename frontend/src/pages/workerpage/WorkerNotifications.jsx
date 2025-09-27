import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    const opts = { month: "short", day: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
};

const BlueDot = () => (
  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#008cfc]" aria-hidden />
);

const Card = ({ notif, onMarkRead, onDelete }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm hover:shadow transition">
      <div className="flex items-start gap-4">
        <div className="shrink-0 grid place-items-center h-10 w-10 rounded-full bg-blue-50 ring-1 ring-blue-100">
          <img
            src="/Bellicon.png"
            alt="Notification"
            className="h-5 w-5 object-contain opacity-90"
            draggable="false"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm md:text-base text-gray-900 font-medium truncate">{notif.title}</p>
              {notif.message && <p className="mt-0.5 text-sm text-gray-600">{notif.message}</p>}
              <p className="mt-1 text-xs text-gray-500">{formatDate(notif.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              {!notif.read && <BlueDot />}
              {!notif.read && (
                <button
                  onClick={() => onMarkRead(notif.id)}
                  className="text-xs md:text-sm text-[#008cfc] hover:underline"
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={() => onDelete(notif.id)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs md:text-sm text-gray-700 hover:bg-gray-50"
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/notifications`, {
          withCredentials: true,
        });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((n, i) => ({
            id: n.id ?? `${i}`,
            title: n.title ?? "Notification",
            message: n.message ?? "",
            created_at: n.created_at ?? new Date().toISOString(),
            read: !!n.read,
          }));
          setNotifs(
            normalized.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          );
        }
      } catch {
        if (!cancelled) {
          const mock = [
            { id: "m1", title: "A recent sign-in to your account from an unknown device.", message: "", created_at: new Date().toISOString(), read: false },
            { id: "m2", title: "Password changed successfully.", message: "If this wasn’t you, update your password immediately.", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), read: true },
            { id: "m3", title: "New message from a client", message: "Tap to view conversation.", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), read: true },
            { id: "m4", title: "Security reminder", message: "Enable 2-step verification to keep your account safer.", created_at: new Date(Date.now() - 86400000 * 7).toISOString(), read: true },
          ];
          setNotifs(mock);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mostRecent = useMemo(() => notifs[0], [notifs]);
  const earlier = useMemo(() => notifs.slice(1), [notifs]);

  const markRead = async (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await axios.post(`${API_BASE}/api/notifications/${id}/read`, {}, { withCredentials: true });
    } catch {}
  };

  const dismiss = async (id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      await axios.delete(`${API_BASE}/api/notifications/${id}`, { withCredentials: true });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await axios.post(`${API_BASE}/api/notifications/read-all`, {}, { withCredentials: true });
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <WorkerNavigation />

      <div className="sticky top-0 z-10 border-b border-transparent bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1525px] px-6 py-9 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              className="hidden rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Mark all as read
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-[1525px] px-6 mt-6 mb-10 space-y-6">
        <section>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Most Recent</h2>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
            </div>
          ) : mostRecent ? (
            <Card notif={mostRecent} onMarkRead={markRead} onDelete={dismiss} />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
              You’re all caught up. No notifications for now.
            </div>
          )}
        </section>

        {earlier.length > 0 && (
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Earlier</h2>
            <div className="space-y-3">
              {earlier.map((n) => (
                <Card key={n.id} notif={n} onMarkRead={markRead} onDelete={dismiss} />
              ))}
            </div>
          </section>
        )}
      </main>

      <WorkerFooter />
    </div>
  );
}
