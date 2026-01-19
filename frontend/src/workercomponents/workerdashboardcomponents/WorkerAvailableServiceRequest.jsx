import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt } from 'lucide-react';
import WorkerViewRequest from '../workerdashboardcomponents/workeravailablerequestcomponents/WorkerViewRequest';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'User')}`;

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtTime(v) {
  if (!v) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v));
  if (!m) return v;
  const h = +m[1];
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${min} ${ampm}`;
}

function fmtRate(rate) {
  const cleanPeso = (v) => {
    if (v == null || v === '') return '';
    const s = String(v).trim();
    if (!s) return '';
    if (s.startsWith('₱')) return s;
    const n = Number(String(s).replace(/[₱,\s]/g, ''));
    if (Number.isFinite(n)) return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return s;
  };

  if (rate?.total_rate_php) return cleanPeso(rate.total_rate_php);

  const t = String(rate?.rate_type || '').toLowerCase();

  const num = (v) => {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/[₱,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const peso = (n) => `₱${Number(n).toLocaleString()}`;

  const from = num(rate?.rate_from);
  const to = num(rate?.rate_to);
  const value = num(rate?.rate_value ?? rate?.total_rate ?? rate?.totalRate);

  if (t.includes('hour') || t === 'range') {
    if (from != null && to != null) return `${peso(from)} - ${peso(to)}`;
    if (from != null) return `${peso(from)}`;
    if (to != null) return `${peso(to)}`;
  }

  if (value != null) return peso(value);

  return '';
}

const getServiceIcon = (t) => {
  const s = String(t || '').toLowerCase();
  if (s.includes('electric')) return Zap;
  if (s.includes('plumb')) return Wrench;
  if (s.includes('wash')) return Car;
  if (s.includes('laundry')) return Shirt;
  return Hammer;
};

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const s = String(v ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', 't', '1'].includes(s)) return true;
  if (['no', 'n', 'false', 'f', '0'].includes(s)) return false;
  return !!v;
}

function buildDateTime(dateStr, timeStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(timeStr || ''));
  if (m) {
    d.setHours(Number(m[1]) || 0, Number(m[2]) || 0, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  }
  return '';
};
const toObj = (v) => {
  if (!v) return {};
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === 'object' ? v : {};
};

const toList = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap((x) => toList(x));
  if (typeof v === 'object') {
    if (Array.isArray(v.tasks)) return v.tasks.flatMap((x) => toList(x));
    return Object.values(v).flatMap((x) => toList(x));
  }
  return String(v)
    .split(/[,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const uniq = (arr) => [...new Set((arr || []).map((x) => String(x).trim()).filter(Boolean))];

const WorkerAvailableServiceRequest = () => {
  const [items, setItems] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);

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
    let ok = true;
    (async () => {
      const base = API_BASE.replace(/\/+$/, '');
      let dataArr = [];
      const primary = [`${base}/api/clientservicerequests/open`];
      const fallbacks = [
        `${base}/api/admin/servicerequests`,
        `${base}/api/admin/servicerequests/approved`,
        `${base}/api/admin/servicerequests/approved`,
        `${base}/admin/servicerequests/approved`,
        `${base}/admin/service-requests`,
        `${base}/admin/servicerequests`
      ];
      for (const url of [...primary, ...fallbacks]) {
        try {
          const params = url.endsWith('/open') ? { limit: 50 } : { status: 'approved' };
          const { data, status } = await axios.get(url, { params });
          if (status === 200) {
            const arr = Array.isArray(data)
              ? data
              : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.rows)
              ? data.rows
              : null;
            if (arr) {
              dataArr = arr;
              break;
            }
          }
        } catch {}
      }
      if (!ok) return;

      const now = Date.now();
      const mapped = (dataArr || []).map((r, idx) => {
        const infoRaw = r.info ?? r.client_info ?? r.client_information ?? r.client ?? r.profile ?? {};
        const detailsRaw = r.details ?? {};
        const rateRaw = r.rate ?? {};
        const i = toObj(infoRaw);
        const d = toObj(detailsRaw);
        const rate = toObj(rateRaw);

        const name = [i.first_name, i.last_name].filter(Boolean).join(' ').trim() || 'Client';

        const ia = toObj(i.address);
        const da = toObj(d.address);
        const barangay =
          pick(i, ['barangay', 'brgy']) ||
          pick(ia, ['barangay', 'brgy']) ||
          pick(d, ['barangay']) ||
          pick(da, ['barangay']);
        const street =
          pick(i, ['street', 'street_name', 'street_address', 'address_line1']) ||
          pick(ia, ['street', 'street_name', 'street_address', 'address_line1']) ||
          pick(d, ['street', 'street_name', 'street_address']) ||
          pick(da, ['street', 'street_name', 'street_address']);
        const addl =
          pick(i, ['additional_address', 'additional_street', 'address_line2']) ||
          pick(ia, ['additional_address', 'additional_street', 'address_line2']) ||
          pick(d, ['additional_address', 'additional_street', 'address_line2']) ||
          pick(da, ['additional_address', 'additional_street', 'address_line2']);

        const addressLine = [barangay, street, addl]
          .map((s) => String(s || '').trim())
          .filter(Boolean)
          .join(', ');

        const dt = buildDateTime(d.preferred_date || '', d.preferred_time || '');
        const statusLower = String(r.status || '').toLowerCase();
        const isExpired = statusLower === 'expired' || (dt && dt.getTime() < now);

        const iconLabels = [];
        const pushType = (val) => {
          if (val == null) return;
          if (Array.isArray(val)) {
            val.forEach(pushType);
            return;
          }
          if (typeof val === 'object') {
            if (val.category) iconLabels.push(String(val.category));
            else if (val.name) iconLabels.push(String(val.name));
            else if (val.type) iconLabels.push(String(val.type));
            return;
          }
          String(val)
            .split(/[,/|]+/)
            .forEach((s) => {
              s = s.trim();
              if (s) iconLabels.push(s);
            });
        };
        pushType(d.service_type);

        const seen = new Set();
        const icons = [];
        iconLabels.forEach((lbl) => {
          const Icon = getServiceIcon(lbl);
          const key = Icon.displayName || Icon.name || 'Icon';
          if (!seen.has(key)) {
            seen.add(key);
            icons.push(Icon);
          }
        });
        const serviceIcons = icons.slice(0, 3);

        const tasksOut = [];
        const addTask = (val) => {
          if (val == null) return;
          if (Array.isArray(val)) {
            val.forEach(addTask);
            return;
          }
          if (typeof val === 'object') {
            if (Array.isArray(val.tasks)) val.tasks.forEach(addTask);
            else Object.values(val).forEach(addTask);
            return;
          }
          String(val)
            .split(/[,/|]+/)
            .forEach((s) => {
              s = s.trim();
              if (s) tasksOut.push(s);
            });
        };
        addTask(d.service_task);
        const service_task_label = [...new Set(tasksOut)].join(', ');

        let stLabel = '';
        const st = d.service_type ?? d.service_types ?? rate.service_type ?? '';
        if (Array.isArray(st)) stLabel = String(st[0] || '').trim();
        else if (st && typeof st === 'object') stLabel = (st.category || st.name || st.type || '').toString().trim();
        else stLabel = String(st || '').trim();

        const workersNeededRaw =
          pick(d, ['workers_needed', 'worker_needed', 'needed_workers', 'number_of_workers', 'worker_count', 'workers']) ||
          pick(r, ['workers_needed', 'worker_needed', 'needed_workers', 'number_of_workers', 'worker_count', 'workers']);
        const workers_needed = String(workersNeededRaw || '').trim();

        const totalRate = rate.total_rate_php || '';

        return {
          id: r.id || idx + 1,
          request_group_id: r.request_group_id || '',
          name,
          email: i.email_address || r.email_address || '',
          image: i.profile_picture_url || avatarFromName(name),
          barangay,
          street,
          additional_address: addl,
          preferred_date: d.preferred_date || '',
          preferred_time: d.preferred_time || '',
          urgency: (d.is_urgent || '').toString(),
          service_type: stLabel || '',
          service_task: service_task_label || '',
          description: d.service_description || '',
          rate_type: '',
          price: fmtRate({ ...rate, total_rate_php: totalRate }),
          addressLine,
          isExpired,
          serviceIcons,
          status: statusLower,
          workers_needed
        };
      });

      const onlyApproved = mapped.filter((x) => x.status === 'approved');
      const active = onlyApproved.filter((x) => !x.isExpired);
      setItems(active);
    })();
    return () => {
      ok = false;
    };
  }, []);

  const VIEW_LIMIT = 6;
  const PER_PAGE = 3;
  const PAGE_SIZE = 3;

  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW] = useState(420);
  const [endPad, setEndPad] = useState(0);

  const [page, setPage] = useState(1);

  const viewItems = items.slice(0, VIEW_LIMIT);
  const totalPages = Math.max(1, Math.ceil(viewItems.length / PAGE_SIZE));
  const displayItems = viewItems.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

  const totalSlides = Math.max(1, Math.ceil(displayItems.length / PER_PAGE));

  const getHPad = (el) => {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  };
  const getRightPad = (el) => {
    const cs = getComputedStyle(el);
    return parseFloat(cs.paddingRight) || 0;
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

  const getViewSlideLefts = () => {
    const el = scrollRef.current;
    if (!el || positions.length === 0) return positions;
    const arr = positions.slice();
    arr[arr.length - 1] = Math.max(0, el.scrollWidth - el.clientWidth - getRightPad(el));
    return arr;
  };

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
    if (!el) return;
    const slideLefts = getViewSlideLefts();
    if (slideLefts.length === 0) return;
    const sl = el.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < slideLefts.length; i++) {
      if (Math.abs(slideLefts[i] - sl) < Math.abs(slideLefts[nearest] - sl)) nearest = i;
    }
    if (nearest !== current) setCurrent(nearest);
  };

  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(totalSlides - 1, i));
    const slideLefts = getViewSlideLefts();
    const fallback = idx * ((cardW + GAP) * PER_PAGE - GAP);
    const left = slideLefts.length ? slideLefts[idx] : fallback;
    el.scrollTo({ left, behavior: 'smooth' });
  };

  const isPointerDownRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startXRef = useRef(0);
  const startLeftRef = useRef(0);
  const movedRef = useRef(false);

  const snapToNearestSlide = () => {
    const el = scrollRef.current;
    if (!el) return;
    const slideLefts = getViewSlideLefts();
    if (!slideLefts.length) return;
    const sl = el.scrollLeft;
    let nearest = 0;
    for (let i = 1; i < slideLefts.length; i++) {
      if (Math.abs(slideLefts[i] - sl) < Math.abs(slideLefts[nearest] - sl)) nearest = i;
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

  return (
    <div className="max-w-[1525px] mx-auto px-6 -py-5 relative">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-800">Available Service Requests</h2>
        <a
          href="/find-a-client"
          className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline"
          onClick={(e) => {
            e.preventDefault();
            beginRoute('/find-a-client');
          }}
        >
          Browse available requests <ArrowRight size={16} />
        </a>
      </div>

      {displayItems.length === 0 ? (
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-md p-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <img src="/noavailable.png" alt="No available requests" className="w-20 h-20 object-contain" />
            </div>
            <div className="text-lg font-semibold text-gray-900">No Available Service Requests</div>
            <div className="text-sm text-gray-600 mt-1">Start by checking back later for new service requests.</div>
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
                {displayItems.map((req, i) => {
                  const types = uniq(toList(req.service_type || '—'));
                  const tasks = uniq(toList(req.service_task || '—'));

                  const MAX_TYPES = 5;
                  const MAX_TASKS = 5;

                  const typeShow = (types.length ? types : ['—']).slice(0, MAX_TYPES);
                  const typeMore = Math.max(0, (types.length ? types.length : 1) - typeShow.length);

                  const taskShow = (tasks.length ? tasks : ['—']).slice(0, MAX_TASKS);
                  const taskMore = Math.max(0, (tasks.length ? tasks.length : 1) - taskShow.length);

                  const showWorkersNeeded = String(req.workers_needed || '').trim();

                  const showBarangay = String(req.barangay || '').trim();
                  const showStreet = String(req.street || '').trim();

                  return (
                    <div
                      key={req.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="group relative overflow-hidden flex-shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:shadow-xl"
                      style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
                    >
                      <div className="relative z-10 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0 ring-2 ring-white">
                                <img
                                  src={req.image}
                                  alt={req.name}
                                  className="h-full w-full object-cover"
                                  onLoad={() => requestAnimationFrame(recomputePositions)}
                                  onError={({ currentTarget }) => {
                                    currentTarget.style.display = 'none';
                                    const parent = currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="h-full w-full grid place-items-center bg-gray-100 text-gray-700 text-base font-semibold">${(req.name || '?')
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
                                <span className="text-sm font-semibold text-gray-700 shrink-0">Client:</span>
                                <span className="text-base md:text-lg font-semibold text-[#008cfc] leading-tight truncate">
                                  {req.name}
                                </span>
                              </div>
                              {req.email ? <div className="text-xs text-gray-600 truncate">{req.email}</div> : null}
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
                            <div className="text-sm font-semibold text-gray-700 mb-2">Preferred Schedule</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                {fmtDate(req.preferred_date) || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                {fmtTime(req.preferred_time) || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                {toBool(req.urgency) ? 'Urgent' : 'Not urgent'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-0 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur overflow-hidden">
                            <div className="p-3 border-r border-gray-200">
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
                                  <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                    +{typeMore} more
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="p-3">
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
                                  <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                    +{taskMore} more
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-3">
                            <div className="text-sm font-semibold text-gray-700">Request Description</div>
                            <div className="mt-1 text-sm text-[#008cfc] line-clamp-3">{req.description || '—'}</div>

                            <div className="mt-3 h-px bg-gray-200" />

                            <div className="mt-3 grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-gray-200">
                              <div className="p-3 bg-white border-r border-gray-200">
                                <div className="text-xs font-semibold text-gray-700">Workers Needed</div>
                                <div className="mt-1 text-sm font-semibold text-[#008cfc]">
                                  {showWorkersNeeded || '—'}
                                </div>
                              </div>

                              <div className="p-3 bg-white">
                                <div className="text-xs font-semibold text-gray-700">Total Rate</div>
                                <div className="mt-1 text-sm font-semibold text-[#008cfc]">{req.price || '—'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 h-px bg-gray-200" />

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm flex items-baseline gap-1 min-w-0">
                              <span className="font-semibold text-gray-700 shrink-0">Barangay:</span>
                              <span className="text-[#008cfc] truncate">{showBarangay || '—'}</span>
                            </div>

                            <div className="mt-1 text-sm flex items-baseline gap-1 min-w-0">
                              <span className="font-semibold text-gray-700 shrink-0">Street:</span>
                              <span className="text-[#008cfc] truncate">{showStreet || '—'}</span>
                            </div>

                            {req.additional_address ? (
                              <div className="mt-1 text-sm flex items-baseline gap-1">
                                <span className="font-semibold text-gray-700">Landmark:</span>
                                <span className="text-[#008cfc] truncate">{req.additional_address}</span>
                              </div>
                            ) : null}
                          </div>

                          <a
                            href={req.request_group_id ? `/worker/requests/${req.request_group_id}` : '#'}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.preventDefault();
                              setViewRequest(req);
                              setViewOpen(true);
                            }}
                            className="shrink-0 inline-flex items-center justify-center px-4 h-10 rounded-md bg-[#008cfc] text-white text-sm font-semibold hover:bg-[#0078d6] transition shadow-sm group-hover:shadow-md"
                          >
                            View request
                          </a>
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
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <WorkerViewRequest open={viewOpen} onClose={() => setViewOpen(false)} request={viewRequest} />

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

export default WorkerAvailableServiceRequest;
