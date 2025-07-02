import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
    setShowSubDropdown(!showSubDropdown);
  };

  const handleOptionClick = (option) => {
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

  useEffect(() => {
    const fName = localStorage.getItem('first_name') || '';
    const lName = localStorage.getItem('last_name') || '';
    const sex = localStorage.getItem('sex') || '';

    if (sex === 'Male') setPrefix('Mr.');
    else if (sex === 'Female') setPrefix('Ms.');
    else setPrefix('');

    setFullName(`${fName} ${lName}`);
  }, []);

  return (
    <div className="bg-white sticky top-0 z-50">
      <div className="max-w-[1540px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
        <div className="flex items-center space-x-6">
          <Link to="/workerwelcome">
            <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" />
          </Link>
          <ul className="flex space-x-7 mt-4 text-md">
            <li className="relative cursor-pointer group">
              <span onClick={() => handleDropdownToggle('HireWorker')} className="text-black font-medium flex items-center">
                Find Work
                <svg className="w-4 h-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </span>
              {showHireWorkerDropdown && (
                <div ref={hireWorkerDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/post-profile">Post Profile</Link></li>
                    <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/work-offers">Work Offers</Link></li>
                  </ul>
                </div>
              )}
            </li>

            <li className="relative cursor-pointer group">
              <span onClick={() => handleDropdownToggle('ManageRequest')} className="text-black font-medium flex items-center">
                Manage Post
                <svg className="w-4 h-4 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </span>
              {showManageRequestDropdown && (
                <div ref={manageRequestDropdownRef} className="absolute top-full mt-2 border border-gray-300 bg-white shadow-md rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/current-work-post">Current Work Post</Link></li>
                    <li className="px-4 py-2 hover:bg-gray-300 transition"><Link to="/active-contract">Active Contract</Link></li>
                  </ul>
                </div>
              )}
            </li>

            <li className="relative cursor-pointer group">
              <span onClick={() => handleDropdownToggle('Reports')} className="text-black font-medium flex items-center">
                Reports
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

            <li><Link to="/dashboard" className="text-black font-medium">Dashboard</Link></li>
            <li><Link to="/messages" className="text-black font-medium">Messages</Link></li>
          </ul>
        </div>

        <div className="flex items-center space-x-4 mt-4 text-md">
          <div ref={searchBarRef} className="flex items-center border border-gray-300 rounded-md px-4 py-1">
            <span className="text-gray-500 text-lg">🔍︎</span>
            <input type="text" className="border-none outline-none text-black ml-2" placeholder="Search" />
            <div className="ml-2 cursor-pointer text-black relative">
              <span className="text-blue-500" onClick={handleSearchBarDropdown}>{selectedOption}</span>
              <span className="text-gray-500 text-xs">
                <svg className="w-3 h-3 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </span>
              {showSubDropdown && (
                <div className="absolute top-full -ml-[165px] border border-gray-300 bg-white shadow-md mt-5 rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li className="px-4 py-2 flex items-center space-x-2 hover:bg-gray-300 cursor-pointer" onClick={() => handleOptionClick('Client')}>
                      <img src="/Client.png" className="w-9 h-9" alt="Client" />
                      <div>
                        <span>Client</span>
                        <p className="text-sm text-gray-600">Search for available clients in need of services.</p>
                      </div>
                    </li>
                    <li className="px-4 py-2 flex items-center space-x-2 hover:bg-gray-300 cursor-pointer" onClick={() => handleOptionClick('Worker')}>
                      <img src="/Worker.png" className="w-8 h-8" alt="Worker" />
                      <div>
                        <span>Worker</span>
                        <p className="text-sm text-gray-600">Find workers who can do the job.</p>
                      </div>
                    </li>
                    <li className="px-4 py-2 flex items-center space-x-2 hover:bg-gray-300 cursor-pointer" onClick={() => handleOptionClick('Service')}>
                      <img src="/Briefcase.png" className="w-8 h-8" alt="Service" />
                      <div>
                        <span>Services</span>
                        <p className="text-sm text-gray-600">Search for service requests posted by clients.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="cursor-pointer relative" onClick={() => handleDropdownToggle('Bell')}>
            <img src="/Bellicon.png" alt="Bell" className="h-8 w-8" />
            {showBellDropdown && (
              <div ref={bellDropdownRef} className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                <div className="py-3 px-4 border-b text-sm font-semibold">Notifications</div>
                <div className="px-4 py-2 text-blue-500 cursor-pointer hover:bg-gray-100">See all notifications</div>
              </div>
            )}
          </div>

          <div className="cursor-pointer relative" onClick={handleProfileDropdown}>
            <img src="/Clienticon.png" alt="User Profile" className="h-8 w-8 rounded-full" />
            {showProfileDropdown && (
              <div className="absolute top-full right-0 mt-4 w-60 bg-white border rounded-md shadow-md">
                <div className="px-4 py-3 border-b flex items-center space-x-3">
                  <img src="/Clienticon.png" alt="Profile Icon" className="h-8 w-8 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-sm">{prefix} {fullName}</p>
                    <p className="text-xs text-gray-600">Worker</p>
                  </div>
                </div>
                <ul className="py-2">
                  <li className="px-4 py-2 hover:bg-gray-300 transition cursor-pointer">
                    <Link to="/account-settings">Account Settings</Link>
                  </li>
                  <li className="px-4 py-2 hover:bg-gray-300 transition cursor-pointer">
                    <Link to="/">Log out</Link>
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

export default WorkerNavigation;
