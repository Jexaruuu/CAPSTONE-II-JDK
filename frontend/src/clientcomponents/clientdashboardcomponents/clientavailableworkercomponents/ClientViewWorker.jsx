import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ClientViewWorker({ open, onClose, worker }) {
  const [fetched, setFetched] = useState(null);
  const [reviewsState, setReviewsState] = useState({ items: [], avg: 0, count: 0 });
  const base = worker || {};
  const baseInfo = base.info || {};
  const emailGuess = base.emailAddress || baseInfo.email_address || base.email || base.email_address || "";
  const gidGuess = base.request_group_id || base.requestGroupId || base.requestGroupID || "";

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!open) return;
      let gid = gidGuess;
      if (!gid && emailGuess) {
        try {
          const res = await axios.get(`${API_BASE}/api/workerapplications/approved`, { params: { email: emailGuess, limit: 1 } });
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
          const res = await axios.get(`${API_BASE}/api/workers/public/sex`, { params: { email: emailGuess || "", auth_uid: base.auth_uid || base.authUid || "" } });
          gender = res.data?.sex || "";
        } catch {}
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
        const list = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
        revItems = list.map((x, i) => {
          const rating =
            [x.rating, x.stars, x.star, x.score, x.rating_out_of_5, x.value].map((v) => Number(v)).find((n) => Number.isFinite(n) && n >= 0 && n <= 5) ?? 0;
          const text =
            x.text || x.comment || x.review || x.content || "";
          const createdAt = x.created_at || x.date || x.createdAt || null;
          const id = x.id || `${i}`;
          return { id, rating, text, created_at: createdAt };
        });
      } catch {}
      if (!cancel) {
        setFetched(full ? { ...full, gender } : gender ? { gender } : null);
        const nums = revItems.map((r) => r.rating).filter((n) => Number.isFinite(n));
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        setReviewsState({ items: revItems, avg, count: revItems.length });
      }
    }
    load();
    return () => { cancel = true };
  }, [open, gidGuess, emailGuess, base.auth_uid, base.authUid]);

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
    const d = fetched.details || {};
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

  const serviceTypes = Array.isArray(d.service_types) ? d.service_types : (Array.isArray(w.serviceTypeList) ? w.serviceTypeList : (w.serviceType ? [w.serviceType] : []));
  const serviceTasks = Array.isArray(d.service_task)
    ? d.service_task.flatMap((t) => Array.isArray(t?.tasks) ? t.tasks : []).filter(Boolean)
    : (Array.isArray(w.serviceTaskList) ? w.serviceTaskList : (typeof w.serviceTask === "string" ? w.serviceTask.split(/[,/|]+/).map(s=>s.trim()).filter(Boolean) : []));
  const rating = Number.isFinite(w.ratingFive) ? Math.max(0, Math.min(5, w.ratingFive)) : 0;
  const filled = Math.round(rating);
  const avatar = i.profile_picture_url || w.image || w.avatar || "/Clienticon.png";

  const barangay = i.barangay || d.barangay || "";
  const street = i.street || d.street || "";
  const age = Number.isFinite(i.age) ? i.age : (Number.isFinite(w.age) ? w.age : null);
  const gender = w.gender || w.sex || i.sex || "";
  const yearsExp = Number.isFinite(d.years_experience) ? d.years_experience : (Number.isFinite(w.years) ? w.years : null);

  const rateTypeRaw = r.rate_type || r.rateType || "";
  const rateType = /hour/i.test(String(rateTypeRaw)) ? "Hourly Rate" : (/job|fixed|flat/i.test(String(rateTypeRaw)) ? "By the Job Rate" : (rateTypeRaw || ""));
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

  const icons = (serviceTypes || []).slice(0, 5).map((lbl) => iconFor(lbl));
  const singleIcon = icons.length === 1;

  const avgFive = Math.max(0, Math.min(5, reviewsState.avg || 0));
  const avgFilled = Math.round(avgFive);
  const reviewItems = reviewsState.items;

  const rawWorkDone =
    w.workDone ?? w.completed_jobs ?? w.jobs_completed ?? w.completed_works ?? (w.stats && (w.stats.work_done || w.stats.completed || w.stats.jobs));
  const wd = Number(rawWorkDone);
  const workDone = Number.isFinite(wd) && wd >= 0 ? Math.floor(wd) : 0;

  const rawSuccess =
    w.workerSuccess ?? w.success_rate ?? w.job_success ?? w.jobs_success ?? w.jobSuccess ?? (w.stats && w.stats.success_rate) ?? r.rate_success;
  const succ = Number(rawSuccess);
  const workerSuccess = rating > 0 ? (Number.isFinite(succ) ? Math.max(0, Math.min(100, succ)) : 0) : 0;

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
                      <img src={avatar} alt={name} className="h-full w-full object-cover" onError={({ currentTarget }) => { currentTarget.style.display = "none" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm md:text-lg font-semibold text-gray-700">Worker:</span>
                            <span className="text-lg md:text-xl font-semibold text-[#008cfc] leading-tight truncate">{name}</span>
                          </div>
                          {emailAddress ? <div className="text-xs text-gray-600 truncate">{emailAddress}</div> : null}
                        </div>
                        <div className="hidden" />
                        {singleIcon ? (
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
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
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
                          Work Done
                          <span className="ml-2 text-sm font-semibold text-[#008cfc]">{workDone}</span>
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
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Age</div>
                      <div className="text-sm text-[#008cfc]">{Number.isFinite(age) ? age : "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Barangay</div>
                      <div className="text-sm text-[#008cfc]">{barangay || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Street</div>
                      <div className="text-sm text-[#008cfc]">{street || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Rate Type</div>
                      <div className="text-sm text-[#008cfc]">{rateType || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Service Rate</div>
                      <div className="text-sm text-[#008cfc]">{displayRate}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white sm:col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Years of Experience</div>
                      <div className="text-sm text-[#008cfc]">{Number.isFinite(yearsExp) ? `${yearsExp}` : "—"}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Work Description</div>
                    <div className="mt-2 text-sm text-[#008cfc] leading-6 bg-gray-50/60 border border-gray-200 rounded-xl p-4">{w.bio || w.title || d.work_description || "—"}</div>
                  </div>

                  <div className="mt-8 border-t border-gray-200" />
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-700">Ratings & Reviews</div>

                    <div className="mt-4 space-y-3">
                      {(reviewItems.length ? reviewItems : [{ id: "empty", rating: 0, text: "No reviews yet.", created_at: null }]).map((rv) => {
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
                        Works Done
                        <span className="ml-2 text-sm font-semibold text-[#008cfc]">{workDone}</span>
                      </span>
                    </div>
                    <button onClick={onClose} className="hidden">Close</button>
                    <a href="/client/post" className="h-9 px-4 rounded-md bg-[#008cfc] text-sm text-white hover:bg-[#0078d6] inline-flex items-center justify-center">Book Worker</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white p-4 sticky bottom-0 hidden">
            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
              <a href="/client/post" className="h-10 px-5 rounded-md bg-[#008cfc] text-white hover:bg-[#0078d6] inline-flex items-center justify-center">Hire Worker</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
