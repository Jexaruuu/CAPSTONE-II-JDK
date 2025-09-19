import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { compressImageFileToDataURL } from '../../utils/imageCompression';

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
  const [imageName, setImageName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const dropdownRef = useRef(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}, []);

const jumpTop = () => {
  try { 
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); 
  } catch {}
};

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

  const getTodayLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [todayStr, setTodayStr] = useState(getTodayLocalDateString());

  useEffect(() => {
    const id = setInterval(() => {
      const t = getTodayLocalDateString();
      setTodayStr((prev) => (prev !== t ? t : prev));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setServiceType(data.serviceType || '');
        setServiceTask(data.serviceTask || '');
        const hydratedDate = data.preferredDate || '';
        const today = getTodayLocalDateString();
        setPreferredDate(hydratedDate && hydratedDate < today ? today : hydratedDate);
        setPreferredTime(data.preferredTime || '');
        setIsUrgent(data.isUrgent || '');
        setToolsProvided(data.toolsProvided || '');
        setServiceDescription(data.serviceDescription || '');
        setImage(data.image || null);
        setImageName(data.imageName || '');
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
      imageName,
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
    imageName,
  ]);

  const handleServiceTypeChange = (e) => {
    const selectedType = e.target.value;
    setServiceType(selectedType);
    setServiceTask('');
  };

  const handleUrgentChange = (value) => {
    setIsUrgent(value);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageName(file.name);
    try {
      const compressed = await compressImageFileToDataURL(file, 1600, 1600, 0.85, 2 * 1024 * 1024);
      setImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePreferredDateChange = (e) => {
    const value = e.target.value;
    if (!value) {
      setPreferredDate('');
      return;
    }
    setPreferredDate(value < todayStr ? todayStr : value);
  };

  const isPreferredDateValid = preferredDate && preferredDate >= todayStr;
  const isFormValid =
    serviceType &&
    serviceTask &&
    isPreferredDateValid &&
    preferredTime &&
    isUrgent &&
    toolsProvided &&
    serviceDescription.trim() &&
    !!image;

  const isPastDate = preferredDate && preferredDate < todayStr;

  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingNext]);

  useEffect(() => {
    if (!isLoadingNext) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

const onNextClick = () => {
  setAttempted(true);
  if (isFormValid) {
    jumpTop();                // <— add this
    setIsLoadingNext(true);
    setTimeout(() => {
      handleNext();
    }, 2000);
  }
};

  return (
   <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-lg font-semibold text-gray-900">Please fill in your request details</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-gray-500">Step 2 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-2/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Service Request Details</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Request</span>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-6">
              <div className="lg:col-span-2">
                <p className="text-sm text-gray-600 mb-6">Please fill in the service request details to proceed.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select
                      value={serviceType}
                      onChange={handleServiceTypeChange}
                      className={`w-full px-4 py-3 border ${attempted && !serviceType ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                      aria-invalid={attempted && !serviceType}
                    >
                      <option value="">Select Service Type</option>
                      {sortedServiceTypes.map((type, index) => (
                        <option key={index} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {attempted && !serviceType && <p className="text-xs text-red-600 mt-1">Please select a service type.</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Task</label>
                    <select
                      value={serviceTask}
                      onChange={(e) => setServiceTask(e.target.value)}
                      className={`w-full px-4 py-3 border ${attempted && !serviceTask ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={handlePreferredDateChange}
                      min={todayStr}
                      className={`w-full px-4 py-3 border ${attempted && (!preferredDate || isPastDate) ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      required
                      aria-invalid={attempted && (!preferredDate || isPastDate)}
                    />
                    {attempted && !preferredDate && <p className="text-xs text-red-600 mt-1">Please choose a date.</p>}
                    {attempted && isPastDate && <p className="text-xs text-red-600 mt-1">Date cannot be in the past.</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className={`w-full px-4 py-3 border ${attempted && !preferredTime ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      required
                      aria-invalid={attempted && !preferredTime}
                    />
                    {attempted && !preferredTime && <p className="text-xs text-red-600 mt-1">Please choose a time.</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tools Provided?</label>
                    <select
                      value={toolsProvided}
                      onChange={(e) => setToolsProvided(e.target.value)}
                      className={`w-full px-4 py-3 border ${attempted && !toolsProvided ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                      required
                      aria-invalid={attempted && !toolsProvided}
                    >
                      <option value="">Select Yes or No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {attempted && !toolsProvided && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Is The Request Urgent?</label>
                    <select
                      value={isUrgent}
                      onChange={(e) => handleUrgentChange(e.target.value)}
                      className={`w-full px-4 py-3 border ${attempted && !isUrgent ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                      required
                      aria-invalid={attempted && !isUrgent}
                    >
                      <option value="">Select Yes or No</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {attempted && !isUrgent && <p className="text-xs text-red-600 mt-1">Please select Yes or No.</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
                    <textarea
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="Describe the service you need"
                      className={`w-full px-4 py-3 border ${attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      required
                      aria-invalid={attempted && !serviceDescription.trim()}
                    />
                    {attempted && !serviceDescription.trim() && <p className="text-xs text-red-600 mt-1">Please describe the service.</p>}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="text-base font-semibold mb-3 text-center">Upload Image</div>
                <p className="text-sm text-gray-600 text-center mb-5">Upload an image to help describe the service request or what you need done.</p>

                <div className="space-y-4">
                  {imageName && <p className="text-xs text-gray-600 truncate text-center">Selected: {imageName}</p>}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${attempted && !image ? 'border-red-500' : 'border-gray-300'}`}
                    aria-invalid={attempted && !image}
                  />
                  {attempted && !image && <p className="text-xs text-red-600 text-center -mt-2">Please upload an image.</p>}

                  <div className="mt-2">
                    {image ? (
                      <div className="w-full h-[257px] bg-gray-200 rounded-xl overflow-hidden ring-2 ring-blue-100 shadow-sm">
                        <img src={image} alt="Uploaded Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-full h-[288px] rounded-xl flex items-center justify-center ${attempted ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-400'}`}>
                        <span>No Image Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
    <button
  type="button"
  onClick={() => { jumpTop(); handleBack(); }}   // <— wrap
  className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
>
  Back : Step 1
</button>

          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
            aria-disabled={!isFormValid}
          >
            Next : Service Rate
          </button>
        </div>
      </form>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-white cursor-wait"
        >
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-base font-semibold text-gray-900">Preparing Step 3</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientServiceRequestDetails;
