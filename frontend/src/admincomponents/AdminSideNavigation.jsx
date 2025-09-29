import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, FileText, LogOut } from 'lucide-react';
import axios from 'axios';
import { sbAdmin as supabase } from '../supabaseBrowser';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const navItems = [
  { label: 'Dashboard',           to: '/admindashboard',                     icon: LayoutDashboard },
  { label: 'Manage Users',        to: '/admindashboard/manage-users',        icon: Users },
  { label: 'Service Request',     to: '/admindashboard/service-requests',    icon: FileText,       badgeKey: 'service' },
  { label: 'Worker Applications', to: '/admindashboard/worker-applications', icon: ClipboardList,  badgeKey: 'worker' },
];

const AdminSideNavigation = () => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingWorkerCount, setPendingWorkerCount] = useState(0);

  const handleLogout = async () => {
    try {
      try { await axios.post(`${API_BASE}/api/admin/logout`, {}, { withCredentials: true }); } catch {}
      try { await axios.post(`${API_BASE}/api/login/logout`, {}, { withCredentials: true }); } catch {}
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

  useEffect(() => {
    let t;
    const fetchCounts = async () => {
      try {
        const h = await axios.get(`${API_BASE}/healthz`, { withCredentials: true, timeout: 2500 });
        if (String(h?.data).toLowerCase() !== 'ok') return;
      } catch { return; }
      try {
        const { data } = await axios.get(`${API_BASE}/api/admin/servicerequests/count`, { withCredentials: true, timeout: 5000 });
        setPendingCount(Number(data?.pending || 0));
      } catch {}
      try {
        const { data } = await axios.get(`${API_BASE}/api/admin/workerapplications/count`, { withCredentials: true, timeout: 5000 });
        setPendingWorkerCount(Number(data?.pending || 0));
      } catch {}
    };
    fetchCounts();
    t = setInterval(fetchCounts, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="h-screen w-72 shrink-0 px-3 py-4">
      <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-3 flex flex-col">
        <Link to="/admindashboard" className="flex items-center gap-3 px-2 py-2">
          <img src="/jdklogo.png" alt="JDK Homecare" className="h-56 w-56 -mt-20 rounded-xl object-contain" />
        </Link>

        <nav className="-mt-16 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, icon: Icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admindashboard'}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors',
                  isActive ? 'bg-gray-100 text-[#008cfc]' : 'text-black hover:bg-gray-50 hover:text-[#008cfc]',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {badgeKey === 'service' && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] leading-none text-white">
                  {pendingCount}
                </span>
              )}
              {badgeKey === 'worker' && pendingWorkerCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] leading-none text-white">
                  {pendingWorkerCount}
                </span>
              )}
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
