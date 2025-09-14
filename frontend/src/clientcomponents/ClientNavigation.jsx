import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ClientNavigation = () => {
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

  const handleClickOutside = (event) => {
    if (
      searchBarRef.current && !searchBarRef.current.contains(event.target) &&
      hireWorkerDropdownRef.current && !hireWorkerDropdownRef.current.contains(event.target) &&
      manageRequestDropdownRef.current && !manageRequestDropdownRef.current.contains(event.target) &&
      profileDropdownRef.current && !profileDropdownRef.current.contains(event.target) &&
      reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target) &&
      bellDropdownRef.current && !bellDropdownRef.current.contains(event.target)
    ) {
      setShowHireWorkerDropdown(false);
      setShowManageRequestDropdown(false);
      setShowProfileDropdown(false);
      setShowReportsDropdown(false);
      setShowBellDropdown(false);
      setShowSubDropdown(false);
    }
  };

  const handleDropdownToggle = (dropdownName) => {
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
    setShowProfileDropdown(!showProfileDropdown);
    setShowHireWorkerDropdown(false);
    setShowManageRequestDropdown(false);
    setShowReportsDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
  };

  const handleSearchBarDropdown = () => {
    setShowHireWorkerDropdown(false);
    setShowManageRequestDropdown(false);
    setShowReportsDropdown(false);
    setShowProfileDropdown(false);
    setShowBellDropdown(false);
    setShowSubDropdown(false);
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setShowSubDropdown(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const [fullName, setFullName] = useState('');
  const [prefix, setPrefix] = useState('');

  useEffect(() => {
    const fName = localStorage.getItem('first_name') || '';
    const lName = localStorage.getItem('last_name') || '';
    const sex = localStorage.getItem('sex') || '';
    if (sex === 'Male') setPrefix('Mr.');
    else if (sex === 'Female') setPrefix('Ms.');
    else setPrefix('');
    setFullName(`${fName} ${lName}`);
  }, []);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/login/logout', {}, { withCredentials: true });
      localStorage.clear();
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearPostDrafts = () => {
    try {
      localStorage.removeItem('clientInformationForm');
      localStorage.removeItem('clientServiceRequestDetails');
      localStorage.removeItem('clientServiceRate');
    } catch (e) {
      console.warn('Failed clearing drafts', e);
    }
  };

  const role = localStorage.getItem('role');
  const logoTo = role === 'client' ? '/clientdashboard' : '/clientwelcome';

  const [searchQuery, setSearchQuery] = useState('');
  const goSearch = () => {
    const q = searchQuery.trim();
    navigate(`/pending-offers${q ? `?search=${encodeURIComponent(q)}` : ''}`);
  };
  const onSearchKey = (e) => {
    if (e.key === 'Enter') goSearch();
  };

  return (
    <div className="bg-white sticky top-0 z-50">
      <div className="max-w-[1530px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
        <div className="flex items-center space-x-6 -ml-2.5">
          <Link to={logoTo} replace onClick={clearPostDrafts}>
            <img
              src="/jdklogo.png"
              alt="Logo"
              className="h-48 w-48 object-contain"
              style={{ margin: '0 10px' }}
            />
          </Link>

          <ul className="flex space-x-7 mt-4 text-md">
            <li className="relative cursor-pointer group">
              <span
                onClick={() => handleDropdownToggle('HireWorker')}
                className="text-black font-medium flex items-center"
              >
                Hire a Worker
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1 inline-block">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              {showHireWorkerDropdown && (
                <div ref={hireWorkerDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                      <Link to="/clientpostrequest">Post a service request</Link>
                    </li>
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                      <Link to="/pending-offers">Find a worker</Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>

            <li className="relative cursor-pointer group">
              <span
                onClick={() => handleDropdownToggle('ManageRequest')}
                className="text-black font-medium flex items-center"
              >
                Manage Request
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1 inline-block">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              {showManageRequestDropdown && (
                <div ref={manageRequestDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                      <Link to="/current-service-request">Current Service Request</Link>
                    </li>
                    <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                      <Link to="/completed-service-request">Completed Requests</Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>

            <li className="relative cursor-pointer group">
              <span
                onClick={() => handleDropdownToggle('Reports')}
                className="text-black font-medium flex items-center"
              >
                Reports
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1 inline-block">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              {showReportsDropdown && (
                <div ref={reportsDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li
                      className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200"
                      onClick={() => handleDropdownToggle('TransactionHistory')}
                    >
                      Transaction History
                    </li>
                  </ul>
                </div>
              )}
            </li>

            <li className="relative cursor-pointer group">
              <Link to="/clientdashboard" className="text-black font-medium" replace onClick={clearPostDrafts}>
                Dashboard
                <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
              </Link>
            </li>

            <li className="relative cursor-pointer group">
              <Link to="/clientmessages" className="text-black font-medium">
                Messages
                <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-3 mt-4 text-md">
          <div
            ref={searchBarRef}
            className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2"
          >
            <span className="text-gray-500 text-lg">🔍︎</span>
            <input
              type="text"
              className="border-none outline-none text-black w-56 sm:w-64 md:w-72 h-full"
              placeholder="Search workers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              handleSearchBarDropdown();
              const q = searchQuery.trim();
              navigate(`/pending-offers${q ? `?search=${encodeURIComponent(q)}` : ''}`);
            }}
            className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
          >
            Search
          </button>

          <div className="cursor-pointer relative" onClick={() => handleDropdownToggle('Bell')}>
            <img src="/Bellicon.png" alt="Notification Bell" className="h-8 w-8" />
            {showBellDropdown && (
              <div ref={bellDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                <div className="py-3 px-4 border-b text-sm font-semibold">
                  Notifications
                </div>
                <div className="px-4 py-2 text-blue-500 cursor-pointer hover:bg-gray-100">
                  See all notifications
                </div>
              </div>
            )}
          </div>

          <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
            <img src="/Clienticon.png" alt="User Profile"className="h-8 w-8 rounded-full"/>
            {showProfileDropdown && (
              <div className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                <div className="px-4 py-3 border-b flex items-center space-x-3">
                  <img src="/Clienticon.png" alt="Profile Icon" className="h-8 w-8 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-sm">{prefix} {fullName}</p>
                    <p className="text-xs text-gray-600">Client</p>
                  </div>
                </div>
                <ul className="py-2">
                  <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                    <Link to="/account-settings">Your Profile</Link>
                  </li>
                  <li className="px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                    <span onClick={handleLogout}>Log out</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientNavigation;
