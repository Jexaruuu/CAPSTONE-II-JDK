import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt } from 'lucide-react';

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

  useEffect(() => {
    const { firstName, gender } = getClientProfile();
    if (firstName) setClientFirstName(firstName);
    if (gender) setClientGender(gender);
  }, []);

  useEffect(() => {
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
        const filtered = items.filter((it) => !isExpired(it?.details?.preferred_date));
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

  const hasApproved = approved.length > 0;
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

  const getUrgency = (item) => {
    const rawPrimary = item?.details?.is_urgent;
    if (typeof rawPrimary === 'string') {
      const s = rawPrimary.trim().toLowerCase();
      if (s === 'yes' || s === 'true') return 'Urgent';
      if (s === 'no' || s === 'false') return 'Not urgent';
    }
    if (typeof rawPrimary === 'boolean') return rawPrimary ? 'Urgent' : 'Not urgent';
    const raw =
      item?.details?.urgency ??
      item?.details?.urgency_level ??
      item?.details?.priority ??
      item?.priority ??
      '';
    if (!raw) return '';
    const t = String(raw).trim().toLowerCase();
    if (t.includes('urgent')) return 'Urgent';
    if (t === 'high') return 'Urgent';
    if (t === 'low' || t === 'normal' || t === 'standard') return 'Not urgent';
    return t
      .split(/[\s_\-]+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
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

  const onDragPointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const wrap = trackRef.current;
    if (wrap && pointerIdRef.current != null) {
      wrap.releasePointerCapture?.(pointerIdRef.current);
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

  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <h2 className="text-4xl font-semibold mb-10">
        Welcome, {honorific ? `${honorific} ` : ''}{capFirst}
      </h2>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Service Request Post</h3>
          {hasApproved && (
            <Link
              to="/clientpostrequest"
              className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
            >
              + Post a service request
            </Link>
          )}
        </div>

        {!hasApproved && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <img src="/Request.png" alt="Request" className="w-20 h-20 object-contain" />
            </div>
            <p className="text-gray-600 mb-4">
              {loading
                ? 'Checking for approved requests…'
                : 'No active service requests found. You can post a new service request to find available workers.'}
            </p>
            <Link
              to="/clientpostrequest"
              className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
            >
              + Post a service request
            </Link>
          </div>
        )}
      </div>

      {hasApproved && (
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

                  const urgentText = urgentFlag === true ? 'Yes' : urgentFlag === false ? 'No' : getUrgency(item) || '-';

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

      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm mt-8">
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
    </div>
  );
};

export default ClientPost;
