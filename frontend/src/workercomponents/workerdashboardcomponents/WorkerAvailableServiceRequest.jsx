// WorkerAvailableServiceRequest.jsx
import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

const WorkerAvailableServiceRequest = () => {
  const requests = [
    { id: 1, name: 'Carlos Rivera', task: 'Fix leaking sink', image: '/clients/carlos.png' },
    { id: 2, name: 'Liza Cruz', task: 'Rewire living room', image: '/clients/liza.png' },
    { id: 3, name: 'Mark Tan', task: 'Build storage shelf', image: '/clients/mark.png' },
    { id: 4, name: 'Jenna Uy', task: 'Deep house cleaning', image: '/clients/jenna.png' },
    { id: 5, name: 'R. Santos', task: 'Car wash + waxing', image: '/clients/rsantos.png' },
    { id: 6, name: 'A. Lim', task: 'Laundry & folding', image: '/clients/alim.png' },
    { id: 7, name: 'P. Dela Cruz', task: 'Bathroom plumbing', image: '/clients/pdc.png' },
  ];

  const items = requests.map((r, i) => ({
    ...r,
    country: ['Philippines','United States','Portugal','India'][i % 4],
    stat1Title: 'Priority',
    stat1Value: ['Normal','Urgent','Normal','Urgent'][i % 4],
    stat2Title: 'Jobs Posted',
    stat2Value: [5,12,2,18][i % 4],
    stat3Title: 'Budget',
    stat3Value: ['₱800','₱1,500','₱2,000','₱600'][i % 4],
    desc:
      'Looking for a reliable professional. Materials can be discussed. Please include availability and a brief approach.',
    meetText: ['₱150 for 15 minutes Zoom chat','₱200 for 20 minutes Zoom chat','₱300 for 30 minutes Zoom chat','₱100 for 10 minutes Zoom chat'][i % 4]
  }));

  const displayItems = items.slice(0, 10);

  const PER_PAGE = 3;

  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);

  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);

  const GAP = 24;

  const [cardW, setCardW] = useState(340);
  const [endPad, setEndPad] = useState(0);

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
    const clamped = Math.max(300, Math.min(520, exact));
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

  const getViewSlideLefts = () => {
    const el = scrollRef.current;
    if (!el || positions.length === 0) return positions;
    const arr = positions.slice();
    arr[arr.length - 1] = Math.max(0, el.scrollWidth - el.clientWidth - getRightPad(el));
    return arr;
  };

  const handleScroll = (direction) => {
    const next = direction === 'left' ? current - 1 : current + 1;
    scrollToIndex(next);
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

  return (
    <div className="max-w-[1525px] mx-auto px-6 -py-5 relative">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-800">Available Service Requests</h2>
        <a href="/browse-requests" className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline">
          Browse available requests <ArrowRight size={16} />
        </a>
      </div>

      <div className="relative w-full flex justify-center items-center">
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
        >
          <ArrowLeft size={22} />
        </button>

        <div ref={wrapRef} className="w-full max-w-[1425px] overflow-visible px-12 py-2">
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
            {displayItems.map((req, i) => (
              <div
                key={req.id}
                ref={(el) => (cardRefs.current[i] = el)}
                className="relative overflow-hidden flex-shrink-0 bg-white border border-gray-300 rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:shadow-lg"
                style={{ width: `${cardW}px`, minWidth: `${cardW}px` }}
              >
                <button className="absolute top-4 right-4 h-8 w-8 rounded-full grid place-items-center hover:bg-gray-100">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400"><path d="M12 21s-7.5-4.35-10-8.74C.35 9.36 2.01 6 5.2 6c1.92 0 3.09 1.02 3.8 2.06C9.71 7.02 10.88 6 12.8 6c3.19 0 4.85 3.36 3.2 6.26C19.5 16.65 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <img
                      src={req.image || avatarFromName(req.name)}
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
                    <div className="text-sm text-gray-600">{req.country}</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                    <div className="font-semibold text-gray-900">{req.stat1Value}</div>
                    <div className="text-gray-500 text-xs">{req.stat1Title}</div>
                  </div>
                  <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                    <div className="font-semibold text-gray-900">{req.stat2Value}</div>
                    <div className="text-gray-500 text-xs">{req.stat2Title}</div>
                  </div>
                  <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
                    <div className="font-semibold text-gray-900">{req.stat3Value}</div>
                    <div className="text-gray-500 text-xs">{req.stat3Title}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-semibold text-gray-900 leading-snug line-clamp-2">{req.task}</div>
                  <div className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">{req.desc}</div>
                </div>

                <a href="#" className="mt-4 inline-flex items-center gap-2 text-sm text-[#008cfc] hover:underline">
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M9 10l3 2 3-2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  {req.meetText}
                </a>

                <button className="mt-4 w-full h-11 rounded-lg border border-emerald-500 text-emerald-600 font-medium hover:bg-emerald-50 transition">
                  Send a proposal
                </button>
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
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default WorkerAvailableServiceRequest;
