import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

export default function ClientProfile() {
  const fileRef = useRef(null);
  const btnRef = useRef(null);
  const jdkRowRef = useRef(null);
  const gridRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

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
    date_of_birth: ""
  });

  const [base, setBase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [phoneEditCommitted, setPhoneEditCommitted] = useState(true);
  const [phoneErrorAfterDone, setPhoneErrorAfterDone] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savedSocial, setSavedSocial] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmScope, setConfirmScope] = useState(null);

  const [socialTouched, setSocialTouched] = useState({ facebook: false, instagram: false });
  const [facebookTaken, setFacebookTaken] = useState(false);
  const [instagramTaken, setInstagramTaken] = useState(false);

  const [editSocial, setEditSocial] = useState({ facebook: false, instagram: false });

  const [editingDob, setEditingDob] = useState(false);
  const [dobError, setDobError] = useState("");

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
        setAlignOffset(Math.max(0, Math.round(jTop - gTop)));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function computeAge(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a >= 0 && a <= 120 ? a : null;
  }

  useEffect(() => {
    const init = async () => {
      const appU = (() => {
        try {
          const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
          const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem("auth_uid") || "";
          const e = a.email || localStorage.getItem("client_email") || localStorage.getItem("email_address") || localStorage.getItem("email") || "";
          return encodeURIComponent(JSON.stringify({ r: "client", e, au }));
        } catch {}
        return "";
      })();
      try {
        const { data } = await axios.get(`${API_BASE}/api/account/me`, {
          withCredentials: true,
          headers: appU ? { "x-app-u": appU } : {}
        });
        setForm((f) => ({
          ...f,
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: data?.email_address || "",
          phone: data?.phone || "",
          facebook: data?.facebook || "",
          instagram: data?.instagram || "",
          date_of_birth: data?.date_of_birth ? String(data.date_of_birth).slice(0, 10) : ""
        }));
        setBase({
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: data?.email_address || "",
          phone: data?.phone || "",
          facebook: data?.facebook || "",
          instagram: data?.instagram || "",
          date_of_birth: data?.date_of_birth ? String(data.date_of_birth).slice(0, 10) : ""
        });
        localStorage.setItem("first_name", data?.first_name || "");
        localStorage.setItem("last_name", data?.last_name || "");
        if (data?.sex) localStorage.setItem("sex", data.sex);
        if (data?.avatar_url) localStorage.setItem("clientAvatarUrl", data.avatar_url);
        if (data?.created_at) {
          const t = new Date(data.created_at);
          setCreatedAt(t.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" }));
        }
        setAvatarBroken(!data?.avatar_url);
      } catch {
        const t = new Date();
        setCreatedAt(t.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" }));
      }
    };
    init();
  }, []);

  useEffect(() => {
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [confirmOpen]);

  const allowedPHPrefixes = useMemo(
    () => new Set([
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

  const isTriviallyFake = (d) => /^(\d)\1{9}$/.test(d) || ("9" + d).includes("0123456789") || ("9" + d).includes("9876543210") || new Set(d.split("")).size < 4;
  const isValidPHMobile = (d) => d.length === 10 && d[0] === "9" && !isTriviallyFake(d) && allowedPHPrefixes.has(d.slice(0,3));
  const isPhoneValid = !form.phone || isValidPHMobile(form.phone);
  const showPhoneError = editingPhone && phoneErrorAfterDone && !isPhoneValid && form.phone.length > 0;

  const storedAvatar = typeof window !== "undefined" ? localStorage.getItem("clientAvatarUrl") : "";
  const fullName = `${form.first_name} ${form.last_name}`.trim();
  const avatarUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    if (avatarRemoved) return "/Clienticon.png";
    if (storedAvatar) return storedAvatar;
    if (!avatarBroken) return "/Clienticon.png";
    return "/Clienticon.png";
  }, [avatarFile, avatarRemoved, avatarBroken, fullName, storedAvatar]);

  function createImage(src) {
    return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
  }

  async function fileToDataUrl(file) {
    try {
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = await createImage(objectUrl);
        const maxSide = 1200, w0 = img.naturalWidth || img.width || 1, h0 = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxSide / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
        const preferJpeg = file.type && /jpe?g/i.test(file.type);
        return canvas.toDataURL(preferJpeg ? "image/jpeg" : "image/png", preferJpeg ? 0.9 : 0.92);
      } finally { URL.revokeObjectURL(objectUrl); }
    } catch {
      return await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    }
  }

  function buildAppU() {
    try {
      const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem("auth_uid") || "";
      const e = a.email || localStorage.getItem("client_email") || localStorage.getItem("email_address") || localStorage.getItem("email") || "";
      return encodeURIComponent(JSON.stringify({ r: "client", e, au }));
    } catch {}
    return "";
  }

  function isValidFacebookUrl(url) {
    if (!url) return true;
    try {
      const u = new URL(url), host = u.hostname.toLowerCase();
      const okHost = host === "facebook.com" || host === "www.facebook.com" || host === "m.facebook.com" || host === "fb.com" || host === "www.fb.com";
      if (!okHost) return false;
      if (!u.pathname || u.pathname === "/") return false;
      if (u.pathname === "/profile.php") return u.searchParams.has("id") && /^\d+$/.test(u.searchParams.get("id"));
      return /^\/[A-Za-z0-9.]+\/?$/.test(u.pathname);
    } catch { return false; }
  }

  function isValidInstagramUrl(url) {
    if (!url) return true;
    try {
      const u = new URL(url), host = u.hostname.toLowerCase();
      const okHost = host === "instagram.com" || host === "www.instagram.com" || host === "m.instagram.com";
      if (!okHost) return false;
      if (!u.pathname || u.pathname === "/") return false;
      return /^\/[A-Za-z0-9._]+\/?$/.test(u.pathname);
    } catch { return false; }
  }

  function normalizeSocialUrl(u) {
    if (!u) return null;
    const s = String(u).trim();
    if (!s) return null;
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
      const url = new URL(withScheme);
      const host = url.hostname.toLowerCase();
      url.hostname = host;
      if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }

  function softValidFacebook(raw) {
    if (!raw) return true;
    const n = normalizeSocialUrl(raw);
    if (!n) return false;
    return isValidFacebookUrl(n);
  }

  function softValidInstagram(raw) {
    if (!raw) return true;
    const n = normalizeSocialUrl(raw);
    if (!n) return false;
    return isValidInstagramUrl(n);
  }

  const facebookValid = softValidFacebook(form.facebook);
  const instagramValid = softValidInstagram(form.instagram);

  const phoneDirty = useMemo(() => !!base && String(base.phone || "") !== String(form.phone || ""), [base, form.phone]);
  const facebookDirty = useMemo(() => !!base && String(base.facebook || "") !== String(form.facebook || ""), [base, form.facebook]);
  const instagramDirty = useMemo(() => !!base && String(base.instagram || "") !== String(form.instagram || ""), [base, form.instagram]);
  const dobDirty = useMemo(() => !!base && String(base.date_of_birth || "") !== String(form.date_of_birth || ""), [base, form.date_of_birth]);

  const socialDirty = facebookDirty || instagramDirty;
  const avatarDirty = !!avatarFile || avatarRemoved;

  const canSaveProfile = (avatarDirty || phoneDirty || dobDirty) && !savingProfile && (!phoneDirty || (isPhoneValid && !phoneTaken && phoneEditCommitted));

  const canSaveSocial = socialDirty && !savingSocial && facebookValid && instagramValid && !facebookTaken && !instagramTaken;

  const age = useMemo(() => computeAge(form.date_of_birth), [form.date_of_birth]);

  function validateDob(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    const now = new Date();
    if (d > now) return "Date cannot be in the future";
    const a = computeAge(iso);
    if (a == null) return "Invalid age";
    return "";
  }

  async function uploadAvatar(file) {
    try {
      const data_url = await fileToDataUrl(file);
      const appU = buildAppU();
      const { data } = await axios.post(`${API_BASE}/api/account/avatar`, { data_url }, { withCredentials: true, headers: { "Content-Type": "application/json", Accept: "application/json", ...(appU ? { "x-app-u": appU } : {}) } });
      const url = data?.avatar_url || "";
      if (url) { localStorage.setItem("clientAvatarUrl", url); window.dispatchEvent(new CustomEvent("client-avatar-updated", { detail: { url } })); }
      return url;
    } catch { return ""; }
  }

  async function removeAvatarServer() {
    try {
      const appU = buildAppU();
      const { data } = await axios.delete(`${API_BASE}/api/account/avatar`, { withCredentials: true, headers: appU ? { "x-app-u": appU } : {} });
      const url = data?.avatar_url || "";
      if (url === "" || url == null) { localStorage.removeItem("clientAvatarUrl"); window.dispatchEvent(new CustomEvent("client-avatar-updated", { detail: { url: "" } })); }
      return true;
    } catch { return false; }
  }

  const onSaveProfile = async () => {
    if (!canSaveProfile) return;
    setSavingProfile(true); setSaving(true); setSaved(false);
    try {
      if (avatarFile) {
        const u = await uploadAvatar(avatarFile);
        if (!u) setAvatarBroken(true);
        setAvatarFile(null); setAvatarRemoved(false);
      } else if (avatarRemoved) {
        await removeAvatarServer(); setAvatarRemoved(false); setAvatarBroken(true);
      }
      if (phoneDirty || dobDirty) {
        const payload = {};
        if (phoneDirty) payload.phone = form.phone || "";
        if (dobDirty) payload.date_of_birth = form.date_of_birth || null;
        const appU = buildAppU();
        const { data } = await axios.post(`${API_BASE}/api/account/profile`, payload, { withCredentials: true, headers: { "Content-Type": "application/json", ...(appU ? { "x-app-u": appU } : {}) } });
        setBase((b) => ({
          ...(b || {}),
          first_name: data?.first_name || form.first_name,
          last_name: data?.last_name || form.last_name,
          email: data?.email_address || form.email,
          phone: phoneDirty ? (data?.phone ?? payload.phone ?? "") : (b?.phone ?? form.phone),
          facebook: b?.facebook ?? form.facebook,
          instagram: b?.instagram ?? form.instagram,
          date_of_birth: dobDirty ? (data?.date_of_birth ? String(data.date_of_birth).slice(0,10) : payload.date_of_birth || "") : (b?.date_of_birth ?? form.date_of_birth)
        }));
        setPhoneTaken(false);
      }
      setSaved(true); setSavedProfile(true);
      setTimeout(() => { setSaved(false); setSavedProfile(false); }, 1500);
    } catch (err) {
      const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();
      if (msg.includes("contact number already in use")) { setPhoneTaken(true); setEditingPhone(true); setPhoneEditCommitted(false); }
    }
    setSavingProfile(false); setSaving(false);
  };

  const onSaveSocial = async () => {
    if (!socialDirty) return;
    setSocialTouched((t) => ({ facebook: t.facebook || facebookDirty, instagram: t.instagram || instagramDirty }));

    const payload = {};
    if (facebookDirty) {
      const nfb = normalizeSocialUrl(form.facebook);
      if (form.facebook && !nfb) { setSocialTouched((t)=>({ ...t, facebook: true })); return; }
      payload.facebook = nfb;
    }
    if (instagramDirty) {
      const nig = normalizeSocialUrl(form.instagram);
      if (form.instagram && !nig) { setSocialTouched((t)=>({ ...t, instagram: true })); return; }
      payload.instagram = nig;
    }

    const fbReady = !("facebook" in payload) || payload.facebook == null || isValidFacebookUrl(payload.facebook);
    const igReady = !("instagram" in payload) || payload.instagram == null || isValidInstagramUrl(payload.instagram);
    if (!fbReady || !igReady || savingSocial || facebookTaken || instagramTaken) return;

    setSavingSocial(true); setSaving(true); setSaved(false);
    try {
      const appU = buildAppU();
      const { data } = await axios.post(`${API_BASE}/api/account/profile`, payload, { withCredentials: true, headers: { "Content-Type": "application/json", Accept: "application/json", ...(appU ? { "x-app-u": appU } : {}) } });
      setBase((b) => ({
        ...(b || {}),
        first_name: data?.first_name || form.first_name,
        last_name: data?.last_name || form.last_name,
        email: data?.email_address || form.email,
        phone: b?.phone ?? form.phone,
        facebook: data?.facebook ?? payload.facebook ?? form.facebook,
        instagram: data?.instagram ?? payload.instagram ?? form.instagram,
        date_of_birth: b?.date_of_birth ?? form.date_of_birth
      }));
      setSaved(true); setSavedSocial(true);
      setFacebookTaken(false); setInstagramTaken(false);
      setEditSocial({ facebook: false, instagram: false });
      setTimeout(() => { setSaved(false); setSavedSocial(false); }, 1500);
    } catch (err) {
      const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();
      if (msg.includes("facebook")) setFacebookTaken(true);
      if (msg.includes("instagram")) setInstagramTaken(true);
      setSocialTouched((t)=>({ facebook: t.facebook || !!payload.facebook, instagram: t.instagram || !!payload.instagram }));
    }
    setSavingSocial(false); setSaving(false);
  };

  const openConfirm = (scope) => { setConfirmScope(scope); setConfirmOpen(true); };
  const confirmSave = async () => { if (confirmScope === "profile") await onSaveProfile(); else if (confirmScope === "social") await onSaveSocial(); setConfirmOpen(false); };
  const canModalSave = confirmScope === "profile" ? canSaveProfile : confirmScope === "social" ? canSaveSocial : false;

  const fbErr = (!facebookValid || facebookTaken) && (socialTouched.facebook);
  const igErr = (!instagramValid || instagramTaken) && (socialTouched.instagram);

  return (
    <main className="min-h-[65vh] pb-24 md:pb-2">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Personal Information</h2>
          <p className="text-sm text-gray-600">This is a client account</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Account Created:</div>
          <div ref={jdkRowRef} className="mt-1 flex items-center justify-end gap-2">
            <p className="text-sm text-gray-500">{createdAt || "—"}</p>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Active</span>
          </div>
        </div>
      </div>

      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 mb-5 relative">
        <div ref={gridRef} className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-[220px_1fr]">
          <div className="md:col-span-1">
            <div className="flex items-start md:items-center gap-4">
              <div className="flex flex-col items-center" style={{ width: avatarSize }}>
                <p className="text-sm md:text-base font-semibold text-gray-900 text-center mb-2">Profile Picture</p>
                <div className="rounded-full ring-2 ring-gray-300 bg-gray-100 overflow-hidden" style={{ width: avatarSize, height: avatarSize }}>
                  <img src={avatarUrl} alt="Avatar" onError={() => setAvatarBroken(true)} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-start gap-2">
              <button ref={btnRef} type="button" onClick={() => fileRef.current?.click()} className="flex-none rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition" style={{ width: btnFixedWidth }}>Choose Photo</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] || null; setAvatarFile(f); setAvatarRemoved(false); setAvatarBroken(false); }} />
              {(avatarFile || (!avatarFile && !avatarRemoved && (storedAvatar || !avatarBroken))) && (
                <button type="button" onClick={() => { setAvatarFile(null); setAvatarRemoved(true); setAvatarBroken(true); }} className="flex-none rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition" style={{ width: btnFixedWidth }}>Remove</button>
              )}
            </div>
          </div>

          <div className="md:col-span-1 flex items-start" style={{ marginTop: alignOffset }}>
            <div className="grid grid-cols-[280px_220px_240px] gap-8 lg:gap-10 xl:gap-12 md:ml-0 items-start">
              <div className="w-[280px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">First Name</p>
                <p className="mt-1 text-base text-gray-900">{form.first_name || "—"}</p>

                <div className="mt-6">
                  <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Date of Birth</p>
                  {!editingDob && (
                    <div className="mt-1">
                      {form.date_of_birth ? (
                        <p className="text-base text-gray-900">{new Date(form.date_of_birth).toLocaleDateString("en-PH")}</p>
                      ) : (
                        <p className="text-base text-gray-900">—</p>
                      )}
                    </div>
                  )}
                  {!form.date_of_birth && !editingDob && (
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" onClick={() => { setEditingDob(true); setDobError(""); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">+ Add date of birth</button>
                    </div>
                  )}
                  {form.date_of_birth && !editingDob && (
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" onClick={() => { setEditingDob(true); setDobError(""); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                      <button type="button" onClick={() => { setForm({ ...form, date_of_birth: "" }); setDobError(""); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                    </div>
                  )}
                  {editingDob && (
                    <div className="mt-3 w-[280px]">
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm({ ...form, date_of_birth: v });
                          setDobError(validateDob(v));
                        }}
                        className={`w-full px-4 py-2 h-10 border rounded-md outline-none ${dobError ? "border-red-500" : "border-gray-300"}`}
                        max={new Date().toISOString().slice(0,10)}
                      />
                      {dobError ? <div className="mt-2 text-xs text-red-600">{dobError}</div> : null}
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" onClick={() => { const err = validateDob(form.date_of_birth); if (err) { setDobError(err); return; } setEditingDob(false); }} className={`rounded-md px-4 text-sm font-medium transition h-10 ${dobError ? "bg-[#008cfc] text-white opacity-50 cursor-not-allowed" : "bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                        <button type="button" onClick={() => { setForm({ ...form, date_of_birth: base?.date_of_birth || "" }); setEditingDob(false); setDobError(""); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-[220px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Last Name</p>
                <p className="mt-1 text-base text-gray-900">{form.last_name || "—"}</p>

                <div className="mt-6">
                  <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Age</p>
                  <p className="mt-1 text-base text-gray-900">{age != null ? `${age}` : "—"}</p>
                </div>
              </div>

              <div className="w-[240px] shrink-0">
                <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Email</p>
                <p className="mt-1 text-base text-gray-900">{form.email || "—"}</p>

                <div className="mt-6 min-h-[170px]">
                  <p className="text-sm uppercase tracking-wide font-semibold text-gray-900">Contact Number</p>
                  {!editingPhone && (
                    <div className="mt-1">
                      {form.phone && !phoneTaken ? (
                        <div className="inline-flex items-center gap-2">
                          <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
                          <span className="text-gray-700 text-sm">+63</span>
                          <span className="text-base text-gray-900 tracking-wide">{form.phone}</span>
                        </div>
                      ) : <p className="text-base text-gray-900">—</p>}
                    </div>
                  )}
                  {(!form.phone || phoneTaken) && !editingPhone && (
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" onClick={() => { setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">+ Add contact number</button>
                    </div>
                  )}
                  {form.phone && !phoneTaken && !editingPhone && (
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" onClick={() => { setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                      <button type="button" onClick={() => { setForm({ ...form, phone: "" }); setPhoneTaken(false); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                    </div>
                  )}
                  {(editingPhone || !!form.phone) && editingPhone && (
                    <div className="mt-3 w-[240px]">
                      <div className={`flex items-center rounded-md border ${showPhoneError || phoneTaken ? "border-red-500" : "border-gray-300"} overflow-hidden pl-3 pr-4 w-full h-10`}>
                        <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm mr-2 object-cover" />
                        <span className="text-gray-700 text-sm mr-3">+63</span>
                        <span className="h-6 w-px bg-gray-200 mr-3" />
                        <input type="tel" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }); setPhoneTaken(false); }} placeholder="9XXXXXXXXX" className="w-full outline-none text-sm placeholder:text-gray-400 h-full" />
                      </div>
                      {showPhoneError && <div className="mt-2 text-xs text-red-600">Enter a valid PH mobile number with a real prefix (e.g., 9XXXXXXXXX).</div>}
                      {phoneTaken && <div className="mt-2 text-xs text-red-600">Contact number already in use.</div>}
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" onClick={() => { if (!isPhoneValid || phoneTaken) { setPhoneErrorAfterDone(true); return; } setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className={`rounded-md px-4 text-sm font-medium transition h-10 ${!isPhoneValid || phoneTaken ? "bg-[#008cfc] text-white opacity-50 cursor-not-allowed" : "bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                        <button type="button" onClick={() => { setForm({ ...form, phone: base?.phone || "" }); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); setPhoneTaken(false); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {savedProfile ? <span className="text-sm text-blue-700">Saved</span> : null}
          <button type="button" disabled={!canSaveProfile} onClick={() => openConfirm("profile")} className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${canSaveProfile ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingProfile ? "Saving..." : "Confirm"}</button>
        </div>
      </section>

      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
        </div>

        <div className="grid grid-cols-[220px_1fr_220px] gap-6">
          <div className="col-span-3 grid grid-cols-subgrid items-start">
            <div className="flex items-center gap-2">
              <FaFacebookF className="text-blue-600" />
              <span className="text-sm uppercase tracking-wide font-semibold text-gray-900">Facebook</span>
            </div>
            <div>
              {!base?.facebook || editSocial.facebook ? (
                <>
                  <input
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={form.facebook}
                    onChange={(e) => { setForm({ ...form, facebook: e.target.value }); setFacebookTaken(false); }}
                    onBlur={() => setSocialTouched((s) => ({ ...s, facebook: true }))}
                    className={`w-full px-4 py-2 h-11 border rounded-xl focus:outline-none focus:ring-2 ${fbErr ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                  />
                  {fbErr && <div className="mt-1 text-xs text-red-600">Enter a valid Facebook profile URL.</div>}
                </>
              ) : (
                <a href={base.facebook} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.facebook}</a>
              )}
            </div>
            <div className="flex items-center gap-3 justify-end">
              {!base?.facebook || editSocial.facebook ? (
                base?.facebook ? (
                  <button type="button" onClick={() => { setEditSocial((s)=>({ ...s, facebook: false })); setForm((f)=>({ ...f, facebook: base.facebook })); setFacebookTaken(false); setSocialTouched((t)=>({ ...t, facebook: false })); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                ) : null
              ) : (
                <>
                  <button type="button" onClick={() => { setEditSocial((s)=>({ ...s, facebook: true })); setSocialTouched((t)=>({ ...t, facebook: false })); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                  <button type="button" onClick={() => { setForm((f)=>({ ...f, facebook: "" })); setEditSocial((s)=>({ ...s, facebook: true })); setSocialTouched((t)=>({ ...t, facebook: true })); setFacebookTaken(false); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                </>
              )}
            </div>
          </div>

          <div className="col-span-3 h-px bg-gray-200" />

          <div className="col-span-3 grid grid-cols-subgrid items-start">
            <div className="flex items-center gap-2">
              <FaInstagram className="text-pink-500" />
              <span className="text-sm uppercase tracking-wide font-semibold text-gray-900">Instagram</span>
            </div>
            <div>
              {!base?.instagram || editSocial.instagram ? (
                <>
                  <input
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={form.instagram}
                    onChange={(e) => { setForm({ ...form, instagram: e.target.value }); setInstagramTaken(false); }}
                    onBlur={() => setSocialTouched((s) => ({ ...s, instagram: true }))}
                    className={`w-full px-4 py-2 h-11 border rounded-xl focus:outline-none focus:ring-2 ${igErr ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                  />
                  {igErr && <div className="mt-1 text-xs text-red-600">Enter a valid Instagram profile URL.</div>}
                </>
              ) : (
                <a href={base.instagram} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.instagram}</a>
              )}
            </div>
            <div className="flex items-center gap-3 justify-end">
              {!base?.instagram || editSocial.instagram ? (
                base?.instagram ? (
                  <button type="button" onClick={() => { setEditSocial((s)=>({ ...s, instagram: false })); setForm((f)=>({ ...f, instagram: base.instagram })); setInstagramTaken(false); setSocialTouched((t)=>({ ...t, instagram: false })); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                ) : null
              ) : (
                <>
                  <button type="button" onClick={() => { setEditSocial((s)=>({ ...s, instagram: true })); setSocialTouched((t)=>({ ...t, instagram: false })); }} className="inline-flex items-center justify-center rounded-md border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                  <button type="button" onClick={() => { setForm((f)=>({ ...f, instagram: "" })); setEditSocial((s)=>({ ...s, instagram: true })); setSocialTouched((t)=>({ ...t, instagram: true })); setInstagramTaken(false); }} className="inline-flex items-center justify-center rounded-md border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {savedSocial ? <span className="text-sm text-blue-700">Saved</span> : null}
          <button type="button" disabled={!canSaveSocial} onClick={() => openConfirm("social")} className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${canSaveSocial ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingSocial ? "Saving..." : "Confirm"}</button>
        </div>
      </section>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-[101] w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900">Save changes?</h4>
            <p className="mt-1 text-sm text-gray-600">Are you sure saving these changes?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={!canModalSave} onClick={() => { if (canModalSave) confirmSave(); }} className={`rounded-md px-5 py-2 text-sm font-medium transition ${canModalSave ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>
                {confirmScope === "profile" ? (savingProfile ? "Saving..." : "Save") : (savingSocial ? "Saving..." : "Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
