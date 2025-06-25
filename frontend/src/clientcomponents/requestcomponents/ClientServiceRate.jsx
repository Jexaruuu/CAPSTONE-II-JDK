import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ClientServiceRate = ({ title, setTitle, handleNext, handleBack }) => {
  const [rateType, setRateType] = useState(''); // State for the rate type (Hourly Rate or By the Job Rate)
  const [rateFrom, setRateFrom] = useState(''); // State for the 'From' hourly rate
  const [rateTo, setRateTo] = useState(''); // State for the 'To' hourly rate
  const [rateValue, setRateValue] = useState(''); // State for the rate value (to be filled by the user)

  // Handling rate type change (Hourly or By the job)
  const handleRateTypeChange = (e) => {
    setRateType(e.target.value);
    setRateFrom(''); // Reset rate value when rate type changes
    setRateTo(''); // Reset rate value when rate type changes
    setRateValue(''); // Reset the rate value for fixed price
  };

  // Handling rate value change (input for hourly rate or by the job rate)
  const handleRateValueChange = (e) => {
    setRateValue(e.target.value);
  };

  // Handling rate range for hourly rate (from and to)
  const handleRateFromChange = (e) => {
    setRateFrom(e.target.value);
  };

  const handleRateToChange = (e) => {
    setRateTo(e.target.value);
  };

  return (
    <form className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-8">
        {/* Service Rate Type Section (Left side) */}
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Service Request Price Rate</h3>
          <p className="text-sm text-gray-600 mb-6">Please choose the service rate type and enter the price.</p>

          {/* Rate Type Selection using Card Style */}
          <div className="flex space-x-6 mb-4">
            {/* Hourly Rate Card */}
            <div
              className={`w-1/2 cursor-pointer p-4 border rounded-md text-center ${
                rateType === 'Hourly Rate' ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              onClick={() => handleRateTypeChange({ target: { value: 'Hourly Rate' } })}
            >
              <div className="flex justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-6 h-6 ${rateType === 'Hourly Rate' ? 'text-green-500' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3M12 8H8m4-4v4a4 4 0 014 4v5a4 4 0 01-4 4H8a4 4 0 01-4-4V12a4 4 0 014-4V4h4z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold">Hourly Rate</p>
            </div>

            {/* By the Job Rate Card */}
            <div
              className={`w-1/2 cursor-pointer p-4 border rounded-md text-center ${
                rateType === 'By the Job Rate' ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              onClick={() => handleRateTypeChange({ target: { value: 'By the Job Rate' } })}
            >
              <div className="flex justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-6 h-6 ${rateType === 'By the Job Rate' ? 'text-green-500' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11l-7 7-7-7M12 4v12"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold">By the Job</p>
            </div>
          </div>

          {/* Rate Value Input (Only visible after selecting rate type) */}
          {rateType && rateType === 'Hourly Rate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate (Per Hour)</label>
              <div className="flex space-x-6">
                {/* From Rate */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <input
                    type="number"
                    value={rateFrom}
                    onChange={handleRateFromChange}
                    placeholder="₱150"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* To Rate */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <input
                    type="number"
                    value={rateTo}
                    onChange={handleRateToChange}
                    placeholder="₱350"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                This is the average rate for similar home services.
              </p>
              <p className="text-sm text-gray-600 mt-5">
                Workers typically charge between <strong>₱150 - ₱350</strong> per hour for home services such as plumbing, carpentry, and electrical work. Prices may vary depending on the job's complexity and the experience of the professional. We aim to keep our rates affordable, so feel free to discuss the price with your service provider to find the best deal for you.
              </p>
            </div>
          )}

          {/* For Fixed Price */}
          {rateType && rateType === 'By the Job Rate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate</label>
              <input
                type="number"
                value={rateValue}
                onChange={handleRateValueChange}
                placeholder="₱500"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-600 mt-2">
                Set a fixed price for the service request.
              </p>
              <p className="text-sm text-gray-600 mt-4">
                 The fixed price is an amount that you and the service provider can discuss and agree on together. Feel free to negotiate the price based on the scope of the work. 
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300"
        >
          Back
        </button>

        <button
          type="button"
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300"
        >
                    Next : Review Service Request
        </button>
      </div>
    </form>
  );
};

export default ClientServiceRate;
