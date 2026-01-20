import React, { useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

function fmtLastMessageTime(v) {
  if (!v) return "";

  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleString(undefined, {
          month: "short",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
        });
  }

  if (v instanceof Date) {
    return Number.isNaN(v.getTime())
      ? ""
      : v.toLocaleString(undefined, {
          month: "short",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
        });
  }

  const d = new Date(String(v));
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
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

  return (
    c.lastMessageTime ||
    c.last_message_time ||
    c.last_message_updated_at ||
    c.last_message_created_at ||
    c.updated_at ||
    c.created_at ||
    c.sent_at ||
    c.time ||
    c.updatedAt ||
    c.createdAt ||
    c.sentAt ||
    ""
  );
}

function pickLastMessageText(c) {
  if (!c) return "";
  const v = c.lastMessage || c.last_message || c.preview || c.last_text || "";
  return String(v || "").trim();
}

const WorkerConversationList = ({
  conversations = [],
  activeId = null,
  loading = false,
  query = "",
  onQueryChange = () => {},
  onSelect = () => {},
}) => {
  const safeConversations = useMemo(
    () => (Array.isArray(conversations) ? conversations : []),
    [conversations]
  );

  return (
    <aside className="w-[300px] lg:w-[320px] shrink-0 h-[calc(100vh-140px)] bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Messages</h2>
        <button type="button" className="p-2 rounded-md hover:bg-gray-100" title="Filters">
          <SlidersHorizontal className="h-5 w-5 text-gray-500" />
        </button>
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
            const timeText = fmtLastMessageTime(pickLastTimestamp(c));
            const lastText = pickLastMessageText(c);

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={[
                  "w-full text-left rounded-xl border px-3 py-3 transition-all",
                  isActive
                    ? "bg-blue-50 border-[#008cfc]"
                    : "bg-white border-gray-200 hover:border-[#008cfc]/60 hover:bg-blue-50/40",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {c.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{c.name}</p>

                      <div className="flex items-center gap-2 shrink-0">
                        {timeText ? (
                          <span className="text-[11px] text-gray-500 whitespace-nowrap">{timeText}</span>
                        ) : null}

                        {c.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-[#008cfc] text-white text-xs px-1">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 truncate">{lastText || "…"}</p>
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

export default WorkerConversationList;
