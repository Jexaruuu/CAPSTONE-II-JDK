// WorkerSecurity.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WorkerSecurity() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = confirmOpen || reauthOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [confirmOpen, reauthOpen]);

  const rules = useMemo(() => {
    const v = form.new_password || "";
    const len = v.length >= 12, upper = /[A-Z]/.test(v), num = /\d/.test(v), special = /[^A-Za-z0-9]/.test(v);
    const match = form.new_password && form.new_password === form.confirm_password;
    const score = [len, upper, num, special].filter(Boolean).length;
    return { len, upper, num, special, match, score };
  }, [form.new_password, form.confirm_password]);

  const disabled = saving || !rules.len || !rules.upper || !rules.num || !rules.match;

  const appU = useMemo(() => { try{ const a=JSON.parse(localStorage.getItem("workerAuth")||"{}"); const au=a.auth_uid||a.authUid||a.uid||a.id||localStorage.getItem("auth_uid")||""; const e=a.email||localStorage.getItem("worker_email")||localStorage.getItem("email_address")||localStorage.getItem("email")||""; return encodeURIComponent(JSON.stringify({ r:"worker", e, au })); }catch{return"";} }, []);
  const headersWithU = useMemo(()=> appU?{ "x-app-u":appU }:{},[appU]);

  const clearWorkerStorage = () => {
    localStorage.removeItem("workerAuth");
    localStorage.removeItem("worker_email");
    localStorage.removeItem("workerAvatarUrl");
    localStorage.removeItem("auth_uid");
    localStorage.removeItem("email_address");
    localStorage.removeItem("email");
    localStorage.removeItem("first_name");
    localStorage.removeItem("last_name");
    localStorage.removeItem("role");
  };

  const doUpdate = async () => {
    if (!form.new_password || form.new_password !== form.confirm_password) return;
    setSaving(true); setSaved(false);
    try {
      await axios.post(`${API_BASE}/api/workers/password`, form, { withCredentials: true, headers: headersWithU });
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setConfirmOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      clearWorkerStorage();
      setReauthOpen(true);
    } catch {}
    setSaving(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const signOutAndGoHome = async () => {
    try { await axios.post(`${API_BASE}/api/logout`, {}, { withCredentials: true }); } catch {}
    clearWorkerStorage();
    setReauthOpen(false);
    window.location.href = "/HomePage";
  };

  return (
    <main className="min-h-[65vh] pb-24 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 md:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-[22px] md:text-3xl font-semibold text-gray-900 tracking-tight">Password</h2>
              <p className="mt-1 text-sm text-gray-600">Change your password.</p>
            </div>
          </div>
        </div>

        <section className="w-full rounded-2xl border border-gray-100 bg-white p-6 md:p-7 mb-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-900">Current password</label>
                <div className="relative">
                  <input
                    type={show.current ? "text" : "password"}
                    value={form.current_password}
                    onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
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
                <label className="block text-sm font-semibold text-gray-900">New password</label>
                <div className="relative">
                  <input
                    type={show.next ? "text" : "password"}
                    value={form.new_password}
                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
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
                        ((!form.new_password ? 0 : [/[A-Z]/.test(form.new_password), /\d/.test(form.new_password), /[^A-Za-z0-9]/.test(form.new_password), (form.new_password || "").length >= 12].filter(Boolean).length) <= 1) ? "bg-red-500 w-1/4" :
                        ([/[A-Z]/.test(form.new_password), /\d/.test(form.new_password), /[^A-Za-z0-9]/.test(form.new_password), (form.new_password || "").length >= 12].filter(Boolean).length === 2) ? "bg-amber-500 w-2/4" :
                        ([/[A-Z]/.test(form.new_password), /\d/.test(form.new_password), /[^A-Za-z0-9]/.test(form.new_password), (form.new_password || "").length >= 12].filter(Boolean).length === 3) ? "bg-yellow-500 w-3/4" :
                        "bg-emerald-500 w-full",
                      ].join(" ")}
                    />
                  </div>
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <li className={(form.new_password || "").length >= 12 ? "text-emerald-600" : "text-gray-500"}>At least 12 characters</li>
                    <li className={/[A-Z]/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-500"}>One uppercase letter</li>
                    <li className={/\d/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-500"}>One number</li>
                    <li className={/[^A-Za-z0-9]/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-500"}>One special character</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-900">Confirm new password</label>
                <div className="relative">
                  <input
                    type={show.confirm ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className={[
                      "w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2",
                      (form.new_password && form.new_password === form.confirm_password) || !form.confirm_password ? "border-gray-200 focus:ring-[#008cfc]" : "border-red-300 focus:ring-red-400",
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
                {!(form.new_password && form.new_password === form.confirm_password) && form.confirm_password ? <p className="text-xs text-red-600">Passwords do not match</p> : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={disabled}
                  className="rounded-xl bg-[#008cfc] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {saving ? "Saving..." : "Update Password"}
                </button>
                {saved && <span className="text-sm text-blue-700">Updated</span>}
              </div>
            </form>

            <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">Keep your account secure</h3>
                <p className="text-sm text-gray-500">Best practices and quick actions.</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-800 mb-2">Password checklist</div>
                  <ul className="space-y-1 text-sm">
                    <li className={(form.new_password || "").length >= 12 ? "text-emerald-600" : "text-gray-600"}>12+ characters</li>
                    <li className={/[A-Z]/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-600"}>Uppercase letter</li>
                    <li className={/\d/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-600"}>Number</li>
                    <li className={/[^A-Za-z0-9]/.test(form.new_password || "") ? "text-emerald-600" : "text-gray-600"}>Special character</li>
                    <li className={(form.new_password && form.new_password === form.confirm_password) ? "text-emerald-600" : "text-gray-600"}>Passwords match</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
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
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-[10000] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900">Update password?</h4>
            <p className="mt-1 text-sm text-gray-600">Are you sure you want to save this new password?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={disabled} onClick={doUpdate} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${!disabled ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {reauthOpen ? (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center">
          <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm" />
          <div className="relative z-[10002] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900">Sign in required</h4>
            <p className="mt-1 text-sm text-gray-600">Your password was changed. Please log in again.</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={signOutAndGoHome}
                className="rounded-xl px-5 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
