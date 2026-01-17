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

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tempPayment, setTempPayment] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSaveErr, setPaymentSaveErr] = useState('');

  const [requestStatusId, setRequestStatusId] = useState(null);

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
      const e =
        a.email ||
        localStorage.getItem('client_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        '';
      return encodeURIComponent(JSON.stringify({ r: 'client', e, au }));
    } catch {
      return '';
    }
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
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(id)}`, {
          withCredentials: true,
          headers: headersWithU
        });
        if (!cancelled) setRow(data || null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, headersWithU]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/request-status-id/by-group/${encodeURIComponent(id)}`, {
          withCredentials: true,
          headers: headersWithU
        });
        const found =
          data?.id ||
          data?.client_service_request_status_id ||
          data?.request_status_id ||
          data?.service_request_status_id ||
          data?.status_id ||
          null;
        if (!cancelled) setRequestStatusId(found ? String(found) : null);
      } catch {
        if (!cancelled) setRequestStatusId(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, headersWithU]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (loading || showCancel || submittingCancel || leavingDone || showCancelSuccess || showPaymentModal || savingPayment) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = '';
      body.style.overflow = '';
    }
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
    };
  }, [loading, showCancel, submittingCancel, leavingDone, showCancelSuccess, showPaymentModal, savingPayment]);

  const savedInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('clientInformationForm') || '{}');
    } catch {
      return {};
    }
  })();
  const savedDetails = (() => {
    try {
      return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}');
    } catch {
      return {};
    }
  })();
  const savedRate = (() => {
    try {
      return JSON.parse(localStorage.getItem('clientServiceRate') || '{}');
    } catch {
      return {};
    }
  })();

  const s = location.state || {};

  const fx = row || {};
  const infoR = fx.info || {};
  const detR = fx.details || {};
  const rateR = fx.rate || {};
  const statusR =
    fx.status ||
    fx.request_status ||
    fx.statusRow ||
    fx.service_request_status ||
    fx.client_service_request_status ||
    fx.client_service_request_status_row ||
    {};

  const requestIdDisplay = useMemo(() => {
    const candidates = [
      requestStatusId,
      statusR?.id,
      statusR?.client_service_request_status_id,
      statusR?.request_status_id,
      statusR?.service_request_status_id,
      statusR?.csr_status_id,
      fx?.id,
      fx?.request_id,
      fx?.requestId,
      detR?.id,
      detR?.request_id,
      detR?.requestId,
      rateR?.request_id,
      rateR?.requestId,
      s?.request_status_id,
      s?.client_service_request_status_id,
      s?.request_id,
      s?.requestId,
      s?.id
    ];
    for (const c of candidates) {
      if (c === null || c === undefined) continue;
      const str = String(c).trim();
      if (str) return str;
    }
    return '-';
  }, [requestStatusId, statusR, fx, detR, rateR, s]);

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

  const review_image =
    detR.request_image_url ||
    detR.image ||
    (Array.isArray(savedDetails.attachments) && savedDetails.attachments[0]) ||
    savedDetails.image ||
    '';

  const formatTime12h = (t) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return t || '-';
    const [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${confirmNaN(mm)} ${suffix}`;
  };

  function confirmNaN(v) {
    const s2 = String(v ?? '').trim();
    return s2 ? s2 : '00';
  }

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

  const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;

  const cleanNumber = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).toString().replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const formatRate = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string') return v.trim().startsWith('₱') ? v.trim() : `₱${v}`;
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
  };

  const parseNumericRate = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s2 = String(v);
    const nums = s2.match(/\d+(\.\d+)?/g);
    if (!nums || !nums.length) return null;
    const a = Number(nums[0]);
    const b = nums.length >= 2 ? Number(nums[1]) : null;
    if (!Number.isFinite(a)) return null;
    if (b !== null && Number.isFinite(b)) return Math.round((a + b) / 2);
    return a;
  };

  const shouldShowPerUnit = (type) =>
    type === 'Car Washing' || type === 'Plumbing' || type === 'Carpentry' || type === 'Electrical Works';

  const toUnit = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.max(1, Math.floor(n)) : 1;
  };

  const isLaundry = useMemo(() => String(service_type || '').trim() === 'Laundry', [service_type]);

  const quantityUnit = useMemo(() => {
    const candidates = [
      rateR?.quantity_unit,
      rateR?.unit,
      rateR?.unit_type,
      detR?.quantity_unit,
      detR?.unit,
      s?.quantity_unit,
      s?.unit,
      savedRate?.quantity_unit
    ];
    for (const c of candidates) {
      if (c !== null && c !== undefined && String(c).trim() !== '') {
        const s2 = String(c || '').trim().toLowerCase();
        if (s2 === 'kilogram' || s2 === 'kilograms') return 'kg';
        return s2;
      }
    }
    return isLaundry ? 'kg' : 'unit';
  }, [rateR, detR, s, savedRate, isLaundry]);

  const rateUnits = useMemo(() => {
    const candidates = [
      rateR?.units,
      rateR?.unit_kg,
      detR?.units,
      detR?.unit_kg,
      s?.units,
      s?.unit_kg,
      savedRate?.units
    ];
    for (const c of candidates) {
      if (c !== null && c !== undefined && c !== '') return toUnit(c);
    }
    return 1;
  }, [rateR, detR, s, savedRate]);

  const minimumQty = useMemo(() => {
    const candidates = [
      rateR?.minimum_quantity,
      detR?.minimum_quantity,
      s?.minimum_quantity,
      savedRate?.minimum_quantity
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
    }
    if (isLaundry && quantityUnit === 'kg') return 8;
    return null;
  }, [rateR, detR, s, savedRate, isLaundry, quantityUnit]);

  const minimumApplied = useMemo(() => {
    const candidates = [
      rateR?.minimum_applied,
      detR?.minimum_applied,
      s?.minimum_applied,
      savedRate?.minimum_applied
    ];
    for (const c of candidates) {
      if (c === true) return true;
      if (c === false) return false;
      if (c === 1 || c === '1') return true;
      if (c === 0 || c === '0') return false;
      if (c !== null && c !== undefined && String(c).trim() !== '') return !!c;
    }
    return false;
  }, [rateR, detR, s, savedRate]);

  const billableUnits = useMemo(() => {
    const candidates = [
      rateR?.billable_units,
      detR?.billable_units,
      s?.billable_units,
      savedRate?.billable_units
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n >= 1) return Math.max(1, Math.floor(n));
    }
    if (isLaundry && quantityUnit === 'kg') {
      const min = Number(minimumQty);
      const minSafe = Number.isFinite(min) && min > 0 ? min : 8;
      return Math.max(minSafe, rateUnits);
    }
    return rateUnits;
  }, [rateR, detR, s, savedRate, isLaundry, quantityUnit, minimumQty, rateUnits]);

  const unitDisplayLabel = useMemo(() => {
    if (isLaundry) {
      if (quantityUnit === 'kg') return 'kg';
      if (quantityUnit === 'pc') return rateUnits === 1 ? 'pc' : 'pcs';
      if (quantityUnit === 'pair') return rateUnits === 1 ? 'pair' : 'pairs';
      if (quantityUnit === 'load') return rateUnits === 1 ? 'load' : 'loads';
      if (quantityUnit === 'bag') return rateUnits === 1 ? 'bag' : 'bags';
      if (quantityUnit) return rateUnits === 1 ? quantityUnit : `${quantityUnit}s`;
      return 'items';
    }
    return rateUnits === 1 ? 'unit' : 'units';
  }, [isLaundry, quantityUnit, rateUnits]);

  const workersNeeded = useMemo(() => {
    const parseWorkersNeeded = (v) => {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number' && Number.isFinite(v)) return Math.max(1, Math.floor(v));
      const s2 = String(v).trim();
      if (!s2) return null;
      const n = Number(s2);
      if (Number.isFinite(n)) return Math.max(1, Math.floor(n));
      const m = s2.match(/\d+/);
      if (!m) return null;
      const nn = Number(m[0]);
      return Number.isFinite(nn) ? Math.max(1, Math.floor(nn)) : null;
    };

    const candidates = [
      detR?.workers_need,
      detR?.workers_needed,
      detR?.workersNeeded,
      detR?.worker_needed,
      detR?.number_of_workers,
      detR?.num_workers,
      detR?.manpower,
      rateR?.workers_need,
      rateR?.workers_needed,
      rateR?.workersNeeded,
      s?.workers_need,
      s?.workers_needed,
      s?.workersNeeded,
      s?.worker_needed,
      s?.number_of_workers,
      s?.num_workers,
      s?.manpower,
      savedDetails?.workers_need,
      savedDetails?.workers_needed,
      savedDetails?.workersNeeded,
      savedRate?.workers_need,
      savedRate?.workers_needed,
      savedRate?.workersNeeded
    ];
    for (const c of candidates) {
      const n = parseWorkersNeeded(c);
      if (n) return n;
    }
    return null;
  }, [detR, rateR, s, savedDetails, savedRate]);

  const workersNeededDisplay = useMemo(() => {
    if (!workersNeeded) return '-';
    return `${workersNeeded} ${workersNeeded === 1 ? 'worker' : 'workers'}`;
  }, [workersNeeded]);

  const preferredTimeFee = useMemo(() => {
    const candidates = [
      rateR?.preferred_time_fee,
      rateR?.preferredTimeFee,
      rateR?.preferred_time_fee_php,
      rateR?.preferredTimeFeePhp,
      detR?.preferred_time_fee,
      detR?.preferredTimeFee,
      s?.preferred_time_fee,
      s?.preferredTimeFee,
      savedRate?.preferred_time_fee,
      savedRate?.preferredTimeFee,
      savedRate?.preferred_time_fee_php,
      savedRate?.preferredTimeFeePhp
    ];
    for (const c of candidates) {
      const n = cleanNumber(c);
      if (n !== null && Number.isFinite(n) && n >= 0) return n;
    }
    return 0;
  }, [rateR, detR, s, savedRate]);

  const extraWorkersFeeTotal = useMemo(() => {
    const candidates = [
      rateR?.extra_workers_fee,
      rateR?.extraWorkersFeeTotal,
      rateR?.extra_workers_fee_total,
      rateR?.extra_workers_fee_php,
      rateR?.extraWorkersFeePhp,
      s?.extra_workers_fee,
      s?.extraWorkersFeeTotal,
      s?.extra_workers_fee_total,
      s?.extra_workers_fee_php,
      detR?.extra_workers_fee,
      detR?.extraWorkersFeeTotal,
      detR?.extra_workers_fee_total,
      detR?.extra_workers_fee_php,
      savedRate?.extra_workers_fee,
      savedRate?.extraWorkersFeeTotal,
      savedRate?.extra_workers_fee_total,
      savedRate?.extra_workers_fee_php,
      savedDetails?.extra_workers_fee,
      savedDetails?.extraWorkersFeeTotal,
      savedDetails?.extra_workers_fee_total,
      savedDetails?.extra_workers_fee_php
    ];
    for (const c of candidates) {
      const n = cleanNumber(c);
      if (n !== null && Number.isFinite(n) && n >= 0) return n;
    }
    return 0;
  }, [rateR, s, detR, savedRate, savedDetails]);

  const totalFromSource = useMemo(() => {
    const candidates = [
      rateR?.total_rate,
      rateR?.total,
      rateR?.totalRate,
      rateR?.total_rate_php,
      rateR?.totalRatePhp,
      s?.total_rate,
      s?.total,
      s?.totalRate,
      s?.total_rate_php,
      savedRate?.total_rate,
      savedRate?.total,
      savedRate?.totalRate,
      savedRate?.total_rate_php
    ];
    for (const c of candidates) {
      const n = cleanNumber(c);
      if (n !== null && Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  }, [rateR, s, savedRate]);

  const baseRateRaw = useMemo(() => {
    const candidates = [
      rateR?.base_rate_raw,
      rateR?.baseRateRaw,
      s?.base_rate_raw,
      s?.baseRateRaw,
      savedRate?.base_rate_raw,
      savedRate?.baseRateRaw
    ];
    for (const c of candidates) {
      if (c !== null && c !== undefined && String(c).trim() !== '') return c;
    }
    if (rate_type === 'Hourly Rate' && rate_from && rate_to) return `₱${rate_from}–₱${rate_to}`;
    if (rate_type === 'By the Job Rate' && rate_value) return `₱${rate_value}`;
    if (rate_from && rate_to) return `₱${rate_from}–₱${rate_to}`;
    if (rate_value) return `₱${rate_value}`;
    return '';
  }, [rateR, s, savedRate, rate_type, rate_from, rate_to, rate_value]);

  const baseRateNumericExisting = useMemo(() => {
    const candidates = [
      rateR?.base_rate_numeric,
      rateR?.baseRateNumeric,
      s?.base_rate_numeric,
      s?.baseRateNumeric,
      savedRate?.base_rate_numeric,
      savedRate?.baseRateNumeric
    ];
    for (const c of candidates) {
      const n = c === null || c === undefined || c === '' ? null : Number(c);
      if (Number.isFinite(n)) return n;
    }
    return parseNumericRate(baseRateRaw);
  }, [rateR, s, savedRate, baseRateRaw]);

  const unitsForRateMath = useMemo(() => {
    if (isLaundry && quantityUnit === 'kg') return billableUnits;
    return rateUnits;
  }, [isLaundry, quantityUnit, billableUnits, rateUnits]);

  const subtotal = useMemo(() => {
    const candidates = [rateR?.subtotal, s?.subtotal, savedRate?.subtotal];
    for (const c of candidates) {
      const n = cleanNumber(c);
      if (n !== null && Number.isFinite(n) && n >= 0) return n;
    }
    if (Number.isFinite(totalFromSource)) {
      const base = Number(totalFromSource) - (Number(preferredTimeFee) || 0) - (Number(extraWorkersFeeTotal) || 0);
      return Number.isFinite(base) ? Math.max(0, Math.round(base)) : 0;
    }
    if (Number.isFinite(baseRateNumericExisting)) return (Number(baseRateNumericExisting) || 0) * (Number(unitsForRateMath) || 1);
    return 0;
  }, [rateR, s, savedRate, totalFromSource, preferredTimeFee, extraWorkersFeeTotal, baseRateNumericExisting, unitsForRateMath]);

  const baseRatePerUnitNumeric = useMemo(() => {
    if (Number.isFinite(baseRateNumericExisting)) return Number(baseRateNumericExisting);
    if (Number.isFinite(totalFromSource) && Number.isFinite(unitsForRateMath) && unitsForRateMath > 0) {
      const baseFee = Math.max(0, Number(totalFromSource) - (Number(preferredTimeFee) || 0) - (Number(extraWorkersFeeTotal) || 0));
      const per = baseFee / unitsForRateMath;
      return Number.isFinite(per) ? Math.max(0, Math.round(per)) : null;
    }
    return null;
  }, [baseRateNumericExisting, totalFromSource, preferredTimeFee, extraWorkersFeeTotal, unitsForRateMath]);

  const totalForDisplay = useMemo(() => {
    if (Number.isFinite(totalFromSource)) return Number(totalFromSource);
    const base = (Number(subtotal) || 0) + (Number(preferredTimeFee) || 0) + (Number(extraWorkersFeeTotal) || 0);
    return Number.isFinite(base) ? Math.max(0, Math.round(base)) : 0;
  }, [totalFromSource, subtotal, preferredTimeFee, extraWorkersFeeTotal]);

  const perLabel = useMemo(() => {
    if (isLaundry) {
      if (quantityUnit === 'kg') return 'kg';
      const s2 = String(unitDisplayLabel || '').trim();
      if (!s2) return 'item';
      if (rateUnits === 1) return s2;
      return s2.endsWith('s') ? s2.slice(0, -1) : s2;
    }
    return 'unit';
  }, [isLaundry, quantityUnit, unitDisplayLabel, rateUnits]);

  const baseRateDisplay = useMemo(() => {
    const fromRaw = formatRate(baseRateRaw || '');
    if (fromRaw) {
      if (rate_type === 'Hourly Rate' && rate_from && rate_to) {
        return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(rate_from) || 0)}–₱${new Intl.NumberFormat(
          'en-PH',
          { maximumFractionDigits: 0 }
        ).format(Number(rate_to) || 0)} per hour`;
      }
      if (rate_type === 'By the Job Rate' && rate_value) {
        return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(rate_value) || 0)} per job`;
      }
      return shouldShowPerUnit(service_type) || isLaundry
        ? `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(parseNumericRate(fromRaw) || parseNumericRate(baseRateRaw) || 0)} per ${perLabel}`
        : fromRaw;
    }

    if (Number.isFinite(baseRatePerUnitNumeric)) {
      return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(baseRatePerUnitNumeric) || 0)} per ${perLabel}`;
    }

    return '';
  }, [baseRateRaw, baseRatePerUnitNumeric, rate_type, rate_from, rate_to, rate_value, service_type, isLaundry, perLabel]);

  const showBreakdown = useMemo(() => {
    const t = Number(totalForDisplay);
    if (Number.isFinite(t) && t >= 0) return true;
    if (Number.isFinite(Number(subtotal)) && Number(subtotal) > 0) return true;
    if (Number.isFinite(Number(preferredTimeFee)) && Number(preferredTimeFee) > 0) return true;
    if (Number.isFinite(Number(extraWorkersFeeTotal)) && Number(extraWorkersFeeTotal) > 0) return true;
    return false;
  }, [totalForDisplay, subtotal, preferredTimeFee, extraWorkersFeeTotal]);

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

  const extraWorkersFeeNode = (
    <span className={`text-[15px] md:text-base font-semibold ${extraWorkersFeeTotal > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
      {extraWorkersFeeTotal > 0 ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
    </span>
  );

  const preferredTimeFeeNode = (
    <span className={`text-[15px] md:text-base font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
      {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
    </span>
  );

  const paymentOptions = useMemo(() => [{ value: 'Cash', label: 'Cash' }, { value: 'GCash', label: 'GCash' }], []);

  const normalizePayment = (v) => {
    const s2 = String(v ?? '').trim();
    if (!s2) return '';
    const low = s2.toLowerCase();
    if (low.includes('gcash')) return 'GCash';
    if (low.includes('cash')) return 'Cash';
    if (low === 'paymaya' || low.includes('maya')) return 'GCash';
    const found = paymentOptions.find((o) => o.value === s2 || o.label === s2);
    return found ? found.value : 'Cash';
  };

  const viewPaymentMethod = useMemo(() => {
    const candidates = [
      rateR?.payment_method,
      detR?.payment_method,
      fx?.payment_method,
      s?.payment_method,
      savedRate?.payment_method,
      localStorage.getItem('client_payment_method')
    ];
    for (const c of candidates) {
      const s2 = String(c ?? '').trim();
      if (!s2) continue;
      const low = s2.toLowerCase();
      if (low.includes('gcash')) return 'GCash';
      if (low.includes('cash')) return 'Cash';
      if (low === 'paymaya' || low.includes('maya')) return 'GCash';
      return s2;
    }
    return 'Cash';
  }, [rateR, detR, fx, s, savedRate]);

  const initialPaymentMethod = useMemo(() => {
    const fromRow = normalizePayment(viewPaymentMethod);
    if (fromRow) return fromRow;
    const fromLS = normalizePayment(localStorage.getItem('client_payment_method'));
    if (fromLS) return fromLS;
    return 'Cash';
  }, [viewPaymentMethod, paymentOptions]);

  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);

  useEffect(() => {
    setPaymentMethod((prev) => (prev ? prev : initialPaymentMethod));
  }, [initialPaymentMethod]);

  const persistPayment = (val) => {
    const v = normalizePayment(val) || 'Cash';
    try {
      localStorage.setItem('client_payment_method', v);
      localStorage.setItem('clientPaymentMethod', JSON.stringify({ payment_method: v }));
    } catch {}
  };

  const paymentChoices = useMemo(
    () => [
      { value: 'Cash', title: 'Cash', subtitle: 'Pay directly to the worker', icon: '/Cashlogo.png' },
      { value: 'GCash', title: 'GCash', subtitle: 'Payment is done when the service is completed', icon: '/Gcashlogo.png' }
    ],
    []
  );

  const currentPaymentMeta = useMemo(() => {
    const v = normalizePayment(paymentMethod) || 'Cash';
    return paymentChoices.find((p) => p.value === v) || paymentChoices[0];
  }, [paymentMethod, paymentChoices]);

  useEffect(() => {
    if (!paymentMethod) return;
    persistPayment(paymentMethod);
  }, []);

  useEffect(() => {
    if (!showPaymentModal) return;
    setTempPayment(normalizePayment(paymentMethod) || 'Cash');
    setPaymentSaveErr('');
  }, [showPaymentModal]);

  const applyPaymentLocal = (v) => {
    const normalized = normalizePayment(v) || 'Cash';
    setPaymentMethod(normalized);
    persistPayment(normalized);

    setRow((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const rateNext = { ...(next.rate || {}) };
      const detailsNext = { ...(next.details || {}) };
      rateNext.payment_method = normalized;
      detailsNext.payment_method = normalized;
      next.rate = rateNext;
      next.details = detailsNext;
      next.payment_method = normalized;
      return next;
    });

    return normalized;
  };

  const revertPaymentLocal = (prev) => {
    const normalized = normalizePayment(prev) || 'Cash';
    setPaymentMethod(normalized);
    persistPayment(normalized);

    setRow((p) => {
      if (!p) return p;
      const next = { ...p };
      const rateNext = { ...(next.rate || {}) };
      const detailsNext = { ...(next.details || {}) };
      rateNext.payment_method = normalized;
      detailsNext.payment_method = normalized;
      next.rate = rateNext;
      next.details = detailsNext;
      next.payment_method = normalized;
      return next;
    });
  };

  const savePaymentToServer = async (val) => {
    if (!id) return { ok: false, message: 'Missing request id' };
    const normalized = normalizePayment(val) || 'Cash';
    try {
      const { data } = await axios.put(
        `${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(id)}/payment-method`,
        {
          request_group_id: id,
          client_id: clientIdState || null,
          email_address: email || null,
          payment_method: normalized
        },
        { withCredentials: true, headers: headersWithU }
      );
      const serverPayment = normalizePayment(data?.rate?.payment_method ?? data?.payment_method ?? normalized) || normalized;

      setRow((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        const rateNext = { ...(next.rate || {}) };
        const detailsNext = { ...(next.details || {}) };
        rateNext.payment_method = serverPayment;
        detailsNext.payment_method = serverPayment;
        next.rate = rateNext;
        next.details = detailsNext;
        next.payment_method = serverPayment;
        return next;
      });

      setPaymentMethod(serverPayment);
      persistPayment(serverPayment);
      return { ok: true };
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to update payment method. Try again.';
      return { ok: false, message: msg };
    }
  };

  const handlePaymentDone = async () => {
    const prev = paymentMethod;
    const next = applyPaymentLocal(tempPayment || 'Cash');

    setSavingPayment(true);
    setPaymentSaveErr('');
    const res = await savePaymentToServer(next);
    setSavingPayment(false);

    if (!res.ok) {
      revertPaymentLocal(prev);
      setPaymentSaveErr(res.message || 'Failed to update payment method. Try again.');
      return;
    }

    setShowPaymentModal(false);
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
    navigate('/clientdashboard', { replace: true, state: { cancelled: id } });
  };

  return (
    <>
      <ClientNavigation />

      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="mx-auto w-full max-w-[1420px] px-6">
          <div className="mt-8 mb-6">
            <div className="text-xs text-gray-500 tracking-wide">Service Request</div>
            <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight mt-2 text-gray-900">Request Details</h2>
          </div>

          <div className="space-y-6 mt-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm md:text-base font-semibold text-gray-700">Request ID:</div>
                <div className="text-sm md:text-base font-semibold text-[#008cfc] break-all">{requestIdDisplay}</div>
              </div>
            </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Request Details</h3>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-6">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 items-start ${review_image ? '' : 'md:grid-cols-1'}`}>
                      <div className="space-y-5">
                        <LabelValue label="Service Type" value={service_type} />
                        <LabelValue label="Service Task" value={service_task} />
                        <LabelValue label="Workers Needed" value={workersNeededDisplay} />
                        <LabelValue label="Added Workers Fee" value={extraWorkersFeeNode} />
                        <LabelValue label="Preferred Date" value={preferred_date_display} />
                        <LabelValue label="Preferred Time" value={preferred_time_display} />
                        <LabelValue label="Preferred Time Fee" value={preferredTimeFeeNode} />
                        <LabelValue
                          label="Urgent"
                          value={<span className="text-[15px] md:text-base font-semibold text-[#008cfc]">{toBoolStrict(is_urgent) ? 'Yes' : 'No'}</span>}
                        />
                        <LabelValue
                          label="Tools Provided"
                          value={
                            <span className="text-[15px] md:text-base font-semibold text-[#008cfc]">
                              {toBoolStrict(tools_provided) ? 'Yes' : 'No'}
                            </span>
                          }
                        />

                        {isLaundry ? (
                          <LabelValue
                            label="Laundry Quantity"
                            value={
                              <span className="text-[15px] md:text-base font-semibold text-[#008cfc]">
                                {rateUnits} {unitDisplayLabel}
                                {quantityUnit === 'kg' && minimumApplied && Number.isFinite(Number(billableUnits)) && billableUnits !== rateUnits ? (
                                  <span className="ml-2 text-xs font-semibold text-gray-600">
                                    (billed as {billableUnits} kg{minimumQty ? ` • min ${minimumQty}kg` : ''})
                                  </span>
                                ) : null}
                              </span>
                            }
                          />
                        ) : null}

                        <LabelValue label="Description" value={service_description || '-'} />
                      </div>

                      {review_image ? (
                        <div className="md:pl-2">
                          <div className="flex flex-col gap-2">
                            <div className="text-gray-700 font-semibold">Request Image:</div>
                            <div className="w-full rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50 border border-gray-200">
                              <div className="w-full h-[260px] sm:h-[300px]">
                                <img src={review_image} alt="" className="h-full w-full object-cover" />
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
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                    </div>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                      {showBreakdown ? (
                        <div className="md:col-span-2">
                          <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/40 p-5">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">Cost Breakdown</div>
                              <div className="text-xs text-gray-500">based on your selected task</div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-medium">Base rate</div>
                                <div className="mt-1 text-base font-semibold text-gray-900">{baseRateDisplay || '—'}</div>
                              </div>

                              <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-medium">{isLaundry ? 'Quantity' : 'Units'}</div>
                                <div className="mt-1 text-base font-semibold text-gray-900">
                                  {rateUnits} {unitDisplayLabel}
                                </div>
                                {isLaundry && quantityUnit === 'kg' && minimumApplied && Number.isFinite(Number(billableUnits)) && billableUnits !== rateUnits ? (
                                  <div className="mt-1 text-xs text-gray-500 font-semibold">
                                    billed as {billableUnits} kg{minimumQty ? ` • min ${minimumQty}kg` : ''})
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-medium">Base rate fee</div>
                                <div className="mt-1 text-base font-semibold text-gray-900">{peso(subtotal)}</div>
                              </div>

                              <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="text-xs text-gray-500 font-medium">Preferred time fee</div>
                                <div className={`mt-1 text-base font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                  {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
                                </div>
                              </div>

                              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                                <div className="text-xs text-gray-500 font-medium">Added workers fee</div>
                                <div className={`mt-1 text-base font-semibold ${extraWorkersFeeTotal > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                  {extraWorkersFeeTotal > 0 ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="md:col-span-2">
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                            <LabelValue label="Rate Type" value={rate_type || '-'} />
                            {rate_type === 'Hourly Rate' ? (
                              <LabelValue label="Rate" value={rate_from && rate_to ? `₱${rate_from} - ₱${rate_to} per hour` : '-'} />
                            ) : (
                              <LabelValue label="Rate" value={rate_value ? `₱${rate_value}` : '-'} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-1 flex flex-col">
                <div className="lg:sticky lg:top-[92px] bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-gray-900">Summary</div>
                        <div className="text-xs text-gray-500 mt-1">Quick overview of your request.</div>
                      </div>
                      <div className="h-10 w-10 rounded-xl border border-blue-100 bg-blue-50 grid place-items-center">
                        <span className="text-[#008cfc] font-bold">✓</span>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Client:</span>
                        <span className="text-base font-semibold text-[#008cfc]">
                          {first_name || '-'} {last_name || ''}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Service:</span>
                        <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">
                          {service_type || '-'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Task:</span>
                        <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">
                          {service_task || '-'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Workers Needed:</span>
                        <span className="text-base font-semibold text-[#008cfc]">{workersNeededDisplay}</span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Added Workers Fee:</span>
                        <span className={`text-base font-semibold ${extraWorkersFeeTotal > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                          {extraWorkersFeeTotal > 0 ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Preferred Time Fee:</span>
                        <span className={`text-base font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                          {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-700">Schedule:</span>
                        <span className="text-base font-semibold text-[#008cfc]">
                          {preferred_date_display || '-'} • {preferred_time_display || '-'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                          <div className="text-[11px] text-gray-500 font-medium">Urgent</div>
                          <div className="text-sm font-semibold text-gray-900">{toBoolStrict(is_urgent) ? 'Yes' : 'No'}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                          <div className="text-[11px] text-gray-500 font-medium">Tools Provided</div>
                          <div className="text-sm font-semibold text-gray-900">{toBoolStrict(tools_provided) ? 'Yes' : 'No'}</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          <div className="px-4 pt-4 pb-2 text-[11px] tracking-wider text-gray-500 font-semibold">TOTAL</div>
                          <div className="px-4 pb-4 flex items-center justify-between gap-3">
                            <div className="text-base font-semibold text-gray-900">Total</div>
                            <div className="text-2xl font-bold text-gray-900">{peso(totalForDisplay)}</div>
                          </div>

                          <div className="px-4 pb-4 -mt-1">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">{isLaundry ? 'Quantity' : 'Units'}</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {rateUnits} {unitDisplayLabel}
                                </div>
                                {isLaundry && quantityUnit === 'kg' && minimumApplied && Number.isFinite(Number(billableUnits)) && billableUnits !== rateUnits ? (
                                  <div className="mt-1 text-[11px] font-semibold text-gray-500">billed as {billableUnits} kg</div>
                                ) : null}
                              </div>

                              <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">Preferred time fee</div>
                                <div className={`text-sm font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                  {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
                                </div>
                              </div>

                              <div className="col-span-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">Added workers fee</div>
                                <div className={`text-sm font-semibold ${extraWorkersFeeTotal > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                  {extraWorkersFeeTotal > 0 ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                                </div>
                              </div>

                              <div className="col-span-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">Base rate</div>
                                <div className="text-sm font-semibold text-gray-900">{baseRateDisplay || '—'}</div>
                              </div>

                              <div className="col-span-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">Base rate fee</div>
                                <div className="text-sm font-semibold text-gray-900">{peso(subtotal)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          <div className="px-4 pt-4 pb-2 text-[11px] tracking-wider text-gray-500 font-semibold">PAYMENT METHOD</div>
                          <div className="px-4 pb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-xl border border-gray-200 bg-white grid place-items-center overflow-hidden shrink-0">
                                <img
                                  src={currentPaymentMeta?.icon || '/Cashlogo.png'}
                                  alt=""
                                  className="h-7 w-7 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="text-lg font-semibold text-gray-900 truncate">{currentPaymentMeta?.title || 'Cash'}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPaymentModal(true)}
                              className="text-[#008cfc] font-semibold text-sm hover:underline shrink-0"
                            >
                              Change
                            </button>
                          </div>
                          <div className="px-4 pb-4 -mt-2 text-xs text-gray-500">{currentPaymentMeta?.subtitle || 'Pay directly to the worker'}</div>
                        </div>

                        {paymentSaveErr ? (
                          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 font-medium">
                            {paymentSaveErr}
                          </div>
                        ) : null}

                        <div className="mt-3 text-xs text-gray-500">
                          Total is based on your selected task base rate fee, plus preferred time fee and added workers fee (if applicable).
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleDone}
                      className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                    >
                      Done View
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {showPaymentModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select payment method"
            tabIndex={-1}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !savingPayment) setShowPaymentModal(false);
            }}
            className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !savingPayment && setShowPaymentModal(false)} />
            <div className="relative w-[520px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Payment Method</div>
                  <div className="mt-1 text-sm text-gray-600">You will only be charged after the service</div>
                </div>
                <button
                  type="button"
                  onClick={() => !savingPayment && setShowPaymentModal(false)}
                  className="h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50 grid place-items-center text-gray-600 disabled:opacity-60"
                  aria-label="Close"
                  disabled={savingPayment}
                >
                  ×
                </button>
              </div>

              <div className="px-6 py-5 space-y-3">
                {paymentChoices.map((opt) => {
                  const active = normalizePayment(tempPayment) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !savingPayment && setTempPayment(opt.value)}
                      className={`w-full text-left rounded-2xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60 ${
                        active ? 'border-[#008cfc] bg-blue-50/40' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      disabled={savingPayment}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-2xl border grid place-items-center bg-white overflow-hidden shrink-0 ${
                            active ? 'border-[#008cfc]/40' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={opt.icon}
                            alt=""
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-semibold text-gray-900">{opt.title}</div>
                            <div className={`h-5 w-5 rounded-full border grid place-items-center ${active ? 'border-[#008cfc]' : 'border-gray-300'}`}>
                              {active ? <div className="h-3 w-3 rounded-full bg-[#008cfc]" /> : null}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">{opt.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {paymentSaveErr ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 font-medium">
                    {paymentSaveErr}
                  </div>
                ) : null}
              </div>

              <div className="px-6 py-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => !savingPayment && setShowPaymentModal(false)}
                  className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                  disabled={savingPayment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePaymentDone}
                  className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                  disabled={savingPayment}
                >
                  {savingPayment ? 'Saving...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading request"
            tabIndex={-1}
            autoFocus
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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

        {showCancel && (
          <div role="dialog" aria-modal="true" aria-label="Cancel request" tabIndex={-1} autoFocus className="fixed inset-0 z-[2147483646] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingCancel && setShowCancel(false)} />
            <div className="relative w-full max-w-[560px] mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="px-6 pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 grid place-items-center">
                    <span className="text-blue-600 text-lg">ⓘ</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-semibold text-gray-900">Cancel Request</div>
                    <div className="text-sm text-gray-600">Let us know why you’re cancelling.</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                        reason === r ? 'border-blue-400 ring-1 ring-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
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
                    className="w-full min-h-[96px] rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {cancelErr ? <div className="text-sm text-blue-700">{cancelErr}</div> : null}
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
                  className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition disabled:opacity-60"
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
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
              <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
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
                  Go to Dashboard
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
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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

        {savingPayment && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Saving payment method"
            tabIndex={-1}
            autoFocus
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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
                    <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center space-y-1">
                <div className="text-lg font-semibold text-gray-900">Saving Payment Method</div>
                <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
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
