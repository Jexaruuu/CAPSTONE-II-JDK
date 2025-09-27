import React, { useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

export default function WorkerProfile() {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    barangay: "",
    tagline: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  const TAG_MAX = 80;

  const avatarUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return avatarFromName(`${form.first_name} ${form.last_name}`.trim());
  }, [avatarFile, form.first_name, form.last_name]);

  const validations = useMemo(() => {
    const firstOk = form.first_name.trim().length > 0;
    const lastOk = form.last_name.trim().length > 0;
    const email = form.email.trim();
    const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const digits = form.phone.replace(/\D/g, "");
    const phoneOk = !form.phone || digits.length === 10;
    const taglineOk = form.tagline.length <= TAG_MAX;
    const ok = firstOk && lastOk && emailOk && phoneOk && taglineOk;
    return { firstOk, lastOk, emailOk, phoneOk, taglineOk, ok };
  }, [form, TAG_MAX]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validations.ok) return;
    setSaving(true);
    setSaved(false);
    try {
      await axios.post(`${API_BASE}/api/account/profile`, form, { withCredentials: true });
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-600">Update your personal information.</p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="flex items-center gap-4">
            {/* Avatar placeholder slightly bigger now */}
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-gray-300 bg-gray-100">
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Choose Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => setAvatarFile(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="First Name"
            className={[
              "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2",
              validations.firstOk ? "border-gray-300 focus:ring-blue-500" : "border-red-500 focus:ring-red-400",
            ].join(" ")}
          />
          {!validations.firstOk && <p className="mt-1 text-xs text-red-600">First name is required.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="Last Name"
            className={[
              "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2",
              validations.lastOk ? "border-gray-300 focus:ring-blue-500" : "border-red-500 focus:ring-red-400",
            ].join(" ")}
          />
          {!validations.lastOk && <p className="mt-1 text-xs text-red-600">Last name is required.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className={[
              "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2",
              validations.emailOk ? "border-gray-300 focus:ring-blue-500" : "border-red-500 focus:ring-red-400",
            ].join(" ")}
          />
          {!validations.emailOk && <p className="mt-1 text-xs text-red-600">Enter a valid email.</p>}
          <p className="mt-1 text-xs text-gray-500">We’ll use this to send updates about your requests.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
          <div
            className={[
              "flex items-center border rounded-xl",
              validations.phoneOk || !form.phone ? "border-gray-300" : "border-red-500",
            ].join(" ")}
          >
            <div className="w-8 h-5 mr-2 rounded-md">
              <img
                src="philippines.png"
                alt="Philippine Flag"
                className="w-full h-full object-contain rounded-md ml-1"
              />
            </div>
            <span className="text-gray-700 text-sm mr-2">+63</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm({ ...form, phone: v });
              }}
              placeholder="9XXXXXXXXX"
              className="w-full px-4 py-3 border-l border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-xl"
              aria-invalid={!validations.phoneOk && !!form.phone}
            />
          </div>
          {!validations.phoneOk && !!form.phone && (
            <p className="text-xs text-red-600 mt-1">Enter a 10-digit PH mobile number (e.g., 9XXXXXXXXX).</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
          <input
            value={form.barangay}
            onChange={(e) => setForm({ ...form, barangay: e.target.value })}
            placeholder="Barangay"
            className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
          <input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value.slice(0, TAG_MAX) })}
            placeholder="A short description"
            className={[
              "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2",
              validations.taglineOk ? "border-gray-300 focus:ring-blue-500" : "border-red-500 focus:ring-red-400",
            ].join(" ")}
          />
          <div className="mt-1 flex items-center justify-between">
            {!validations.taglineOk ? <p className="text-xs text-red-600">Too long</p> : <span />}
            <p className="text-xs text-gray-500">{form.tagline.length}/{TAG_MAX}</p>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !validations.ok}
            className="rounded-md bg-[#008cfc] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </section>
  );
}
