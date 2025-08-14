import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const WorkerWorkInformation = ({ title, setTitle, handleNext, handleBack }) => {
  const [serviceTypesSelected, setServiceTypesSelected] = useState([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isUrgent, setIsUrgent] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');

  const dropdownRef = useRef(null);

  const serviceTypes = ['Carpenter', 'Electrician', 'Plumber', 'Carwasher', 'Laundry'];

// Example job-specific tasks (updated with all provided options)
const jobTasks = {
  Carpenter: [
    'General Carpentry',
    'Furniture Repair',
    'Wood Polishing',
    'Door & Window Fitting',
    'Custom Furniture Design',
    'Modular Kitchen Installation',
    'Flooring & Decking',
    'Cabinet & Wardrobe Fixing',
    'Wall Paneling & False Ceiling',
    'Wood Restoration & Refinishing'
  ],
  Laundry: [
    'Dry Cleaning',
    'Ironing',
    'Wash & Fold',
    'Steam Pressing',
    'Stain Removal Treatment',
    'Curtains & Upholstery Cleaning',
    'Delicate Fabric Care',
    'Shoe & Leather Cleaning',
    'Express Same-Day Laundry',
    'Eco-Friendly Washing'
  ],
  Electrician: [
    'Wiring Repair',
    'Appliance Installation',
    'Lighting Fixtures',
    'Circuit Breaker & Fuse Repair',
    'CCTV & Security System Setup',
    'Fan & Exhaust Installation',
    'Inverter & Battery Setup',
    'Switchboard & Socket Repair',
    'Electrical Safety Inspection',
    'Smart Home Automation'
  ],
  Plumber: [
    'Leak Fixing',
    'Pipe Installation',
    'Bathroom Fittings',
    'Drain Cleaning & Unclogging',
    'Water Tank Installation',
    'Gas Pipeline Installation',
    'Septic Tank & Sewer Repair',
    'Water Heater Installation',
    'Toilet & Sink Repair',
    'Kitchen Plumbing Solutions'
  ],
  Carwasher: [
    'Exterior Wash',
    'Interior Detailing',
    'Wax & Polish',
    'Underbody Cleaning',
    'Engine Bay Cleaning',
    'Headlight Restoration',
    'Ceramic Coating',
    'Tire & Rim Cleaning',
    'Vacuum & Odor Removal',
    'Paint Protection Film Application'
  ]
};

  const [jobDetails, setJobDetails] = useState({});

  const handleServiceTypeToggle = (type) => {
    let updated;
    if (serviceTypesSelected.includes(type)) {
      updated = serviceTypesSelected.filter((t) => t !== type);
    } else {
      updated = [...serviceTypesSelected, type];
    }
    setServiceTypesSelected(updated);
  };

  const handleJobDetailChange = (jobType, value) => {
    setJobDetails((prev) => ({
      ...prev,
      [jobType]: value,
    }));
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      // no dropdown here but kept for compatibility
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <form className="space-y-8">
      <div className="flex gap-8">
        {/* Left Column */}
        <div className="w-1/2 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Work Information</h3>

          {/* Job Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {serviceTypes.map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={serviceTypesSelected.includes(type)}
                    onChange={() => handleServiceTypeToggle(type)}
                    className="h-4 w-4"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditionally show fields for selected job types */}
          {serviceTypesSelected.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Job Details</h4>
              {serviceTypesSelected.map((jobType) => (
                <div key={jobType} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {jobType} Task
                  </label>
                  <select
                    value={jobDetails[jobType] || ''}
                    onChange={(e) => handleJobDetailChange(jobType, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Select a task</option>
                    {jobTasks[jobType].map((task, index) => (
                      <option key={index} value={task}>
                        {task}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Years of Experience */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience *
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="Enter years of experience"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="w-1/2 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-6">Service Description</h3>

          {/* Service Description */}
          <div className="mb-4">
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe the service you offer"
              className="w-full h-[180px] px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Tools Provided - moved under Service Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you have your own tools or equipment? *
            </label>
            <select
              value={toolsProvided}
              onChange={(e) => setToolsProvided(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required
            >
              <option value="">Select Yes or No</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 mt-2.5"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 mt-2.5"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default WorkerWorkInformation;
