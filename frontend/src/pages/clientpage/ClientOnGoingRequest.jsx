import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const GLOBAL_DESC_KEY = 'clientServiceDescription';

export default function ClientOnGoingRequest() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [logoBroken, setLogoBroken] = useState(false);
  const [clientIdState, setClientIdState] = useState(null);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);

  const buildAppU = () => {
    try {
      const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
      const e = a.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      return encodeURIComponent(JSON.stringify({ r: 'client', e, au }));
    } catch { return ''; }
  };
  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  const getClientEmail = () => {
    try {
      const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
      return a.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
    } catch { return ''; }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/clients/me`, { withCredentials: true, headers: headersWithU });
        const cid = data?.id || null;
        const au = data?.auth_uid || null;
        if (cid) localStorage.setItem('client_id', String(cid));
        if (au) localStorage.setItem('auth_uid', String(au));
        setClientIdState(cid || null);
      } catch {
        const cidLS = localStorage.getItem('client_id');
        setClientIdState(cidLS ? Number(cidLS) : null);
      }
    };
    fetchMe();
  }, [headersWithU]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(id)}`, { withCredentials: true, headers: headersWithU });
        if (!cancelled) setRow(data || null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, headersWithU]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (id) return;
      setLoading(true);
      try {
        const email = getClientEmail();
        if (!email) {
          setRow(null);
        } else {
          const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/approved`, { params: { email, limit: 1 }, withCredentials: true, headers: headersWithU });
          const item = Array.isArray(data?.items) ? data.items[0] || null : null;
          if (!cancelled) setRow(item);
        }
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, headersWithU]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevH = html.style.overflow;
    const prevB = body.style.overflow;
    if (loading || leaving) { html.style.overflow = 'hidden'; body.style.overflow = 'hidden'; }
    else { html.style.overflow = prevH || ''; body.style.overflow = prevB || ''; }
    return () => { html.style.overflow = prevH || ''; body.style.overflow = prevB || ''; };
  }, [loading, leaving]);

  const s = location.state || {};
  const fx = row || {};
  const infoR = fx.info || {};
  const detR = fx.details || {};
  const rateR = fx.rate || {};
  const progressR = fx.progress || fx.timeline || {};

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; } })();
  const savedDetails = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; } })();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; } })();

  const first_name = infoR.first_name ?? s.first_name ?? savedInfo.firstName;
  const last_name = infoR.last_name ?? s.last_name ?? savedInfo.lastName;
  const contact_number = infoR.contact_number ?? s.contact_number ?? savedInfo.contactNumber;
  const email = infoR.email_address ?? s.email ?? savedInfo.email;
  const street = infoR.street ?? s.street ?? savedInfo.street;
  const barangay = infoR.barangay ?? s.barangay ?? savedInfo.barangay;
  const additional_address = infoR.additional_address ?? s.additional_address ?? savedInfo.additionalAddress;
  const profile_picture = infoR.profile_picture_url ?? s.profile_picture ?? savedInfo.profilePicture;

  const service_type = detR.service_type ?? s.service_type ?? savedDetails.serviceType;
  const service_task = detR.service_task ?? s.service_task ?? savedDetails.serviceTask;
  const preferred_date = detR.preferred_date ?? s.preferred_date ?? savedDetails.preferredDate;
  const preferred_time = detR.preferred_time ?? s.preferred_time ?? savedDetails.preferredTime;
  const is_urgent = detR.is_urgent ?? s.is_urgent ?? savedDetails.isUrgent;
  const tools_provided = detR.tools_provided ?? s.tools_provided ?? savedDetails.toolsProvided;
  const service_description = detR.service_description ?? s.service_description ?? savedDetails.serviceDescription;
  const review_image = detR.request_image_url || detR.image || (Array.isArray(savedDetails.attachments) && savedDetails.attachments[0]) || savedDetails.image || '';

  const inferredRateType = rateR.rate_type ?? s.rate_type ?? savedRate.rateType;
  const rate_type = (() => {
    const t = String(inferredRateType || '').toLowerCase();
    if (t === 'range' || t === 'hourly') return 'Hourly Rate';
    if (t === 'fixed' || t === 'by_job' || t === 'by the job' || t === 'by_the_job') return 'By the Job Rate';
    return inferredRateType || '';
  })();
  const rate_from = rateR.rate_from ?? s.rate_from ?? savedRate.rateFrom;
  const rate_to = rateR.rate_to ?? s.rate_to ?? savedRate.rateTo;
  const rate_value = rateR.rate_value ?? s.rate_value ?? savedRate.rateValue;

  const formatTime12h = (t) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return t || '-';
    const [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mm} ${suffix}`;
  };

  const formatDateMDY = (d) => {
    if (!d) return d || '-';
    const tryDate = new Date(d);
    if (!Number.isNaN(tryDate.getTime())) {
      const mm = String(tryDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tryDate.getDate()).padStart(2, '0');
      const yyyy = String(tryDate.getFullYear());
      return `${mm}/${dd}/${yyyy}`;
    }
    const parts = String(d).split('-');
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}/${yyyy}`;
    }
    return d;
  };

  const toBoolStrict = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    const s2 = String(v ?? '').trim().toLowerCase();
    if (['yes', 'y', 'true', 't'].includes(s2)) return true;
    if (['no', 'n', 'false', 'f'].includes(s2)) return false;
    return false;
  };

  const normalizeLocalPH10 = (v) => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10 && d[0] === '9') return d;
    return '';
  };

  const contactLocal10 = normalizeLocalPH10(contact_number);

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const mapped = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
    const isEmpty = !isElement && (mapped === null || mapped === undefined || (typeof mapped === 'string' && mapped.trim() === ''));
    const display = isElement ? value : isEmpty ? emptyAs : mapped;
    const labelText = `${String(label || '').replace(/:?\s*$/, '')}:`;
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-gray-700 font-semibold">{labelText}</span>
        {isElement ? (
          <div className="text-[15px] md:text-base text-[#008cfc] font-semibold">{display}</div>
        ) : (
          <span className="text-[15px] md:text-base text-[#008cfc] font-semibold">{display}</span>
        )}
      </div>
    );
  };

  const contactDisplay = (
    <div className="inline-flex items-center gap-2">
      <img src="/philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>{contactLocal10 || '9XXXXXXXXX'}</span>
    </div>
  );

  const statusNow = String(fx.status || fx.request_status || detR.status || '').toLowerCase();
  const startedAt = progressR.started_at || progressR.service_started_at || fx.started_at || fx.service_started_at || null;
  const enrouteAt = progressR.enroute_at || progressR.worker_on_the_way_at || progressR.arrived_eta_at || null;
  const arrivedAt = progressR.arrived_at || progressR.worker_arrived_at || null;
  const workStartAt = progressR.work_started_at || progressR.begin_at || null;
  const workEndAt = progressR.work_completed_at || progressR.completed_at || null;
  const clientConfirmAt = progressR.client_confirmed_at || progressR.confirmed_done_at || null;

  const steps = [
    { key: 'scheduled', label: 'Scheduled', at: fx.approved_at || detR.approved_at || startedAt || fx.created_at || fx.requested_at || null },
    { key: 'enroute', label: 'On The Way', at: enrouteAt || null },
    { key: 'arrived', label: 'Arrived', at: arrivedAt || null },
    { key: 'inservice', label: 'In Service', at: workStartAt || null },
    { key: 'review', label: 'Quality Review', at: workEndAt || null },
    { key: 'completed', label: 'Completed', at: clientConfirmAt || (statusNow === 'completed' ? (workEndAt || new Date().toISOString()) : null) }
  ];

  const stepIndex = (() => {
    if (clientConfirmAt || statusNow === 'completed') return 5;
    if (workEndAt) return 4;
    if (workStartAt) return 3;
    if (arrivedAt) return 2;
    if (enrouteAt) return 1;
    if (steps[0].at) return 0;
    return 0;
  })();

  const [progressPct, setProgressPct] = useState(0);
  const targetPct = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0;
  useEffect(() => { const t = setTimeout(() => setProgressPct(targetPct), 60); return () => clearTimeout(t); }, [targetPct, stepIndex]);

  const handleBack = async () => {
    setLeaving(true);
    try { localStorage.removeItem(GLOBAL_DESC_KEY); } catch {}
    await new Promise((r) => setTimeout(r, 250));
    if (window.history.length > 1) navigate(-1);
    else navigate('/clientdashboard', { replace: true });
  };

  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v) return v;
    }
    return null;
  };

  const workerRaw =
    fx.worker ||
    fx.accepted_worker ||
    fx.assigned_worker ||
    fx.assignee ||
    fx.provider ||
    fx.worker_info ||
    {};

  const workerObj = workerRaw.info || workerRaw.worker || workerRaw || {};
  const workerFirst = pick(workerObj, ['first_name', 'firstName']) || '';
  const workerLast = pick(workerObj, ['last_name', 'lastName']) || '';
  const workerFullName = pick(workerObj, ['full_name', 'fullName']) || `${workerFirst} ${workerLast}`.trim();
  const workerEmail = pick(workerObj, ['email_address', 'email']) || '';
  const workerPhoto = pick(workerObj, ['profile_picture_url', 'profile_picture']) || '';

  const workerInitials = (() => {
    const f = String(workerFirst || '').trim().slice(0, 1);
    const l = String(workerLast || '').trim().slice(0, 1);
    if (workerFullName && !f && !l) {
      const parts = String(workerFullName).trim().split(/\s+/);
      const a = (parts[0] || '').slice(0, 1);
      const b = (parts[parts.length - 1] || '').slice(0, 1);
      return `${a}${b}`.toUpperCase();
    }
    return `${f}${l}`.toUpperCase();
  })();

  const Stepper = ({ steps, active }) => {
    return (
      <div className="w-full">
        <div className="relative">
          <div className="absolute left-5 right-5 top-[18px] h-1 rounded-full bg-gray-200" />
          <div
            className="absolute left-5 top-[18px] h-1 rounded-full bg-gradient-to-r from-[#22a6ff] via-[#008cfc] to-[#006ad6] transition-all duration-700 ease-out"
            style={{ width: `calc(${progressPct}% - 40px)` }}
          />
          <div className="flex justify-between">
            {steps.map((st, i) => {
              const done = i < active;
              const current = i === active;
              return (
                <div key={st.key} className="flex flex-col items-center w-16 sm:w-24 md:w-28">
                  <div className="relative">
                    <div
                      className={[
                        'h-10 w-10 rounded-full grid place-items-center border text-sm font-semibold transition-all duration-500',
                        done ? 'bg-[#008cfc] text-white border-[#008cfc] scale-95' : current ? 'bg-white text-[#008cfc] border-[#008cfc] shadow-[0_0_0_4px_rgba(0,140,252,0.12)] animate-pulse' : 'bg-white text-gray-400 border-gray-300'
                      ].join(' ')}
                    >
                      {done ? (
                        <svg viewBox="0 0 20 20" className="h-4 w-4"><path fill="currentColor" d="M8.5 13.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L14.5 7l-6 6z"/></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-[11px] sm:text-xs md:text-sm font-medium ${i <= active ? 'text-gray-900' : 'text-gray-400'}`}>{st.label}</div>
                    {st.at ? <div className="text-[10px] sm:text-[11px] text-gray-500">{formatDateMDY(st.at)}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Timeline = () => {
    const items = [
      { k: 'completed', label: 'Client Confirmed Completed', at: clientConfirmAt },
      { k: 'work_end', label: 'Work Completed', at: workEndAt },
      { k: 'work_start', label: 'Work Started', at: workStartAt },
      { k: 'arrived', label: 'Worker Arrived', at: arrivedAt },
      { k: 'enroute', label: 'Worker On The Way', at: enrouteAt },
      { k: 'approved', label: 'Scheduled/Approved', at: steps[0].at }
    ].filter(x => !!x.at);
    if (!items.length) return null;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Activity</h3>
        </div>
        <div className="border-t border-gray-100" />
        <div className="px-6 py-6">
          <ol className="relative border-s border-gray-200">
            {items.map((it) => (
              <li key={it.k} className="mb-6 ms-4">
                <div className="absolute w-3 h-3 bg-[#008cfc] rounded-full mt-1.5 -start-1.5 border border-white" />
                <time className="mb-1 text-xs font-normal leading-none text-gray-500">{formatDateMDY(it.at)}</time>
                <div className="text-sm font-semibold text-gray-900">{it.label}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  };

  const preferred_time_display = formatTime12h(preferred_time);
  const preferred_date_display = formatDateMDY(preferred_date);

  const handleMessageWorker = () => {
    const to = workerEmail || '';
    if (to) window.location.href = `mailto:${to}`;
  };

  const groupId =
    fx.request_group_id ||
    fx.group_id ||
    detR.request_group_id ||
    fx.groupId ||
    id ||
    '';

  const bookingId = useMemo(() => {
    if (!groupId) return null;
    const core = String(groupId).replace(/[^a-z0-9]/gi, '');
    const compact = (core.length >= 10 ? core.slice(0,4) + core.slice(-6) : core).toUpperCase();
    return `JDK-${compact}`;
  }, [groupId]);

  return (
    <>
      <ClientNavigation />
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
          <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
                <img src="/jdklogo.png" alt="" className="h-6 w-6 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
              </div>
              <div className="text-2xl md:text-3xl font-semibold text-gray-900">Ongoing Service</div>
            </div>

            <div className="flex items-center gap-4 max-w-[55%]">
              {(() => {
                const workerRaw =
                  fx.worker ||
                  fx.accepted_worker ||
                  fx.assigned_worker ||
                  fx.assignee ||
                  fx.provider ||
                  fx.worker_info ||
                  {};
                const workerObj = workerRaw.info || workerRaw.worker || workerRaw || {};
                const pick = (o, arr) => { for (const k of arr) { if (o?.[k]) return o[k]; } return null; };
                const wf = pick(workerObj, ['first_name','firstName']) || '';
                const wl = pick(workerObj, ['last_name','lastName']) || '';
                const wname = pick(workerObj, ['full_name','fullName']) || `${wf} ${wl}`.trim();
                const wemail = pick(workerObj, ['email_address','email']) || '';
                const wphoto = pick(workerObj, ['profile_picture_url','profile_picture']) || '';
                const initials = (() => {
                  const f = String(wf || '').trim().slice(0,1);
                  const l = String(wl || '').trim().slice(0,1);
                  if (wname && !f && !l) {
                    const parts = String(wname).trim().split(/\s+/);
                    const a = (parts[0] || '').slice(0,1);
                    const b = (parts[parts.length-1] || '').slice(0,1);
                    return `${a}${b}`.toUpperCase();
                  }
                  return `${f}${l}`.toUpperCase();
                })();
                return (
                  <>
                    {wphoto ? (
                      <img src={wphoto} alt="" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-blue-100 flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-50 text-[#008cfc] border border-blue-200 grid place-items-center text-sm font-semibold flex-shrink-0">
                        {initials || 'WK'}
                      </div>
                    )}
                    <div className="min-w-0 text-right">
                      <div className="text-[11px] md:text-xs text-gray-600">Assigned Worker</div>
                      <div className="text-sm md:text-base font-semibold text-gray-900 truncate">{wname || '—'}</div>
                      <div className="text-[11px] md:text-xs text-[#008cfc] truncate">{wemail || ''}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1420px] px-6">
          {bookingId ? (
            <div className="mt-6 mb-2 text-sm md:text-base font-semibold text-gray-600">
              Booking ID: <span className="text-[#008cfc]">{bookingId}</span>
            </div>
          ) : null}

          <div className="mt-2 bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">Progress</h3>
              <div className="text-xs md:text-sm px-2 py-1 rounded-lg bg-blue-50 text-[#008cfc] font-semibold">{stepIndex < steps.length - 1 ? `Step ${stepIndex + 1} of ${steps.length}` : 'Completed'}</div>
            </div>
            <div className="border-t border-gray-100" />
            <div className="px-6 py-6">
              <Stepper steps={steps} active={stepIndex} />
            </div>
          </div>

          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-base">
                    <LabelValue label="First Name" value={first_name} />
                    <LabelValue label="Last Name" value={last_name} />
                    <LabelValue label="Contact Number" value={contactDisplay} />
                    <LabelValue label="Email" value={email} />
                    <LabelValue label="Address" value={barangay && street ? `${barangay}, ${street}` : barangay || street} />
                    {additional_address ? <LabelValue label="Landmark" value={additional_address} /> : <div className="hidden md:block" />}
                  </div>
                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="text-sm font-medium text-gray-700 mb-3">Client Picture</div>
                    {profile_picture ? (
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-blue-100 bg-white shadow-sm">
                        <img src={profile_picture} alt="Profile" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full grid place-items-center bg-gray-50 text-gray-400 border border-dashed">
                        <span className="text-sm">No Image</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Request Details</h3>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-6">
                    <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      <LabelValue label="Service Type" value={service_type} />
                      <LabelValue label="Service Task" value={service_task} />
                      <LabelValue label="Preferred Date" value={formatDateMDY(preferred_date)} />
                      <LabelValue label="Preferred Time" value={formatTime12h(preferred_time)} />
                      <LabelValue label="Urgent" value={<span className="text-base md:text-lg font-semibold text-[#008cfc]">{toBoolStrict(is_urgent) ? 'Yes' : 'No'}</span>} />
                      <LabelValue label="Tools Provided" value={<span className="text-base md:text-lg font-semibold text-[#008cfc]">{toBoolStrict(tools_provided) ? 'Yes' : 'No'}</span>} />
                      <div className="md:col-span-2">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-gray-700 font-semibold">Description:</span>
                          <span className="text-[15px] md:text-base text-[#008cfc] font-semibold">{service_description || '-'}</span>
                        </div>
                      </div>
                      {review_image ? (
                        <div className="md:col-span-2">
                          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                            <span className="text-gray-700 font-semibold">Request Image:</span>
                            <div className="w-full">
                              <div className="w-full h-64 rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50">
                                <img src={review_image} alt="" className="w-full h-full object-cover object-center" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-6">
                    <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      <LabelValue label="Rate Type" value={rate_type} />
                      {rate_type === 'Hourly Rate' ? (
                        <LabelValue label="Rate" value={rate_from && rate_to ? `₱${rate_from} - ₱${rate_to} per hour` : ''} />
                      ) : (
                        <LabelValue label="Rate" value={rate_value ? `₱${rate_value}` : ''} />
                      )}
                    </div>
                  </div>
                </div>

                <Timeline />
              </div>

              <aside className="lg:col-span-1 flex flex-col">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="text-base font-semibold text-gray-900">Summary</div>
                    <div className={`text-xs px-2 py-1 rounded-md ${stepIndex === steps.length - 1 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-[#008cfc]'} font-semibold`}>
                      {stepIndex < steps.length - 1 ? 'In Progress' : 'Completed'}
                    </div>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-5 space-y-4 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Client:</span>
                      <span className="text-base font-semibold text-[#008cfc]">{first_name || '-'} {last_name || ''}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Service:</span>
                      <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_type || '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Task:</span>
                      <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_task || '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Schedule:</span>
                      <span className="text-base font-semibold text-[#008cfc]">{preferred_date_display || '-'} • {formatTime12h(preferred_time) || '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Urgent:</span>
                      <span className="text-base font-semibold text-[#008cfc]">{toBoolStrict(is_urgent) ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-600">Tools:</span>
                      <span className="text-base font-semibold text-[#008cfc]">{toBoolStrict(tools_provided) ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-600">Rate:</span>
                      {rate_type === 'Hourly Rate' ? (
                        <div className="text-lg font-bold text-[#008cfc]">₱{rate_from ?? 0}–₱{rate_to ?? 0} <span className="text-sm font-semibold opacity-80">per hour</span></div>
                      ) : rate_type === 'By the Job Rate' ? (
                        <div className="text-lg font-bold text-[#008cfc]">₱{rate_value ?? 0} <span className="text-sm font-semibold opacity-80">per job</span></div>
                      ) : (
                        <div className="text-gray-500 text-sm">No rate provided</div>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleMessageWorker}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold bg-[#008cfc] text-white"
                      >
                        Message Worker
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {loading && (
          <div role="dialog" aria-modal="true" aria-label="Loading request" tabIndex={-1} autoFocus onKeyDown={(e)=>{e.preventDefault();e.stopPropagation();}} onClick={(e)=>{e.preventDefault();e.stopPropagation();}} className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 animate-spin rounded-full" style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }} />
                <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? (
                    <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center space-y-1">
                <div className="text-lg font-semibold text-gray-900">Loading Request</div>
                <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>
        )}

        {leaving && (
          <div role="dialog" aria-modal="true" aria-label="Please wait a moment" tabIndex={-1} autoFocus onKeyDown={(e)=>{e.preventDefault();e.stopPropagation();}} onClick={(e)=>{e.preventDefault();e.stopPropagation();}} className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 animate-spin rounded-full" style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }} />
                <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? (
                    <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center space-y-1">
                <div className="text-lg font-semibold text-gray-900">Please wait a moment</div>
                <div className="text-sm text-gray-600 animate-pulse">Finalizing</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ClientFooter />
    </>
  );
}
