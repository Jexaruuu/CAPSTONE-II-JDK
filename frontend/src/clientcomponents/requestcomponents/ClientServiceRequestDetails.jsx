import React, { useState, useEffect, useRef } from 'react';
import { compressImageFileToDataURL } from '../../utils/imageCompression';

const STORAGE_KEY = 'clientServiceRequestDetails';
const GLOBAL_DESC_KEY = 'clientServiceDescription';
const CONFIRM_FLAG = 'clientRequestJustConfirmed';
const IMAGE_CLEARED_FLAG = 'clientServiceImageCleared';
const PRESERVE_IMAGE_FLAG = 'clientPreserveServiceImage';
const IMAGE_CACHE_KEY = 'clientServiceImageCache';
const IMAGE_REFRESH_FLAG = 'clientServiceImageRefreshOnDashboard';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const NIGHT_TIME_FEE = 200;

const INCLUDED_WORKERS = 2;
const EXTRA_WORKER_FEE = 150;
const MAX_WORKERS = 6;

const ClientServiceRequestDetails = ({ title, setTitle, handleNext, handleBack }) => {
  const [serviceType, setServiceType] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceTask, setServiceTask] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isUrgent, setIsUrgent] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [workersNeeded, setWorkersNeeded] = useState(1);
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [requestImageUrl, setRequestImageUrl] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const dropdownRef = useRef(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const fileRef = useRef(null);

  const clampInt = (v, min, max) => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];
  const serviceTasks = {
    Carpentry: [
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
    'Electrical Works': [
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
    Plumbing: [
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
    'Car Washing': [
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

  const sortedServiceTypes = serviceTypes.sort();

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

  const getSelectedTaskRate = () => {
    if (!serviceType || !serviceTask) return '';
    const v = serviceTaskRates?.[serviceType]?.[serviceTask];
    const r = formatRate(v);
    return shouldShowPerUnit(serviceType) ? withPerUnitLabel(r) : r;
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const stRef = useRef(null);
  const taskRef = useRef(null);
  const toolsRef = useRef(null);
  const urgentRef = useRef(null);
  const pdRef = useRef(null);
  const ptRef = useRef(null);
  const workersRef = useRef(null);

  const [stOpen, setStOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [pdOpen, setPdOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [pdMonthOpen, setPdMonthOpen] = useState(false);
  const [pdYearOpen, setPdYearOpen] = useState(false);
  const [workersOpen, setWorkersOpen] = useState(false);

  const handleClickOutside = (event) => {
    const t = event.target;
    if (dropdownRef.current && !dropdownRef.current.contains(t)) setShowDropdown(false);
    if (stRef.current && !stRef.current.contains(t)) setStOpen(false);
    if (taskRef.current && !taskRef.current.contains(t)) setTaskOpen(false);
    if (toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
    if (urgentRef.current && !urgentRef.current.contains(t)) setUrgentOpen(false);
    if (pdRef.current && !pdRef.current.contains(t)) {
      setPdOpen(false);
      setPdMonthOpen(false);
      setPdYearOpen(false);
    }
    if (ptRef.current && !ptRef.current.contains(t)) setPtOpen(false);
    if (workersRef.current && !workersRef.current.contains(t)) setWorkersOpen(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (localStorage.getItem(PRESERVE_IMAGE_FLAG) === '1') {
          localStorage.removeItem(PRESERVE_IMAGE_FLAG);
          return;
        }
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        saved.serviceDescription = '';
        saved.image = null;
        saved.imageName = '';
        saved.attachments = [];
        saved.request_image_url = '';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        localStorage.removeItem(IMAGE_CACHE_KEY);
        localStorage.setItem(IMAGE_CLEARED_FLAG, '1');
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMAGE_CACHE_KEY);
        localStorage.setItem(IMAGE_CLEARED_FLAG, '1');
      }
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const t = getTodayLocalDateString();
      setTodayStr((prev) => (prev !== t ? t : prev));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const globalDesc = localStorage.getItem(GLOBAL_DESC_KEY) || '';
    const forceRefresh = localStorage.getItem(IMAGE_REFRESH_FLAG) === '1';
    let hydratedImage = null;
    let hydratedImageName = '';
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setServiceType(data.serviceType || '');
        setServiceTask(data.serviceTask || '');
        const hydratedDate = data.preferredDate || '';
        const today = getTodayLocalDateString();
        setPreferredDate(hydratedDate && hydratedDate < today ? today : hydratedDate);
        setPreferredTime(data.preferredTime || '');
        setIsUrgent(data.isUrgent || '');
        setToolsProvided(data.toolsProvided || '');
        setWorkersNeeded(clampInt(data.workersNeeded ?? data.workers_needed ?? 1, 1, MAX_WORKERS));
        if (!forceRefresh) {
          const img =
            data.image ||
            data.request_image_url ||
            (Array.isArray(data.attachments) && data.attachments[0]) ||
            null;
          hydratedImage = img || null;
          hydratedImageName = data.imageName || '';
        }
        setServiceDescription(globalDesc || data.serviceDescription || '');
      } catch {
        if (globalDesc) setServiceDescription(globalDesc);
      }
    } else {
      const d = localStorage.getItem(GLOBAL_DESC_KEY) || '';
      if (d) setServiceDescription(d);
    }
    if (!hydratedImage && !forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || 'null');
        if (cached && cached.image) {
          hydratedImage = cached.image;
          hydratedImageName = cached.imageName || '';
        }
      } catch {}
    }
    if (hydratedImage) {
      setImage(hydratedImage);
      setImageName(hydratedImageName || '');
      setAttachments([hydratedImage]);
      setRequestImageUrl(hydratedImage);
    }
    setHydrated(true);
  }, []);

  const workersNeededSafe = clampInt(workersNeeded, 1, MAX_WORKERS);
  const extraWorkerCount = Math.max(0, workersNeededSafe - INCLUDED_WORKERS);
  const extraWorkersFeeTotal = extraWorkerCount * EXTRA_WORKER_FEE;
  const workersFeeLabel = extraWorkerCount > 0 ? `+ fee ${formatRate(extraWorkersFeeTotal)}` : '';

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      serviceType,
      serviceTask,
      preferredDate,
      preferredTime,
      isUrgent,
      toolsProvided,
      workersNeeded: workersNeededSafe,
      workers_needed: workersNeededSafe,
      worker_needed: workersNeededSafe,
      number_of_workers: workersNeededSafe,
      num_workers: workersNeededSafe,
      manpower: workersNeededSafe,
      included_workers: INCLUDED_WORKERS,
      extra_worker_fee_per_worker: EXTRA_WORKER_FEE,
      max_workers: MAX_WORKERS,
      extra_worker_count: extraWorkerCount,
      extra_workers_fee: extraWorkersFeeTotal,
      serviceDescription,
      image,
      imageName,
      attachments: image ? [image] : [],
      request_image_url: requestImageUrl
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(GLOBAL_DESC_KEY, serviceDescription || '');
    if (image) {
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({ image, imageName }));
    }
  }, [
    hydrated,
    serviceType,
    serviceTask,
    preferredDate,
    preferredTime,
    isUrgent,
    toolsProvided,
    workersNeededSafe,
    extraWorkerCount,
    extraWorkersFeeTotal,
    serviceDescription,
    image,
    imageName,
    requestImageUrl
  ]);

  useEffect(() => {
    const clear = () => {
      localStorage.setItem(IMAGE_REFRESH_FLAG, '1');
      localStorage.removeItem(GLOBAL_DESC_KEY);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved) || {};
          data.serviceDescription = '';
          data.image = null;
          data.imageName = '';
          data.attachments = [];
          data.request_image_url = '';
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      localStorage.removeItem(IMAGE_CACHE_KEY);
      localStorage.removeItem(IMAGE_CLEARED_FLAG);
      setServiceDescription('');
      setImage(null);
      setImageName('');
      setAttachments([]);
      setRequestImageUrl('');
    };

    const onNavCheck = () => {
      if (window.location.pathname === '/clientdashboard' || window.location.pathname.startsWith('/clientdashboard')) clear();
    };

    const onClick = (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a) {
        const href = a.getAttribute('href');
        if (href === '/clientdashboard' || href?.startsWith('/clientdashboard')) clear();
      }
    };

    const onStorage = (e) => {
      if (e && e.key === CONFIRM_FLAG && e.newValue === '1') {
        clear();
        localStorage.removeItem(CONFIRM_FLAG);
      }
    };

    const onCustomConfirmed = () => {
      clear();
      localStorage.removeItem(CONFIRM_FLAG);
    };

    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    history.pushState = function () {
      const r = originalPush.apply(this, arguments);
      window.dispatchEvent(new Event('pushstate'));
      return r;
    };

    history.replaceState = function () {
      const r = originalReplace.apply(this, arguments);
      window.dispatchEvent(new Event('replacestate'));
      return r;
    };

    window.addEventListener('pushstate', onNavCheck);
    window.addEventListener('replacestate', onNavCheck);
    window.addEventListener('popstate', onNavCheck);
    document.addEventListener('click', onClick, true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('client-request-confirmed', onCustomConfirmed);

    if (localStorage.getItem(CONFIRM_FLAG) === '1') {
      clear();
      localStorage.removeItem(CONFIRM_FLAG);
    }

    return () => {
      window.removeEventListener('pushstate', onNavCheck);
      window.removeEventListener('replacestate', onNavCheck);
      window.removeEventListener('popstate', onNavCheck);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('client-request-confirmed', onCustomConfirmed);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      const forceRefresh = localStorage.getItem(IMAGE_REFRESH_FLAG) === '1';
      if (image && !forceRefresh) return;
      if (!forceRefresh && localStorage.getItem(IMAGE_CLEARED_FLAG) === '1') return;

      const path =
        typeof window !== 'undefined' && window.location && window.location.pathname ? window.location.pathname : '';
      const isCreateFlow = path.includes('/clientpostrequest');
      if (isCreateFlow) return;

      if (forceRefresh) {
        localStorage.removeItem(IMAGE_CACHE_KEY);
        localStorage.removeItem(IMAGE_CLEARED_FLAG);
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || 'null');
          if (cached && cached.image) {
            setImage(cached.image);
            setImageName(cached.imageName || '');
            setAttachments([cached.image]);
            setRequestImageUrl(cached.image);
            return;
          }
        } catch {}
      }

      let email = localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      if (!email) {
        try {
          const r = await fetch(`${API_BASE}/api/account/me`, { credentials: 'include' });
          if (r.ok) {
            const j = await r.json();
            email = j?.email_address || '';
          }
        } catch {}
      }
      if (!email) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/clientservicerequests/details?email=${encodeURIComponent(email)}&limit=1`,
          { credentials: 'include' }
        );
        if (!res.ok) return;
        const j = await res.json();
        const row = Array.isArray(j.items) && j.items.length ? j.items[0] : null;
        const src = row && (row.request_image_url || row.image_url) ? row.request_image_url || row.image_url : null;
        if (src) {
          setImage(src);
          setImageName(row.image_name || '');
          setAttachments([src]);
          setRequestImageUrl(src);
          localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({ image: src, imageName: row.image_name || '' }));
        } else {
          setImage(null);
          setImageName('');
          setAttachments([]);
          setRequestImageUrl('');
          localStorage.removeItem(IMAGE_CACHE_KEY);
        }
      } catch {}

      if (forceRefresh) localStorage.removeItem(IMAGE_REFRESH_FLAG);
    };
    run();
  }, [image]);

  const handleServiceTypeChange = (val) => {
    setServiceType(val);
    setServiceTask('');
  };

  const handleUrgentChange = (value) => {
    setIsUrgent(value);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageName(file.name);
    try {
      const compressed = await compressImageFileToDataURL(file, 1600, 1600, 0.85, 2 * 1024 * 1024);
      setImage(compressed);
      setAttachments([compressed]);
      setRequestImageUrl(compressed);
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({ image: compressed, imageName: file.name }));
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setAttachments([reader.result]);
        setRequestImageUrl(reader.result);
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({ image: reader.result, imageName: file.name }));
      };
      reader.readAsDataURL(file);
    }
    localStorage.removeItem(IMAGE_CLEARED_FLAG);
    localStorage.removeItem(IMAGE_REFRESH_FLAG);
  };

  const handlePreferredDateChange = (value) => {
    if (!value) {
      setPreferredDate('');
      return;
    }
    setPreferredDate(value < todayStr ? todayStr : value);
  };

  const isPreferredDateValid = preferredDate && preferredDate >= todayStr;

  const isFormValid =
    serviceType &&
    serviceTask &&
    isPreferredDateValid &&
    preferredTime &&
    isUrgent &&
    toolsProvided &&
    workersNeededSafe >= 1 &&
    serviceDescription.trim() &&
    !!image;

  const isPastDate = preferredDate && preferredDate < todayStr;

  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingNext]);

  useEffect(() => {
    if (!isLoadingNext) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingBack]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingBack]);

  const onNextClick = () => {
    setAttempted(true);
    if (isFormValid) {
      jumpTop();
      localStorage.setItem(PRESERVE_IMAGE_FLAG, '1');
      setIsLoadingNext(true);
      setTimeout(() => {
        handleNext();
      }, 2000);
    }
  };

  const onBackClick = () => {
    localStorage.setItem(PRESERVE_IMAGE_FLAG, '1');
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      handleBack();
    }, 2000);
  };

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
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const [pdView, setPdView] = useState(new Date());
  const monthsList = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const yearsList = (() => {
    const ys = [];
    const start = fromYMDLocal(todayStr).getFullYear();
    for (let y = start; y <= start + 5; y++) ys.push(y);
    return ys;
  })();

  const inRangePD = (date) => date >= fromYMDLocal(todayStr);
  const canPrevPD = () => addMonths(startOfMonth(pdView), -1) >= startOfMonth(fromYMDLocal(todayStr));
  const canNextPD = () => true;

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
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
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

  const preferredTimeFeeLabel =
    preferredTime && isNightTimeForFee(preferredTime) ? `+ fee ${formatRate(NIGHT_TIME_FEE)}` : '';

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
    rightLabel
  }) => {
    const isTimeString = (s) => /^\d{1,2}:\d{2}$/.test(String(s || ''));
    const timeMode = Array.isArray(items) && items.length > 0 && items.every(isTimeString);
    return (
      <div
        className={`absolute z-50 mt-2 ${
          fullWidth ? 'left-0 right-0 w-full' : 'w-80'
        } rounded-xl border border-gray-200 bg-white shadow-xl p-3`}
      >
        <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
        <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
          {items && items.length ? (
            items.map((it) => {
              const isSel = value === it;
              const disabled = disabledLabel && disabledLabel(it);
              const colorClass = disabled
                ? 'text-gray-300 cursor-not-allowed'
                : timeMode
                  ? `hover:bg-blue-50 ${isGreenTime(it) ? 'text-green-600' : isRedTime(it) ? 'text-red-600' : 'text-gray-700'}`
                  : 'hover:bg-blue-50 text-gray-700';
              const right = !timeMode && typeof rightLabel === 'function' ? rightLabel(it) || '' : '';
              return (
                <button
                  key={it}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onSelect(it)}
                  className={[
                    'text-left py-2 px-3 rounded-lg text-sm',
                    right ? 'flex items-center justify-between gap-3' : '',
                    colorClass,
                    isSel && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                  ].join(' ')}
                >
                  <span className="truncate">{timeMode ? to12h(it) : it}</span>
                  {right ? (
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        isSel && !disabled ? 'text-white/90' : 'text-[#008cfc]'
                      }`}
                    >
                      {right}
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
            {items && items.length ? items.length : 0} result{items && items.length === 1 ? '' : 's'}
          </span>
          {clearable ? (
            <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">
              {clearText}
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    );
  };

  const workerOptions = Array.from({ length: MAX_WORKERS }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/jdklogo.png"
              alt=""
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Please fill in your request details</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 2 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-2/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-gray-100/60 mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900">Service Request Details</h3>
            <span
              style={{ display: 'none' }}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Request
            </span>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-6">
              <div className="lg:col-span-2">
                <p className="text-base text-gray-600 mb-6">Please fill in the service request details to proceed.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative" ref={stRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select
                      value={serviceType}
                      onChange={(e) => handleServiceTypeChange(e.target.value)}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      <option value=""></option>
                      {sortedServiceTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !serviceType ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={() => setStOpen((s) => !s)}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                      >
                        {serviceType || 'Select Service Type'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStOpen((s) => !s)}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open service type options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    {attempted && !serviceType && <p className="text-xs text-red-600 mt-1">Please select a service type.</p>}

                    {stOpen && (
                      <PopList
                        items={sortedServiceTypes}
                        value={serviceType}
                        onSelect={(v) => {
                          handleServiceTypeChange(v);
                          setStOpen(false);
                        }}
                        fullWidth
                        title="Select Service Type"
                        clearable
                        onClear={() => {
                          handleServiceTypeChange('');
                          setStOpen(false);
                        }}
                      />
                    )}
                  </div>

                  <div className="relative" ref={taskRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Task</label>
                    <select
                      value={serviceTask}
                      onChange={(e) => setServiceTask(e.target.value)}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                      disabled={!serviceType}
                    >
                      <option value=""></option>
                      {serviceType && serviceTasks[serviceType].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !serviceTask ? 'border-red-500' : 'border-gray-300'
                      } ${!serviceType ? 'opacity-60 cursor-not-allowed' : ''} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={() => serviceType && setTaskOpen((s) => !s)}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                        disabled={!serviceType}
                      >
                        {serviceTask ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{serviceTask}</span>
                            <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{getSelectedTaskRate()}</span>
                          </div>
                        ) : (
                          <span>Select Service Task</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => serviceType && setTaskOpen((s) => !s)}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open service task options"
                        disabled={!serviceType}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    {attempted && !serviceTask && <p className="text-xs text-red-600 mt-1">Please select a service task.</p>}

                    {taskOpen && (
                      <PopList
                        items={serviceTasks[serviceType] || []}
                        value={serviceTask}
                        onSelect={(v) => {
                          setServiceTask(v);
                          setTaskOpen(false);
                        }}
                        emptyLabel="Select a service type first"
                        fullWidth
                        title="Select Service Task"
                        clearable
                        onClear={() => {
                          setServiceTask('');
                          setTaskOpen(false);
                        }}
                        rightLabel={(it) => {
                          const rr = formatRate(serviceTaskRates?.[serviceType]?.[it]);
                          return shouldShowPerUnit(serviceType) ? withPerUnitLabel(rr) : rr;
                        }}
                      />
                    )}
                  </div>

                  <div className="relative" ref={pdRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && (!preferredDate || isPastDate) ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <input
                        type="text"
                        value={preferredDate ? toMDY(fromYMDLocal(preferredDate)) : ''}
                        onFocus={openPD}
                        readOnly
                        placeholder="mm/dd/yyyy"
                        className="w-full px-4 py-3 rounded-l-xl focus:outline-none"
                        required
                        aria-invalid={attempted && (!preferredDate || isPastDate)}
                      />
                      <button
                        type="button"
                        onClick={openPD}
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
                    {attempted && !preferredDate && <p className="text-xs text-red-600 mt-1">Please choose a date.</p>}
                    {attempted && isPastDate && <p className="text-xs text-red-600 mt-1">Date cannot be in the past.</p>}

                    {pdOpen && (
                      <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-2xl border border-gray-200 bg-white shadow-xl p-3">
                        <div className="flex items-center justify-between px-2 pb-2">
                          <button
                            type="button"
                            onClick={() => canPrevPD() && setPdView(addMonths(pdView, -1))}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${
                              canPrevPD() ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'
                            }`}
                            aria-label="Previous month"
                          >
                            ‹
                          </button>
                          <div className="relative flex items-center gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setPdMonthOpen((v) => !v);
                                  setPdYearOpen(false);
                                }}
                                className="min-w-[120px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                              >
                                {monthsList[pdView.getMonth()]}
                                <span className="ml-2">▾</span>
                              </button>
                              {pdMonthOpen ? (
                                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                  {monthsList.map((m, i) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setPDMonthYear(i, pdView.getFullYear());
                                        setPdMonthOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                        i === pdView.getMonth() ? 'bg-blue-100' : ''
                                      }`}
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setPdYearOpen((v) => !v);
                                  setPdMonthOpen(false);
                                }}
                                className="min-w-[90px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                              >
                                {pdView.getFullYear()}
                                <span className="ml-2">▾</span>
                              </button>
                              {pdYearOpen ? (
                                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                  {yearsList.map((y) => (
                                    <button
                                      key={y}
                                      type="button"
                                      onClick={() => {
                                        setPDMonthYear(pdView.getMonth(), y);
                                        setPdYearOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                        y === pdView.getFullYear() ? 'bg-blue-100' : ''
                                      }`}
                                    >
                                      {y}
                                    </button>
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
                          >
                            ›
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-1">
                              {d}
                            </div>
                          ))}
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
                                    onClick={() => {
                                      handlePreferredDateChange(toYMD(d));
                                      setPdOpen(false);
                                      setPdMonthOpen(false);
                                      setPdYearOpen(false);
                                    }}
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
                            cells.push(
                              <div key={`r-${r}`} className="grid grid-cols-7 gap-1 px-2">
                                {row}
                              </div>
                            );
                          }
                          return <div className="mt-1">{cells}</div>;
                        })()}

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

                  <div className="relative" ref={ptRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !preferredTime ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={openPT}
                        onFocus={openPT}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                        aria-invalid={attempted && !preferredTime}
                      >
                        {preferredTime ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{to12h(preferredTime)}</span>
                            {preferredTimeFeeLabel ? (
                              <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{preferredTimeFeeLabel}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span>hh:mm AM/PM</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={openPT}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open time options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12.5a.75.75 0 00-1.5 0V10c0 .199.079.39.22.53l2.75 2.75a.75.75 0 101.06-1.06l-2.53-2.53V5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    {attempted && !preferredTime && <p className="text-xs text-red-600 mt-1">Please choose a time.</p>}

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

                  <div className="relative" ref={workersRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Workers Needed</label>
                    <select
                      value={workersNeededSafe}
                      onChange={(e) => setWorkersNeeded(clampInt(e.target.value, 1, MAX_WORKERS))}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      {workerOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>

                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !workersNeededSafe ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={() => setWorkersOpen((s) => !s)}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">
                            {workersNeededSafe} worker{workersNeededSafe === 1 ? '' : 's'}
                          </span>
                          {workersFeeLabel ? (
                            <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{workersFeeLabel}</span>
                          ) : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkersOpen((s) => !s)}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open workers options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
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
                          {workersNeededSafe} {workersNeededSafe === 1 ? 'worker' : 'workers'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <span className="text-xs text-gray-700">Extra workers fee</span>
                        <span className={`text-xs font-semibold ${extraWorkersFeeTotal > 0 ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                          {extraWorkersFeeTotal > 0 ? `+ ${formatRate(extraWorkersFeeTotal)}` : '—'}
                        </span>
                      </div>
                    </div>

                    {workersOpen && (
                      <PopList
                        items={workerOptions.map((n) => n)}
                        value={workersNeededSafe}
                        onSelect={(v) => {
                          setWorkersNeeded(clampInt(v, 1, MAX_WORKERS));
                          setWorkersOpen(false);
                        }}
                        fullWidth
                        title="Select Number of Workers"
                        clearable
                        onClear={() => {
                          setWorkersNeeded(1);
                          setWorkersOpen(false);
                        }}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tools Provided?</label>
                    <select
                      value={toolsProvided}
                      onChange={(e) => setToolsProvided(e.target.value)}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>

                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !toolsProvided ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={() => setToolsOpen((s) => !s)}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                      >
                        {toolsProvided || 'Select Yes or No'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setToolsOpen((s) => !s)}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open tools provided options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          />
                        </svg>
                      </button>
                    </div>

                    {attempted && !toolsProvided && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}

                    {toolsOpen && (
                      <PopList
                        items={['Yes', 'No']}
                        value={toolsProvided}
                        onSelect={(v) => {
                          setToolsProvided(v);
                          setToolsOpen(false);
                        }}
                        fullWidth
                        title="Select Tools Provided"
                        clearable
                        onClear={() => {
                          setToolsProvided('');
                          setToolsOpen(false);
                        }}
                      />
                    )}
                  </div>

                  <div className="relative" ref={urgentRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Is The Request Urgent?</label>
                    <select
                      value={isUrgent}
                      onChange={(e) => handleUrgentChange(e.target.value)}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>

                    <div
                      className={`flex items-center rounded-xl border ${
                        attempted && !isUrgent ? 'border-red-500' : 'border-gray-300'
                      } focus-within:ring-2 focus-within:ring-[#008cfc]/40`}
                    >
                      <button
                        type="button"
                        onClick={() => setUrgentOpen((s) => !s)}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                      >
                        {isUrgent || 'Select Yes or No'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgentOpen((s) => !s)}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open urgent options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          />
                        </svg>
                      </button>
                    </div>

                    {attempted && !isUrgent && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}

                    {urgentOpen && (
                      <PopList
                        items={['Yes', 'No']}
                        value={isUrgent}
                        onSelect={(v) => {
                          handleUrgentChange(v);
                          setUrgentOpen(false);
                        }}
                        fullWidth
                        title="Select Urgency"
                        clearable
                        onClear={() => {
                          handleUrgentChange('');
                          setUrgentOpen(false);
                        }}
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
                    <textarea
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="Describe the service you need"
                      className={`w-full px-4 py-3 border ${
                        attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40`}
                      required
                      aria-invalid={attempted && !serviceDescription.trim()}
                    />
                    {attempted && !serviceDescription.trim() && (
                      <p className="text-xs text-red-600 mt-1">Please describe the service.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="text-xl md:text-2xl font-semibold mb-3 text-center">Request Image</div>
                <p className="text-base text-gray-600 text-center mb-5">
                  Upload an image to help describe the service request or what you need done.
                </p>

                <div className="space-y-4">
                  <div className="w-full flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="rounded-md bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077d6] transition w-full shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                    >
                      Choose Photo
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImageName('');
                          setAttachments([]);
                          setRequestImageUrl('');
                          localStorage.removeItem(IMAGE_CACHE_KEY);
                          localStorage.removeItem(IMAGE_REFRESH_FLAG);
                        }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition w-full"
                      >
                        Remove
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </div>

                  {imageName && <p className="text-xs text-gray-600 truncate text-center">Selected: {imageName}</p>}
                  {attempted && !image && <p className="text-xs text-red-600 text-center">Please upload an image.</p>}

                  <div className="mt-2">
                    {image ? (
                      <div className="w-full h-[273px] bg-white rounded-xl overflow-hidden ring-2 ring-blue-100 shadow-sm">
                        <img src={image} alt="Uploaded Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className={`w-full h-[308px] rounded-xl flex items-center justify-center ${
                          attempted ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <span>No Image Selected</span>
                      </div>
                    )}
                  </div>

                  {requestImageUrl && <input type="hidden" name="request_image_url" value={requestImageUrl} readOnly />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={onBackClick}
            className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
          >
            Back : Personal Information
          </button>

          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${
              isFormValid ? 'bg-[#008cfc] text-white hover:bg-[#0077d6]' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40`}
            aria-disabled={!isFormValid}
          >
            Next : Service Rate
          </button>
        </div>
      </form>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
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
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w=[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
              <div className="text-lg font-semibold text-gray-900">Preparing Step 3</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 1"
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
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
              <div className="text-lg font-semibold text-gray-900">Back to Step 1</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientServiceRequestDetails;
