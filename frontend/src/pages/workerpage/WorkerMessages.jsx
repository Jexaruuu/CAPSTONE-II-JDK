import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import WorkerConversationList from "../../workercomponents/workermessagescomponents/WorkerConversationList";
import WorkerChatWindow from "../../workercomponents/workermessagescomponents/WorkerChatWindow";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeJsonParse(v) {
  try {
    return JSON.parse(String(v || ""));
  } catch {
    return null;
  }
}

function pickLastTimestampWorker(c) {
  if (!c) return "";
  return (
    c.lastMessageTime ||
    c.last_message_time ||
    c.last_message_updated_at ||
    c.last_message_created_at ||
    c.last_message_at ||
    c.lastMessageAt ||
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

const WorkerMessages = () => {
  const qs = useQueryParams();
  const to = String(qs.get("to") || "").trim();
  const toUid = String(qs.get("toUid") || "").trim();

  const [loadingConvos, setLoadingConvos] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState([]);
  const [composerText, setComposerText] = useState("");

  const pollRef = useRef(null);
  const didEnsureRef = useRef(false);
  const hydratedConvosRef = useRef(false);
  const fetchingConvosRef = useRef(false);
  const fetchingMsgsRef = useRef(false);

  const autoMarkedRef = useRef(new Set());

  const authKey = useMemo(() => {
    const a = safeJsonParse(localStorage.getItem("workerAuth") || "{}") || {};
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem("auth_uid") ||
      "";
    return String(au || "anon");
  }, []);

  const READ_OVERRIDES_KEY = useMemo(() => `worker_seen_overrides_${authKey}`, [authKey]);

  const [readOverrides, setReadOverrides] = useState(() => {
    const raw = safeJsonParse(localStorage.getItem(READ_OVERRIDES_KEY) || "{}");
    if (!raw || typeof raw !== "object") return {};
    return raw;
  });

  useEffect(() => {
    localStorage.setItem(READ_OVERRIDES_KEY, JSON.stringify(readOverrides || {}));
  }, [READ_OVERRIDES_KEY, readOverrides]);

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem("workerAuth") || "{}");
      const au =
        a.auth_uid ||
        a.authUid ||
        a.uid ||
        a.id ||
        localStorage.getItem("auth_uid") ||
        "";
      const e =
        a.email ||
        localStorage.getItem("worker_email") ||
        localStorage.getItem("email_address") ||
        localStorage.getItem("email") ||
        "";
      return encodeURIComponent(JSON.stringify({ r: "worker", e, au }));
    } catch {
      return "";
    }
  }, []);

  const headersWithU = useMemo(() => (appU ? { "x-app-u": appU } : {}), [appU]);

  const fetchConversations = async (opts = {}) => {
    const silent = !!opts.silent;

    if (fetchingConvosRef.current) return;
    fetchingConvosRef.current = true;

    if (!silent && !hydratedConvosRef.current) setLoadingConvos(true);

    try {
      const res = await axios.get(`${API_BASE}/api/chat/conversations`, {
        withCredentials: true,
        headers: headersWithU,
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const mapped = items.map((c) => ({
        id: c.id,
        name: c.name,
        lastMessage: c.lastMessage || c.last_message || "",
        avatarUrl: c.avatarUrl || "",
        unreadCount: c.unreadCount || c.unread_count || 0,
        subtitle: c.subtitle || "",
        lastMessageTime:
          c.lastMessageTime ||
          c.last_message_time ||
          c.last_message_updated_at ||
          c.last_message_created_at ||
          c.last_message_at ||
          c.lastMessageAt ||
          c.updated_at ||
          c.created_at ||
          c.time ||
          "",
        updated_at: c.updated_at || "",
        created_at: c.created_at || "",
      }));

      setConversations(mapped);

      setReadOverrides((prev) => {
        const p = prev && typeof prev === "object" ? prev : {};
        const next = {};
        for (const conv of mapped) {
          const id = String(conv?.id || "");
          if (!id) continue;
          const lastTs = String(pickLastTimestampWorker(conv) || "");
          const savedTs = String(p[id] || "");
          if (savedTs && lastTs && savedTs === lastTs) next[id] = savedTs;
        }
        return next;
      });

      if (!activeId && mapped[0]?.id) setActiveId(mapped[0].id);
      hydratedConvosRef.current = true;
    } catch {
      setConversations([]);
      hydratedConvosRef.current = true;
    } finally {
      fetchingConvosRef.current = false;
      if (!silent) setLoadingConvos(false);
      if (!silent && hydratedConvosRef.current) setLoadingConvos(false);
    }
  };

  const ensureConversationFromUrl = async () => {
    if (!to && !toUid) return null;
    try {
      const res = await axios.post(
        `${API_BASE}/api/chat/ensure`,
        { to, toUid },
        { withCredentials: true, headers: headersWithU }
      );
      const convo = res?.data?.conversation || null;
      if (convo?.id) return convo.id;
    } catch {}
    return null;
  };

  const fetchMessages = async (conversationId, opts = {}) => {
    const silent = !!opts.silent;

    if (!conversationId) {
      setMessages([]);
      return;
    }

    if (fetchingMsgsRef.current) return;
    fetchingMsgsRef.current = true;

    if (!silent) setLoadingMessages(true);

    try {
      const res = await axios.get(`${API_BASE}/api/chat/messages/${encodeURIComponent(conversationId)}`, {
        params: { limit: 300 },
        withCredentials: true,
        headers: headersWithU,
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setMessages(
        items.map((m) => ({
          id: m.id,
          mine: !!m.mine,
          text: m.text || "",
          time: m.time || "",
          created_at: m.created_at || "",
          updated_at: m.updated_at || "",
          edited: !!m.edited,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      fetchingMsgsRef.current = false;
      if (!silent) setLoadingMessages(false);
    }
  };

  const markConversationReadUI = (conversationId) => {
    if (!conversationId) return;
    const convo = conversations.find((c) => String(c.id) === String(conversationId)) || null;
    const lastTs = String(pickLastTimestampWorker(convo) || "");
    if (!lastTs) return;

    setReadOverrides((prev) => ({
      ...(prev && typeof prev === "object" ? prev : {}),
      [String(conversationId)]: lastTs,
    }));

    setConversations((prev) =>
      prev.map((c) => (String(c.id) === String(conversationId) ? { ...c, unreadCount: 0 } : c))
    );
  };

  const markConversationRead = async (conversationId) => {
    if (!conversationId) return;

    markConversationReadUI(conversationId);

    try {
      await axios.post(
        `${API_BASE}/api/chat/mark-read/${encodeURIComponent(conversationId)}`,
        {},
        { withCredentials: true, headers: headersWithU }
      );
    } catch {
      try {
        await axios.post(
          `${API_BASE}/api/chat/read/${encodeURIComponent(conversationId)}`,
          {},
          { withCredentials: true, headers: headersWithU }
        );
      } catch {}
    }
  };

  const markAllReadUI = () => {
    const next = {};
    for (const c of conversations) {
      const id = String(c?.id || "");
      if (!id) continue;
      const lastTs = String(pickLastTimestampWorker(c) || "");
      if (lastTs) next[id] = lastTs;
    }
    setReadOverrides(next);
    setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
  };

  const markAllRead = async () => {
    markAllReadUI();

    try {
      await axios.post(
        `${API_BASE}/api/chat/mark-all-read`,
        {},
        { withCredentials: true, headers: headersWithU }
      );
    } catch {
      try {
        await axios.post(
          `${API_BASE}/api/chat/read-all`,
          {},
          { withCredentials: true, headers: headersWithU }
        );
      } catch {}
    }
  };

  const handleSelectConversation = async (id) => {
    if (!id) return;
    setActiveId(id);
    await fetchMessages(id);
    await fetchConversations({ silent: true });
  };

  const handleSend = async () => {
    const msg = String(composerText || "").trim();
    if (!msg || !activeId) return;

    const nowIso = new Date().toISOString();

    const optimistic = {
      id: `tmp-${Date.now()}`,
      mine: true,
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      created_at: nowIso,
      updated_at: nowIso,
      edited: false,
    };

    setMessages((p) => [...p, optimistic]);
    setComposerText("");

    try {
      await axios.post(
        `${API_BASE}/api/chat/messages/${encodeURIComponent(activeId)}`,
        { text: msg },
        { withCredentials: true, headers: headersWithU }
      );
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    } catch {
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!activeId) return;
    const t = String(newText || "").trim();
    if (!t) return;
    if (String(messageId).startsWith("tmp-")) return;

    setMessages((p) =>
      p.map((m) =>
        String(m.id) === String(messageId)
          ? { ...m, text: t, updated_at: new Date().toISOString(), edited: true }
          : m
      )
    );

    try {
      await axios.put(
        `${API_BASE}/api/chat/messages/${encodeURIComponent(activeId)}/${encodeURIComponent(messageId)}`,
        { text: t },
        { withCredentials: true, headers: headersWithU }
      );
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    } catch {
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeId) return;
    if (String(messageId).startsWith("tmp-")) return;

    const prev = messages;
    setMessages((p) => p.filter((m) => String(m.id) !== String(messageId)));

    try {
      await axios.delete(
        `${API_BASE}/api/chat/messages/${encodeURIComponent(activeId)}/${encodeURIComponent(messageId)}`,
        { withCredentials: true, headers: headersWithU }
      );
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    } catch {
      setMessages(prev);
      await fetchMessages(activeId, { silent: true });
      await fetchConversations({ silent: true });
    }
  };

  useEffect(() => {
    let didCancel = false;

    const init = async () => {
      await fetchConversations();
      if (didCancel) return;

      if (!didEnsureRef.current) {
        didEnsureRef.current = true;
        const ensuredId = await ensureConversationFromUrl();
        if (didCancel) return;

        if (ensuredId) {
          setActiveId(ensuredId);
          await fetchConversations({ silent: true });
          if (didCancel) return;
          await fetchMessages(ensuredId);
          return;
        }
      }

      if (activeId) {
        await fetchMessages(activeId);
      }
    };

    init();

    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    let didCancel = false;

    const runEnsureOnUrlChange = async () => {
      if (!to && !toUid) return;

      const ensuredId = await ensureConversationFromUrl();
      if (didCancel) return;

      if (ensuredId) {
        setActiveId(ensuredId);
        await fetchConversations({ silent: true });
        if (didCancel) return;
        await fetchMessages(ensuredId);
      }
    };

    runEnsureOnUrlChange();

    return () => {
      didCancel = true;
    };
  }, [to, toUid]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    fetchMessages(activeId);
    return () => {};
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(() => {
      fetchMessages(activeId, { silent: true });
      fetchConversations({ silent: true });
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    if (loadingMessages) return;

    const convo = conversations.find((c) => String(c.id) === String(activeId)) || null;
    if (!convo) return;

    const rawUnread = Number(convo.unreadCount || 0);
    if (!rawUnread || rawUnread <= 0) return;

    const lastTs = String(pickLastTimestampWorker(convo) || "");
    if (!lastTs) return;

    const key = `${String(activeId)}::${lastTs}`;
    if (autoMarkedRef.current.has(key)) return;
    autoMarkedRef.current.add(key);

    markConversationRead(activeId);
  }, [activeId, loadingMessages, conversations]);

  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));
  }, [conversations, query]);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  const showChatWindow = !!activeConversation && !!activeId;
  const showEmptyState = !loadingConvos && !showChatWindow;

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation />
      <div className="max-w-[1525px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <WorkerConversationList
            conversations={filteredConversations}
            activeId={activeId}
            loading={loadingConvos}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelectConversation}
            onMarkRead={markConversationRead}
            onReadAll={markAllRead}
            readOverrides={readOverrides}
          />

          {showChatWindow ? (
            <WorkerChatWindow
              conversation={activeConversation}
              messages={messages}
              loading={loadingMessages}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              composer={{
                text: composerText,
                onChange: setComposerText,
                onSend: handleSend,
              }}
            />
          ) : (
            <div className="flex-1 min-h-[650px] rounded-2xl border border-gray-200 bg-white flex items-center justify-center">
              {showEmptyState ? (
                <div className="w-full max-w-md px-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl border border-blue-100 bg-blue-50 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-8 h-8 text-[#008cfc]"
                    >
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                      <path d="M8 10h8" />
                      <path d="M8 14h5" />
                    </svg>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-gray-900">No conversations yet</h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    Once a client sends you a message, it will appear here. Keep your profile updated and stay active
                    to receive service requests.
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    <div className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
                      Tip: Respond quickly to requests
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md px-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl border border-blue-100 bg-blue-50 flex items-center justify-center">
                    <div
                      className="w-7 h-7 rounded-full animate-spin"
                      style={{
                        borderWidth: "4px",
                        borderStyle: "solid",
                        borderColor: "#008cfc22",
                        borderTopColor: "#008cfc",
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">Loading conversations...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <WorkerFooter />
    </div>
  );
};

export default WorkerMessages;
