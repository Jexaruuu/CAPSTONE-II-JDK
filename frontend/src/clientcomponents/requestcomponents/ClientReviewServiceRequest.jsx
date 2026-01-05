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

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tempPayment, setTempPayment] = useState('');

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
    const lock = isSubmitting || showSuccess || isLoadingBack || showPaymentModal;
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
  }, [isSubmitting, showSuccess, isLoadingBack, showPaymentModal]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
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

  const savedPayment = (() => {
    try {
      return JSON.parse(localStorage.getItem('clientPaymentMethod') || '{}');
    } catch {
      return {};
    }
  })();

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
    rate_value = savedRate.rateValue,
    payment_method: payment_method_state,
    units: units_state,
    quantity_unit: quantity_unit_state,
    billable_units: billable_units_state,
    minimum_quantity: minimum_quantity_state,
    minimum_applied: minimum_applied_state,
    base_rate_raw: base_rate_raw_state,
    base_rate_numeric: base_rate_numeric_state,
    subtotal: subtotal_state,
    preferred_time_fee: preferred_time_fee_state,
    total: total_state
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

  const rateUnits = useMemo(() => {
    const fromState = toUnit(units_state);
    if (units_state !== undefined && units_state !== null && units_state !== '') return fromState;
    return toUnit(savedRate?.units);
  }, [units_state, savedRate]);

  const isLaundry = useMemo(() => String(service_type || '').trim() === 'Laundry', [service_type]);

  const quantityUnit = useMemo(() => {
    const v = quantity_unit_state !== undefined ? quantity_unit_state : savedRate?.quantity_unit;
    const s2 = String(v || '').trim().toLowerCase();
    if (!s2) return isLaundry ? 'kg' : 'unit';
    if (s2 === 'kilogram' || s2 === 'kilograms') return 'kg';
    return s2;
  }, [quantity_unit_state, savedRate, isLaundry]);

  const minimumQty = useMemo(() => {
    const v = minimum_quantity_state !== undefined ? minimum_quantity_state : savedRate?.minimum_quantity;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
    if (isLaundry && quantityUnit === 'kg') return 8;
    return null;
  }, [minimum_quantity_state, savedRate, isLaundry, quantityUnit]);

  const minimumApplied = useMemo(() => {
    const v = minimum_applied_state !== undefined ? minimum_applied_state : savedRate?.minimum_applied;
    return !!v;
  }, [minimum_applied_state, savedRate]);

  const billableUnits = useMemo(() => {
    const v = billable_units_state !== undefined ? billable_units_state : savedRate?.billable_units;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1) return Math.max(1, Math.floor(n));
    if (isLaundry && quantityUnit === 'kg') {
      const min = Number(minimumQty);
      const minSafe = Number.isFinite(min) && min > 0 ? min : 8;
      return Math.max(minSafe, rateUnits);
    }
    return rateUnits;
  }, [billable_units_state, savedRate, isLaundry, quantityUnit, minimumQty, rateUnits]);

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

  const baseRateRaw = useMemo(() => {
    const v = base_rate_raw_state !== undefined ? base_rate_raw_state : savedRate?.base_rate_raw;
    return v ?? '';
  }, [base_rate_raw_state, savedRate]);

  const baseRateNumeric = useMemo(() => {
    const v = base_rate_numeric_state !== undefined ? base_rate_numeric_state : savedRate?.base_rate_numeric;
    const n = v === null || v === undefined || v === '' ? null : Number(v);
    if (Number.isFinite(n)) return n;
    return parseNumericRate(baseRateRaw);
  }, [base_rate_numeric_state, savedRate, baseRateRaw]);

  const subtotal = useMemo(() => {
    const v = subtotal_state !== undefined ? subtotal_state : savedRate?.subtotal;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    if (Number.isFinite(baseRateNumeric)) return baseRateNumeric * rateUnits;
    return 0;
  }, [subtotal_state, savedRate, baseRateNumeric, rateUnits]);

  const preferredTimeFee = useMemo(() => {
    const v = preferred_time_fee_state !== undefined ? preferred_time_fee_state : savedRate?.preferred_time_fee;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [preferred_time_fee_state, savedRate]);

  const total = useMemo(() => {
    const v = total_state !== undefined ? total_state : savedRate?.total;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return (Number(subtotal) || 0) + (Number(preferredTimeFee) || 0);
  }, [total_state, savedRate, subtotal, preferredTimeFee]);

  const baseRateDisplay = useMemo(() => {
    const formatted = formatRate(baseRateRaw || baseRateNumeric || '');
    if (!formatted) return '';
    return shouldShowPerUnit(service_type) ? `per unit ${formatted}` : formatted;
  }, [baseRateRaw, baseRateNumeric, service_type]);

  const rateTypeNormalized = String(rate_type || '').trim();

  const primaryRateValueNode = useMemo(() => {
    if (rateTypeNormalized === 'Hourly Rate') {
      const rf = rate_from ?? '';
      const rt = rate_to ?? '';
      return rf && rt ? (
        <div className="text-lg font-bold text-[#008cfc]">
          ₱{rf}–₱{rt} <span className="text-sm font-semibold opacity-80">per hour</span>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">No rate provided</div>
      );
    }
    if (rateTypeNormalized === 'By the Job Rate') {
      const rv = rate_value ?? '';
      return rv ? (
        <div className="text-lg font-bold text-[#008cfc]">
          ₱{rv} <span className="text-sm font-semibold opacity-80">per job</span>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">No rate provided</div>
      );
    }
    if (rateTypeNormalized === 'Service Task Rate') {
      return <div className="text-lg font-bold text-[#008cfc]">{peso(total)}</div>;
    }
    if (rate_value) return <div className="text-lg font-bold text-[#008cfc]">{formatRate(rate_value)}</div>;
    return <div className="text-gray-500 text-sm">No rate provided</div>;
  }, [rateTypeNormalized, rate_from, rate_to, rate_value, total]);

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const mapped = typeof value === 'boolean' ? yesNo(value) : value;
    const isEmpty =
      !isElement && (mapped === null || mapped === undefined || (typeof mapped === 'string' && mapped.trim() === ''));
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

  const requireFields = (obj, keys) => {
    const missing = [];
    keys.forEach((k) => {
      const val = obj[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) missing.push(k);
    });
    return missing;
  };

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

  const initialPaymentMethod = useMemo(() => {
    const fromState = normalizePayment(payment_method_state);
    if (fromState) return fromState;
    const fromLS = normalizePayment(
      savedPayment?.payment_method ||
        savedPayment?.method ||
        savedPayment?.paymentMethod ||
        localStorage.getItem('client_payment_method')
    );
    if (fromLS) return fromLS;
    return 'Cash';
  }, [payment_method_state, savedPayment, paymentOptions]);

  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);

  useEffect(() => {
    setPaymentMethod((prev) => (prev ? prev : initialPaymentMethod));
  }, [initialPaymentMethod]);

  const persistPayment = (val) => {
    const v = normalizePayment(val);
    try {
      localStorage.setItem('client_payment_method', v);
      localStorage.setItem('clientPaymentMethod', JSON.stringify({ payment_method: v }));
    } catch {}
  };

  useEffect(() => {
    if (!paymentMethod) return;
    persistPayment(paymentMethod);
  }, []);

  const paymentChoices = useMemo(
    () => [
      { value: 'Cash', title: 'Cash', subtitle: 'Pay directly to the worker', icon: '/Cashlogo.png' },
      { value: 'GCash', title: 'GCash', subtitle: 'Payment is done when the service is completed', icon: '/Gcashlogo.png' }
    ],
    []
  );

  const currentPaymentMeta = useMemo(() => {
    const v = normalizePayment(paymentMethod);
    return paymentChoices.find((p) => p.value === v) || paymentChoices[0];
  }, [paymentMethod, paymentChoices]);

  useEffect(() => {
    if (!showPaymentModal) return;
    setTempPayment(normalizePayment(paymentMethod) || 'Cash');
  }, [showPaymentModal]);

  const applyPayment = (v) => {
    const normalized = normalizePayment(v) || 'Cash';
    setPaymentMethod(normalized);
    persistPayment(normalized);
    try {
      const prev = JSON.parse(localStorage.getItem('clientPaymentMethod') || '{}');
      localStorage.setItem('clientPaymentMethod', JSON.stringify({ ...prev, payment_method: normalized }));
    } catch {
      try {
        localStorage.setItem('clientPaymentMethod', JSON.stringify({ payment_method: normalized }));
      } catch {}
    }
  };

  const handleConfirm = async () => {
    try {
      setSubmitError('');
      setIsSubmitting(true);

      const infoDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('clientInformationForm') || '{}');
        } catch {
          return {};
        }
      })();
      const detailsDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}');
        } catch {
          return {};
        }
      })();
      const rateDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('clientServiceRate') || '{}');
        } catch {
          return {};
        }
      })();
      const agreementsDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('clientAgreements') || '{}');
        } catch {
          return {};
        }
      })();

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
          attachments: Array.isArray(detailsDraft.attachments)
            ? detailsDraft.attachments
            : detailsDraft.image
              ? [detailsDraft.image]
              : []
        },
        rate: {
          rateType: rateDraft.rateType || '',
          rateFrom: rateDraft.rateFrom || '',
          rateTo: rateDraft.rateTo || '',
          rateValue: rateDraft.rateValue || ''
        }
      };

      const clientAuth = (() => {
        try {
          return JSON.parse(localStorage.getItem('clientAuth') || '{}');
        } catch {
          return {};
        }
      })();
      const emailFallback = (
        payload.info.email ||
        savedInfo.email ||
        clientAuth.email ||
        localStorage.getItem('client_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        ''
      )
        .toString()
        .trim()
        .toLowerCase();
      const emailVal = emailFallback;
      const clientId =
        clientIdState ||
        infoDraft.client_id ||
        infoDraft.clientId ||
        Number(localStorage.getItem('client_id')) ||
        null;

      const addressCombined = payload.info.street
        ? payload.info.additionalAddress
          ? `${payload.info.street}, ${payload.info.additionalAddress}`
          : payload.info.street
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
          image_name: payload.details.imageName || '',
          rate_units: toUnit(rateDraft.units),
          base_rate_raw: rateDraft.base_rate_raw ?? '',
          base_rate_numeric: rateDraft.base_rate_numeric ?? null,
          subtotal: rateDraft.subtotal ?? null,
          preferred_time_fee: rateDraft.preferred_time_fee ?? null,
          total: rateDraft.total ?? null,
          quantity_unit: rateDraft.quantity_unit ?? null,
          billable_units: rateDraft.billable_units ?? null,
          minimum_quantity: rateDraft.minimum_quantity ?? null,
          minimum_applied: !!rateDraft.minimum_applied,
          payment_method: paymentMethod
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
      } else {
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

      if (
        !(normalized.client_id && String(normalized.client_id).trim()) &&
        !(normalized.email_address && String(normalized.email_address).trim())
      ) {
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
        attachments:
          Array.isArray(normalized.attachments) && normalized.attachments.length
            ? normalized.attachments
            : normalized.attachment
              ? [normalized.attachment]
              : [],
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
        image_name: normalized.metadata.image_name,
        rate_units: normalized.metadata.rate_units,
        base_rate_raw: normalized.metadata.base_rate_raw,
        base_rate_numeric: normalized.metadata.base_rate_numeric,
        subtotal: normalized.metadata.subtotal,
        preferred_time_fee: normalized.metadata.preferred_time_fee,
        total: normalized.metadata.total,
        quantity_unit: normalized.metadata.quantity_unit,
        billable_units: normalized.metadata.billable_units,
        minimum_quantity: normalized.metadata.minimum_quantity,
        minimum_applied: normalized.metadata.minimum_applied,
        payment_method: paymentMethod
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
        attachments:
          Array.isArray(normalized.attachments) && normalized.attachments.length
            ? normalized.attachments
            : normalized.attachment
              ? [normalized.attachment]
              : [],
        metadata: metadataPayload,
        info: infoPayload,
        details: detailsPayload,
        rate: ratePayload,
        payment_method: paymentMethod,
        agreements: {
          email_address: (agreementsDraft.email_address || normalized.email_address || '').toString().trim(),
          agree_verify: !!agreementsDraft.agree_verify,
          agree_tos: !!agreementsDraft.agree_tos,
          agree_privacy: !!agreementsDraft.agree_privacy
        }
      };

      const jsonRes = await axios.post(`${API_BASE}/api/clientservicerequests/submit`, jsonBody, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json', ...headersWithU }
      });
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
      replace: true
    });
  };

  const showBreakdown =
    rateTypeNormalized === 'Service Task Rate' && (Number.isFinite(Number(total)) || Number.isFinite(Number(subtotal)));

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
              <img
                src="/jdklogo.png"
                alt=""
                className="h-6 w-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
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
                      <LabelValue label="Preferred Date" value={preferred_date_display} />
                      <LabelValue label="Preferred Time" value={preferred_time_display} />
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
                                  billed as {billableUnits} kg{minimumQty ? ` • min ${minimumQty}kg` : ''}
                                </div>
                              ) : null}
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <div className="text-xs text-gray-500 font-medium">Subtotal</div>
                              <div className="mt-1 text-base font-semibold text-gray-900">{peso(subtotal)}</div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <div className="text-xs text-gray-500 font-medium">Preferred time fee</div>
                              <div className={`mt-1 text-base font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {rateTypeNormalized === 'Hourly Rate' ? (
                      <div className="md:col-span-2">
                        <div className="rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-sm text-gray-700">
                          Hourly rates are shown as a range. Final total will depend on actual service duration.
                        </div>
                      </div>
                    ) : null}
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
                      <div className="text-xs text-gray-500 mt-1">Double-check everything before submitting.</div>
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

                    {rateTypeNormalized === 'Service Task Rate' ? (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          <div className="px-4 pt-4 pb-2 text-[11px] tracking-wider text-gray-500 font-semibold">TOTAL</div>
                          <div className="px-4 pb-4 flex items-center justify-between gap-3">
                            <div className="text-base font-semibold text-gray-900">Total</div>
                            <div className="text-2xl font-bold text-gray-900">{peso(total)}</div>
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
                                <div className="text-[11px] text-gray-500 font-medium">Fee</div>
                                <div className={`text-sm font-semibold ${preferredTimeFee > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                  {preferredTimeFee > 0 ? `+ ${peso(preferredTimeFee)}` : '—'}
                                </div>
                              </div>

                              <div className="col-span-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
                                <div className="text-[11px] text-gray-500 font-medium">Base rate</div>
                                <div className="text-sm font-semibold text-gray-900">{baseRateDisplay || '—'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-gray-700">Rate</span>
                          <div className="text-right">{primaryRateValueNode}</div>
                        </div>
                      </div>
                    )}

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
                        <div className="px-4 pb-4 -mt-2 text-xs text-gray-500">You will only be charged after the service.</div>
                      </div>

                      {rateTypeNormalized === 'Service Task Rate' ? (
                        <div className="mt-3 text-xs text-gray-500">
                          Total is based on your selected task rate × {isLaundry ? 'quantity' : 'units'}, plus preferred time fee (if applicable).
                        </div>
                      ) : null}
                    </div>
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
                    onClick={handleConfirm}
                    className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Submit
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
            if (e.key === 'Escape') setShowPaymentModal(false);
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-[520px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Payment Method</div>
                <div className="mt-1 text-sm text-gray-600">You will only be charged after the service</div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50 grid place-items-center text-gray-600"
                aria-label="Close"
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
                    onClick={() => setTempPayment(opt.value)}
                    className={`w-full text-left rounded-2xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 ${
                      active ? 'border-[#008cfc] bg-blue-50/40' : 'border-gray-200 hover:bg-gray-50'
                    }`}
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
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  applyPayment(tempPayment || 'Cash');
                  setShowPaymentModal(false);
                }}
                className="w-full sm:w-1/2 h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting service request"
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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleGoDashboard();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[420px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <div className="text-xl font-semibold text-gray-900">Request Submitted</div>
              <div className="mt-1 text-sm text-gray-600">Your service request has been successfully submitted.</div>
              {requestGroupId ? (
                <div className="mt-3 text-xs text-gray-500">
                  Reference: <span className="font-semibold text-gray-800">{String(requestGroupId)}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full h-[48px] px-5 py-3 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReviewServiceRequest;
