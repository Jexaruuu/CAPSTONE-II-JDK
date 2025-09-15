import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import WorkerConversationList from "../../workercomponents/workermessagescomponents/WorkerConversationList";
import WorkerChatWindow from "../../workercomponents/workermessagescomponents/WorkerChatWindow";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const WorkerMessages = () => {
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState([]);
  const [composerText, setComposerText] = useState("");

  useEffect(() => {
    let didCancel = false;

    const fetchConversations = async () => {
      setLoadingConvos(true);
      try {
        const email =
          localStorage.getItem("email") ||
          localStorage.getItem("client_email") ||
          localStorage.getItem("worker_email") ||
          "";

        const res = await axios.get(`${API_BASE}/api/messages/conversations`, {
          params: { email },
          withCredentials: true,
        });

        if (didCancel) return;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setConversations(
          items.map((c) => ({
            id: c.id,
            name: c.name,
            lastMessage: c.lastMessage,
            avatarUrl: c.avatarUrl,
            unreadCount: c.unreadCount || 0,
            subtitle: c.subtitle || "",
          }))
        );
        if (items[0]?.id) setActiveId(items[0].id);
      } catch {
        if (didCancel) return;
        // graceful fallback demo data
        const demo = [
          {
            id: "c1",
            name: "Juan Dela Cruz",
            lastMessage: "Great, see you tomorrow.",
            avatarUrl: "",
            unreadCount: 2,
            subtitle: "Last seen 2h ago",
          },
          {
            id: "c2",
            name: "Maria Santos",
            lastMessage: "Thanks for the update!",
            avatarUrl: "",
            unreadCount: 0,
            subtitle: "Online",
          },
        ];
        setConversations(demo);
        setActiveId("c1");
      } finally {
        if (!didCancel) setLoadingConvos(false);
      }
    };

    fetchConversations();
    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let didCancel = false;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await axios.get(`${API_BASE}/api/messages/thread`, {
          params: { conversationId: activeId },
          withCredentials: true,
        });

        if (didCancel) return;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setMessages(
          items.map((m) => ({
            id: m.id,
            mine: m.mine,
            text: m.text,
            time: m.time,
          }))
        );
      } catch {
        if (didCancel) return;
        // demo thread
        const demo = [
          { id: "m1", mine: false, text: "Hi! Are you available this weekend?", time: "9:12 AM" },
          { id: "m2", mine: true, text: "Yes, Saturday morning works for me.", time: "9:14 AM" },
          { id: "m3", mine: false, text: "Great, see you tomorrow.", time: "9:15 AM" },
        ];
        setMessages(demo);
      } finally {
        if (!didCancel) setLoadingMessages(false);
      }
    };

    fetchMessages();
    return () => {
      didCancel = true;
    };
  }, [activeId]);

  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

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
          onSelect={setActiveId}
        />

        <WorkerChatWindow
          conversation={activeConversation}
          messages={messages}
          loading={loadingMessages}
          composer={{
            text: composerText,
            onChange: setComposerText,
            onSend: () => setComposerText(""), // wire your send API here when ready
          }}
        />
      </div>
    </div>
    <WorkerFooter />
    </div>
  );
};

export default WorkerMessages;
