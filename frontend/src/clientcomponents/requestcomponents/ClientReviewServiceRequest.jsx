import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const CONFIRM_FLAG = 'clientRequestJustConfirmed';
const GLOBAL_DESC_KEY = 'clientServiceDescription';

const ClientReviewServiceRequest = ({ title, setTitle, handleNext, handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestGroupId, setRequestGroupId] = useState(null);
  const [clientIdState, setClientIdState] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState('qr');
  const [payError, setPayError] = useState('');
  const [payFields, setPayFields] = useState({ name: '', number: '', ref: '', screenshotDataUrl: '' });
  const [payProcessing, setPayProcessing] = useState(false);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const FEE = 150;

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
    const lock = isSubmitting || showSuccess || isLoadingBack || showPay;
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
  }, [isSubmitting, showSuccess, isLoadingBack, showPay]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingBack]);

  const handleBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      if (typeof handleBack === 'function') {
        handleBack();
      } else {
        navigate(-1);
      }
    }, 2000);
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

  const review_image =
    savedDetails.request_image_url ||
    savedDetails.image ||
    (Array.isArray(savedDetails.attachments) && savedDetails.attachments[0]) ||
    '';

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
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>
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

  const readFileAsDataUrl = (file) =>
    new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.readAsDataURL(file);
    });

  const genRef = () => {
    const t = Date.now();
    const r = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
    return `JDK-${t}-${r}`;
  };

  const openPayment = () => {
    setPayError('');
    setPayFields((f) => ({ ...f, ref: f.ref || genRef() }));
    setShowPay(true);
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

  const handleConfirmPayment = async () => {
    setPayError('');
    setPayProcessing(true);
    try {
      if (payMethod === 'qr') {
        if (!payFields.ref) {
          setPayError('Enter the GCASH reference number.');
          setPayProcessing(false);
          return;
        }
      } else {
        if (!payFields.name || !payFields.number) {
          setPayError('Provide GCash name and number.');
          setPayProcessing(false);
          return;
        }
      }
      const meta = {
        method: 'gcash',
        option: payMethod,
        amount: FEE,
        reference: payFields.ref || genRef(),
        payer_name: payFields.name || '',
        payer_number: payFields.number || '',
        screenshot: payFields.screenshotDataUrl || '',
        currency: 'PHP'
      };
      setPaymentMeta(meta);
      setShowPay(false);
      await handleConfirm(meta);
    } catch {
      setPayError('Payment confirmation failed.');
    } finally {
      setPayProcessing(false);
    }
  };

  const handleConfirm = async (payment = null) => {
    try {
      setSubmitError('');
      setIsSubmitting(true);

      const infoDraft = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
      const detailsDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
      const rateDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();
      const agreementsDraft = (() => { try { return JSON.parse(localStorage.getItem('clientAgreements') || '{}'); } catch { return {}; }})();

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
          attachments: Array.isArray(detailsDraft.attachments) ? detailsDraft.attachments : (detailsDraft.image ? [detailsDraft.image] : [])
        },
        rate: {
          rateType: rateDraft.rateType || '',
          rateFrom: rateDraft.rateFrom || '',
          rateTo: rateDraft.rateTo || '',
          rateValue: rateDraft.rateValue || ''
        }
      };

      const clientAuth = (() => { try { return JSON.parse(localStorage.getItem('clientAuth') || '{}'); } catch { return {}; }})();
      const emailFallback = (payload.info.email || savedInfo.email || clientAuth.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '').toString().trim().toLowerCase();
      const emailVal = emailFallback;
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
      const contactVal = (payload.info.contactNumber || '').trim();
      const barangayVal = (payload.info.barangay || '').trim() || 'N/A';

      const svcType = (payload.details.serviceType || '').trim();
      const svcTask = (payload.details.serviceTask || '').trim();
      const descRaw = (payload.details.serviceDescription || '').trim();
      const desc = descRaw || 'N/A';
      const pDate = (payload.details.preferredDate || '').trim();
      const pTime = (payload.details.preferredTime || '').trim();

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
          auth_uid: localStorage.getItem('auth_uid') || clientAuth.auth_uid || '',
          image_name: payload.details.imageName || ''
        },
        details: {
          service_type: svcType,
          serviceTask: svcTask,
          preferred_date: pDate,
          preferred_time: pTime,
          is_urgent: toBoolStrict(payload.details.isUrgent),
          tools_provided: toBoolStrict(payload.details.toolsProvided),
          service_description: desc
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

      if (!(normalized.client_id && String(normalized.client_id).trim()) && !(normalized.email_address && String(normalized.email_address).trim())) {
        setIsSubmitting(false);
        setSubmitError('Unable to identify client. Provide client_id or a known email_address.');
        return;
      }

      const infoPayload = {
        client_id: normalized.client_id,
        clientId: normalized.client_id,
        auth_uid: normalized.metadata.auth_uid,
        first_name: normalized.first_name,
        firstName: normalized.first_name,
        last_name: normalized.last_name,
        lastName: normalized.last_name,
        email_address: normalized.email_address,
        email: normalized.email_address,
        contact_number: normalized.contact_number,
        contactNumber: normalized.contact_number,
        street: normalized.street,
        barangay: normalized.barangay,
        additional_address: normalized.additional_address,
        additionalAddress: normalized.additional_address,
        profile_picture: normalized.metadata.profile_picture,
        profilePicture: normalized.metadata.profile_picture,
        profile_picture_name: normalized.metadata.profile_picture_name,
        profilePictureName: normalized.metadata.profile_picture_name
      };

      const detailsPayload = {
        service_type: normalized.service_type,
        serviceType: normalized.service_type,
        service_task: normalized.service_task,
        serviceTask: normalized.service_task,
        preferred_date: normalized.preferred_date,
        preferredDate: normalized.preferred_date,
        preferred_time: normalized.preferred_time,
        preferredTime: normalized.preferred_time,
        is_urgent: normalized.is_urgent,
        isUrgent: normalized.is_urgent,
        tools_provided: normalized.tools_provided,
        toolsProvided: normalized.tools_provided,
        service_description: normalized.description,
        attachments: Array.isArray(normalized.attachments) && normalized.attachments.length ? normalized.attachments : (normalized.attachment ? [normalized.attachment] : []),
        image: normalized.attachment,
        image_name: normalized.attachment_name
      };

      const ratePayload = {
        rate_type: normalized.rate_type,
        rateType: normalized.rate_type,
        rate_from: normalized.rate_from,
        rateFrom: normalized.rate_from,
        rate_to: normalized.rate_to,
        rateTo: normalized.rate_to,
        rate_value: normalized.rate_value,
        rateValue: normalized.rate_value
      };

      const metadataPayload = {
        profile_picture: normalized.metadata.profile_picture,
        profile_picture_name: normalized.metadata.profile_picture_name,
        street: normalized.metadata.street,
        additional_address: normalized.metadata.additional_address,
        barangay: normalized.metadata.barangay,
        contact_number: normalized.metadata.contact_number,
        first_name: normalized.metadata.first_name,
        last_name: normalized.metadata.last_name,
        email: normalized.metadata.email,
        auth_uid: normalized.metadata.auth_uid,
        image_name: normalized.metadata.image_name
      };

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
        metadata: metadataPayload,
        info: infoPayload,
        details: detailsPayload,
        rate: ratePayload,
        agreements: {
          email_address: (agreementsDraft.email_address || normalized.email_address || '').toString().trim(),
          agree_verify: !!agreementsDraft.agree_verify,
          agree_tos: !!agreementsDraft.agree_tos,
          agree_privacy: !!agreementsDraft.agree_privacy
        },
        payment: payment || paymentMeta || null
      };

      const jsonRes = await axios.post(
        `${API_BASE}/api/clientservicerequests/submit`,
        jsonBody,
        { withCredentials: true, headers: { 'Content-Type': 'application/json', ...headersWithU } }
      );
      setRequestGroupId(jsonRes?.data?.request?.request_group_id || null);
      setShowSuccess(true);
      localStorage.setItem(CONFIRM_FLAG, '1');
      localStorage.removeItem(GLOBAL_DESC_KEY);
      window.dispatchEvent(new Event('client-request-confirmed'));
      try {
        localStorage.removeItem('clientServiceImageCache');
        localStorage.setItem('clientServiceImageCleared', '1');
      } catch {}
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
      localStorage.removeItem(GLOBAL_DESC_KEY);
      localStorage.setItem(CONFIRM_FLAG, '1');
      window.dispatchEvent(new Event('client-request-confirmed'));
      localStorage.removeItem('clientServiceImageCache');
      localStorage.setItem('clientServiceImageCleared', '1');
    } catch {}

    jumpTop();

    navigate('/clientdashboard', {
      state: { submitted: true, request_group_id: requestGroupId, __forceTop: true },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
              <img src="/jdklogo.png" alt="" className="h-6 w-6 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            </div>
            <div className="text-2xl md:text-[28px] font-semibold tracking-tight text-gray-900">Review Service Request</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-gray-500 tracking-wide">Step 4 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-full bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1420px] px-6">
        {!location.pathname.includes('/clientpostrequest') && (
          <div className="mt-8 mb-6">
            <div className="text-xs text-gray-500 tracking-wide">4 of 4 | Post a Service Request</div>
            <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight mt-2 text-gray-900">Step 4: Review and Submit</h2>
          </div>
        )}

        <div className="space-y-6 mt-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="border-t border-gray-100" />
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <LabelValue label="First Name" value={first_name} />
                  <LabelValue label="Last Name" value={last_name} />
                  <LabelValue label="Contact Number" value={contactDisplay} />
                  <LabelValue label="Email" value={email} />
                  <LabelValue label="Barangay" value={barangay} />
                  <LabelValue label="Street" value={street} />
                  <LabelValue label="Additional Address" value={additional_address || '-'} />
                </div>

                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="text-sm font-medium text-gray-700 mb-3">Profile Picture</div>
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Request Details</h3>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <LabelValue label="Service Type" value={service_type} />
                    <LabelValue label="Service Task" value={service_task} />
                    <LabelValue label="Preferred Date" value={preferred_date_display} />
                    <LabelValue label="Preferred Time" value={preferred_time_display} />
                    <LabelValue
                      label="Urgent"
                      value={
                        <span className="text-[15px] md:text-base font-semibold text-[#008cfc]">
                          {toBoolStrict(is_urgent) ? 'Yes' : 'No'}
                        </span>
                      }
                    />
                    <LabelValue
                      label="Tools Provided"
                      value={
                        <span className="text-[15px] md:text-base font-semibold text-[#008cfc]">
                          {toBoolStrict(tools_provided) ? 'Yes' : 'No'}
                        </span>
                      }
                    />
                    <div className="md:col-span-2">
                      <LabelValue label="Description" value={service_description || '-'} />
                    </div>
                    {review_image ? (
                      <div className="md:col-span-2">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                          <span className="text-gray-700 font-semibold">Request Image:</span>
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

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-6">
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="text-base font-semibold text-gray-900">Summary</div>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-5 space-y-3 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Client:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Service:</span>
                    <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_type || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Task:</span>
                    <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{service_task || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Schedule:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{preferred_date_display || '-'} • {preferred_time_display || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Urgent:</span>
                    <span className="text-base font-semibold text-[#008cfc]">
                      {toBoolStrict(is_urgent) ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Tools:</span>
                    <span className="text-base font-semibold text-[#008cfc]">
                      {toBoolStrict(tools_provided) ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-700">Rate:</span>
                    {rate_type === 'Hourly Rate' ? (
                      <div className="text-lg font-bold text-[#008cfc]">
                        ₱{rate_from ?? 0}–₱{rate_to ?? 0} <span className="text-sm font-semibold opacity-80">per hour</span>
                      </div>
                    ) : rate_type === 'By the Job Rate' ? (
                      <div className="text-lg font-bold text-[#008cfc]">
                        ₱{rate_value ?? 0} <span className="text-sm font-semibold opacity-80">per job</span>
                      </div>
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
                    className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={openPayment}
                    className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Pay & Submit
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
              <div className="text-lg font-semibold text-gray-900">Submitting Request</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 3"
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
              <div className="text-lg font-semibold text-gray-900">Back to Step 3</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
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
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Go back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showPay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="GCash Payment"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[520px] max-w-[94vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl">
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900">Pay via GCash</div>
                <div className="text-sm text-gray-500">Amount: <span className="font-semibold text-[#008cfc]">₱{FEE}</span></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Choose a method</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('qr')}
                  className={`h-10 rounded-xl border ${payMethod==='qr'?'border-[#008cfc] bg-blue-50 text-[#008cfc]':'border-gray-300 text-gray-700'} transition`}
                >
                  GCash QR
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('details')}
                  className={`h-10 rounded-xl border ${payMethod==='details'?'border-[#008cfc] bg-blue-50 text-[#008cfc]':'border-gray-300 text-gray-700'} transition`}
                >
                  Fill GCash Details
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {payMethod === 'qr' ? (
                <div className="space-y-4">
                  <div className="w-full grid place-items-center">
                    <div className="rounded-2xl border border-gray-200 p-3 bg-white shadow-sm">
                      <img
                        src="/QR.jpg"
                        alt="GCash QR"
                        className="w-56 h-56 object-contain"
                        onError={(e)=>{e.currentTarget.style.display='none';}}
                      />
                      <div className="text-center text-xs text-gray-500 mt-2">Scan this QR using GCash</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="text-sm text-gray-700">Reference No.</div>
                    <input
                      value={payFields.ref}
                      onChange={(e)=>setPayFields((f)=>({...f, ref: e.target.value.trim()}))}
                      placeholder="Enter GCash Ref. No."
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                    <div className="text-sm text-gray-700">Upload Screenshot</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e)=>{
                        const file=e.target.files?.[0];
                        if (file) {
                          const du=await readFileAsDataUrl(file);
                          setPayFields((f)=>({...f, screenshotDataUrl: du}));
                        }
                      }}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-[#008cfc] hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-sm text-gray-700">GCash Account Name</div>
                    <input
                      value={payFields.name}
                      onChange={(e)=>setPayFields((f)=>({...f, name: e.target.value}))}
                      placeholder="e.g. Juan Dela Cruz"
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">GCash Number</div>
                    <input
                      value={payFields.number}
                      onChange={(e)=>setPayFields((f)=>({...f, number: e.target.value.replace(/[^0-9+]/g,'')}))}
                      placeholder="09XXXXXXXXX"
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">Reference No.</div>
                    <input
                      value={payFields.ref}
                      onChange={(e)=>setPayFields((f)=>({...f, ref: e.target.value.trim()}))}
                      placeholder="Enter GCash Ref. No."
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                </div>
              )}
              {payError ? <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{payError}</div> : null}
            </div>

            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={payProcessing}
                  onClick={()=>setShowPay(false)}
                  className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={payProcessing}
                  onClick={handleConfirmPayment}
                  className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                >
                  {payProcessing ? 'Processing…' : `Confirm Payment`}
                </button>
              </div>
              <div className="mt-3 text-center text-[11px] text-gray-500">GCash only • Secure payment • Non-refundable posting fee</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReviewServiceRequest;
