import React from "react";
import { FaAndroid, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaGlobe } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-[#050608] via-[#080a0c] to-[#0f1113] text-white pt-14 pb-8 mt-5 border-t border-white/5">
      <div className="max-w-[1525px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-16">
          <div>
            <div className="flex items-center mb-2">
              <img src="/jdklogowhite.png" alt="Logo" className="h-9 w-auto mr-3" />
              <span className="text-2xl font-semibold tracking-tight">
                <span className="text-white">JDK</span>{" "}
                <span className="text-[#008cfc]">HOMECARE</span>
              </span>
            </div>
            <div className="flex items-center -mt-1.5 ml-10 md:ml-11">
              <span className="text-sm text-gray-300">
                Home Service and Maintenance
              </span>
            </div>
            <p className="text-sm text-justify text-gray-400 mb-4 mt-7 leading-relaxed max-w-md">
              We make home services simple and reliable. Whether it&apos;s repairs, maintenance, or specialized services, we ensure everything is done right and on time.
            </p>
            <div className="mt-5 space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                Mobile app
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 hover:bg-white/10 transition duration-200 shadow-sm">
                  <FaAndroid className="w-5 h-5 text-[#3ddc84] mr-2" />
                  <span className="text-xs leading-tight text-left">
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                      Get it on
                    </span>
                    <span className="block text-sm font-semibold text-white">
                      Google Play
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.25em] uppercase text-gray-400 mb-3 ml-16">
              Navigation
            </h3>
            <h3 className="text-lg font-semibold mb-4 ml-16 text-white">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-gray-400 ml-16">
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  Why JDK
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  Services
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.25em] uppercase text-gray-400 mb-3 ml-16">
              Services
            </h3>
            <h3 className="text-lg font-semibold mb-4 ml-16 text-white">
              For Customers
            </h3>
            <ul className="space-y-2 text-sm text-gray-400 ml-16">
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  Join as Client
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white inline-flex items-center transition-colors duration-150">
                  Join as Worker
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.25em] uppercase text-gray-400 mb-3 ml-16">
              JDK
            </h3>
            <h3 className="text-lg font-semibold mb-4 ml-16 text-white">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm text-gray-300 ml-16">
              <li className="flex items-start gap-2">
                <FaGlobe className="mt-0.5 text-[#008cfc]" />
                <span className="leading-snug">
                  Bacolod City, Negros Occidental <br />
                  Philippines
                </span>
              </li>
              <li className="flex items-center gap-2">
                <FaPhoneAlt className="text-[#008cfc]" />
                <a
                  href="tel:+15551234567"
                  className="hover:text-white transition-colors duration-150"
                >
                  +6333018545 / +639983283891
                </a>
              </li>
              <li className="flex items-center gap-2">
                <FaEnvelope className="text-[#008cfc]" />
                <a
                  href="mailto:jdkhomecare@gmail.com"
                  className="hover:text-white transition-colors duration-150 break-all"
                >
                  jdkhomecare@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:text-sm text-gray-500">
          <div className="text-center md:text-left">
            Copyright © 2025 JDK HOMECARE. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-center md:text-right">
            <a href="#" className="hover:text-gray-300 transition-colors duration-150">
              Terms
            </a>
            <span className="w-[1px] h-4 bg-gray-700 hidden md:block" />
            <a href="#" className="hover:text-gray-300 transition-colors duration-150">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
