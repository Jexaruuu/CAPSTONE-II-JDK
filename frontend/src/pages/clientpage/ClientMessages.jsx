import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import ClientConversationList from "../../clientcomponents/clientmessagescomponents/ClientConversationList";
import ClientChatWindow from "../../clientcomponents/clientmessagescomponents/ClientChatWindow";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ClientMessages = () => {
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

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
      const au =
        a.auth_uid ||
        a.authUid ||
        a.uid ||
        a.id ||
        localStorage.getItem("auth_uid") ||
        "";
      const e =
        a.email ||
        localStorage.getItem("client_email") ||
        localStorage.getItem("email_address") ||
        localStorage.getItem("email") ||
        "";
      return encodeURIComponent(JSON.stringify({ r: "client", e, au }));
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
        lastMessage: c.lastMessage || "",
        avatarUrl: c.avatarUrl || "",
        unreadCount: c.unreadCount || 0,
        subtitle: c.subtitle || "",
      }));

      setConversations(mapped);

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
      const res = await axios.get(
        `${API_BASE}/api/chat/messages/${encodeURIComponent(conversationId)}`,
        {
          params: { limit: 300 },
          withCredentials: true,
          headers: headersWithU,
        }
      );

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setMessages(
        items.map((m) => ({
          id: m.id,
          mine: !!m.mine,
          text: m.text || "",
          time: m.time || "",
          created_at: m.created_at || "",
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      fetchingMsgsRef.current = false;
      if (!silent) setLoadingMessages(false);
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

  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const showChatWindow = !!activeConversation && !!activeId;
  const showEmptyState = !loadingConvos && !showChatWindow;

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <ClientNavigation />
      <div className="max-w-[1525px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <ClientConversationList
            conversations={filteredConversations}
            activeId={activeId}
            loading={loadingConvos}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelectConversation}
          />

          {showChatWindow ? (
            <ClientChatWindow
              conversation={activeConversation}
              messages={messages}
              loading={loadingMessages}
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
                    Once you connect with a worker, your messages will appear here. You can start by
                    booking a service or selecting a worker to chat.
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    <div className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
                      Tip: Search & book a worker first
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
      <ClientFooter />
    </div>
  );
};

export default ClientMessages;
