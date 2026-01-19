import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ClientViewWorker({ open, onClose, worker }) {
  const [fetched, setFetched] = useState(null);
  const [reviewsState, setReviewsState] = useState({ items: [], avg: 0, count: 0 });
  const [showNoApproved, setShowNoApproved] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [approvedClientTypes, setApprovedClientTypes] = useState([]);
  const [checkedTypes, setCheckedTypes] = useState(false);
  const [approvedClientRequests, setApprovedClientRequests] = useState([]);

  const base = worker || {};
  const baseInfo = base.info || {};
  const emailGuess = base.emailAddress || baseInfo.email_address || base.email || base.email_address || "";
  const gidGuess = base.request_group_id || base.requestGroupId || base.requestGroupID || "";

  const canonType = (s) => {
    const k = String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (/carpent/.test(k)) return "carpentry";
    if (/elect/.test(k)) return "electrical works";
    if (/plumb/.test(k)) return "plumbing";
    if (/(car\s*wash|carwash|auto)/.test(k)) return "car washing";
    if (/laund/.test(k)) return "laundry";
    return k;
  };

  const canonTask = (s) => {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s-]/g, "")
      .trim();
  };

  const extractTasks = (taskRaw) => {
    if (!taskRaw) return [];
    if (typeof taskRaw === "string") {
      return taskRaw
        .split(/[,/|]+/)
        .map((x) => canonTask(x))
        .filter(Boolean);
    }
    if (Array.isArray(taskRaw)) {
      const out = [];
      taskRaw.forEach((it) => {
        if (!it) return;
        if (typeof it === "string") out.push(canonTask(it));
        else if (typeof it === "object") {
          const tasks = Array.isArray(it.tasks) ? it.tasks : [];
          tasks.forEach((t) => out.push(canonTask(t)));
        }
      });
      return out.filter(Boolean);
    }
    if (typeof taskRaw === "object") {
      const out = [];
      Object.values(taskRaw).forEach((v) => {
        if (!v) return;
        const arr = Array.isArray(v) ? v : [v];
        arr.forEach((x) => out.push(canonTask(x)));
      });
      return out.filter(Boolean);
    }
    return [];
  };

  const canonRateType = (t) => {
    const s = String(t || "").toLowerCase().replace(/\s+/g, " ").replace(/_/g, " ").trim();
    if (!s) return "";
    if (s.includes("hour")) return "Hourly Rate";
    if (s === "range") return "Hourly Rate";
    if (s.includes("job") || s.includes("fixed") || s.includes("flat") || s.includes("project") || s.includes("task"))
      return "By the Job Rate";
    if (s === "by the job rate") return "By the Job Rate";
    return "";
  };

  const clientRateTypeToWorker = (t) => canonRateType(t);
  const workerRateTypeCanon = (t) => canonRateType(t);

  const getClientEmail = () => {
    try {
      const a = JSON.parse(localStorage.getItem("clientAuth") || "{}");
      if (a && a.email) return a.email;
    } catch {}
    return (
      localStorage.getItem("clientEmail") ||
      localStorage.getItem("client_email") ||
      localStorage.getItem("email_address") ||
      localStorage.getItem("email") ||
      ""
    );
  };

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!open) return;

      let gid = gidGuess;
      if (!gid && emailGuess) {
        try {
          const res = await axios.get(`${API_BASE}/api/workerapplications/approved`, {
            params: { email: emailGuess, limit: 1 }
          });
          const items = Array.isArray(res.data?.items) ? res.data.items : [];
          gid = items[0]?.request_group_id || "";
        } catch {}
      }

      let full = null;
      if (gid) {
        try {
          const res = await axios.get(`${API_BASE}/api/workerapplications/by-group/${gid}`);
          full = res.data || null;
        } catch {}
      }

      let gender = base.gender || base.sex || baseInfo.sex || "";
      if (!gender && (base.auth_uid || base.authUid || emailGuess)) {
        try {
          const res = await axios.get(`${API_BASE}/api/workers/public/sex`, {
            params: { email: emailGuess || "", auth_uid: base.auth_uid || base.authUid || "" }
          });
          gender = res.data?.sex || "";
        } catch {}
      }

      const fromFullInfo =
        full?.info?.contact_number ||
        full?.info?.contactNumber ||
        full?.info?.phone ||
        full?.info?.mobile ||
        full?.contact_number ||
        full?.contactNumber ||
        full?.phone ||
        full?.mobile ||
        "";

      let contactNumber =
        base.contact_number ||
        base.contactNumber ||
        base.phone ||
        base.mobile ||
        baseInfo.contact_number ||
        baseInfo.contactNumber ||
        baseInfo.phone ||
        baseInfo.mobile ||
        fromFullInfo ||
        "";

      if (!contactNumber && (base.auth_uid || base.authUid || emailGuess)) {
        const params = { email: emailGuess || "", auth_uid: base.auth_uid || base.authUid || "" };
        const tryUrls = [
          `${API_BASE}/api/workers/public/contact-number`,
          `${API_BASE}/api/workers/public/contact`,
          `${API_BASE}/api/workers/public/phone`
        ];
        for (const url of tryUrls) {
          try {
            const res = await axios.get(url, { params });
            const v =
              res.data?.contact_number ||
              res.data?.contactNumber ||
              res.data?.phone ||
              res.data?.mobile ||
              res.data?.number ||
              "";
            if (v) {
              contactNumber = v;
              break;
            }
          } catch {}
        }
      }

      let revItems = [];
      try {
        const res = await axios.get(`${API_BASE}/api/workers/public/reviews`, {
          params: {
            email: emailGuess || "",
            auth_uid: base.auth_uid || base.authUid || "",
            request_group_id: gid || "",
            limit: 20
          }
        });
        const list = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
          ? res.data
          : [];
        revItems = list.map((x, i) => {
          const rating =
            [x.rating, x.stars, x.star, x.score, x.rating_out_of_5, x.value]
              .map((v) => Number(v))
              .find((n) => Number.isFinite(n) && n >= 0 && n <= 5) ?? 0;
          const text = x.text || x.comment || x.review || x.content || "";
          const createdAt = x.created_at || x.date || x.createdAt || null;
          const id = x.id || `${i}`;
          return { id, rating, text, created_at: createdAt };
        });
      } catch {}

      if (!cancel) {
        const extra = {};
        if (gender) extra.gender = gender;
        if (contactNumber) extra.contact_number = contactNumber;

        setFetched(full ? { ...full, ...extra } : Object.keys(extra).length ? extra : null);

        const nums = revItems.map((r) => r.rating).filter((n) => Number.isFinite(n));
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        setReviewsState({ items: revItems, avg, count: revItems.length });
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, [open, gidGuess, emailGuess, base.auth_uid, base.authUid]);

  useEffect(() => {
    let cancel = false;
    async function loadApprovedClientTypes() {
      if (!open) return;
      const clientEmail = getClientEmail();
      if (!clientEmail) {
        setApprovedClientTypes([]);
        setApprovedClientRequests([]);
        setCheckedTypes(true);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/api/clientservicerequests/approved`, {
          params: { email: clientEmail, limit: 20 }
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const types = items
          .map((it) => it?.details?.service_type || it?.details?.category || "")
          .filter(Boolean)
          .map(canonType);
        const unique = Array.from(new Set(types));
        if (!cancel) {
          setApprovedClientTypes(unique);
          setApprovedClientRequests(items);
        }
      } catch {
        if (!cancel) {
          setApprovedClientTypes([]);
          setApprovedClientRequests([]);
        }
      } finally {
        if (!cancel) setCheckedTypes(true);
      }
    }
    loadApprovedClientTypes();
    return () => {
      cancel = true;
    };
  }, [open]);

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
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blockKeys, true);
    return () => {
      window.removeEventListener("popstate", onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", blockKeys, true);
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
    const withContact = fetched.contact_number
      ? { info: { contact_number: fetched.contact_number } }
      : {};
    return {
      ...base,
      info: { ...(base.info || {}), ...i, ...(withContact.info || {}) },
      details: { ...(base.details || base.work || {}), ...d },
      rate: { ...(base.rate || {}), ...r },
      ...withGender
    };
  }, [base, fetched]);

  const w = merged || {};
  const i = w.info || w;
  const d = w.details || w.work || w;
  const r = w.rate || w;

  const serviceTypes = Array.isArray(d.service_types)
    ? d.service_types
    : Array.isArray(w.serviceTypeList)
    ? w.serviceTypeList
    : w.serviceType
    ? [w.serviceType]
    : [];

  const serviceTasks = Array.isArray(d.service_task)
    ? d.service_task.flatMap((t) => (Array.isArray(t?.tasks) ? t.tasks : [])).filter(Boolean)
    : Array.isArray(w.serviceTaskList)
    ? w.serviceTaskList
    : typeof w.serviceTask === "string"
    ? w.serviceTask.split(/[,/|]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  const rating = Number.isFinite(w.ratingFive) ? Math.max(0, Math.min(5, w.ratingFive)) : 0;
  const filled = Math.round(rating);
  const avatar = i.profile_picture_url || w.image || w.avatar || "/Clienticon.png";

  const barangay = i.barangay || d.barangay || "";
  const street = i.street || d.street || "";
  const age = Number.isFinite(i.age) ? i.age : Number.isFinite(w.age) ? w.age : null;
  const gender = w.gender || w.sex || i.sex || "";
  const yearsExp = Number.isFinite(d.years_experience)
    ? d.years_experience
    : Number.isFinite(w.years)
    ? w.years
    : null;

  const contactNumber =
    i.contact_number ||
    i.contactNumber ||
    i.phone ||
    i.mobile ||
    w.contact_number ||
    w.contactNumber ||
    w.phone ||
    w.mobile ||
    "";

  const normalizePHMobile = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    let d = digits;

    if (d.startsWith("63")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length > 10) d = d.slice(d.length - 10);

    if (d.length !== 10) return "";
    if (d[0] !== "9") return "";
    return d;
  };

  const phMobile = useMemo(() => normalizePHMobile(contactNumber), [contactNumber]);

  const rateTypeRaw = r.rate_type || r.rateType || "";
  const rateType = workerRateTypeCanon(rateTypeRaw);

  const peso = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    return `₱${x.toLocaleString()}`;
  };

  let displayRate = "";
  if (/hour/i.test(rateType)) {
    if (r.rate_from && r.rate_to) displayRate = `${peso(r.rate_from)}–${peso(r.rate_to)}/hr`;
    else if (r.rate_from) displayRate = `${peso(r.rate_from)}/hr`;
    else if (r.rate_to) displayRate = `${peso(r.rate_to)}/hr`;
  } else if (/job/i.test(rateType)) {
    if (r.rate_value) displayRate = `${peso(r.rate_value)}`;
  }
  if (!displayRate) displayRate = w.displayRate || "Rate upon request";

  const name = w.name || [i.first_name, i.last_name].filter(Boolean).join(" ") || "Worker";
  const emailAddress = w.emailAddress || i.email_address || "";

  const avgFive = Math.max(0, Math.min(5, reviewsState.avg || 0));
  const reviewItems = reviewsState.items;

  const rawWorkDone =
    w.workDone ??
    w.completed_jobs ??
    w.jobs_completed ??
    w.completed_works ??
    (w.stats && (w.stats.work_done || w.stats.completed || w.stats.jobs));
  const wd = Number(rawWorkDone);
  const workDone = Number.isFinite(wd) && wd >= 0 ? Math.floor(wd) : 0;

  const rawSuccess =
    w.workerSuccess ??
    w.success_rate ??
    w.job_success ??
    w.jobs_success ??
    w.jobSuccess ??
    (w.stats && w.stats.success_rate) ??
    r.rate_success;
  const succ = Number(rawSuccess);
  const workerSuccess = rating > 0 ? (Number.isFinite(succ) ? Math.max(0, Math.min(100, succ)) : 0) : 0;

  const workerCanonTypes = Array.from(new Set((serviceTypes || []).map(canonType)));
  const workerTaskSet = useMemo(() => {
    const flat = extractTasks(d.service_task || serviceTasks || []);
    return new Set(flat.map(canonTask).filter(Boolean));
  }, [d.service_task, serviceTasks]);

  const hasTypeMatch = approvedClientTypes.some((t) => workerCanonTypes.includes(t));
  const canBook = checkedTypes ? hasTypeMatch : false;

  const matchedRequests = useMemo(() => {
    const list = Array.isArray(approvedClientRequests) ? approvedClientRequests : [];
    const out = [];
    for (const req of list) {
      const cd = req?.details || {};
      const cType = canonType(cd.service_type || cd.category || "");
      const typeOk = cType && workerCanonTypes.includes(cType);

      const clientTasksRaw =
        cd.service_task ||
        cd.service_tasks ||
        cd.task ||
        cd.tasks ||
        req?.task ||
        req?.tasks ||
        req?.service_task ||
        null;

      const clientTasks = extractTasks(clientTasksRaw);
      const clientTaskSet = new Set(clientTasks.map(canonTask).filter(Boolean));

      const taskOk =
        clientTaskSet.size > 0
          ? Array.from(clientTaskSet).some((t) => workerTaskSet.has(t))
          : false;

      if (typeOk || taskOk) {
        out.push({
          request_group_id: req.request_group_id || req.id || "",
          service_type: cd.service_type || cd.category || "",
          service_tasks: Array.from(clientTaskSet),
          matches: {
            service_type: !!typeOk,
            service_task: !!taskOk
          }
        });
      }
    }
    return out;
  }, [approvedClientRequests, workerCanonTypes, workerTaskSet]);

  const allTwoMatch = matchedRequests.some((m) => m.matches.service_type && m.matches.service_task);
  const allowBook = canBook && allTwoMatch;

  const handleBookClick = async (e) => {
    e.preventDefault();
    if (btnLoading) return;
    if (!allTwoMatch) {
      setShowNoApproved(true);
      return;
    }
    const clientEmail = getClientEmail();
    if (!clientEmail) {
      setShowNoApproved(true);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/clientservicerequests/approved`, {
        params: { email: clientEmail, limit: 20 }
      });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const cTypes = items
        .map((it) => it?.details?.service_type || it?.details?.category || "")
        .filter(Boolean)
        .map(canonType);
      const cSet = new Set(cTypes);
      const wSet = new Set(workerCanonTypes);
      const ok = Array.from(wSet).some((x) => cSet.has(x));
      if (!ok) {
        setShowNoApproved(true);
        return;
      }
      window.location.href = "/clientpostrequest";
    } catch {
      setShowNoApproved(true);
    }
  };

  const typeMatchOk = matchedRequests.some((m) => m.matches.service_type);
  const taskMatchOk = matchedRequests.some((m) => m.matches.service_task);

  const matchCount = [typeMatchOk, taskMatchOk].filter(Boolean).length;

  const statusLabel = allTwoMatch ? "Match" : "Not Match";
  const statusClasses = allTwoMatch
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";

  const progressWidth = `${Math.max(0, Math.min(100, Math.round((matchCount / 2) * 100)))}%`;

  return (
    <div className={`fixed inset-0 z-[120] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] md:w-[660px] bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-16 px-5 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
          >
            ×
          </button>
          <img src="/jdklogo.png" alt="Logo" className="h-36 w-auto" />
        </div>

        <div className="h-[calc(100%-4rem)] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <div className="p-5 h-full">
              <div className="relative rounded-2xl border border-gray-200 bg-white flex flex-col overflow-hidden max-h-[calc(100vh-9rem)]">
                <div className="relative p-5 bg-gradient-to-b from-gray-50/60 to-white rounded-t-2xl shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                      <img
                        src={avatar}
                        alt={name}
                        className="h-full w-full object-cover"
                        onError={({ currentTarget }) => {
                          currentTarget.style.display = "none";
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm md:text-lg font-semibold text-gray-700">Worker:</span>
                            <span className="text-lg md:text-xl font-semibold text-[#008cfc] leading-tight truncate">
                              {name}
                            </span>
                          </div>
                          {emailAddress ? <div className="text-xs text-gray-600 truncate">{emailAddress}</div> : null}
                        </div>

                        <span className="inline-flex h-8 items-center rounded-md bg-blue-50 text-[#008cfc] border border-blue-200 px-3 text-xs font-medium shrink-0">
                          Work Done
                          <span className="ml-2 text-sm font-semibold text-[#008cfc]">{workDone}</span>
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <svg
                            key={i}
                            viewBox="0 0 24 24"
                            className={`h-4 w-4 ${i < filled ? "text-yellow-400" : "text-gray-300"}`}
                            fill="currentColor"
                          >
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
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(serviceTypes.length ? serviceTypes : ["—"]).map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-700">Service Task</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(serviceTasks.length ? serviceTasks : ["—"]).map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4 bg-white sm:col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                        Contact Number
                      </div>

                      {phMobile ? (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
                          <img
                            src="philippines.png"
                            alt="PH"
                            className="h-5 w-7 rounded-sm object-cover"
                          />
                          <span className="text-gray-700 text-sm">+63</span>
                          <span className="text-sm text-[#008cfc] tracking-wide">{phMobile}</span>
                        </div>
                      ) : (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-gray-200 text-gray-400">
                          <img
                            src="philippines.png"
                            alt="PH"
                            className="h-5 w-7 rounded-sm object-cover"
                          />
                          <span className="text-sm">+63</span>
                          <span className="text-sm">9XXXXXXXXX</span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Gender</div>
                      <div className="text-sm text-[#008cfc]">{gender || "—"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Age</div>
                      <div className="text-sm text-[#008cfc]">{Number.isFinite(age) ? `${age}` : "—"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Barangay</div>
                      <div className="text-sm text-[#008cfc]">{barangay || "—"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Street</div>
                      <div className="text-sm text-[#008cfc]">{street || "—"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white sm:col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                        Years of Experience
                      </div>
                      <div className="text-sm text-[#008cfc]">{Number.isFinite(yearsExp) ? `${yearsExp}` : "—"}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Work Description</div>
                    <div className="mt-2 text-sm text-[#008cfc] leading-6 bg-gray-50/60 border border-gray-200 rounded-xl p-4">
                      {w.bio || w.title || d.work_description || "—"}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-200" />

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Match With Your Approved Request</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium border ${statusClasses}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/60 to-white p-4">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{matchCount} of 2 criteria matched</span>
                        <span className="font-medium">{progressWidth}</span>
                      </div>

                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-2 bg-[#008cfc] rounded-full transition-all" style={{ width: progressWidth }} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-2">
                        <div
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            typeMatchOk
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          Service Type {typeMatchOk ? "✓" : "✗"}
                        </div>

                        <div
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            taskMatchOk
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          Service Task {taskMatchOk ? "✓" : "✗"}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-gray-500">Matching Approved Requests</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(matchedRequests.length ? matchedRequests : []).slice(0, 4).map((m) => {
                            const t = m.service_type || "—";
                            return (
                              <span
                                key={m.request_group_id || Math.random()}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs bg-white border-gray-200 text-gray-700 shadow-sm"
                              >
                                <span className="font-semibold">{t}</span>
                              </span>
                            );
                          })}
                          {!matchedRequests.length ? <span className="text-xs text-gray-400">None</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-200" />

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Ratings & Reviews</div>

                    <div className="mt-4 space-y-3">
                      {(reviewItems.length
                        ? reviewItems
                        : [{ id: "empty", rating: 0, text: "No reviews yet.", created_at: null }]
                      ).map((rv) => {
                        const rf = Math.round(Math.max(0, Math.min(5, rv.rating || 0)));
                        const date = rv.created_at ? new Date(rv.created_at) : null;
                        const dstr =
                          date && !isNaN(date.getTime())
                            ? date.toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "2-digit"
                              })
                            : "";
                        return (
                          <div key={rv.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <svg
                                    key={i}
                                    viewBox="0 0 24 24"
                                    className={`h-3.5 w-3.5 ${i < rf ? "text-yellow-400" : "text-gray-300"}`}
                                    fill="currentColor"
                                  >
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
                    <a
                      href={`/clientmessages?to=${encodeURIComponent(emailAddress || "")}`}
                      className="h-9 px-4 rounded-md border border-[#008cfc] text-[#008cfc] hover:bg-blue-50 text-sm inline-flex items-center justify-center"
                    >
                      Message
                    </a>

                    <a
                      href="/clientpostrequest"
                      onClick={handleBookClick}
                      aria-disabled={!allowBook}
                      className={`h-9 px-4 rounded-md ${btnLoading ? "opacity-60 pointer-events-none" : ""} ${
                        allowBook
                          ? "bg-[#008cfc] text-white hover:bg-[#0078d6]"
                          : "bg-gray-200 text-gray-500 pointer-events-none"
                      } text-sm inline-flex items-center justify-center`}
                    >
                      Book Worker
                    </a>
                  </div>
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
                    <img
                      src="/jdklogo.png"
                      alt="Logo"
                      className="w-16 h-16 object-contain"
                      onError={() => setLogoBroken(true)}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center space-y-2">
                  <div className="text-lg font-semibold text-gray-900">
                    You need an approved service request to book a worker
                  </div>
                  <div className="text-sm text-gray-600">
                    Post a service request first. Once approved and active, you can hire a worker.
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-2">
                  <a
                    href="/clientpostrequest"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowNoApproved(false);
                      setBtnLoading(true);
                      setTimeout(() => {
                        window.location.href = "/clientpostrequest";
                      }, 2000);
                    }}
                    className="px-6 py-3 bg-[#008cfc] text-white rounded-md shadow-sm hover:bg-blue-700 transition text-center whitespace-nowrap"
                  >
                    Post a Request
                  </a>
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
                      borderWidth: "10px",
                      borderStyle: "solid",
                      borderColor: "#008cfc22",
                      borderTopColor: "#008cfc",
                      borderRadius: "9999px"
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
      </div>
    </div>
  );
}
