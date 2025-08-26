// AdminSideNavigation.jsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Settings as SettingsIcon,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',           to: '/admindashboard',           icon: LayoutDashboard },
  { label: 'Manage Users',        to: '/admin/manage-users',       icon: Users },
  { label: 'Worker Applications', to: '/admin/worker-applications',icon: ClipboardList },
  { label: 'Service Request',     to: '/admin/service-requests',   icon: FileText },
  { label: 'Settings',            to: '/admin/settings',           icon: SettingsIcon },
];

const AdminSideNavigation = () => {
  return (
    <aside className="h-screen w-72 shrink-0 bg-white px-3 py-4">
      <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-3 flex flex-col">
        {/* Brand (logo image + name) */}
        <Link to="/admindashboard" className="flex items-center gap-3 px-2 py-2">
          <img
            src="/jdklogo.png"     /* <- swap to your logo path if different */
            alt="JDK Homecare"
            className="h-56 w-56 -mt-20 rounded-xl object-contain"
          />
        </Link>

        {/* Nav */}
        <nav className="-mt-16 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admindashboard'}
              className={({ isActive }) =>
                [
                  // slightly bigger font + comfy padding
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default AdminSideNavigation;
