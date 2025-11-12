// ClientAvailableWorkers.jsx
import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

function peso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return `₱${x.toLocaleString()}`;
}

function primaryRate(rate) {
  const t = String(rate?.rate_type || '').toLowerCase();
  if (t === 'hourly rate') {
    const f = rate?.rate_from, to = rate?.rate_to;
    if (f && to) return `${peso(f)}–${peso(to)}/hr`;
    if (f) return `${peso(f)}/hr`;
    if (to) return `${peso(to)}/hr`;
  }
  if (t === 'by the job rate' && rate?.rate_value) return `${peso(rate.rate_value)}/job`;
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

const ClientAvailableWorkers = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const url = `${API_BASE}/api/admin/workerapplications?status=approved`;
        const { data } = await axios.get(url);
        const rows = Array.isArray(data?.items) ? data.items : [];
        const mapped = rows.map((r, i) => {
          const info = r.info || {};
          const work = r.work || {};
          const rate = r.rate || {};
          const name = [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Worker';
          const img = info.profile_picture_url || '';
          const st = Array.isArray(work.service_types) ? work.service_types : [];
          const skill = st[0] || 'General';
          const rateText = primaryRate(rate) || 'Rate upon request';
          const bio = work.work_description || 'Experienced home service professional focused on reliable, high-quality work and great communication.';
          const country = 'Philippines';
          const success = '—';
          const jobs = 0;
          const consultText = rateText ? `${rateText} consultation` : 'Consultation available';
          return {
            id: r.id || `${r.request_group_id || i}`,
            name,
            skill,
            image: img,
            country,
            success,
            jobs,
            rate: rateText,
            title: titleFromServiceTypes(st),
            bio,
            consultText
          };
        });
        if (alive) setItems(mapped);
      } catch {
        if (alive) setItems([]);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const PER_PAGE = 3;
  const PAGE_SIZE = 3;

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const displayItems = items.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

  const scrollRef = useRef(null);
  const wrapRef   = useRef(null);
  const cardRefs  = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW]   = useState(420);
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
    const idx  = Math.max(0, Math.min(totalSlides - 1, i));
    const left = positions.length ? positions[idx] : idx * ((cardW + GAP) * PER_PAGE - GAP);
    el.scrollTo({ left, behavior: 'smooth' });
    setCurrent(idx);
  };

  const getHPad = (el) => {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  };

  const recomputeCardWidth = () => {
    const wrap  = wrapRef.current;
    const track = scrollRef.current;
    if (!wrap || !track) return;
    const visible = wrap.clientWidth - getHPad(wrap) - getHPad(track);
    const exact   = Math.floor((visible - GAP * (PER_PAGE - 1)) / PER_PAGE);
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
  const pointerIdRef     = useRef(null);
  const startXRef        = useRef(0);
  const startLeftRef     = useRef(0);
  const movedRef         = useRef(false);

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
        <a href="/browse-workers" className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline">
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
                {displayItems.map((w, i) => (
                  <div
                    key={w.id}
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
                          src={w.image || avatarFromName(w.name)}
                          alt={w.name}
                          className="h-full w-full object-cover"
                          onLoad={() => requestAnimationFrame(recomputePositions)}
                          onError={({ currentTarget }) => {
                            currentTarget.style.display = 'none';
                            const parent = currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="h-full w-full grid place-items-center bg-blue-100 text-blue-700 text-base font-semibold">${(w.name || '?').trim().charAt(0).toUpperCase()}</div>`;
                            }
                            requestAnimationFrame(recomputePositions);
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-gray-900 truncate">{w.name}</div>
                        <div className="text-sm text-gray-600">{w.country}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                        <div className="font-semibold text-gray-900">{w.success}</div>
                        <div className="text-gray-500 text-xs">Job Success</div>
                      </div>
                      <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                        <div className="font-semibold text-gray-900">{w.jobs}</div>
                        <div className="text-gray-500 text-xs">Jobs</div>
                      </div>
                      <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                        <div className="font-semibold text-gray-900">{w.rate}</div>
                        <div className="text-gray-500 text-xs">Rate</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="font-semibold text-gray-900 leading-snug line-clamp-2">{w.title}</div>
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">{w.bio}</div>
                    </div>

                    <a href="#" className="mt-4 w-full h-11 rounded-lg bg-[#008cfc] text-white font-medium grid place-items-center hover:bg-blue-700 transition">
                      View Worker
                    </a>
                  </div>
                ))}
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
              {items.length} {items.length === 1 ? 'worker' : 'workers'}
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
              {(() => {
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
                return out.map((pg, idx) =>
                  typeof pg === 'number' ? (
                    <button
                      key={`${pg}-${idx}`}
                      onClick={() => setPage(pg)}
                      className={`h-9 min-w-9 px-3 rounded-md border text-sm ${
                        pg === page ? 'border-[#008cfc] bg-[#008cfc] text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-current={pg === page ? 'page' : undefined}
                    >
                      {pg}
                    </button>
                  ) : (
                    <span key={`dots-${idx}`} className="px-1 text-gray-500 select-none">…</span>
                  )
                );
              })()}
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
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default ClientAvailableWorkers;
