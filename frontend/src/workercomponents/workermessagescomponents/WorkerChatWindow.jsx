import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";

const AVATAR_PLACEHOLDER = "/Bluelogo.png";

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
  }
  return String(v || "");
}

const WorkerChatWindow = ({
  conversation,
  messages = [],
  loading = false,
  composer = { text: "", onChange: () => {}, onSend: () => {} },
}) => {
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_PLACEHOLDER);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  const messagesRef = useRef(null);

  useEffect(() => {
    const src = String(conversation?.avatarUrl || "").trim();
    if (src) {
      setAvatarSrc(src);
      setAvatarFailed(false);
    } else {
      setAvatarSrc(AVATAR_PLACEHOLDER);
      setAvatarFailed(false);
    }
  }, [conversation?.avatarUrl, conversation?.id]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [safeMessages.length, conversation?.id]);

  const viewRequestHref = useMemo(() => {
    const direct = String(conversation?.requestHref || conversation?.requestUrl || "").trim();
    if (direct) return direct;

    const rid = String(conversation?.request_id || conversation?.requestId || "").trim();
    if (rid) return `/worker-view-service-request?id=${encodeURIComponent(rid)}`;

    const uid = String(conversation?.uid || conversation?.userId || conversation?.clientUid || "").trim();
    if (uid) return `/worker-view-service-request?clientUid=${encodeURIComponent(uid)}`;

    return "/worker-view-service-request";
  }, [
    conversation?.requestHref,
    conversation?.requestUrl,
    conversation?.request_id,
    conversation?.requestId,
    conversation?.uid,
    conversation?.userId,
    conversation?.clientUid,
  ]);

  if (!conversation) {
    const role = localStorage.getItem("role");
    const ctaHref = role === "worker" ? "/work-offers" : "/pending-offers";
    return (
      <section className="flex-1 h-[calc(100vh-140px)] bg-white border border-gray-200 rounded-2xl flex items-center justify-center">
        <div className="text-center px-6">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-700">Welcome to Messages</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            Once you connect with a {role === "worker" ? "client" : "worker"}, you’ll be able to chat and collaborate
            here.
          </p>
          <Link
            to={ctaHref}
            className="inline-block mt-5 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-md transition"
          >
            Search for jobs
          </Link>
        </div>
      </section>
    );
  }

  const initials =
    String(conversation?.name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <section className="flex-1 h-[calc(100vh-140px)] bg-white border border-gray-200 rounded-2xl flex flex-col">
      <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center shrink-0">
            {!avatarFailed ? (
              <img
                src={avatarSrc}
                alt={conversation.name}
                className="h-10 w-10 object-cover"
                onError={() => {
                  if (avatarSrc !== AVATAR_PLACEHOLDER) setAvatarSrc(AVATAR_PLACEHOLDER);
                  else setAvatarFailed(true);
                }}
              />
            ) : (
              <div className="h-10 w-10 flex items-center justify-center text-sm font-semibold text-blue-600">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="font-semibold leading-5 truncate">{conversation.name}</p>
            <p className="text-xs text-gray-500 leading-4 truncate">{conversation.subtitle || "Online"}</p>
          </div>
        </div>

        <Link
          to={viewRequestHref}
          className="shrink-0 bg-[#008cfc] hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition"
        >
          View Client Request
        </Link>
      </header>

      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1 hide-scrollbar"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {loading ? (
          <div className="text-sm text-gray-500">Loading conversation…</div>
        ) : safeMessages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          safeMessages.map((m) => {
            const mine = !!m.mine;

            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} mb-2`}>
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative",
                    mine ? "bg-[#008cfc] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <div className={`text-[11px] mt-1 ${mine ? "text-white/80" : "text-gray-500"}`}>
                    {fmtChatTimestamp(m.updated_at || m.created_at || m.sent_at || m.time)}
                    {m.edited ? <span className="ml-2 opacity-80">(edited)</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          composer.onSend?.();
        }}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex items-center gap-3">
          <input
            value={composer.text}
            onChange={(e) => composer.onChange?.(e.target.value)}
            placeholder="Write a message"
            className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#008cfc] focus:border-[#008cfc]"
          />

          <button
            type="submit"
            className="bg-[#008cfc] hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-md flex items-center gap-2 transition"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </section>
  );
};

export default WorkerChatWindow;
