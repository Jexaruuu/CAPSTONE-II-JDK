import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Check } from "lucide-react";

function fmtChatTimestamp(v) {
  if (!v) return "";

  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return v;
  }

  if (typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return "";
  }

  if (v instanceof Date) {
    if (!Number.isNaN(v.getTime())) {
      return v.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return "";
  }

  const d = new Date(String(v));
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return "";
}

function pickLastTimestamp(c) {
  if (!c) return "";

  const direct =
    c.lastMessageTime ||
    c.last_message_time ||
    c.last_message_updated_at ||
    c.last_message_created_at ||
    c.last_message_at ||
    c.lastMessageAt ||
    c.last_message_date ||
    c.lastMessageDate ||
    c.updated_at ||
    c.created_at ||
    c.sent_at ||
    c.time ||
    c.updatedAt ||
    c.createdAt ||
    c.sentAt ||
    "";

  if (direct) return direct;

  const lm = c.lastMessage || c.last_message || null;

  if (lm && typeof lm === "object") {
    return (
      lm.updated_at ||
      lm.created_at ||
      lm.sent_at ||
      lm.time ||
      lm.updatedAt ||
      lm.createdAt ||
      lm.sentAt ||
      ""
    );
  }

  return "";
}

function pickLastMessageText(c) {
  if (!c) return "";

  const v =
    (typeof c.lastMessage === "string" ? c.lastMessage : "") ||
    (typeof c.last_message === "string" ? c.last_message : "") ||
    c.preview ||
    c.last_text ||
    "";

  if (String(v || "").trim()) return String(v || "").trim();

  const lm = c.lastMessage || c.last_message || null;
  if (lm && typeof lm === "object") {
    return String(lm.text || lm.message || lm.body || "").trim();
  }

  return "";
}

function readCount(c) {
  const v = c?.unreadCount ?? c?.unread_count ?? c?.unread ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toEpoch(v) {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

const ClientConversationList = ({
  conversations = [],
  activeId = null,
  loading = false,
  query = "",
  onQueryChange = () => {},
  onSelect = () => {},
  onMarkRead = () => {},
  onReadAll = () => {},
  readOverrides = {},
}) => {
  const safeConversations = useMemo(
    () => (Array.isArray(conversations) ? conversations : []),
    [conversations]
  );

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <aside className="w-[300px] lg:w-[320px] shrink-0 h-[calc(100vh-140px)] bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Messages</h2>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="p-2 rounded-md hover:bg-gray-100"
            title="Settings"
            onClick={() => setOpenMenu((v) => !v)}
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-500" />
          </button>

          {openMenu ? (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                onClick={() => {
                  setOpenMenu(false);
                  onReadAll();
                }}
              >
                <span>Read all</span>
                <Check className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#008cfc] focus:border-[#008cfc] bg-white"
        />
      </div>

      <div className="overflow-y-auto flex-1 space-y-1">
        {loading ? (
          <div className="text-sm text-gray-500 p-3">Loading conversations…</div>
        ) : safeConversations.length === 0 ? (
          <div className="text-sm text-gray-500 p-3">Conversations will appear here</div>
        ) : (
          safeConversations.map((c) => {
            const isActive = activeId === c.id;
            const lastTs = String(pickLastTimestamp(c) || "");
            const timeText = fmtChatTimestamp(lastTs);
            const lastText = pickLastMessageText(c);

            const rawUnread = readCount(c);
            const lastEpoch = toEpoch(lastTs);

            const seenEpoch = Number(readOverrides?.[String(c.id)] || 0);
            const hideUnread = lastEpoch > 0 && seenEpoch > 0 && seenEpoch >= lastEpoch;

            const uiUnread = hideUnread ? 0 : rawUnread;
            const showUnread = uiUnread > 0;

            return (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  if (rawUnread > 0) onMarkRead(c.id);
                }}
                className={[
                  "w-full text-left rounded-xl border px-3 py-3 transition-all",
                  isActive
                    ? "bg-blue-50 border-[#008cfc]"
                    : "bg-white border-gray-200 hover:border-[#008cfc]/60 hover:bg-blue-50/40",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden shrink-0">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {String(c.name || "")
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("") || "U"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{c.name}</p>

                      {showUnread ? (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-[#008cfc] text-white text-xs px-1 shrink-0">
                          {uiUnread}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-gray-600 truncate">{lastText || "…"}</p>

                      {timeText ? (
                        <span className="text-[11px] text-gray-500 whitespace-nowrap shrink-0">
                          {timeText}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default ClientConversationList;
