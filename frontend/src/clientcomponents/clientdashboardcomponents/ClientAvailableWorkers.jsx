import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Star, Hammer, Zap, Wrench, Car, Shirt } from 'lucide-react';
import ClientViewWorker from '../clientdashboardcomponents/clientavailableworkercomponents/ClientViewWorker';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'User')}`;

function peso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return `₱${x.toLocaleString()}`;
}

function primaryRate(rate) {
  const t = String(rate?.rate_type || '').toLowerCase();
  if (t === 'hourly rate') {
    const f = rate?.rate_from,
      to = rate?.rate_to;
    if (f && to) return `${peso(f)}–${peso(to)}`;
    if (f) return `${peso(f)}/hr`;
    if (to) return `${peso(to)}/hr`;
  }
  if (t === 'by the job rate' && rate?.rate_value) return `${peso(rate.rate_value)}`;
  return '';
}

function titleFromServiceTypes(arr) {
  const s = Array.isArray(arr) && arr.length ? String(arr[0]) : '';
  const k = s.toLowerCase();
  if (/plumb/.test(k)) return 'Plumber | Pipe Repair | Leak Fix';
  if (/electr/.test(k)) return 'Licensed Electrician | Wiring | Troubleshooting';
  if (/carpent/.test(k)) return 'Carpenter | Cabinets | Custom Woodwork';
  if (/clean|laund/.test(k)) return 'House Cleaner | Deep Clean | Move-in/out';
  if (/car wash|carwash|auto/.test(k)) return 'Car Washer | Interior | Exterior';
  return s ? `${s} | Professional Services` : 'Home Service Professional';
}

function computeAge(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

function coerceYears(v) {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 50) return 50;
  return Math.floor(n);
}

function normalizeGender(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const l = s.toLowerCase();
  if (['m', 'male', 'man', 'masculine'].includes(l)) return 'Male';
  if (['f', 'female', 'woman', 'feminine'].includes(l)) return 'Female';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toText(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(Boolean).map(String).join(', ');
  if (typeof v === 'object') {
    const hasTasks = Object.prototype.hasOwnProperty.call(v, 'tasks');
    const hasCat = Object.prototype.hasOwnProperty.call(v, 'category');
    if (hasTasks || hasCat) {
      const parts = [];
      if (v.category) parts.push(String(v.category));
      if (Array.isArray(v.tasks) && v.tasks.length) parts.push(v.tasks.map(String).join(', '));
      return parts.join(': ');
    }
    return Object.values(v).map(String).join(', ');
  }
  return String(v);
}

function uniqJoin(list) {
  const s = [...new Set(list.filter(Boolean).map((x) => String(x).trim()))];
  return s.join(', ');
}

function flattenTasks(v) {
  const out = [];
  if (!v && v !== 0) return out;
  if (Array.isArray(v)) {
    v.forEach((x) => {
      if (typeof x === 'string') out.push(x);
      else if (x && typeof x === 'object') {
        if (Array.isArray(x.tasks)) out.push(...x.tasks);
        else out.push(...Object.values(x));
      }
    });
  } else if (typeof v === 'object') {
    if (Array.isArray(v.tasks)) out.push(...v.tasks);
    else out.push(...Object.values(v));
  } else {
    out.push(v);
  }
  return out;
}

function toolsText(v) {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.filter(Boolean).map(String).join(', ');
  if (typeof v === 'object') return toText(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function normalizeRateType(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const l = s.toLowerCase();
  if (l.includes('hour')) return 'Hourly Rate';
  if (l.includes('job')) return 'By the Job Rate';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deriveRatingPercent(src) {
  const cands = [
    src?.rating_percent,
    src?.ratingPercent,
    src?.rating_percentage,
    src?.job_success_percent,
    src?.jobSuccessPercent,
    src?.success_percent,
    src?.successPercent
  ];
  for (const v of cands) {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n);
  }
  return null;
}

function deriveRatingFive(src) {
  const direct = [
    src?.rating,
    src?.rating_out_of_5,
    src?.ratingOutOf5,
    src?.stars,
    src?.star_average,
    src?.starAverage
  ]
    .map((v) => Number(v))
    .find((n) => Number.isFinite(n) && n >= 0 && n <= 5);
  if (Number.isFinite(direct)) return direct;
  const pct = deriveRatingPercent(src);
  if (pct != null) return Math.max(0, Math.min(5, pct / 20));
  return null;
}

const iconFor = (s) => {
  const k = String(s || '').toLowerCase();
  if (k.includes('elect')) return Zap;
  if (k.includes('plumb')) return Wrench;
  if (k.includes('car wash') || k.includes('carwash') || k.includes('auto')) return Car;
  if (k.includes('laund') || k.includes('clean')) return Shirt;
  if (k.includes('carpent') || k.includes('wood')) return Hammer;
  return Hammer;
};

const ClientAvailableWorkers = () => {
  const [items, setItems] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewWorker, setViewWorker] = useState(null);

  const navigate = useNavigate();
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const goTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };
  const beginRoute = (to) => {
    if (navLoading) return;
    goTop();
    setNavLoading(true);
    setTimeout(() => {
      navigate(to, { replace: true });
    }, 2000);
  };

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    if (viewOpen) {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [viewOpen]);

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
  }, [navLoading]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const url = `${API_BASE}/api/workerapplications/public/approved?limit=60`;
        const { data } = await axios.get(url);
        const rows = Array.isArray(data?.items) ? data.items : [];

        const base = rows.map((r, i) => {
          const info = r.info || {};
          const work = r.work || {};
          const rate = r.rate || {};
          const name = [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Worker';
          const img = info.profile_picture_url || '';
          const stArr = Array.isArray(work.service_types) ? work.service_types : [];
          const st0 = stArr[0];
          const st0Cat = st0 && typeof st0 === 'object' && st0.category ? String(st0.category) : null;
          const st0Tasks = st0 && typeof st0 === 'object' ? flattenTasks(st0.tasks) : [];
          const serviceTypeRaw =
            st0Cat ||
            (Array.isArray(stArr) && typeof st0 === 'string'
              ? st0
              : work.service_type ?? work.primary_service_type ?? '');
          const serviceType = toText(serviceTypeRaw);
          const serviceTaskRaw = [
            ...flattenTasks(work.service_task),
            ...flattenTasks(work.task),
            ...flattenTasks(work.serviceTask),
            ...flattenTasks(work.service_task_name),
            ...st0Tasks
          ];
          const serviceTask = uniqJoin(serviceTaskRaw);
          const toolsProvided = toolsText(
            work.tools_provided ??
              work.toolsProvided ??
              work.tools ??
              work.provides_tools ??
              work.has_tools ??
              work.hasTools
          );
          const barangay = info.barangay ?? info.brgy ?? '';
          const street =
            info.street ??
            info.street_name ??
            info.street_address ??
            info.address_line1 ??
            '';
          const addressLine = [barangay, street].filter(Boolean).join(', ');
          const skill = st0Cat || (Array.isArray(stArr) && stArr.length ? String(stArr[0]) : 'General');
          const rateText = primaryRate(rate) || '';
          const rateType = normalizeRateType(rate?.rate_type ?? rate?.type ?? '');
          const ratingFive = deriveRatingFive(r) ?? deriveRatingFive(work);
          const bio =
            work.work_description ||
            'Experienced home service professional focused on reliable, high-quality work and great communication.';
          const country = 'Philippines';
          const success = '—';
          const jobs = 0;
          const years = coerceYears(
            work.years_experience ??
              work.years_of_experience ??
              work.yearsExperience ??
              work.experience_years ??
              work.years ??
              work.experience
          );
          const dob = info.date_of_birth || info.birth_date || info.birthdate || info.dob || '';
          const age = computeAge(dob);
          const gender = normalizeGender(info.gender ?? info.sex ?? r.gender);
          const consultText = rateText ? `${rateText} consultation` : 'Consultation available';

          const typeLabels = [];
          if (Array.isArray(stArr) && stArr.length) {
            stArr.forEach((x) => {
              const label = typeof x === 'object' ? x.category || x.name || '' : x;
              if (label) typeLabels.push(String(label));
            });
          }
          if (work.service_type) typeLabels.push(String(work.service_type));
          if (work.primary_service_type) typeLabels.push(String(work.primary_service_type));
          if (serviceType) typeLabels.push(String(serviceType));
          const serviceTypeList = [...new Set(typeLabels.map((s) => s.trim()).filter(Boolean))];

          const taskPieces = [];
          serviceTaskRaw.forEach((t) => {
            String(t ?? '')
              .split(/[,/|]+/)
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((s) => taskPieces.push(s));
          });
          const serviceTaskList = [...new Set(taskPieces)];

          const seen = new Set();
          const icons = [];
          serviceTypeList.forEach((lbl) => {
            const Icon = iconFor(lbl);
            const key = Icon.displayName || Icon.name || 'Icon';
            if (!seen.has(key)) {
              seen.add(key);
              icons.push(Icon);
            }
          });
          const serviceIcons = icons.slice(0, 5);

          const emailAddress = info.email_address || r.email_address || r.email || '';

          return {
            id: r.id || `${r.request_group_id || i}`,
            name,
            skill,
            image: img,
            country,
            success,
            jobs,
            years,
            age,
            gender,
            rate: rateText,
            rateType,
            title: titleFromServiceTypes(stArr),
            bio,
            consultText,
            serviceType,
            serviceTask,
            toolsProvided,
            addressLine,
            ratingFive,
            serviceIcons,
            serviceTypeList,
            serviceTaskList,
            emailAddress,
            __meta: { email: info.email_address || r.email_address || '', auth_uid: r.auth_uid || info.auth_uid || '' }
          };
        });

        const enriched = await Promise.all(
          base.map(async (w) => {
            if (w.gender) {
              const o = { ...w };
              delete o.__meta;
              return o;
            }
            let sex = null;
            const e = w.__meta?.email ? String(w.__meta.email).trim() : '';
            const au = w.__meta?.auth_uid ? String(w.__meta.auth_uid).trim() : '';
            const params = e ? { email: e } : au ? { auth_uid: au } : null;
            if (params) {
              try {
                const r = await axios.get(`${API_BASE}/api/workers/public/sex`, { params });
                sex = r.data?.sex || null;
              } catch {}
            }
            const o = { ...w, gender: normalizeGender(sex) || w.gender || '—' };
            delete o.__meta;
            return o;
          })
        );

        if (alive) setItems(enriched);
      } catch {
        if (alive) setItems([]);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const VIEW_LIMIT = 6;
  const PER_PAGE = 3;
  const PAGE_SIZE = 3;

  const [page, setPage] = useState(1);
  const viewItems = items.slice(0, VIEW_LIMIT);
  const totalPages = Math.max(1, Math.ceil(viewItems.length / PAGE_SIZE));
  const displayItems = viewItems.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW] = useState(420);
  const [endPad, setEndPad] = useState(0);

  const totalSlides = Math.max(1, Math.ceil(displayItems.length / PER_PAGE));

  const handleScroll = (direction) => {
    if (direction === 'left') {
      if (current > 0) {
        scrollToIndex(current - 1);
      } else if (page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } else {
      if (current < totalSlides - 1) {
        scrollToIndex(current + 1);
      } else if (page < totalPages) {
        setPage((p) => Math.min(totalPages, p + 1));
      }
    }
  };

  const onTrackScroll = () => {
    const el = scrollRef.current;
    if (!el || positions.length === 0) return;
    const sl = el.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - sl) < Math.abs(positions[nearest] - sl)) nearest = i;
    }
    if (nearest !== current) setCurrent(nearest);
  };

  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(totalSlides - 1, i));
    const left = positions.length ? positions[idx] : idx * ((cardW + GAP) * PER_PAGE - GAP);
    el.scrollTo({ left, behavior: 'smooth' });
    setCurrent(idx);
  };

  const getHPad = (el) => {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  };

  const recomputeCardWidth = () => {
    const wrap = wrapRef.current;
    const track = scrollRef.current;
    if (!wrap || !track) return;
    const visible = wrap.clientWidth - getHPad(wrap) - getHPad(track);
    const exact = Math.floor((visible - GAP * (PER_PAGE - 1)) / PER_PAGE);
    const clamped = Math.max(420, Math.min(600, exact));
    setCardW(clamped);
    setEndPad(0);
  };

  const recomputePositions = () => {
    const base = cardRefs.current[0]?.offsetLeft || 0;
    const cardPositions = cardRefs.current.map((c) => Math.max(0, (c?.offsetLeft || 0) - base));
    const slidePositions = [];
    for (let i = 0; i < cardPositions.length; i += PER_PAGE) slidePositions.push(cardPositions[i]);
    setPositions(slidePositions);
  };

  useEffect(() => {
    recomputeCardWidth();
    const onResize = () => recomputeCardWidth();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    requestAnimationFrame(recomputePositions);
  }, [displayItems.length, cardW, endPad]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, behavior: 'auto' });
    setCurrent(0);
  }, [page]);

  const isPointerDownRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startXRef = useRef(0);
  const startLeftRef = useRef(0);
  const movedRef = useRef(false);

  const snapToNearestSlide = () => {
    const el = scrollRef.current;
    if (!el || !positions.length) return;
    const sl = el.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - sl) < Math.abs(positions[nearest] - sl)) nearest = i;
    }
    scrollToIndex(nearest);
  };

  const onDragPointerDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    isPointerDownRef.current = true;
    movedRef.current = false;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startLeftRef.current = el.scrollLeft;
    el.setPointerCapture?.(e.pointerId);
    el.classList.add('drag-active');
  };

  const onDragPointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) movedRef.current = true;
    el.scrollLeft = startLeftRef.current - dx;
  };

  const endDrag = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const el = scrollRef.current;
    if (el) {
      const pid = e?.pointerId ?? pointerIdRef.current;
      if (pid != null) el.releasePointerCapture?.(pid);
      el.classList.remove('drag-active');
    }
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

  const pages = (() => {
    const t = totalPages;
    const p = page;
    const out = [];
    if (t <= 7) {
      for (let i = 1; i <= t; i++) out.push(i);
    } else {
      out.push(1);
      if (p > 4) out.push('…');
      const start = Math.max(2, p - 1);
      const end = Math.min(t - 1, p + 1);
      for (let i = start; i <= end; i++) out.push(i);
      if (p < t - 3) out.push('…');
      out.push(t);
    }
    return out;
  })();

  return (
    <div className="max-w-[1525px] mx-auto px-6 -py-5 relative">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-2xl font-semibold text-gray-800">Available Workers</h2>
        <a
          href="/find-a-worker"
          className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline text-base"
          onClick={(e) => {
            e.preventDefault();
            beginRoute('/find-a-worker');
          }}
        >
          Browse available workers <ArrowRight size={16} />
        </a>
      </div>

      {displayItems.length === 0 ? (
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <img src="/noavailable.png" alt="No available workers" className="w-20 h-20 object-contain" />
            </div>
            <div className="text-lg font-semibold text-gray-900">No Available Workers</div>
            <div className="text-sm text-gray-600 mt-1">Check back later to see new available workers.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full flex justify-center items-center">
            <button
              onClick={() => handleScroll('left')}
              className="absolute -left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
              aria-disabled={page === 1 && current === 0}
            >
              <ArrowLeft size={22} />
            </button>

            <div ref={wrapRef} className="w-full max-w-[1425px] overflow-visible px-12 py-2">
              <div
                ref={scrollRef}
                onScroll={onTrackScroll}
                onPointerDown={onDragPointerDown}
                onPointerMove={onDragPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={onTrackClickCapture}
                className="flex space-x-6 overflow-x-scroll scroll-smooth no-scrollbar pl-4 pr-4 select-none no-hand"
                style={{ touchAction: 'auto' }}
              >
                {displayItems.map((w, i) => {
                  const rating = Number.isFinite(Number(w.ratingFive)) ? Number(w.ratingFive) : 0;
                  const filledStars = Math.max(0, Math.min(5, Math.floor(rating)));

                  const types = w.serviceTypeList && w.serviceTypeList.length ? w.serviceTypeList : [w.serviceType || '—'];
                  const rawTasks =
                    w.serviceTaskList && w.serviceTaskList.length
                      ? w.serviceTaskList
                      : w.serviceTask
                      ? String(w.serviceTask)
                          .split(/[,/|]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : ['—'];

                  const MAX_TYPES = 5;
                  const MAX_TASKS = 5;
                  const typeShow = types.slice(0, MAX_TYPES);
                  const typeMore = Math.max(0, types.length - typeShow.length);
                  const taskShow = rawTasks.slice(0, MAX_TASKS);
                  const taskMore = Math.max(0, rawTasks.length - taskShow.length);

                  return (
                    <div
                      key={w.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="group relative overflow-hidden flex-shrink-0 cursor-pointer rounded-2xl bg-white border border-gray-200 shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:shadow-xl"
                      style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
                    >
                      <div className="relative z-10 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0 ring-2 ring-white">
                                <img
                                  src={w.image || avatarFromName(w.name)}
                                  alt={w.name}
                                  className="h-full w-full object-cover"
                                  onLoad={() => requestAnimationFrame(recomputePositions)}
                                  onError={({ currentTarget }) => {
                                    currentTarget.style.display = 'none';
                                    const parent = currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="h-full w-full grid place-items-center bg-gray-100 text-gray-700 text-base font-semibold">${(w.name || '?')
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase()}</div>`;
                                    }
                                    requestAnimationFrame(recomputePositions);
                                  }}
                                />
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-gray-200 grid place-items-center shadow-sm">
                                <div className="h-4 w-4 rounded-full bg-[#008cfc]" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-semibold text-gray-700 shrink-0">Worker:</span>
                                <span className="text-base md:text-lg font-semibold text-[#008cfc] leading-tight truncate">
                                  {w.name}
                                </span>
                              </div>
                              {w.emailAddress ? <div className="text-xs text-gray-600 truncate">{w.emailAddress}</div> : null}
                            </div>
                          </div>

                          <img
                            src="/Bluelogo.png"
                            alt=""
                            className="h-8 w-8 object-contain opacity-60 shrink-0"
                            draggable={false}
                          />
                        </div>

                        <div className="mt-4 h-px bg-gray-200" />

                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-700 mb-2">Service Type</div>
                            <div className="flex flex-wrap gap-2">
                              {typeShow.map((lbl, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200"
                                >
                                  {lbl}
                                </span>
                              ))}
                              {typeMore > 0 ? (
                                <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                  +{typeMore} more
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-gray-700 mb-2">Service Task</div>
                            <div className="flex flex-wrap gap-2">
                              {taskShow.map((lbl, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200"
                                >
                                  {lbl}
                                </span>
                              ))}
                              {taskMore > 0 ? (
                                <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                  +{taskMore} more
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-700">Work Description</div>
                                <div className="text-sm text-[#008cfc] line-clamp-2">{w.bio || '—'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 h-px bg-gray-200" />

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-700">Rating</div>
                              <div className="flex items-center gap-1">
                                {[0, 1, 2, 3, 4].map((idx) => (
                                  <Star
                                    key={idx}
                                    size={14}
                                    className={idx < filledStars ? 'text-yellow-400' : 'text-gray-300'}
                                    fill="currentColor"
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-medium text-gray-700">{`${rating.toFixed(1)}/5`}</span>
                            </div>

                            {(w.rateType || w.rate) ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {w.rateType ? (
                                  <span className="inline-flex items-center rounded-full bg-[#008cfc]/10 text-[#008cfc] px-3 py-1 text-xs font-semibold border border-[#008cfc]/20">
                                    {w.rateType}
                                  </span>
                                ) : null}
                                {w.rate ? (
                                  <span className="inline-flex items-center rounded-full bg-[#008cfc]/10 text-[#008cfc] px-3 py-1 text-xs font-semibold border border-[#008cfc]/20">
                                    {w.rate}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => {
                              setViewWorker(w);
                              setViewOpen(true);
                            }}
                            className="shrink-0 inline-flex items-center justify-center px-4 h-10 rounded-md bg-[#008cfc] text-white text-sm font-semibold hover:bg-[#0078d6] transition shadow-sm group-hover:shadow-md"
                          >
                            View worker
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div aria-hidden className="flex-shrink-0" style={{ width: `${endPad}px` }} />
              </div>
            </div>

            <button
              onClick={() => handleScroll('right')}
              className="absolute -right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
              aria-disabled={page === totalPages && current === totalSlides - 1}
            >
              <ArrowRight size={22} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <nav className="flex items-center gap-2">
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              <button className="h-9 min-w-9 px-3 rounded-md border border-[#008cfc] bg-[#008cfc] text-white">
                {page}
              </button>
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          </div>
        </>
      )}

      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .drag-active { cursor: default !important; }
        .no-hand { cursor: default !important; }
        .card-border-fix::after { content: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <ClientViewWorker open={viewOpen} onClose={() => setViewOpen(false)} worker={viewWorker} />

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
              <div className="text-base font-semibold text-gray-900 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAvailableWorkers;
