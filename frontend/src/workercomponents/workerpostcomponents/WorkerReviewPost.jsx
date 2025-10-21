import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [requestGroupId, setRequestGroupId] = useState(null);

  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  }, []);

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
      <span className={`text-[15px] leading-6 ${contactLocal10 ? 'text-gray-900' : 'text-gray-400'}`}>
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
        <span className="text-sm font-semibold text-black">{labelText}</span>
        {isElement ? (
          <div className="text-[15px] leading-6 text-gray-900">{display}</div>
        ) : (
          <span className="text-[15px] leading-6 text-gray-900">{display}</span>
        )}
      </div>
    );
  };

  const handleBackClick = () => {
    jumpTop();
    if (typeof handleBack === 'function') handleBack();
    else navigate(-1);
  };

  const handleConfirm = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const base = String(API_BASE || '').replace(/\/+$/, '');

      const payloadRaw = {
        worker_id: localStorage.getItem('worker_id') || null,
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
        email_address: email?.trim() || undefined,
        contact_number: contact_number?.trim() || undefined,
        barangay: barangay?.trim() || undefined,
        street: street?.trim() || undefined,
        birth_date: birth_date || undefined,
        age: toNum(age),
        facebook: savedInfo.facebook || undefined,
        instagram: savedInfo.instagram || undefined,
        linkedin: savedInfo.linkedin || undefined,
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

      const resp = await fetch(`${base}/api/workerapplication/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      let bodyText = '';
      try { bodyText = await resp.text(); } catch {}

      if (!resp.ok) {
        let msg = '';
        try { msg = JSON.parse(bodyText)?.message; } catch {}
        throw new Error(msg || bodyText || `${resp.status} ${resp.statusText}`);
      }

      try {
        const json = bodyText ? JSON.parse(bodyText) : {};
        setRequestGroupId(json?.request?.request_group_id || null);
      } catch {
        setRequestGroupId(null);
      }

      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (e) {
      setIsSubmitting(false);
      setSubmitError(String(e.message || 'Submission failed'));
      console.error('Worker submit failed:', e);
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
    const lock = isSubmitting || showSuccess;
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
  }, [isSubmitting, showSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-lg font-semibold text-gray-900">Review Worker Application</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-gray-500">Step 6 of 6</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-full bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1520px] px-6">
        <div className="space-y-6 mt-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl md:text-2xl font-semibold">Personal Information</h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Worker</span>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                <div className="text-base md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                  <LabelValue label="First Name" value={first_name} />
                  <LabelValue label="Last Name" value={last_name} />
                  <LabelValue label="Contact Number" value={contactDisplay} />
                  <LabelValue label="Email" value={email} />
                  <LabelValue
                    label="Address"
                    value={street && barangay ? `${street}, ${barangay}` : street || barangay}
                  />
                  <div className="md:col-span-2 pt-4">
                    <div className="text-lg font-semibold text-gray-900 mb-2">Social Media</div>
                  </div>
                  <LabelValue label="Facebook" value={savedInfo.facebook || ''} emptyAs="None" />
                  <LabelValue label="Instagram" value={savedInfo.instagram || ''} emptyAs="None" />
                  <LabelValue label="LinkedIn" value={savedInfo.linkedin || ''} emptyAs="None" />
                </div>

                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="text-sm font-semibold text-black mb-3">Profile Picture</div>
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xl md:text-2xl font-semibold">Work Details</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Details</span>
                </div>
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                    <LabelValue label="Service Types" value={formatList(service_types)} />
                    <div className="md:col-span-2">
                      <div className="text-sm font-semibold text-black mb-2">Selected Tasks</div>
                      {job_details && typeof job_details === 'object' && Object.keys(job_details).length ? (
                        <div className="space-y-2">
                          {Object.entries(job_details).map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
                              <span className="text-sm font-semibold text-black">{`${k.replace(/:?\s*$/,'')}:`}</span>
                              <span className="text-[15px] leading-6 text-gray-900">{formatList(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </div>
                    <LabelValue label="Tools Provided" value={tools_provided} />
                    <LabelValue label="Years of Experience" value={years_experience} />
                    <div className="md:col-span-2">
                      <LabelValue label="Description" value={service_description || '-'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xl md:text-2xl font-semibold">Service Rate</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border-emerald-100">Pricing</span>
                </div>
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[435.5px] flex flex-col">
                <div className="bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] px-6 py-5 text-white">
                  <div className="text-base font-medium">Summary</div>
                  <div className="text-sm text-white/90">Review everything before submitting</div>
                </div>
                <div className="px-6 py-5 space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Worker</span>
                    <span className="text-sm font-medium text-gray-900">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Services</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[55%] text-right">{formatList(service_types)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Experience</span>
                    <span className="text-sm font-medium text-gray-900">{years_experience || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tools</span>
                    <span className="text-sm font-medium text-gray-900">{tools_provided || '-'}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Rate</div>
                    {rate_type === 'Hourly Rate' ? (
                      <div className="text-lg font-semibold text-gray-900">₱{rate_from ?? 0}–₱{rate_to ?? 0} <span className="text-sm font-normal text-gray-500">per hour</span></div>
                    ) : rate_type === 'By the Job Rate' ? (
                      <div className="text-lg font-semibold text-gray-900">₱{rate_value ?? 0} <span className="text-sm font-normal text-gray-500">per job</span></div>
                    ) : (
                      <div className="text-gray-500 text-sm">No rate provided</div>
                    )}
                  </div>
                </div>
                {submitError ? (
                  <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{submitError}</div>
                ) : null}
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 -mt-8">
                  <button
                    type="button"
                    onClick={handleBackClick}
                    className="w-full sm:w-1/2 h-[50px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Back : Step 5
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full sm:w-1/2 h-[50px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Confirm Application
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {false && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-2xl font-semibold mb-10">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                  <div className="text-lg md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <LabelValue label="First Name" value={first_name} />
                    <LabelValue label="Last Name" value={last_name} />
                    <LabelValue label="Birthdate" value={birth_date} />
                    <LabelValue label="Contact Number" value={contactDisplay} />
                    <LabelValue label="Email" value={email} />
                    <LabelValue label="Address" value={street && barangay ? `${street}, ${barangay}` : street || barangay} />
                    <div className="hidden md:block mt-14" />
                    <div className="md:col-span-2 pt-2 mt-7">
                      <h4 className="text-2xl font-semibold">Social Media</h4>
                    </div>
                    <LabelValue label="Facebook" value={savedInfo.facebook || '-'} emptyAs="None" />
                    <LabelValue label="Instagram" value={savedInfo.instagram || '-'} emptyAs="None" />
                    <LabelValue label="LinkedIn" value={savedInfo.linkedin || '-'} emptyAs="None" />
                  </div>
                  <div className="md:col-span-1">
                    <h4 className="text-xl font-semibold mb-2">Profile Picture</h4>
                    {profile_picture ? (
                      <img
                        src={profile_picture}
                        alt="Profile"
                        className="w-40 h-40 rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-[#008cfc]">-</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-2xl font-semibold mb-10">Work Details</h3>
                <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <LabelValue label="Service Types" value={formatList(service_types)} />
                  <LabelValue label="Years of Experience" value={years_experience} />
                  <LabelValue label="Tools Provided" value={tools_provided} />
                  <div className="md:col-span-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-gray-900 whitespace-nowrap">Description:</span>
                      <span className="text-[#008cfc]">{service_description || '-'}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-xl font-semibold mb-2">Selected Tasks</h4>
                    <div className="text-[#008cfc]">
                      {job_details && typeof job_details === 'object' && Object.keys(job_details).length
                        ? Object.entries(job_details).map(([k, v]) => (
                            <div key={k} className="mb-1">
                              <span className="font-semibold text-gray-900 mr-1">{k}:</span>
                              <span>{formatList(v)}</span>
                            </div>
                          ))
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-2xl font-semibold mb-10">Service Rate</h3>
                <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
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

              <div className="flex justify-between mt-28">
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
                >
                  Back : Step 5
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
                >
                  Confirm Application
                </button>
              </div>

              {submitError && (
                <div className="mt-6 text-red-600 text-sm">{submitError}</div>
              )}
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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
        >
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
              <div className="text-base font-semibold text-gray-900">Submitting Application</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
        >
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
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
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
