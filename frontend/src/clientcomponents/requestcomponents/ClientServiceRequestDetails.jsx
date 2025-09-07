import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'clientServiceRequestDetails';

const ClientServiceRequestDetails = ({ title, setTitle, handleNext, handleBack }) => {
  const [serviceType, setServiceType] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceTask, setServiceTask] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isUrgent, setIsUrgent] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [image, setImage] = useState(null);

  // ✅ NEW: keep the selected filename
  const [imageName, setImageName] = useState('');

  const [showDropdown, setShowDropdown] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const dropdownRef = useRef(null);

  const serviceTypes = ['Carpentry', 'Electrical Works', 'Plumbing', 'Car Washing', 'Laundry'];

  const serviceTasks = {
    Carpentry: ['General Carpentry', 'Furniture Repair', 'Wood Polishing', 'Door & Window Fitting', 'Custom Furniture Design', 'Modular Kitchen Installation', 'Flooring & Decking', 'Cabinet & Wardrobe Fixing', 'Wall Paneling & False Ceiling', 'Wood Restoration & Refinishing'],
    'Electrical Works': ['Wiring Repair', 'Appliance Installation', 'Lighting Fixtures', 'Circuit Breaker & Fuse Repair', 'CCTV & Security System Setup', 'Fan & Exhaust Installation', 'Inverter & Battery Setup', 'Switchboard & Socket Repair', 'Electrical Safety Inspection', 'Smart Home Automation'],
    Plumbing: ['Leak Fixing', 'Pipe Installation', 'Bathroom Fittings', 'Drain Cleaning & Unclogging', 'Water Tank Installation', 'Gas Pipeline Installation', 'Septic Tank & Sewer Repair', 'Water Heater Installation', 'Toilet & Sink Repair', 'Kitchen Plumbing Solutions'],
    'Car Washing': ['Exterior Wash', 'Interior Cleaning', 'Wax & Polish', 'Underbody Cleaning', 'Engine Bay Cleaning', 'Headlight Restoration', 'Ceramic Coating', 'Tire & Rim Cleaning', 'Vacuum & Odor Removal', 'Paint Protection Film Application'],
    Laundry: ['Dry Cleaning', 'Ironing', 'Wash & Fold', 'Steam Pressing', 'Stain Removal Treatment', 'Curtains & Upholstery Cleaning', 'Delicate Fabric Care', 'Shoe & Leather Cleaning', 'Express Same-Day Laundry', 'Eco-Friendly Washing']
  };

  const sortedServiceTypes = serviceTypes.sort();

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setServiceType(data.serviceType || '');
        setServiceTask(data.serviceTask || '');
        setPreferredDate(data.preferredDate || '');
        setPreferredTime(data.preferredTime || '');
        setIsUrgent(data.isUrgent || '');
        setToolsProvided(data.toolsProvided || '');
        setServiceDescription(data.serviceDescription || '');
        setImage(data.image || null);
        setImageName(data.imageName || ''); // ✅ hydrate name
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      serviceType,
      serviceTask,
      preferredDate,
      preferredTime,
      isUrgent,
      toolsProvided,
      serviceDescription,
      image,
      imageName, // ✅ persist name
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    hydrated,
    serviceType,
    serviceTask,
    preferredDate,
    preferredTime,
    isUrgent,
    toolsProvided,
    serviceDescription,
    image,
    imageName, // ✅
  ]);

  const handleServiceTypeChange = (e) => {
    const selectedType = e.target.value;
    setServiceType(selectedType);
    setServiceTask('');
  };

  const handleUrgentChange = (value) => {
    setIsUrgent(value);
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageName(file.name); // ✅ keep name
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  // ✅ Require image
  const isFormValid =
    serviceType &&
    serviceTask &&
    preferredDate &&
    preferredTime &&
    isUrgent &&
    toolsProvided &&
    serviceDescription.trim() &&
    !!image;

  const onNextClick = () => {
    setAttempted(true);
    if (isFormValid) handleNext();
  };

  return (
    <form className="space-y-8">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Service Request Details</h3>
          <p className="text-sm text-gray-600 mb-6">Please fill in the service request details to proceed.</p>

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <div ref={dropdownRef} className="relative">
                <select
                  value={serviceType}
                  onChange={handleServiceTypeChange}
                  className={`w-full px-4 py-3 border ${attempted && !serviceType ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                  aria-invalid={attempted && !serviceType}
                >
                  <option value="">Select Service Type</option>
                  {sortedServiceTypes.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {attempted && !serviceType && <p className="text-xs text-red-600 mt-1">Please select a service type.</p>}
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Task</label>
              <select
                value={serviceTask}
                onChange={(e) => setServiceTask(e.target.value)}
                className={`w-full px-4 py-3 border ${attempted && !serviceTask ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                disabled={!serviceType}
                aria-invalid={attempted && !serviceTask}
              >
                <option value="">Select Service Task</option>
                {serviceType &&
                  serviceTasks[serviceType].map((task, index) => (
                    <option key={index} value={task}>
                      {task}
                    </option>
                  ))}
              </select>
              {attempted && !serviceTask && <p className="text-xs text-red-600 mt-1">Please select a service task.</p>}
            </div>
          </div>

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className={`w-full px-4 py-3 border ${attempted && !preferredDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
                aria-invalid={attempted && !preferredDate}
              />
              {attempted && !preferredDate && <p className="text-xs text-red-600 mt-1">Please choose a date.</p>}
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className={`w-full px-4 py-3 border ${attempted && !preferredTime ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
                aria-invalid={attempted && !preferredTime}
              />
              {attempted && !preferredTime && <p className="text-xs text-red-600 mt-1">Please choose a time.</p>}
            </div>
          </div>

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tools Provided?</label>
              <select
                value={toolsProvided}
                onChange={(e) => setToolsProvided(e.target.value)}
                className={`w-full px-4 py-3 border ${attempted && !toolsProvided ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                required
                aria-invalid={attempted && !toolsProvided}
              >
                <option value="">Select Yes or No</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {attempted && !toolsProvided && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Is The Request Urgent?</label>
              <select
                value={isUrgent}
                onChange={(e) => handleUrgentChange(e.target.value)}
                className={`w-full px-4 py-3 border ${attempted && !isUrgent ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                required
                aria-invalid={attempted && !isUrgent}
              >
                <option value="">Select Yes or No</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {attempted && !isUrgent && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe the service you need"
              className={`w-full px-4 py-3 border ${attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
              aria-invalid={attempted && !serviceDescription.trim()}
            />
            {attempted && !serviceDescription.trim() && <p className="text-xs text-red-600 mt-1">Please describe the service.</p>}
          </div>
        </div>

        <div className="w-full md:w-[700px] bg-white p-6">
          <h3 className="text-2xl font-semibold mb-6">Upload Image</h3>
          <p className="text-sm text-gray-600 mb-6">Upload an image to help describe the service request or what you need done.</p>
          <div className="mb-6">
               {/* ✅ Show selected filename */}
            {imageName && (
              <p className="text-xs text-gray-600 truncate mb-3">Selected: {imageName}</p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${attempted && !image ? 'border-red-500' : 'border-gray-300'}`}
              aria-invalid={attempted && !image}
            />
            {attempted && !image && (
              <p className="text-xs text-red-600 mt-1">Please upload an image.</p>
            )}
          </div>

          <div className="mb-6">
            {image ? (
              <div className="w-full h-[280px] bg-gray-200 rounded-md overflow-hidden">
                <img src={image} alt="Uploaded Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-full h-[280px] rounded-md flex items-center justify-center ${attempted ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-400'}`}>
                <span>No Image Selected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 mt-2.5"
        >
          Back : Step 1 
        </button>

        <button
          type="button"
          onClick={onNextClick}
          disabled={!isFormValid}
          className={`px-8 py-3 rounded-md shadow-md transition duration-300 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'} mt-2.5`}
          aria-disabled={!isFormValid}
        >
          Next : Service Rate
        </button>
      </div>
    </form>
  );
};

export default ClientServiceRequestDetails;
