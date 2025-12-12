import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WorkerViewRequest({ open, onClose, request, onApply }) {
  const [fetched, setFetched] = useState(null);
  const [checkingApply, setCheckingApply] = useState(false);
  const [showNoApproved, setShowNoApproved] = useState(false);
  const [showTypeMismatch, setShowTypeMismatch] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [approvedTypes, setApprovedTypes] = useState([]);
  const [hasApproved, setHasApproved] = useState(false);
  const [approvedApp, setApprovedApp] = useState(null);

  const base = request || {};
  const info = base.info || {};
  const emailGuess = base.client_email || info.email_address || base.email || base.email_address || base.emailAddress || "";
  const gidGuess = base.request_group_id || base.requestGroupId || base.requestGroupID || base.group_id || base.groupId || "";

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au =
        a.auth_uid ||
        a.authUid ||
        a.uid ||
        a.id ||
        localStorage.getItem('auth_uid') ||
        '';
      const e =
        a.email ||
        localStorage.getItem('worker_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        '';
      return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
    } catch {
      return '';
    }
  }, []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!open) return;
      let gid = gidGuess;
      if (!gid && emailGuess) {
        try {
          const res = await axios.get(`${API_BASE}/api/clientservicerequests/last`, { params: { email: emailGuess } });
          gid = res.data?.request_group_id || "";
        } catch {}
      }
      let full = null;
      if (gid) {
        try {
          const res = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${gid}`);
          full = res.data || null;
        } catch {}
      }
      let gender = base.gender || info.sex || info.gender || "";
      if (!gender && full) {
        const ii = full.info || {};
        const dd = full.details || full.work || {};
        gender = ii.sex || ii.gender || dd.sex || dd.gender || "";
      }
      if (!gender && (base.client_auth_uid || base.auth_uid || base.authUid || emailGuess)) {
        try {
          const res = await axios.get(`${API_BASE}/api/clients/public/sex`, { params: { email: emailGuess || "", auth_uid: base.client_auth_uid || base.auth_uid || base.authUid || "" } });
          gender = res.data?.sex || "";
        } catch {}
      }
      if (!cancel) {
        setFetched(full ? { ...full, gender } : gender ? { gender } : null);
      }
    }
    load();
    return () => { cancel = true };
  }, [open, gidGuess, emailGuess, base.auth_uid, base.authUid, base.client_auth_uid]);

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    if (open) {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (sw > 0) body.style.paddingRight = `${sw}px`;
    } else {
      body.style.overflow = prevOverflow || "";
      body.style.paddingRight = prevPaddingRight || "";
    }
    return () => {
      body.style.overflow = prevOverflow || "";
      body.style.paddingRight = prevPaddingRight || "";
    };
  }, [open]);

  useEffect(() => {
    if (!btnLoading) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [btnLoading]);

  const iconFor = (s) => {
    const k = String(s || "").toLowerCase();
    if (k.includes("elect")) return Zap;
    if (k.includes("plumb")) return Wrench;
    if (k.includes("car wash") || k.includes("carwash") || k.includes("auto") || k.includes("carwasher")) return Car;
    if (k.includes("laund") || k.includes("clean")) return Shirt;
    if (k.includes("carpent") || k.includes("wood")) return Hammer;
    return Hammer;
  };

  const merged = useMemo(() => {
    if (!fetched) return base;
    const i = fetched.info || {};
    const d = fetched.details || fetched.work || {};
    const r = fetched.rate || {};
    const withGender = fetched.gender ? { gender: fetched.gender } : {};
    return {
      ...base,
      info: { ...(base.info || {}), ...i },
      details: { ...(base.details || base.work || {}), ...d },
      rate: { ...(base.rate || {}), ...r },
      ...withGender
    };
  }, [base, fetched]);

  const w = merged || {};
  const i = w.info || w;
  const d = w.details || w.work || w;
  const r = w.rate || w;

  const serviceTypes = (() => {
    const out = [];
    const add = (val) => {
      if (val == null) return;
      if (Array.isArray(val)) { val.forEach(add); return; }
      if (typeof val === "object") {
        const lbl = val.category || val.name || val.type || val.label;
        if (lbl) add(lbl);
        if (Array.isArray(val.types)) val.types.forEach(add);
        if (Array.isArray(val.items)) val.items.forEach(add);
        if (Array.isArray(val.services)) val.services.forEach(add);
        return;
      }
      String(val).split(/[,/|]+/).forEach(s => { s = s.trim(); if (s) out.push(s); });
    };
    add(d.service_types ?? d.service_type ?? d.serviceTypes ?? d.serviceType);
    add(w.service_types ?? w.service_type ?? w.serviceTypes ?? w.serviceType);
    if (Array.isArray(w.serviceTypeList)) out.push(...w.serviceTypeList);
    return [...new Set(out)];
  })();
  const serviceTasks = (() => {
    const out = [];
    const add = (val) => {
      if (val == null) return;
      if (Array.isArray(val)) { val.forEach(add); return; }
      if (typeof val === 'object') {
        if (Array.isArray(val.tasks)) val.tasks.forEach(add);
        else Object.values(val).forEach(add);
        return;
      }
      String(val).split(/[,/|]+/).forEach(s => { s = s.trim(); if (s) out.push(s); });
    };
    add(d.service_task ?? w.service_task ?? w.serviceTask);
    if (Array.isArray(w.serviceTaskList)) out.push(...w.serviceTaskList);
    return [...new Set(out)];
  })();
  const avatar = i.profile_picture_url || w.client_image || w.image || w.avatar || "/Clienticon.png";

  const barangay = i.barangay || d.barangay || "";
  const street = i.street || d.street || "";
  const additionalAddress = i.additional_address || d.additional_address || "";
  const age = Number.isFinite(i.age) ? i.age : (Number.isFinite(w.age) ? w.age : null);
  const genderRaw = w.gender || w.sex || i.sex || i.gender || d.sex || d.gender || "";
  const gender = (() => {
    const g = String(genderRaw || "").trim();
    const u = g.toUpperCase();
    if (!g) return "";
    if (u === "M" || u === "MALE") return "Male";
    if (u === "F" || u === "FEMALE") return "Female";
    return g;
  })();
  const yearsExp = Number.isFinite(d.years_experience) ? d.years_experience : null;

  const canonRateType = (t) => {
    const s = String(t || "").toLowerCase().replace(/\s+/g, " ").replace(/_/g, " ").trim();
    if (!s) return "";
    if (s.includes("hour") || s === "range" || s === "ranged") return "Hourly Rate";
    if (s.includes("job") || s.includes("fixed") || s.includes("flat") || s.includes("project") || s.includes("task")) return "By the Job Rate";
    if (s === "by the job rate") return "By the Job Rate";
    return "";
  };

  const rateTypeRaw = r.rate_type || r.rateType || d.rate_type || d.rateType || "";
  const rateType = (() => {
    const s = canonRateType(rateTypeRaw);
    return s || rateTypeRaw || "";
  })();

  const peso = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    return `₱${x.toLocaleString()}`;
  };
  const rateFrom = r.rate_from ?? d.rate_from ?? r.from ?? d.from ?? null;
  const rateTo = r.rate_to ?? d.rate_to ?? r.to ?? d.to ?? null;
  const rateValue = r.rate_value ?? d.rate_value ?? r.value ?? d.value ?? null;

  let displayRate = "";
  if (/hour/i.test(rateType)) {
    if (rateFrom && rateTo) displayRate = `${peso(rateFrom)}–${peso(rateTo)}/hr`;
    else if (rateFrom) displayRate = `${peso(rateFrom)}/hr`;
    else if (rateTo) displayRate = `${peso(rateTo)}/hr`;
  } else if (/job/i.test(rateType)) {
    if (rateValue) displayRate = `${peso(rateValue)}`;
  }
  if (!displayRate && (rateFrom || rateTo)) {
    displayRate = rateFrom && rateTo ? `${peso(rateFrom)}–${peso(rateTo)}/hr` : `${peso(rateFrom ?? rateTo)}/hr`;
  }
  if (!displayRate && rateValue) displayRate = `${peso(rateValue)}`;
  if (!displayRate) displayRate = "Rate not provided";

  const name = w.client_name || [i.first_name, i.last_name].filter(Boolean).join(" ") || "Client";
  const emailAddress = w.client_email || i.email_address || "";

  const icons = (serviceTypes || []).slice(0, 5).map((lbl) => iconFor(lbl));
  const singleIcon = icons.length === 1;

  const workDescription = d.work_description || d.description || w.description || w.title || "—";
  const workDone = Number.isFinite(w.completed_jobs) ? w.completed_jobs : 0;

  const ratingSources = [
    w.ratingFive, w.rating, w.stars, w.star, w.score, w.rating_out_of_5, w.value,
    i.ratingFive, i.rating, i.stars, i.star, i.score, i.rating_out_of_5, i.value,
    d.ratingFive, d.rating, d.stars, d.star, d.score, d.rating_out_of_5, d.value
  ];
  const rating = ratingSources.map((v)=>Number(v)).find((n)=>Number.isFinite(n)&&n>=0&&n<=5) ?? 0;
  const filled = Math.round(Math.max(0, Math.min(5, rating)));

  const prettyDate = (() => {
    const raw = d.preferred_date;
    if (!raw) return "—";
    const dt = new Date(raw);
    if (isNaN(dt)) return String(raw);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  })();
  const prettyTime = (() => {
    const t = d.preferred_time;
    if (!t) return "—";
    const s = String(t).trim();
    let h, m;
    let mm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
    if (mm) { h = parseInt(mm[1],10); m = parseInt(mm[2],10); }
    else {
      mm = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/.exec(s);
      if (mm) {
        h = parseInt(mm[1],10); m = parseInt(mm[2]||"0",10);
        const ap = mm[3].toUpperCase();
        if (ap==="PM" && h<12) h+=12;
        if (ap==="AM" && h===12) h=0;
      } else {
        const dte = new Date(`1970-01-01T${s}`);
        if (!isNaN(dte)) { h = dte.getHours(); m = dte.getMinutes(); } else { return s; }
      }
    }
    const ap = h>=12 ? "PM" : "AM";
    const hh = ((h%12)||12);
    const mins = String(m||0).padStart(2,"0");
    return `${hh}:${mins} ${ap}`;
  })();

  const reviews = useMemo(() => {
    const raw =
      (Array.isArray(w.reviews) && w.reviews) ||
      (Array.isArray(i.reviews) && i.reviews) ||
      (Array.isArray(d.reviews) && d.reviews) ||
      [];
    return raw.map((x, idx) => {
      const text = x.text || x.message || x.content || "";
      const rating = Number.isFinite(Number(x.rating)) ? Number(x.rating) : 0;
      const created_at = x.created_at || x.date || x.createdAt || null;
      const id = x.id || `${idx}`;
      return { id, text, rating, created_at };
    });
  }, [w, i, d]);

  const normalizeKind = (s) => {
    const t = String(s || '').trim().toLowerCase();
    if (!t) return '';
    if (/^carpent/.test(t) || t === 'carpenter') return 'carpentry';
    if (/^elect/.test(t) || t === 'electrician' || t === 'electrical work' || t === 'electrical work(s)') return 'electrical works';
    if (/^plumb/.test(t) || t === 'plumber') return 'plumbing';
    if (/car\s*wash/.test(t) || t === 'car washer' || t === 'carwasher' || t === 'car-washer') return 'car washing';
    if (/laund/.test(t)) return 'laundry';
    return t;
  };

  const extractTypeList = (val) => {
    const out = [];
    const add = (v) => {
      if (!v) return;
      if (Array.isArray(v)) { v.forEach(add); return; }
      if (typeof v === 'object') {
        const lbl = v.category || v.name || v.type || v.label;
        if (lbl) out.push(lbl);
        if (Array.isArray(v.types)) v.types.forEach(add);
        if (Array.isArray(v.items)) v.items.forEach(add);
        return;
      }
      String(v).split(/[,/|]+/).forEach(s => { s = s.trim(); if (s) out.push(s); });
    };
    add(val);
    return [...new Set(out)];
  };

  useEffect(() => {
    let stop = false;
    async function loadApproved() {
      try {
        const res = await axios.get(`${API_BASE}/api/workerapplications`, {
          withCredentials: true,
          headers: headersWithU,
          params: { scope: 'active' }
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const approved = items.filter(r => String(r.status || '').toLowerCase() === 'approved');
        const first = approved[0] || null;
        const src = first?.details || first?.work || {};
        const list = extractTypeList(src?.service_types || src?.service_type || []);
        if (!stop) {
          setHasApproved(!!first);
          setApprovedTypes(list);
          if (first) {
            const rate = first.rate || first.pricing || {};
            setApprovedApp({
              service_type: src?.service_type || src?.category || "",
              rate_type: rate?.rate_type || rate?.pricing_type || "",
              rate_from: rate?.rate_from ?? null,
              rate_to: rate?.rate_to ?? null,
              rate_value: rate?.rate_value ?? null
            });
          } else {
            setApprovedApp(null);
          }
        }
      } catch {
        if (!stop) {
          setHasApproved(false);
          setApprovedTypes([]);
          setApprovedApp(null);
        }
      }
    }
    loadApproved();
    return () => { stop = true; };
  }, [headersWithU]);

  const clientTypeRaw = d.service_type || d.serviceType || '';
  const clientType = normalizeKind(clientTypeRaw);
  const workerTypesNorm = approvedTypes.map(normalizeKind);
  const serviceMatch = clientType && workerTypesNorm.includes(clientType);
  const canAccept = hasApproved && serviceMatch;

  const wRateType = canonRateType(approvedApp?.rate_type || "");
  const wFrom = approvedApp?.rate_from != null ? Number(approvedApp.rate_from) : null;
  const wTo = approvedApp?.rate_to != null ? Number(approvedApp.rate_to) : null;
  const wValue = approvedApp?.rate_value != null ? Number(approvedApp.rate_value) : null;

  const reqFrom = rateFrom != null ? Number(rateFrom) : null;
  const reqTo = rateTo != null ? Number(rateTo) : null;
  const reqValue = rateValue != null ? Number(rateValue) : null;

  const rateTypeMatchOk = !!wRateType && !!rateType && wRateType === rateType;
  let rateValueMatchOk = false;
  if (rateTypeMatchOk && wRateType === "Hourly Rate") {
    const cmin = Number.isFinite(reqFrom) ? reqFrom : reqTo;
    const cmax = Number.isFinite(reqTo) ? reqTo : reqFrom;
    const wmin = Number.isFinite(wFrom) ? wFrom : wTo;
    const wmax = Number.isFinite(wTo) ? wTo : wFrom;
    if (Number.isFinite(cmin) && Number.isFinite(cmax) && Number.isFinite(wmin) && Number.isFinite(wmax)) {
      rateValueMatchOk = wmax >= cmin && wmin <= cmax;
    }
  } else if (rateTypeMatchOk && wRateType === "By the Job Rate") {
    if (Number.isFinite(reqValue) && Number.isFinite(wValue)) {
      rateValueMatchOk = reqValue >= wValue;
    }
  }

  const typeMatchOk = !!serviceMatch;
  const matchCount = [typeMatchOk, rateTypeMatchOk, rateValueMatchOk].filter(Boolean).length;
  const anyMatch = matchCount > 0;
  const allThreeMatch = matchCount === 3;

  const statusLabel = allThreeMatch ? "Match" : "Not Match";
  const statusClasses = allThreeMatch ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200";
  const progressWidth = `${Math.max(0, Math.min(100, Math.round((matchCount / 3) * 100)))}%`;

  const hasActiveApproved = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/workerapplications`, {
        withCredentials: true,
        headers: headersWithU,
        params: { scope: 'active' }
      });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      return items.some(r => String(r.status || '').toLowerCase() === 'approved');
    } catch {
      return false;
    }
  };

  const applyNow = async () => {
    if (checkingApply) return;
    setCheckingApply(true);
    const ok = await hasActiveApproved();
    setCheckingApply(false);
    if (!ok) {
      setShowNoApproved(true);
      return;
    }
    if (!serviceMatch) {
      setShowTypeMismatch(true);
      return;
    }
    if (typeof onApply === "function") onApply({ request: w });
    else window.location.href = "/worker/apply";
  };

  const approvedServiceType = useMemo(() => {
    const originals = approvedTypes || [];
    if (!originals.length) return "";
    if (clientType) {
      const idx = workerTypesNorm.indexOf(clientType);
      if (idx >= 0) return originals[idx] || "";
    }
    return originals[0] || "";
  }, [approvedTypes, workerTypesNorm, clientType]);

  return (
    <div className={`fixed inset-0 z-[120] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full sm:w-[560px] md:w-[660px] bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-modal="true">
        <div className="h-16 px-5 border-b border-gray-200 flex items-center justify-between">
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center">×</button>
          <img src="/jdklogo.png" alt="Logo" className="h-36 w-auto" />
        </div>
        <div className="h-[calc(100%-4rem)] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <div className="p-5 h-full">
              <div className="relative rounded-2xl border border-gray-200 bg-white flex flex-col overflow-hidden max-h-[calc(100vh-9rem)]">
                <div className="relative p-5 bg-gradient-to-b from-gray-50/60 to-white rounded-t-2xl shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                      <img src={i.profile_picture_url || w.client_image || w.image || w.avatar || "/Clienticon.png"} alt={name} className="h-full w-full object-cover" onError={({ currentTarget }) => { currentTarget.style.display = "none" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm md:text-lg font-semibold text-gray-700">Client:</span>
                            <span className="text-lg md:text-xl font-semibold text-[#008cfc] leading-tight truncate">{name}</span>
                          </div>
                          {emailAddress ? <div className="text-xs text-gray-600 truncate">{emailAddress}</div> : null}
                        </div>
                        <div className="hidden" />
                        {(() => {
                          const icons = (serviceTypes || []).slice(0, 5).map((lbl) => iconFor(lbl));
                          const singleIcon = icons.length === 1;
                          return singleIcon ? (
                            <div className="relative w-18 h-18 flex items-start justify-end">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                                {React.createElement(icons[0] || Hammer, { size: 16, className: "text-[#008cfc]" })}
                              </span>
                            </div>
                          ) : (
                            <div className="relative w-18 h-18 grid grid-cols-2 auto-rows-[minmax(0,1fr)] gap-2">
                              {(icons.length ? icons : [Hammer]).map((Icon, idx) => {
                                const pos = [
                                  { gridColumn: "1", gridRow: "1" },
                                  { gridColumn: "2", gridRow: "1" },
                                  { gridColumn: "2", gridRow: "2" },
                                  { gridColumn: "1", gridRow: "2" },
                                  { gridColumn: "2", gridRow: "3" }
                                ][idx] || { gridColumn: "1", gridRow: "3" };
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200"
                                    style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
                                  >
                                    {React.createElement(Icon || Hammer, { size: 16, className: "text-[#008cfc]" })}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="mt-2 flex items中心 gap-1">
                        {[0,1,2,3,4].map((i) => (
                          <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < filled ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor">
                            <path d="M12 .587l3.668 7.431L24 9.75l-6 5.85L19.335 24 12 19.897 4.665 24 6 15.6 0 9.75l8.332-1.732z" />
                          </svg>
                        ))}
                        <span className="ml-1 text-xs font-medium text-gray-700">{`${(rating || 0).toFixed(1)}/5`}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative px-5 pb-5 overflow-y-auto">
                  <div className="mt-4 border-t border-gray-200" />
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Service Type</div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 items-center rounded-md bg-blue-50 text-[#008cfc] border border-blue-200 px-3 text-xs font-medium">
                          Request Done
                          <span className="ml-2 text-sm font-semibold text-[#008cfc]">{Number.isFinite(w.completed_jobs) ? w.completed_jobs : 0}</span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(serviceTypes.length ? serviceTypes : ["—"]).map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-700">Service Task</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(serviceTasks.length ? serviceTasks : ["—"]).map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Gender</div>
                      <div className="text-sm text-[#008cfc]">{gender || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg白">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Barangay</div>
                      <div className="text-sm text-[#008cfc]">{barangay || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg白">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Street</div>
                      <div className="text-sm text-[#008cfc]">{street || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Additional Address</div>
                      <div className="text-sm text-[#008cfc]">{additionalAddress || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Rate Type</div>
                      <div className="text-sm text-[#008cfc]">{rateType || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Service Rate</div>
                      <div className="text-sm text-[#008cfc]">{displayRate}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Preferred Date</div>
                      <div className="text-sm text-[#008cfc]">{prettyDate}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Preferred Time</div>
                      <div className="text-sm text-[#008cfc]">{prettyTime}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Request Description</div>
                    <div className="mt-2 text-sm text-[#008cfc] leading-6 bg-gray-50/60 border border-gray-200 rounded-xl p-4">{workDescription}</div>
                  </div>

                  <div className="mt-8 border-t border-gray-200" />
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Match With Your Approved Application</div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium border ${statusClasses}`}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/60 to-white p-4">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{matchCount} of 3 criteria matched</span>
                        <span className="font-medium">{progressWidth}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-2 bg-[#008cfc] rounded-full transition-all" style={{ width: progressWidth }} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${typeMatchOk ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>Service Type {typeMatchOk ? "✓" : "✗"}</div>
                        <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${rateTypeMatchOk ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>Rate Type {rateTypeMatchOk ? "✓" : "✗"}</div>
                        <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${rateValueMatchOk ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>Service Rate {rateValueMatchOk ? "✓" : "✗"}</div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-gray-500">Your Approved Application</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {approvedApp ? (() => {
                            const t = approvedServiceType || approvedApp.service_type || "—";
                            const rt = canonRateType(approvedApp.rate_type) || "—";
                            let rv = "";
                            if (rt === "Hourly Rate") {
                              if (Number.isFinite(wFrom) && Number.isFinite(wTo)) rv = `${peso(wFrom)}–${peso(wTo)}/hr`;
                              else if (Number.isFinite(wFrom)) rv = `${peso(wFrom)}/hr`;
                              else if (Number.isFinite(wTo)) rv = `${peso(wTo)}/hr`;
                            } else if (rt === "By the Job Rate") {
                              if (Number.isFinite(wValue)) rv = `${peso(wValue)}`;
                            }
                            return (
                              <span className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs bg-white border-gray-200 text-gray-700 shadow-sm">
                                <span className="font-semibold">{t || "—"}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300" />
                                <span>{rt}</span>
                                {rv ? (<><span className="h-1 w-1 rounded-full bg-gray-300" /><span>{rv}</span></>) : null}
                              </span>
                            );
                          })() : <span className="text-xs text-gray-400">None</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-200" />
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Ratings & Reviews</div>
                    <div className="mt-4 space-y-3">
                      {(reviews.length ? reviews : [{ id: "empty", rating: 0, text: "No reviews yet.", created_at: null }]).map((rv) => {
                        const rf = Math.round(Math.max(0, Math.min(5, rv.rating || 0)));
                        const date = rv.created_at ? new Date(rv.created_at) : null;
                        const dstr = date && !isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "";
                        return (
                          <div key={rv.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[0,1,2,3,4].map((i) => (
                                  <svg key={i} viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${i < rf ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor">
                                    <path d="M12 .587l3.668 7.431L24 9.75l-6 5.85L19.335 24 12 19.897 4.665 24 6 15.6 0 9.75l8.332-1.732z" />
                                  </svg>
                                ))}
                              </div>
                              <div className="text-[11px] text-gray-500">{dstr}</div>
                            </div>
                            <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{rv.text || "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <div className="items-center gap-2 mr-auto hidden">
                      <span className="inline-flex h-8 items-center rounded-md bg-blue-50 text-[#008cfc] border border-blue-200 px-3 text-xs font-medium">
                        Request Done
                        <span className="ml-2 text-sm font-semibold text-[#008cfc]">{Number.isFinite(w.completed_jobs) ? w.completed_jobs : 0}</span>
                      </span>
                    </div>
                    <button onClick={onClose} className="hidden">Close</button>
                    <a
                      href="/workerpostapplication"
                      onClick={(e) => { e.preventDefault(); applyNow(); }}
                      aria-disabled={!canAccept}
                      className={`h-9 px-4 rounded-md ${btnLoading ? "opacity-60 pointer-events-none" : ""} ${canAccept ? "bg-[#008cfc] text-white hover:bg-[#0078d6]" : "bg-gray-200 text-gray-500 pointer-events-none"} text-sm inline-flex items-center justify-center`}
                    >
                      Apply Request
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white p-4 sticky bottom-0 hidden">
            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
              <button onClick={applyNow} className="h-10 px-5 rounded-md bg-[#008cfc] text-white hover:bg-[#0078d6] inline-flex items-center justify-center">Accept Request</button>
            </div>
          </div>
        </div>
      </div>

      {showNoApproved ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNoApproved(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483648]">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">You need an approved worker application to accept requests</div>
              <div className="text-sm text-gray-600">Submit your work application and wait for approval. Once approved, you can accept client requests.</div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2">
              <a
                href="/workerpostapplication"
                onClick={(e) => {
                  e.preventDefault();
                  setShowNoApproved(false);
                  setBtnLoading(true);
                  setTimeout(() => { window.location.href = "/workerpostapplication"; }, 2000);
                }}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-md shadow-sm hover:bg-blue-700 transition text-center whitespace-nowrap"
              >
                Become a Worker
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {showTypeMismatch ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTypeMismatch(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-rose-200 bg-white shadow-2xl p-8 z-[2147483648]">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-rose-200 flex items-center justify-center bg-gradient-to-br from-rose-50 to-white">
              <div className="w-16 h-16 rounded-full border border-rose-400 flex items-center justify-center">
                <span className="font-bold text-rose-500">JDK</span>
              </div>
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Service type not matched</div>
              <div className="text-sm text-gray-600">Your approved application’s service type does not match this request.</div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setShowTypeMismatch(false)}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition text-center whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {btnLoading && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading next step"
            tabIndex={-1}
            className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]"
          >
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-base font-semibold text-gray-900 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
