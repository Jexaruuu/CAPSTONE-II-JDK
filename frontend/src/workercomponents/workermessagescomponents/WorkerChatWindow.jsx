import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

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
    if (!Number.isNaN(d.getTime())) {
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
  onEditMessage = () => {},
  onDeleteMessage = () => {},
  composer = { text: "", onChange: () => {}, onSend: () => {} },
}) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const menuRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpenId(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const safeMessages = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  const beginEdit = (m) => {
    if (!m?.mine) return;
    if (String(m.id || "").startsWith("tmp-")) return;
    setMenuOpenId(null);
    setEditingId(m.id);
    setEditText(String(m.text || ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    const t = String(editText || "").trim();
    if (!editingId || !t) return;
    const id = editingId;
    setEditingId(null);
    setEditText("");
    await onEditMessage?.(id, t);
  };

  const confirmDelete = async (m) => {
    if (!m?.mine) return;
    if (String(m.id || "").startsWith("tmp-")) return;
    setMenuOpenId(null);
    await onDeleteMessage?.(m.id);
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
            Once you connect with a {role === "worker" ? "client" : "worker"}, you’ll be able to chat and
            collaborate here.
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

  const isEditingAny = !!editingId;
  const inputValue = isEditingAny ? editText : composer.text;

  return (
    <section className="flex-1 h-[calc(100vh-140px)] bg-white border border-gray-200 rounded-2xl flex flex-col">
      <header className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
          {conversation.avatarUrl ? (
            <img src={conversation.avatarUrl} alt={conversation.name} className="h-10 w-10 object-cover" />
          ) : null}
        </div>
        <div>
          <p className="font-semibold leading-5">{conversation.name}</p>
          <p className="text-xs text-gray-500 leading-4">{conversation.subtitle || "Online"}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {loading ? (
          <div className="text-sm text-gray-500">Loading conversation…</div>
        ) : safeMessages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          safeMessages.map((m) => {
            const mine = !!m.mine;
            const msgIsEditing = String(editingId) === String(m.id);

            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} mb-2`}>
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative group",
                    mine ? "bg-[#008cfc] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md",
                  ].join(" ")}
                >
                  {mine && !String(m.id || "").startsWith("tmp-") && !msgIsEditing ? (
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId((p) => (p === m.id ? null : m.id))}
                        className="h-8 w-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center shadow border border-gray-200 hover:bg-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  {mine && menuOpenId === m.id ? (
                    <div
                      ref={menuRef}
                      className="absolute z-10 right-0 top-9 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => beginEdit(m)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit message
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(m)}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}

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
        onSubmit={async (e) => {
          e.preventDefault();
          if (isEditingAny) {
            await saveEdit();
            return;
          }
          composer.onSend?.();
        }}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex items-center gap-3">
          <input
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              if (isEditingAny) setEditText(v);
              else composer.onChange?.(v);
            }}
            placeholder="Write a message"
            className="flex-1 rounded-md border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#008cfc] focus:border-[#008cfc]"
          />

          {isEditingAny ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="bg-[#008cfc] hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-md flex items-center gap-2 transition"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

export default WorkerChatWindow;
