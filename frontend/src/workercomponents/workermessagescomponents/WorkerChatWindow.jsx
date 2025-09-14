import React from "react";
import { MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";

const Bubble = ({ mine, text, time }) => (
  <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-2`}>
    <div
      className={[
        "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
        mine ? "bg-[#008cfc] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md",
      ].join(" ")}
    >
      <p className="whitespace-pre-wrap break-words">{text}</p>
      <div className={`text-[11px] mt-1 ${mine ? "text-white/80" : "text-gray-500"}`}>
        {time}
      </div>
    </div>
  </div>
);

const WorkerChatWindow = ({
  conversation,
  messages = [],
  loading = false,
  composer = { text: "", onChange: () => {}, onSend: () => {} },
}) => {
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
          <p className="text-xs text-gray-500 leading-4">
            {conversation.subtitle || "Online"}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {loading ? (
          <div className="text-sm text-gray-500">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <Bubble key={m.id} mine={m.mine} text={m.text} time={m.time} />
          ))
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
