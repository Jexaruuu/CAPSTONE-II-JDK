// frontend/src/pages/client/ClientReviewServiceRequest.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ClientReviewServiceRequest = ({ title, setTitle, handleNext, handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestGroupId, setRequestGroupId] = useState(null);
  const [clientIdState, setClientIdState] = useState(null);

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
    const lock = isSubmitting || showSuccess;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    if (lock) {
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
  }, [isSubmitting, showSuccess]);

  const handleBackClick = () => {
    jumpTop();
    if (typeof handleBack === 'function') {
      handleBack();
    } else {
      navigate(-1);
    }
  };

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
  const savedDetails = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const {
    first_name = savedInfo.firstName,
    last_name = savedInfo.lastName,
    contact_number = savedInfo.contactNumber,
    email = savedInfo.email,
    street = savedInfo.street,
    barangay = savedInfo.barangay,
    additional_address = savedInfo.additionalAddress,
    profile_picture = savedInfo.profilePicture,
    service_type = savedDetails.serviceType,
    service_task = savedDetails.serviceTask,
    preferred_date = savedDetails.preferredDate,
    preferred_time = savedDetails.preferredTime,
    is_urgent = savedDetails.isUrgent,
    tools_provided = savedDetails.toolsProvided,
    service_description = savedDetails.serviceDescription,
    rate_type = savedRate.rateType,
    rate_from = savedRate.rateFrom,
    rate_to = savedRate.rateTo,
    rate_value = savedRate.rateValue
  } = s;

  const review_image = savedDetails.image || (Array.isArray(savedDetails.attachments) && savedDetails.attachments[0]) || '';

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

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const mapped = typeof value === 'boolean' ? yesNo(value) : value;
    const isEmpty =
      mapped === null ||
      mapped === undefined ||
      (typeof mapped === 'string' && mapped.trim() === '');
    const display = isEmpty ? emptyAs : mapped;
    return (
      <div className="flex items-start gap-3">
        <span className="min-w-36 text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-[#0A66FF]">{display}</span>
      </div>
    );
  };

  const isEmbeddedInStepper = location.pathname.includes('/clientpostrequest');

  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    } catch {
      return null;
    }
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

  const handleConfirm = async () => {
    try {
      setSubmitError('');
      setIsSubmitting(true);

      const infoDraft = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
      const detailsDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
      const rateDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();

      const payload = {
        info: {
          firstName: infoDraft.firstName || '',
          lastName: infoDraft.lastName || '',
          contactNumber: infoDraft.contactNumber || '',
          email: (infoDraft.email || '').trim(),
          street: infoDraft.street || '',
          barangay: infoDraft.barangay || '',
          additionalAddress: infoDraft.additionalAddress || '',
          profilePicture: infoDraft.profilePicture || '',
          profilePictureName: infoDraft.profilePictureName || ''
        },
        details: {
          serviceType: detailsDraft.serviceType || '',
          serviceTask: detailsDraft.serviceTask || '',
          preferredDate: detailsDraft.preferredDate || '',
          preferredTime: detailsDraft.preferredTime || '',
          isUrgent: detailsDraft.isUrgent || '',
          toolsProvided: detailsDraft.toolsProvided || '',
          serviceDescription: detailsDraft.serviceDescription || '',
          image: detailsDraft.image || '',
          imageName: detailsDraft.imageName || '',
          attachments: Array.isArray(detailsDraft.attachments) ? detailsDraft.attachments : (detailsDraft.image ? [detailsDraft.image] : []),
          request_image_url: detailsDraft.request_image_url || detailsDraft.image || ''
        },
        rate: {
          rateType: rateDraft.rateType || '',
          rateFrom: rateDraft.rateFrom || '',
          rateTo: rateDraft.rateTo || '',
          rateValue: rateDraft.rateValue || ''
        }
      };

      const clientId =
        clientIdState ||
        infoDraft.client_id ||
        infoDraft.clientId ||
        Number(localStorage.getItem('client_id')) ||
        null;

      const addressCombined = payload.info.street
        ? (payload.info.additionalAddress
            ? `${payload.info.street}, ${payload.info.additionalAddress}`
            : payload.info.street)
        : payload.info.additionalAddress || '';

      const streetVal = (payload.info.street || '').trim() || 'N/A';
      const addlVal = (payload.info.additionalAddress || '').trim() || 'N/A';
      const emailVal = (payload.info.email || '').trim();
      const contactVal = (payload.info.contactNumber || '').trim();
      const barangayVal = (payload.info.barangay || '').trim() || 'N/A';

      const svcType = (payload.details.serviceType || '').trim();
      const svcTask = (payload.details.serviceTask || '').trim();
      const descRaw = (payload.details.serviceDescription || '').trim();
      const desc = descRaw || 'N/A';
      const pDate = (payload.details.preferredDate || '').trim();
      const pTime = (payload.details.preferredTime || '').trim();
      const reqImg = review_image || '';

      const normalized = {
        client_id: clientId || '',
        first_name: (payload.info.firstName || '').trim(),
        last_name: (payload.info.lastName || '').trim(),
        email_address: emailVal,
        contact_number: contactVal,
        barangay: barangayVal,
        address: addressCombined,
        street: streetVal,
        additional_address: addlVal,
        service_type: svcType,
        category: svcType,
        service_task: svcTask,
        description: desc,
        preferred_date: pDate,
        preferred_time: pTime,
        is_urgent: toBoolStrict(payload.details.isUrgent),
        tools_provided: toBoolStrict(payload.details.toolsProvided),
        rate_type: (payload.rate.rateType || '').trim(),
        rate_from: null,
        rate_to: null,
        rate_value: null,
        attachments: payload.details.attachments,
        attachment: (payload.details.attachments && payload.details.attachments[0]) || payload.details.image || '',
        attachment_name: payload.details.imageName || '',
        request_image_url: reqImg,
        metadata: {
          profile_picture: payload.info.profilePicture || '',
          profile_picture_name: payload.info.profilePictureName || '',
          street: streetVal,
          additional_address: addlVal,
          barangay: barangayVal,
          contact_number: contactVal,
          first_name: (payload.info.firstName || '').trim(),
          last_name: (payload.info.lastName || '').trim(),
          email: emailVal,
          auth_uid: localStorage.getItem('auth_uid') || '',
          image_name: payload.details.imageName || '',
          request_image_url: reqImg
        },
        details: {
          service_type: svcType,
          serviceTask: svcTask,
          preferred_date: pDate,
          preferred_time: pTime,
          is_urgent: toBoolStrict(payload.details.isUrgent),
          tools_provided: toBoolStrict(payload.details.toolsProvided),
          service_description: desc,
          request_image_url: reqImg
        }
      };

      if (normalized.rate_type === 'Hourly Rate') {
        normalized.rate_from = cleanNumber(payload.rate.rateFrom);
        normalized.rate_to = cleanNumber(payload.rate.rateTo);
      } else if (normalized.rate_type === 'By the Job Rate') {
        normalized.rate_value = cleanNumber(payload.rate.rateValue);
      }

      const missing = requireFields(normalized, [
        'first_name',
        'last_name',
        'email_address',
        'contact_number',
        'street',
        'barangay',
        'additional_address',
        'service_type',
        'service_task',
        'description',
        'preferred_date',
        'preferred_time',
        'rate_type'
      ]);
      if (missing.length) {
        setIsSubmitting(false);
        setSubmitError(`Missing fields: ${missing.join(', ')}`);
        return;
      }

      const jsonBody = {
        client_id: normalized.client_id,
        first_name: normalized.first_name,
        last_name: normalized.last_name,
        email_address: normalized.email_address,
        contact_number: normalized.contact_number,
        barangay: normalized.barangay,
        address: normalized.address,
        street: normalized.street,
        additional_address: normalized.additional_address,
        service_type: normalized.service_type,
        category: normalized.category,
        service_task: normalized.service_task,
        description: normalized.description,
        preferred_date: normalized.preferred_date,
        preferred_time: normalized.preferred_time,
        is_urgent: normalized.is_urgent,
        tools_provided: normalized.tools_provided,
        rate_type: normalized.rate_type,
        rate_from: normalized.rate_from,
        rate_to: normalized.rate_to,
        rate_value: normalized.rate_value,
        attachments: Array.isArray(normalized.attachments) && normalized.attachments.length ? normalized.attachments : (normalized.attachment ? [normalized.attachment] : []),
        request_image_url: normalized.request_image_url,
        metadata: normalized.metadata,
        details: normalized.details
      };

      try {
        const jsonRes = await axios.post(
          `${API_BASE}/api/clientservicerequests/submit`,
          jsonBody,
          { withCredentials: true, headers: { 'Content-Type': 'application/json', ...headersWithU } }
        );
        setRequestGroupId(jsonRes?.data?.request?.request_group_id || null);
        setShowSuccess(true);
      } catch (jsonErr) {
        const status = jsonErr?.response?.status;
        if (status !== 400) throw jsonErr;

        const form = new FormData();
        form.append('client_id', normalized.client_id);
        form.append('first_name', normalized.first_name);
        form.append('last_name', normalized.last_name);
        form.append('email_address', normalized.email_address);
        form.append('contact_number', normalized.contact_number);
        form.append('street', normalized.street);
        form.append('barangay', normalized.barangay);
        form.append('additional_address', normalized.additional_address);
        form.append('address', normalized.address);
        form.append('service_type', normalized.service_type);
        form.append('category', normalized.category);
        form.append('service_task', normalized.service_task);
        form.append('description', normalized.description);
        form.append('preferred_date', normalized.preferred_date);
        form.append('preferred_time', normalized.preferred_time);
        form.append('is_urgent', normalized.is_urgent ? '1' : '0');
        form.append('tools_provided', normalized.tools_provided ? '1' : '0');
        form.append('rate_type', normalized.rate_type || '');
        form.append('rate_from', normalized.rate_from ?? '');
        form.append('rate_to', normalized.rate_to ?? '');
        form.append('rate_value', normalized.rate_value ?? '');
        form.append('request_image_url', normalized.request_image_url || '');
        form.append('metadata', JSON.stringify(normalized.metadata || {}));
        form.append('details', JSON.stringify(normalized.details || {}));
        if (normalized.attachment) {
          const blob = dataURLtoBlob(normalized.attachment);
          if (blob) {
            form.append('attachment', blob, normalized.attachment_name || 'attachment.jpg');
          } else {
            form.append('attachments[]', normalized.attachment);
          }
        }
        if (Array.isArray(normalized.attachments)) {
          normalized.attachments.forEach((a) => {
            if (typeof a === 'string' && a.startsWith('data:')) form.append('attachments[]', a);
          });
        }

        const formRes = await axios.post(
          `${API_BASE}/api/clientservicerequests/submit`,
          form,
          { withCredentials: true, headers: { ...headersWithU } }
        );
        setRequestGroupId(formRes?.data?.request?.request_group_id || null);
        setShowSuccess(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoDashboard = () => {
    try {
      localStorage.removeItem('clientInformationForm');
      localStorage.removeItem('clientServiceRequestDetails');
      localStorage.removeItem('clientServiceRate');
    } catch {}

    jumpTop();

    navigate('/clientdashboard', {
      state: { submitted: true, request_group_id: requestGroupId, __forceTop: true },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-lg font-semibold text-gray-900">Review Service Request</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-gray-500">Step 4 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-full bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1520px] px-6">
        {!location.pathname.includes('/clientpostrequest') && (
          <div className="mt-6 mb-6">
            <div className="text-sm text-gray-500">4 of 4 | Post a Service Request</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Step 4: Review and Submit</h2>
          </div>
        )}

        <div className="space-y-6 mt-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl md:text-2xl font-semibold">Personal Information</h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Client</span>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                <div className="text-base md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                  <LabelValue label="First Name" value={first_name} />
                  <LabelValue label="Last Name" value={last_name} />
                  <LabelValue label="Contact Number" value={contact_number} />
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
                  <div className="text-base font-semibold mb-3 text-center">Profile Picture</div>
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
                  <h3 className="text-xl md:text-2xl font-semibold">Service Request Details</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Request</span>
                </div>
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                    <LabelValue label="Service Type" value={service_type} />
                    <LabelValue label="Service Task" value={service_task} />
                    <LabelValue label="Preferred Date" value={preferred_date_display} />
                    <LabelValue label="Preferred Time" value={preferred_time_display} />
                    <LabelValue label="Urgent" value={is_urgent} />
                    <LabelValue label="Tools Provided" value={tools_provided} />
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-3">
                        <span className="min-w-36 text-sm font-semibold text-gray-700">Description</span>
                        <span className="text-[#0A66FF]">{service_description || '-'}</span>
                      </div>
                    </div>
                    {review_image ? (
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-3">
                          <span className="min-w-36 text-sm font-semibold text-gray-700">Request Image</span>
                          <div className="w-full">
                            <div className="w-full h-64 rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50">
                              <img src={review_image} alt="" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xl md:text-2xl font-semibold">Service Rate</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Pricing</span>
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[451.5px] flex flex-col">
                <div className="bg-gradient-to-r from-[#008cfc] to-[#4aa6ff] px-6 py-5 text-white">
                  <div className="text-base font-medium">Summary</div>
                  <div className="text-sm text-white/90">Review everything before submitting</div>
                </div>
                <div className="px-6 py-5 space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client</span>
                    <span className="text-sm font-medium text-gray-900">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Service</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[55%] text-right">{service_type || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Task</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[55%] text-right">{service_task || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Schedule</span>
                    <span className="text-sm font-medium text-gray-900">{preferred_date_display || '-'} • {preferred_time_display || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Urgent</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${toBoolStrict(is_urgent) ? 'bg-[#E6F0FF] text-[#0A66FF] border-[#C9DAFF]' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {toBoolStrict(is_urgent) ? 'Yes' : 'No'}
                    </span>
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
                    Back : Step 3
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full sm:w-1/2 h-[50px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting service request"
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
                  className="w-16 h-16 object-contain animate-pulse"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Submitting Request</div>
              <div className="text-sm text-gray-600">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && !isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Request submitted"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
        >
          <div className="relative w=[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
              <div className="text-lg font-semibold text-gray-900">Request Submitted!</div>
              <div className="text-sm text-gray-600">
                Please wait for admin approval within <span className="font-medium">1–2 hours</span>.
              </div>
              <div className="text-xs text-gray-500">
                The details below will remain on this page for your reference.
              </div>
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

export default ClientReviewServiceRequest;
