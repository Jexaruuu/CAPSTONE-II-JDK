import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Client');
  const [showSubDropdown, setShowSubDropdown] = useState(false);

  const searchBarRef = useRef(null);

  const handleScroll = () => {
    if (window.scrollY > 100) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  const handleClickOutside = (event) => {
    if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
      setShowSubDropdown(false);
    }
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setShowSubDropdown(false);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white sticky top-0 z-50">
      <div className="max-w-[1550px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
        <div className="flex items-center space-x-6">
          <img
            src="/jdklogo.png"
            alt="Logo"
            className="h-48 w-48 object-contain"
            style={{ margin: '0 10px' }}
          />
       
          <ul className="flex space-x-7 mt-4 text-md">
            <li className="relative cursor-pointer group">
              <a href="/" className="text-black font-medium">
                Home
              </a>
              <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </li>
            <li className="relative cursor-pointer group">
            <a href="#why-jdk" className="text-black font-medium">Why JDK</a>
              <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </li>
            <li className="relative cursor-pointer group">
              <a href="#services" className="text-black font-medium">
                Services
              </a>
              <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </li>
            <li className="relative cursor-pointer group">
              <a href="#faq" className="text-black font-medium">
                FAQ
              </a>
              <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </li>
            <li className="relative cursor-pointer group">
              <a href="#contact" className="text-black font-medium">
                Contact Us
              </a>
              <span className="absolute bottom-0 left-0 h-[2px] bg-[#008cfc] w-0 group-hover:w-full transition-all duration-300 ease-in-out"></span>
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-4 mt-4 text-md">
          <div ref={searchBarRef} className={`flex items-center border border-gray-300 rounded-md px-4 py-1 ${isScrolled ? 'block' : 'hidden'}`}>
            <span className="text-gray-500 text-lg">🔍︎</span>
            <input
              type="text"
              className="border-none outline-none text-black ml-2"
              placeholder="Search"
            />
            <div className="ml-2 cursor-pointer text-black relative">
              <span
                className="text-blue-500"
                onClick={() => setShowSubDropdown(!showSubDropdown)}
              >
                {selectedOption}
              </span>
              <span className="text-gray-500 text-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3 h-3 inline-block"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>

              {showSubDropdown && (
                <div className="absolute top-full -ml-[165px] border border-gray-300 bg-white shadow-md mt-5 rounded-md w-60">
                  <ul className="space-y-2 py-2">
                    <li
                      className="px-4 py-2 cursor-pointer flex items-center space-x-2 hover:bg-gray-300 transition-colors duration-200"
                      onClick={() => handleOptionClick('Client')}
                    >
                      <img
                        src="/Client.png"
                        alt="Client Icon"
                        className="w-9 h-9"
                      />
                      <div>
                        <span>Client</span>
                        <p className="text-sm text-gray-600">Search for available clients in need of services.</p>
                      </div>
                    </li>
                    <li
                      className="px-4 py-2 cursor-pointer flex items-center space-x-2 hover:bg-gray-300 transition-colors duration-200"
                      onClick={() => handleOptionClick('Worker')}
                    >
                      <img
                        src="/Worker.png"
                        alt="Worker Icon"
                        className="w-8 h-8"
                      />
                      <div>
                        <span>Worker</span>
                        <p className="text-sm text-gray-600">Find workers who can do the job.</p>
                      </div>
                    </li>
                    <li
                      className="px-4 py-2 cursor-pointer flex items-center space-x-2 hover:bg-gray-300 transition-colors duration-200"
                      onClick={() => handleOptionClick('Services')}
                    >
                      <img
                        src="/Briefcase.png"
                        alt="Service Icon"
                        className="w-8 h-8"
                      />
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

         <a
  href="/login"
  className="text-black font-medium cursor-pointer hover:text-[#008cfc] transition-all duration-300 ease-in-out"
>
  Log in
</a>
          <Link to="/role">
            <button className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition">
              Sign up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Navigation;
