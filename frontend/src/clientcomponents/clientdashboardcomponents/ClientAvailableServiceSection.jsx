import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const services = [
  {
    image: '/Carpentry.jpg',
    title: 'Carpentry',
    description: 'Need help with carpentry? Book a carpenter today and enjoy hassle-free service right at your doorstep!',
  },
  {
    image: '/Electrician2.jpg',
    title: 'Electrical Works',
    description: 'Have electrical issues? Book an expert today for quick and reliable electrical services, right at your home!',
  },
  {
    image: '/Plumbing.jpg',
    title: 'Plumbing',
    description: 'Got plumbing problems? Book a plumber now for fast and reliable service to fix leaks, pipes, and more!',
  },
  {
    image: '/Carwasher.jpg',
    title: 'Car Washing',
    description: 'Want a spotless car? Book a car wash today and enjoy a clean, shiny ride without the hassle!',
  },
  {
    image: '/Laundry.jpg',
    title: 'Laundry',
    description: 'Need your clothes cleaned? Book a laundry service today for fresh, clean clothes delivered right to your door!',
  },
];

const ClientAvailableServiceSection = () => {
  const navigate = useNavigate();
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const goTop = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {} };

  const beginRoute = (to) => {
    if (navLoading) return;
    goTop();
    setNavLoading(true);
    setTimeout(() => { navigate(to); }, 2000);
  };

  const goFindWorker = () => beginRoute('/find-a-worker');

  useEffect(() => {
    if (!navLoading) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
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

  return (
    <section id="services" className="bg-white py-20">
      <div className="max-w-[1525px] mx-auto px-6">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          At JDK HOMECARE,
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          We provide trusted workers for all your home service and maintenance needs. From regular checkups to urgent repairs, our team is here to help keep your home safe, clean, and running smoothly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="relative group rounded-md overflow-hidden p-4 bg-white border border-gray-300 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl cursor-pointer"
              onClick={goFindWorker}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goFindWorker(); }}
            >
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-36 object-cover rounded-xl mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

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
    </section>
  );
};

export default ClientAvailableServiceSection;
