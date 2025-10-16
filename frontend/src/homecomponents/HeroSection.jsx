import React, { useEffect, useState } from 'react';
import { FaAndroid, FaCalendarAlt } from 'react-icons/fa';

const HeroSection = () => {
  const [typed, setTyped] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const full = 'Home help, fast and easy.';

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i === full.length) {
        clearInterval(id);
        setShowCursor(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-white min-h-screen relative">
      <div className="max-w-[1535px] mx-auto px-8 py-11 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm border bg-[#008cfc] text-white border-[#008cfc]">
            <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
            <span>Now on mobile</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            {typed}
            {showCursor && <span className="ml-1 border-r-2 border-gray-900 animate-pulse">&nbsp;</span>}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Clients get trusted help fast. Workers get jobs. With <span className="text-[#008cfc]">JDK Homecare</span>, you can book, chat, share photos, and follow every step until the job is done.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a
              href="#"
              className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <FaAndroid className="h-5 w-5 shrink-0" />
              Download the app
            </a>
            <a
              href="#book"
              className="bg-white text-[#008cfc] font-medium py-3 px-6 rounded-md flex items-center gap-2 border border-[#008cfc]"
            >
              <FaCalendarAlt className="h-5 w-5 shrink-0" />
              Book a service now
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-900">Fast booking</p>
              <p className="text-sm text-gray-500">Request a service in minutes and let the app match you with verified workers.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-900">Track in real time</p>
              <p className="text-sm text-gray-500">Get status updates, chat, and manage schedules on the go.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-900">Transparent pricing</p>
              <p className="text-sm text-gray-500">Clear rates with no hidden fees, tailored to your budget.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <img src="/Carpenter.jpg" alt="Carpenter" className="rounded-2xl object-cover w-full h-96 mt-5 ml-3 shadow-sm" />
          <img src="/Carwash.jpg" alt="Carwash" className="rounded-2xl object-cover w-full h-80 mt-5 ml-3.5 shadow-sm" />
          <img src="/Plumber2.jpg" alt="Plumbing" className="rounded-2xl object-cover w-full h-80 ml-3 shadow-sm" />
          <img src="/Electrician.jpg" alt="Electrician" className="rounded-2xl object-cover w-full h-96 -mt-16 ml-3.5 shadow-sm" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
