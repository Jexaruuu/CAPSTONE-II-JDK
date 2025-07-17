import React from "react";
import { FaAndroid } from "react-icons/fa"; // Removed Apple since it's not used

const WorkerFooter = () => {
  return (
    <footer className="bg-[#0f1113] text-white py-[14.3px] mt-5">
      <div className="max-w-[1525px] mx-auto px-6 grid grid-cols-1 md:grid-cols-1 gap-10"> {/* Adjusted to single column */}
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
          <p className="text-sm text-justify text-gray-400 mb-4 mt-4">
            We make home services simple and reliable. Whether it's repairs, maintenance, or <br />specialized services, we ensure everything is done right and on time.
          </p>
          <div className="flex space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white">Mobile app</span>
              <FaAndroid className="w-6 h-6 text-white hover:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT-ALIGNED COPYRIGHT TEXT */}
      <div className="border-t border-gray-700 mt-4 pt-4 px-6 text-sm text-gray-500 text-right max-w-[1525px] mx-auto">
        Copyright © 2025 JDK HOMECARE. All rights reserved.
      </div>
    </footer>
  );
};

export default WorkerFooter;