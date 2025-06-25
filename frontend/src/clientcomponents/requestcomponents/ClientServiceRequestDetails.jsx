import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const ClientServiceRequestDetails = ({ title, setTitle, handleNext, handleBack }) => {
  const [serviceType, setServiceType] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceTask, setServiceTask] = useState(''); // New state for Service Task
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isUrgent, setIsUrgent] = useState(false); // New state for Urgent
  const [toolsProvided, setToolsProvided] = useState(''); // New state for Tools Provided
  const [showDropdown, setShowDropdown] = useState(false); // State for toggling the dropdown visibility

  const dropdownRef = useRef(null); // Reference for the dropdown container

  // Service Type options
  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];

  // Service Task options for each service type
  const serviceTasks = {
    Carpentry: ['Furniture Repair', 'Wooden Flooring', 'Cabinet Making'],
    'Electrical Works': ['Wiring Installation', 'Electrician for Appliances', 'Lighting Setup'],
    Plumbing: ['Pipe Repair', 'Leak Fixing', 'Bathroom Installation'],
    'Car Washing': ['Exterior Wash', 'Interior Clean', 'Full Wash'],
    Laundry: ['Dry Cleaning', 'Ironing', 'Laundry Pickup']
  };

  // Sort the service types list alphabetically
  const sortedServiceTypes = serviceTypes.sort();

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  // Close the dropdown when clicking outside of it
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  // Set up event listener to handle clicks outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside); // Listen for click outside
    return () => {
      document.removeEventListener('mousedown', handleClickOutside); // Cleanup event listener on unmount
    };
  }, []);

  const handleServiceTypeChange = (e) => {
    const selectedType = e.target.value;
    setServiceType(selectedType);
    setServiceTask(''); // Reset service task when the service type is changed
  };

  return (
    <form className="space-y-8">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Service Request Details</h3>
          <p className="text-sm text-gray-600 mb-6">Please fill in the service request details to proceed.</p>

          {/* Service Type Dropdown and Service Task Input */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <div ref={dropdownRef} className="relative">
                <select
                  value={serviceType}
                  onChange={handleServiceTypeChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" // Removed default arrow
                >
                  <option value="">Select Service Type</option>
                  {sortedServiceTypes.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service Task Dropdown */}
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Task</label>
              <select
                value={serviceTask}
                onChange={(e) => setServiceTask(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" // Removed default arrow
                disabled={!serviceType} // Disable service task if no service type is selected
              >
                <option value="">Select Service Task</option>
                {serviceType &&
                  serviceTasks[serviceType].map((task, index) => (
                    <option key={index} value={task}>
                      {task}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Preferred Date and Preferred Time Fields */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Preferred Time */}
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Tools Provided and Urgent Fields */}
          <div className="flex space-x-6 mb-4">
            {/* Tools Provided */}
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tools Provided?</label>
              <select
                value={toolsProvided}
                onChange={(e) => setToolsProvided(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Yes or No</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* Urgent Field */}
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgent?</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={() => setIsUrgent(!isUrgent)}
                  className="h-4 w-4 text-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Yes, it's urgent</span>
              </div>
            </div>
          </div>

          {/* Service Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe the service you need"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 mt-16"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 mt-16"
        >
          Next : Confirm Details
        </button>
      </div>
    </form>
  );
};

export default ClientServiceRequestDetails;
