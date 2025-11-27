import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (['1','true','t','yes','y'].includes(s)) return true;
  if (['0','false','f','no','n'].includes(s)) return false;
  return false;
};

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const onlyStrings = (arr) =>
  Array.isArray(arr) ? arr.map(String).filter((s) => s.length > 0) : [];

const onlyStringArrayValues = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[String(k)] = onlyStrings(v);
  }
  return out;
};

const pruneEmpty = (o) => {
  if (o === null || o === undefined) return undefined;
  if (Array.isArray(o)) {
    const a = o.map(pruneEmpty).filter((v) => v !== undefined);
    return a.length ? a : undefined;
  }
  if (typeof o === 'object') {
    const r = {};
    Object.entries(o).forEach(([k, v]) => {
      const pv = pruneEmpty(v);
      if (pv !== undefined && pv !== '') r[k] = pv;
    });
    return Object.keys(r).length ? r : undefined;
  }
  return o;
};

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

const clearWorkerApplicationDrafts = () => {
  try {
    localStorage.removeItem('workerInformationForm');
    localStorage.removeItem('workerWorkInformation');
    localStorage.removeItem('workerDocuments');
    localStorage.removeItem('workerDocumentsData');
    localStorage.removeItem('workerRate');
    localStorage.removeItem('workerAgreements');
  } catch {}
};

const WorkerReviewPost = ({ handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoBroken, setLogoBroken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [requestGroupId, setRequestGroupId] = useState(null);

  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  }, []);

  const buildAppU = () => {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('worker_auth_uid') || '';
      const e = a.email || localStorage.getItem('worker_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
    } catch { return ''; }
  };
  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await axios.get(`${String(API_BASE||'').replace(/\/+$/,'')}/api/workers/me`, { withCredentials: true, headers: { Accept: 'application/json', ...headersWithU } });
        const wid = data?.id || data?.worker_id || null;
        const au = data?.auth_uid || data?.uid || null;
        if (wid) localStorage.setItem('worker_id', String(wid));
        if (au) localStorage.setItem('worker_auth_uid', String(au));
      } catch {}
    };
    fetchMe();
  }, [headersWithU]);

  const jumpTop = () => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  };

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('workerInformationForm') || '{}'); } catch { return {}; }})();
  const savedWork = (() => { try { return JSON.parse(localStorage.getItem('workerWorkInformation') || '{}'); } catch { return {}; }})();
  const savedDocsMeta = (() => { try { return JSON.parse(localStorage.getItem('workerDocuments') || '{}'); } catch { return {}; }})();
  const savedDocsData = (() => { try { return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]'); } catch { return []; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('workerRate') || '{}'); } catch { return {}; }})();
  const savedAgree = (() => { try { return JSON.parse(localStorage.getItem('workerAgreements') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const first_name = s.first_name ?? savedInfo.firstName ?? '';
  const last_name = s.last_name ?? savedInfo.lastName ?? '';
  const birth_date = s.birth_date ?? savedInfo.birth_date ?? '';
  const age = s.age ?? savedInfo.age ?? computeAge(birth_date);
  const contact_number = s.contact_number ?? savedInfo.contactNumber ?? '';
  const email = s.email ?? savedInfo.email ?? '';
  const street = s.street ?? savedInfo.street ?? '';
  const barangay = s.barangay ?? savedInfo.barangay ?? '';
  const profile_picture = s.profile_picture ?? savedInfo.profilePicture ?? null;
  const profile_picture_name = s.profile_picture_name ?? savedInfo.profilePictureName ?? '';

  const service_types = s.service_types ?? savedWork.service_types ?? savedWork.serviceTypesSelected ?? [];
  const job_details = s.job_details ?? savedWork.job_details ?? savedWork.jobDetails ?? {};
  const years_experience = s.years_experience ?? savedWork.years_experience ?? savedWork.yearsExperience ?? '';
  const tools_provided = s.tools_provided ?? savedWork.tools_provided ?? savedWork.toolsProvided ?? '';
  const service_description = s.service_description ?? savedWork.service_description ?? savedWork.serviceDescription ?? '';

  const rate_type = s.rate_type ?? savedRate.rate_type ?? savedRate.rateType ?? '';
  const rate_from = s.rate_from ?? savedRate.rate_from ?? savedRate.rateFrom ?? '';
  const rate_to = s.rate_to ?? savedRate.rate_to ?? savedRate.rateTo ?? '';
  const rate_value = s.rate_value ?? savedRate.rate_value ?? savedRate.rateValue ?? '';

  const docsFromState = Array.isArray(s.docs) ? s.docs : [];
  const docs = docsFromState.length ? docsFromState : savedDocsData;

  const formatList = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '-';

  const normalizeLocalPH10 = (v) => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10 && d[0] === '9') return d;
    return '';
  };

  const contactLocal10 = normalizeLocalPH10(contact_number);

  const contactDisplay = (
    <div className="inline-flex items-center gap-2">
      <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className="text-gray-700 text-sm">+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-medium' : 'text-gray-400'}`}>
        {contactLocal10 || '9XXXXXXXXX'}
      </span>
    </div>
  );

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const isEmpty =
      !isElement &&
      (value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === ''));
    const display = isElement ? value : isEmpty ? emptyAs : value;
    const labelText = `${String(label || '').replace(/:?\s*$/, '')}:`;
    return (
      <div className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
        <span className="font-semibold text-gray-700">{labelText}</span>
        {isElement ? (
          <div className="text-base md:text-lg">{display}</div>
        ) : (
          <span className="text-base md:text-lg font-medium text-[#008cfc]">{display}</span>
        )}
      </div>
    );
  };

  const handleBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      if (typeof handleBack === 'function') handleBack();
      else navigate(-1);
    }, 2000);
  };

  const cleanNumber = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).toString().replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const requireFields = (obj, keys) => {
    const missing = [];
    keys.forEach(k => {
      const val = obj[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) missing.push(k);
    });
    return missing;
  };

  const filterHostedOnly = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(u => {
      const s = String(u || '');
      if (!s) return false;
      if (s.startsWith('data:')) return false;
      if (/^https?:\/\//i.test(s)) return true;
      if (/^\/?storage\/v1\/object\/public\//i.test(s)) return true;
      return false;
    });
  };

  const handleConfirm = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const base = String(API_BASE || '').replace(/\/+$/, '');
      const workerIdLS = localStorage.getItem('worker_id') || null;
      const workerAuth = (() => { try { return JSON.parse(localStorage.getItem('workerAuth') || '{}'); } catch { return {}; }})();
      const emailVal = (email || workerAuth.email || localStorage.getItem('worker_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '').toString().trim().toLowerCase();

      const payloadRaw = {
        worker_id: workerIdLS || null,
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
        email_address: emailVal || undefined,
        contact_number: contact_number?.trim() || undefined,
        barangay: barangay?.trim() || undefined,
        street: street?.trim() || undefined,
        birth_date: birth_date || undefined,
        age: toNum(age),
        profile_picture: typeof profile_picture === 'string' ? profile_picture : undefined,
        profile_picture_name: profile_picture_name || undefined,
        service_types: onlyStrings(service_types),
        job_details: onlyStringArrayValues(job_details),
        years_experience: toNum(years_experience),
        tools_provided: toBool(tools_provided),
        work_description: service_description || undefined,
        rate_type: rate_type || undefined,
        rate_from: toNum(rate_from),
        rate_to: toNum(rate_to),
        rate_value: toNum(rate_value),
        docs: Array.isArray(docs) ? docs : [],
        metadata: {
          agree_verify: !!savedAgree.agree_verify,
          agree_tos: !!savedAgree.agree_tos,
          agree_privacy: !!savedAgree.agree_privacy
        }
      };

      const payload = pruneEmpty(payloadRaw) || {};

      const normalized = {
        worker_id: payload.worker_id || null,
        first_name: payload.first_name || '',
        last_name: payload.last_name || '',
        email_address: payload.email_address || '',
        contact_number: payload.contact_number || '',
        barangay: payload.barangay || '',
        street: payload.street || '',
        birth_date: payload.birth_date || '',
        age: payload.age ?? null,
        profile_picture: payload.profile_picture || '',
        profile_picture_name: payload.profile_picture_name || '',
        service_types: payload.service_types || [],
        job_details: payload.job_details || {},
        years_experience: payload.years_experience ?? null,
        tools_provided: !!payload.tools_provided,
        service_description: payload.work_description || '',
        rate_type: payload.rate_type || '',
        rate_from: payload.rate_from ?? null,
        rate_to: payload.rate_to ?? null,
        rate_value: payload.rate_value ?? null,
        attachments: filterHostedOnly(payload.docs),
        metadata: {
          ...payload.metadata,
          auth_uid: localStorage.getItem('worker_auth_uid') || workerAuth.auth_uid || workerAuth.uid || ''
        }
      };

      if (normalized.rate_type === 'Hourly Rate') {
        normalized.rate_from = cleanNumber(normalized.rate_from);
        normalized.rate_to = cleanNumber(normalized.rate_to);
        normalized.rate_value = null;
      } else if (normalized.rate_type === 'By the Job Rate') {
        normalized.rate_value = cleanNumber(normalized.rate_value);
        normalized.rate_from = null;
        normalized.rate_to = null;
      } else {
        normalized.rate_from = null;
        normalized.rate_to = null;
        normalized.rate_value = null;
      }

      const missing = requireFields(normalized, [
        'first_name',
        'last_name',
        'contact_number',
        'street',
        'barangay',
        'service_types',
        'service_description',
        'rate_type'
      ]);
      if (missing.length) {
        setIsSubmitting(false);
        setSubmitError(`Missing fields: ${missing.join(', ')}`);
        return;
      }

      if (!(normalized.worker_id && String(normalized.worker_id).trim()) && !(normalized.email_address && String(normalized.email_address).trim())) {
        setIsSubmitting(false);
        setSubmitError('Unable to identify worker. Provide worker_id or a known email_address.');
        return;
      }

      const jsonBody = {
        worker_id: normalized.worker_id,
        first_name: normalized.first_name,
        last_name: normalized.last_name,
        email_address: normalized.email_address,
        contact_number: normalized.contact_number,
        barangay: normalized.barangay,
        street: normalized.street,
        birth_date: normalized.birth_date,
        age: normalized.age,
        profile_picture: normalized.profile_picture,
        profile_picture_name: normalized.profile_picture_name,
        service_types: normalized.service_types,
        job_details: normalized.job_details,
        years_experience: normalized.years_experience,
        tools_provided: normalized.tools_provided,
        service_description: normalized.service_description,
        work_description: normalized.service_description,
        rate_type: normalized.rate_type,
        rate_from: normalized.rate_from,
        rate_to: normalized.rate_to,
        rate_value: normalized.rate_value,
        attachments: normalized.attachments,
        metadata: normalized.metadata
      };

      const resp = await axios.post(
        `${base}/api/workerapplication/submit`,
        jsonBody,
        { withCredentials: true, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headersWithU } }
      );

      setRequestGroupId(resp?.data?.request?.request_group_id || null);
      setShowSuccess(true);
    } catch (e) {
      const serverData = e?.response?.data;
      const msg =
        (serverData && (serverData.message || serverData.error || serverData.details)) ||
        e?.message ||
        'Submission failed';
      setSubmitError(msg);
      console.error('Worker submit failed:', serverData || e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoDashboard = () => {
    clearWorkerApplicationDrafts();
    jumpTop();
    const path = '/workerdashboard';
    try { navigate(path, { state: { submitted: true, request_group_id: requestGroupId, __forceTop: true }, replace: true }); } catch {}
    try { window.location.assign(path); } catch {}
  };

  useEffect(() => {
    const lock = isSubmitting || showSuccess || isLoadingBack;
    if (!lock) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isSubmitting, showSuccess, isLoadingBack]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
              <img src="/jdklogo.png" alt="" className="h-6 w-6 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            </div>
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Review Worker Application</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-gray-500 tracking-wide">Step 6 of 6</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-full bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1420px] px-6">
        <div className="space-y-6 mt-5">
          <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white rounded-t-2xl">
              <h3 className="text-xl md:text-[22px] font-semibold">Personal Information</h3>
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                <span className="h-3 w-3 rounded-full bg-white/60" />
                Worker
              </span>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-base">
                  <LabelValue label="First Name" value={first_name} />
                  <LabelValue label="Last Name" value={last_name} />
                  <LabelValue label="Contact Number" value={contactDisplay} />
                  <LabelValue label="Email" value={email} />
                  <LabelValue
                    label="Address"
                    value={street && barangay ? `${street}, ${barangay}` : street || barangay}
                  />
                </div>

                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="text-sm font-semibold text-black mb-3">Worker Profile Picture</div>
                  {profile_picture ? (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-blue-100 bg-white shadow-sm">
                      <img
                        src={profile_picture}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
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
              <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white rounded-t-2xl">
                  <h3 className="text-xl md:text-[22px] font-semibold">Work Details</h3>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                    <span className="h-3 w-3 rounded-full bg-white/60" />
                    Details
                  </span>
                </div>
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <LabelValue label="Service Types" value={formatList(service_types)} />
                    <LabelValue label="Years of Experience" value={years_experience} />
                    <div className="md:col-span-2">
                      <div className="text-sm font-semibold text-black mb-2">Selected Tasks</div>
                      {job_details && typeof job_details === 'object' && Object.keys(job_details).length ? (
                        <div className="space-y-2">
                          {Object.entries(job_details).map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
                              <span className="font-semibold text-gray-700">{`${k.replace(/:?\s*$/,'')}:`}</span>
                              <span className="text-base md:text-lg font-medium text-[#008cfc]">{formatList(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </div>
                    <LabelValue label="Tools Provided" value={tools_provided} />
                    <div className="md:col-span-2">
                      <LabelValue label="Description" value={service_description || '-'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white rounded-t-2xl">
                  <h3 className="text-xl md:text-[22px] font-semibold">Service Rate</h3>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                    <span className="h-3 w-3 rounded-full bg-white/60" />
                    Pricing
                  </span>
                </div>
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <LabelValue label="Rate Type" value={rate_type} />
                    {rate_type === 'Hourly Rate' ? (
                      <LabelValue
                        label="Rate"
                        value={rate_from && rate_to ? `₱${rate_from} - ₱${rate_to} per hour` : ''}
                      />
                    ) : (
                      <LabelValue label="Rate" value={rate_value ? `₱${rate_value}` : ''} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-1 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 overflow-hidden flex flex-col transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
                <div className="bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] px-6 py-5 text-white rounded-t-2xl">
                  <div className="text-base font-medium">Summary</div>
                  <div className="text-xs text-white/90">Review everything before submitting</div>
                </div>
                <div className="px-6 py-5 space-y-4 flex-1">
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-semibold text-white/80 sr-only">.</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-semibold text-gray-700">Worker:</span>
                    <span className="text-base md:text-lg font-medium text-[#008cfc]">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-semibold text-gray-700">Services:</span>
                    <span className="text-base md:text-lg font-medium text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{formatList(service_types)}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-semibold text-gray-700">Experience:</span>
                    <span className="text-base md:text-lg font-medium text-[#008cfc]">{years_experience || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-semibold text-gray-700">Tools:</span>
                    <span className="text-base md:text-lg font-medium text-[#008cfc]">{tools_provided || '-'}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="grid grid-cols-[120px,1fr] items-start gap-x-2">
                    <span className="text-sm font-semibold text-gray-700">Rate:</span>
                    {rate_type === 'Hourly Rate' ? (
                      <div className="text-lg font-semibold text-[#008cfc]">₱{rate_from ?? 0}–₱{rate_to ?? 0} <span className="text-sm font-normal text-[#008cfc] opacity-80">per hour</span></div>
                    ) : rate_type === 'By the Job Rate' ? (
                      <div className="text-lg font-semibold text-[#008cfc]">₱{rate_value ?? 0} <span className="text-sm font-normal text-[#008cfc] opacity-80">per job</span></div>
                    ) : (
                      <div className="text-gray-500 text-sm">No rate provided</div>
                    )}
                  </div>
                </div>
                {submitError ? (
                  <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{submitError}</div>
                ) : null}
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBackClick}
                    className="w-full sm:w-1/2 h-[50px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full sm:w-1/2 h-[50px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {false && (
            <>
            </>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting application"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
            <div className="mt-6 text-center space-y-1">
              <div className="text-lg font-semibold text-gray-900">Submitting Application</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 5"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
            <div className="mt-6 text-center space-y-1">
              <div className="text-lg font-semibold text-gray-900">Back to Step 5</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && !isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Application submitted"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img
                  src="/jdklogo.png"
                  alt="JDK Homecare Logo"
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
              <div className="text-lg font-semibold text-gray-900">Application Submitted!</div>
              <div className="text-sm text-gray-600">Please wait for admin approval.</div>
              <div className="text-xs text-gray-500">The details below will remain on this page for your reference.</div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Go back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerReviewPost;
