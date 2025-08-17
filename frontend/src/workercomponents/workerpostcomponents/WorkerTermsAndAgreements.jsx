import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const WorkerTermsAndAgreements = ({ title, setTitle, handleNext, handleBack }) => {
  // ✅ Agreements only
  const [agreeVerify, setAgreeVerify] = useState(false);   // required
  const [agreeTos, setAgreeTos] = useState(false);         // required
  const [agreePrivacy, setAgreePrivacy] = useState(false); // required

  const canProceed = agreeVerify && agreeTos && agreePrivacy;

  return (
    <form className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-8">
        {/* Left column */}
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Agreements</h3>

          <div className="space-y-5">
            {/* 1. Background checks & document verification */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeVerify}
                onChange={(e) => setAgreeVerify(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I consent to background checks and verify my documents. <span className="text-red-500">*</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  JD HOMECARE may verify the authenticity of your submitted documents.
                </div>
              </div>
            </label>

            {/* 2. Terms of Service & Privacy Policy */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTos}
                onChange={(e) => setAgreeTos(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I agree to JD HOMECARE&apos;s Terms of Service and Privacy Policy. <span className="text-red-500">*</span>
                </div>
                {/* Replace href with your actual policy URL */}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-blue-600 hover:underline">
                  View Terms of Service and Privacy Policy
                </a>
              </div>
            </label>

            {/* 3. Data Privacy Act (RA 10173) */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I consent to the collection and processing of my personal data in accordance with the Data Privacy Act (RA 10173). <span className="text-red-500">*</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Your data will be protected and processed in compliance with Philippine law.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Navigation – Back left, Next fully right */}
       <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
        >
          Back : Set Your Price Rate
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
        >
          Next : Review Application
        </button>
        </div>
    </form>
  );
};

export default WorkerTermsAndAgreements;