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

  const [pairs, setPairs] = useState([{ serviceType: '', serviceTask: '' }]);

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsRef = useRef(null);
  const rateTypeRef = useRef(null);

  const [stOpen, setStOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [rateTypeOpen, setRateTypeOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      if (stRef.current && !stRef.current.contains(t)) setStOpen(false);
      if (taskRef.current && !taskRef.current.contains(t)) setTaskOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
      if (rateTypeRef.current && !rateTypeRef.current.contains(t)) setRateTypeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          const t = f && Array.isArray(f.tasks) && f.tasks.length ? f.tasks[0] : '';
          return { serviceType: ct, serviceTask: t };
        }) : [{ serviceType: '', serviceTask: '' }];
        setPairs(merged);
        const st = merged[0]?.serviceType || '';
        const tk = merged[0]?.serviceTask || '';
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
      const cleanPairs = pairs.filter(p => p.serviceType && p.serviceTask);
      const service_types = cleanPairs.length ? Array.from(new Set(cleanPairs.map(p => p.serviceType))) : (serviceType ? [serviceType] : []);
      const grouped = {};
      cleanPairs.forEach(p => {
        if (!grouped[p.serviceType]) grouped[p.serviceType] = [];
        if (p.serviceTask) grouped[p.serviceType].push(p.serviceTask);
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
      const n = prev.map((p, idx) => idx === i ? { serviceType: v, serviceTask: '' } : p);
      if (i === 0) { setServiceType(v); setServiceTask(''); }
      return n;
    });
  };
  const setPairTask = (i, v) => {
    setPairs(prev => {
      const n = prev.map((p, idx) => idx === i ? { ...p, serviceTask: v } : p);
      if (i === 0) setServiceTask(v);
      return n;
    });
  };
  const addPair = () => setPairs(prev => [...prev, { serviceType: '', serviceTask: '' }]);
  const removePair = (i) => setPairs(prev => {
    const n = prev.filter((_, idx) => idx !== i);
    if (!n.length) n.push({ serviceType: '', serviceTask: '' });
    const first = n[0] || { serviceType: '', serviceTask: '' };
    setServiceType(first.serviceType || '');
       setServiceTask(first.serviceTask || '');
    return n;
  });

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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
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
                      <div className="md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Barangay</span>
                        <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40" />
                      </div>
                      <div className="md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Street</span>
                        <input value={additionalAddress} onChange={e=>setAdditionalAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pairs.map((p, idx) => (
                        <div key={`pair-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div className="relative" ref={idx === 0 ? stRef : null}>
                            <span className="block text-sm font-medium text-gray-700 mb-2">Service Type {pairs.length > 1 ? `#${idx+1}` : ''}</span>
                            <div className="flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                              <button type="button" onClick={()=>setStOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none">
                                {p.serviceType || 'Select Service Type'}
                              </button>
                              <button type="button" onClick={()=>setStOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service type options">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                            {stOpen && idx === 0 && (
                              <PopList
                                items={sortedServiceTypes}
                                value={p.serviceType}
                                onSelect={(v)=>{ setPairType(idx, v); setStOpen(false); }}
                                fullWidth
                                title="Select Service Type"
                                clearable
                                onClear={()=>{ setPairType(idx, ''); setStOpen(false); }}
                              />
                            )}
                          </div>

                          <div className="relative" ref={idx === 0 ? taskRef : null}>
                            <span className="block text-sm font-medium text-gray-700 mb-2">Service Task {pairs.length > 1 ? `#${idx+1}` : ''}</span>
                            <div className={`flex items-center rounded-xl border ${!p.serviceType ? 'opacity-60 cursor-not-allowed border-gray-300' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                              <button type="button" onClick={()=>p.serviceType && setTaskOpen(s=>!s)} className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none" disabled={!p.serviceType}>
                                {p.serviceTask || 'Select Service Task'}
                              </button>
                              <button type="button" onClick={()=>p.serviceType && setTaskOpen(s=>!s)} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open service task options" disabled={!p.serviceType}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                            {taskOpen && idx === 0 && (
                              <PopList
                                items={serviceTasksMap[p.serviceType] || []}
                                value={p.serviceTask}
                                onSelect={(v)=>{ setPairTask(idx, v); setTaskOpen(false); }}
                                emptyLabel="Select a service type first"
                                fullWidth
                                title="Select Service Task"
                                clearable
                                onClear={()=>{ setPairTask(idx, ''); setTaskOpen(false); }}
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
                          className="text-sm text-[#008cfc] hover:text-blue-700 border border-blue-200 px-3 py-2 rounded-lg"
                        >
                          Add Another Service
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-base mt-2">
                      <div>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</span>
                        <input value={yearsExp} onChange={e=>setYearsExp(e.target.value)} placeholder="e.g. 3" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#008cfc]/40" />
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
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateFrom} onChange={e=>setRateFrom(e.target.value)} placeholder="0" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm">/hr</span>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate To</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateTo} onChange={e=>setRateTo(e.target.value)} placeholder="0" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm">/hr</span>
                              </div>
                            </div>
                          </>
                        ) : String(rateType || '').toLowerCase().includes('job') ? (
                          <>
                            <div className="md:col-span-2 grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateValue} onChange={e=>setRateValue(e.target.value)} placeholder="0" className="w-full outline-none" />
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
                disabled={saving}
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
                                <input value={rateFrom} onChange={e=>setRateFrom(e.target.value)} placeholder="0" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm">/hr</span>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Rate To</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateTo} onChange={e=>setRateTo(e.target.value)} placeholder="0" className="w-full outline-none" />
                                <span className="text-gray-500 ml-2 text-sm">/hr</span>
                              </div>
                            </div>
                          </>
                        ) : String(rateType || '').toLowerCase().includes('job') ? (
                          <>
                            <div className="md:col-span-2 grid gap-2">
                              <span className="block text-sm font-medium text-gray-700">Service Rate</span>
                              <div className="flex items-center rounded-xl border border-gray-300 h-[48px] px-3">
                                <span className="text-gray-500 mr-2">₱</span>
                                <input value={rateValue} onChange={e=>setRateValue(e.target.value)} placeholder="0" className="w-full outline-none" />
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
