import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const CONFIRM_FLAG = 'clientRequestJustConfirmed';
const GLOBAL_DESC_KEY = 'clientServiceDescription';

const REASONS = [
  'Change of plans',
  'Booked another provider',
  'Schedule conflict',
  'Price too high',
  'Posted by mistake'
];

const ClientViewServiceRequest = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [logoBroken, setLogoBroken] = useState(false);
  const [clientIdState, setClientIdState] = useState(null);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [leavingDone, setLeavingDone] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

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
      if (!id) { setLoading(false); return; }
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
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    if (loading || showCancel || submittingCancel || leavingDone || showCancelSuccess) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    }
    return () => {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    };
  }, [loading, showCancel, submittingCancel, leavingDone, showCancelSuccess]);

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
  const savedDetails = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const fx = row || {};
  const infoR = fx.info || {};
  const detR = fx.details || {};
  const rateR = fx.rate || {};

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

  const review_image = detR.image_url || detR.image || (Array.isArray(savedDetails.attachments) && savedDetails.attachments[0]) || savedDetails.image || '';

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

  const preferred_time_display = formatTime12h(preferred_time);
  const preferred_date_display = formatDateMDY(preferred_date);

  const toBoolStrict = (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    const s2 = String(v ?? '').trim().toLowerCase();
    if (['yes', 'y', 'true', 't'].includes(s2)) return true;
    if (['no', 'n', 'false', 'f'].includes(s2)) return false;
    return false;
  };

  const yesNo = (b) => (b ? 'Yes' : 'No');

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
      <img src="/philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className="text-gray-700 text-sm">+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-medium' : 'text-gray-400'}`}>
        {contactLocal10 || '9XXXXXXXXX'}
      </span>
    </div>
  );

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const mapped = typeof value === 'boolean' ? yesNo(value) : value;
    const isEmpty =
      !isElement &&
      (mapped === null ||
        mapped === undefined ||
        (typeof mapped === 'string' && mapped.trim() === ''));
    const display = isElement ? value : isEmpty ? emptyAs : mapped;
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

  const handleDone = async () => {
    setLeavingDone(true);
    try {
      localStorage.removeItem(GLOBAL_DESC_KEY);
      localStorage.setItem(CONFIRM_FLAG, '1');
      window.dispatchEvent(new Event('client-request-confirmed'));
    } catch {}
    await new Promise((r) => setTimeout(r, 350));
    jumpTop();
    if (window.history.length > 1) navigate(-1);
    else navigate('/clientdashboard', { replace: true });
  };

  const handleCancel = () => {
    setCancelErr('');
    setReason('');
    setOtherReason('');
    setShowCancel(true);
  };

  const submitCancel = async () => {
    if (!reason && !otherReason.trim()) {
      setCancelErr('Please select a reason or write one.');
      return;
    }
    setCancelErr('');
    setShowCancel(false);
    await new Promise((r) => setTimeout(r, 30));
    setSubmittingCancel(true);
    try {
      await axios.post(
        `${API_BASE}/api/clientservicerequests/cancel`,
        {
          request_group_id: id,
          client_id: clientIdState || null,
          email_address: email || null,
          reason_choice: reason || null,
          reason_other: otherReason || null
        },
        { withCredentials: true, headers: headersWithU }
      );
      try {
        window.dispatchEvent(new CustomEvent('client-request-cancelled', { detail: { id } }));
      } catch {}
      try {
        localStorage.removeItem('clientInformationForm');
        localStorage.removeItem('clientServiceRequestDetails');
        localStorage.removeItem('clientServiceRate');
        localStorage.removeItem(GLOBAL_DESC_KEY);
        sessionStorage.removeItem('csr_view_payload');
        const k = 'clientPostHiddenIds';
        const raw = localStorage.getItem(k);
        const arr = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
        if (!arr.includes(id)) arr.push(id);
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
      setShowCancelSuccess(true);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to cancel. Try again.';
      setCancelErr(msg);
      setSubmittingCancel(false);
      setShowCancel(true);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleGoAfterCancel = () => {
    jumpTop();
    navigate('/current-service-request', { replace: true, state: { cancelled: id } });
  };

  return (
    <>
      <ClientNavigation />
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="mx-auto w-full max-w-[1530px] px-6">
          {!location.pathname.includes('/clientpostrequest') && (
            <div className="mt-8 mb-6">
              <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight mt-2 text-gray-900">Service Request Details</h2>
              <div className="pt-4 text-sm text-gray-600">Check your service request details here.</div>
            </div>
          )}

          <div className="space-y-6 mt-5">
            <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
              <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white rounded-t-2xl">
                <h3 className="text-xl md:text-[22px] font-semibold">Personal Information</h3>
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                  <span className="h-3 w-3 rounded-full bg-white/60" />
                  Client
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
                    {additional_address ? (
                      <LabelValue label="Additional Address" value={additional_address} />
                    ) : (
                      <div className="hidden md:block" />
                    )}
                  </div>

                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="text-sm font-semibold text-black mb-3">Client Picture</div>
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
                <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
                  <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] text-white rounded-t-2xl">
                    <h3 className="text-xl md:text-[22px] font-semibold">Service Request Details</h3>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/10 text-white border-white/20">
                      <span className="h-3 w-3 rounded-full bg-white/60" />
                      Request
                    </span>
                  </div>
                  <div className="px-6 py-6">
                    <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      <LabelValue label="Service Type" value={service_type} />
                      <LabelValue label="Service Task" value={service_task} />
                      <LabelValue label="Preferred Date" value={formatDateMDY(preferred_date)} />
                      <LabelValue label="Preferred Time" value={formatTime12h(preferred_time)} />
                      <LabelValue
                        label="Urgent"
                        value={
                          <span className={`text-base md:text-lg font-semibold ${toBoolStrict(is_urgent) ? 'text-green-600' : 'text-red-600'}`}>
                            {toBoolStrict(is_urgent) ? 'Yes' : 'No'}
                          </span>
                        }
                      />
                      <LabelValue
                        label="Tools Provided"
                        value={
                          <span className={`text-base md:text-lg font-semibold ${toBoolStrict(tools_provided) ? 'text-green-600' : 'text-red-600'}`}>
                            {toBoolStrict(tools_provided) ? 'Yes' : 'No'}
                          </span>
                        }
                      />
                      <div className="md:col-span-2">
                        <LabelValue label="Description" value={service_description || '-'} />
                      </div>
                      {review_image ? (
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
                            <span className="font-semibold text-gray-700">Request Image:</span>
                            <div className="w-full">
                              <div className="w-full h-64 rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50">
                                <img src={review_image} alt="" className="w/full h/full object-cover" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-300 shadow-sm ring-1 ring-gray-100/60 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
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
                    <div className="text-xs text-white/90">Review everything before leaving</div>
                  </div>
                  <div className="px-6 py-5 space-y-4 flex-1">
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-white/80 sr-only">.</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-gray-700">Client:</span>
                      <span className="text-base md:text-lg font-medium text-[#008cfc]">{first_name || '-'} {last_name || ''}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-gray-700">Service:</span>
                      <span className="text-base md:text-lg font-medium text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_type || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-gray-700">Task:</span>
                      <span className="text-base md:text-lg font-medium text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_task || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-gray-700">Schedule:</span>
                      <span className="text-base md:text-lg font-medium text-[#008cfc]">{formatDateMDY(preferred_date) || '-'} • {formatTime12h(preferred_time) || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-semibold text-gray-700">Urgent:</span>
                      <span className={`text-base md:text-lg font-semibold ${toBoolStrict(is_urgent) ? 'text-green-600' : 'text-red-600'}`}>
                        {toBoolStrict(is_urgent) ? 'Yes' : 'No'}
                      </span>
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
                  <div className="px-6 py-4 border-t border-gray-100">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleDone}
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        Done View
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {loading && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading request"
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
                  style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }}
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
                <div className="text-lg font-semibold text-gray-900">Loading Request</div>
                <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>
        )}

        {showCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cancel request"
            tabIndex={-1}
            autoFocus
            className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingCancel && setShowCancel(false)} />
            <div className="relative w-full max-w-[560px] mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="px-6 py-5 rounded-t-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-white">
                <div className="text-xl font-semibold">Cancel Service Request</div>
                <div className="text-xs opacity-90">Tell us why you want to cancel</div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {REASONS.map((r) => (
                    <label key={r} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${reason===r?'border-orange-500 ring-1 ring-orange-300 bg-orange-50':'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="cancel-reason"
                        className="h-4 w-4"
                        checked={reason === r}
                        onChange={() => setReason((curr) => (curr === r ? '' : r))}
                        disabled={submittingCancel}
                      />
                      <span className="text-sm md:text-base">{r}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Other</div>
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    disabled={submittingCancel}
                    placeholder="Type your reason here"
                    className="w-full min-h-[96px] rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {cancelErr ? <div className="text-sm text-orange-700">{cancelErr}</div> : null}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => !submittingCancel && setShowCancel(false)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
                  disabled={submittingCancel}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-60"
                  disabled={submittingCancel}
                >
                  {submittingCancel ? 'Submitting...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {submittingCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Please wait a moment"
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
                  style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }}
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
                <div className="text-lg font-semibold text-gray-900">Please wait a moment</div>
                <div className="text-sm text-gray-600 animate-pulse">Submitting cancellation</div>
              </div>
            </div>
          </div>
        )}

        {showCancelSuccess && !submittingCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Request cancelled"
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
                <div className="text-lg font-semibold text-gray-900">Request Cancelled!</div>
                <div className="text-sm text-gray-600">Your service request has been cancelled.</div>
                <div className="text-xs text-gray-500">You can review it under your Current Service Requests.</div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoAfterCancel}
                  className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                >
                  Go to Current Requests
                </button>
              </div>
            </div>
          </div>
        )}

        {leavingDone && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Please wait a moment"
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
                  style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }}
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
};

export default ClientViewServiceRequest;
