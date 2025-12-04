import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerFooter from '../../workercomponents/WorkerFooter';

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
    const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
    const e = a.email || localStorage.getItem('worker_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
    return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
  } catch {
    return '';
  }
}

function normLocation(info) {
  const i = info || {};
  const fromObj = typeof i.address === 'object' && i.address ? i.address : {};
  const barangay =
    i.barangay ??
    i.baragay ??
    i.brgy ??
    i.brgy_name ??
    fromObj.barangay ??
    fromObj.brgy ??
    '';
  const street =
    i.street ??
    i.address_line2 ??
    i.additional_address ??
    fromObj.street ??
    fromObj.line2 ??
    '';
  return { barangay: String(barangay || ''), street: String(street || '') };
}

export default function WorkerEditApplication() {
  const { id } = useParams();
  const gid = decodeURIComponent(id || '');
  const navigate = useNavigate();

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');

  const [serviceType, setServiceType] = useState('');
  const [serviceTask, setServiceTask] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [description, setDescription] = useState('');
  const [rateType, setRateType] = useState('');
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [profileDataUrl, setProfileDataUrl] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const [orig, setOrig] = useState(null);

  const fileRef = useRef(null);

  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];
  const serviceTasksMap = {
    Carpentry: ['General Carpentry','Furniture Repair','Wood Polishing','Door & Window Fitting','Custom Furniture Design','Modular Kitchen Installation','Flooring & Decking','Cabinet & Wardrobe Fixing','Wall Paneling & False Ceiling','Wood Restoration & Refinishing'],
    'Electrical Works': ['Wiring Repair','Appliance Installation','Lighting Fixtures','Circuit Breaker & Fuse Repair','CCTV & Security System Setup','Fan & Exhaust Installation','Inverter & Battery Setup','Switchboard & Socket Repair','Electrical Safety Inspection','Smart Home Automation'],
    Plumbing: ['Leak Fixing','Pipe Installation','Bathroom Fittings','Drain Cleaning & Unclogging','Water Tank Installation','Gas Pipeline Installation','Septic Tank & Sewer Repair','Water Heater Installation','Toilet & Sink Repair','Kitchen Plumbing Solutions'],
    'Car Washing': ['Exterior Wash','Interior Cleaning','Wax & Polish','Underbody Cleaning','Engine Bay Cleaning','Headlight Restoration','Ceramic Coating','Tire & Rim Cleaning','Vacuum & Odor Removal','Paint Protection Film Application'],
    Laundry: ['Dry Cleaning','Ironing','Wash & Fold','Steam Pressing','Stain Removal Treatment','Curtains & Upholstery Cleaning','Delicate Fabric Care','Shoe & Leather Cleaning','Express Same-Day Laundry','Eco-Friendly Washing']
  };
  const sortedServiceTypes = [...serviceTypes].sort();

  const [pairs, setPairs] = useState([{ serviceType: '', serviceTasks: [] }]);

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsRef = useRef(null);
  const rateTypeRef = useRef(null);
  const brgyRef = useRef(null);

  const [toolsOpen, setToolsOpen] = useState(false);
  const [rateTypeOpen, setRateTypeOpen] = useState(false);
  const [brgyOpen, setBrgyOpen] = useState(false);
  const [taskOpenIndex, setTaskOpenIndex] = useState(null);
  const [stOpenIndex, setStOpenIndex] = useState(null);

  const barangays = [
    'Alangilan','Alijis','Banago','Bata','Cabug','Estefania','Felisa',
    'Granada','Handumanan','Lopez Jaena','Mandalagan','Mansilingan',
    'Montevista','Pahanocoy','Punta Taytay','Singcang-Airport','Sum-ag',
    'Taculing','Tangub','Villa Esperanza'
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);
  const [barangayQuery, setBarangayQuery] = useState('');
  const filteredBarangays = useMemo(() => {
    const q = barangayQuery.trim().toLowerCase();
    if (!q) return sortedBarangays;
    return sortedBarangays.filter(b => b.toLowerCase().includes(q));
  }, [sortedBarangays, barangayQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      if (typeof stOpenIndex === 'number') {
        const c = document.querySelector(`[data-st-container="${stOpenIndex}"]`);
        if (c && !c.contains(t)) setStOpenIndex(null);
      }
      if (typeof taskOpenIndex === 'number') {
        const c2 = document.querySelector(`[data-task-container="${taskOpenIndex}"]`);
        if (c2 && !c2.contains(t)) setTaskOpenIndex(null);
      }
      if (stRef.current && stOpenIndex === 0 && !stRef.current.contains(t)) setStOpenIndex(null);
      if (taskRef.current && taskOpenIndex === 0 && !taskRef.current.contains(t)) setTaskOpenIndex(null);
      if (toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
      if (rateTypeRef.current && !rateTypeRef.current.contains(t)) setRateTypeOpen(false);
      if (brgyRef.current && !brgyRef.current.contains(t)) setBrgyOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stOpenIndex, taskOpenIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${API_BASE}/api/workerapplications/by-group/${encodeURIComponent(gid)}`, {
          withCredentials: true,
          headers: headersWithU
        });
        const info = data?.info || {};
        const details = data?.details || {};
        const rate = data?.rate || {};
        const types = Array.isArray(details.service_types) ? details.service_types : [];
        const tasks = Array.isArray(details.service_task) ? details.service_task : [];
        const merged = types.length ? types.map(ct => {
          const f = tasks.find(x => String(x?.category || '') === ct);
          const arr = f && Array.isArray(f.tasks) ? f.tasks.filter(Boolean) : [];
          return { serviceType: ct, serviceTasks: arr };
        }) : [{ serviceType: '', serviceTasks: [] }];
        setPairs(merged);
        const st = merged[0]?.serviceType || '';
        const tk = (merged[0]?.serviceTasks || [])[0] || '';
        setServiceType(st || '');
        setServiceTask(tk || '');
        setYearsExp(details.years_experience ?? '');
        setToolsProvided(toYesNo(details.tools_provided));
        setDescription(details.work_description || '');
        setRateType(rate.rate_type || '');
        setRateFrom(rate.rate_from ?? '');
        setRateTo(rate.rate_to ?? '');
        setRateValue(rate.rate_value ?? '');
        setProfileUrl(info.profile_picture_url || '');
        setFirstName(info.first_name || '');
        setLastName(info.last_name || '');
        setContactNumber(info.contact_number || '');
        setEmail(info.email_address || info.email || '');
        const loc = normLocation(info);
        setAddress(loc.barangay || '');
        setAdditionalAddress(loc.street || '');
        setOrig({
          pairs: merged,
          yearsExp: String(details.years_experience ?? ''),
          toolsProvided: toYesNo(details.tools_provided),
          description: details.work_description || '',
          rateType: rate.rate_type || '',
          rateFrom: String(rate.rate_from ?? ''),
          rateTo: String(rate.rate_to ?? ''),
          rateValue: String(rate.rate_value ?? ''),
          address: loc.barangay || '',
          additionalAddress: loc.street || '',
          profileUrl: info.profile_picture_url || ''
        });
      } catch (e) {
        setError('Failed to load application');
      } finally {
        setLoading(false);
      }
    };
    if (gid) load();
  }, [gid, headersWithU]);

  const onPickProfile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileFile(f);
    const du = await readAsDataUrl(f);
    setProfileDataUrl(du);
    if (du) setProfileUrl('');
  };

  const cleanNumber = (v, allowDecimal = true) => {
    let s = String(v ?? '').replace(/[^\d.]/g, '');
    if (!allowDecimal) s = s.replace(/\./g, '');
    if (allowDecimal) {
      const first = s.indexOf('.');
      if (first !== -1) s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, '');
    }
    if (s.startsWith('.')) s = '0' + s;
    return s;
  };

  const toNumOrNull = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const hourlyValid = useMemo(() => {
    if (!String(rateType || '').toLowerCase().includes('hour')) return true;
    const f = toNumOrNull(rateFrom);
    const t = toNumOrNull(rateTo);
    if (f === null || t === null) return false;
    return t > f;
  }, [rateType, rateFrom, rateTo]);

  const jobValid = useMemo(() => {
    if (!String(rateType || '').toLowerCase().includes('job')) return true;
    const v = toNumOrNull(rateValue);
    return v !== null && v > 0;
  }, [rateType, rateValue]);

  const yearsValid = useMemo(() => {
    const y = toNumOrNull(yearsExp);
    return y !== null && y > 0;
  }, [yearsExp]);

  const pairsAllValid = useMemo(() => {
    if (!pairs.length) return false;
    for (const p of pairs) {
      if (!p.serviceType) return false;
      if (!Array.isArray(p.serviceTasks) || p.serviceTasks.length === 0) return false;
    }
    return true;
  }, [pairs]);

  const pairValid = useMemo(() => {
    const p0 = pairs[0] || {};
    return !!(p0.serviceType && Array.isArray(p0.serviceTasks) && p0.serviceTasks.length);
  }, [pairs]);

  const requiredFilled = useMemo(() => {
    if (!address.trim()) return false;
    if (!additionalAddress.trim()) return false;
    if (!pairValid) return false;
    if (!yearsValid) return false;
    if (!toolsProvided) return false;
    if (!description.trim()) return false;
    if (!rateType) return false;
    if (String(rateType).toLowerCase().includes('hour')) {
      if (!cleanNumber(rateFrom)) return false;
      if (!cleanNumber(rateTo)) return false;
      if (!hourlyValid) return false;
    } else if (String(rateType).toLowerCase().includes('job')) {
      if (!cleanNumber(rateValue)) return false;
      if (!jobValid) return false;
    } else {
      return false;
    }
    return true;
  }, [address, additionalAddress, pairValid, yearsValid, toolsProvided, description, rateType, rateFrom, rateTo, rateValue, hourlyValid, jobValid]);

  const isDirty = useMemo(() => {
    if (!orig) return false;
    const pairsChanged = JSON.stringify(pairs) !== JSON.stringify(orig.pairs);
    const yrsChanged = String(yearsExp) !== String(orig.yearsExp);
    const toolsChanged = toYesNo(toolsProvided) !== toYesNo(orig.toolsProvided);
    const descChanged = String(description) !== String(orig.description);
    const rtChanged = String(rateType) !== String(orig.rateType);
    const rfChanged = String(rateFrom) !== String(orig.rateFrom);
    const rtoChanged = String(rateTo) !== String(orig.rateTo);
    const rvChanged = String(rateValue) !== String(orig.rateValue);
    const addrChanged = String(address) !== String(orig.address);
    const addAddrChanged = String(additionalAddress) !== String(orig.additionalAddress);
    const picChanged = !!profileDataUrl || String(profileUrl) !== String(orig.profileUrl);
    return pairsChanged || yrsChanged || toolsChanged || descChanged || rtChanged || rfChanged || rtoChanged || rvChanged || addrChanged || addAddrChanged || picChanged;
  }, [orig, pairs, yearsExp, toolsProvided, description, rateType, rateFrom, rateTo, rateValue, address, additionalAddress, profileDataUrl, profileUrl]);

  const onSave = async () => {
    if (saving) return;
    if (!requiredFilled) return;
    setSaving(true);
    setShowSaving(true);
    setOk('');
    setError('');
    try {
      const cleanPairs = pairs.filter(p => p.serviceType && Array.isArray(p.serviceTasks) && p.serviceTasks.length);
      const service_types = Array.from(new Set(cleanPairs.map(p => p.serviceType)));
      const grouped = {};
      cleanPairs.forEach(p => {
        if (!grouped[p.serviceType]) grouped[p.serviceType] = [];
        grouped[p.serviceType].push(...p.serviceTasks);
      });
      const service_task = Object.keys(grouped).map(k => ({ category: k, tasks: Array.from(new Set(grouped[k])) }));
      const details = {
        service_types,
        service_task,
        years_experience: toNumOrNull(yearsExp),
        tools_provided: fromYesNo(toolsProvided),
        work_description: description
      };
      const ratePayload = {
        rate_type: rateType,
        rate_from: String(rateType || '').toLowerCase().includes('hour') ? toNumOrNull(rateFrom) : null,
        rate_to: String(rateType || '').toLowerCase().includes('hour') ? toNumOrNull(rateTo) : null,
        rate_value: String(rateType || '').toLowerCase().includes('job') ? toNumOrNull(rateValue) : null
      };
      const infoPayload = {
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        email_address: email,
        address,
        additional_address: additionalAddress,
        street: additionalAddress,
        barangay: address,
        current_address: address
      };
      const body = { info: infoPayload, details, rate: ratePayload };
      if (profileDataUrl) body.profile_picture_data_url = profileDataUrl;
      await axios.put(`${API_BASE}/api/workerapplications/by-group/${encodeURIComponent(gid)}`, body, {
        withCredentials: true,
        headers: headersWithU
      });
      setOk('Changes saved');
      setShowSuccess(true);
      try { window.dispatchEvent(new Event('worker-application-submitted')); } catch {}
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
      setShowSaving(false);
    }
  };

  const onCancel = () => {
    navigate('/workerdashboard', { replace: true });
  };

  const setPairType = (i, v) => {
    setPairs(prev => {
      const n = prev.map((p, idx) => idx === i ? { serviceType: v, serviceTasks: [] } : p);
      if (i === 0) { setServiceType(v); setServiceTask(''); }
      return n;
    });
  };

  const toggleTask = (i, task) => {
    setPairs(prev => prev.map((p, idx) => {
      if (idx !== i) return p;
      const has = p.serviceTasks.includes(task);
      const next = has ? p.serviceTasks.filter(t => t !== task) : [...p.serviceTasks, task];
      return { ...p, serviceTasks: next };
    }));
  };

  const clearTasks = (i) => {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, serviceTasks: [] } : p));
  };

  const addPair = () => setPairs(prev => prev.length >= 5 ? prev : [...prev, { serviceType: '', serviceTasks: [] }]);

  const removePair = (i) => setPairs(prev => {
    const n = prev.filter((_, idx) => idx !== i);
    if (!n.length) n.push({ serviceType: '', serviceTasks: [] });
    const first = n[0] || { serviceType: '', serviceTasks: [] };
    setServiceType(first.serviceType || '');
    setServiceTask((first.serviceTasks || [])[0] || '');
    return n;
  });

  const selectedTypes = useMemo(() => pairs.map(p => p.serviceType).filter(Boolean), [pairs]);
  const availableTypes = (idx) => {
    const current = pairs[idx]?.serviceType || '';
    return sortedServiceTypes.filter(t => t === current || !selectedTypes.includes(t));
  };

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

  const MultiPopList = ({ items, selected, onToggle, onClear, onDone, title='Select' }) => (
    <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-3">
      <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
      <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
        {items && items.length ? items.map(it => {
          const isSel = selected.includes(it);
          return (
            <label key={it} className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-blue-50 cursor-pointer">
              <input type="checkbox" checked={isSel} onChange={()=>onToggle(it)} />
              <span>{it}</span>
            </label>
          );
        }) : <div className="text-xs text-gray-400 px-2 py-3">No options</div>}
      </div>
      <div className="flex items-center justify-between mt-3 px-2">
        <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
        <button type="button" onClick={onDone} className="text-xs px-3 py-1 rounded-md bg-[#008cfc] text-white">Done</button>
      </div>
    </div>
  );

  return (
    <>
      <WorkerNavigation />
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
          <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
                <img src="/jdklogo.png" alt="" className="h-6 w-6 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
              </div>
              <div className="text-2xl md:text-3xl font-semibold text-gray-900">Edit Work Application</div>
            </div>
            <div className="flex items-center gap-2" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1420px] px-6">
          <div className="space-y-6 mt-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-visible">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Application Details</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                {ok && <div className="mb-4 text-sm text-emerald-700">{ok}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6 items-start">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="text-base font-semibold text-gray-900 mb-3">Worker Profile Picture</div>
                    <div className="w-full aspect-square rounded-xl overflow-hidden ring-2 ring-blue-100 bg-gray-50 grid place-items-center">
                      {profileDataUrl ? (
                        <img src={profileDataUrl} alt="" className="w-full h-full object-cover object-center" />
                      ) : profileUrl ? (
                        <img src={profileUrl} alt="" className="w-full h-full object-cover object-center" />
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent('Worker')}`} alt="" className="w-24 h-24 object-contain opacity-80" />
                      )}
                    </div>
                    <div className="mt-3">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickProfile} />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Choose Image
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="md:col-span-2 relative" ref={brgyRef}>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Barangay</span>
                        <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <button
                            type="button"
                            onClick={() => { setBarangayQuery(''); setBrgyOpen(s=>!s); }}
                            className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                            aria-expanded={brgyOpen}
                            aria-haspopup="listbox"
                          >
                            {address || 'Select Barangay'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBarangayQuery(''); setBrgyOpen(s=>!s); }}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open barangay options"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                        {brgyOpen && (
                          <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-2" role="listbox">
                            <div className="px-2 pb-2">
                              <input
                                value={barangayQuery}
                                onChange={(e) => setBarangayQuery(e.target.value)}
                                placeholder="Search…"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto px-1">
                              {filteredBarangays.length ? (
                                filteredBarangays.map((b, idx) => (
                                  <button
                                    key={`${b}-${idx}`}
                                    type="button"
                                    onClick={() => { setAddress(b); setBrgyOpen(false); }}
                                    className="text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-gray-700"
                                    role="option"
                                    aria-selected={b === address}
                                  >
                                    {b}
                                  </button>
                                ))
                              ) : (
                                <div className="col-span-3 text-center text-xs text-gray-400 py-3">No options</div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2 px-2">
                              <span className="text-xs text-gray-400">{filteredBarangays.length} result{filteredBarangays.length === 1 ? '' : 's'}</span>
                              <button
                                type="button"
                                onClick={() => { setAddress(''); setBarangayQuery(''); setBrgyOpen(false); }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Street</span>
                        <input value={additionalAddress} onChange={e=>setAdditionalAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pairs.map((p, idx) => (
                        <div key={`pair-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div className="relative" ref={idx === 0 ? stRef : null} data-st-container={idx}>
                            <span className="block text-sm font-medium text-gray-700 mb-2">Service Type {pairs.length > 1 ? `#${idx+1}` : ''}</span>
                            <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                              <button
                                type="button"
                                onClick={()=>setStOpenIndex(stOpenIndex===idx?null:idx)}
                                className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                              >
                                {p.serviceType || 'Select Service Type'}
                              </button>
                              <button
                                type="button"
                                onClick={()=>setStOpenIndex(stOpenIndex===idx?null:idx)}
                                className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                                aria-label="Open service type options"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                            {stOpenIndex === idx && (
                              <PopList
                                items={availableTypes(idx)}
                                value={p.serviceType}
                                onSelect={(v)=>{ setPairType(idx, v); setStOpenIndex(null); }}
                                fullWidth
                                title="Select Service Type"
                                clearable
                                onClear={()=>{ setPairType(idx, ''); setStOpenIndex(null); }}
                              />
                            )}
                          </div>

                          <div className="relative" ref={idx === 0 ? taskRef : null} data-task-container={idx}>
                            <span className="block text-sm font-medium text-gray-700 mb-2">Service Task {pairs.length > 1 ? `#${idx+1}` : ''}</span>
                            <div className={`flex items-center rounded-xl border ${!p.serviceType ? 'opacity-60 cursor-not-allowed border-gray-300' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                              <button type="button" onClick={()=>p.serviceType && setTaskOpenIndex(taskOpenIndex===idx?null:idx)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none" disabled={!p.serviceType}>
                                {p.serviceTasks && p.serviceTasks.length ? `${p.serviceTasks.length} selected` : 'Select Service Tasks'}
                              </button>
                              <button type="button" onClick={()=>p.serviceType && setTaskOpenIndex(taskOpenIndex===idx?null:idx)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service task options" disabled={!p.serviceType}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                            {taskOpenIndex === idx && (
                              <MultiPopList
                                items={serviceTasksMap[p.serviceType] || []}
                                selected={p.serviceTasks || []}
                                onToggle={(task)=>toggleTask(idx, task)}
                                onClear={()=>clearTasks(idx)}
                                onDone={()=>setTaskOpenIndex(null)}
                                title="Select Service Tasks"
                              />
                            )}
                          </div>

                          {pairs.length > 1 && (
                            <div className="md:col-span-2">
                              <button
                                type="button"
                                onClick={()=>removePair(idx)}
                                className="text-sm text-red-600 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg"
                              >
                                Remove This Service
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <div>
                        <button
                          type="button"
                          onClick={addPair}
                          disabled={pairs.length >= 5}
                          className="text-sm text-[#008cfc] hover:text-blue-700 border border-blue-200 px-3 py-2 rounded-lg disabled:opacity-50"
                        >
                          Add Another Service
                        </button>
                        <div className="mt-1 text-xs text-gray-500">{pairs.length}/5</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-base mt-2">
                      <div>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</span>
                        <input
                          value={yearsExp}
                          onChange={e=>setYearsExp(cleanNumber(e.target.value, false))}
                          placeholder="e.g. 3"
                          inputMode="numeric"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40"
                        />
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

                      <div className="md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Work Description</span>
                        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40" />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="relative" ref={rateTypeRef}>
                          <span className="block text-sm font-medium text-gray-700 mb-2">Rate Type</span>
                          <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40 h-[48px]">
                            <button
                              type="button"
                              onClick={()=>setRateTypeOpen(s=>!s)}
                              className="w-full px-4 text-left rounded-l-xl focus:outline-none"
                            >
                              {rateType || 'Select Rate Type'}
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
                              value={rateType}
                              onSelect={(v)=>{ setRateType(v); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                              fullWidth
                              title="Select Rate Type"
                              clearable
                              onClear={()=>{ setRateType(''); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                            />
                          )}
                        </div>

                        {String(rateType || '').toLowerCase().includes('hour') ? (
                          <>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate From</span>
                              <div className={`flex items-center rounded-xl border ${hourlyValid || !cleanNumber(rateTo) ? 'border-gray-300' : 'border-red-300'} h-[48px] px-3`}>
                                <span className="text-gray-500 mr-2">₱</span>
                                <input
                                  value={rateFrom}
                                  onChange={e=>setRateFrom(cleanNumber(e.target.value, true))}
                                  placeholder="0"
                                  inputMode="decimal"
                                  className="w-full outline-none"
                                />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate To</span>
                              <div className={`flex items-center rounded-xl border ${hourlyValid || !cleanNumber(rateFrom) ? 'border-gray-300' : 'border-red-300'} h-[48px] px-3`}>
                                <span className="text-gray-500 mr-2">₱</span>
                                <input
                                  value={rateTo}
                                  onChange={e=>setRateTo(cleanNumber(e.target.value, true))}
                                  placeholder="0"
                                  inputMode="decimal"
                                  className="w-full outline-none"
                                />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                          </>
                        ) : String(rateType || '').toLowerCase().includes('job') ? (
                          <>
                            <div className="md:col-span-2 grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                              <div className={`flex items-center rounded-xl border ${jobValid || !cleanNumber(rateValue) ? 'border-gray-300' : 'border-red-300'} h-[48px] px-3`}>
                                <span className="text-gray-500 mr-2">₱</span>
                                <input
                                  value={rateValue}
                                  onChange={e=>setRateValue(cleanNumber(e.target.value, true))}
                                  placeholder="0"
                                  inputMode="decimal"
                                  className="w-full outline-none"
                                />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                            <div />
                          </>
                        ) : (
                          <div className="md:col-span-2 h-[48px] grid place-items-center text-sm text-gray-500 rounded-xl border border-dashed border-gray-300">Select a rate type to continue</div>
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
                className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={()=>setConfirmOpen(true)}
                disabled={saving || !requiredFilled || !pairsAllValid || !isDirty}
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {false && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-visible">
                    <div className="flex items-center justify-between px-6 py-4">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                    </div>
                    <div className="border-t border-gray-100" />
                    <div className="px-6 py-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="relative" ref={rateTypeRef}>
                          <span className="block text-sm font-medium text-gray-700 mb-2">Rate Type</span>
                          <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40 h-[48px]">
                            <button
                              type="button"
                              onClick={()=>setRateTypeOpen(s=>!s)}
                              className="w-full px-4 text-left rounded-l-xl focus:outline-none"
                            >
                              {rateType || 'Select Rate Type'}
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
                              value={rateType}
                              onSelect={(v)=>{ setRateType(v); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                              fullWidth
                              title="Select Rate Type"
                              clearable
                              onClear={()=>{ setRateType(''); setRateFrom(''); setRateTo(''); setRateValue(''); setRateTypeOpen(false); }}
                            />
                          )}
                        </div>

                        {String(rateType || '').toLowerCase().includes('hour') ? (
                          <>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate From</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateFrom} onChange={e=>setRateFrom(cleanNumber(e.target.value, true))} placeholder="0" inputMode="decimal" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate To</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateTo} onChange={e=>setRateTo(cleanNumber(e.target.value, true))} placeholder="0" inputMode="decimal" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                          </>
                        ) : String(rateType || '').toLowerCase().includes('job') ? (
                          <>
                            <div className="md:col-span-2 grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateValue} onChange={e=>setRateValue(cleanNumber(e.target.value, true))} placeholder="0" inputMode="decimal" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm"></span>
                              </div>
                            </div>
                            <div />
                          </>
                        ) : (
                          <div className="md:col-span-2 h-[48px] grid place-items-center text-sm text-gray-500 rounded-xl border border-dashed border-gray-300">Select a rate type to continue</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <aside className="lg:col-span-1 flex flex-col" />
              </div>
            )}

            {false && (
              <div className="flex items-center justify-end gap-2">
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
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setConfirmOpen(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={()=>setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center"><span className="font-bold text-[#008cfc]">JDK</span></div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Save your changes?</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setConfirmOpen(false)} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition">Cancel</button>
              <button type="button" onClick={()=>{ setConfirmOpen(false); onSave(); }} className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showSaving && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" className="relative w-[340px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
            <div className="relative mx-auto w-40 h-40">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderRightColor: '#008cfc', borderRadius: '9999px' }} />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc1f]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? <img src="/jdklogo.png" alt="Logo" className="w-20 h-20 object-contain" onError={()=>setLogoBroken(true)} /> : <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center"><span className="font-bold text-[#008cfc]">JDK</span></div>}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-lg font-semibold text-gray-900">Saving Changes</div>
              <div className="text-sm text-gray-500">Please wait</div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowSuccess(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={()=>setLogoBroken(true)} /> : <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center"><span className="font-bold text-[#008cfc]">JDK</span></div>}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Changes Saved</div>
            </div>
            <div className="mt-6">
              <button type="button" onClick={()=>{ setShowSuccess(false); navigate('/workerdashboard', { replace: true }); }} className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition">Done</button>
            </div>
          </div>
        </div>
      )}

      <WorkerFooter />
    </>
  );
}
