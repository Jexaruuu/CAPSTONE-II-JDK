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
    const e =
      a.email ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
  } catch {
    return '';
  }
}

function normLocation(info) {
  const i = info || {};
  const fromObj =
    typeof i.address === 'object' && i.address
      ? i.address
      : typeof i.current_address === 'object' && i.current_address
      ? i.current_address
      : {};
  const barangay =
    i.barangay ??
    i.brgy ??
    i.brgy_name ??
    i.address_barangay ??
    fromObj.barangay ??
    fromObj.brgy ??
    '';
  const street =
    i.street ??
    i.address_line2 ??
    i.additional_address ??
    i.address_street ??
    fromObj.street ??
    fromObj.line2 ??
    '';
  return { barangay: String(barangay || ''), street: String(street || '') };
}

export default function WorkerEditApplication() {
  const { id } = useParams();
  const gidRaw = id || '';
  const gid = decodeURIComponent(gidRaw);
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

  const serviceTypes = ['Carpenter', 'Electrician', 'Plumber', 'Carwasher', 'Laundry'];
  const serviceTasksMap = {
    Carpenter: [
      'General Carpentry',
      'Furniture Repair',
      'Wood Polishing',
      'Door & Window Fitting',
      'Custom Furniture Design',
      'Modular Kitchen Installation',
      'Flooring & Decking',
      'Cabinet & Wardrobe Fixing',
      'Wall Paneling & False Ceiling',
      'Wood Restoration & Refinishing'
    ],
    Electrician: [
      'Wiring Repair',
      'Appliance Installation',
      'Lighting Fixtures',
      'Circuit Breaker & Fuse Repair',
      'CCTV & Security System Setup',
      'Fan & Exhaust Installation',
      'Inverter & Battery Setup',
      'Switchboard & Socket Repair',
      'Electrical Safety Inspection',
      'Smart Home Automation'
    ],
    Plumber: [
      'Leak Fixing',
      'Pipe Installation',
      'Bathroom Fittings',
      'Drain Cleaning & Unclogging',
      'Water Tank Installation',
      'Gas Pipeline Installation',
      'Septic Tank & Sewer Repair',
      'Water Heater Installation',
      'Toilet & Sink Repair',
      'Kitchen Plumbing Solutions'
    ],
    Carwasher: [
      'Exterior Wash',
      'Interior Cleaning',
      'Wax & Polish',
      'Underbody Cleaning',
      'Engine Bay Cleaning',
      'Headlight Restoration',
      'Ceramic Coating',
      'Tire & Rim Cleaning',
      'Vacuum & Odor Removal',
      'Paint Protection Film Application'
    ],
    Laundry: [
      'Dry Cleaning',
      'Ironing',
      'Wash & Fold',
      'Steam Pressing',
      'Stain Removal Treatment',
      'Curtains & Upholstery Cleaning',
      'Delicate Fabric Care',
      'Shoe & Leather Cleaning',
      'Express Same-Day Laundry',
      'Eco-Friendly Washing'
    ]
  };
  const sortedServiceTypes = [...serviceTypes].sort();

  const SERVICE_TYPE_CANON = {
    electrical: 'Electrician',
    'electrical work': 'Electrician',
    'electrical works': 'Electrician',
    electric: 'Electrician',

    'car wash': 'Carwasher',
    'car washing': 'Carwasher',
    carwashing: 'Carwasher',

    laundry: 'Laundry',
    plumbing: 'Plumber',
    carpentry: 'Carpenter'
  };

  const canonServiceType = t => {
    const raw = String(t || '').trim();
    if (!raw) return '';
    const key = raw.toLowerCase();
    return SERVICE_TYPE_CANON[key] || raw;
  };

  const normType = t => canonServiceType(String(t || '')).trim();

  const normalizeToArray = v => {
    if (Array.isArray(v)) return v;
    const s = String(v ?? '').trim();
    if (!s) return [];
    try {
      if (s.startsWith('[') || s.startsWith('{')) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return s
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  };

  const normalizeTasks = arr => {
    const a = Array.isArray(arr) ? arr : [];
    const cleaned = a.map(x => String(x ?? '').trim()).filter(Boolean);
    return cleaned.length ? cleaned : [];
  };

  const ensureAtLeastOneTaskRow = arr => {
    const a = Array.isArray(arr) ? arr : [];
    if (!a.length) return [''];
    return a;
  };

  const ensureRowsSafe = tasks => {
    const rows = ensureAtLeastOneTaskRow(tasks);
    if (!rows.length) return [''];
    return rows;
  };

  const dedupePairs = arr => {
    const a = Array.isArray(arr) ? arr : [];
    const order = [];
    const map = new Map();

    for (const p of a) {
      const t = normType(p?.serviceType || '');
      if (!t) continue;
      const tasks = ensureRowsSafe(p?.serviceTasks);
      if (!map.has(t)) {
        map.set(t, [...tasks]);
        order.push(t);
      } else {
        const prev = map.get(t) || [];
        const merged = [...prev, ...tasks]
          .map(x => String(x ?? '').trim())
          .filter(Boolean);
        const unique = Array.from(new Set(merged));
        map.set(t, unique.length ? unique : ['']);
      }
    }

    if (!order.length) return [{ serviceType: '', serviceTasks: [''] }];

    return order.map(t => {
      const tasks = map.get(t) || [''];
      return { serviceType: t, serviceTasks: ensureRowsSafe(tasks) };
    });
  };

  const [pairs, setPairs] = useState([{ serviceType: '', serviceTasks: [''] }]);

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsWrapRef = useRef(null);
  const rateTypeRef = useRef(null);
  const brgyRef = useRef(null);

  const [toolsOpen, setToolsOpen] = useState(false);
  const [rateTypeOpen, setRateTypeOpen] = useState(false);
  const [brgyOpen, setBrgyOpen] = useState(false);
  const [taskOpenIndex, setTaskOpenIndex] = useState(null);
  const [stOpenIndex, setStOpenIndex] = useState(null);

  const [openTaskKey, setOpenTaskKey] = useState(null);
  const taskRowRefs = useRef({});

  const setTaskRowRef = (key, node) => {
    if (!taskRowRefs.current) taskRowRefs.current = {};
    taskRowRefs.current[key] = node;
  };

  const barangays = [
    'Alangilan',
    'Alijis',
    'Banago',
    'Bata',
    'Cabug',
    'Estefania',
    'Felisa',
    'Granada',
    'Handumanan',
    'Lopez Jaena',
    'Mandalagan',
    'Mansilingan',
    'Montevista',
    'Pahanocoy',
    'Punta Taytay',
    'Singcang-Airport',
    'Sum-ag',
    'Taculing',
    'Tangub',
    'Villa Esperanza'
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);
  const [barangayQuery, setBarangayQuery] = useState('');
  const filteredBarangays = useMemo(() => {
    const q = barangayQuery.trim().toLowerCase();
    if (!q) return sortedBarangays;
    return sortedBarangays.filter(b => b.toLowerCase().includes(q));
  }, [sortedBarangays, barangayQuery]);

  const [recIds, setRecIds] = useState({ groupId: gid, appId: '' });

  const requestId = useMemo(() => {
    const rid = String(recIds?.appId || '').trim();
    return rid || '';
  }, [recIds]);

  useEffect(() => {
    const handleClickOutside = event => {
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
      if (toolsWrapRef.current && !toolsWrapRef.current.contains(t)) setToolsOpen(false);
      if (rateTypeRef.current && !rateTypeOpen && !rateTypeRef.current.contains(t)) setRateTypeOpen(false);
      if (brgyRef.current && !brgyRef.current.contains(t)) setBrgyOpen(false);

      if (openTaskKey) {
        const refNode = taskRowRefs.current?.[openTaskKey];
        if (refNode && !refNode.contains(t)) setOpenTaskKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stOpenIndex, taskOpenIndex, openTaskKey, rateTypeOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    } catch {}
  }, []);

  const releaseScroll = () => {
    try {
      const h = document.documentElement;
      const b = document.body;
      h.style.overflow = '';
      b.style.overflow = '';
    } catch {}
  };
  useEffect(() => {
    try {
      const h = document.documentElement;
      const b = document.body;
      h.style.overflow = '';
      b.style.overflow = '';
    } catch {}
  }, []);

  const [navLoading, setNavLoading] = useState(false);

  const navigateWithRelease = path => {
    if (navLoading) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setNavLoading(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      releaseScroll();
      navigate(path, { replace: true });
      setTimeout(releaseScroll, 0);
      setTimeout(releaseScroll, 200);
    }, 2000);
  };

  const peso = n => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;

  const normalizePairsFromBackend = (typesArr, tasksArr) => {
    const fromTypes = normalizeToArray(typesArr)
      .map(normType)
      .filter(Boolean);

    const tasks = Array.isArray(tasksArr) ? tasksArr : [];
    const fromTasksCats = tasks
      .map(x => normType(x?.category))
      .filter(Boolean);

    const types = Array.from(new Set([...(fromTypes || []), ...(fromTasksCats || [])])).filter(Boolean);

    const merged = types.length
      ? types.map(ct => {
          const f = tasks.find(x => normType(x?.category) === ct);
          const arr = f && Array.isArray(f.tasks) ? f.tasks.map(s => String(s || '').trim()).filter(Boolean) : [];
          const filled = arr.length ? arr : [''];
          return { serviceType: ct, serviceTasks: filled };
        })
      : [{ serviceType: '', serviceTasks: [''] }];

    return dedupePairs(merged);
  };

  const extractDetails = row => {
    const d =
      row?.details ||
      row?.work ||
      row?.work_information ||
      row?.worker_work_information ||
      row?.workInformation ||
      {};

    const service_types_raw =
      d?.service_types ??
      d?.serviceTypes ??
      d?.service_type ??
      d?.serviceType ??
      [];

    const service_task_raw =
      d?.service_task ??
      d?.serviceTask ??
      d?.service_tasks ??
      d?.serviceTasks ??
      [];

    let service_task = service_task_raw;
    try {
      if (typeof service_task_raw === 'string' && service_task_raw.trim().startsWith('[')) {
        service_task = JSON.parse(service_task_raw);
      }
    } catch {}

    const parsedTasks = Array.isArray(service_task) ? service_task : [];

    let service_types = normalizeToArray(service_types_raw).map(normType).filter(Boolean);

    if (!service_types.length && parsedTasks.length) {
      const inferred = parsedTasks
        .map(x => normType(x?.category))
        .filter(Boolean);
      service_types = Array.from(new Set(inferred));
    }

    return { raw: d || {}, service_types, service_task: parsedTasks };
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const tryKeys = [{ groupId: gid }, { request_group_id: gid }, { group_id: gid }, { requestGroupId: gid }];
        const gidAlts = Array.from(new Set([gid, gidRaw, (gid || '').trim()])).filter(Boolean);
        const shapes = [
          p =>
            axios.get(`${API_BASE}/api/workerapplications`, {
              withCredentials: true,
              headers: headersWithU,
              params: { ...p, limit: 1 }
            }),
          p =>
            axios.get(`${API_BASE}/api/workerapplications`, {
              withCredentials: true,
              headers: headersWithU,
              params: { scope: 'current', ...p, limit: 1 }
            })
        ];
        let row = null;
        let lastErr = null;
        outer: for (const g of gidAlts) {
          for (const key of tryKeys) {
            const payload = Object.fromEntries(Object.entries(key).map(([k]) => [k, g]));
            for (const fn of shapes) {
              try {
                const { data } = await fn(payload);
                if (Array.isArray(data) && data.length) {
                  row = data[0];
                  break outer;
                }
                if (Array.isArray(data?.items) && data.items.length) {
                  row = data.items[0];
                  break outer;
                }
                if (data && (data.info || data.details || data.work || data.work_information || data.rate)) {
                  row = data;
                  break outer;
                }
                if (data?.item && (data.item.info || data.item.details || data.item.work)) {
                  row = data.item;
                  break outer;
                }
              } catch (e) {
                lastErr = e;
              }
            }
          }
        }
        if (!row) {
          try {
            const { data } = await axios.get(
              `${API_BASE}/api/workerapplications/by-group/${encodeURIComponent(gid)}`,
              { withCredentials: true, headers: headersWithU }
            );
            if (Array.isArray(data) && data.length) row = data[0];
            else if (Array.isArray(data?.items) && data.items.length) row = data.items[0];
            else if (data && (data.info || data.details || data.work || data.rate)) row = data;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!row) {
          const msg = (lastErr && (lastErr.response?.data?.message || lastErr.message)) || 'Failed to load application';
          throw new Error(msg);
        }

        const info = row?.info || {};
        const extracted = extractDetails(row);
        const details = extracted.raw || {};
        const rate = row?.rate || {};
        const groupIdResp =
          row?.group_id ||
          row?.request_group_id ||
          row?.application_group_id ||
          row?.worker_application_group_id ||
          row?.groupId ||
          row?.requestGroupId ||
          gid;
        const appIdResp = row?.id || row?.application_id || row?.worker_application_id || row?.appId || '';

        setRecIds({ groupId: groupIdResp, appId: appIdResp });

        const merged = normalizePairsFromBackend(extracted.service_types, extracted.service_task);
        setPairs(dedupePairs(merged));

        const first = dedupePairs(merged)[0] || { serviceType: '', serviceTasks: [''] };
        const st = first?.serviceType || '';
        const tk = (first?.serviceTasks || [])[0] || '';
        setServiceType(st || '');
        setServiceTask(tk || '');

        setYearsExp(details.years_experience ?? '');
        setToolsProvided(toYesNo(details.tools_provided));
        setDescription(details.work_description || details.service_description || '');
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
          pairs: dedupePairs(merged),
          yearsExp: String(details.years_experience ?? ''),
          toolsProvided: toYesNo(details.tools_provided),
          description: details.work_description || details.service_description || '',
          rateType: rate.rate_type || '',
          rateFrom: String(rate.rate_from ?? ''),
          rateTo: String(rate.rate_to ?? ''),
          rateValue: String(rate.rate_value ?? ''),
          address: loc.barangay || '',
          additionalAddress: loc.street || '',
          profileUrl: info.profile_picture_url || ''
        });
      } catch (e) {
        setError(e?.message || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };
    if (gid) load();
  }, [gid, gidRaw, headersWithU]);

  const onPickProfile = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileFile(f);
    const du = await readAsDataUrl(f);
    setProfileDataUrl(du);
    if (du) setProfileUrl('');
  };

  const clearPickedProfile = () => {
    setProfileFile(null);
    setProfileDataUrl(null);
    try {
      if (fileRef.current) fileRef.current.value = '';
    } catch {}
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

  const toNumOrNull = v => {
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

  const handleYearsChange = e => {
    const raw = e.target.value;
    if (raw === '') {
      setYearsExp('');
      return;
    }
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits === '') {
      setYearsExp('');
      return;
    }
    let n = parseInt(onlyDigits, 10);
    if (Number.isNaN(n)) {
      setYearsExp('');
      return;
    }
    if (n < 1) n = 1;
    if (n > 50) n = 50;
    setYearsExp(String(n));
  };

  const yearsValid = useMemo(() => {
    return yearsExp !== '' && /^\d+$/.test(yearsExp) && Number(yearsExp) >= 1 && Number(yearsExp) <= 50;
  }, [yearsExp]);

  const pairsAllValid = useMemo(() => {
    const clean = dedupePairs(pairs);
    if (!clean.length) return false;
    for (const p of clean) {
      if (!p.serviceType) return false;
      const cleaned = normalizeTasks(p.serviceTasks);
      if (!cleaned.length) return false;
    }
    return true;
  }, [pairs]);

  const pairValid = useMemo(() => {
    const clean = dedupePairs(pairs);
    const p0 = clean[0] || {};
    if (!p0.serviceType) return false;
    const cleaned = normalizeTasks(p0.serviceTasks);
    return cleaned.length > 0;
  }, [pairs]);

  const requiredFilled = useMemo(() => {
    if (!address.trim()) return false;
    if (!additionalAddress.trim()) return false;
    if (!pairValid) return false;
    if (!yearsValid) return false;
    if (!toolsProvided) return false;
    if (!description.trim()) return false;
    return true;
  }, [address, additionalAddress, pairValid, yearsValid, toolsProvided, description]);

  const isDirty = useMemo(() => {
    if (!orig) return false;
    const pairsChanged = JSON.stringify(dedupePairs(pairs)) !== JSON.stringify(dedupePairs(orig.pairs));
    const yrsChanged = String(yearsExp) !== String(orig.yearsExp);
    const toolsChanged = toYesNo(toolsProvided) !== toYesNo(orig.toolsProvided);
    const descChanged = String(description) !== String(orig.description);
    const addrChanged = String(address) !== String(orig.address);
    const addAddrChanged = String(additionalAddress) !== String(orig.additionalAddress);
    const picChanged = !!profileDataUrl || String(profileUrl) !== String(orig.profileUrl);
    return pairsChanged || yrsChanged || toolsChanged || descChanged || addrChanged || addAddrChanged || picChanged;
  }, [orig, pairs, yearsExp, toolsProvided, description, address, additionalAddress, profileDataUrl, profileUrl]);

  const canSave = useMemo(() => !saving && requiredFilled && pairsAllValid && isDirty, [
    saving,
    requiredFilled,
    pairsAllValid,
    isDirty
  ]);

  const onSave = async () => {
    if (saving) return;
    if (!requiredFilled) return;
    setSaving(true);
    setShowSaving(true);
    setOk('');
    setError('');
    try {
      const cleanPairs = dedupePairs(pairs)
        .filter(p => normType(p.serviceType))
        .map(p => ({
          serviceType: normType(p.serviceType),
          serviceTasks: normalizeTasks(p.serviceTasks)
        }))
        .filter(p => p.serviceType && p.serviceTasks.length)
        .slice(0, 5);

      const service_types = Array.from(new Set(cleanPairs.map(p => p.serviceType))).slice(0, 5);
      const grouped = {};
      cleanPairs.forEach(p => {
        const k = p.serviceType;
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(...p.serviceTasks);
      });

      const service_task = Object.keys(grouped)
        .slice(0, 5)
        .map(k => ({
          category: k,
          tasks: Array.from(new Set(grouped[k].map(x => String(x || '').trim()).filter(Boolean)))
        }));

      const details = {
        service_types,
        service_task,
        years_experience: Number(String(yearsExp).replace(/\D/g, '')),
        tools_provided: fromYesNo(toolsProvided),
        work_description: String(description || '').trim()
      };

      const ratePayload = {
        rate_type: String(rateType || '').trim(),
        rate_from: String(rateType || '').toLowerCase().includes('hour') ? toNumOrNull(rateFrom) : null,
        rate_to: String(rateType || '').toLowerCase().includes('hour') ? toNumOrNull(rateTo) : null,
        rate_value: String(rateType || '').toLowerCase().includes('job') ? toNumOrNull(rateValue) : null
      };

      const addrObj = { barangay: String(address || '').trim(), street: String(additionalAddress || '').trim() };

      const infoPayload = {
        first_name: String(firstName || '').trim(),
        last_name: String(lastName || '').trim(),
        contact_number: String(contactNumber || '').trim(),
        email_address: String(email || '').trim(),
        address: addrObj,
        current_address: addrObj,
        barangay: addrObj.barangay,
        street: addrObj.street,
        additional_address: addrObj.street
      };

      const effectiveGroupId = recIds.groupId || gid;
      const effectiveAppId = recIds.appId || '';

      const body = {
        group_id: effectiveGroupId,
        request_group_id: effectiveGroupId,
        application_id: effectiveAppId,
        info: infoPayload,
        details,
        rate: ratePayload
      };
      if (profileDataUrl) body.profile_picture_data_url = profileDataUrl;

      await axios.put(`${API_BASE}/api/workerapplications/by-group/${encodeURIComponent(effectiveGroupId)}`, body, {
        withCredentials: true,
        headers: headersWithU,
        params: { groupId: effectiveGroupId, applicationId: effectiveAppId }
      });

      const { data: refreshed } = await axios.get(
        `${API_BASE}/api/workerapplications/by-group/${encodeURIComponent(effectiveGroupId)}`,
        { withCredentials: true, headers: headersWithU }
      );

      const rInfo = refreshed?.info || {};
      const extracted = extractDetails(refreshed);
      const rDetails = extracted.raw || {};
      const rRate = refreshed?.rate || {};
      const newGroupId =
        refreshed?.group_id ||
        refreshed?.request_group_id ||
        refreshed?.groupId ||
        refreshed?.requestGroupId ||
        effectiveGroupId;
      const newAppId = refreshed?.id || refreshed?.application_id || refreshed?.worker_application_id || effectiveAppId;

      setRecIds({ groupId: newGroupId, appId: newAppId });

      const merged = normalizePairsFromBackend(extracted.service_types, extracted.service_task);
      const mergedClean = dedupePairs(merged).slice(0, 5);
      setPairs(mergedClean.length ? mergedClean : [{ serviceType: '', serviceTasks: [''] }]);

      const first = (mergedClean.length ? mergedClean : [{ serviceType: '', serviceTasks: [''] }])[0];
      const st = first?.serviceType || '';
      const tk = (first?.serviceTasks || [])[0] || '';
      setServiceType(st || '');
      setServiceTask(tk || '');

      setYearsExp(rDetails.years_experience ?? '');
      setToolsProvided(toYesNo(rDetails.tools_provided));
      setDescription(rDetails.work_description || rDetails.service_description || '');
      setRateType(rRate.rate_type || '');
      setRateFrom(rRate.rate_from ?? '');
      setRateTo(rRate.rate_to ?? '');
      setRateValue(rRate.rate_value ?? '');

      const loc = normLocation(rInfo);
      const finalBarangay = loc.barangay || addrObj.barangay;
      const finalStreet = loc.street || addrObj.street;

      setAddress(finalBarangay);
      setAdditionalAddress(finalStreet);

      setProfileUrl(rInfo.profile_picture_url || '');
      setFirstName(rInfo.first_name || '');
      setLastName(rInfo.last_name || '');
      setContactNumber(rInfo.contact_number || '');
      setEmail(rInfo.email_address || rInfo.email || '');

      setOrig({
        pairs: mergedClean.length ? mergedClean : [{ serviceType: '', serviceTasks: [''] }],
        yearsExp: String(rDetails.years_experience ?? ''),
        toolsProvided: toYesNo(rDetails.tools_provided),
        description: rDetails.work_description || rDetails.service_description || '',
        rateType: rRate.rate_type || '',
        rateFrom: String(rRate.rate_from ?? ''),
        rateTo: String(rRate.rate_to ?? ''),
        rateValue: String(rRate.rate_value ?? ''),
        address: finalBarangay,
        additionalAddress: finalStreet,
        profileUrl: rInfo.profile_picture_url || ''
      });

      setOk('Changes saved');
      setShowSuccess(true);
      try {
        window.dispatchEvent(new Event('worker-application-submitted'));
      } catch {}
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
      setShowSaving(false);
    }
  };

  useEffect(() => {
    if (!navLoading) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = e => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [navLoading]);

  const onCancel = () => {
    navigateWithRelease('/workerdashboard');
  };

  const onSuccessOk = () => {
    setShowSuccess(false);
    navigateWithRelease('/workerdashboard');
  };

  const setPairType = (i, v) => {
    const vv = normType(v);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const n = base.map((p, idx) => (idx === i ? { serviceType: vv, serviceTasks: [''] } : p));
      const final = dedupePairs(n).slice(0, 5);
      const first = final[0] || { serviceType: '', serviceTasks: [''] };
      setServiceType(first.serviceType || '');
      setServiceTask((first.serviceTasks || [''])[0] || '');
      return final.length ? final : [{ serviceType: '', serviceTasks: [''] }];
    });
  };

  const addPair = () =>
    setPairs(prev => {
      const clean = dedupePairs(prev);
      const filled = clean.filter(p => normType(p.serviceType)).length;
      if (filled >= 5) return clean;
      return [...clean, { serviceType: '', serviceTasks: [''] }].slice(0, 6);
    });

  const removePair = i =>
    setPairs(prev => {
      const base = dedupePairs(prev);
      const n = base.filter((_, idx) => idx !== i);
      const final = dedupePairs(n).slice(0, 5);
      const first = final[0] || { serviceType: '', serviceTasks: [''] };
      setServiceType(first.serviceType || '');
      setServiceTask((first.serviceTasks || [''])[0] || '');
      return final.length ? final : [{ serviceType: '', serviceTasks: [''] }];
    });

  const selectedTypes = useMemo(() => {
    const clean = dedupePairs(pairs);
    return Array.from(new Set(clean.map(p => normType(p.serviceType)).filter(Boolean)));
  }, [pairs]);

  const availableTypes = idx => {
    const current = normType(pairs[idx]?.serviceType || '');
    return sortedServiceTypes.filter(t => t === current || !selectedTypes.includes(normType(t)));
  };

  const toggleServiceTypeMirror = type => {
    const t = normType(type);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const has = base.some(p => normType(p.serviceType) === t);

      if (has) {
        const next = base.filter(p => normType(p.serviceType) !== t);
        const final = dedupePairs(next).slice(0, 5);
        const first = final[0] || { serviceType: '', serviceTasks: [''] };
        setServiceType(first.serviceType || '');
        setServiceTask((first.serviceTasks || [''])[0] || '');
        return final.length ? final : [{ serviceType: '', serviceTasks: [''] }];
      }

      const filled = base.filter(p => normType(p.serviceType)).length;
      if (filled >= 5) return base.slice(0, 5);

      const next = [...base.filter(p => normType(p.serviceType)), { serviceType: t, serviceTasks: [''] }];
      const final = dedupePairs(next).slice(0, 5);
      const first = final[0] || { serviceType: '', serviceTasks: [''] };
      setServiceType(first.serviceType || '');
      setServiceTask((first.serviceTasks || [''])[0] || '');
      return final.length ? final : [{ serviceType: '', serviceTasks: [''] }];
    });
  };

  const handleJobDetailChangeMirror = (jobType, index, value) => {
    const jt = normType(jobType);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const next = base.map(p => {
        if (normType(p.serviceType) !== jt) return p;
        const updated = [...ensureRowsSafe(p.serviceTasks)];
        updated[index] = value;
        return { ...p, serviceTasks: updated };
      });
      return dedupePairs(next).slice(0, 5);
    });
  };

  const addTaskFieldMirror = jobType => {
    const jt = normType(jobType);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const next = base.map(p => {
        if (normType(p.serviceType) !== jt) return p;
        return { ...p, serviceTasks: [...ensureRowsSafe(p.serviceTasks), ''] };
      });
      return dedupePairs(next).slice(0, 5);
    });
  };

  const removeTaskFieldMirror = (jobType, index) => {
    const jt = normType(jobType);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const next = base.map(p => {
        if (normType(p.serviceType) !== jt) return p;
        const arr = [...ensureRowsSafe(p.serviceTasks)];
        const nextTasks = arr.filter((_, i) => i !== index);
        return { ...p, serviceTasks: nextTasks.length ? nextTasks : [''] };
      });
      return dedupePairs(next).slice(0, 5);
    });
  };

  const clearTypeMirror = jobType => {
    const jt = normType(jobType);
    setPairs(prev => {
      const base = dedupePairs(prev);
      const next = base.map(p => (normType(p.serviceType) !== jt ? p : { ...p, serviceTasks: [''] }));
      return dedupePairs(next).slice(0, 5);
    });
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
    rightLabel,
    hideSearch = false
  }) => {
    const [q, setQ] = useState('');
    const filtered = hideSearch
      ? items || []
      : (items || []).filter(it => String(it || '').toLowerCase().includes(q.trim().toLowerCase()));
    return (
      <div
        className={`absolute z-[9999] mt-2 ${fullWidth ? 'left-0 right-0 w-full' : 'w-80'} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}
      >
        <div className="px-2 pb-2">
          <div className="text-sm font-semibold text-gray-800">{title}</div>
          {!hideSearch ? (
            <div className="mt-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : null}
        </div>

        <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
          {filtered && filtered.length ? (
            filtered.map(it => {
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
                    rightLabel ? 'flex items-center justify-between gap-3' : '',
                    disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50',
                    isSel && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                  ].join(' ')}
                >
                  <span className="truncate">{it}</span>
                  {rightLabel ? (
                    <span className={`shrink-0 text-xs font-semibold ${isSel ? 'text-white/90' : 'text-[#008cfc]'}`}>
                      {rightLabel(it)}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="text-xs text-gray-400 px-2 py-3">{emptyLabel}</div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 px-2">
          <span className="text-xs text-gray-400">
            {(filtered || []).length} result{(filtered || []).length === 1 ? '' : 's'}
          </span>
          {clearable ? (
            <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">
              {clearText}
            </button>
          ) : (
            <button type="button" onClick={() => onSelect('')} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    document.body.style.overflow = confirmOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [confirmOpen]);

  useEffect(() => {
    const lock = showSuccess || showSaving;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    if (lock) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtml || '';
      body.style.overflow = prevBody || '';
    }
    return () => {
      html.style.overflow = prevHtml || '';
      body.style.overflow = prevBody || '';
    };
  }, [showSuccess, showSaving]);

  useEffect(() => {
    const handler = e => {
      if (showSaving) e.preventDefault();
    };
    if (showSaving) {
      window.addEventListener('wheel', handler, { passive: false });
      window.addEventListener('touchmove', handler, { passive: false });
    }
    return () => {
      window.removeEventListener('wheel', handler);
      window.removeEventListener('touchmove', handler);
    };
  }, [showSaving]);

  useEffect(() => {
    const lock = loading;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    if (lock) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtml || '';
      body.style.overflow = prevBody || '';
    }
    return () => {
      html.style.overflow = prevHtml || '';
      body.style.overflow = prevBody || '';
    };
  }, [loading]);

  useEffect(() => {
    const handler = e => {
      if (loading) e.preventDefault();
    };
    if (loading) {
      window.addEventListener('wheel', handler, { passive: false });
      window.addEventListener('touchmove', handler, { passive: false });
    }
    return () => {
      window.removeEventListener('wheel', handler);
      window.removeEventListener('touchmove', handler);
    };
  }, [loading]);

  const profilePreview = profileDataUrl || profileUrl || '';
  const profileName = useMemo(() => {
    if (profileFile && profileFile.name) return profileFile.name;
    return profilePreview ? 'Current image' : '';
  }, [profileFile, profilePreview]);

  const ratePreview = useMemo(() => {
    const rt = String(rateType || '').toLowerCase();
    if (rt.includes('hour')) {
      const f = cleanNumber(rateFrom, true);
      const t = cleanNumber(rateTo, true);
      if (!f && !t) return '';
      if (f && t) return `${peso(f)} - ${peso(t)} / hour`;
      if (f) return `${peso(f)} / hour`;
      if (t) return `${peso(t)} / hour`;
      return '';
    }
    if (rt.includes('job')) {
      const v = cleanNumber(rateValue, true);
      if (!v) return '';
      return `${peso(v)} (by the job)`;
    }
    return '';
  }, [rateType, rateFrom, rateTo, rateValue]);

  const mirrorPairs = useMemo(() => {
    const clean = dedupePairs(pairs).filter(p => normType(p.serviceType));
    return clean.slice(0, 5).map(p => ({
      ...p,
      serviceType: normType(p.serviceType),
      serviceTasks: ensureRowsSafe(p.serviceTasks)
    }));
  }, [pairs]);

  return (
    <>
      <WorkerNavigation />

      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
          <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
                <img
                  src="/jdklogo.png"
                  alt=""
                  className="h-6 w-6 object-contain"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="text-2xl md:text-3xl font-semibold text-gray-900">Edit Work Application</div>
            </div>

            <div className="flex items-center justify-end gap-4">
              {requestId ? (
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Application ID</div>
                  <div className="text-sm font-semibold text-gray-900">{requestId}</div>
                </div>
              ) : null}

              <div className="hidden">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSave}
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
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Personal Information</h3>
                  <span
                    style={{ display: 'none' }}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                    Worker
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-100" />

              <div className="px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-6">
                  <div className="lg:col-span-2">
                    <p className="text-base text-gray-600 mb-6">Review your worker details and address information.</p>

                    {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}
                    {ok ? <div className="mb-4 text-sm text-emerald-700">{ok}</div> : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          readOnly
                          aria-readonly
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 bg-gray-100 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          readOnly
                          aria-readonly
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 bg-gray-100 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                        <div className="flex items-center rounded-xl border border-gray-300 bg-gray-100 focus-within:ring-2 focus-within:ring-[#008cfc]/40">
                          <div className="w-8 h-5 ml-3 mr-2 rounded-md">
                            <img
                              src="/philippines.png"
                              alt="Philippine Flag"
                              className="w/full h/full object-contain rounded-md"
                            />
                          </div>
                          <span className="text-gray-700 text-sm mr-3">+63</span>
                          <span className="h-6 w-px bg-gray-200 mr-2" />
                          <input
                            type="text"
                            value={contactNumber}
                            readOnly
                            aria-readonly
                            className="w-full px-4 py-3 bg-transparent outline-none rounded-r-xl cursor-not-allowed"
                            placeholder="9XXXXXXXXX"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          readOnly
                          aria-readonly
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 bg-gray-100 cursor-not-allowed"
                          placeholder="Email Address"
                        />
                      </div>

                      <div className="relative md:col-span-2" ref={brgyRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
                        <div className="flex items-center rounded-xl border border-gray-300">
                          <button
                            type="button"
                            onClick={() => {
                              setBarangayQuery('');
                              setBrgyOpen(s => !s);
                            }}
                            className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                            aria-expanded={brgyOpen}
                            aria-haspopup="listbox"
                          >
                            {address || 'Select Barangay'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBarangayQuery('');
                              setBrgyOpen(s => !s);
                            }}
                            className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                            aria-label="Open barangay list"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>

                        {brgyOpen ? (
                          <div
                            className="absolute z-[9999] mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-3"
                            role="listbox"
                          >
                            <div className="px-2 pb-2">
                              <input
                                value={barangayQuery}
                                onChange={e => setBarangayQuery(e.target.value)}
                                placeholder="Search…"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto px-2">
                              {filteredBarangays.length ? (
                                filteredBarangays.map((b, i) => {
                                  const isSelected = b === address;
                                  return (
                                    <button
                                      key={`${b}-${i}`}
                                      type="button"
                                      onClick={() => {
                                        setAddress(b);
                                        setBarangayQuery('');
                                        setBrgyOpen(false);
                                      }}
                                      className={[
                                        'text-left px-3 py-2 rounded-lg text-sm',
                                        isSelected
                                          ? 'bg-blue-600 text-white hover:bg-blue-600'
                                          : 'text-gray-700 hover:bg-blue-50'
                                      ].join(' ')}
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
                              <span className="text-xs text-gray-400">
                                {filteredBarangays.length} result{filteredBarangays.length === 1 ? '' : 's'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddress('');
                                  setBarangayQuery('');
                                  setBrgyOpen(false);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                        <input
                          type="text"
                          value={additionalAddress}
                          onChange={e => setAdditionalAddress(e.target.value)}
                          placeholder="House No. and Street"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="text-xl md:text-2xl font-semibold mb-3 text-center">Worker Profile Picture</div>
                    <p className="text-base text-gray-600 text-center mb-5">Upload your picture here.</p>

                    <div className="flex flex-col items-center gap-5">
                      {!profilePreview ? (
                        <div className="w-36 h-36 md:w-40 md:h-40 rounded-full grid place-items-center bg-gray-200">
                          <span className="text-white text-2xl">+</span>
                        </div>
                      ) : (
                        <img
                          src={profilePreview}
                          alt="Profile Preview"
                          className="w-36 h-36 md:w-40 md:h-40 rounded-full object-cover ring-2 ring-blue-100 shadow-sm"
                        />
                      )}

                      <div className="w-full flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077d6] transition w-full shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                        >
                          Choose Photo
                        </button>

                        {profileDataUrl ? (
                          <button
                            type="button"
                            onClick={clearPickedProfile}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition w-full"
                          >
                            Remove
                          </button>
                        ) : null}

                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickProfile} />
                      </div>

                      {profileName ? (
                        <p className="text-xs text-gray-600 truncate text-center">Selected: {profileName}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-visible">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Work Application Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Update your services, experience, requirements, and rate details.
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100" />

              <div className="px-6 py-6">
                {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}
                {ok ? <div className="mb-4 text-sm text-emerald-700">{ok}</div> : null}

                <div className="grid grid-cols-1 gap-6 items-start">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      <div>
                        <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-900">Service Type</h3>

                        <div className="mb-8">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            {sortedServiceTypes.map(type => {
                              const checked = selectedTypes.includes(normType(type));
                              const disabled = !checked && selectedTypes.length >= 5;
                              return (
                                <label
                                  key={type}
                                  className={[
                                    'flex items-center gap-3 cursor-pointer select-none',
                                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                                  ].join(' ')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => !disabled && toggleServiceTypeMirror(type)}
                                    className="peer sr-only"
                                  />
                                  <span
                                    className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center"
                                    aria-hidden="true"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition"
                                      fill="none"
                                      stroke="white"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{type}</span>
                                </label>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            {selectedTypes.length ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPairs([{ serviceType: '', serviceTasks: [''] }]);
                                  setServiceType('');
                                  setServiceTask('');
                                  setOpenTaskKey(null);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-900"
                              >
                                Clear all
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {mirrorPairs.length > 0 && mirrorPairs.some(p => p.serviceType) ? (
                          <div className="mb-4">
                            <h4 className="text-2xl font-semibold mb-2 text-gray-900">Service Task</h4>

                            {mirrorPairs.map(p => {
                              const jobType = p.serviceType;
                              const options = serviceTasksMap[jobType] || [];
                              const selectedNonEmpty = normalizeTasks(p.serviceTasks);
                              const hasDetail = selectedNonEmpty.length > 0;
                              const rows = ensureRowsSafe(p.serviceTasks);

                              return (
                                <div key={jobType} className="mb-6 rounded-xl border border-gray-200 bg-white shadow-xs">
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <div className="text-sm font-medium text-gray-900">{jobType} Services</div>
                                    <div className="text-xs text-gray-500">{selectedNonEmpty.length} selected</div>
                                  </div>

                                  <div className="px-4 py-4">
                                    {rows.map((task, index) => {
                                      const key = `${jobType}-${index}`;
                                      const curVal = String(task || '').trim();
                                      const used = normalizeTasks(rows).filter(v => v !== curVal);

                                      return (
                                        <div key={key} className="mb-3" ref={node => setTaskRowRef(key, node)}>
                                          <div
                                            className={[
                                              'flex items-stretch rounded-xl border bg-white overflow-hidden',
                                              curVal ? 'border-gray-300' : 'border-gray-300'
                                            ].join(' ')}
                                          >
                                            <div className="px-3 py-3 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 min-w-[62px] grid place-items-center">
                                              Task {index + 1}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => setOpenTaskKey(k => (k === key ? null : key))}
                                              className="flex-1 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            >
                                              {curVal ? <span className="truncate">{curVal}</span> : 'Select a service'}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setOpenTaskKey(k => (k === key ? null : key))}
                                              className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                                              aria-label="Open task options"
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </button>

                                            {rows.length > 1 ? (
                                              <button
                                                type="button"
                                                onClick={() => removeTaskFieldMirror(jobType, index)}
                                                className="px-4 text-xs font-semibold text-red-600 hover:text-red-700 border-l border-gray-200 bg-white"
                                              >
                                                Remove
                                              </button>
                                            ) : null}
                                          </div>

                                          {openTaskKey === key ? (
                                            <div className="relative">
                                              <PopList
                                                items={options}
                                                value={curVal}
                                                fullWidth
                                                title={`Select ${jobType} Service`}
                                                disabledLabel={opt => used.includes(opt)}
                                                clearable
                                                onClear={() => {
                                                  handleJobDetailChangeMirror(jobType, index, '');
                                                  setOpenTaskKey(null);
                                                }}
                                                onSelect={val => {
                                                  handleJobDetailChangeMirror(jobType, index, val);
                                                  setOpenTaskKey(null);
                                                }}
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}

                                    {!hasDetail ? (
                                      <p className="text-xs text-gray-500 mt-1">Choose at least one {jobType} service.</p>
                                    ) : null}

                                    <div className="mt-3 flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => addTaskFieldMirror(jobType)}
                                        className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 text-sm"
                                      >
                                        + Add Another Task
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => clearTypeMirror(jobType)}
                                        className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900"
                                      >
                                        Clear {jobType}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-900">Service Description</h3>

                        <div className="mb-4">
                          <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe the service you offer"
                            className="w-full h-[180px] px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            step="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={yearsExp}
                            onChange={handleYearsChange}
                            placeholder="Enter years of experience"
                            className={`w-full px-4 py-3 border ${
                              yearsExp !== '' && !yearsValid ? 'border-red-500' : 'border-gray-300'
                            } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base`}
                            required
                            aria-invalid={yearsExp !== '' && !yearsValid}
                          />
                          {yearsExp !== '' && !yearsValid ? (
                            <p className="text-xs text-red-600 mt-1">Enter a valid number from 1–50.</p>
                          ) : null}
                        </div>

                        <div className="mb-2 relative" ref={toolsWrapRef}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Do you have your own tools or equipment? *
                          </label>

                          <select
                            value={toolsProvided}
                            onChange={e => setToolsProvided(e.target.value)}
                            className="hidden"
                            aria-hidden="true"
                            tabIndex={-1}
                          >
                            <option value=""></option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>

                          <div className="flex items-center rounded-xl border border-gray-300">
                            <button
                              type="button"
                              onClick={() => setToolsOpen(s => !s)}
                              className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                            >
                              {toolsProvided || 'Select Yes or No'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setToolsOpen(s => !s)}
                              className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                              aria-label="Open tools provided options"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>

                          {toolsOpen ? (
                            <PopList
                              items={['Yes', 'No']}
                              value={toolsProvided}
                              onSelect={v => {
                                setToolsProvided(v);
                                setToolsOpen(false);
                              }}
                              fullWidth
                              title="Select Tools Provided"
                              hideSearch
                              clearable
                              onClear={() => {
                                setToolsProvided('');
                                setToolsOpen(false);
                              }}
                            />
                          ) : null}
                        </div>

                        {!hourlyValid || !jobValid ? (
                          <div className="text-xs text-red-600">
                            {String(rateType || '').toLowerCase().includes('hour')
                              ? 'Rate To must be greater than Rate From.'
                              : 'Enter a valid rate amount.'}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canSave}
                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center rounded-lg border px-4 py-2.5 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSave}
                className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium bg-[#008cfc] text-white hover:bg-[#0077d6] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900">Save changes?</h4>
            <p className="mt-1 text-sm text-gray-600">Are you sure saving these changes?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => {
                  setConfirmOpen(false);
                  if (canSave) onSave();
                }}
                className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                  canSave
                    ? 'bg-[#008cfc] text-white hover:bg-blue-700'
                    : 'bg-[#008cfc] text-white opacity-60 cursor-not-allowed'
                }`}
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
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '8px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-4 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="Logo"
                    className="w-14 h-14 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483648]">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img
                  src="/jdklogo.png"
                  alt="Logo"
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
              <div className="text-lg font-semibold text-gray-900">Saved Successfully!</div>
              <div className="text-sm text-gray-600">Your changes have been saved.</div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={onSuccessOk}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {navLoading ? (
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
      ) : null}

      {loading ? (
        <div className="fixed inset-0 z-[2147483645] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483646]">
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
              <div className="text-base font-semibold text-gray-900 animate-pulse">Loading application…</div>
            </div>
          </div>
        </div>
      ) : null}

      <WorkerFooter />
    </>
  );
}
