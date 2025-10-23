import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

  useEffect(() => { document.addEventListener('mousedown', handleClickOutside); return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, []);

  const [fullName, setFullName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('workerAvatarUrl') || '/Clienticon.png');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [initials, setInitials] = useState(
    `${(localStorage.getItem('first_name') || '').trim().slice(0,1)}${(localStorage.getItem('last_name') || '').trim().slice(0,1)}`.toUpperCase() || ''
  );

  useEffect(() => {
    const fName = localStorage.getItem('first_name') || '';
    const lName = localStorage.getItem('last_name') || '';
    const sex = localStorage.getItem('sex') || '';
    if (sex === 'Male') setPrefix('Mr.');
    else if (sex === 'Female') setPrefix('Ms.');
    else setPrefix('');
    setFullName(`${fName} ${lName}`);
    setInitials(`${(fName || '').trim().slice(0,1)}${(lName || '').trim().slice(0,1)}`.toUpperCase() || '');
    const onAvatar = (e) => {
      const url = e?.detail?.url || '';
      setAvatarBroken(false);
      setAvatarUrl(url || '/Clienticon.png');
    };
    const onStorage = (e) => {
      if (e.key === 'first_name' || e.key === 'last_name') {
        const f = localStorage.getItem('first_name') || '';
        const l = localStorage.getItem('last_name') || '';
        setFullName(`${f} ${l}`.trim());
        setInitials(`${(f || '').trim().slice(0,1)}${(l || '').trim().slice(0,1)}`.toUpperCase() || '');
      }
      if (e.key === 'workerAvatarUrl') {
        const u = localStorage.getItem('workerAvatarUrl') || '';
        setAvatarBroken(false);
        setAvatarUrl(u || '/Clienticon.png');
      }
    };
    window.addEventListener('worker-avatar-updated', onAvatar);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('worker-avatar-updated', onAvatar); window.removeEventListener('storage', onStorage); };
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
  const goSearch = () => {
    const q = searchQuery.trim();
    goTop();
    navigate(`/find-a-client${q ? `?search=${encodeURIComponent(q)}` : ''}`);
  };
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') goSearch(); };

  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const ProfileCircle = ({ size = 8 }) => {
    const cls = size === 8 ? 'h-8 w-8' : size === 10 ? 'h-10 w-10' : 'h-8 w-8';
    return (
      <div className={`${cls} rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-semibold text-xs uppercase`}>
        {initials || ''}
      </div>
    );
  };

  const shouldShowImage = avatarUrl && avatarUrl !== '/Clienticon.png' && !avatarBroken;

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
                  <div ref={manageRequestDropdownRef} className="-ml-4 absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                    <ul className="space-y-2 py-2">
                      <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/current-work-post" onClick={goTop}>Application Post Status</Link></li>
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
                    className="px-4 py-2 text-blue-500 cursor-pointer hover:bg-gray-100 text-sm"
                    onClick={(e) => { e.stopPropagation(); goTop(); navigate('/worker-notifications'); }}
                  >
                    See all notifications
                  </div>
                </div>
              )}
            </div>

            <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
              {shouldShowImage ? (
                <img
                  src={avatarUrl}
                  alt="User Profile"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={() => { setAvatarBroken(true); setAvatarUrl(''); }}
                />
              ) : (
                <ProfileCircle />
              )}
              {showProfileDropdown && (
                <div ref={profileDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                  <div className="px-4 py-3 border-b flex items-center space-x-3">
                    {shouldShowImage ? (
                      <img
                        src={avatarUrl}
                        alt="Profile Icon"
                        className="h-8 w-8 rounded-full object-cover"
                        onError={() => { setAvatarBroken(true); setAvatarUrl(''); }}
                      />
                    ) : (
                      <ProfileCircle />
                    )}
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
    </>
  );
};

export default WorkerNavigation;
