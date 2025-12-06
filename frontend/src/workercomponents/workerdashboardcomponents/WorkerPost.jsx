import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function getWorkerProfile() {
  let firstName = '';
  let gender = '';
  try {
    const auth = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    if (auth) {
      firstName = auth.first_name || auth.firstname || auth.firstName || firstName;
      gender = auth.gender || auth.sex || auth.gender_identity || gender;
    }
  } catch {}
  try {
    const profileRaw =
      localStorage.getItem('workerProfile') ||
      localStorage.getItem('worker_profile') ||
      localStorage.getItem('profile');
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      firstName = firstName || profile.first_name || profile.firstname || profile.firstName || '';
      gender = gender || profile.gender || profile.sex || '';
    }
  } catch {}
  firstName =
    String(
      firstName ||
        localStorage.getItem('first_name') ||
        localStorage.getItem('firstname') ||
        localStorage.getItem('firstName') ||
        ''
    ).trim();
  gender = String(gender || localStorage.getItem('gender') || localStorage.getItem('sex') || '').trim();
  return { firstName, gender };
}

function getWorkerEmail() {
  try {
    const auth = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    if (auth && auth.email) return auth.email;
  } catch {}
  return (
    localStorage.getItem('workerEmail') ||
    localStorage.getItem('worker_email') ||
    localStorage.getItem('email_address') ||
    localStorage.getItem('email') ||
    ''
  );
}

function honorificFromGender(g) {
  const s = String(g || '').trim().toLowerCase();
  if (s === 'male' || s === 'm' || s === 'man' || s === 'mr') return 'Mr.';
  if (s === 'female' || s === 'f' || s === 'woman' || s === 'ms' || s === 'mrs' || s === 'email') return 'Ms.';
  return '';
}

function toBoolStrict(v) {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  const s = String(v ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', 't'].includes(s)) return true;
  if (['no', 'n', 'false', 'f'].includes(s)) return false;
  return null;
}

function timeAgo(input) {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d)) return '';
  const ms = Date.now() - d.getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`;
  const dys = Math.floor(h / 24);
  if (dys < 30) return `${dys} day${dys === 1 ? '' : 's'}`;
  const mo = Math.floor(dys / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'}`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'}`;
}

function WorkerPost() {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState([]);
  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const [workerFirstName, setWorkerFirstName] = useState('');
  const [workerGender, setWorkerGender] = useState('');

  const [currentApp, setCurrentApp] = useState(null);

  const PER_PAGE = 3;

  const banners = ['/Banner1.png', '/Banner2.png'];

  const [bannerIdx, setBannerIdx] = useState(0);
  const [dotStep, setDotStep] = useState(0);

  const navigate = useNavigate();
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteBusy, setShowDeleteBusy] = useState(false);
  const [showDeleteDone, setShowDeleteDone] = useState(false);

  const [showViewLoading, setShowViewLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const getServiceTasks = (item) => {
    const d = item?.details || item?.work || item?.work_information || {};
    const raw = d.service_task || item?.service_task || null;
    if (Array.isArray(raw)) {
      const parts = [];
      for (const seg of raw) {
        const tasks = Array.isArray(seg?.tasks) ? seg.tasks.filter(Boolean).map(String) : [];
        for (const t of tasks) if (String(t).trim()) parts.push(String(t).trim());
      }
      return parts;
    }
    if (raw && typeof raw === 'object') {
      const parts = [];
      for (const v of Object.values(raw)) {
        const arr = Array.isArray(v) ? v : [v];
        for (const t of arr) if (String(t).trim()) parts.push(String(t).trim());
      }
      return parts;
    }
    return [];
  };

  const getServiceTasksText = (item) => {
    const arr = getServiceTasks(item);
    return arr.length ? arr.join(' • ') : '';
  };

  const allowedPHPrefixes = useMemo(
    () =>
      new Set([
        '905','906','907','908','909','910','912','913','914','915','916','917','918','919','920','921','922','923','925','926','927','928','929','930','931','932','933','934','935','936','937','938','939','940','941','942','943','944','945','946','947','948','949','950','951','952','953','954','955','956','957','958','959','960','961','962','963','964','965','966','967','968','969','970','971','972','973','974','975','976','977','978','979','980','981','982','983','984','985','986','987','988','989','990','991','992','993','994','995','996','997','998','999'
      ]),
    []
  );
  const isTriviallyFake = (d) =>
    /^(\d)\1{9}$/.test(d) ||
    ('9' + d).includes('0123456789') ||
    ('9' + d).includes('9876543210') ||
    new Set(d.split('')).size < 4;
  const isValidPHMobile = (d) =>
    d && d.length === 10 && d[0] === '9' && !isTriviallyFake(d) && allowedPHPrefixes.has(d.slice(0, 3));

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au =
        a.auth_uid ||
        a.authUid ||
        a.uid ||
        a.id ||
        localStorage.getItem('auth_uid') ||
        '';
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
  }, []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  const checkProfileComplete = () => {
    try {
      const raw = localStorage.getItem('workerInformationForm');
      if (!raw) return false;
      const d = JSON.parse(raw);
      const phone = String(d.contactNumber || '').replace(/\D/g, '');
      const dob = String(d.date_of_birth || '').trim();
      return isValidPHMobile(phone) && !!dob;
    } catch {
      return false;
    }
  };

  const checkProfileCompleteServer = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/workers/me`, {
        withCredentials: true,
        headers: headersWithU
      });
      const phone = String(data?.phone || '').replace(/\D/g, '');
      const dob = String(data?.date_of_birth || '').trim();
      return isValidPHMobile(phone) && !!dob;
    } catch {
      return null;
    }
  };

  const handleBecomeWorkerClick = async (e) => {
    e.preventDefault();
    if (navLoading) return;
    let ok = await checkProfileCompleteServer();
    if (ok === null) ok = checkProfileComplete();
    if (!ok) {
      setShowProfileGate(true);
      return;
    }
    setNavLoading(true);
    setTimeout(() => {
      navigate('/workerpostapplication');
    }, 2000);
  };

  const getRateType = (item) => {
    const d = item?.rate || item?.details || {};
    const raw =
      d.rate_type ||
      d.pricing_type ||
      d.price_rate ||
      d.service_price_rate ||
      '';
    if (!raw) return '';
    const s = String(raw).toLowerCase();
    if (s.includes('hour')) return 'Hourly Rate';
    if (s.includes('job') || s.includes('fixed') || s.includes('project') || s.includes('task')) return 'By the Job';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const parseMaybeArray = (v) => {
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    const s = String(v ?? '').trim();
    if (!s) return [];
    try {
      const x = JSON.parse(s);
      return Array.isArray(x) ? x.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  };

  const getWorkDescription = (item) => {
    const d = item?.details || item?.work || item?.work_information || {};
    return d.work_description || item?.work_description || item?.service_description || '';
  };

  const getYearsExperience = (item) => {
    const d = item?.details || item?.work || item?.work_information || {};
    const v = d.years_experience ?? item?.years_experience;
    if (v === 0) return '0';
    return v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '';
  };

  const getToolsProvided = (item) => {
    const d = item?.details || item?.work || item?.work_information || {};
    const raw = d.tools_provided ?? item?.tools_provided ?? item?.tools_provide ?? '';
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    const s = String(raw).trim().toLowerCase();
    if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
    if (['no', 'n', 'false', '0'].includes(s)) return 'No';
    return String(raw || '');
  };

  useEffect(() => {
    if (!navLoading && !showViewLoading && !editLoading) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [navLoading, showViewLoading, editLoading]);

  useEffect(() => {
    const { firstName, gender } = getWorkerProfile();
    if (firstName) setWorkerFirstName(firstName);
    if (gender) setWorkerGender(gender);
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    const { firstName, gender } = getWorkerProfile();
    if (firstName) setWorkerFirstName(firstName);
    if (gender) setWorkerGender(gender);
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    setBannerIdx(0);
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length);
    }, 10000);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    const id = setInterval(() => setDotStep((s) => (s + 1) % 4), 350);
    return () => clearInterval(id);
  }, []);

  const totalSlides = Math.max(1, Math.ceil(approved.length / 3));

  const recomputePositions = () => {
    const base = cardRefs.current[0]?.offsetLeft || 0;
    const cardPositions = cardRefs.current.map((el) => Math.max(0, (el?.offsetLeft || 0) - base));
    const slidePositions = [];
    for (let i = 0; i < cardPositions.length; i += 3) slidePositions.push(cardPositions[i]);
    setPositions(slidePositions);
  };

  useEffect(() => {
    recomputePositions();
    const onResize = () => recomputePositions();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [approved.length]);

  const scrollToIndex = (idx) => {
    const wrap = trackRef.current;
    if (!wrap || !positions.length) return;
    const clamped = Math.max(0, Math.min(totalSlides - 1, idx));
    wrap.scrollTo({ left: positions[clamped] || 0, behavior: 'smooth' });
    setCurrent(clamped);
  };

  const handleScroll = (direction) => {
    const next = direction === 'left' ? current - 1 : current + 1;
    scrollToIndex(next);
  };

  const onTrackScroll = () => {
    const wrap = trackRef.current;
    if (!wrap || !positions.length) return;
    const sl = wrap.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - sl) < Math.abs(positions[nearest] - sl)) nearest = i;
    }
    if (nearest !== current) setCurrent(nearest);
  };

  const getServiceIcon = (serviceTypeRaw = '') => {
    const s = String(serviceTypeRaw).toLowerCase();
    if (s.includes('carpent')) return Hammer;
    if (s.includes('electric')) return Zap;
    if (s.includes('plumb')) return Wrench;
    if (s.includes('car wash')) return Car;
    if (s.includes('car washing')) return Car;
    if (s.includes('laundry')) return Shirt;
    return Hammer;
  };

  const isPointerDownRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startXRef = useRef(0);
  const startLeftRef = useRef(0);
  const movedRef = useRef(false);

  const snapToNearestSlide = () => {
    const wrap = trackRef.current;
    if (!wrap || !positions.length) return;
    const sl = wrap.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - sl) < Math.abs(positions[nearest] - sl)) nearest = i;
    }
    scrollToIndex(nearest);
  };

  const onDragPointerDown = (e) => {
    const wrap = trackRef.current;
    if (!wrap) return;
    isPointerDownRef.current = true;
    movedRef.current = false;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startLeftRef.current = wrap.scrollLeft;
    wrap.setPointerCapture?.(e.pointerId);
    wrap.classList.add('drag-active');
  };

  const onDragPointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const wrap = trackRef.current;
    if (!wrap) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) movedRef.current = true;
    wrap.scrollLeft = startLeftRef.current - dx;
  };

  const onDragPointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const wrap = trackRef.current;
    const pid = e?.pointerId ?? pointerIdRef.current;
    if (wrap && pid != null) {
      try {
        wrap.releasePointerCapture?.(pid);
      } catch {}
      wrap.classList.remove('drag-active');
    }
    pointerIdRef.current = null;
    snapToNearestSlide();
  };

  const onDragPointerLeave = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const wrap = trackRef.current;
    if (wrap) wrap.classList.remove('drag-active');
    pointerIdRef.current = null;
    snapToNearestSlide();
  };

  const onTrackClickCapture = (e) => {
    if (movedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      movedRef.current = false;
    }
  };

  const honorific = honorificFromGender(workerGender);
  const capFirst = workerFirstName ? workerFirstName.charAt(0).toUpperCase() + workerFirstName.slice(1) : 'Worker';

  const buildLocation = (item) => {
    const barangay = item?.info?.barangay ?? item?.details?.barangay ?? item?.details?.brgy ?? item?.barangay ?? '';
    const street = item?.info?.street ?? item?.details?.street ?? item?.details?.street_name ?? item?.street ?? '';
    const parts = [];
    if (barangay) parts.push(String(barangay));
    if (street) parts.push(street);
    return parts.join(', ');
  };

  const buildServiceType = (item) => {
    const d = item?.work || item?.work_information || item?.workinfo || item?.details || {};
    const st = d.service_types || d.service_type || d.primary_service || item?.service_types || [];
    if (Array.isArray(st) && st.length) return st[0];
    return typeof st === 'string' && st ? st : '';
  };

  const SHOW_CAROUSEL = false;

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasCurrent = !!currentApp;
  const statusLower = String(currentApp?.status || '').toLowerCase();
  const isPending = statusLower === 'pending';
  const isApproved = statusLower === 'approved';
  const createdAt = currentApp?.created_at || '';
  const createdAgo = createdAt ? timeAgo(createdAt) : '';

  const profileUrl = useMemo(() => {
    const u = currentApp?.info?.profile_picture_url || '';
    if (u) return u;
    const name = capFirst || 'Worker';
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
  }, [currentApp, capFirst]);

  const currentWorkDescription = useMemo(() => getWorkDescription(currentApp), [currentApp]);
  const currentYearsExperience = useMemo(() => getYearsExperience(currentApp), [currentApp]);
  const currentToolsProvided = useMemo(() => getToolsProvided(currentApp), [currentApp]);
  const currentServiceTasks = useMemo(() => getServiceTasksText(currentApp), [currentApp]);

  const toolsBoolLocal = useMemo(() => {
    const d = currentApp?.details || currentApp?.work || currentApp?.work_information || {};
    const raw =
      (d && (d.tools_provided ?? d.tools_provide)) ??
      currentApp?.tools_provided ??
      currentApp?.tools_provide ??
      currentToolsProvided;
    return toBoolStrict(raw);
  }, [currentApp, currentToolsProvided]);

  const toolsTextLocal =
    toolsBoolLocal === null
      ? (currentToolsProvided ? String(currentToolsProvided) : '-')
      : toolsBoolLocal
      ? 'Yes'
      : 'No';

  const toolsClassLocal = 'text-[#008cfc] font-semibold';

  const getGroupId = (it) => {
    const g =
      it?.application_group_id ??
      it?.group_id ??
      it?.groupId ??
      it?.group ??
      it?.request_group_id ??
      it?.id;
    return g ? String(g) : '';
  };

  const preloadViewPayload = async (gid) => {
    try {
      const email = getWorkerEmail();
      const { data } = await axios.get(`${API_BASE}/api/workerapplications`, {
        withCredentials: true,
        headers: headersWithU,
        params: { scope: 'current', email, groupId: gid }
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const row = items.find(r => String(r.request_group_id) === String(gid)) || items[0] || null;
      if (row) {
        try { sessionStorage.setItem('wa_view_payload', JSON.stringify(row)); } catch {}
        navigate(`/current-work-post/${encodeURIComponent(gid)}`, { state: { row } });
        return;
      }
    } catch {}
    navigate(`/current-work-post/${encodeURIComponent(gid)}`);
  };

  const handleView = (item) => {
    setShowViewLoading(true);
    const gid = getGroupId(item);
    if (gid) {
      preloadViewPayload(gid);
    } else {
      navigate('/workerpostapplication');
    }
  };

  const buildServiceTypesArr = (item) => {
    const d = item?.work || item?.work_information || item?.workinfo || item?.details || {};
    const raw =
      d.service_types ??
      d.service_type ??
      d.primary_service ??
      item?.service_types ??
      item?.service_type ??
      item?.primary_service ??
      [];
    const arr = parseMaybeArray(raw);
    if (arr.length) return arr;
    if (Array.isArray(raw)) return raw.filter(Boolean).map((x) => String(x));
    const s = String(raw || '').trim();
    if (s) return [s];
    return [];
  };

  const buildServiceTypesText = (item) => {
    const arr = buildServiceTypesArr(item);
    return arr.length ? arr.join(' • ') : buildServiceType(item) || 'Service';
  };

  const confirmDeleteNow = () => {
    if (!deleteTarget?.id || deleting) return;
    setShowDeleteConfirm(false);
    setShowDeleteBusy(true);
    setDeleting(true);
    const doDelete = async () => {
      try {
        await axios.delete(`${API_BASE}/api/workerapplications/${encodeURIComponent(deleteTarget.id)}`, {
          withCredentials: true,
          headers: headersWithU}
        );
        if (deleteTarget.label === 'current') {
          setCurrentApp(null);
        } else {
          setApproved((prev) =>
            prev.filter((it) => String(it?.id || it?.request_group_id || '') !== deleteTarget.id)
          );
        }
        setShowDeleteBusy(false);
        setShowDeleteDone(true);
      } catch {
        setShowDeleteBusy(false);
      } finally {
        setDeleting(false);
        setDeleteTarget(null);
      }
    };
    doDelete();
  };

  const loadCurrentApplication = async () => {
    try {
      const email = getWorkerEmail();
      const { data } = await axios.get(`${API_BASE}/api/workerapplications`, {
        withCredentials: true,
        headers: headersWithU,
        params: { scope: 'current', email }
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const pick =
        items.find((r) => String(r.status || '').toLowerCase() === 'pending') ||
        items.find((r) => String(r.status || '').toLowerCase() === 'approved') ||
        items[0] ||
        null;
      setCurrentApp(pick);
    } catch {
      setCurrentApp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentApplication();
  }, [appU]);

  useEffect(() => {
    const onSubmitted = () => loadCurrentApplication();
    const onFocus = () => loadCurrentApplication();
    window.addEventListener('worker-application-submitted', onSubmitted);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('worker-application-submitted', onSubmitted);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleEditApplication = () => {
    const gid = getGroupId(currentApp);
    if (!gid || editLoading) return;
    setEditLoading(true);
    setTimeout(() => {
      navigate(`/edit-work-application/${encodeURIComponent(gid)}`);
    }, 2000);
  };

  useEffect(() => {
    const lock = showDeleteConfirm || showDeleteBusy || showDeleteDone;
    if (!lock) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [showDeleteConfirm, showDeleteBusy, showDeleteDone]);

  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <div className="w-full overflow-hidden rounded-md border border-gray-200 shadow-sm mb-8">
        <div className="relative h-36 sm:h-44 md:h-52 lg:h-72">
          {['/Banner1.png', '/Banner2.png'].map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
                i === bannerIdx ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mb-12 flex items-center justify-between">
        <h2 className="text-4xl font-semibold">
          Welcome, {honorific ? `${honorific} ` : ''}<span className="text-[#008cfc]">{capFirst}</span>
        </h2>
        {false && hasCurrent && (
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-semibold">Status:</span>
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="h-3 w-3 rounded-md bg-current opacity-30" />
                Approved Application
              </span>
            )}
            {isPending && (
              <span className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
                <span className="relative inline-flex">
                  <span className="absolute inline-flex h-3 w-3 rounded-md bg-current opacity-30 animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-md bg-current" />
                </span>
                Pending Application
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">{hasCurrent ? 'Current Work Application' : 'Work Application Post'}</h3>
          {hasCurrent && (
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold">Status:</span>
              {isApproved && (
                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span className="h-3 w-3 rounded-md bg-current opacity-30" />
                  Approved Application
                </span>
              )}
              {isPending && (
                <span className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
                  <span className="relative inline-flex">
                    <span className="absolute inline-flex h-3 w-3 rounded-md bg-current opacity-30 animate-ping" />
                    <span className="relative inline-flex h-3 w-3 rounded-md bg-current" />
                  </span>
                  Pending Application
                </span>
              )}
            </div>
          )}
        </div>

        {hasCurrent ? (
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0">
                  <img
                    src={profileUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-blue-300"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
                        capFirst || 'Worker'
                      )}`;
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xl md:text-2xl font-semibold truncate">
                    <span className="text-gray-700">Service Type:</span>{' '}
                    <span className="text-gray-900">{buildServiceTypesText(currentApp)}</span>
                  </div>
                  <div className="mt-1 text-base md:text-lg truncate">
                    <span className="font-semibold text-gray-700">Service Tasks:</span>{' '}
                    <span className="text-gray-900">{currentServiceTasks || '-'}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{createdAgo ? `Created ${createdAgo} ago` : ''}</div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 md:gap-x-16 text-base text-gray-700">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="text-gray-700 font-semibold">Barangay:</span>
                        <span className="text-[#008cfc] font-semibold">{buildLocation(currentApp) || '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="text-gray-700 font-semibold">Years of Experience:</span>
                        <span className="text-[#008cfc] font-semibold">
                          {currentYearsExperience !== '' &&
                          currentYearsExperience !== null &&
                          currentYearsExperience !== undefined
                            ? String(currentYearsExperience)
                            : '-'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="text-gray-700 font-semibold">Tools Provided:</span>
                        <span className={toolsClassLocal}>{toolsTextLocal}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:pl-10">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="text-gray-700 font-semibold">Rate Type:</span>
                        <span className="text-[#008cfc] font-semibold">{getRateType(currentApp) || '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="text-gray-700 font-semibold">Service Rate:</span>
                        <span className="text-[#008cfc] font-semibold">
                          {(() => {
                            const d = currentApp?.rate || currentApp?.details || {};
                            const t = String(d?.rate_type || '').toLowerCase();
                            const from = d?.rate_from;
                            const to = d?.rate_to;
                            const val = d?.rate_value;
                            const peso = (v) => {
                              if (v === null || v === undefined) return '';
                              const s = String(v).trim();
                              if (!s) return '';
                              if (/₱|php/i.test(s)) return s;
                              const n = parseFloat(s.replace(/,/g, ''));
                              if (!isNaN(n)) return `₱${n.toLocaleString()}`;
                              return `₱${s}`;
                            };
                            if (t.includes('job') || t.includes('fixed')) return val ? `${peso(val)}` : '-';
                            if (t.includes('hour') || t.includes('range'))
                              return from || to
                                ? `${from ? peso(from) : ''}${from && to ? ' - ' : ''}${to ? peso(to) : ''}`
                                : '-';
                            if (val) return peso(val);
                            if (from || to)
                              return `${from ? peso(from) : ''}${from && to ? ' - ' : ''}${to ? peso(to) : ''}`;
                            return '-';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {false && isApproved && (
                  <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="h-3 w-3 rounded-md bg-current opacity-30" />
                    Approved Application
                  </span>
                )}
                {false && isPending && (
                  <span className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
                    <span className="relative inline-flex">
                      <span className="absolute inline-flex h-3 w-3 rounded-md bg-current opacity-30 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-md bg-current" />
                    </span>
                    Pending Application
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {(() => {
                    const types = buildServiceTypesArr(currentApp);
                    const srcs = types.length ? types : [buildServiceType(currentApp) || currentApp?.details?.work_description || ''];
                    return srcs.map((t, i) => {
                      const Icon = getServiceIcon(t);
                      return (
                        <div
                          key={`${t}-${i}`}
                          className="h-10 w-10 rounded-lg border border-gray-300 text-[#008cfc] flex items-center justify-center"
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            <div className="-mt-9 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleView(currentApp)}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                View
              </button>
              <button
                type="button"
                onClick={handleEditApplication}
                className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
              >
                Edit Application
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentApp) return;
                  setDeleteTarget({ id: currentApp.id || currentApp.request_group_id || '', label: 'current' });
                  setShowDeleteConfirm(true);
                }}
                className="h-10 w-10 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center"
                aria-label="Delete Application"
                title="Delete Application"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <img src="/Resume.png" alt="Resume" className="w-20 h-20 object-contain" />
            </div>
            <p className="text-gray-600 mb-4">
              {loading
                ? 'Checking for applications…'
                : 'Start by posting your application to get hired for home service jobs.'}
            </p>
            <Link
              to="/workerpostapplication"
              onClick={handleBecomeWorkerClick}
              className={`inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition ${
                hasCurrent ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              + Become a worker
            </Link>
          </div>
        )}
      </div>

      {false && approved.length > 0 && (
        <div className="mb-8">
          <div className="relative w-full flex justify-center items-center">
            <button
              onClick={() => handleScroll('left')}
              className="absolute -left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
            >
              <ArrowLeft size={22} />
            </button>

            <div className="w-full max-w-[1425px] overflow-hidden px-12 py-2">
              <div
                ref={trackRef}
                onScroll={onTrackScroll}
                onPointerDown={onDragPointerDown}
                onPointerMove={onDragPointerMove}
                onPointerUp={onDragPointerUp}
                onPointerLeave={onDragPointerLeave}
                onClickCapture={onTrackClickCapture}
                className="flex space-x-6 overflow-x-scroll scroll-smooth pl-4 pr-4 select-none cursor-grab active:cursor-grabbing [touch-action:pan-x] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {approved.map((item, i) => {
                  const type = buildServiceType(item) || '';
                  const title = type || 'Approved Application';
                  const IconComp = getServiceIcon(type);
                  const years =
                    item?.details?.years_experience ??
                    item?.experience?.years ??
                    item?.details?.yearsExperience ??
                    '';
                  const tools =
                    item?.details?.tools_provided ??
                    item?.details?.tools_provide ??
                    item?.details?.toolsProvided ??
                    item?.tools?.provided ??
                    '';

                  const tBool = toBoolStrict(tools);
                  const tText =
                    tBool === null ? (String(tools || '').trim() || '-') : tBool ? 'Yes' : 'No';
                  const tClass =
                    tBool === null ? 'text-gray-700' : tBool ? 'text-green-600 font-medium' : 'text-red-600 font-medium';

                  return (
                    <div
                      key={item.id || i}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="overflow-hidden min-w-[320px] sm:min-w-[360px] md:min-w-[400px] w-[320px] sm:w-[360px] md:w-[400px] h-auto min-h-[220px] flex flex-col flex-shrink-0 border rounded-xl p-6 text-left cursor-default shadow-sm transition-all duration-300 hover:ring-2 hover:shadow-xl hover:ring-inset bg-blue-50 border-[#008cfc] hover:border-[#008cfc] hover:ring-[#008cfc]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-lg font-semibold text-gray-900">{title}</div>
                        <div className="h-9 w-9 rounded-lg border border-gray-400 text-[#008cfc] flex items-center justify-center bg-white">
                          <IconComp className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Location:</span> {buildLocation(item) || '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Years of Experience:</span>{' '}
                          {years !== '' && years !== null && years !== undefined ? String(years) : '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Tools Provided:</span>{' '}
                          <span className={tClass}>{tText}</span>
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Service Price Rate:</span> {getRateType(item) || '-'}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <div className="inline-flex items-center !h-11 whitespace-nowrap rounded-lg border border-yellow-200 bg-yellow-50 px-3 text-xs font-medium text-yellow-700">
                          Active Application
                          <span className="ml-2 inline-flex w-6 justify-between font-mono">
                            <span className={`transition-opacity duration-200 ${dotStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                            <span className={`transition-opacity duration-200 ${dotStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                            <span className={`transition-opacity duration-200 ${dotStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(item)}
                            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const gid = getGroupId(item);
                              if (!gid || editLoading) return;
                              setEditLoading(true);
                              setTimeout(() => {
                                navigate(`/edit-work-application/${encodeURIComponent(gid)}`);
                              }, 2000);
                            }}
                            className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
                          >
                            Edit Application
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const id = item?.id || item?.request_group_id || '';
                              if (!id) return;
                              setDeleteTarget({ id, label: 'item' });
                              setShowDeleteConfirm(true);
                            }}
                            className="h-10 w-10 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            aria-label="Delete Application"
                            title="Delete Application"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => handleScroll('right')}
              className="absolute -right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
            >
              <ArrowRight size={22} />
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`h-2.5 w-2.5 rounded-full ${current === i ? 'bg-blue-600' : 'bg-gray-300'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {navLoading && (
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
              <div className="text-base font-semibold text-gray-900">Preparing Step</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showProfileGate ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfileGate(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483648]">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">
                Please setup your personal information first to proceed
              </div>
              <div className="text-sm text-gray-600">
                Contact Number and Date of Birth are required. Social links are optional.
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowProfileGate(false)}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <Link
                to="/worker-account-settings"
                onClick={() => {
                  setShowProfileGate(false);
                  goTop();
                }}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition text-center"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">
                Are you sure do you get to delete this application?
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmDeleteNow}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteBusy && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
            <div className="mt-4 text-center">
              <div className="text-base font-semibold text-gray-900">Deleting Application</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait</div>
            </div>
          </div>
        </div>
      )}

      {showDeleteDone && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteDone(false)} />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Application Successfully Deleted</div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteDone(false)}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewLoading && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading request"
            tabIndex={-1}
            className="relative w-[340px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]"
          >
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderRightColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc1f]" />
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
              <div className="text-lg font-semibold text-gray-900">Loading Request</div>
              <div className="text-sm text-gray-500">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {editLoading && (
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
    </div>
  );
}

export default WorkerPost;
