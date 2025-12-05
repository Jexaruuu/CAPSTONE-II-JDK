import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const toYesNo = v => {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'yes' || s === 'y' || s === 'true' || s === 't' || s === '1') return 'Yes';
  if (s === 'no' || s === 'n' || s === 'false' || s === 'f' || s === '0') return 'No';
  return v === true ? 'Yes' : v === false ? 'No' : '';
};
const fromYesNo = v => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '';
  return s === 'yes' || s === 'y' || s === 'true' || s === 't' || s === '1' ? 'Yes' : 'No';
};

function readAsDataUrl(file) {
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
    const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
    const e = a.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
    return encodeURIComponent(JSON.stringify({ r: 'client', e, au }));
  } catch {
    return '';
  }
}

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

const normalizeRateType = (v, r = {}) => {
  const s = String(v || '').trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
  if (['hourly', 'range', 'hourly range', 'hourly rate'].includes(s)) return 'range';
  if (['by job', 'by the job', 'fixed', 'fixed rate', 'job', 'byjob'].includes(s)) return 'by_job';
  if (r && (r.rate_from != null || r.rate_to != null)) return 'range';
  if (r && (r.rate_value != null && r.rate_value !== '')) return 'by_job';
  return '';
};

const PopList = ({
  items,
  value,
  onSelect,
  disabledLabel,
  emptyLabel = 'No options',
  fullWidth = false,
  title = 'Select',
  clearable = false,
  onClear,
  clearText = 'Clear'
}) => (
  <div className={`absolute z-50 mt-2 ${fullWidth ? 'left-0 right-0 w-full' : 'w-80'} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}>
    <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
    <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
      {items && items.length ? items.map((it) => {
        const isSel = value === it;
        const disabled = disabledLabel && disabledLabel(it);
        return (
          <button
            key={it}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(it)}
            className={[
              'text-left py-2 px-3 rounded-lg text-sm',
              disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50',
              isSel && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
            ].join(' ')}
          >
            {it}
          </button>
        );
      }) : (
        <div className="text-xs text-gray-400 px-2 py-3">{emptyLabel}</div>
      )}
    </div>
    <div className="flex items-center justify-between mt-3 px-2">
      <span className="text-xs text-gray-400">{(items && items.length ? items.length : 0)} result{(items && items.length === 1) ? '' : 's'}</span>
      {clearable ? (
        <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">{clearText}</button>
      ) : <span />}
    </div>
  </div>
);

export default function ClientEditServiceRequest() {
  const { id } = useParams();
  const gid = decodeURIComponent(id || '');
  const navigate = useNavigate();

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [serviceType, setServiceType] = useState('');
  const [serviceTask, setServiceTask] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isUrgent, setIsUrgent] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [description, setDescription] = useState('');
  const [rateType, setRateType] = useState('');
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');

  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);

  const [clientImageUrl, setClientImageUrl] = useState('');
  const [clientImageFile, setClientImageFile] = useState(null);
  const [clientImageDataUrl, setClientImageDataUrl] = useState(null);

  const [logoBroken, setLogoBroken] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [orig, setOrig] = useState(null);

  const fileRef = useRef(null);
  const clientFileRef = useRef(null);

  const sanitizeDecimal = (s) => {
    const x = String(s ?? '').replace(/[^\d.]/g, '');
    const parts = x.split('.');
    if (parts.length <= 1) return x;
    return parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(gid)}`, {
          withCredentials: true,
          headers: headersWithU
        });
        const d = data?.details || {};
        const r = data?.rate || {};
        const info = data?.info || {};
        const normRT = normalizeRateType(r.rate_type, r);
        setServiceType(d.service_type || '');
        setServiceTask(d.service_task || '');
        setPreferredDate(d.preferred_date || '');
        setPreferredTime(d.preferred_time || '');
        setIsUrgent(toYesNo(d.is_urgent));
        setToolsProvided(toYesNo(d.tools_provided));
        setDescription(d.service_description || '');
        setRateType(normRT);
        setRateFrom(r.rate_from || '');
        setRateTo(r.rate_to || '');
        setRateValue(r.rate_value || '');
        setImageUrl(d.request_image_url || '');
        setBarangay(info.barangay || '');
        setStreet(info.street || '');
        setAdditionalAddress(info.additional_address || info.additionalAddress || '');
        setClientImageUrl(info.profile_picture_url || '');
        setOrig({
          serviceType: d.service_type || '',
          serviceTask: d.service_task || '',
          preferredDate: d.preferred_date || '',
          preferredTime: d.preferred_time || '',
          isUrgent: toYesNo(d.is_urgent),
          toolsProvided: toYesNo(d.tools_provided),
          description: d.service_description || '',
          rateType: normRT,
          rateFrom: String(r.rate_from ?? ''),
          rateTo: String(r.rate_to ?? ''),
          rateValue: String(r.rate_value ?? ''),
          barangay: info.barangay || '',
          street: info.street || '',
          additionalAddress: info.additional_address || info.additionalAddress || '',
          imageUrl: d.request_image_url || '',
          clientImageUrl: info.profile_picture_url || ''
        });
      } catch {
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    if (gid) load();
  }, [gid, headersWithU]);

  const isDirty = useMemo(() => {
    if (!orig) return false;
    const a = (x) => String(x ?? '');
    const changed =
      a(serviceType) !== a(orig.serviceType) ||
      a(serviceTask) !== a(orig.serviceTask) ||
      a(preferredDate) !== a(orig.preferredDate) ||
      a(preferredTime) !== a(orig.preferredTime) ||
      a(isUrgent) !== a(orig.isUrgent) ||
      a(toolsProvided) !== a(orig.toolsProvided) ||
      a(description) !== a(orig.description) ||
      a(rateType) !== a(orig.rateType) ||
      a(rateFrom) !== a(orig.rateFrom) ||
      a(rateTo) !== a(orig.rateTo) ||
      a(rateValue) !== a(orig.rateValue) ||
      a(barangay) !== a(orig.barangay) ||
      a(street) !== a(orig.street) ||
      a(additionalAddress) !== a(orig.additionalAddress) ||
      a(imageUrl) !== a(orig.imageUrl) ||
      a(clientImageUrl) !== a(orig.clientImageUrl) ||
      !!imageDataUrl ||
      !!clientImageDataUrl;
    return changed;
  }, [
    orig,
    serviceType,
    serviceTask,
    preferredDate,
    preferredTime,
    isUrgent,
    toolsProvided,
    description,
    rateType,
    rateFrom,
    rateTo,
    rateValue,
    barangay,
    street,
    additionalAddress,
    imageUrl,
    clientImageUrl,
    imageDataUrl,
    clientImageDataUrl
  ]);

  useEffect(()=>{ 
  const lock=cancelLoading; 
  const html=document.documentElement; 
  const body=document.body; 
  const prevHtml=html.style.overflow; 
  const prevBody=body.style.overflow; 
  if(lock){ html.style.overflow="hidden"; body.style.overflow="hidden"; } 
  else { html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; } 
  return()=>{ html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; }; 
},[cancelLoading]);

useEffect(() => { 
  const handler = (e) => { if (cancelLoading) e.preventDefault(); }; 
  if (cancelLoading) { 
    window.addEventListener('wheel', handler, { passive: false }); 
    window.addEventListener('touchmove', handler, { passive: false }); 
  } 
  return () => { 
    window.removeEventListener('wheel', handler); 
    window.removeEventListener('touchmove', handler); 
  }; 
}, [cancelLoading]);

  const rateTypeDisplay = useMemo(() => {
    if (String(rateType || '').toLowerCase() === 'range') return 'Hourly Rate';
    if (String(rateType || '').toLowerCase() === 'by_job' || String(rateType || '').toLowerCase() === 'fixed') return 'By the Job Rate';
    return '';
  }, [rateType]);

  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const du = await readAsDataUrl(f);
    setImageDataUrl(du);
    if (du) setImageUrl('');
  };

  const onPickClientImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setClientImageFile(f);
    const du = await readAsDataUrl(f);
    setClientImageDataUrl(du);
    if (du) setClientImageUrl('');
  };

  const toNumOrNull = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setShowSaving(true);
    setOk('');
    setError('');
    try {
      const payload = {
        info: {
          barangay,
          street,
          additional_address: additionalAddress,
          ...(clientImageDataUrl ? { profile_picture_data_url: clientImageDataUrl } : {})
        },
        details: {
          service_type: serviceType,
          service_task: serviceTask,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          is_urgent: fromYesNo(isUrgent),
          tools_provided: fromYesNo(toolsProvided),
          service_description: description
        },
        rate: {
          rate_type: rateType || normalizeRateType(rateType, { rate_from: rateFrom, rate_to: rateTo, rate_value: rateValue }),
          rate_from: String(rateType || '').toLowerCase() === 'range' ? toNumOrNull(rateFrom) : null,
          rate_to: String(rateType || '').toLowerCase() === 'range' ? toNumOrNull(rateTo) : null,
          rate_value: String(rateType || '').toLowerCase() === 'range' ? null : toNumOrNull(rateValue)
        }
      };
      if (imageDataUrl) payload.attachments = [imageDataUrl];
      await axios.put(`${API_BASE}/api/clientservicerequests/by-group/${encodeURIComponent(gid)}`, payload, {
        withCredentials: true,
        headers: headersWithU
      });
      setOk('Changes saved');
      setShowSuccess(true);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
      setShowSaving(false);
    }
  };

  const onCancel = () => {
    if (cancelLoading) return;
    setCancelLoading(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setTimeout(() => { navigate('/clientdashboard', { replace: true }); }, 2000);
  };

  const onSuccessOk = () => {
    setShowSuccess(false);
    setCancelLoading(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setTimeout(() => { navigate('/clientdashboard', { replace: true }); }, 2000);
  };

  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];
  const serviceTasks = {
    Carpentry: ['General Carpentry', 'Furniture Repair', 'Wood Polishing', 'Door & Window Fitting', 'Custom Furniture Design', 'Modular Kitchen Installation', 'Flooring & Decking', 'Cabinet & Wardrobe Fixing', 'Wall Paneling & False Ceiling', 'Wood Restoration & Refinishing'],
    'Electrical Works': ['Wiring Repair', 'Appliance Installation', 'Lighting Fixtures', 'Circuit Breaker & Fuse Repair', 'CCTV & Security System Setup', 'Fan & Exhaust Installation', 'Inverter & Battery Setup', 'Switchboard & Socket Repair', 'Electrical Safety Inspection', 'Smart Home Automation'],
    Plumbing: ['Leak Fixing', 'Pipe Installation', 'Bathroom Fittings', 'Drain Cleaning & Unclogging', 'Water Tank Installation', 'Gas Pipeline Installation', 'Septic Tank & Sewer Repair', 'Water Heater Installation', 'Toilet & Sink Repair', 'Kitchen Plumbing Solutions'],
    'Car Washing': ['Exterior Wash', 'Interior Cleaning', 'Wax & Polish', 'Underbody Cleaning', 'Engine Bay Cleaning', 'Headlight Restoration', 'Ceramic Coating', 'Tire & Rim Cleaning', 'Vacuum & Odor Removal', 'Paint Protection Film Application'],
    Laundry: ['Dry Cleaning', 'Ironing', 'Wash & Fold', 'Steam Pressing', 'Stain Removal Treatment', 'Curtains & Upholstery Cleaning', 'Delicate Fabric Care', 'Shoe & Leather Cleaning', 'Express Same-Day Laundry', 'Eco-Friendly Washing']
  };
  const sortedServiceTypes = useMemo(() => [...serviceTypes].sort(), []);

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsRef = useRef(null);
  const urgentRef = useRef(null);
  const pdRef = useRef(null);
  const ptRef = useRef(null);
  const rateTypeRef = useRef(null);
  const barangayRef = useRef(null);

  const [stOpen, setStOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [pdOpen, setPdOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [rateTypeOpen, setRateTypeOpen] = useState(false);
  const [barangayOpen, setBarangayOpen] = useState(false);
  const [barangayQuery, setBarangayQuery] = useState('');

  const barangays = [
    'Alangilan', 'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa',
    'Granada', 'Handumanan', 'Lopez Jaena', 'Mandalagan', 'Mansilingan',
    'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag',
    'Taculing', 'Tangub', 'Villa Esperanza'
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);
  const filteredBarangays = useMemo(() => {
    const q = String(barangayQuery || '').trim().toLowerCase();
    if (!q) return sortedBarangays;
    return sortedBarangays.filter(b => b.toLowerCase().includes(q));
  }, [sortedBarangays, barangayQuery]);

  const getTodayLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const fromYMDLocal = (s) => {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  };
  const [todayStr, setTodayStr] = useState(getTodayLocalDateString());
  useEffect(() => {
    const id = setInterval(() => {
      const t = getTodayLocalDateString();
      setTodayStr((prev) => (prev !== t ? t : prev));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const toMDY = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${da}/${y}`;
  };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const addMonths = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

  const [pdView, setPdView] = useState(new Date());
  const monthsList = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const yearsList = (() => {
    const ys = [];
    const start = fromYMDLocal(todayStr).getFullYear();
    for (let y = start; y <= start + 5; y++) ys.push(y);
    return ys;
  })();
  const canPrevPD = () => addMonths(startOfMonth(pdView), -1) >= startOfMonth(fromYMDLocal(todayStr));
  const [pdMonthOpen, setPdMonthOpen] = useState(false);
  const [pdYearOpen, setPdYearOpen] = useState(false);

  const openPD = () => {
    if (preferredDate) setPdView(fromYMDLocal(preferredDate));
    else setPdView(fromYMDLocal(todayStr));
    setPdOpen((s) => !s);
    setPdMonthOpen(false);
    setPdYearOpen(false);
  };
  const setPDMonthYear = (m, y) => {
    const next = new Date(y, m, 1);
    const minStart = startOfMonth(fromYMDLocal(todayStr));
    setPdView(next < minStart ? minStart : next);
  };

  const openPT = () => setPtOpen((s) => !s);
  const to12h = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

  const rateError = useMemo(() => {
    if (String(rateType || '').toLowerCase() !== 'range') return '';
    if (rateFrom === '' || rateTo === '') return '';
    const f = Number(rateFrom);
    const t = Number(rateTo);
    if (Number.isFinite(f) && Number.isFinite(t) && t <= f) return 'To must be greater than From';
    return '';
  }, [rateType, rateFrom, rateTo]);

  const isComplete = useMemo(() => {
    const req = [serviceType, serviceTask, preferredDate, preferredTime, isUrgent, toolsProvided, description, rateType, barangay, street];
    const allFilled = req.every(v => String(v ?? '').trim() !== '');
    if (!allFilled) return false;
    const rt = String(rateType || '').toLowerCase();
    if (rt === 'range') {
      if (String(rateFrom ?? '').trim() === '' || String(rateTo ?? '').trim() === '') return false;
      const f = Number(rateFrom);
      const t = Number(rateTo);
      if (!Number.isFinite(f) || !Number.isFinite(t)) return false;
      if (t <= f) return false;
      return true;
    }
    if (rt === 'by_job' || rt === 'fixed') {
      if (String(rateValue ?? '').trim() === '') return false;
      const v = Number(rateValue);
      if (!Number.isFinite(v)) return false;
      return true;
    }
    return false;
  }, [serviceType, serviceTask, preferredDate, preferredTime, isUrgent, toolsProvided, description, rateType, barangay, street, rateFrom, rateTo, rateValue]);

  const canSave = isDirty && !rateError && isComplete && !saving;

  useEffect(()=>{ document.body.style.overflow=confirmOpen?"hidden":""; return()=>{ document.body.style.overflow=""; }; },[confirmOpen]);
  useEffect(()=>{ const lock=showSuccess||showSaving; const html=document.documentElement; const body=document.body; const prevHtml=html.style.overflow; const prevBody=body.style.overflow; if(lock){ html.style.overflow="hidden"; body.style.overflow="hidden"; } else { html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; } return()=>{ html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; }; },[showSuccess,showSaving]);

  useEffect(() => { const handler = (e) => { if (showSaving) e.preventDefault(); }; if (showSaving) { window.addEventListener('wheel', handler, { passive: false }); window.addEventListener('touchmove', handler, { passive: false }); } return () => { window.removeEventListener('wheel', handler); window.removeEventListener('touchmove', handler); }; }, [showSaving]);

  useEffect(()=>{ const lock=loading; const html=document.documentElement; const body=document.body; const prevHtml=html.style.overflow; const prevBody=body.style.overflow; if(lock){ html.style.overflow="hidden"; body.style.overflow="hidden"; } else { html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; } return()=>{ html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; }; },[loading]);

  useEffect(() => { const handler = (e) => { if (loading) e.preventDefault(); }; if (loading) { window.addEventListener('wheel', handler, { passive: false }); window.addEventListener('touchmove', handler, { passive: false }); } return () => { window.removeEventListener('wheel', handler); window.removeEventListener('touchmove', handler); }; }, [loading]);

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
              <div className="text-2xl md:text-3xl font-semibold text-gray-900">Edit Service Request</div>
            </div>
            <div className="hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={()=>setConfirmOpen(true)}
                  disabled={saving || !isDirty || !!rateError || !isComplete}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1420px] px-6">
          <div className="space-y-6 mt-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Request Details</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                {ok && <div className="mb-4 text-sm text-emerald-700">{ok}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6 items-start">
                  <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="text-base font-semibold text-gray-900 mb-3">Client Profile</div>
                      <div className="w-full aspect-square rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50 grid place-items-center">
                        {clientImageDataUrl ? (
                          <img src={clientImageDataUrl} alt="" className="w-full h-full object-cover object-center" />
                        ) : clientImageUrl ? (
                          <img src={clientImageUrl} alt="" className="w-full h-full object-cover object-center" />
                        ) : (
                          <span className="text-sm text-gray-500">No profile</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <input ref={clientFileRef} type="file" accept="image/*" className="hidden" onChange={onPickClientImage} />
                        <button
                          type="button"
                          onClick={() => clientFileRef.current?.click()}
                          className="w-full h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Choose Image
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="text-base font-semibold text-gray-900 mb-3">Request Image</div>
                      <div className="w-full aspect-square rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50 grid place-items-center">
                        {imageDataUrl ? (
                          <img src={imageDataUrl} alt="" className="w-full h-full object-cover object-center" />
                        ) : imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover object-center" />
                        ) : (
                          <span className="text-sm text-gray-500">No image</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="w-full h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Choose Image
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative" ref={barangayRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Barangay</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button
                            type="button"
                            onClick={() => setBarangayOpen(s => !s)}
                            className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                            aria-expanded={barangayOpen}
                            aria-haspopup="listbox"
                          >
                            {barangay || 'Select Barangay'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBarangayOpen(s => !s)}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open barangay list"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        {barangayOpen && (
                          <div
                            className="absolute z-50 mt-2 left-0 w-[30rem] max-w-[100vw] rounded-xl border border-gray-200 bg-white shadow-xl p-3"
                            role="listbox"
                          >
                            <div className="px-2 pb-2">
                              <input
                                value={barangayQuery}
                                onChange={(e) => setBarangayQuery(e.target.value)}
                                placeholder="Search…"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto px-2">
                              {filteredBarangays.length ? (
                                filteredBarangays.map((b, i) => {
                                  const isSelected = b === barangay;
                                  return (
                                    <button
                                      key={`${b}-${i}`}
                                      type="button"
                                      onClick={() => { setBarangay(b); setBarangayQuery(''); setBarangayOpen(false); }}
                                      className={['text-left px-3 py-2 rounded-lg text-sm', isSelected ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-gray-700 hover:bg-blue-50'].join(' ')}
                                      role="option"
                                      aria-selected={isSelected}
                                    >
                                      {b}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="col-span-3 text-center text-xs text-gray-400 py-3">No options</div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3 px-2">
                              <span className="text-xs text-gray-400">{filteredBarangays.length} result{filteredBarangays.length === 1 ? '' : 's'}</span>
                              <button
                                type="button"
                                onClick={() => { setBarangay(''); setBarangayQuery(''); setBarangayOpen(false); }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <span className="block text-sm font-medium text-gray-700">Street</span>
                        <input
                          value={street}
                          onChange={(e)=>setStreet(e.target.value)}
                          placeholder="Street"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                        />
                      </div>
                      <div className="grid gap-2">
                        <span className="block text-sm font-medium text-gray-700">Additional Address</span>
                        <input
                          value={additionalAddress}
                          onChange={(e)=>setAdditionalAddress(e.target.value)}
                          placeholder="Unit/Building/Notes"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="relative" ref={stRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Service Type</span>
                        <select value={serviceType} onChange={e=>setServiceType(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1}>
                          <option value=""></option>
                          {sortedServiceTypes.map((t)=> <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button type="button" onClick={()=>setStOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none">
                            {serviceType || 'Select Service Type'}
                          </button>
                          <button type="button" onClick={()=>setStOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service type options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                        {stOpen && (
                          <PopList
                            items={sortedServiceTypes}
                            value={serviceType}
                            onSelect={(v)=>{ setServiceType(v); setServiceTask(''); setStOpen(false); }}
                            fullWidth
                            title="Select Service Type"
                            clearable
                            onClear={()=>{ setServiceType(''); setServiceTask(''); setStOpen(false); }}
                          />
                        )}
                      </div>

                      <div className="relative" ref={taskRef}>
                        <span className="block text sm font-medium text-gray-700 mb-2">Service Task</span>
                        <select value={serviceTask} onChange={e=>setServiceTask(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1} disabled={!serviceType}>
                          <option value=""></option>
                          {serviceType && (serviceTasks[serviceType] || []).map((t)=> <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className={`flex items-center rounded-xl border ${!serviceType ? 'opacity-60 cursor-not-allowed border-gray-300' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                          <button type="button" onClick={()=>serviceType && setTaskOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none" disabled={!serviceType}>
                            {serviceTask || 'Select Service Task'}
                          </button>
                          <button type="button" onClick={()=>serviceType && setTaskOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service task options" disabled={!serviceType}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                        {taskOpen && (
                          <PopList
                            items={serviceTasks[serviceType] || []}
                            value={serviceTask}
                            onSelect={(v)=>{ setServiceTask(v); setTaskOpen(false); }}
                            emptyLabel="Select a service type first"
                            fullWidth
                            title="Select Service Task"
                            clearable
                            onClear={()=>{ setServiceTask(''); setTaskOpen(false); }}
                          />
                        )}
                      </div>

                      <div className="relative md:col-span-2" ref={pdRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <input
                            type="text"
                            value={preferredDate ? formatDateMDY(preferredDate) : ''}
                            onFocus={()=>{
                              if (preferredDate) setPdView(new Date(preferredDate));
                              else setPdView(new Date(todayStr));
                              setPdOpen(s=>!s); setPdMonthOpen(false); setPdYearOpen(false);
                            }}
                            readOnly
                            placeholder="mm/dd/yyyy"
                            className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                          />
                          <button type="button" onClick={()=>{
                            if (preferredDate) setPdView(new Date(preferredDate));
                            else setPdView(new Date(todayStr));
                            setPdOpen(s=>!s); setPdMonthOpen(false); setPdYearOpen(false);
                          }} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open calendar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 01-1-1z" /><path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                          </button>
                        </div>
                      </div>

                      <div className="relative md:col-span-2" ref={ptRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <input
                            type="text"
                            value={preferredTime ? formatTime12h(preferredTime) : ''}
                            onFocus={()=>setPtOpen(s=>!s)}
                            readOnly
                            placeholder="hh:mm AM/PM"
                            className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                          />
                          <button type="button" onClick={()=>setPtOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open time options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0V10c0 .199.079.39.22.53l2.75 2.75a.75.75 0 101.06-1.06l-2.53-2.53V5.5z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>

                      <div className="relative" ref={toolsRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Tools Provided?</span>
                        <select value={toolsProvided} onChange={(e)=>setToolsProvided(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1}>
                          <option value=""></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button type="button" onClick={()=>setToolsOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none">
                            {toolsProvided || 'Select Yes or No'}
                          </button>
                          <button type="button" onClick={()=>setToolsOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open tools provided options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" /></svg>
                          </button>
                        </div>
                        {toolsOpen && (
                          <PopList
                            items={['Yes','No']}
                            value={toolsProvided}
                            onSelect={(v)=>{ setToolsProvided(v); setToolsOpen(false); }}
                            fullWidth
                            title="Select Tools Provided"
                            clearable
                            onClear={()=>{ setToolsProvided(''); setToolsOpen(false); }}
                          />
                        )}
                      </div>

                      <div className="relative" ref={urgentRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Is The Request Urgent?</span>
                        <select value={isUrgent} onChange={(e)=>setIsUrgent(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1}>
                          <option value=""></option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button type="button" onClick={()=>setUrgentOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none">
                            {isUrgent || 'Select Yes or No'}
                          </button>
                          <button type="button" onClick={()=>setUrgentOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open urgent options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" /></svg>
                          </button>
                        </div>
                        {urgentOpen && (
                          <PopList
                            items={['Yes','No']}
                            value={isUrgent}
                            onSelect={(v)=>{ setIsUrgent(v); setUrgentOpen(false); }}
                            fullWidth
                            title="Select Urgency"
                            clearable
                            onClear={()=>{ setIsUrgent(''); setUrgentOpen(false); }}
                          />
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Service Description</span>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the service you need"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="relative" ref={rateTypeRef}>
                          <span className="block text-sm font-medium text-gray-700 mb-2">Rate Type</span>
                          <select value={rateType} onChange={(e)=>setRateType(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1}>
                            <option value=""></option>
                            <option value="fixed">Fixed</option>
                            <option value="range">Hourly / Range</option>
                            <option value="by_job">By the Job</option>
                          </select>
                          <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                            <button
                              type="button"
                              onClick={()=>setRateTypeOpen(s=>!s)}
                              className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                            >
                              {rateTypeDisplay || 'Select Rate Type'}
                            </button>
                            <button
                              type="button"
                              onClick={()=>setRateTypeOpen(s=>!s)}
                              className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                              aria-label="Open rate type options"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" /></svg>
                            </button>
                          </div>
                          {rateTypeOpen && (
                            <PopList
                              items={['Hourly Rate','By the Job Rate']}
                              value={rateTypeDisplay}
                              onSelect={(v)=>{ setRateType(v === 'Hourly Rate' ? 'range' : 'by_job'); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                              fullWidth
                              title="Select Rate Type"
                              clearable
                              onClear={()=>{ setRateType(''); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                            />
                          )}
                        </div>

                        {String(rateType || '').toLowerCase() === 'range' ? (
                          <div className="grid grid-cols-2 gap-3 md:col-span-1">
                            <div className="grid gap-2">
                              <span className="block text sm font-medium text-gray-700">From</span>
                              <input
                                value={rateFrom}
                                onChange={e=>setRateFrom(sanitizeDecimal(e.target.value))}
                                placeholder="₱"
                                inputMode="decimal"
                                pattern="[0-9]*[.]?[0-9]*"
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                              />
                            </div>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">To</span>
                              <input
                                value={rateTo}
                                onChange={e=>setRateTo(sanitizeDecimal(e.target.value))}
                                placeholder="₱"
                                inputMode="decimal"
                                pattern="[0-9]*[.]?[0-9]*"
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                              />
                              <div className="hidden text-xs text-red-600">{rateError}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-2 md:col-span-1">
                            <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                            <input
                              value={rateValue}
                              onChange={e=>setRateValue(sanitizeDecimal(e.target.value))}
                              placeholder="Enter amount"
                              inputMode="decimal"
                              pattern="[0-9]*[.]?[0-9]*"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={()=>setConfirmOpen(true)}
                disabled={saving || !isDirty || !!rateError || !isComplete}
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {false && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-visible">
                    <div className="flex items-center justify-between px-6 py-4">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                    </div>
                    <div className="border-t border-gray-100" />
                    <div className="px-6 py-6" />
                  </div>
                </div>
                <aside className="lg:col-span-1 flex flex-col" />
              </div>
            )}
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

        {cancelLoading && (
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
                <div className="text-base font-semibold text-gray-900 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>
        )}

        {confirmOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setConfirmOpen(false)} />
            <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900">Save changes?</h4>
              <p className="mt-1 text-sm text-gray-600">Are you sure saving these changes?</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={()=>setConfirmOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={()=>{ setConfirmOpen(false); if (canSave) onSave(); }}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition ${canSave?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSaving ? (
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 animate-spin rounded-full" style={{borderWidth:"8px",borderStyle:"solid",borderColor:"#008cfc22",borderTopColor:"#008cfc",borderRadius:"9999px"}} />
                <div className="absolute inset-4 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? (
                    <img src="/jdklogo.png" alt="Logo" className="w-14 h-14 object-contain" onError={()=>setLogoBroken(true)} />
                  ) : (
                    <div className="w-14 h-14 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center space-y-1">
                <div className="text-base font-semibold text-gray-900">Saving Changes</div>
                <div className="text-sm text-gray-500">Please wait a moment</div>
              </div>
            </div>
          </div>
        ) : null}

        {showSuccess ? (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowSuccess(false)} />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483648]">
              <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={()=>setLogoBroken(true)} />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
              <div className="mt-6 text-center space-y-2">
                <div className="text-lg font-semibold text-gray-900">Saved Successfully!</div>
                <div className="text-sm text-gray-600">Your changes have been saved.</div>
              </div>
              <div className="mt-6">
                <button type="button" onClick={onSuccessOk} className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition">OK</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ClientFooter />
    </>
  );
}
