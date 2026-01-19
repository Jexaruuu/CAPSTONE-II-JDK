import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const AVATAR_PLACEHOLDER = '/Bluelogo.png';

const WorkerNavigation = () => {
  const [selectedOption, setSelectedOption] = useState('Worker');
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showManageRequestDropdown, setShowManageRequestDropdown] = useState(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  const searchBarRef = useRef(null);
  const manageRequestDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const reportsDropdownRef = useRef(null);
  const bellDropdownRef = useRef(null);

  const goTop = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {} };

  const handleClickOutside = (event) => {
    const t = event.target;
    const insideManage = !!manageRequestDropdownRef.current?.contains(t);
    const insideProfile = !!profileDropdownRef.current?.contains(t);
    const insideReports = !!reportsDropdownRef.current?.contains(t);
    const insideBell = !!bellDropdownRef.current?.contains(t);
    if (!insideManage && !insideProfile && !insideReports && !insideBell) {
      setShowManageRequestDropdown(false);
      setShowProfileDropdown(false);
      setShowReportsDropdown(false);
      setShowBellDropdown(false);
      setShowSubDropdown(false);
    }
  };

  const handleDropdownToggle = (dropdownName) => {
    goTop();
    setShowManageRequestDropdown(false);
    setShowProfileDropdown(false);
    setShowReportsDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
    switch (dropdownName) {
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
    setShowManageRequestDropdown(false);
    setShowReportsDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
  };

  const handleOptionClick = (option) => {
    goTop();
    setSelectedOption(option);
    setShowSubDropdown(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const [fullName, setFullName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('workerAvatarUrl') || AVATAR_PLACEHOLDER);
  const [dpBroken, setDpBroken] = useState(false);
  const [initials, setInitials] = useState(
    `${(localStorage.getItem('first_name') || '').trim().slice(0, 1)}${(localStorage.getItem('last_name') || '').trim().slice(0, 1)}`.toUpperCase() || ''
  );

  useEffect(() => {
    const fName = localStorage.getItem('first_name') || '';
    const lName = localStorage.getItem('last_name') || '';
    const sex = localStorage.getItem('sex') || '';
    if (sex === 'Male') setPrefix('Mr.');
    else if (sex === 'Female') setPrefix('Ms.');
    else setPrefix('');
    setFullName(`${fName} ${lName}`.trim());
    setInitials(`${(fName || '').trim().slice(0, 1)}${(lName || '').trim().slice(0, 1)}`.toUpperCase() || '');

    const onAvatar = (e) => {
      const url = e?.detail?.url || '';
      setDpBroken(false);
      setAvatarUrl(String(url || '').trim() || AVATAR_PLACEHOLDER);
    };

    const onStorage = (e) => {
      if (e.key === 'first_name' || e.key === 'last_name') {
        const f = localStorage.getItem('first_name') || '';
        const l = localStorage.getItem('last_name') || '';
        setFullName(`${f} ${l}`.trim());
        setInitials(`${(f || '').trim().slice(0, 1)}${(l || '').trim().slice(0, 1)}`.toUpperCase() || '');
      }
      if (e.key === 'workerAvatarUrl') {
        const u = localStorage.getItem('workerAvatarUrl') || '';
        setDpBroken(false);
        setAvatarUrl(String(u || '').trim() || AVATAR_PLACEHOLDER);
      }
    };

    window.addEventListener('worker-avatar-updated', onAvatar);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('worker-avatar-updated', onAvatar);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const isFindClient = location.pathname === '/find-a-client';

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/api/login/logout`, {}, { withCredentials: true });
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
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const beginRoute = (to) => {
    if (navLoading) return;
    setNavLoading(true);
    setTimeout(() => { navigate(to, { replace: true }); }, 2000);
  };

  const goSearch = () => {
    const q = searchQuery.trim();
    goTop();
    beginRoute(`/find-a-client${q ? `?search=${encodeURIComponent(q)}` : ''}`);
  };
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') goSearch(); };

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

  const ProfileCircle = ({ size = 8 }) => {
    const cls = size === 10 ? 'h-10 w-10' : 'h-8 w-8';
    const src = (dpBroken ? AVATAR_PLACEHOLDER : (avatarUrl || AVATAR_PLACEHOLDER)) || AVATAR_PLACEHOLDER;
    return (
      <div className={`${cls} rounded-full bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center`}>
        <img
          src={src}
          alt="Profile"
          className="h-full w-full object-cover"
          onError={() => { setDpBroken(true); setAvatarUrl(AVATAR_PLACEHOLDER); }}
        />
      </div>
    );
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1530px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6">
            <Link
              to={logoTo}
              replace
              onClick={(e) => {
                e.preventDefault();
                clearWorkerApplicationDrafts();
                goTop();
                beginRoute(logoTo);
              }}
            >
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
                  <div ref={manageRequestDropdownRef} className="-ml-2 absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">
                        <Link
                          to="/current-work-post"
                          onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/current-work-post'); }}
                          className="block w-full h-full"
                        >
                          Application Post Status
                        </Link>
                      </li>
                      <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">
                        <Link
                          to="/completed-works"
                          onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/completed-works'); }}
                          className="block w-full h-full"
                        >
                          Completed Works
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}
              </li>

              <li className="relative cursor-pointer group">
                <Link
                  to="/ongoing-service"
                  className="text-black font-medium relative inline-block"
                  onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/ongoing-service'); }}
                >
                  On Going Service
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>

              <li className="relative cursor-pointer group">
                <Link
                  to="/find-a-client"
                  className="text-black font-medium relative inline-block"
                  onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/find-a-client'); }}
                >
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
                </span>
                {showReportsDropdown && (
                  <div ref={reportsDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">Transaction History</li>
                    </ul>
                  </div>
                )}
              </li>

              <li className="relative cursor-pointer group hidden">
                <Link
                  to="/workerdashboard"
                  className="text-black font-medium relative inline-block"
                  replace
                  onClick={(e) => { e.preventDefault(); clearWorkerApplicationDrafts(); goTop(); beginRoute('/workerdashboard'); }}
                >
                  Dashboard
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>

              <li className="relative cursor-pointer group">
                <Link
                  to="/workermessages"
                  className="text-black font-medium relative inline-block"
                  onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/workermessages'); }}
                >
                  Messages
                  <span className="absolute -bottom-1 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-3 mt-4 text-md">
            {!isFindClient && (
              <>
                <div ref={searchBarRef} className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2">
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

            <div className="cursor-pointer relative" onClick={() => handleDropdownToggle('Bell')}>
              <img src="/Bellicon.png" alt="Bell" className="h-8 w-8" />
              {showBellDropdown && (
                <div ref={bellDropdownRef} className="absolute top-full right-0 mt-4 w-80 bg-white border rounded-md shadow-md">
                  <div className="py-3 px-4 border-b text-sm font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    <div className="px-4 py-3 text-sm text-gray-600">No notifications</div>
                  </div>
                  <div
                    className="px-4 py-2 text-blue-500 cursor-pointer text-sm transition-colors hover:bg-[#008cfc] hover:text-white"
                    onClick={(e) => { e.stopPropagation(); goTop(); navigate('/worker-notifications'); }}
                  >
                    See all notifications
                  </div>
                </div>
              )}
            </div>

            <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
              <ProfileCircle />
              {showProfileDropdown && (
                <div ref={profileDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                  <div className="px-4 py-3 border-b flex items-center space-x-3">
                    <ProfileCircle />
                    <div>
                      <p className="font-semibold text-sm">{prefix} {fullName}</p>
                      <p className="text-xs text-gray-600">Worker</p>
                    </div>
                  </div>
                  <ul className="py-2">
                    <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">
                      <Link
                        to="/my-works"
                        onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/my-works'); }}
                        className="block w-full h-full"
                      >
                        My Works
                      </Link>
                    </li>

                    <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">
                      <Link
                        to="/worker-account-settings"
                        onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/worker-account-settings'); }}
                        className="block w-full h-full"
                      >
                        Account Settings
                      </Link>
                    </li>
                    <li className="px-4 py-2 transition cursor-pointer hover:bg-[#008cfc] hover:text-white">
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
    </>
  );
};

export default WorkerNavigation;
