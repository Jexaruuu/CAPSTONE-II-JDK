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
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileRef = useRef(null);

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
        setServiceType(d.service_type || '');
        setServiceTask(d.service_task || '');
        setPreferredDate(d.preferred_date || '');
        setPreferredTime(d.preferred_time || '');
        setIsUrgent(toYesNo(d.is_urgent));
        setToolsProvided(toYesNo(d.tools_provided));
        setDescription(d.service_description || '');
        setRateType(r.rate_type || '');
        setRateFrom(r.rate_from || '');
        setRateTo(r.rate_to || '');
        setRateValue(r.rate_value || '');
        setImageUrl(d.request_image_url || '');
      } catch (e) {
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    if (gid) load();
  }, [gid, headersWithU]);

  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const du = await readAsDataUrl(f);
    setImageDataUrl(du);
    if (du) setImageUrl('');
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
          rate_type: rateType,
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
    setTimeout(() => { navigate('/clientdashboard', { replace: true }); }, 2000);
  };

  const onSuccessOk = () => {
    setShowSuccess(false);
    setCancelLoading(true);
    setTimeout(() => { navigate('/clientdashboard', { replace: true }); }, 2000);
  };

  const preferred_time_display = formatTime12h(preferredTime);
  const preferred_date_display = formatDateMDY(preferredDate);

  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];
  const serviceTasks = {
    Carpentry: ['General Carpentry', 'Furniture Repair', 'Wood Polishing', 'Door & Window Fitting', 'Custom Furniture Design', 'Modular Kitchen Installation', 'Flooring & Decking', 'Cabinet & Wardrobe Fixing', 'Wall Paneling & False Ceiling', 'Wood Restoration & Refinishing'],
    'Electrical Works': ['Wiring Repair', 'Appliance Installation', 'Lighting Fixtures', 'Circuit Breaker & Fuse Repair', 'CCTV & Security System Setup', 'Fan & Exhaust Installation', 'Inverter & Battery Setup', 'Switchboard & Socket Repair', 'Electrical Safety Inspection', 'Smart Home Automation'],
    Plumbing: ['Leak Fixing', 'Pipe Installation', 'Bathroom Fittings', 'Drain Cleaning & Unclogging', 'Water Tank Installation', 'Gas Pipeline Installation', 'Septic Tank & Sewer Repair', 'Water Heater Installation', 'Toilet & Sink Repair', 'Kitchen Plumbing Solutions'],
    'Car Washing': ['Exterior Wash', 'Interior Cleaning', 'Wax & Polish', 'Underbody Cleaning', 'Engine Bay Cleaning', 'Headlight Restoration', 'Ceramic Coating', 'Tire & Rim Cleaning', 'Vacuum & Odor Removal', 'Paint Protection Film Application'],
    Laundry: ['Dry Cleaning', 'Ironing', 'Wash & Fold', 'Steam Pressing', 'Stain Removal Treatment', 'Curtains & Upholstery Cleaning', 'Delicate Fabric Care', 'Shoe & Leather Cleaning', 'Express Same-Day Laundry', 'Eco-Friendly Washing']
  };
  const sortedServiceTypes = [...serviceTypes].sort();

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsRef = useRef(null);
  const urgentRef = useRef(null);
  const pdRef = useRef(null);
  const ptRef = useRef(null);
  const rateTypeRef = useRef(null);

  const [stOpen, setStOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [pdOpen, setPdOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [rateTypeOpen, setRateTypeOpen] = useState(false);

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

  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };
  const toMDY = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${da}/${y}`;
  };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const [pdView, setPdView] = useState(new Date());
  const monthsList = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const yearsList = (() => {
    const ys = [];
    const start = fromYMDLocal(todayStr).getFullYear();
    for (let y = start; y <= start + 5; y++) ys.push(y);
    return ys;
  })();
  const inRangePD = (date) => date >= fromYMDLocal(todayStr);
  const canPrevPD = () => addMonths(startOfMonth(pdView), -1) >= startOfMonth(fromYMDLocal(todayStr));
  const canNextPD = () => true;
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
  const timeSlots = (() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  })();
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      if (stRef.current && !stRef.current.contains(t)) setStOpen(false);
      if (taskRef.current && !taskRef.current.contains(t)) setTaskOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
      if (urgentRef.current && !urgentRef.current.contains(t)) setUrgentOpen(false);
      if (pdRef.current && !pdRef.current.contains(t)) { setPdOpen(false); setPdMonthOpen(false); setPdYearOpen(false); }
      if (ptRef.current && !ptRef.current.contains(t)) setPtOpen(false);
      if (rateTypeRef.current && !rateTypeRef.current.contains(t)) setRateTypeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!cancelLoading) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [cancelLoading]);

  const PopList = ({ items, value, onSelect, disabledLabel, emptyLabel='No options', fullWidth=false, title='Select', clearable=false, onClear, clearText='Clear' }) => (
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
                disabled={saving}
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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
                <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
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
                    <span className="block text-sm font-medium text-gray-700 mb-2">Service Task</span>
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

                  <div className="relative" ref={pdRef}>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</span>
                    <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                      <input
                        type="text"
                        value={preferredDate ? toMDY(fromYMDLocal(preferredDate)) : ''}
                        onFocus={openPD}
                        readOnly
                        placeholder="mm/dd/yyyy"
                        className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                      />
                      <button type="button" onClick={openPD} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open calendar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" /><path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                      </button>
                    </div>
                    {pdOpen && (
                      <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-2xl border border-gray-200 bg-white shadow-xl p-3">
                        <div className="flex items-center justify-between px-2 pb-2">
                          <button
                            type="button"
                            onClick={() => canPrevPD() && setPdView(addMonths(pdView, -1))}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${canPrevPD() ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                            aria-label="Previous month"
                          >‹</button>
                          <div className="relative flex items-center gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => { setPdMonthOpen(v=>!v); setPdYearOpen(false); }}
                                className="min-w-[120px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                              >
                                {monthsList[pdView.getMonth()]}
                                <span className="ml-2">▾</span>
                              </button>
                              {pdMonthOpen ? (
                                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                  {monthsList.map((m,i)=>(
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={()=>{ setPDMonthYear(i,pdView.getFullYear()); setPdMonthOpen(false); }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${i===pdView.getMonth()?"bg-blue-100":""}`}
                                    >{m}</button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => { setPdYearOpen(v=>!v); setPdMonthOpen(false); }}
                                className="min-w-[90px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                              >
                                {pdView.getFullYear()}
                                <span className="ml-2">▾</span>
                              </button>
                              {pdYearOpen ? (
                                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                  {yearsList.map((y)=>(
                                    <button
                                      key={y}
                                      type="button"
                                      onClick={()=>{ setPDMonthYear(pdView.getMonth(),y); setPdYearOpen(false); }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${y===pdView.getFullYear()?"bg-blue-100":""}`}
                                    >{y}</button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => canNextPD() && setPdView(addMonths(pdView, 1))}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            aria-label="Next month"
                          >›</button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">
                          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
                        </div>

                        {(() => {
                          const first = startOfMonth(pdView);
                          const last = endOfMonth(pdView);
                          const offset = first.getDay();
                          const total = offset + last.getDate();
                          const rows = Math.ceil(total / 7);
                          const selected = preferredDate ? fromYMDLocal(preferredDate) : null;
                          const cells = [];
                          for (let r = 0; r < rows; r++) {
                            const row = [];
                            for (let c = 0; c < 7; c++) {
                              const idx = r * 7 + c;
                              const dayNum = idx - offset + 1;
                              if (dayNum < 1 || dayNum > last.getDate()) {
                                row.push(<div key={`x-${r}-${c}`} className="py-2" />);
                              } else {
                                const d = new Date(pdView.getFullYear(), pdView.getMonth(), dayNum);
                                const disabled = !inRangePD(d);
                                const isSelected = selected && isSameDay(selected, d);
                                row.push(
                                  <button
                                    key={`d-${dayNum}`}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => { setPreferredDate(toYMD(d)); setPdOpen(false); setPdMonthOpen(false); setPdYearOpen(false); }}
                                    className={[
                                      'py-2 rounded-lg transition text-sm w-9 h-9 mx-auto',
                                      disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700',
                                      isSelected && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                                    ].join(' ')}
                                  >
                                    {dayNum}
                                  </button>
                                );
                              }
                            }
                            cells.push(<div key={`r-${r}`} className="grid grid-cols-7 gap-1 px-2">{row}</div>);
                          }
                          return <div className="mt-1">{cells}</div>;
                        })()}

                        <div className="flex items-center justify-between mt-3 px-2">
                          <button type="button" onClick={() => { setPreferredDate(''); setPdOpen(false); setPdMonthOpen(false); setPdYearOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                          <button type="button" onClick={() => { setPdView(fromYMDLocal(todayStr)); }} className="text-xs text-blue-600 hover:text-blue-700">Jump to today</button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Earliest: <span className="font-medium">{toMDY(fromYMDLocal(todayStr))}</span></p>
                  </div>

                  <div className="relative" ref={ptRef}>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</span>
                    <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                      <input
                        type="text"
                        value={preferredTime ? to12h(preferredTime) : ''}
                        onFocus={openPT}
                        readOnly
                        placeholder="hh:mm AM/PM"
                        className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                      />
                      <button type="button" onClick={openPT} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open time options">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0V10c0 .199.079.39.22.53l2.75 2.75a.75.75 0 101.06-1.06l-2.53-2.53V5.5z" clipRule="evenodd" /></svg>
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
                                className={`py-2 rounded-lg text-sm ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700'} ${preferredTime === t && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''}`}
                              >
                                {to12h(t)}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-3 px-2">
                          <span className="text-xs text-gray-400">{timeSlots.length} results</span>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => { setPreferredTime(''); setPtOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                            <button
                              type="button"
                              onClick={() => {
                                const n = new Date();
                                const mins = n.getMinutes();
                                let up = mins % 30 === 0 ? mins : mins + (30 - (mins % 30));
                                let h = n.getHours();
                                if (up === 60) { h = h + 1; up = 0; }
                                const cand = `${String(h).padStart(2,'0')}:${String(up).padStart(2,'0')}`;
                                if (preferredDate === todayStr) {
                                  const next = timeSlots.find(tt => tt >= cand);
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
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

                  <div className="md:col-span-2">
                    <div className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
                      <span className="font-medium text-gray-600">Request Image:</span>
                      <div className="w-full space-y-3">
                        <div className="w-full h-64 rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50 grid place-items-center">
                          {imageDataUrl ? (
                            <img src={imageDataUrl} alt="" className="w-full h-full object-cover object-center" />
                          ) : imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover object-center" />
                          ) : (
                            <span className="text-sm text-gray-500">No image</span>
                          )}
                        </div>
                        <div>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Choose Image
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-visible">
                  <div className="flex items-center justify-between px-6 py-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="px-6 py-6">
                    <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
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
                            {rateType === 'range' ? 'Hourly Rate' : rateType === 'by_job' || rateType === 'fixed' ? 'By the Job Rate' : 'Select Rate Type'}
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
                            value={rateType === 'range' ? 'Hourly Rate' : rateType === 'by_job' || rateType === 'fixed' ? 'By the Job Rate' : ''}
                            onSelect={(v)=>{ setRateType(v === 'Hourly Rate' ? 'range' : 'by_job'); setRateTypeOpen(false); }}
                            fullWidth
                            title="Select Rate Type"
                            clearable
                            onClear={()=>{ setRateType(''); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                          />
                        )}
                      </div>

                      {String(rateType || '').toLowerCase() === 'range' ? (
                        <div className="grid grid-cols-1 gap-3">
                          <span className="block text-sm font-medium text-gray-700">Rate (From – To)</span>
                          <div className="grid grid-cols-2 gap-3">
                            <input value={rateFrom} onChange={e=>setRateFrom(e.target.value)} placeholder="From" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40" />
                            <input value={rateTo} onChange={e=>setRateTo(e.target.value)} placeholder="To" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                          <input value={rateValue} onChange={e=>setRateValue(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40" />
                        </div>
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
                  <div className="px-6 py-5 space-y-4 flex-1">
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Service:</span>
                      <span className="text-base font-semibold text-gray-900 truncate max-w-[60%] text-right sm:text-left">{serviceType || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Task:</span>
                      <span className="text-base font-semibold text-gray-900 truncate max-w-[60%] text-right sm:text-left">{serviceTask || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Schedule:</span>
                      <span className="text-base font-semibold text-gray-900">{preferred_date_display || '-'} • {preferred_time_display || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Urgent:</span>
                      <span className="text-base font-semibold text-gray-900">{isUrgent || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Tools:</span>
                      <span className="text-base font-semibold text-gray-900">{toolsProvided || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px,1fr] items-start gap-x-2">
                      <span className="text-sm font-medium text-gray-600">Rate:</span>
                      {String(rateType || '').toLowerCase() === 'range' ? (
                        <div className="text-lg font-bold text-gray-900">
                          ₱{rateFrom || 0}–₱{rateTo || 0} <span className="text-sm font-medium text-gray-900 opacity-80">per hour</span>
                        </div>
                      ) : String(rateType || '').toLowerCase() === 'by_job' || String(rateType || '').toLowerCase() === 'fixed' ? (
                        <div className="text-lg font-bold text-gray-900">
                          ₱{rateValue || 0} <span className="text-sm font-medium text-gray-900 opacity-80">per job</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">No rate provided</div>
                      )}
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
                  onClick={()=>{ setConfirmOpen(false); onSave(); }}
                  className="rounded-xl px-5 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-blue-700"
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
