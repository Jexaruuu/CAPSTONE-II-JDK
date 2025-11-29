import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'workerWorkInformation';

const WorkerWorkInformation = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [serviceTypesSelected, setServiceTypesSelected] = useState([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [toolsProvided, setToolsProvided] = useState('');
  const [serviceTask, setServiceTask] = useState({});
  const dropdownRef = useRef(null);

  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const toolsRef = useRef(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const [openTaskKey, setOpenTaskKey] = useState(null);
  const taskRowRefs = useRef({});

  const [isLoadingBack, setIsLoadingBack] = useState(false);

  const setTaskRowRef = (key, node) => {
    if (!taskRowRefs.current) taskRowRefs.current = {};
    taskRowRefs.current[key] = node;
  };

  const handleGlobalClick = (event) => {
    const t = event.target;
    if (toolsRef.current && !toolsRef.current.contains(t)) {
      setToolsOpen(false);
    }
    if (openTaskKey) {
      const refNode = taskRowRefs.current?.[openTaskKey];
      if (refNode && !refNode.contains(t)) setOpenTaskKey(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleGlobalClick);
    return () => { document.removeEventListener('mousedown', handleGlobalClick); };
  }, [openTaskKey]);

  const PopList = ({
    items,
    value,
    onSelect,
    title = 'Select',
    fullWidth = false,
    emptyLabel = 'No options',
    disabledLabel
  }) => (
    <div className={`absolute z-50 mt-2 ${fullWidth ? 'left-0 right-0 w-full' : 'w-80'} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}>
      <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
      <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
        {items && items.length ? items.map((it) => {
          const isSel = value === it;
          const isDisabled = disabledLabel && disabledLabel(it);
          return (
            <button
              key={it}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(it)}
              className={[
                'text-left py-2 px-3 rounded-lg text-sm',
                isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50',
                isSel && !isDisabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
              ].join(' ')}
            >
              {it}
            </button>
          );
        }) : (
          <div className="text-xs text-gray-400 px-2 py-3">{emptyLabel}</div>
        )}
      </div>
      <div className="flex items-center justify-end mt-3 px-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

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
      const copy = { ...serviceTask };
      delete copy[type];
      setServiceTask(copy);
    } else {
      updated = [...serviceTypesSelected, type];
      setServiceTask((prev) => ({ ...prev, [type]: [''] }));
    }
    setServiceTypesSelected(updated);
  };

  const handleJobDetailChange = (jobType, index, value) => {
    setServiceTask((prev) => {
      const updatedTasks = [...(prev[jobType] || [])];
      updatedTasks[index] = value;
      return { ...prev, [jobType]: updatedTasks };
    });
  };

  const addTaskField = (jobType) => {
    setServiceTask((prev) => ({ ...prev, [jobType]: [...(prev[jobType] || []), ''] }));
  };

  const removeTaskField = (jobType, index) => {
    setServiceTask((prev) => {
      const updatedTasks = prev[jobType].filter((_, i) => i !== index);
      return { ...prev, [jobType]: updatedTasks.length > 0 ? updatedTasks : [''] };
    });
  };

  useEffect(() => {
    document.addEventListener('mousedown', () => {});
    return () => { document.removeEventListener('mousedown', () => {}); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setServiceTypesSelected(d.service_types || []);
        setServiceTask(d.service_task || {});
        setServiceDescription(d.service_description || '');
        setYearsExperience(d.years_experience || '');
        setToolsProvided(d.tools_provided || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const draft = {
      service_types: serviceTypesSelected,
      service_task: serviceTask,
      service_description: serviceDescription,
      years_experience: yearsExperience,
      tools_provided: toolsProvided
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }, [hydrated, serviceTypesSelected, serviceTask, serviceDescription, yearsExperience, toolsProvided]);

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

  const handleYearsChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { setYearsExperience(''); return; }
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits === '') { setYearsExperience(''); return; }
    let n = parseInt(onlyDigits, 10);
    if (Number.isNaN(n)) { setYearsExperience(''); return; }
    if (n < 1) n = 1;
    if (n > 50) n = 50;
    setYearsExperience(String(n));
  };

  const isYearsValid =
    yearsExperience !== '' &&
    /^\d+$/.test(yearsExperience) &&
    Number(yearsExperience) >= 1 &&
    Number(yearsExperience) <= 50;

  const hasServiceDetails =
    serviceTypesSelected.length > 0 &&
    serviceTypesSelected.every((t) =>
      (serviceTask[t] || []).some((v) => String(v || '').trim() !== '')
    );

  const isFormValid =
    serviceTypesSelected.length > 0 &&
    hasServiceDetails &&
    serviceDescription.trim() &&
    isYearsValid &&
    toolsProvided;

  const proceed = () => {
    const draft = {
      service_types: serviceTypesSelected,
      service_task: serviceTask,
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
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => { proceed(); }, 2000);
  };

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => { window.removeEventListener('popstate', onPopState, true); };
  }, [isLoadingBack]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingBack]);

  const onBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => { handleBack?.(); }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Tell us about your work</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 2 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/2 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Work Information</h3>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Worker
            </span>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold mb-6">Type of Service</h3>

                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {serviceTypes.map((type) => (
                      <label key={type} className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={serviceTypesSelected.includes(type)}
                          onChange={() => handleServiceTypeToggle(type)}
                          className="peer sr-only"
                        />
                        <span
                          className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition
                                     peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300
                                     peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center"
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-gray-900">{type}</span>
                      </label>
                    ))}
                  </div>
                  {attempted && serviceTypesSelected.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">Select at least one service type.</p>
                  )}
                </div>

                {serviceTypesSelected.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-base font-semibold mb-2">Service Task</h4>
                    {serviceTypesSelected.map((jobType) => {
                      const hasDetail = (serviceTask[jobType] || []).some(
                        (v) => String(v || '').trim() !== ''
                      );
                      return (
                        <div key={jobType} className="mb-5 border p-3 rounded-md bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {jobType} Services
                          </label>

                          {serviceTask[jobType]?.map((task, index) => {
                            const key = `${jobType}-${index}`;
                            const options = jobTasks[jobType] || [];

                            return (
                              <div key={index} className="mb-2" ref={(node) => setTaskRowRef(key, node)}>
                                <select
                                  value={task}
                                  onChange={(e) => handleJobDetailChange(jobType, index, e.target.value)}
                                  className="hidden"
                                  aria-hidden="true"
                                  tabIndex={-1}
                                >
                                  <option value="">Select a service</option>
                                  {options.map((taskOption, i) => {
                                    const isSelectedElsewhere =
                                      serviceTask[jobType]?.includes(taskOption) && taskOption !== task;
                                    return (
                                      <option key={i} value={taskOption} disabled={isSelectedElsewhere}>
                                        {taskOption}
                                      </option>
                                    );
                                  })}
                                </select>

                                <div className="relative">
                                  <div className={`flex items-center rounded-xl border ${attempted && !task ? 'border-red-500' : 'border-gray-300'}`}>
                                    <button
                                      type="button"
                                      onClick={() => setOpenTaskKey((k) => (k === key ? null : key))}
                                      className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                                    >
                                      {task || 'Select a service'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOpenTaskKey((k) => (k === key ? null : key))}
                                      className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                                      aria-label={`Open ${jobType} service options`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>

                                  {openTaskKey === key && (
                                    <PopList
                                      items={options}
                                      value={task}
                                      fullWidth
                                      title={`Select ${jobType} Service`}
                                      disabledLabel={(opt) =>
                                        serviceTask[jobType]?.includes(opt) && opt !== task
                                      }
                                      onSelect={(val) => {
                                        handleJobDetailChange(jobType, index, val);
                                        setOpenTaskKey(null);
                                      }}
                                    />
                                  )}
                                </div>

                                {serviceTask[jobType].length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTaskField(jobType, index)}
                                    className="mt-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {attempted && !hasDetail && (
                            <p className="text-xs text-red-600 mt-1">Choose at least one {jobType} service.</p>
                          )}

                          <button
                            type="button"
                            onClick={() => addTaskField(jobType)}
                            className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 mt-2.5 text-sm"
                          >
                            + Add Another Task
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div ref={toolsRef}>
                <h3 className="text-xl md:text-2xl font-semibold mb-6">Service Description</h3>

                <div className="mb-4">
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Describe the service you offer"
                    className={`w-full h-[180px] px-4 py-3 border ${attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base`}
                    required
                    aria-invalid={attempted && !serviceDescription.trim()}
                  />
                  {attempted && !serviceDescription.trim() && (
                    <p className="text-xs text-red-600 mt-1">Please describe your services.</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={yearsExperience}
                    onChange={handleYearsChange}
                    placeholder="Enter years of experience"
                    className={`w-full px-4 py-3 border ${attempted && !isYearsValid ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base`}
                    required
                    aria-invalid={attempted && !isYearsValid}
                  />
                  {attempted && !isYearsValid && (
                    <p className="text-xs text-red-600 mt-1">Enter a valid number from 1–50.</p>
                  )}
                </div>

                <div className="mb-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Do you have your own tools or equipment? *</label>

                  <select
                    value={toolsProvided}
                    onChange={(e) => setToolsProvided(e.target.value)}
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select Yes or No</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>

                  <div className={`flex items-center rounded-xl border ${attempted && !toolsProvided ? 'border-red-500' : 'border-gray-300'}`}>
                    <button
                      type="button"
                      onClick={() => setToolsOpen((s) => !s)}
                      className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    >
                      {toolsProvided || 'Select Yes or No'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolsOpen((s) => !s)}
                      className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                      aria-label="Open tools provided options"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {attempted && !toolsProvided && (
                    <p className="text-xs text-red-600 mt-1">Please choose Yes or No.</p>
                  )}

                  {toolsOpen && (
                    <PopList
                      items={['Yes', 'No']}
                      value={toolsProvided}
                      fullWidth
                      title="Select Tools Provided"
                      onSelect={(v) => { setToolsProvided(v); setToolsOpen(false); }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={onBackClick}
            className="w-full sm:w-1/3 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition mt-2.5"
          >
            Back : Personal Information
          </button>
          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            aria-disabled={!isFormValid}
            className={`w-full sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm mt-2.5 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
          >
            Next : Required Documents
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
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 1"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
              <div className="text-lg font-semibold text-gray-900">Back to Step 1</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerWorkInformation;
