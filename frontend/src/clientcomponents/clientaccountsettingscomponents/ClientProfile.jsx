import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

export default function WorkerProfile() {
  const fileRef = useRef(null);
  const btnRef = useRef(null);
  const jdkRowRef = useRef(null);
  const gridRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarSize, setAvatarSize] = useState(80);
  const [alignOffset, setAlignOffset] = useState(0);
  const [btnFixedWidth, setBtnFixedWidth] = useState(140);
  const [editingPhone, setEditingPhone] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    facebook: "",
    instagram: "",
    linkedin: "",
  });

  const [base, setBase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    const update = () => {
      if (btnRef.current) {
        const w = Math.max(120, Math.round(btnRef.current.offsetWidth || 0));
        setBtnFixedWidth(w);
        setAvatarSize(w);
      }
      if (jdkRowRef.current && gridRef.current) {
        const gTop = gridRef.current.getBoundingClientRect().top;
        const jTop = jdkRowRef.current.getBoundingClientRect().top;
        const offset = Math.max(0, Math.round(jTop - gTop));
        setAlignOffset(offset);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/account/me`, { withCredentials: true });
        setForm((f) => ({
          ...f,
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: data?.email_address || "",
          phone: data?.phone || "",
          facebook: data?.facebook || "",
          instagram: data?.instagram || "",
          linkedin: data?.linkedin || ""
        }));
        setBase({
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: data?.email_address || "",
          phone: data?.phone || "",
          facebook: data?.facebook || "",
          instagram: data?.instagram || "",
          linkedin: data?.linkedin || ""
        });
        localStorage.setItem("first_name", data?.first_name || "");
        localStorage.setItem("last_name", data?.last_name || "");
        if (data?.sex) localStorage.setItem("sex", data.sex);
        if (data?.avatar_url) localStorage.setItem("clientAvatarUrl", data.avatar_url);
        if (data?.created_at) {
          const t = new Date(data.created_at);
          const s = t.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" });
          setCreatedAt(s);
        }
        setAvatarBroken(!data?.avatar_url);
      } catch {
        const t = new Date();
        setCreatedAt(t.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" }));
      }
    };
    init();
  }, []);

  const allowedPHPrefixes = useMemo(
    () =>
      new Set([
        "905","906","907","908","909","910","912","913","914","915","916","917","918","919",
        "920","921","922","923","925","926","927","928","929",
        "930","931","932","933","934","935","936","937","938","939",
        "940","941","942","943","944","945","946","947","948","949",
        "950","951","952","953","954","955","956","957","958","959",
        "960","961","962","963","964","965","966","967","968","969",
        "970","971","972","973","974","975","976","977","978","979",
        "980","981","982","983","984","985","986","987","988","989",
        "990","991","992","993","994","995","996","997","998","999",
      ]),
    []
  );

  const isTriviallyFake = (d) => {
    if (/^(\d)\1{9}$/.test(d)) return true;
    const asc = "0123456789";
    const desc = "9876543210";
    if (("9" + d).includes(asc) || ("9" + d).includes(desc)) return true;
    const uniq = new Set(d.split(""));
    return uniq.size < 4;
  };

  const isValidPHMobile = (d) => {
    if (d.length !== 10) return false;
    if (d[0] !== "9") return false;
    if (isTriviallyFake(d)) return false;
    const p = d.slice(0, 3);
    return allowedPHPrefixes.has(p);
  };

  const isPhoneValid = !form.phone || isValidPHMobile(form.phone);
  const showPhoneError = editingPhone && form.phone.length > 0 && !isPhoneValid;

  const storedAvatar = typeof window !== "undefined" ? localStorage.getItem("clientAvatarUrl") : "";
  const avatarUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    if (storedAvatar) return storedAvatar;
    if (!avatarBroken) return "/Clienticon.png";
    return avatarFromName(`${form.first_name} ${form.last_name}`.trim());
  }, [avatarFile, avatarBroken, form.first_name, form.last_name, storedAvatar]);

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function uploadAvatar(file) {
    const data_url = await fileToDataUrl(file);
    const { data } = await axios.post(`${API_BASE}/api/account/avatar`, { data_url }, { withCredentials: true });
    const url = data?.avatar_url || "";
    if (url) {
      localStorage.setItem("clientAvatarUrl", url);
      window.dispatchEvent(new CustomEvent("client-avatar-updated", { detail: { url } }));
    }
    return url;
  }

  const dirty = useMemo(() => {
    if (!base) return false;
    const keys = ["phone","facebook","instagram","linkedin"];
    return keys.some(k => String(base[k] || "") !== String(form[k] || ""));
  }, [base, form.phone, form.facebook, form.instagram, form.linkedin]);

  const canSave = dirty && !saving && isPhoneValid;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        phone: form.phone || "",
        facebook: form.facebook || "",
        instagram: form.instagram || "",
        linkedin: form.linkedin || ""
      };
      const { data } = await axios.post(`${API_BASE}/api/account/profile`, payload, { withCredentials: true });
      setBase({
        first_name: data?.first_name || form.first_name,
        last_name: data?.last_name || form.last_name,
        email: data?.email_address || form.email,
        phone: data?.phone || payload.phone,
        facebook: data?.facebook || payload.facebook,
        instagram: data?.instagram || payload.instagram,
        linkedin: data?.linkedin || payload.linkedin
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
    setSaving(false);
  };

  return (
    <main className="min-h-[65vh] pb-24 md:pb-32">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Personal Information</h2>
          <p className="text-sm text-gray-600">This is a client account</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Account Created:</div>
          <div ref={jdkRowRef} className="mt-1 flex items-center justify-end gap-2">
            <p className="text-sm text-gray-500">{createdAt || "—"}</p>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Active
            </span>
          </div>
        </div>
      </div>

      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 mb-5 relative">
        <div ref={gridRef} className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-[220px_1fr]">
          <div className="md:col-span-1">
            <div className="flex items-start md:items-center gap-4">
              <div className="flex flex-col items-center" style={{ width: avatarSize }}>
                <p className="text-sm md:text-base font-semibold text-gray-900 text-center mb-2">
                  Profile Picture
                </p>
                <div
                  className="rounded-full ring-2 ring-gray-300 bg-gray-100 overflow-hidden"
                  style={{ width: avatarSize, height: avatarSize }}
                >
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    onError={() => setAvatarBroken(true)}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-start gap-2">
              <button
                ref={btnRef}
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-none rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                style={{ width: btnFixedWidth }}
              >
                Choose Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0] || null;
                  setAvatarFile(f);
                  setAvatarBroken(false);
                  if (f) {
                    const url = await uploadAvatar(f);
                    setAvatarFile(null);
                    if (!url) setAvatarBroken(true);
                  }
                }}
              />
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarBroken(false);
                  }}
                  className="flex-none rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  style={{ width: btnFixedWidth }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-1 flex items-start" style={{ marginTop: alignOffset }}>
            <div className="grid grid-cols-[280px_220px_240px] gap-8 lg:gap-10 xl:gap-12 md:ml-0 items-start">
              <div className="w-[280px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">First Name</p>
                <p className="mt-1 text-base text-gray-900">{form.first_name || "—"}</p>

                <div className="mt-6 min-h-[170px]">
                  <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Contact Number</p>

                  {!editingPhone && (
                    <div className="mt-1">
                      {form.phone ? (
                        <div className="inline-flex items-center gap-2">
                          <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
                          <span className="text-gray-700 text-sm">+63</span>
                          <span className="text-base text-gray-900 tracking-wide">{form.phone}</span>
                        </div>
                      ) : (
                        <p className="text-base text-gray-900">—</p>
                      )}
                    </div>
                  )}

                  {!form.phone && !editingPhone && (
                    <button
                      type="button"
                      onClick={() => setEditingPhone(true)}
                      className="mt-3 inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50"
                    >
                      + Add contact number
                    </button>
                  )}

                  {form.phone && !editingPhone && (
                    <button
                      type="button"
                      onClick={() => setEditingPhone(true)}
                      className="mt-3 inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50"
                    >
                      Change
                    </button>
                  )}

                  {(editingPhone || !!form.phone) && editingPhone && (
                    <div className="mt-3 w-[280px]">
                      <div className={`flex items-center rounded-md border ${showPhoneError ? "border-red-500" : "border-gray-300"} overflow-hidden pl-3 pr-4 w-full h-10`}>
                        <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm mr-2 object-cover" />
                        <span className="text-gray-700 text-sm mr-3">+63</span>
                        <span className="h-6 w-px bg-gray-200 mr-3" />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                            })
                          }
                          placeholder="9XXXXXXXXX"
                          className="w-full outline-none text-sm placeholder:text-gray-400 h-full"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingPhone(false)}
                          disabled={!isPhoneValid}
                          className={`rounded-md px-4 text-sm font-medium transition h-10 ${isPhoneValid ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-50 cursor-not-allowed"}`}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPhone(false)}
                          className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {showPhoneError && (
                    <div className="mt-2 text-xs text-red-600">
                      Enter a valid PH mobile number with a real prefix (e.g., 9XXXXXXXXX).
                    </div>
                  )}
                </div>
              </div>

              <div className="w-[220px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Last Name</p>
                <p className="mt-1 text-base text-gray-900">{form.last_name || "—"}</p>
              </div>

              <div className="w-[240px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Email</p>
                <p className="mt-1 text-base text-gray-900">{form.email || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
          <p className="text-sm text-gray-600">Please provide your social media links.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FaFacebookF className="text-blue-600" />
            <input
              type="url"
              placeholder="Facebook Link"
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <FaInstagram className="text-pink-500" />
            <input
              type="url"
              placeholder="Instagram Link"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved ? <span className="text-sm text-emerald-600">Saved</span> : null}
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${canSave ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </main>
  );
}
