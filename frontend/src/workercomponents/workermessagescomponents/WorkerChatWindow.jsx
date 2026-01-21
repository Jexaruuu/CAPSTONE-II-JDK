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

function toObj(v) {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return typeof v === "object" ? v : {};
}

function guessEmailFromConversation(conversation) {
  const c = conversation || {};
  const direct =
    c.email ||
    c.email_address ||
    c.clientEmail ||
    c.client_email ||
    c.otherEmail ||
    c.other_email ||
    c.to ||
    c.toEmail ||
    c.to_email ||
    c.participantEmail ||
    c.participant_email ||
    "";

  const cleanDirect = String(direct || "").trim();
  if (cleanDirect && /\S+@\S+\.\S+/.test(cleanDirect)) return cleanDirect;

  const subtitle = String(c.subtitle || c.subTitle || c.meta || "").trim();
  const m = subtitle.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (m?.[0]) return String(m[0]).trim();

  try {
    const qs = new URLSearchParams(window.location.search);
    const to = String(qs.get("to") || "").trim();
    if (to && /\S+@\S+\.\S+/.test(to)) return to;
  } catch {}

  return "";
}

const WorkerChatWindow = ({
  conversation,
  messages = [],
  loading = false,
  composer = { text: "", onChange: () => {}, onSend: () => {} },
}) => {
  const [avatarUrlBroken, setAvatarUrlBroken] = useState(false);
  const [avatarPlaceholderBroken, setAvatarPlaceholderBroken] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);

  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);
  const messagesRef = useRef(null);

  useEffect(() => {
    setAvatarUrlBroken(false);
    setAvatarPlaceholderBroken(false);
  }, [conversation?.id, conversation?.avatarUrl]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [safeMessages.length, conversation?.id]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;

    if (viewOpen) {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
    };
  }, [viewOpen]);

  const initials = useMemo(() => {
    const name = String(conversation?.name || "").trim();
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase() || "U";
  }, [conversation?.name]);

  const headerAvatarUrl = !avatarUrlBroken ? conversation?.avatarUrl : null;

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

  const buildViewRequestPayload = useMemo(() => {
    const req =
      toObj(conversation?.request) ||
      toObj(conversation?.request_details) ||
      toObj(conversation?.details) ||
      toObj(conversation?.service_request) ||
      {};

    const rid = String(
      req?.id ||
        req?.request_id ||
        conversation?.request_id ||
        conversation?.requestId ||
        conversation?.request_group_id ||
        ""
    ).trim();

    const clientUid = String(
      req?.clientUid ||
        req?.client_uid ||
        conversation?.clientUid ||
        conversation?.uid ||
        conversation?.userId ||
        conversation?.client_id ||
        ""
    ).trim();

    return {
      ...req,
      id: rid || req?.id || "",
      request_id: rid || req?.request_id || "",
      request_group_id: req?.request_group_id || conversation?.request_group_id || "",
      clientUid,
      name: req?.name || conversation?.name || "Client",
      email: req?.email || conversation?.email || "",
      image: req?.image || conversation?.avatarUrl || "",
      preferred_date: req?.preferred_date || req?.preferredDate || "",
      preferred_time: req?.preferred_time || req?.preferredTime || "",
      urgency: req?.urgency || req?.is_urgent || "",
      service_type: req?.service_type || req?.serviceType || "",
      service_task: req?.service_task || req?.serviceTask || "",
      description: req?.description || req?.service_description || req?.serviceDescription || "",
      workers_needed: req?.workers_needed || req?.workersNeeded || "",
      price: req?.price || req?.total_rate_php || req?.totalRate || "",
      barangay: req?.barangay || "",
      street: req?.street || "",
      additional_address: req?.additional_address || req?.landmark || "",
    };
  }, [
    conversation?.request,
    conversation?.request_details,
    conversation?.details,
    conversation?.service_request,
    conversation?.request_id,
    conversation?.requestId,
    conversation?.request_group_id,
    conversation?.clientUid,
    conversation?.uid,
    conversation?.userId,
    conversation?.name,
    conversation?.email,
    conversation?.avatarUrl,
  ]);

  const openViewRequest = () => {
    setViewRequest(buildViewRequestPayload);
    setViewOpen(true);
  };

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

  const otherName = String(conversation?.name || "Client").trim() || "Client";
  const otherEmail = guessEmailFromConversation(conversation);
  const hasOtherEmail = !!otherEmail;

  return (
    <>
      <section className="flex-1 h-[calc(100vh-140px)] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full border border-gray-200 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
              {headerAvatarUrl ? (
                <img
                  src={headerAvatarUrl}
                  alt={otherName}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrlBroken(true)}
                />
              ) : !avatarPlaceholderBroken ? (
                <img
                  src={AVATAR_PLACEHOLDER}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarPlaceholderBroken(true)}
                />
              ) : (
                <div className="text-sm font-semibold text-gray-600">{initials}</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{otherName}</div>
              {hasOtherEmail ? <div className="text-xs text-gray-500 truncate">{otherEmail}</div> : null}
            </div>
          </div>

        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div ref={messagesRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
            {loading ? (
              <div className="w-full flex items-center justify-center py-10">
                <div
                  className="w-10 h-10 rounded-full animate-spin"
                  style={{
                    borderWidth: "4px",
                    borderStyle: "solid",
                    borderColor: "#008cfc22",
                    borderTopColor: "#008cfc",
                  }}
                />
              </div>
            ) : safeMessages.length ? (
              safeMessages.map((m) => {
                const mine = !!m.mine;
                const text = String(m.text || "").trim();
                const ts = fmtChatTimestamp(m.updated_at || m.created_at || m.sent_at || m.time || "");
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div
                        className={`px-4 py-2 rounded-2xl border ${
                          mine
                            ? "bg-[#008cfc] text-white border-[#008cfc]"
                            : "bg-white text-gray-800 border-gray-200"
                        }`}
                        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >
                        {text || "—"}
                      </div>

                      {ts ? (
                        <div className={`text-[11px] ${mine ? "text-gray-400 text-right" : "text-gray-400"}`}>
                          {ts}
                          {m.edited ? <span className="ml-2 opacity-80">(edited)</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="mx-auto w-14 h-14 rounded-2xl border border-blue-100 bg-blue-50 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-[#008cfc]" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-gray-800">No messages yet</div>
                  <div className="mt-1 text-xs text-gray-500">Send a message to start the conversation.</div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                composer?.onSend?.();
              }}
              className="flex items-center gap-3"
            >
              <input
                value={composer?.text || ""}
                onChange={(e) => composer?.onChange?.(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#008cfc22]"
              />

              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-[#008cfc] hover:bg-[#0078d6] text-white flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="text-sm font-medium">Send</span>
              </button>
            </form>
          </div>
        </div>
      </section>

    </>
  );
};

export default WorkerChatWindow;
