import React, { useEffect, useMemo, useState } from "react";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

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

const BlueDot = () => <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#008cfc]" aria-hidden />;

function deriveType(n) {
  if (n.type) return n.type;
  const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();
  if (/(contact number|phone|contact)/.test(text)) return "Contact";
  if (/(birthdate|date of birth|\bdob\b)/.test(text)) return "DOB";
  if (/(profile picture|photo|avatar)/.test(text)) return "Photo";
  if (/(facebook|instagram|social|socials)/.test(text)) return "Socials";
  if (/ticket/.test(text)) return "Ticket";
  if (/team/.test(text)) return "Team";
  return "Message";
}

function typeBadgeClass(t) {
  const v = String(t || "Message").toLowerCase();
  if (v === "ticket") return "border-indigo-200 text-indigo-700 bg-indigo-50";
  if (v === "team") return "border-violet-200 text-violet-700 bg-violet-50";
  if (v === "contact") return "border-sky-200 text-sky-700 bg-sky-50";
  if (v === "dob") return "border-amber-200 text-amber-700 bg-amber-50";
  if (v === "photo") return "border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50";
  if (v === "socials") return "border-rose-200 text-rose-700 bg-rose-50";
  return "border-blue-200 text-blue-700 bg-blue-50";
}

function statusBadgeClass(read) {
  return read ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-yellow-200 text-yellow-700 bg-yellow-50";
}

function stripRedundantFieldUpdateTitle(title) {
  const t = (title || "").trim();
  if (/^(birth\s*date|birthdate)\s*updated$/i.test(t)) return true;
  if (/^(contact|contact\s*number|phone|mobile)(\s*(no\.|number))?\s*updated$/i.test(t)) return true;
  if (/^(profile\s*)?picture\s*updated$/i.test(t)) return true;
  if (/^(socials?|social\s*media(\s*links?)?)\s*updated$/i.test(t)) return true;
  return false;
}

function collapseProfileChangeDuplicates(arr) {
  const keepTypes = new Set(["DOB", "Contact", "Photo", "Socials"]);
  const map = new Map();
  for (const n of arr) {
    const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();
    let type = "Other";
    if (/(birthdate|date of birth|\bdob\b)/.test(text)) type = "DOB";
    else if (/(contact number|phone|contact)/.test(text)) type = "Contact";
    else if (/(profile picture|photo|avatar)/.test(text)) type = "Photo";
    else if (/(facebook|instagram|social|socials)/.test(text)) type = "Socials";
    if (keepTypes.has(type)) {
      const prev = map.get(type);
      if (!prev || new Date(n.created_at) > new Date(prev.created_at)) map.set(type, n);
    } else {
      const k = `id:${n.id}`;
      map.set(k, n);
    }
  }
  return Array.from(map.values());
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    try {
      const raw =
        localStorage.getItem("workerNotifications") ||
        localStorage.getItem("worker_notifications") ||
        "[]";
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [];
      const normalized = arr
        .map((n, i) => ({
          id: n.id ?? `${i}`,
          title: n.title ?? "Notification",
          message: n.message ?? "",
          created_at: n.created_at ?? new Date().toISOString(),
          read: !!n.read,
          type: n.type || deriveType(n)
        }))
        .filter((n) => !stripRedundantFieldUpdateTitle(n.title));
      const collapsed = collapseProfileChangeDuplicates(normalized).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (!cancelled) setNotifs(collapsed);
    } catch {
      if (!cancelled) setNotifs([]);
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = showUnreadOnly ? notifs.filter((n) => !n.read) : notifs;
    if (typeFilter !== "All") base = base.filter((n) => (n.type || "Message") === typeFilter);
    if (!q) return base;
    return base.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.message || "").toLowerCase().includes(q)
    );
  }, [notifs, showUnreadOnly, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [showUnreadOnly, query, typeFilter, notifs.length]);

  const persistNotifs = (next) => {
    try {
      localStorage.setItem("workerNotifications", JSON.stringify(next));
    } catch {}
  };

  const markRead = (id) => {
    setNotifs((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotifs(next);
      try {
        localStorage.setItem("workerNotifSuppressed", "1");
      } catch {}
      window.dispatchEvent(new Event("worker-notifications-suppress"));
      window.dispatchEvent(new Event("worker-notifications-refresh"));
      return next;
    });
  };

  const dismiss = (id) => {
    setNotifs((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persistNotifs(next);
      window.dispatchEvent(new Event("worker-notifications-refresh"));
      return next;
    });
  };

  const markAllRead = () => {
    setNotifs((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistNotifs(next);
      try {
        localStorage.setItem("workerNotifSuppressed", "1");
      } catch {}
      window.dispatchEvent(new Event("worker-notifications-suppress"));
      window.dispatchEvent(new Event("worker-notifications-refresh"));
      return next;
    });
  };

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const renderPageButton = (p) => (
    <button
      key={p}
      onClick={() => setPage(p)}
      className={["h-9 min-w-9 px-3 rounded-md border", p === currentPage ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"].join(
        " "
      )}
      aria-current={p === currentPage ? "page" : undefined}
    >
      {p}
    </button>
  );

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <WorkerNavigation />
      <div className="mx-auto w-full max-w-[1525px] px-6 pt-7 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-500">Stay updated with your latest activities and messages</p>
          </div>
          <div className="hidden" />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnreadOnly((v) => !v)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                showUnreadOnly ? "border-[#008cfc] text-[#008cfc]" : "border-slate-200 text-slate-700"
              }`}
            >
              Unread Notifications
            </button>
            <button
              onClick={markAllRead}
              className="rounded-xl border px-3 py-2 text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-[1525px] px-6 pb-12">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-12 items-center px-4 py-3 text-xs font-medium text-slate-500 border-b border-slate-200">
            <div className="col-span-6">Notification</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="p-6 animate-pulse">
                <div className="h-4 w-48 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-200 rounded" />
              </div>
            ) : pageItems.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center border border-slate-200">
                  <img src="/Bellicon.png" alt="" className="h-6 w-6 opacity-70" />
                </div>
                <div className="mt-4 text-base font-medium text-slate-900">No notifications</div>
                <div className="text-sm text-slate-600">You’re all caught up</div>
              </div>
            ) : (
              pageItems.map((n) => (
                <div key={n.id} className="grid grid-cols-12 items-center px-4 py-4 hover:bg-slate-50">
                  <div className="col-span-6 flex items-start gap-3 pr-2">
                    <div className="shrink-0 grid place-items-center h-10 w-10 rounded-xl bg-white border border-slate-200">
                      <img src="/Bellicon.png" alt="" className="h-5 w-5 opacity-90" draggable="false" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-slate-900 font-medium">{n.title}</p>
                        {!n.read && <BlueDot />}
                      </div>
                      {n.message && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{n.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${typeBadgeClass(
                        n.type
                      )}`}
                    >
                      <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                      {n.type || "Message"}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {formatDate(n.created_at)}
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-end items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(
                          n.read
                        )}`}
                      >
                        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                        {n.read ? "Read" : "Unread"}
                      </span>
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="whitespace-nowrap rounded-md border border-slate-200 px-2 py-1 text-xs text-[#008cfc] hover:bg-slate-50"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(n.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        aria-label="Dismiss"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!loading && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-gray-600">
              {filtered.length} {filtered.length === 1 ? "notification" : "notifications"}
            </div>
            <nav className="flex items-center gap-2">
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {pageNumbers.map(renderPageButton)}
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-500">
          {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
        </div>
      </main>
      <WorkerFooter />
    </div>
  );
}
