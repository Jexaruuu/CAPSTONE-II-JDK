// WorkerAvailableServiceRequest.jsx
import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, ArrowLeft, Hammer, Zap, Wrench, Car, Shirt } from 'lucide-react';

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

const WorkerAvailableServiceRequest = () => {
  const [items, setItems] = useState([]);

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
        const i = r.info || {};
        const d = r.details || {};
        const rate = r.rate || {};
        const name = [i.first_name, i.last_name].filter(Boolean).join(' ').trim() || 'Client';
        const addressLine = [i.barangay, i.street, i.additional_address].filter(Boolean).join(', ');
        const dt = buildDateTime(d.preferred_date || '', d.preferred_time || '');
        const statusLower = String(r.status || '').toLowerCase();
        const isExpired = statusLower === 'expired' || (dt && dt.getTime() < now);
        return {
          id: r.id || idx + 1,
          request_group_id: r.request_group_id || '',
          name,
          image: i.profile_picture_url || avatarFromName(name),
          barangay: i.barangay || '',
          street: i.street || '',
          additional_address: i.additional_address || '',
          preferred_date: d.preferred_date || '',
          preferred_time: d.preferred_time || '',
          urgency: (d.is_urgent || '').toString(),
          service_type: d.service_type || '',
          service_task: d.service_task || '',
          description: d.service_description || '',
          rate_type: rate.rate_type || '',
          price: fmtRate(rate),
          addressLine,
          isExpired
        };
      });
      const active = mapped.filter((x) => !x.isExpired);
      setItems(active);
    })();
    return () => { ok = false; };
  }, []);

  const PER_PAGE = 3;

  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW] = useState(420);
  const [endPad, setEndPad] = useState(0);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const displayItems = items.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

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
    setCurrent(idx);
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
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
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
                className="flex space-x-6 overflow-x-scroll scroll-smooth no-scrollbar pl-4 pr-4 select-none no-hand"
                style={{ touchAction: 'auto' }}
              >
                {displayItems.map((req, i) => {
                  const Icon = getServiceIcon(req.service_type);
                  return (
                    <div
                      key={req.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="relative overflow-hidden flex-shrink-0 bg-white border border-gray-300 rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:ring-2 hover:ring-inset hover:ring-[#008cfc] hover:border-[#008cfc] hover:shadow-xl"
                      style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
                    >
                      <button className="absolute top-4 right-4 h-8 w-8 rounded-full grid place-items-center hover:bg-gray-100">
                        <img src="/verifiedicon.png" alt="" className="h-7 w-7 object-contain" />
                      </button>

                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden">
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
                          <div className="text-lg font-semibold text-gray-900 truncate">{req.name}</div>
                          <div className="text-sm text-gray-600 truncate">{req.addressLine}</div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                          <div className="font-semibold text-gray-900">{fmtDate(req.preferred_date)}</div>
                          <div className="text-gray-500 text-xs">Preferred Date</div>
                        </div>
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                          <div className="font-semibold text-gray-900">{fmtTime(req.preferred_time)}</div>
                          <div className="text-gray-500 text-xs">Preferred Time</div>
                        </div>
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                          <div className={`font-semibold ${toBool(req.urgency) ? 'text-green-600' : 'text-red-600'}`}>{toBool(req.urgency) ? 'Yes' : 'No'}</div>
                          <div className="text-gray-500 text-xs">Urgency</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Service Type</div>
                        <div className="font-semibold text-[#008cfc]">{req.service_type}</div>
                        <div className="mt-3 text-xs uppercase tracking-wide text-gray-500">Service Task</div>
                        <div className="font-semibold text-[#008cfc]">{req.service_task}</div>
                        <div className="mt-3 text-xs uppercase tracking-wide text-gray-500">Request Description</div>
                        <div className="text-sm font-semibold text-[#008cfc] leading-relaxed line-clamp-3">{req.description}</div>
                        <div className="mt-3 text-xs uppercase tracking-wide text-gray-500">Rate</div>
                        <div className="text-sm font-semibold text-[#008cfc]">
                          <span className="font-semibold">{req.rate_type ? req.rate_type.toUpperCase() : ''}</span>
                          {req.price ? ` · ${req.price}` : ''}
                        </div>
                      </div>

                      <a
                        href={req.request_group_id ? `/worker/requests/${req.request_group_id}` : '#'}
                        className="mt-4 w-full h-11 rounded-lg bg-[#008cfc] text-white font-medium grid place-items-center hover:bg-blue-700 transition"
                      >
                        View Service Request
                      </a>
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
              {items.length} {items.length === 1 ? 'request' : 'requests'}
            </div>
            <nav className="flex items-center gap-2">
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 hidden"
                disabled
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              {pages.map((p, idx) =>
                typeof p === 'number' ? (
                  <button
                    key={`${p}-${idx}`}
                    onClick={() => setPage(p)}
                    className={`h-9 min-w-9 px-3 rounded-md border text-sm ${
                      p === page ? 'border-[#008cfc] bg-[#008cfc] text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={`dots-${idx}`} className="px-1 text-gray-500 select-none">…</span>
                )
              )}
              <button
                className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 hidden"
                disabled
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
    </div>
  );
};

export default WorkerAvailableServiceRequest;
