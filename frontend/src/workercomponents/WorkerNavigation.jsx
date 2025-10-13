import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const WorkerNavigation = () => {
  const [selectedOption, setSelectedOption] = useState('Worker');
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showHireWorkerDropdown, setShowHireWorkerDropdown] = useState(false);
  const [showManageRequestDropdown, setShowManageRequestDropdown] = useState(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);

  const searchBarRef = useRef(null);
  const hireWorkerDropdownRef = useRef(null);
  const manageRequestDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const reportsDropdownRef = useRef(null);
  const bellDropdownRef = useRef(null);

  const goTop = () => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  };

  const handleClickOutside = (event) => {
    const t = event.target;
    const insideHire = !!hireWorkerDropdownRef.current?.contains(t);
    const insideManage = !!manageRequestDropdownRef.current?.contains(t);
    const insideProfile = !!profileDropdownRef.current?.contains(t);
    const insideReports = !!reportsDropdownRef.current?.contains(t);
    const insideBell = !!bellDropdownRef.current?.contains(t);
    if (!insideHire && !insideManage && !insideProfile && !insideReports && !insideBell) {
      setShowHireWorkerDropdown(false);
      setShowManageRequestDropdown(false);
      setShowProfileDropdown(false);
      setShowReportsDropdown(false);
      setShowBellDropdown(false);
      setShowSubDropdown(false);
    }
  };

  const handleDropdownToggle = (dropdownName) => {
    goTop();
    setShowHireWorkerDropdown(false);
    setShowManageRequestDropdown(false);
    setShowProfileDropdown(false);
    setShowReportsDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
    switch (dropdownName) {
      case 'HireWorker':
        setShowHireWorkerDropdown(!showHireWorkerDropdown);
        break;
      case 'ManageRequest':
        setShowManageRequestDropdown(!showManageRequestDropdown);
        break;
      case 'Profile':
        setShowProfileDropdown(!showProfileDropdown);
        break;
      case 'Reports':
        setShowReportsDropdown(!showReportsDropdown);
        break;
      case 'Bell':
        setShowBellDropdown(!showBellDropdown);
        break;
      default:
        break;
    }
  };

  const handleProfileDropdown = () => {
    goTop();
    setShowProfileDropdown(!showProfileDropdown);
    setShowHireWorkerDropdown(false);
    setShowManageRequestDropdown(false);
    setShowReportsDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
  };

  const handleSearchBarDropdown = () => {
    goTop();
    setShowHireWorkerDropdown(false);
    setShowManageRequestDropdown(false);
    setShowReportsDropdown(false);
    setShowProfileDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(!showSubDropdown);
  };

  const handleOptionClick = (option) => {
    goTop();
    setSelectedOption(option);
    setShowSubDropdown(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [fullName, setFullName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('workerAvatarUrl') || '/Clienticon.png');

  useEffect(() => {
    const fName = localStorage.getItem('first_name') || '';
    const lName = localStorage.getItem('last_name') || '';
    const sex = localStorage.getItem('sex') || '';
    if (sex === 'Male') setPrefix('Mr.');
    else if (sex === 'Female') setPrefix('Ms.');
    else setPrefix('');
    setFullName(`${fName} ${lName}`);
    const onAvatar = (e) => {
      const url = e?.detail?.url || '';
      setAvatarUrl(url || '/Clienticon.png');
    };
    window.addEventListener('worker-avatar-updated', onAvatar);
    return () => window.removeEventListener('worker-avatar-updated', onAvatar);
  }, []);

  function buildAppU() {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('worker_auth_uid') || '';
      const e = a.email || localStorage.getItem('worker_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
    } catch {}
    return '';
  }

  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [notifSuppressed, setNotifSuppressed] = useState(
    typeof window !== 'undefined' && localStorage.getItem('workerNotifSuppressed') === '1'
  );

  function setSuppression(v) {
    setNotifSuppressed(v);
    try {
      if (v) localStorage.setItem('workerNotifSuppressed', '1');
      else localStorage.removeItem('workerNotifSuppressed');
    } catch {}
  }

  async function ensureSession() {
    try {
      const appU = buildAppU();
      const { data } = await axios.get(`${API_BASE}/api/account/me`, {
        withCredentials: true,
        headers: appU ? { 'x-app-u': appU } : {}
      });
      const uid = data?.auth_uid || '';
      const email = data?.email_address || '';
      if (uid) localStorage.setItem('worker_auth_uid', uid);
      if (email) {
        localStorage.setItem('email_address', email);
        localStorage.setItem('email', email);
        localStorage.setItem('worker_email', email);
      }
      setSessionReady(true);
      return true;
    } catch {
      setSessionReady(false);
      return false;
    }
  }

  async function refreshNotifs() {
    const appU = buildAppU();
    if (!appU) {
      setNotifCount(0);
      return;
    }
    try {
      const { data } = await axios.get(`${API_BASE}/api/notifications/count`, {
        withCredentials: true,
        headers: { 'x-app-u': appU }
      });
      const c = typeof data === 'number' ? data : Number(data?.count || 0);
      setNotifCount(Number.isFinite(c) ? c : 0);
    } catch {
      setNotifCount(0);
    }
  }

  function stripRedundantFieldUpdateTitle(title) {
    const t = (title || '').trim();
    if (/^(birth\s*date|birthdate)\s*updated$/i.test(t)) return true;
    if (/^(contact|contact\s*number|phone|mobile)(\s*(no\.|number))?\s*updated$/i.test(t)) return true;
    if (/^(profile\s*)?picture\s*updated$/i.test(t)) return true;
    if (/^(socials?|social\s*media(\s*links?)?)\s*updated$/i.test(t)) return true;
    return false;
  }

  function collapseProfileChangeDuplicates(arr) {
    const keepTypes = new Set(['DOB', 'Contact', 'Photo', 'Socials']);
    const map = new Map();
    for (const n of arr) {
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      let type = 'Other';
      if (/(birthdate|date of birth|\bdob\b)/.test(text)) type = 'DOB';
      else if (/(contact number|phone|contact)/.test(text)) type = 'Contact';
      else if (/(profile picture|photo|avatar)/.test(text)) type = 'Photo';
      else if (/(facebook|instagram|social|socials)/.test(text)) type = 'Socials';
      if (keepTypes.has(type)) {
        const prev = map.get(type);
        if (!prev || new Date(n.created_at) > new Date(prev.created_at)) map.set(type, n);
      } else {
        const k = `id:${n.id}`;
        map.set(k, n);
      }
    }
    return Array.from(map.values());
  }

  async function fetchNotifList() {
    const tryFetch = async () => {
      const appU = buildAppU();
      if (!appU) {
        setNotifItems([]);
        return true;
      }
      const { data } = await axios.get(`${API_BASE}/api/notifications`, {
        withCredentials: true,
        headers: { 'x-app-u': appU }
      });
      const arr = Array.isArray(data) ? data : data?.items || [];
      const normalized = arr.map((n, i) => ({
        id: n.id ?? `${i}`,
        title: n.title ?? 'Notification',
        message: n.message ?? '',
        created_at: n.created_at ?? new Date().toISOString(),
        read: !!n.read
      })).filter(n => !stripRedundantFieldUpdateTitle(n.title));
      const collapsed = collapseProfileChangeDuplicates(normalized).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifItems(collapsed);
      return true;
    };
    try {
      setNotifLoading(true);
      await tryFetch();
    } catch {
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      const dPart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const tPart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dPart} • ${tPart}`;
    } catch { return ''; }
  }

  useEffect(() => {
    (async () => {
      await ensureSession();
      await refreshNotifs();
    })();
    const onRefresh = () => fetchNotifList();
    const onSuppress = () => setSuppression(true);
    window.addEventListener('worker-notifications-refresh', onRefresh);
    window.addEventListener('worker-notifications-suppress', onSuppress);
    return () => {
      window.removeEventListener('worker-notifications-refresh', onRefresh);
      window.removeEventListener('worker-notifications-suppress', onSuppress);
    };
  }, [sessionReady]);

  const esRef = useRef(null);
  useEffect(() => {
    if (!sessionReady) return;
    try { if (esRef.current) { esRef.current.close(); esRef.current = null; } } catch {}
    const appU = buildAppU();
    if (!appU) return;
    const src = new EventSource(`${API_BASE}/api/notifications/stream?app_u=${appU}`, { withCredentials: true });
    esRef.current = src;
    const onCount = (e) => {
      try {
        const j = JSON.parse(e.data || '{}');
        const c = Number(j.count || 0);
        if (Number.isFinite(c)) setNotifCount(c);
      } catch {}
    };
    const onNotification = (e) => {
      try {
        const j = JSON.parse(e.data || '{}');
        const title = (j.title || '').trim();
        if (stripRedundantFieldUpdateTitle(title)) return;
      } catch {}
      setSuppression(false);
      fetchNotifList();
    };
    src.addEventListener('count', onCount);
    src.addEventListener('notification', onNotification);
    src.onerror = () => {};
    return () => {
      try { src.close(); } catch {}
      esRef.current = null;
    };
  }, [sessionReady]);

  const navigate = useNavigate();
  const location = useLocation();
  const isFindClient = location.pathname === '/find-a-client';
  const isPostApplication = location.pathname === '/workerpostapplication';

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/login/logout', {}, { withCredentials: true });
      localStorage.clear();
      navigate('/', { replace: true });
      window.location.reload();
    } catch {}
  };

  const role = localStorage.getItem('role');
  const logoTo = role === 'worker' ? '/workerdashboard' : '/workerwelcome';

  const clearWorkerApplicationDrafts = () => {
    try {
      localStorage.removeItem('workerInformationForm');
      localStorage.removeItem('workerWorkInformation');
      localStorage.removeItem('workerDocuments');
      localStorage.removeItem('workerDocumentsData');
      localStorage.removeItem('workerRate');
      localStorage.removeItem('workerAgreements');
    } catch {}
  };

  const [searchQuery, setSearchQuery] = useState('');
  const goSearch = () => {
    const q = searchQuery.trim();
    goTop();
    navigate(`/find-a-client${q ? `?search=${encodeURIComponent(q)}` : ''}`);
  };
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') goSearch(); };

  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const navigateToNotifications = async () => {
    setShowBellDropdown(false);
    goTop();
    navigate('/worker-notifications');
  };

  const markOneReadAndNavigate = async (id) => {
    setNotifItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNotifCount((c) => Math.max(0, c - 1));
    try {
      const appU = buildAppU();
      if (appU) await axios.post(`${API_BASE}/api/notifications/${id}/read`, {}, { withCredentials: true, headers: { 'x-app-u': appU } });
    } catch {}
    setSuppression(true);
    window.dispatchEvent(new Event('worker-notifications-refresh'));
    setShowBellDropdown(false);
    goTop();
    navigate('/worker-notifications');
  };

  const markOneReadOnly = async (id) => {
    setNotifItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNotifCount((c) => Math.max(0, c - 1));
    setSuppression(true);
    try {
      const appU = buildAppU();
      if (appU) await axios.post(`${API_BASE}/api/notifications/${id}/read`, {}, { withCredentials: true, headers: { 'x-app-u': appU } });
    } catch {}
    window.dispatchEvent(new Event('worker-notifications-refresh'));
  };

  const hasUnreadInDropdown = useMemo(() => notifItems.some(n => !n.read), [notifItems]);

  return (
    <>
      <div className="bg-white/95 backdrop-blur fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1530px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6">
            <Link to={logoTo} replace onClick={() => { clearWorkerApplicationDrafts(); goTop(); }}>
              <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" />
            </Link>
            <ul className="flex space-x-7 mt-4 text-md">
              <li className="relative cursor-pointer group">
                <span onClick={() => handleDropdownToggle('ManageRequest')} className="text-black font-medium flex items-center relative">
                  <span className="relative">
                    Manage Post
                    <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                  </span>
                  <svg className="w-4 h-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
                {showManageRequestDropdown && (
                  <div ref={manageRequestDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/current-work-post" onClick={goTop}>Current Application</Link></li>
                      <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/completed-works" onClick={goTop}>Completed Works</Link></li>
                    </ul>
                  </div>
                )}
              </li>

              <li className="relative cursor-pointer group">
                <Link to="/find-a-client" className="text-black font-medium relative inline-block" onClick={goTop}>
                  Find a Client
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>

              <li className="relative cursor-pointer group hidden">
                <span onClick={() => handleDropdownToggle('Reports')} className="text-black font-medium flex items-center relative">
                  <span className="relative">
                    Reports
                    <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                  </span>
                  <svg className="w-4 h-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
                {showReportsDropdown && (
                  <div ref={reportsDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 hover:bg-gray-300 transition">Transaction History</li>
                    </ul>
                  </div>
                )}
              </li>

              <li className="relative cursor-pointer group hidden">
                <Link
                  to="/workerdashboard"
                  className="text-black font-medium relative inline-block"
                  replace
                  onClick={() => { clearWorkerApplicationDrafts(); goTop(); }}
                >
                  Dashboard
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>

              <li className="relative cursor-pointer group">
                <Link to="/workermessages" className="text-black font-medium relative inline-block" onClick={goTop}>
                  Messages
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-3 mt-4 text-md">
            {!isFindClient && (
              <>
                <div
                  ref={searchBarRef}
                  className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2"
                >
                  <span className="text-gray-500 text-lg">🔍︎</span>
                  <input
                    type="text"
                    className="border-none outline-none text-black w-56 sm:w-64 md:w-72 h-full"
                    placeholder="Search clients"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    aria-label="Search clients"
                  />
                </div>

                <button
                  type="button"
                  onClick={goSearch}
                  className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
                >
                  Search
                </button>
              </>
            )}

            <div
              className="cursor-pointer relative"
              onClick={async () => {
                handleDropdownToggle('Bell');
                await ensureSession();
                await fetchNotifList();
              }}
            >
              <img src="/Bellicon.png" alt="Bell" className="h-8 w-8" />
              {hasUnreadInDropdown && !notifSuppressed && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
              {showBellDropdown && (
                <div ref={bellDropdownRef} className="absolute top-full right-0 mt-4 w-80 bg-white border rounded-md shadow-md">
                  <div className="py-3 px-4 border-b text-sm font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    {notifLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-600">Loading...</div>
                    ) : notifItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-600">No notifications</div>
                    ) : (
                      notifItems.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            markOneReadAndNavigate(n.id);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <img src="/Bellicon.png" alt="" className="h-4 w-4 opacity-80 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900 truncate">{n.title}</div>
                              {n.message ? <div className="text-xs text-gray-600 truncate">{n.message}</div> : null}
                              <div className="text-[11px] text-gray-500">{fmtDate(n.created_at)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!n.read ? <span className="h-2 w-2 rounded-full bg-[#008cfc] mt-1" /> : null}
                              {!n.read ? (
                                <button
                                  className="rounded border border-gray-200 px-2 py-1 text-[11px] text-[#008cfc] hover:bg-gray-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markOneReadOnly(n.id);
                                  }}
                                >
                                  Mark as read
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    className="px-4 py-2 text-blue-500 cursor-pointer hover:bg-gray-100 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToNotifications();
                    }}
                  >
                    See all notifications
                  </div>
                </div>
              )}
            </div>

            <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
              <img src={avatarUrl || '/Clienticon.png'} alt="User Profile" className="h-8 w-8 rounded-full object-cover" />
              {showProfileDropdown && (
                <div ref={profileDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                  <div className="px-4 py-3 border-b flex items-center space-x-3">
                    <img src={avatarUrl || '/Clienticon.png'} alt="Profile Icon" className="h-8 w-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-sm">{prefix} {fullName}</p>
                      <p className="text-xs text-gray-600">Worker</p>
                    </div>
                  </div>
                  <ul className="py-2">
                    <li className="px-4 py-2 hover:bg-gray-300 transition cursor-pointer">
                      <Link to="/worker-account-settings" onClick={goTop}>Account Settings</Link>
                    </li>
                    <li className="px-4 py-2 hover:bg-gray-300 transition cursor-pointer">
                      <span onClick={handleLogout}>Log out</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-[90px]" aria-hidden />

      {navLoading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
        >
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
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
              <div className="text-base font-semibold text-gray-900">Preparing Step</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerNavigation;
