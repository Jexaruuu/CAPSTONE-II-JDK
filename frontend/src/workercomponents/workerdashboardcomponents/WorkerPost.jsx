import React, { useEffect, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

function getWorkerId() {
  try {
    const auth = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    if (auth && (auth.id || auth.worker_id)) return String(auth.id || auth.worker_id);
  } catch {}
  return String(localStorage.getItem('worker_id') || localStorage.getItem('id') || '').trim();
}

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

function WorkerPost() {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState([]);
  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const [workerFirstName, setWorkerFirstName] = useState('');
  const [workerGender, setWorkerGender] = useState('');

  const PER_PAGE = 3;

  const banners = ['/Banner1.png', '/Banner2.png'];

  const [bannerIdx, setBannerIdx] = useState(0);
  const [dotStep, setDotStep] = useState(0);

  const navigate = useNavigate();
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
      const e = a.email || localStorage.getItem('worker_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
    } catch {
      return '';
    }
  }, []);
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
      const { data } = await axios.get(`${API_BASE}/api/workers/me`, {
        withCredentials: true,
        headers: headersWithU
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

  const handleBecomeWorkerClick = async (e) => {
    e.preventDefault();
    if (navLoading) return;
    const ok = await checkProfileComplete();
    if (!ok) {
      setShowProfileGate(true);
      return;
    }
    setNavLoading(true);
    setTimeout(() => {
      navigate('/workerpostapplication');
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
    const { firstName, gender } = getWorkerProfile();
    if (firstName) setWorkerFirstName(firstName);
    if (gender) setWorkerGender(gender);
  }, []);

  const FETCH_APPLICATIONS = false;

  useEffect(() => {
    if (!FETCH_APPLICATIONS) {
      setLoading(false);
      return;
    }
    const email = getWorkerEmail();
    const workerId = getWorkerId();
    if (!email && !workerId) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/api/workerapplications/approved`, {
        params: { email, worker_id: workerId, limit: 10 },
        withCredentials: true
      })
      .then((res) => {
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        const normalized = items.map((it) => {
          const details = { ...(it.work || it.details || {}) };
          const t = toBoolStrict(details.tools_provided);
          if (t !== null) details.tools_provided = t ? 'Yes' : 'No';
          return { ...it, details };
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
            first?.info?.gender || first?.details?.gender || first?.info?.sex || first?.details?.sex || '';
          setWorkerFirstName((prev) => prev || (fn ? String(fn).trim() : ''));
          setWorkerGender((prev) => prev || (g ? String(g).trim() : ''));
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
      try { wrap.releasePointerCapture?.(pid); } catch {}
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
    const barangay = item?.info?.barangay ?? item?.details?.barangay ?? item?.details?.brgy ?? '';
    const street = item?.info?.street ?? item?.details?.street ?? item?.details?.street_name ?? '';
    const parts = [];
    if (barangay) parts.push(`Barangay ${barangay}`);
    if (street) parts.push(street);
    return parts.join(', ');
  };

  const buildServiceType = (item) => {
    const d = item?.work || item?.details || {};
    const st = d.service_types || d.service_type || d.primary_service || [];
    if (Array.isArray(st) && st.length) return st[0];
    return typeof st === 'string' && st ? st : '';
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
    if (s.includes('hour')) return 'By the hour';
    if (s.includes('job') || s.includes('fixed') || s.includes('project') || s.includes('task')) return 'By the Job';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const SHOW_CAROUSEL = false;

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <h2 className="text-4xl font-semibold mb-10">
        Welcome, {honorific ? `${honorific} ` : ''}{capFirst}
      </h2>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Work Application Post</h3>
          {hasApproved && (
            <Link
              to="/workerpostapplication"
              onClick={handleBecomeWorkerClick}
              className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
            >
              + Become a worker
            </Link>
          )}
        </div>

        {!hasApproved && (
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
              className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
            >
              + Become a worker
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
                  const type = buildServiceType(item) || '';
                  const title = type || 'Approved Application';
                  const IconComp = getServiceIcon(type);
                  const years = (item?.details?.years_experience ?? item?.experience?.years ?? item?.details?.yearsExperience ?? '');
                  const tools = item?.details?.tools_provided ?? item?.details?.toolsProvided ?? item?.tools?.provided ?? '';
                  return (
                    <div
                      key={item.id || i}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="overflow-hidden min-w-[320px] sm:min-w-[360px] md:min-w-[400px] w-[320px] sm:w-[360px] md:w-[400px] h-auto min-h-[220px] flex flex-col flex-shrink-0 border rounded-xl p-6 text-left cursor-default shadow-sm transition-all duration-300 hover:ring-2 hover:shadow-xl hover:ring-inset bg-blue-50 border-[#008cfc] hover:border-[#008cfc] hover:ring-[#008cfc]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-lg font-semibold text-gray-900">
                          {title}
                        </div>
                        <div className="h-9 w-9 rounded-lg border border-gray-400 text-[#008cfc] flex items-center justify-center bg-white">
                          <IconComp className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Location:</span> {buildLocation(item) || '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Years of Experience:</span> {years !== '' && years !== null && years !== undefined ? String(years) : '-'}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Tools Provided:</span> {typeof tools === 'boolean' ? (tools ? 'Yes' : 'No') : (String(tools || '').trim() || '-')}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-800">Service Price Rate:</span> {getRateType(item) || '-'}
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
                          Active Application
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

      {navLoading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
                to="/workerprofile"
                onClick={() => { setShowProfileGate(false); goTop(); }}
                className="px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition text-center"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WorkerPost;
