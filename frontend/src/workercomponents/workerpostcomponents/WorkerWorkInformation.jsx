import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'workerWorkInformation';

const WorkerWorkInformation = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [serviceTypesSelected, setServiceTypesSelected] = useState([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');

  const [jobDetails, setJobDetails] = useState({});
  const dropdownRef = useRef(null);

  // client-like flags
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const serviceTypes = ['Carpenter', 'Electrician', 'Plumber', 'Carwasher', 'Laundry'];

  const jobTasks = {
    Carpenter: [
      'General Carpentry','Furniture Repair','Wood Polishing','Door & Window Fitting',
      'Custom Furniture Design','Modular Kitchen Installation','Flooring & Decking',
      'Cabinet & Wardrobe Fixing','Wall Paneling & False Ceiling','Wood Restoration & Refinishing'
    ],
    Laundry: [
      'Dry Cleaning','Ironing','Wash & Fold','Steam Pressing','Stain Removal Treatment',
      'Curtains & Upholstery Cleaning','Delicate Fabric Care','Shoe & Leather Cleaning',
      'Express Same-Day Laundry','Eco-Friendly Washing'
    ],
    Electrician: [
      'Wiring Repair','Appliance Installation','Lighting Fixtures','Circuit Breaker & Fuse Repair',
      'CCTV & Security System Setup','Fan & Exhaust Installation','Inverter & Battery Setup',
      'Switchboard & Socket Repair','Electrical Safety Inspection','Smart Home Automation'
    ],
    Plumber: [
      'Leak Fixing','Pipe Installation','Bathroom Fittings','Drain Cleaning & Unclogging',
      'Water Tank Installation','Gas Pipeline Installation','Septic Tank & Sewer Repair',
      'Water Heater Installation','Toilet & Sink Repair','Kitchen Plumbing Solutions'
    ],
    Carwasher: [
      'Exterior Wash','Interior Detailing','Wax & Polish','Underbody Cleaning','Engine Bay Cleaning',
      'Headlight Restoration','Ceramic Coating','Tire & Rim Cleaning','Vacuum & Odor Removal',
      'Paint Protection Film Application'
    ]
  };

  const handleServiceTypeToggle = (type) => {
    let updated;
    if (serviceTypesSelected.includes(type)) {
      updated = serviceTypesSelected.filter((t) => t !== type);
      const copy = { ...jobDetails };
      delete copy[type];
      setJobDetails(copy);
    } else {
      updated = [...serviceTypesSelected, type];
      setJobDetails((prev) => ({ ...prev, [type]: [''] }));
    }
    setServiceTypesSelected(updated);
  };

  const handleJobDetailChange = (jobType, index, value) => {
    setJobDetails((prev) => {
      const updatedTasks = [...(prev[jobType] || [])];
      updatedTasks[index] = value;
      return { ...prev, [jobType]: updatedTasks };
    });
  };

  const addTaskField = (jobType) => {
    setJobDetails((prev) => ({ ...prev, [jobType]: [...(prev[jobType] || []), ''] }));
  };

  const removeTaskField = (jobType, index) => {
    setJobDetails((prev) => {
      const updatedTasks = prev[jobType].filter((_, i) => i !== index);
      return { ...prev, [jobType]: updatedTasks.length > 0 ? updatedTasks : [''] };
    });
  };

  useEffect(() => {
    document.addEventListener('mousedown', () => {});
    return () => { document.removeEventListener('mousedown', () => {}); };
  }, []);

  // hydrate
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setServiceTypesSelected(d.service_types || []);
        setJobDetails(d.job_details || {});
        setServiceDescription(d.service_description || '');
        setYearsExperience(d.years_experience || '');
        setToolsProvided(d.tools_provided || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  // autosave
  useEffect(() => {
    if (!hydrated) return;
    const draft = {
      service_types: serviceTypesSelected,
      job_details: jobDetails,
      service_description: serviceDescription,
      years_experience: yearsExperience,
      tools_provided: toolsProvided
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }, [hydrated, serviceTypesSelected, jobDetails, serviceDescription, yearsExperience, toolsProvided]);

  // lock back/keys/scroll while loading
  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  const isYearsValid = yearsExperience !== '' && Number(yearsExperience) >= 0;
  const isFormValid =
    serviceTypesSelected.length > 0 &&
    serviceDescription.trim() &&
    isYearsValid &&
    toolsProvided;

  const proceed = () => {
    const draft = {
      service_types: serviceTypesSelected,
      job_details: jobDetails,
      service_description: serviceDescription,
      years_experience: yearsExperience,
      tools_provided: toolsProvided
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
    onCollect?.(draft);
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    setIsLoadingNext(true);
    setTimeout(() => { proceed(); }, 2000);
  };

  return (
    <form className="space-y-8">
      <div className="flex gap-8">
        <div className="w-1/2 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Type of Service</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
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
            {attempted && serviceTypesSelected.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Select at least one service type.</p>
            )}
          </div>

          {serviceTypesSelected.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Service Details</h4>
              {serviceTypesSelected.map((jobType) => (
                <div key={jobType} className="mb-5 border p-3 rounded-md bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {jobType} Services
                  </label>

                  {jobDetails[jobType]?.map((task, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <select
                        value={task}
                        onChange={(e) => handleJobDetailChange(jobType, index, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        <option value="">Select a service</option>
                        {jobTasks[jobType].map((taskOption, i) => {
                          const isSelected = jobDetails[jobType].includes(taskOption) && taskOption !== task;
                          return (
                            <option key={i} value={taskOption} disabled={isSelected}>
                              {taskOption}
                            </option>
                          );
                        })}
                      </select>
                      {jobDetails[jobType].length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTaskField(jobType, index)}
                          className="ml-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addTaskField(jobType)}
                    className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 mt-2.5"
                  >
                    + Add Another Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-1/2 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-6">Service Description</h3>

          <div className="mb-4">
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe the service you offer"
              className={`w-full h-[180px] px-4 py-3 border ${attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
              aria-invalid={attempted && !serviceDescription.trim()}
            />
            {attempted && !serviceDescription.trim() && (
              <p className="text-xs text-red-600 mt-1">Please describe your services.</p>
            )}
          </div>

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
              className={`w-full px-4 py-3 border ${attempted && !isYearsValid ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
              aria-invalid={attempted && !isYearsValid}
            />
            {attempted && !isYearsValid && (
              <p className="text-xs text-red-600 mt-1">Enter a valid number (0 or higher).</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you have your own tools or equipment? *
            </label>
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
            {attempted && !toolsProvided && (
              <p className="text-xs text-red-600 mt-1">Please choose Yes or No.</p>
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
          Back : Personal Information
        </button>
        <button
          type="button"
          onClick={onNextClick}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
          className={`px-8 py-3 rounded-md shadow-md transition duration-300 mt-2.5 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
        >
          Next : Required Documents
        </button>
      </div>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
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
    </form>
  );
};

export default WorkerWorkInformation;
