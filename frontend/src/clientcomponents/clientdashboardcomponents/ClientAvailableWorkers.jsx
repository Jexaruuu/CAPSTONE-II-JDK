// ClientAvailableWorkers.jsx
import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

const ClientAvailableWorkers = () => {
  const workers = [
    { id: 1, name: 'Juan Dela Cruz', skill: 'Plumber', image: '/workers/juan.png' },
    { id: 2, name: 'Maria Santos', skill: 'Electrician', image: '/workers/maria.png' },
    { id: 3, name: 'Pedro Reyes', skill: 'Carpenter', image: '/workers/pedro.png' },
    { id: 4, name: 'Ana Lopez', skill: 'House Cleaner', image: '/workers/ana.png' },
    { id: 5, name: 'Ana Lopez', skill: 'House Cleaner', image: '/workers/ana.png' },
    { id: 6, name: 'Ana Lopez', skill: 'House Cleaner', image: '/workers/ana.png' },
    { id: 7, name: 'J Lopez',  skill: 'House Cleaner', image: '/workers/ana.png' },
  ];

  const PER_PAGE = 3;

  const scrollRef = useRef(null);
  const wrapRef   = useRef(null);
  const cardRefs  = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW]   = useState(340);
  const [endPad, setEndPad] = useState(0);

  const totalSlides = Math.max(1, Math.ceil(workers.length / PER_PAGE));

  const handleScroll = (direction) => {
    const next = direction === 'left' ? current - 1 : current + 1;
    scrollToIndex(next);
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
    const clamped = Math.max(300, Math.min(520, exact));
    setCardW(clamped);

    const pageWidth = PER_PAGE * clamped + GAP * (PER_PAGE - 1);
    const rem       = workers.length % PER_PAGE;
    const lastCount = rem === 0 ? PER_PAGE : rem;
    const lastWidth = lastCount * clamped + GAP * Math.max(0, lastCount - 1);
    const padNeeded = Math.max(0, pageWidth - lastWidth);
    setEndPad(rem === 0 ? 0 : padNeeded);
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
  }, [workers.length, cardW, endPad]);

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

  return (
    <div className="max-w-[1525px] mx-auto px-6 -py-10 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Available Workers</h2>
        <a
          href="/browse-workers"
          className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline"
        >
          Browse available workers <ArrowRight size={16} />
        </a>
      </div>

      <div className="relative w-full flex justify-center items-center">
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
        >
          <ArrowLeft size={22} />
        </button>

        <div ref={wrapRef} className="w-full max-w-[1425px] overflow-hidden px-12 py-2">
          <div
            ref={scrollRef}
            onScroll={onTrackScroll}
            className="flex space-x-6 overflow-x-scroll scroll-smooth no-scrollbar pl-4 pr-4 select-none no-hand"
            style={{ touchAction: 'pan-x' }}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            onClickCapture={onTrackClickCapture}
          >
            {workers.map((worker, i) => (
              <div
                key={worker.id}
                ref={(el) => (cardRefs.current[i] = el)}
                className="relative overflow-hidden min-w-[320px] sm:min-w-[360px] md:min-w-[400px] w-[320px] sm:w-[360px] md:w-[400px] h-auto flex-shrink-0 bg-white border border-gray-300 rounded-xl p-6 text-left shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl hover:ring-inset card-border-fix flex flex-col"
                style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-inner ring-2 ring-[#008cfc]">
                    <img
                      src={worker.image || avatarFromName(worker.name)}
                      alt={worker.name}
                      className="h-full w-full object-cover"
                      onLoad={() => requestAnimationFrame(recomputePositions)}
                      onError={({ currentTarget }) => {
                        currentTarget.style.display = 'none';
                        const parent = currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="h-full w-full grid place-items-center bg-blue-100 text-blue-700 text-lg font-semibold">${(worker.name || '?')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}</div>`;
                        }
                        requestAnimationFrame(recomputePositions);
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">
                      {worker.name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {worker.skill}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
            <div aria-hidden className="flex-shrink-0" style={{ width: `${endPad}px` }} />
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

      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .drag-active { cursor: default !important; }
        .no-hand { cursor: default !important; }
        .card-border-fix::after { content: none; }
      `}</style>
    </div>
  );
};

export default ClientAvailableWorkers;
