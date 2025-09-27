import React, { useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WorkerSecurity() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const rules = useMemo(() => {
    const v = form.new_password || "";
    const len = v.length >= 8;
    const upper = /[A-Z]/.test(v);
    const num = /\d/.test(v);
    const special = /[^A-Za-z0-9]/.test(v);
    const match = form.new_password && form.new_password === form.confirm_password;
    const score = [len, upper, num, special].filter(Boolean).length;
    return { len, upper, num, special, match, score };
  }, [form.new_password, form.confirm_password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.new_password || form.new_password !== form.confirm_password) return;
    setSaving(true);
    setSaved(false);
    try {
      await axios.post(`${API_BASE}/api/account/password`, form, { withCredentials: true });
      setSaved(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch {}
    setSaving(false);
  };

  const disabled = saving || !rules.len || !rules.upper || !rules.num || !rules.match;

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Password</h2>
        <p className="text-gray-500 text-sm">Change your password.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Current password</label>
            <div className="relative">
              <input
                type={show.current ? "text" : "password"}
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500"
              >
                {show.current ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <div className="relative">
              <input
                type={show.next ? "text" : "password"}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500"
              >
                {show.next ? "Hide" : "Show"}
              </button>
            </div>

            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={[
                    "h-full transition-all",
                    rules.score <= 1
                      ? "bg-red-500 w-1/4"
                      : rules.score === 2
                      ? "bg-amber-500 w-2/4"
                      : rules.score === 3
                      ? "bg-yellow-500 w-3/4"
                      : "bg-emerald-500 w-full",
                  ].join(" ")}
                />
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <li className={rules.len ? "text-emerald-600" : "text-gray-500"}>At least 8 characters</li>
                <li className={rules.upper ? "text-emerald-600" : "text-gray-500"}>One uppercase letter</li>
                <li className={rules.num ? "text-emerald-600" : "text-gray-500"}>One number</li>
                <li className={rules.special ? "text-emerald-600" : "text-gray-500"}>One special character</li>
              </ul>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <div className="relative">
              <input
                type={show.confirm ? "text" : "password"}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className={[
                  "w-full rounded-md border bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2",
                  rules.match || !form.confirm_password
                    ? "border-gray-300 focus:ring-[#008cfc]"
                    : "border-red-300 focus:ring-red-400",
                ].join(" ")}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500"
              >
                {show.confirm ? "Hide" : "Show"}
              </button>
            </div>
            {!rules.match && form.confirm_password ? (
              <p className="text-xs text-red-600">Passwords do not match</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={disabled}
              className="rounded-md bg-[#008cfc] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {saving ? "Saving..." : "Update Password"}
            </button>
            {saved && <span className="text-sm text-emerald-600">Updated</span>}
          </div>
        </form>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Keep your account secure</h3>
            <p className="text-sm text-gray-500">Best practices and quick actions.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-800 mb-2">Password checklist</div>
              <ul className="space-y-1 text-sm">
                <li className={rules.len ? "text-emerald-600" : "text-gray-600"}>8+ characters</li>
                <li className={rules.upper ? "text-emerald-600" : "text-gray-600"}>Uppercase letter</li>
                <li className={rules.num ? "text-emerald-600" : "text-gray-600"}>Number</li>
                <li className={rules.special ? "text-emerald-600" : "text-gray-600"}>Special character</li>
                <li className={rules.match ? "text-emerald-600" : "text-gray-600"}>Passwords match</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-800 mb-1">Tips</div>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Avoid reusing passwords across different websites.</li>
                <li>Don’t share your password with anyone.</li>
                <li>Update your password regularly.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
