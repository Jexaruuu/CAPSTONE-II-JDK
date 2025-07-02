import React from "react";
import { FaApple, FaAndroid } from "react-icons/fa"; // Importing the Apple and Android icons

const WorkerFooter = () => {
  return (
    <footer className="bg-[#0f1113] text-white py-[14.3px] mt-5">
      <div className="max-w-[1525px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center mb-1">
            <img src="/jdklogowhite.png" alt="Logo" className="h-8 mr-2 mt-4" />
            <span className="text-2xl font-semibold text-[#008cfc] mt-4">
              JDK <span className="text-[#008cfc]">HOMECARE</span>
            </span>
          </div>
          <div className="flex items-center -mt-2.5 ml-10">
            <span className="text-md text-white">Home Service and Maintenance</span>
          </div>
          <p className="text-sm text-justify text-gray-400 mb-4 mt-4"> {/* Reduced margin-top mt-7 to mt-4 */}
            We make home services simple and reliable. Whether it's repairs, maintenance, or specialized services, we ensure everything is done right and on time.
          </p>
          <div className="flex space-x-4 mt-4">
            {/* Updated with Mobile App icons */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white">Mobile app</span>
              <FaAndroid className="w-6 h-6 text-white hover:text-green-400" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 ml-16 mt-4">Quick Links</h3>
          <ul className="space-y-2 text-sm text-gray-400 ml-16">
            <li><a href="#" className="hover:text-white">Home</a></li>
            <li><a href="#" className="hover:text-white">Why JDK</a></li>
            <li><a href="#" className="hover:text-white">Services</a></li>
            <li><a href="#" className="hover:text-white">FAQ</a></li>
            <li><a href="#" className="hover:text-white">Contact Us</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 ml-16 mt-4">For Clients</h3>
          <ul className="space-y-2 text-sm text-gray-400 ml-16">
            <li><a href="#" className="hover:text-white">How to hire</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 ml-16 mt-4">For Workers</h3>
          <ul className="space-y-2 text-sm text-gray-400 ml-16">
            <li><a href="#" className="hover:text-white">How to find work</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-4 pt-4 text-center text-sm text-gray-500"> {/* Reduced margin-top mt-12 to mt-8 */}
        Copyright © 2025 JDK HOMECARE. All rights reserved.
      </div>
    </footer>
  );
};

export default WorkerFooter;
