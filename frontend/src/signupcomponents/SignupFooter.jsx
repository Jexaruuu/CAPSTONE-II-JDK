import React from "react";

const SignupFooter = () => {
  return (
    <footer className="bg-gradient-to-b from-[#050608] via-[#080a0c] to-[#0f1113] text-white mt-5 border-t border-white/5">
      <div className="max-w-[1525px] mx-auto px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="flex items-center">
                <img src="/jdklogowhite.png" alt="JDK Homecare" className="h-7 w-auto mr-3" />
                <span className="text-xl font-semibold tracking-tight">
                  <span className="text-white">JDK</span>{" "}
                  <span className="text-[#008cfc]">HOMECARE</span>
                </span>
              </div>
              <div className="sm:ml-2 -mt-0.5 sm:mt-1">
                <span className="text-xs sm:text-sm text-gray-300">
                  Home Service and Maintenance
                </span>
              </div>
            </div>
            <div className="text-center sm:text-right text-gray-500">
              <span>© 2025 JDK Homecare. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SignupFooter;
