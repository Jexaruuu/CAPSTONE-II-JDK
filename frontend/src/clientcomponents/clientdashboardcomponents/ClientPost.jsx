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

const ClientPost = () => {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState([]);
  const [current, setCurrent] = useState(0);
  const [positions, setPositions] = useState([]);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const PER_PAGE = 3;

  const banners = ['/Banner1.jpg', '/Banner2.jpg', '/Banner3.jpg'];

  const [bannerIdx, setBannerIdx] = useState(1);
  const [bannerAnimate, setBannerAnimate] = useState(true);

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
        setApproved(items);
        setCurrent(0);
      })
      .catch(() => setApproved([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length > 1) setBannerIdx(1);
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => {
      setBannerIdx((i) => i + 1);
    }, 10000);
    return () => clearInterval(t);
  }, [banners.length]);

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

  const prev = () => scrollToIndex(Math.max(0, current - 1));
  const next = () => scrollToIndex(Math.min(totalSlides - 1, current + 1));

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

  const loopSlides =
    banners.length > 1 ? [banners[banners.length - 1], ...banners, banners[0]] : [...banners];

  const onBannerTransitionEnd = () => {
    if (banners.length < 2) return;
    const lastIndex = loopSlides.length - 1;
    if (bannerIdx === lastIndex) {
      setBannerAnimate(false);
      setBannerIdx(1);
      requestAnimationFrame(() => setBannerAnimate(true));
    } else if (bannerIdx === 0) {
      setBannerAnimate(false);
      setBannerIdx(banners.length);
      requestAnimationFrame(() => setBannerAnimate(true));
    }
  };

  // --- icon mapping for service types (same set as admin) ---
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

  /* ===========================
     Drag-to-snap for carousel
     =========================== */
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

  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <h2 className="text-4xl font-semibold mb-10">Welcome back, Jex</h2>

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

            {/* Added small vertical padding so outer ring isn't clipped */}
            <div className="w-full max-w-[1425px] overflow-hidden px-12 py-2">
              <div
                ref={trackRef}
                onScroll={onTrackScroll}
                className="flex space-x-6 overflow-x-scroll scroll-smooth no-scrollbar pl-4 pr-4 select-none cursor-grab no-hand"
                style={{ touchAction: 'pan-x' }}
                onPointerDown={onDragPointerDown}
                onPointerMove={onDragPointerMove}
                onPointerUp={onDragPointerUp}
                onPointerCancel={onDragPointerUp}
                onPointerLeave={onDragPointerLeave}
                onClickCapture={onTrackClickCapture}
              >
                {approved.map((item, i) => {
                  const type = item?.details?.service_type || '';
                  const title =
                    type + (item?.details?.service_task ? `: ${item.details.service_task}` : '');
                  const IconComp = getServiceIcon(type);
                  return (
                    <div
                      key={item.id}
                      ref={(el) => (cardRefs.current[i] = el)}
                      className="overflow-hidden min-w-[320px] sm:min-w-[360px] md:min-w-[400px] w-[320px] sm:w-[360px] md:w-[400px] h-auto min-h-[220px] flex flex-col flex-shrink-0 bg-white border border-gray-300 rounded-xl p-6 text-left shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl hover:ring-inset"
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-lg font-semibold text-gray-900">
                          {title || 'Approved Service Request'}
                        </div>
                        <div className="h-9 w-9 rounded-lg border border-gray-400 text-[#008cfc] flex items-center justify-center">
                          <IconComp className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <div className="text-gray-600">
                          {item?.details?.preferred_date || '-'}
                          {item?.details?.preferred_time ? ` • ${item.details.preferred_time}` : ''}
                        </div>
                        <div className="text-gray-600">
                          {item?.info?.barangay ? `Barangay ${item.info.barangay}` : item?.info?.street || ''}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                        >
                          View details
                        </button>

                        <span className="inline-flex items-center h-10 whitespace-nowrap rounded-lg border border-yellow-200 bg-yellow-50 px-2.5 text-xs font-medium text-yellow-700">
                          Waiting for a Worker
                          <span className="ml-1 flex">
                            <span className="cr-dot cr-d1">.</span>
                            <span className="cr-dot cr-d2">.</span>
                            <span className="cr-dot cr-d3">.</span>
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

      {/* Banner slider UNDER the service request cards */}
      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm mt-8">
        <div
          className={['flex', bannerAnimate ? 'transition-transform duration-700 ease-out' : ''].join(' ')}
          style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
          onTransitionEnd={onBannerTransitionEnd}
        >
          {loopSlides.map((src, i) => (
            <div key={i} className="w-full shrink-0">
              <img src={src} alt="" className="w-full h-48 sm:h-60 md:h-72 lg:h-80 object-cover" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes bannerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes crFade {
          0%, 20% { opacity: 0; }
          30%, 60% { opacity: 1; }
          70%, 100% { opacity: 0; }
        }
        .cr-dot { 
          display: inline-block;
          width: 0.35rem; 
          line-height: 1;
          opacity: 0;
          animation: crFade 1.2s infinite;
        }
        .cr-d2 { animation-delay: .2s; }
        .cr-d3 { animation-delay: .4s; }
        .drag-active { cursor: default !important; }
        .no-hand { cursor: default !important; }
      `}</style>
    </div>
  );
};

export default ClientPost;
