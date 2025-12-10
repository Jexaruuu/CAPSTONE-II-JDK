import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt, Star } from 'lucide-react';
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
  const t = String(rate?.rate_type || '').toLowerCase();
  const peso = (n) => `₱${Number(n).toLocaleString()}`;
  if (t.includes('hour')) {
    const f = rate?.rate_from, to = rate?.rate_to;
    if (f && to) return `${peso(f)} - ${peso(to)}`;
    if (f) return `${peso(f)}`;
    if (to) return `${peso(to)}`;
  }
  if (t.includes('job') && rate?.rate_value) return peso(rate.rate_value);
  if (t === 'fixed' && rate?.rate_value) return peso(rate.rate_value);
  if (t === 'range' && (rate?.rate_from || rate?.rate_to)) {
    const a = rate?.rate_from ? peso(rate.rate_from) : '';
    const b = rate?.rate_to ? peso(rate.rate_to) : '';
    return [a, b].filter(Boolean).join(' - ');
  }
  if (rate?.rate_value) return peso(rate.rate_value);
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
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v && typeof v === 'object' ? v : {};
};

const WorkerAvailableServiceRequest = () => {
  const [items, setItems] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);

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
    let ok = true;
    (async () => {
      const base = API_BASE.replace(/\/+$/,'');
      const paths = [
        `${base}/api/admin/servicerequests`,
        `${base}/api/admin/servicerequests/approved`,
        `${base}/admin/servicerequests/approved`,
        `${base}/admin/service-requests`,
        `${base}/admin/servicerequests`
      ];
      let dataArr = [];
      for (const url of paths) {
        try {
          const { data, status } = await axios.get(url, { params: { status: 'approved' } });
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
            if (arr) { dataArr = arr; break; }
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
          pick(i, ['barangay','brgy']) ||
          pick(ia, ['barangay','brgy']) ||
          pick(d, ['barangay']) ||
          pick(da, ['barangay']);
        const street =
          pick(i, ['street','street_name','street_address','address_line1']) ||
          pick(ia, ['street','street_name','street_address','address_line1']) ||
          pick(d, ['street','street_name','street_address']) ||
          pick(da, ['street','street_name','street_address']);
        const addl =
          pick(i, ['additional_address','additional_street','address_line2']) ||
          pick(ia, ['additional_address','additional_street','address_line2']) ||
          pick(d, ['additional_address','additional_street','address_line2']) ||
          pick(da, ['additional_address','additional_street','address_line2']);
        const addressLine = [barangay, street, addl].map((s)=>String(s||'').trim()).filter(Boolean).join(', ');
        const dt = buildDateTime(d.preferred_date || '', d.preferred_time || '');
        const statusLower = String(r.status || '').toLowerCase();
        const isExpired = statusLower === 'expired' || (dt && dt.getTime() < now);
        const iconLabels = [];
        const pushType = (val) => {
          if (val == null) return;
          if (Array.isArray(val)) { val.forEach(pushType); return; }
          if (typeof val === 'object') {
            if (val.category) iconLabels.push(String(val.category));
            else if (val.name) iconLabels.push(String(val.name));
            else if (val.type) iconLabels.push(String(val.type));
            return;
          }
          String(val).split(/[,/|]+/).forEach((s) => { s = s.trim(); if (s) iconLabels.push(s); });
        };
        pushType(d.service_type);
        const seen = new Set();
        const icons = [];
        iconLabels.forEach((lbl) => {
          const Icon = getServiceIcon(lbl);
          const key = Icon.displayName || Icon.name || 'Icon';
          if (!seen.has(key)) { seen.add(key); icons.push(Icon); }
        });
        const serviceIcons = icons.slice(0, 3);
        const mergedRate = rate.rate_type
          ? rate
          : { ...rate, rate_type: d.rate_type, rate_from: d.rate_from, rate_to: d.rate_to, rate_value: d.rate_value };
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
          service_type: d.service_type || '',
          service_task: d.service_task || '',
          description: d.service_description || '',
          rate_type: mergedRate.rate_type || '',
          price: fmtRate(mergedRate),
          addressLine,
          isExpired,
          serviceIcons
        };
      });
      const active = mapped.filter((x) => !x.isExpired);
      setItems(active);
    })();
    return () => { ok = false; };
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
    const fallback = idx * (({width:cardW}+GAP)*PER_PAGE - GAP);
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
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-800">Available Service Requests</h2>
        <a href="/browse-requests" className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline">
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
                  const Icon = getServiceIcon(req.service_type);
                  return (
                    <div
                      key={req.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="relative overflow-hidden flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-inset hover:ring-[#008cfc] hover:shadow-xl"
                      style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
                    >
                      <div className="absolute inset-0 bg-[url('/Bluelogo.png')] bg-no-repeat bg-[length:380px] bg-[position:right_50%] opacity-10 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                              <img
                                src={req.image}
                                alt={req.name}
                                className="h-full w-full object-cover"
                                onLoad={() => requestAnimationFrame(recomputePositions)}
                                onError={({ currentTarget }) => {
                                  currentTarget.style.display = 'none';
                                  const parent = currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="h-full w-full grid place-items-center bg-blue-100 text-blue-700 text-base font-semibold">${(req.name || '?').trim().charAt(0).toUpperCase()}</div>`;
                                  }
                                  requestAnimationFrame(recomputePositions);
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm md:text-lg font-semibold text-gray-700">Client:</span>
                                <span className="text-lg md:text-lg font-semibold text-[#008cfc] leading-tight truncate">{req.name}</span>
                              </div>
                              {req.email ? (
                                <div className="text-xs text-gray-600 truncate">{req.email}</div>
                              ) : null}
                              <div className="mt-1 flex items-center gap-1">
                                {[0,1,2,3,4].map((idx) => (
                                  <Star
                                    key={idx}
                                    size={14}
                                    className="text-gray-300"
                                    fill="currentColor"
                                  />
                                ))}
                                <span className="text-xs font-medium text-gray-700">0.0/5</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {(req.serviceIcons || []).map((Ic, idx) => (
                              <span key={idx} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                                <Ic size={16} className="text-[#008cfc]" />
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 h-px bg-gray-200" />

                        <div className="mt-4">
                          <div className="text-sm font-semibold text-gray-700">Preferred Schedule</div>
                          <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                            <span className="text-[#008cfc]">{fmtDate(req.preferred_date) || '—'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-[#008cfc]">{fmtTime(req.preferred_time) || '—'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-[#008cfc]">{toBool(req.urgency) ? 'Urgent' : 'Not urgent'}</span>
                          </div>

                          <div className="mt-3 flex items-start gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-700">Service Type</div>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                  {req.service_type || '—'}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-700">Service Task</div>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                                  {req.service_task || '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-sm font-semibold text-gray-700">Request Description</div>
                          <div className="text-sm text-[#008cfc] font-medium leading-relaxed line-clamp-3">{req.description || '—'}</div>
                        </div>

                        <div className="mt-4 h-px bg-gray-200" />

                        <div className="mt-4">
                          <div className="text-sm font-semibold text-[#008cfc]">
                            {[req.barangay, req.street].filter(Boolean).join(', ') || req.addressLine}
                          </div>
                          {req.additional_address ? (
                            <div className="text-sm flex items-baseline gap-1">
                              <span className="font-semibold text-gray-700">Landmark:</span>
                              <span className="text-[#008cfc]">{req.additional_address}</span>
                            </div>
                          ) : null}

                          <div className="mt-1 flex items-end justify-between">
                            <div className="flex items-center gap-2">
                              {req.rate_type && <div className="text-sm font-semibold text-[#008cfc]">{req.rate_type}</div>}
                              {req.rate_type ? <span className="text-gray-400">•</span> : null}
                              <div className="text-sm font-semibold text-[#008cfc]">{req.price || 'Rate upon request'}</div>
                            </div>
                            <a
                              href={req.request_group_id ? `/worker/requests/${req.request_group_id}` : '#'}
                              onPointerDown={(e)=>e.stopPropagation()}
                              onClick={(e)=>{ e.preventDefault(); setViewRequest(req); setViewOpen(true); }}
                              className="inline-flex items-center justify-center px-4 h-10 rounded-lg bg-[#008cfc] text-white text-sm font-medium hover:bg-[#0078d6] transition self-end"
                            >
                              View Request
                            </a>
                          </div>
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

      <WorkerViewRequest open={viewOpen} onClose={()=>setViewOpen(false)} request={viewRequest} />
    </div>
  );
};

export default WorkerAvailableServiceRequest;
