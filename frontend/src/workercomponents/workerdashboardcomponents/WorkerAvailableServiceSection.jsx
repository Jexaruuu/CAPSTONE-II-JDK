import React from 'react';

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

// 1) Optional network fallback (like your other screens)
const dicebearFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'Service')}`;

// 2) Final fallback: inline SVG data URL with an initial in a circle (no network needed)
const initialDataUrl = (name) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const size = 256;
  const r = size / 2 - 6;
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
      <rect width='100%' height='100%' fill='#EFF6FF'/>
      <circle cx='${size/2}' cy='${size/2}' r='${r}' fill='#FFFFFF' stroke='#3B82F6' stroke-width='8'/>
      <text x='50%' y='50%' dy='.35em' text-anchor='middle'
        font-family='Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif'
        font-size='${size * 0.45}' fill='#1D4ED8'>${initial}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const WorkerAvailableServiceSection = () => {
  return (
    <section id="services" className="bg-white py-20">
      <div className="max-w-[1525px] mx-auto px-6">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          At JDK HOMECARE,
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          Need help at home? Just post a service request and we’ll connect you with trusted workers. From quick fixes to regular upkeep, we’re here to make your home safer, cleaner, and worry-free.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="relative group rounded-md overflow-hidden p-4 bg-white border border-gray-300 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl"
            >
              {/* Image area (unchanged layout) */}
              <div className="w-full h-36 rounded-xl mb-4 overflow-hidden bg-gray-100 relative">
                <img
                  // Try your local image first; if empty, try Dicebear; the last fallback is the inline SVG
                  src={services[idx].image || dicebearFromName(service.title)}
                  alt={service.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const tried = e.currentTarget.getAttribute('data-dicebear-tried');
                    if (!tried) {
                      // Second attempt: Dicebear (keeps parity with your other pages)
                      e.currentTarget.setAttribute('data-dicebear-tried', '1');
                      e.currentTarget.src = dicebearFromName(service.title);
                      return;
                    }
                    // Final, guaranteed fallback: inline SVG with initial (prevents alt text from showing)
                    e.currentTarget.onerror = null; // stop loops
                    e.currentTarget.src = initialDataUrl(service.title);
                  }}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkerAvailableServiceSection;
