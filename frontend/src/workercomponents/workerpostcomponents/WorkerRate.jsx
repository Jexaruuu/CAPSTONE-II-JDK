import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const WorkerRate = ({ title, setTitle, handleNext, handleBack }) => {
  const [rateType, setRateType] = useState(''); // State for the rate type (Hourly Rate or By the Job Rate)
  const [rateFrom, setRateFrom] = useState(''); // State for the 'From' hourly rate
  const [rateTo, setRateTo] = useState(''); // State for the 'To' hourly rate
  const [rateValue, setRateValue] = useState(''); // State for the rate value (to be filled by the user)
  
  const navigate = useNavigate(); // Initialize navigate function

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

  // Handle clicking "Review Service Request"
  const handleReviewClick = () => {
    navigate('/clientreviewservicerequest', {
      state: {
        title,
        rateType,
        rateFrom,
        rateTo,
        rateValue,
        // You can add more fields here if needed for review
      },
    });
  };

  return (
    <form className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-8">
        {/* Service Rate Type Section (Left side) */}
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Service Price Rate</h3>
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
                <img
                  src={rateType === 'Hourly Rate' ? '/Clock.png' : '/Clock.png'}
                  alt="Rate Icon"
                  className="w-6 h-6"
                />
              </div>
              <p className="text-sm font-semibold">By the hour</p>
            </div>

            {/* By the Job Rate Card */}
            <div
              className={`w-1/2 cursor-pointer p-4 border rounded-md text-center ${
                rateType === 'By the Job Rate' ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              onClick={() => handleRateTypeChange({ target: { value: 'By the Job Rate' } })}
            >
              <div className="flex justify-center mb-2">
                <img
                  src={rateType === 'By the Job Rate' ? '/Contract.png' : '/Contract.png'}
                  alt="Rate Icon"
                  className={`w-6 h-6 ${rateType === 'By the Job Rate' ? 'text-green-500' : 'text-gray-400'}`}
                />
              </div>
              <p className="text-sm font-semibold">By the job</p>
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
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₱</span>
    <input
      type="number"
      inputMode="numeric"
      pattern="\d*"
      value={rateFrom}
      onChange={handleRateFromChange}
      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
</div>

{/* To Rate */}
<div className="w-1/2">
  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₱</span>
    <input
      type="number"
      inputMode="numeric"
      pattern="\d*"
      value={rateTo}
      onChange={handleRateToChange}
      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
</div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                This is the average rate for similar home services.
              </p>
              <p className="text-md text-gray-600 mt-5">
                Our workers offer affordable rates for services like plumbing, carpentry, electrical work, car washing, and laundry. Prices may vary depending on the job, so feel free to talk with your service provider to agree on what works best.
              </p>
            </div>
          )}

          {/* For Fixed Price */}
          {rateType && rateType === 'By the Job Rate' && (
           <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate</label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₱</span>
    <input
      type="number"
      inputMode="numeric"
      pattern="\d*"
      value={rateValue}
      onChange={handleRateValueChange}
      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
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
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
        >
          Back : Required Documents
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
        >
          Next : Terms & Condition Agreements
        </button>
      </div>
    </form>
  );
};

export default WorkerRate;
