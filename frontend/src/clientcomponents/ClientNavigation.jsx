import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ClientNavigation = () => {
  const [selectedOption, setSelectedOption] = useState('Worker');
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showHireWorkerDropdown, setShowHireWorkerDropdown] = useState(false);
  const [showManageRequestDropdown, setShowManageRequestDropdown] = useState(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  const searchBarRef = useRef(null);
  const hireWorkerDropdownRef = useRef(null);
  const manageRequestDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const reportsDropdownRef = useRef(null);
  const bellDropdownRef = useRef(null);

  const goTop = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {} };

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
      case 'HireWorker': setShowHireWorkerDropdown(!showHireWorkerDropdown); break;
      case 'ManageRequest': setShowManageRequestDropdown(!showManageRequestDropdown); break;
      case 'Profile': setShowProfileDropdown(!showProfileDropdown); break;
      case 'Reports': setShowReportsDropdown(!showReportsDropdown); break;
      case 'Bell': setShowBellDropdown(!showBellDropdown); break;
      default: break;
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
    setShowSubDropdown(false);
  };

  const handleOptionClick = (option) => {
    goTop();
    setSelectedOption(option);
    setShowSubDropdown(false);
  };

  useEffect(() => { document.addEventListener('mousedown', handleClickOutside); return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, []);

  const initialFirst = typeof window !== 'undefined' ? (localStorage.getItem('first_name') || '') : '';
  const initialLast = typeof window !== 'undefined' ? (localStorage.getItem('last_name') || '') : '';
  const initialSex = typeof window !== 'undefined' ? (localStorage.getItem('sex') || '') : '';
  const initialPf = typeof window !== 'undefined' ? (localStorage.getItem('clientProfilePictureUrl') || '') : '';

  const [fullName, setFullName] = useState(`${initialFirst} ${initialLast}`.trim());
  const [prefix, setPrefix] = useState(initialSex === 'Male' ? 'Mr.' : initialSex === 'Female' ? 'Ms.' : '');
  const [pfUrl, setPfUrl] = useState(initialPf);
  const [pfReady, setPfReady] = useState(Boolean(initialPf));
  const [pfBroken, setPfBroken] = useState(false);

  function preload(src) { return new Promise((resolve, reject) => { if (!src) return reject(new Error('empty')); const img = new Image(); img.onload = () => resolve(true); img.onerror = reject; img.src = src; }); }
  function buildAppU() { try { const a = JSON.parse(localStorage.getItem('clientAuth') || '{}'); const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || ''; const e = a.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || ''; return encodeURIComponent(JSON.stringify({ r: 'client', e, au })); } catch {} return ''; }
  function setAppUCookie(val) { try { document.cookie = `app_u=${val}; Path=/; SameSite=Lax`; } catch {} }

  async function ensureSession() {
    try {
      const appU = buildAppU();
      if (!appU) return false;
      const { data } = await axios.get(`${API_BASE}/api/account/me`, { withCredentials: true, headers: { 'x-app-u': appU } });
      const uid = data?.auth_uid || '';
      const email = data?.email_address || '';
      if (uid) localStorage.setItem('auth_uid', uid);
      if (email) { localStorage.setItem('email_address', email); localStorage.setItem('email', email); localStorage.setItem('client_email', email); }
      const appU2 = encodeURIComponent(JSON.stringify({ r: 'client', e: email || '', au: uid || '' }));
      setAppUCookie(appU2);
      return Boolean(data);
    } catch { return false; }
  }

  useEffect(() => {
    const init = async () => {
      const initialPfLocal = localStorage.getItem('clientProfilePictureUrl') || '';
      if (initialPfLocal) { try { await preload(initialPfLocal); setPfUrl(initialPfLocal); setPfReady(true); setPfBroken(false); } catch { setPfReady(true); setPfBroken(true); } } else { setPfReady(true); setPfBroken(true); }
      const appU = buildAppU();
      try {
        const { data } = await axios.get(`${API_BASE}/api/account/me`, { withCredentials: true, headers: appU ? { 'x-app-u': appU } : {} });
        const f = data?.first_name || localStorage.getItem('first_name') || '';
        const l = data?.last_name || localStorage.getItem('last_name') || '';
        const sx = data?.sex || localStorage.getItem('sex') || '';
        const pfu = data?.profile_picture_url || localStorage.getItem('clientProfilePictureUrl') || '';
        if (sx === 'Male') setPrefix('Mr.'); else if (sx === 'Female') setPrefix('Ms.'); else setPrefix('');
        setFullName(`${f} ${l}`.trim());
        if (pfu) { try { await preload(pfu); setPfUrl(pfu); setPfReady(true); setPfBroken(false); } catch { setPfReady(true); setPfBroken(true); } } else { setPfReady(true); setPfBroken(true); }
        localStorage.setItem('first_name', f);
        localStorage.setItem('last_name', l);
        if (sx) localStorage.setItem('sex', sx);
        if (pfu) localStorage.setItem('clientProfilePictureUrl', pfu);
      } catch { setPfReady(true); if (!initialPf) setPfBroken(true); }
    };
    init();

    const onPf = async (e) => {
      const u = e?.detail?.url ?? '';
      if (u) {
        try { await preload(u); localStorage.setItem('clientProfilePictureUrl', u); setPfUrl(u); setPfReady(true); setPfBroken(false); } catch { setPfReady(true); setPfBroken(true); setPfUrl(''); localStorage.removeItem('clientProfilePictureUrl'); }
      } else { setPfBroken(true); setPfUrl(''); setPfReady(true); localStorage.removeItem('clientProfilePictureUrl'); }
    };
    window.addEventListener('client-profile-picture-updated', onPf);
    return () => { window.removeEventListener('client-profile-picture-updated', onPf); };
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      try {
        await ensureSession();
        const appU = buildAppU();
        if (!appU) return;
        const { data } = await axios.get(`${API_BASE}/api/account/me`, { withCredentials:true, headers:{ 'x-app-u': appU } });
        const pfu = data?.profile_picture_url || '';
        if (pfu) { try { await preload(pfu); localStorage.setItem('clientProfilePictureUrl', pfu); setPfUrl(pfu); setPfReady(true); setPfBroken(false); } catch { setPfReady(true); setPfBroken(true); setPfUrl(''); localStorage.removeItem('clientProfilePictureUrl'); } }
      } catch {}
    };
    const onStorage = (e) => {
      if (e.key === 'clientProfilePictureUrl') {
        const u = e.newValue || '';
        if (u) preload(u).then(()=>{ setPfUrl(u); setPfReady(true); setPfBroken(false); }).catch(()=>{ setPfBroken(true); setPfReady(true); setPfUrl('');});
        else { setPfBroken(true); setPfReady(true); setPfUrl(''); }
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onStorage); };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const isFindWorker = location.pathname === '/find-a-worker';

  const handleLogout = async () => {
    try { await axios.post(`${API_BASE}/api/login/logout`, {}, { withCredentials: true }); localStorage.clear(); goTop(); navigate('/', { replace: true }); window.location.reload(); } catch {}
  };

  const clearPostDrafts = () => { try { localStorage.removeItem('clientInformationForm'); localStorage.removeItem('clientServiceRequestDetails'); localStorage.removeItem('clientServiceRate'); } catch {} };

  const role = localStorage.getItem('role');
  const logoTo = role === 'client' ? '/clientdashboard' : '/clientwelcome';

  const [searchQuery, setSearchQuery] = useState('');
  const goSearch = () => { const q = searchQuery.trim(); goTop(); navigate(`/find-a-worker${q ? `?search=${encodeURIComponent(q)}` : ''}`); };
  const onSearchKey = (e) => { if (e.key === 'Enter') goSearch(); };

  const [navLoading, setNavLoading] = useState(false);

  return (
    <>
      <div className="bg-white/95 backdrop-blur fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1530px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6 -ml-2.5">
            <Link to={logoTo} replace onClick={() => { clearPostDrafts(); goTop(); }}>
              <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" style={{ margin: '0 10px' }} />
            </Link>

            <ul className="flex space-x-7 mt-4 text-md">
              <li className="relative cursor-pointer group">
                <span onClick={() => handleDropdownToggle('ManageRequest')} className="text-black font-medium flex items-center relative">
                  <span className="relative -ml-2.5">Manage Request<span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" /></span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1 inline-block"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
                {showManageRequestDropdown && (
                  <div ref={manageRequestDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200"><Link to="/current-service-request" onClick={goTop}>Current Service Request</Link></li>
                      <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200"><Link to="/completed-service-request" onClick={goTop}>Completed Requests</Link></li>
                    </ul>
                  </div>
                )}
              </li>

              <li className="relative cursor-pointer group">
                <Link to="/find-a-worker" className="text-black font-medium relative inline-block" onClick={() => { handleSearchBarDropdown(); goTop(); }}>
                  <span className="relative">Hire a Worker<span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" /></span>
                </Link>
              </li>

              <li className="relative cursor-pointer group hidden">
                <span onClick={() => handleDropdownToggle('Reports')} className="text-black font-medium flex items-center relative">
                  <span className="relative">Reports<span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" /></span>
                </span>
              </li>

              <li className="relative cursor-pointer group">
                <Link to="/clientmessages" className="text-black font-medium relative inline-block" onClick={goTop}>
                  Messages
                  <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-3 mt-4 text-md">
            <div ref={searchBarRef} className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2">
              <span className="text-gray-500 text-lg">🔍︎</span>
              <input
                type="text"
                className="border-none outline-none text-black w-56 sm:w-64 md:w-72 h-full"
                placeholder="Search workers"
                value={searchQuery}
                onChange={(e)=>setSearchQuery(e.target.value)}
                onKeyDown={onSearchKey}
              />
            </div>

            <button type="button" onClick={() => { handleSearchBarDropdown(); goSearch(); }} className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition">Search</button>

            <div className="cursor-pointer relative" onClick={() => handleDropdownToggle('Bell')}>
              <img src="/Bellicon.png" alt="Notification Bell" className="h-8 w-8" />
              {showBellDropdown && (
                <div ref={bellDropdownRef} className="absolute top-full right-0 mt-4 w-80 bg-white border rounded-md shadow-md">
                  <div className="py-3 px-4 border-b text-sm font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    <div className="px-4 py-3 text-sm text-gray-600">No notifications</div>
                  </div>
                  <div className="px-4 py-2 text-blue-500 cursor-pointer hover:bg-gray-100 text-sm" onClick={(e) => { e.stopPropagation(); goTop(); navigate('/client-notifications'); }}>
                    See all notifications
                  </div>
                </div>
              )}
            </div>

            <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
              {pfReady ? (
                <img src={pfUrl ? pfUrl : "/Clienticon.png"} alt="User Profile" className="h-8 w-8 rounded-full object-cover" loading="eager" decoding="sync" onError={() => { setPfBroken(true); setPfUrl(''); }} />
              ) : (<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />)}
              {showProfileDropdown && (
                <div ref={profileDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                  <div className="px-4 py-3 border-b flex items-center space-x-3">
                    {pfReady ? (<img src={pfUrl ? pfUrl : "/Clienticon.png"} alt="Profile Icon" className="h-8 w-8 rounded-full object-cover" loading="eager" decoding="sync" onError={() => { setPfBroken(true); setPfUrl(''); }} />) : (<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />)}
                    <div>
                      <p className="font-semibold text-sm">{prefix} {fullName}</p>
                      <p className="text-xs text-gray-600">Client</p>
                    </div>
                  </div>
                  <ul className="py-2">
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200"><Link to="/account-settings" onClick={goTop}>Account Settings</Link></li>
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200"><span onClick={async()=>{ try{ await axios.post(`${API_BASE}/api/login/logout`, {}, { withCredentials: true }); localStorage.clear(); goTop(); navigate('/', { replace: true }); window.location.reload(); }catch{} }}>Log out</span></li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-[90px]" aria-hidden />
    </>
  );
};

export default ClientNavigation;
