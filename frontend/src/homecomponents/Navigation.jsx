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
          {/* Search removed from UI; kept as hidden stub to avoid breaking existing code */}
          <div ref={searchBarRef} className="hidden" aria-hidden="true" />

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
