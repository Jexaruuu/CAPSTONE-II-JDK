// WorkerSettingsSidebar.jsx
import React from "react";
import { User2, ShieldCheck, Bell } from "lucide-react";

export default function WorkerSettingsSidebar({ active, onChange }) {
  const Item = ({ id, icon: Icon, label }) => {
    const selected = active === id;
    return (
      <button
        onClick={() => onChange(id)}
        className={[
          "w-full flex items-center gap-3 rounded-xl border transition",
          "text-[15px] md:text-base px-3.5 py-2.5",
          selected
            ? "bg-[#008cfc] text-white border-[#008cfc]"
            : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
        <span className="truncate leading-5">{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-full">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 px-1 text-lg md:text-xl font-semibold text-gray-900 tracking-tight">
          Settings
        </div>
        <div className="space-y-2">
          <Item id="profile" icon={User2} label="My Information" />
          <Item id="security" icon={ShieldCheck} label="Password" />
          <button
            className={[
              "hidden",
              "w-full flex items-center gap-3 rounded-xl border bg-white text-gray-800 border-gray-200 opacity-60 cursor-not-allowed",
              "text-[15px] md:text-base px-3.5 py-2.5",
            ].join(" ")}
            disabled
            title="Coming soon"
          >
            <Bell className="h-5 w-5" />
            <span className="truncate leading-5">Notifications</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
