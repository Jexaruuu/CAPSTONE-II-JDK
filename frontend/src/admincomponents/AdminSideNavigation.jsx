import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import axios from 'axios';
import { sbAdmin as supabase } from '../supabaseBrowser';

const navItems = [
  { label: 'Dashboard',           to: '/admindashboard',                     icon: LayoutDashboard },
  { label: 'Manage Users',        to: '/admindashboard/manage-users',        icon: Users },
  { label: 'Service Request',     to: '/admindashboard/service-requests',    icon: FileText },
  { label: 'Worker Applications', to: '/admindashboard/worker-applications', icon: ClipboardList },
];

const AdminSideNavigation = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      try {
        await axios.post('http://localhost:5000/api/admin/logout', {}, { withCredentials: true });
      } catch {
        try {
          await axios.post('http://localhost:5000/api/login/logout', {}, { withCredentials: true });
        } catch {}
      }
      try { await supabase.auth.signOut(); } catch {}
    } finally {
      try {
        localStorage.removeItem('first_name');
        localStorage.removeItem('last_name');
        localStorage.removeItem('sex');
        localStorage.removeItem('role');
        localStorage.removeItem('admin_no');
        localStorage.removeItem('auth_uid');
      } catch {}
      navigate('/adminlogin', { replace: true });
    }
  };

  return (
    <aside className="h-screen w-72 shrink-0 px-3 py-4">
      <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-3 flex flex-col">
        <Link to="/admindashboard" className="flex items-center gap-3 px-2 py-2">
          <img
            src="/jdklogo.png"
            alt="JDK Homecare"
            className="h-56 w-56 -mt-20 rounded-xl object-contain"
          />
        </Link>

        <nav className="-mt-16 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admindashboard'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-[#008cfc]'
                    : 'text-black hover:bg-gray-50 hover:text-[#008cfc]',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors text-black hover:bg-gray-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSideNavigation;
