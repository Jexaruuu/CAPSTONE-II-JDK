import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, FileText, Power, User } from 'lucide-react';
import axios from 'axios';
import { sbAdmin as supabase } from '../supabaseBrowser';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const navItems = [
  { label: 'Dashboard',           to: '/admindashboard',                     icon: LayoutDashboard },
  { label: 'Manage Users',        to: '/admindashboard/manage-users',        icon: Users },
  { label: 'Service Requests',    to: '/admindashboard/service-requests',    icon: FileText,       badgeKey: 'service' },
  { label: 'Applications',        to: '/admindashboard/worker-applications', icon: ClipboardList,  badgeKey: 'worker' },
];

const AdminSideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingWorkerCount, setPendingWorkerCount] = useState(0);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

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

  useEffect(() => {
    const init = async () => {
      let nameSet = false;
      let emailSet = false;
      try {
        const { data } = await axios.get(`${API_BASE}/api/admin/me`, { withCredentials: true, timeout: 5000 });
        const u = data?.user || {};
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
        if (fullName) {
          setAdminName(fullName);
          nameSet = true;
        }
        if (u.email_address) {
          setAdminEmail(u.email_address);
          emailSet = true;
        }
      } catch {}

      if (!nameSet) {
        try {
          const first = localStorage.getItem('first_name') || '';
          const last = localStorage.getItem('last_name') || '';
          const fullName = [first, last].filter(Boolean).join(' ');
          if (fullName) setAdminName(fullName);
        } catch {}
      }

      let localEmail = '';
      try {
        localEmail = localStorage.getItem('email') || localStorage.getItem('admin_email') || '';
      } catch {}

      if (!emailSet && localEmail) {
        setAdminEmail(localEmail);
        emailSet = true;
      }

      if (!emailSet) {
        try {
          const { data } = await supabase.auth.getUser();
          const email = data?.user?.email || '';
          if (email) setAdminEmail(email);
        } catch {}
      }
    };
    init();
  }, []);

  const serviceActive = location.pathname.startsWith('/admindashboard/service-requests');
  const workerActive = location.pathname.startsWith('/admindashboard/worker-applications');

  const displayName = adminName || 'Admin User';
  const displayEmail = adminEmail || 'admin@example.com';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <aside className="h-screen w-72 shrink-0 px-3 py-4">
      <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-3 flex flex-col">
        <Link to="/admindashboard" className="flex items-center gap-3 px-2 py-2">
          <img src="/jdklogo.png" alt="JDK Homecare" className="h-56 w-56 -mt-20 rounded-xl object-contain" />
        </Link>

        <nav className="-mt-16 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, icon: Icon, badgeKey }) => (
            <div key={to}>
              <NavLink
                to={to}
                end={to === '/admindashboard' || to === '/admindashboard/service-requests' || to === '/admindashboard/worker-applications'}
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

              {badgeKey === 'service' && serviceActive && (
                <NavLink
                  to="/admindashboard/service-requests/cancelled"
                  className={({ isActive }) =>
                    [
                      'ml-8 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] md:text-sm font-sm',
                      isActive ? 'bg-gray-100 text-[#008cfc]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#008cfc]',
                    ].join(' ')
                  }
                >
                  <span>Canceled Requests</span>
                </NavLink>
              )}

              {badgeKey === 'worker' && workerActive && (
                <NavLink
                  to="/admindashboard/worker-applications/cancelled"
                  className={({ isActive }) =>
                    [
                      'ml-8 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] md:text-sm font-sm',
                      isActive ? 'bg-gray-100 text-[#008cfc]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#008cfc]',
                    ].join(' ')
                  }
                >
                  <span>Canceled Applications</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-2 space-y-2">
          <div className="border-t border-gray-200 mx-3" />

          <button
            type="button"
            onClick={() => navigate('/admindashboard/account-details')}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors text-black hover:bg-gray-50 hover:text-[#008cfc]"
          >
            <User className="h-5 w-5" />
            <span>Account Details</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] md:text-base font-medium transition-colors text-black hover:bg-gray-50 hover:text-red-600"
          >
            <Power className="h-5 w-5" />
            <span>Log out</span>
          </button>

          <div className="border-t border-gray-200 mx-3" />

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 cursor-default">
            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
              {avatarInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[10rem]">
                {displayName}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[10rem]">
                {displayEmail}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSideNavigation;
