// src/components/AdminTopNavigation.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Bell } from 'lucide-react';

const getGreeting = (d = new Date()) => {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
};

const AdminTopNavigation = () => {
  const [now, setNow] = useState(new Date());
  const firstName =
    (typeof window !== 'undefined' && localStorage.getItem('first_name')) || '';
  const greeting = useMemo(() => getGreeting(now), [now]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-b from-indigo-50/70 to-transparent px-4 py-3">
      <div className="mx-auto rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
        {/* Left: Search */}
        <div className="flex-1 max-w-xl">
          <label className="relative block">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Search for..."
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-[15px] md:text-base text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
            />
          </label>
        </div>

        {/* Right cluster */}
        <div className="ml-4 flex items-center gap-4">
          {/* Greeting pill */}
          <div className="hidden sm:flex items-center rounded-xl border border-gray-200 bg-white px-4 h-10 text-[15px] md:text-base font-medium text-gray-700 shadow-sm">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </div>

          {/* Bell */}
          <button
            type="button"
            className="relative inline-flex items-center justify-center rounded-xl h-10 w-10 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* Avatar */}
          <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200">
            <img
              src="/adminicon.png"
              alt="Admin"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/Clienticon.png';
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopNavigation;
