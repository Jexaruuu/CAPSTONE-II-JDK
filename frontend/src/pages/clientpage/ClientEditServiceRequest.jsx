import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const NIGHT_TIME_FEE = 200;

const INCLUDED_WORKERS = 2;
const EXTRA_WORKER_FEE = 150;
const MAX_WORKERS = 6;

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
  const cleaned = String(t).trim();
  const core = cleaned.includes('T') ? cleaned.split('T')[0] : cleaned;
  const token = core.split(' ')[0];
  const parts = token.split(':');
  if (parts.length < 2) return cleaned;
  const hh = parts[0];
  const mm = parts[1];
  let h = parseInt(hh, 10);
  if (Number.isNaN(h)) return cleaned;
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(mm).padStart(2, '0')} ${suffix}`;
};

const formatDateMDY = (d) => {
  if (!d) return d || '-';
  const raw = String(d).trim();
  const token = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  const tryDate = new Date(token);
  if (!Number.isNaN(tryDate.getTime())) {
    const mm = String(tryDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tryDate.getDate()).padStart(2, '0');
    const yyyy = String(tryDate.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }
  const parts = token.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}/${yyyy}`;
  }
  return raw;
};

const normalizeRateType = (v, r = {}) => {
  const s = String(v || '').trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
  if (['hourly', 'range', 'hourly range', 'hourly rate'].includes(s)) return 'range';
  if (['by job', 'by the job', 'fixed', 'fixed rate', 'job', 'byjob'].includes(s)) return 'by_job';
  if (r && (r.rate_from != null || r.rate_to != null)) return 'range';
  if (r && (r.rate_value != null && r.rate_value !== '')) return 'by_job';
  return '';
};

const clampInt = (v, min, max) => {
  const n = parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const formatRate = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return v.trim().startsWith('₱') ? v : `₱${v}`;
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
};

const withPerUnitLabel = (rateStr) => {
  if (!rateStr) return '';
  return `per unit ${rateStr}`;
};

const shouldShowPerUnit = (type) =>
  type === 'Car Washing' || type === 'Plumbing' || type === 'Carpentry' || type === 'Electrical Works';

const serviceTaskRates = {
  Carpentry: {
    'General Carpentry': 1000,
    'Furniture Repair': 900,
    'Wood Polishing': 1200,
    'Door & Window Fitting': 1500,
    'Custom Furniture Design': 2000,
    'Modular Kitchen Installation': 6000,
    'Flooring & Decking': 3500,
    'Cabinet & Wardrobe Fixing': 1200,
    'Wall Paneling & False Ceiling': 4000,
    'Wood Restoration & Refinishing': 2500
  },
  'Electrical Works': {
    'Wiring Repair': 1000,
    'Appliance Installation': 800,
    'Lighting Fixtures': 700,
    'Circuit Breaker & Fuse Repair': 1200,
    'CCTV & Security System Setup': 2500,
    'Fan & Exhaust Installation': 700,
    'Inverter & Battery Setup': 1800,
    'Switchboard & Socket Repair': 800,
    'Electrical Safety Inspection': 1500,
    'Smart Home Automation': 3000
  },
  Plumbing: {
    'Leak Fixing': 900,
    'Pipe Installation': 1500,
    'Bathroom Fittings': 1200,
    'Drain Cleaning & Unclogging': 1800,
    'Water Tank Installation': 2500,
    'Gas Pipeline Installation': 3500,
    'Septic Tank & Sewer Repair': 4500,
    'Water Heater Installation': 2000,
    'Toilet & Sink Repair': 1000,
    'Kitchen Plumbing Solutions': 1800
  },
  'Car Washing': {
    'Exterior Wash': 350,
    'Interior Cleaning': 700,
    'Wax & Polish': 1200,
    'Underbody Cleaning': 500,
    'Engine Bay Cleaning': 900,
    'Headlight Restoration': 1500,
    'Ceramic Coating': 12000,
    'Tire & Rim Cleaning': 400,
    'Vacuum & Odor Removal': 700,
    'Paint Protection Film Application': 15000
  },
  Laundry: {
    'Dry Cleaning': '₱130/kg',
    Ironing: '₱100/kg',
    'Wash & Fold': '₱50/kg',
    'Steam Pressing': '₱130/kg',
    'Stain Removal Treatment': '₱180/kg',
    'Curtains & Upholstery Cleaning': '₱400–₱800',
    'Delicate Fabric Care': '₱90/kg',
    'Shoe & Leather Cleaning': '₱250/pair',
    'Express Same-Day Laundry': '₱70/kg',
    'Eco-Friendly Washing': '₱60/kg'
  }
};

const getSelectedTaskRate = (serviceType, serviceTask) => {
  if (!serviceType || !serviceTask) return '';
  const v = serviceTaskRates?.[serviceType]?.[serviceTask];
  const r = formatRate(v);
  return shouldShowPerUnit(serviceType) ? withPerUnitLabel(r) : r;
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
  clearText = 'Clear',
  renderItem,
  rightLabel
}) => (
  <div className={`absolute z-50 mt-2 ${fullWidth ? 'left-0 right-0 w-full' : 'w-80'} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}>
    <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
    <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
      {items && items.length ? items.map((it) => {
        const isSel = value === it;
        const disabled = disabledLabel && disabledLabel(it);
        const right = typeof rightLabel === 'function' ? (rightLabel(it) || '') : '';
        return (
          <button
            key={String(it)}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(it)}
            className={[
              'text-left py-2 px-3 rounded-lg text-sm',
              right ? 'flex items-center justify-between gap-3' : '',
              disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50',
              isSel && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
            ].join(' ')}
          >
            <span className="truncate">{renderItem ? renderItem(it) : String(it)}</span>
            {right ? (
              <span className={`shrink-0 text-xs font-semibold ${isSel && !disabled ? 'text-white/90' : 'text-[#008cfc]'}`}>
                {right}
              </span>
            ) : null}
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
  const [workersNeed, setWorkersNeed] = useState('');
  const [isUrgent, setIsUrgent] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [units, setUnits] = useState('');
  const [unitKg, setUnitKg] = useState('');
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

  const [preferredTimeFeePhp, setPreferredTimeFeePhp] = useState('');
  const [extraWorkersFeePhp, setExtraWorkersFeePhp] = useState('');
  const [totalRatePhp, setTotalRatePhp] = useState('');

  const [orig, setOrig] = useState(null);

  const fileRef = useRef(null);
  const clientFileRef = useRef(null);

  const sanitizeDecimal = (s) => {
    const x = String(s ?? '').replace(/[^\d.]/g, '');
    const parts = x.split('.');
    if (parts.length <= 1) return x;
    return parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
  };

  const sanitizeInteger = (s) => String(s ?? '').replace(/[^\d]/g, '');

  const normalizeYMD = (v) => {
    if (!v) return '';
    const raw = String(v).trim();
    const token = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
    const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
    const m2 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token);
    if (m2) {
      const mm = String(m2[1]).padStart(2, '0');
      const dd = String(m2[2]).padStart(2, '0');
      return `${m2[3]}-${mm}-${dd}`;
    }
    const d = new Date(token);
    if (Number.isNaN(d.getTime())) return token;
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const normalizeHM = (v) => {
    if (!v) return '';
    const s = String(v).trim();
    const m = /^(\d{1,2}):(\d{2})/.exec(s);
    if (m) return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
    const d = new Date(`1970-01-01T${s}`);
    if (!Number.isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const m2 = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/.exec(s);
    if (!m2) return s;
    let h = parseInt(m2[1], 10);
    const min = m2[2] ? parseInt(m2[2], 10) : 0;
    const ap = m2[3].toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(Math.min(Math.max(min, 0), 59)).padStart(2, '0')}`;
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
        const pd = normalizeYMD(d.preferred_date || '');
        const pt = normalizeHM(d.preferred_time || '');
        const wnRaw = String((d.workers_needed ?? d.workers_need ?? d.workersNeed) ?? '').trim();
        const wnSafe = wnRaw ? String(clampInt(wnRaw, 1, MAX_WORKERS)) : '';
        const u = String(r.units ?? '').trim();
        const uk = String(r.unit_kg ?? r.unitKg ?? '').trim();

        setServiceType(d.service_type || '');
        setServiceTask(d.service_task || '');
        setPreferredDate(pd);
        setPreferredTime(pt);
        setWorkersNeed(wnSafe);
        setIsUrgent(toYesNo(d.is_urgent));
        setToolsProvided(toYesNo(d.tools_provided));
        setUnits(u);
        setUnitKg(uk);
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
        setPreferredTimeFeePhp(r.preferred_time_fee_php || '');
        setExtraWorkersFeePhp(r.extra_workers_fee_php || '');
        setTotalRatePhp(r.total_rate_php || '');
        setOrig({
          serviceType: d.service_type || '',
          serviceTask: d.service_task || '',
          preferredDate: pd,
          preferredTime: pt,
          workersNeed: wnSafe,
          isUrgent: toYesNo(d.is_urgent),
          toolsProvided: toYesNo(d.tools_provided),
          units: String(r.units ?? ''),
          unitKg: String(r.unit_kg ?? r.unitKg ?? ''),
          description: d.service_description || '',
          rateType: normRT,
          rateFrom: String(r.rate_from ?? ''),
          rateTo: String(r.rate_to ?? ''),
          rateValue: String(r.rate_value ?? ''),
          barangay: info.barangay || '',
          street: info.street || '',
          additionalAddress: info.additional_address || info.additionalAddress || '',
          imageUrl: d.request_image_url || '',
          clientImageUrl: info.profile_picture_url || '',
          preferredTimeFeePhp: r.preferred_time_fee_php || '',
          extraWorkersFeePhp: r.extra_workers_fee_php || '',
          totalRatePhp: r.total_rate_php || ''
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
      a(workersNeed) !== a(orig.workersNeed) ||
      a(isUrgent) !== a(orig.isUrgent) ||
      a(toolsProvided) !== a(orig.toolsProvided) ||
      a(units) !== a(orig.units) ||
      a(unitKg) !== a(orig.unitKg) ||
      a(description) !== a(orig.description) ||
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
    workersNeed,
    isUrgent,
    toolsProvided,
    units,
    unitKg,
    description,
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

  const toIntOrNull = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    const n = parseInt(s.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setShowSaving(true);
    setOk('');
    setError('');
    try {
      const rt = rateType || normalizeRateType(rateType, { rate_from: rateFrom, rate_to: rateTo, rate_value: rateValue });
      const isLaundryNow = String(serviceType || '').toLowerCase() === 'laundry';
      const wn = clampInt(workersNeed || 1, 1, MAX_WORKERS);
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
          workers_need: wn,
          is_urgent: fromYesNo(isUrgent),
          tools_provided: fromYesNo(toolsProvided),
          service_description: description
        },
        rate: {
          rate_type: rt,
          rate_from: String(rt || '').toLowerCase() === 'range' ? toNumOrNull(rateFrom) : null,
          rate_to: String(rt || '').toLowerCase() === 'range' ? toNumOrNull(rateTo) : null,
          rate_value: String(rt || '').toLowerCase() === 'range' ? null : toNumOrNull(rateValue),
          units: isLaundryNow ? null : toIntOrNull(units),
          unit_kg: isLaundryNow ? toNumOrNull(unitKg || units) : null
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
  const workersNeedRef = useRef(null);
  const barangayRef = useRef(null);

  const [stOpen, setStOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [pdOpen, setPdOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [workersNeedOpen, setWorkersNeedOpen] = useState(false);
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
  const addMonths = (d, delta = 1) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

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
    setPdOpen(true);
    setPdMonthOpen(false);
    setPdYearOpen(false);
  };
  const setPDMonthYear = (m, y) => {
    const next = new Date(y, m, 1);
    const minStart = startOfMonth(fromYMDLocal(todayStr));
    setPdView(next < minStart ? minStart : next);
  };

  const openPT = () => setPtOpen(true);
  const to12h = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const getNowHHMM = () => {
    const n = new Date();
    const hh = String(n.getHours()).padStart(2, '0');
    const mm = String(n.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    if (preferredDate === todayStr && preferredTime && preferredTime < getNowHHMM()) {
      setPreferredTime('');
    }
  }, [preferredDate, todayStr]);

  const isGreenTime = (t) => {
    const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
    if (hh >= 20) return true;
    if (hh >= 0 && hh <= 5) return true;
    if (hh === 6 && (mm === 0 || mm === 30)) return true;
    return false;
  };

  const isRedTime = (t) => {
    const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
    if (hh >= 20 && hh <= 23) return true;
    if (hh === 0 && (mm === 0 || mm === 30)) return true;
    return false;
  };

  const isNightTimeForFee = (t) => {
    if (!t) return false;
    const [hh, mm] = String(t).split(':').map((x) => parseInt(x, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    if (hh >= 20) return true;
    if (hh >= 0 && hh <= 5) return true;
    if (hh === 6 && (mm === 0 || mm === 30)) return true;
    return false;
  };

  const preferredTimeFeeLabelLocal = preferredTime && isNightTimeForFee(preferredTime) ? `+ fee ${formatRate(NIGHT_TIME_FEE)}` : '';

  const pdGrid = useMemo(() => {
    const view = pdView instanceof Date && !Number.isNaN(pdView.getTime()) ? pdView : new Date();
    const y = view.getFullYear();
    const m = view.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startIdx = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];
    for (let i = 0; i < startIdx; i++) cells.push({ kind: 'pad', key: `p-${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ kind: 'day', day: d, key: `d-${y}-${m}-${d}` });
    while (cells.length % 7 !== 0) cells.push({ kind: 'pad', key: `e-${cells.length}` });
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { y, m, weeks };
  }, [pdView]);

  const minDate = useMemo(() => {
    const d = fromYMDLocal(todayStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [todayStr]);

  const ymdFromParts = (y, m0, day) => {
    const mm = String(m0 + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (pdOpen && pdRef.current && !pdRef.current.contains(t)) {
        setPdOpen(false);
        setPdMonthOpen(false);
        setPdYearOpen(false);
      }
      if (ptOpen && ptRef.current && !ptRef.current.contains(t)) {
        setPtOpen(false);
      }
      if (workersNeedOpen && workersNeedRef.current && !workersNeedRef.current.contains(t)) {
        setWorkersNeedOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pdOpen, ptOpen, workersNeedOpen]);

  const isLaundry = useMemo(() => String(serviceType || '').toLowerCase() === 'laundry', [serviceType]);

  const workersNeedSafe = useMemo(() => clampInt(workersNeed || 1, 1, MAX_WORKERS), [workersNeed]);
  const extraWorkerCount = useMemo(() => Math.max(0, workersNeedSafe - INCLUDED_WORKERS), [workersNeedSafe]);
  const extraWorkersFeeTotalLocal = useMemo(() => extraWorkerCount * EXTRA_WORKER_FEE, [extraWorkerCount]);
  const workersFeeLabelLocal = useMemo(() => extraWorkerCount > 0 ? `+ fee ${formatRate(extraWorkersFeeTotalLocal)}` : '', [extraWorkerCount, extraWorkersFeeTotalLocal]);

  const preferredTimeFeeDisplay = useMemo(() => {
    if (preferredTimeFeePhp && String(preferredTimeFeePhp).trim()) return String(preferredTimeFeePhp);
    return preferredTimeFeeLabelLocal ? preferredTimeFeeLabelLocal.replace('+ fee ', '') : '';
  }, [preferredTimeFeePhp, preferredTimeFeeLabelLocal]);

  const extraWorkersFeeDisplay = useMemo(() => {
    if (extraWorkersFeePhp && String(extraWorkersFeePhp).trim()) return String(extraWorkersFeePhp);
    return extraWorkersFeeTotalLocal > 0 ? formatRate(extraWorkersFeeTotalLocal) : '';
  }, [extraWorkersFeePhp, extraWorkersFeeTotalLocal]);

  const isComplete = useMemo(() => {
    const req = [serviceType, serviceTask, preferredDate, preferredTime, workersNeed, isUrgent, toolsProvided, description, barangay, street];
    const allFilled = req.every(v => String(v ?? '').trim() !== '');
    if (!allFilled) return false;

    if (isLaundry) {
      const kg = String(unitKg || units || '').trim();
      if (!kg) return false;
      const n = Number(kg);
      if (!Number.isFinite(n)) return false;
      return true;
    } else {
      if (String(units ?? '').trim() === '') return false;
      const n = parseInt(String(units).replace(/[^\d]/g, ''), 10);
      if (!Number.isFinite(n)) return false;
      if (n <= 0) return false;
      return true;
    }
  }, [serviceType, serviceTask, preferredDate, preferredTime, workersNeed, isUrgent, toolsProvided, description, barangay, street, units, unitKg, isLaundry]);

  const canSave = isDirty && isComplete && !saving;

  useEffect(()=>{ document.body.style.overflow=confirmOpen?"hidden":""; return()=>{ document.body.style.overflow=""; }; },[confirmOpen]);
  useEffect(()=>{ const lock=showSuccess||showSaving; const html=document.documentElement; const body=document.body; const prevHtml=html.style.overflow; const prevBody=body.style.overflow; if(lock){ html.style.overflow="hidden"; body.style.overflow="hidden"; } else { html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; } return()=>{ html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; }; },[showSuccess,showSaving]);

  useEffect(() => { const handler = (e) => { if (showSaving) e.preventDefault(); }; if (showSaving) { window.addEventListener('wheel', handler, { passive: false }); window.addEventListener('touchmove', handler, { passive: false }); } return () => { window.removeEventListener('wheel', handler); window.removeEventListener('touchmove', handler); }; }, [showSaving]);

  useEffect(()=>{ const lock=loading; const html=document.documentElement; const body=document.body; const prevHtml=html.style.overflow; const prevBody=body.style.overflow; if(lock){ html.style.overflow="hidden"; body.style.overflow="hidden"; } else { html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; } return()=>{ html.style.overflow=prevHtml||""; body.style.overflow=prevBody||""; }; },[loading]);

  useEffect(() => { const handler = (e) => { if (loading) e.preventDefault(); }; if (loading) { window.addEventListener('wheel', handler, { passive: false }); window.addEventListener('touchmove', handler, { passive: false }); } return () => { window.removeEventListener('wheel', handler); window.removeEventListener('touchmove', handler); }; }, [loading]);

  const workersNeedOptions = useMemo(() => Array.from({ length: MAX_WORKERS }, (_, i) => String(i + 1)), []);

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
                  disabled={saving || !isDirty || !isComplete}
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
                          className="w-full h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
                        >
                          Change Profile Picture
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
                          className="w-full h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
                        >
                          Change Request Image
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
                            onSelect={(v)=>{ setServiceType(v); setServiceTask(''); setStOpen(false); setUnits(''); setUnitKg(''); }}
                            fullWidth
                            title="Select Service Type"
                            clearable
                            onClear={()=>{ setServiceType(''); setServiceTask(''); setStOpen(false); setUnits(''); setUnitKg(''); }}
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
                            {serviceTask ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate">{serviceTask}</span>
                                <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{getSelectedTaskRate(serviceType, serviceTask)}</span>
                              </div>
                            ) : (
                              <span>Select Service Task</span>
                            )}
                          </button>
                          <button type="button" onClick={()=>serviceType && setTaskOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service task options" disabled={!serviceType}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" /></svg>
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
                            rightLabel={(it) => {
                              const rr = formatRate(serviceTaskRates?.[serviceType]?.[it]);
                              return shouldShowPerUnit(serviceType) ? withPerUnitLabel(rr) : rr;
                            }}
                          />
                        )}
                      </div>

                      <div className="relative md:col-span-2" ref={pdRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <input
                            type="text"
                            value={preferredDate ? toMDY(fromYMDLocal(preferredDate)) : ''}
                            onFocus={() => {
                              openPD();
                            }}
                            readOnly
                            placeholder="mm/dd/yyyy"
                            className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (pdOpen) {
                                setPdOpen(false);
                                setPdMonthOpen(false);
                                setPdYearOpen(false);
                              } else {
                                openPD();
                              }
                            }}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open calendar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 01-1-1z" />
                              <path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Earliest: <span className="font-medium">{toMDY(fromYMDLocal(todayStr))}</span>
                        </p>

                        {pdOpen && (
                          <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-2xl border border-gray-200 bg-white shadow-xl p-3">
                            <div className="flex items-center justify-between px-2 pb-2">
                              <button
                                type="button"
                                onClick={() => canPrevPD() && setPdView(addMonths(pdView, -1))}
                                className={`p-2 rounded-lg hover:bg-gray-100 ${canPrevPD() ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                                aria-label="Previous month"
                                disabled={!canPrevPD()}
                              >
                                ‹
                              </button>

                              <div className="relative flex items-center gap-2">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => { setPdMonthOpen((v) => !v); setPdYearOpen(false); }}
                                    className="min-w-[120px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                  >
                                    {monthsList[pdGrid.m]}
                                    <span className="ml-2">▾</span>
                                  </button>
                                  {pdMonthOpen ? (
                                    <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                      {monthsList.map((mName, idx) => {
                                        const isDisabled = new Date(pdGrid.y, idx, 1) < startOfMonth(fromYMDLocal(todayStr));
                                        return (
                                          <button
                                            key={mName}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => {
                                              if (!isDisabled) setPDMonthYear(idx, pdGrid.y);
                                              setPdMonthOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${idx === pdGrid.m ? 'bg-blue-100' : ''} ${isDisabled ? 'text-gray-300 cursor-not-allowed hover:bg-white' : 'text-gray-700'}`}
                                          >
                                            {mName}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => { setPdYearOpen((v) => !v); setPdMonthOpen(false); }}
                                    className="min-w-[90px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                  >
                                    {pdGrid.y}
                                    <span className="ml-2">▾</span>
                                  </button>
                                  {pdYearOpen ? (
                                    <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                      {yearsList.map((yy) => (
                                        <button
                                          key={yy}
                                          type="button"
                                          onClick={() => {
                                            setPDMonthYear(pdGrid.m, yy);
                                            setPdYearOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${yy === pdGrid.y ? 'bg-blue-100' : ''}`}
                                        >
                                          {yy}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setPdView(addMonths(pdView, 1))}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                                aria-label="Next month"
                              >
                                ›
                              </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <div key={d} className="py-1">{d}</div>
                              ))}
                            </div>

                            <div className="mt-1">
                              {pdGrid.weeks.map((wk, wi) => (
                                <div key={`wk-${wi}`} className="grid grid-cols-7 gap-1 px-2">
                                  {wk.map((cell) => {
                                    if (cell.kind === 'pad') return <div key={cell.key} className="py-2" />;
                                    const ymd = ymdFromParts(pdGrid.y, pdGrid.m, cell.day);
                                    const d = fromYMDLocal(ymd);
                                    d.setHours(0, 0, 0, 0);
                                    const disabled = d < minDate;
                                    const selected = preferredDate === ymd;
                                    return (
                                      <button
                                        key={cell.key}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                          if (disabled) return;
                                          setPreferredDate(ymd);
                                          setPdOpen(false);
                                          setPdMonthOpen(false);
                                          setPdYearOpen(false);
                                          if (ymd === todayStr && preferredTime && preferredTime < getNowHHMM()) setPreferredTime('');
                                        }}
                                        className={[
                                          'py-2 rounded-lg transition text-sm w-9 h-9 mx-auto',
                                          disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700',
                                          selected && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                                        ].join(' ')}
                                      >
                                        {cell.day}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between mt-3 px-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreferredDate('');
                                  setPdOpen(false);
                                  setPdMonthOpen(false);
                                  setPdYearOpen(false);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPdView(fromYMDLocal(todayStr));
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Jump to today
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative md:col-span-2" ref={ptRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button
                            type="button"
                            onClick={() => { if (ptOpen) setPtOpen(false); else openPT(); }}
                            onFocus={() => setPtOpen(true)}
                            className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                          >
                            {preferredTime ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate">{to12h(preferredTime)}</span>
                                {(preferredTimeFeeLabelLocal || preferredTimeFeePhp) ? (
                                  <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{preferredTimeFeePhp ? `+ fee ${preferredTimeFeePhp}` : preferredTimeFeeLabelLocal}</span>
                                ) : null}
                              </div>
                            ) : (
                              <span>hh:mm AM/PM</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (ptOpen) setPtOpen(false); else openPT(); }}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open time options"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0V10c0 .199.079.39.22.53l2.75 2.75a.75.75 0 101.06-1.06l-2.53-2.53V5.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>

                        {ptOpen && (
                          <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-2xl border border-gray-200 bg-white shadow-xl p-3">
                            <div className="text-sm font-semibold text-gray-800 px-2 pb-2">Select Time</div>
                            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto px-2">
                              {timeSlots.map((t) => {
                                const nowHHMM = getNowHHMM();
                                const isToday = preferredDate === todayStr;
                                const disabled = isToday && t < nowHHMM;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      if (disabled) return;
                                      setPreferredTime(t);
                                      setPtOpen(false);
                                    }}
                                    className={`py-2 rounded-lg text-sm ${
                                      disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 '
                                    }${
                                      disabled
                                        ? ''
                                        : isGreenTime(t)
                                          ? 'text-green-600'
                                          : isRedTime(t)
                                            ? 'text-red-600'
                                            : 'text-gray-700'
                                    } ${preferredTime === t && !disabled ? ' bg-blue-600 text-white hover:bg-blue-600' : ''}`}
                                  >
                                    {to12h(t)}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between mt-3 px-2">
                              <span className="text-xs text-gray-400">{timeSlots.length} results</span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreferredTime('');
                                    setPtOpen(false);
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const n = new Date();
                                    const mins = n.getMinutes();
                                    let up = mins % 30 === 0 ? mins : mins + (30 - (mins % 30));
                                    let h = n.getHours();
                                    if (up === 60) {
                                      h = h + 1;
                                      up = 0;
                                    }
                                    const cand = `${String(h).padStart(2, '0')}:${String(up).padStart(2, '0')}`;
                                    if (preferredDate === todayStr) {
                                      const next = timeSlots.find((tt) => tt >= cand);
                                      if (next) setPreferredTime(next);
                                      else setPreferredTime('');
                                    } else {
                                      setPreferredTime(cand);
                                    }
                                    setPtOpen(false);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  Now (rounded)
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative md:col-span-2" ref={workersNeedRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Workers Need</span>
                        <select value={String(workersNeedSafe)} onChange={(e)=>setWorkersNeed(String(clampInt(e.target.value, 1, MAX_WORKERS)))} className="hidden" aria-hidden="true" tabIndex={-1}>
                          <option value=""></option>
                          {workersNeedOptions.map((n)=> <option key={n} value={n}>{n}</option>)}
                        </select>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button
                            type="button"
                            onClick={()=>setWorkersNeedOpen(s=>!s)}
                            className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate">
                                {workersNeedSafe} worker{workersNeedSafe === 1 ? '' : 's'}
                              </span>
                              {(workersFeeLabelLocal || extraWorkersFeePhp) ? (
                                <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{extraWorkersFeePhp ? `+ fee ${extraWorkersFeePhp}` : workersFeeLabelLocal}</span>
                              ) : null}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={()=>setWorkersNeedOpen(s=>!s)}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open workers need options"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          Up to <span className="font-medium">{INCLUDED_WORKERS}</span> workers included. Extra worker fee is{' '}
                          <span className="font-medium">{formatRate(EXTRA_WORKER_FEE)}</span> per added worker.
                        </p>

                        <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-700">Selected workers</span>
                            <span className="text-xs font-semibold text-[#008cfc]">
                              {workersNeedSafe} {workersNeedSafe === 1 ? 'worker' : 'workers'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 mt-1">
                            <span className="text-xs text-gray-700">Extra workers fee</span>
                            <span className={`text-xs font-semibold ${extraWorkersFeeDisplay ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                              {extraWorkersFeeDisplay ? `+ ${extraWorkersFeeDisplay}` : '—'}
                            </span>
                          </div>
                        </div>

                        {workersNeedOpen && (
                          <PopList
                            items={workersNeedOptions}
                            value={String(workersNeedSafe)}
                            onSelect={(v)=>{ setWorkersNeed(String(clampInt(v, 1, MAX_WORKERS))); setWorkersNeedOpen(false); }}
                            fullWidth
                            title="Select Workers Need"
                            clearable
                            onClear={()=>{ setWorkersNeed('1'); setWorkersNeedOpen(false); }}
                            renderItem={(v)=> `${v} worker${String(v) === '1' ? '' : 's'}`}
                            rightLabel={(it) => {
                              const n = clampInt(it, 1, MAX_WORKERS);
                              const extra = Math.max(0, n - INCLUDED_WORKERS);
                              const fee = extra * EXTRA_WORKER_FEE;
                              return extra > 0 ? `+ fee ${formatRate(fee)}` : '';
                            }}
                          />
                        )}
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
                        <span className="block text-sm font-medium text-gray-700 mb-2">{isLaundry ? 'Unit/kg' : 'Units'}</span>
                        <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <input
                            value={isLaundry ? (unitKg || '') : (units || '')}
                            onChange={(e)=>{
                              const v = isLaundry ? sanitizeDecimal(e.target.value) : sanitizeInteger(e.target.value);
                              if (isLaundry) { setUnitKg(v); setUnits(v); }
                              else { setUnits(v); setUnitKg(''); }
                            }}
                            placeholder={isLaundry ? '0' : '0'}
                            inputMode={isLaundry ? 'decimal' : 'numeric'}
                            pattern={isLaundry ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
                            className="w-full outline-none"
                          />
                          <span className="text-gray-500 ml-2 text-sm">{isLaundry ? 'unit/kg' : ''}</span>
                        </div>
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

                    <div className="mt-4 hidden" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Fees Summary</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">Workers Need</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">{workersNeedSafe}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">{isLaundry ? 'Unit/kg' : 'Units'}</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">{isLaundry ? (unitKg || '—') : (units || '—')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">Preferred Time Fee</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">{preferredTimeFeeDisplay || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">Extra Workers Fee</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">{extraWorkersFeeDisplay || '—'}</div>
                  </div>
                </div>
                {totalRatePhp ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Total Rate</div>
                    <div className="text-base font-semibold text-[#008cfc]">{totalRatePhp}</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={()=>setConfirmOpen(true)}
                disabled={saving || !isDirty || !isComplete}
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
