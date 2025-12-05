import React, { useEffect, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function getClientEmail() {
  try {
    const auth = JSON.parse(localStorage.getItem('clientAuth') || '{}');
    if (auth && auth.email) return auth.email;
  } catch {}
  return (
    localStorage.getItem('clientEmail') ||
    localStorage.getItem('client_email') ||
    localStorage.getItem('email_address') ||
    localStorage.getItem('email') ||
    ''
  );
}

function getClientProfile() {
  let firstName = '';
  let gender = '';
  try {
    const auth = JSON.parse(localStorage.getItem('clientAuth') || '{}');
    if (auth) {
      firstName = auth.first_name || auth.firstname || auth.firstName || firstName;
      gender = auth.gender || auth.sex || auth.gender_identity || gender;
    }
  } catch {}
  try {
    const profileRaw =
      localStorage.getItem('clientProfile') ||
      localStorage.getItem('client_profile') ||
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

function honorificFromGender(g) {
  const s = String(g || '').trim().toLowerCase();
  if (s === 'male' || s === 'm' || s === 'man' || s === 'mr') return 'Mr.';
  if (s === 'female' || s === 'f' || s === 'woman' || s === 'ms' || s === 'mrs' || s === 'email') return 'Ms.';
  return '';
}

function dateOnlyFrom(val) {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split('T')[0].split(' ')[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token))) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isExpired(val) {
  const d = dateOnlyFrom(val);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function toBoolStrictClient(v) {
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

function parsePreferredTime(val) {
  if (!val) return { h: 23, m: 59 };
  const s = String(val).trim().replace(/\./g, '');
  let m;
  if ((m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s))) {
    let h = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3] ? m[3].toLowerCase() : '';
    if (ap === 'am') {
      if (h === 12) h = 0;
    } else if (ap === 'pm') {
      if (h !== 12) h = (h % 12) + 12;
    }
    if (!ap && h === 24) h = 0;
    return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, mm)) };
  }
  if ((m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s))) {
    const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
    const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
    return { h, m: mm };
  }
  return { h: 23, m: 59 };
}

function isExpiredPreferred(dateVal, timeVal) {
  const d = dateOnlyFrom(dateVal);
  if (!d) return false;
  const { h, m } = parsePreferredTime(timeVal);
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
  return dt.getTime() < Date.now();
}

const ClientPost = () => {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState([]);
  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const [clientFirstName, setClientFirstName] = useState('');
  const [clientGender, setClientGender] = useState('');

  const PER_PAGE = 3;

  const banners = ['/Banner1.png', '/Banner2.png'];

  const [bannerIdx, setBannerIdx] = useState(0);
  const [dotStep, setDotStep] = useState(0);

  const navigate = useNavigate();
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);

  const [currentItems, setCurrentItems] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteBusy, setShowDeleteBusy] = useState(false);
  const [showDeleteDone, setShowDeleteDone] = useState(false);

  const buildAppU = () => {
    try {
      const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
      const au =
        a.auth_uid ||
        a.authUid ||
        a.uid ||
        a.id ||
        localStorage.getItem('auth_uid') ||
        '';
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

  const checkProfileComplete = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/clients/me`, {
        withCredentials: true,
        headers: headersWithU,
      });
      const phone = String(data?.phone || '').trim();
      const dob = String(data?.date_of_birth || '').trim();
      const phoneOk = isValidPHMobile(phone);
      const dobOk = !!dob;
      return phoneOk && dobOk;
    } catch {
      return false;
    }
  };

  const handlePostClick = async (e) => {
    e.preventDefault();
    if (navLoading) return;
    if (currentItems.length > 0) return;
    const ok = await checkProfileComplete();
    if (!ok) {
      setShowProfileGate(true);
      return;
    }
    setNavLoading(true);
    setTimeout(() => {
      navigate('/clientpostrequest');
    }, 2000);
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

    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [navLoading]);

  useEffect(() => {
    const { firstName, gender } = getClientProfile();
    if (firstName) setClientFirstName(firstName);
    if (gender) setClientGender(gender);
  }, []);

  const FETCH_REQUESTS = false;

  useEffect(() => {
    if (!FETCH_REQUESTS) {
      setLoading(false);
      return;
    }
    const email = getClientEmail();
    if (!email) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/api/clientservicerequests/approved`, {
        params: { email, limit: 10 },
        withCredentials: true,
      })
      .then((res) => {
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        const filtered = items.filter((it) => !isExpiredPreferred(it?.details?.preferred_date, it?.details?.preferred_time));
        const normalized = filtered.map((it) => {
          const d = { ...(it.details || {}) };
          const b = toBoolStrictClient(d.is_urgent);
          if (b !== null) d.is_urgent = b ? 'Yes' : 'No';
          const t = toBoolStrictClient(d.tools_provided);
          if (t !== null) d.tools_provided = t ? 'Yes' : 'No';
          return { ...it, details: d };
        });
        setApproved(normalized);
        setCurrent(0);
        if (normalized.length) {
          const first = normalized[0];
          const fn =
            first?.info?.first_name ||
            first?.details?.first_name ||
            first?.info?.firstname ||
            first?.details?.firstname ||
            '';
          const g =
            first?.info?.gender ||
            first?.details?.gender ||
            first?.info?.sex ||
            first?.details?.sex ||
            '';
          setClientFirstName((prev) => prev || (fn ? String(fn).trim() : ''));
          setClientGender((prev) => prev || (g ? String(g).trim() : ''));
        }
      })
      .catch(() => setApproved([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const loadCurrent = async () => {
      try {
        const email = getClientEmail();
        const { data } = await axios.get(`${API_BASE}/api/client/service-requests`, {
          withCredentials: true,
          headers: headersWithU,
          params: { email }
        });
        const items = Array.isArray(data?.items) ? data.items : [];
        const filtered = items.filter((it) => {
          const stat = String(it?.status || it?.details?.status || '').toLowerCase();
          if (stat === 'declined') return false;
          const d = it?.details?.preferred_date;
          const t = it?.details?.preferred_time;
          return !isExpiredPreferred(d, t);
        });
        setCurrentItems(filtered);
      } catch {
        setCurrentItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadCurrent();
  }, [appU]);

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
    const id = setInterval(() => {
      setDotStep((s) => (s + 1) % 4), 350
    });
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentItems((prev) => prev.filter((it) => !isExpiredPreferred(it?.details?.preferred_date, it?.details?.preferred_time)));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const hasApproved = false;

  const totalSlides = Math.max(1, Math.ceil(approved.length / PER_PAGE));

  const recomputePositions = () => {
    const base = cardRefs.current[0]?.offsetLeft || 0;
    const cardPositions = cardRefs.current.map((el) => Math.max(0, (el?.offsetLeft || 0) - base));
    const slidePositions = [];
    for (let i = 0; i < cardPositions.length; i += PER_PAGE) slidePositions.push(cardPositions[i]);
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

  const formatTime12h = (input) => {
    if (!input) return '';
    const s = String(input).trim().replace(/\./g, '');
    const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*(am|pm)?$/i);
    if (!m) return s;
    let h = parseInt(m[1], 10);
    let min = m[2] ? parseInt(m[2], 10) : 0;
    const hasAP = !!m[3];
    if (hasAP) {
      const mer = m[3].toUpperCase();
      if (h === 0) h = 12;
      if (h > 12) h = h % 12;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${mer}`;
    } else {
      const mer = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${mer}`;
    }
  };

  const formatDateMMDDYYYY = (val) => {
    if (!val) return '';
    const raw = String(val).trim();
    const token = raw.split('T')[0].split(' ')[0];
    let m;
    if ((m = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
      const y = m[1];
      const mm = String(parseInt(m[2], 10)).padStart(2, '0');
      const dd = String(parseInt(m[3], 10)).padStart(2, '0');
      return `${mm}/${dd}/${y}`;
    }
    if ((m = token.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/))) {
      const mm = String(parseInt(m[1], 10)).padStart(2, '0');
      const dd = String(parseInt(m[2], 10)).padStart(2, '0');
      const y = m[3];
      return `${mm}/${dd}/${y}`;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const y = d.getFullYear();
      return `${mm}/${dd}/${y}`;
    }
    return raw;
  };

  const buildLocation = (item) => {
    const barangay = item?.info?.barangay ?? item?.details?.barangay ?? item?.details?.brgy ?? '';
    const street = item?.info?.street ?? item?.details?.street ?? item?.details?.street_name ?? '';
    const parts = [];
    if (barangay) parts.push(`Barangay ${barangay}`);
    if (street) parts.push(street);
    return parts.join(', ');
  };

  const resolveUrgentFlag = (item) => {
    const primary = toBoolStrictClient(item?.details?.is_urgent);
    if (primary !== null) return primary;
    const t = String(
      item?.details?.urgency ||
      item?.details?.urgency_level ||
      item?.details?.priority ||
      ''
    ).trim().toLowerCase();
    if (!t) return null;
    if (t.includes('urgent') || t === 'high') return true;
    if (t === 'low' || t === 'normal' || t === 'standard') return false;
    return null;
  };

  const getRateType = (item) => {
    const raw =
      item?.rate?.rate_type ??
      item?.details?.rate_type ??
      item?.details?.pricing_type ??
      item?.details?.price_rate ??
      item?.details?.service_price_rate ??
      item?.pricing?.rate_type ??
      item?.payment?.rate_type ??
      '';
    if (!raw) return '';
    const s = String(raw).toLowerCase();
    if (s.includes('hour')) return 'By the hour';
    if (s.includes('job') || s.includes('fixed') || s.includes('project') || s.includes('task')) return 'By the Job';
    return s.charAt(0).toUpperCase() + s.slice(1);
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
    if (wrap && pointerIdRef.current != null) {
      wrap.releasePointerCapture?.(e.pointerId);
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
    snapToNearestSlide();
  };

  const onTrackClickCapture = (e) => {
    if (movedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      movedRef.current = false;
    }
  };

  const honorific = honorificFromGender(clientGender);
  const capFirst = clientFirstName ? clientFirstName.charAt(0).toUpperCase() + clientFirstName.slice(1) : 'Client';

  const SHOW_CAROUSEL = false;

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasCurrent = currentItems.length > 0;
  const currentItem = hasCurrent ? currentItems[0] : null;
  const statusLower = String(currentItem?.status || '').toLowerCase();
  const isPending = statusLower === 'pending';
  const isApproved = statusLower === 'approved';
  const isDeclined = statusLower === 'declined';
  const createdAt = currentItem?.created_at || currentItem?.details?.created_at || '';
  const createdAgo = createdAt ? timeAgo(createdAt) : '';

  const urgentBoolLocal = toBoolStrictClient(currentItem?.details?.is_urgent);
  const urgentTextLocal = urgentBoolLocal === null ? '-' : urgentBoolLocal ? 'Yes' : 'No';
  const urgentClassLocal = 'text-gray-900 font-semibold';

  const profileUrl = useMemo(() => {
    const u = currentItem?.info?.profile_picture_url || '';
    if (u) return u;
    const name = capFirst || 'Client';
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
  }, [currentItem, capFirst]);

  const handleDelete = async () => {
    if (!currentItem?.id || deleting) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNow = async () => {
    if (!currentItem?.id) return;
    setShowDeleteConfirm(false);
    setShowDeleteBusy(true);
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/api/clientservicerequests/${encodeURIComponent(currentItem.id)}`, {
        withCredentials: true,
        headers: headersWithU
      });
      setCurrentItems([]);
      setShowDeleteBusy(false);
      setShowDeleteDone(true);
    } catch {
      setShowDeleteBusy(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <div className="w-full overflow-hidden rounded-md border border-gray-200 shadow-sm mb-8">
        <div className="relative h-36 sm:h-44 md:h-52 lg:h-72">
          {banners.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${i === bannerIdx ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-4xl font-semibold mb-10">
        Welcome, {honorific ? `${honorific} ` : ''}{capFirst}
      </h2>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">{hasCurrent ? 'Current Service Request' : 'Service Request Post'}</h3>
          {hasApproved && (
            <Link
              to="/clientpostrequest"
              onClick={handlePostClick}
              className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
            >
              + Post a service request
            </Link>
          )}
        </div>

        {hasCurrent ? (
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-sm transition-all duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0">
                  <img
                    src={profileUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-blue-300"
                    onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(capFirst || 'Client')}`; }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xl md:text-2xl font-semibold truncate">
                    <span className="text-gray-700">Service Type:</span>{' '}
                    <span className="text-gray-900">{currentItem?.details?.service_type || 'Service'}</span>
                  </div>
                  <div className="mt-1 text-base md:text-lg truncate">
                    <span className="font-semibold text-gray-700">Service Task:</span>{' '}
                    <span className="text-gray-900">{currentItem?.details?.service_task || 'Task'}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{createdAgo ? `Created ${createdAgo} ago ` : ''}</div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 md:gap-x-16 text-base text-gray-700">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-700 font-semibold">Preferred Date:</span>
                        <span className="text-gray-900 font-medium">{currentItem?.details?.preferred_date ? formatDateMMDDYYYY(currentItem.details.preferred_date) : '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-700 font-semibold">Preferred Time:</span>
                        <span className="text-gray-900 font-medium">{currentItem?.details?.preferred_time ? formatTime12h(currentItem.details.preferred_time) : '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-700 font-semibold">Urgency:</span>
                        <span className={urgentClassLocal}>{urgentTextLocal}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:pl-10">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-700 font-semibold">Rate Type:</span>
                        <span className="text-gray-900 font-medium">
  {getRateType(currentItem) || '-'}
</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-gray-700 font-semibold">Service Rate:</span>
                        <span className="text-gray-900 font-medium">
                          {(() => {
                            const t = String(currentItem?.rate?.rate_type || '').toLowerCase();
                            const from = currentItem?.rate?.rate_from;
                            const to = currentItem?.rate?.rate_to;
                            const val = currentItem?.rate?.rate_value;
                            const peso = (v) => {
                              if (v === null || v === undefined) return '';
                              const s = String(v).trim();
                              if (!s) return '';
                              if (/₱|php/i.test(s)) return s;
                              const n = parseFloat(s.replace(/,/g, ''));
                              if (!isNaN(n)) return `₱${n.toLocaleString()}`;
                              return `₱${s}`;
                            };
                            if (t === 'fixed' || t === 'by_job' || t === 'by the job' || t === 'by_the_job') return val ? `${peso(val)}` : '-';
                            if (t === 'hourly' || t === 'range') return from || to ? `${from ? peso(from) : ''}${from && to ? ' - ' : ''}${to ? peso(to) : ''}` : '-';
                            if (val) return peso(val);
                            if (from || to) return `${from ? peso(from) : ''}${from && to ? ' - ' : ''}${to ? peso(to) : ''}`;
                            return '-';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isDeclined && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border-red-200">
                    <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                    Declined Request
                  </span>
                )}
                {isApproved && (
                  <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                    Approved Request
                  </span>
                )}
                {isPending && (
                  <span className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-200">
                    <span className="relative inline-flex">
                      <span className="absolute inline-flex h-3 w-3 rounded-full bg-current opacity-30 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
                    </span>
                    Pending Request
                  </span>
                )}
                <div className="h-10 w-10 rounded-lg border border-gray-300 text-[#008cfc] flex items-center justify-center">
                  {(() => {
                    const Icon = getServiceIcon(currentItem?.details?.service_type || currentItem?.details?.service_task || '');
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
              </div>
            </div>
            <div className="-mt-9 flex justify-end gap-2">
              <Link
                to={`/current-service-request/${encodeURIComponent(currentItem?.id || '')}`}
                onClick={(e) => { e.preventDefault(); navigate(`/current-service-request/${encodeURIComponent(currentItem?.id || '')}`); }}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                View
              </Link>
              {(isPending || isApproved) && (
                <>
            <button
  type="button"
  onClick={() => {
    if (navLoading) return;
    setNavLoading(true);
    setTimeout(() => {
      navigate(`/edit-service-request/${encodeURIComponent(currentItem?.id || '')}`);
    }, 2000);
  }}
  className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
>
  Edit Request
</button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="h-10 w-10 rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition flex items-center justify-center disabled:opacity-60"
                    aria-label="Delete Request"
                    title="Delete Request"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <img src="/Request.png" alt="Request" className="w-20 h-20 object-contain" />
            </div>
            <p className="text-gray-600 mb-4">
              Start by posting a service request to find available workers.
            </p>
            <Link
              to="/clientpostrequest"
              onClick={handlePostClick}
              className={`inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition ${currentItems.length > 0 ? 'pointer-events-none opacity-50' : ''}`}
            >
              + Post a service request
            </Link>
          </div>
        )}
      </div>

      {SHOW_CAROUSEL && hasApproved && (
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
                className="flex space-x-6 overflow-x-scroll scroll-smooth pl-4 pr-4 select-none cursor-grab active:cursor-grabbing [touch-action:pan-x] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onPointerDown={onDragPointerDown}
                onPointerMove={onDragPointerMove}
                onPointerUp={onDragPointerUp}
                onPointerCancel={onDragPointerUp}
                onPointerLeave={onDragPointerLeave}
                onClickCapture={onTrackClickCapture}
              >
                {approved.map((item, i) => {
                  const type = item?.details?.service_type || '';
                  const title = type + (item?.details?.service_task ? `: ${item.details.service_task}` : '');
                  const IconComp = getServiceIcon(type);

                  const urgentFlag = resolveUrgentFlag(item);

                  const cardTone =
                    urgentFlag === true || urgentFlag === false
                      ? 'bg-blue-50 border-[#008cfc] hover:border-[#008cfc] hover:ring-[#008cfc]'
                      : 'bg-white border-gray-300 hover:border-[#008cfc] hover:ring-[#008cfc]';

                  const iconTone = 'border-gray-400 text-[#008cfc]';

                  const urgentText =
                    urgentFlag === true ? 'Yes' : urgentFlag === false ? 'No' : (item?.details?.urgency || item?.details?.urgency_level || item?.details?.priority || '-') ;

                  const urgentClass =
                    urgentFlag === true
                      ? 'text-[#008cfc] font-medium'
                      : urgentFlag === false
                      ? 'text-red-600 font-medium'
                      : 'text-gray-700';

                  return (
                    <div
                      key={item.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className={`overflow-hidden min-w-[320px] sm:min-w-[360px] md:min-w-[400px] w-[320px] sm:w-[360px] md:w-[400px] h-auto min-h-[220px] flex flex-col flex-shrink-0 border rounded-xl p-6 text-left cursor-default shadow-sm transition-all duration-300 hover:ring-2 hover:shadow-xl hover:ring-inset ${cardTone}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-lg font-semibold text-gray-900">
                          {title || 'Approved Service Request'}
                        </div>
                        <div className={`h-9 w-9 rounded-lg border ${iconTone} flex items-center justify-center bg-white`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Location:</span>{' '}
                          {buildLocation(item) || '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Preferred Date:</span>{' '}
                          {item?.details?.preferred_date ? formatDateMMDDYYYY(item.details.preferred_date) : '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Preferred Time:</span>{' '}
                          {item?.details?.preferred_time ? formatTime12h(item.details.preferred_time) : '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Urgency:</span>{' '}
                          <span className={urgentClass}>{urgentText}</span>
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Service Price Rate:</span>{' '}
                          {getRateType(item) || '-'}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <button
                          type="button"
                          className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition !h-11"
                        >
                          View details
                        </button>

                        <span className="inline-flex items-center !h-11 whitespace-nowrap rounded-lg border border-yellow-200 bg-yellow-50 px-3 text-xs font-medium text-yellow-700">
                          Waiting for a Worker
                          <span className="ml-2 inline-flex w-6 justify-between font-mono">
                            <span className={`transition-opacity duration-200 ${dotStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                            <span className={`transition-opacity duration-200 ${dotStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                            <span className={`transition-opacity duration-200 ${dotStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>.</span>
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => scrollToIndex(Math.min(totalSlides - 1, current + 1))}
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

      {showProfileGate && (
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
              <div className="text-lg font-semibold text-gray-900">Please setup your personal information first to proceed</div>
              <div className="text-sm text-gray-600">Contact Number and Date of Birth are required. Social links are optional.</div>
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
                to="/account-settings"
                onClick={goTop}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition text-center"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      )}

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
              <div className="text-lg font-semibold text-gray-900">Are you sure do you get to delete this request?</div>
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
              <div className="text-base font-semibold text-gray-900">Deleting Request</div>
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
              <div className="text-lg font-semibold text-gray-900">Request Successfully Deleted</div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setShowDeleteDone(false); navigate('/clientdashboard'); }}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPost;
