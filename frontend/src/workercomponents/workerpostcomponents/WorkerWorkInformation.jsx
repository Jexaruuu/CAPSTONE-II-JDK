// WorkerWorkInformation.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';

const STORAGE_KEY = 'workerWorkInformation';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    const e =
      a.email ||
      localStorage.getItem('workerEmail') ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem('worker_auth_uid') ||
      localStorage.getItem('auth_uid') ||
      null;
    return encodeURIComponent(JSON.stringify({ e, r: 'worker', au }));
  } catch {
    const e =
      localStorage.getItem('workerEmail') ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    return encodeURIComponent(JSON.stringify({ e, r: 'worker', au: null }));
  }
}

const TASK_HEADERS = new Set(['Electrical', 'Appliances']);

const normalizeHeader = (t) =>
  String(t || '')
    .replace(/^[—\-–\s]+|[—\-–\s]+$/g, '')
    .trim();

const isTaskHeader = (t) => {
  const raw = String(t || '').trim();
  if (TASK_HEADERS.has(raw)) return true;
  const n = normalizeHeader(raw);
  return TASK_HEADERS.has(n);
};

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
  const [meEmail, setMeEmail] = useState('');

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

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
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [openTaskKey]);

  const serviceTypes = ['Carpenter', 'Electrician', 'Plumber', 'Carwasher', 'Laundry'];

  const jobTasks = {
    Carwasher: [
      '5 Seater Sedan (Interior + Carpet)',
      '7 Seater MPV (Interior + Carpet)',
      '7 - 8 Seater SUV (Interior + Carpet)',
      '5 Seater Pick Up (Interior + Carpet)',
      '10 Seater Family Van (Interior + Carpet)',
      '1 - 2 Seater (Interior + Carpet)',
      '5 Seater Sedan (Interior + Exterior)',
      '7 Seater MPV (Interior + Exterior)',
      '7 - 8 Seater SUV (Interior + Exterior)',
      '5 Seater Pick Up (Interior + Exterior)',
      '10 Seater Family Van (Interior + Exterior)'
    ],
    Carpenter: [
      'Furniture Setup (Small Items)',
      'Furniture Setup (Large Items)',
      'Basic Door & Lock Repair',
      'Smart Lock Repair',
      'Wall & Ceiling Repair',
      'Waterproofing Inspection',
      'Waterproofing Repair',
      'Roofing Inspection',
      'Roofing Repair'
    ],
    Electrician: [
      'Electrical',
      'Electrical Inspection',
      'Light Fixture Installation',
      'Light Fixture Repair',
      'Wiring Installation',
      'Wiring Repair',
      'Outlet Installation',
      'Outlet Repair',
      'Circuit Breaker Installation',
      'Circuit Breaker Repair',
      'Switch Installation',
      'Switch Repair',
      'Ceiling Fan Installation',
      'Ceiling Fan Repair',
      'Outdoor Lightning Installation',
      'Outdoor Lightning Repair',
      'Doorbell Installation',
      'Doorbell Repair',
      'Appliances',
      'Refrigerator Repair',
      'Commercial Freezer Repair',
      'TV Repair (50" to 90")',
      'TV Installation (50" to 90")',
      'Washing Machine Repair',
      'Washing Machine Installation',
      'Stand Fan Repair',
      'Tower Fan Repair',
      'Dishwasher Repair',
      'Dishwasher Installation',
      'Microwave Repair',
      'Oven Repair',
      'Rice Cooker Repair'
    ],
    Plumber: [
      'Plumbing Inspection',
      'Faucet Leak Repair',
      'Grease Trap Cleaning',
      'Sink Declogging',
      'Pipe Repair (Exposed Pipe)',
      'Toilet Repair',
      'Drainage Declogging',
      'Pipe Line Declogging',
      'Water Heater Installation',
      'Water Heater Repair',
      'Shower Installation'
    ],
    Laundry: [
      'Regular Clothes (Wash + Dry + Fold)',
      'Handwash',
      'Towels/Linens/Demin (Wash + Dry + Fold)',
      'Blankets/Comforters (Wash + Dry + Fold)',
      'Dry Cleaning'
    ]
  };

  const PopList = ({
    items,
    value,
    onSelect,
    title = 'Select',
    fullWidth = false,
    emptyLabel = 'No options',
    disabledLabel,
    hideSearch = false,
    rightLabel
  }) => {
    const [q, setQ] = useState('');
    const filtered = hideSearch
      ? items || []
      : (items || []).filter((it) => String(it || '').toLowerCase().includes(q.toLowerCase()));

    return (
      <div
        className={`absolute z-50 mt-2 ${
          fullWidth ? 'left-0 right-0 w-full' : 'w-80'
        } rounded-xl border border-gray-200 bg-white shadow-xl p-3`}
      >
        <div className="px-2 pb-2">
          <div className="text-sm font-semibold text-gray-800">{title}</div>
          {!hideSearch && (
            <div className="mt-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
          {filtered && filtered.length ? (
            filtered.map((it) => {
              const isSel = value === it;
              const isDisabled = disabledLabel && disabledLabel(it);
              const headerText = normalizeHeader(it);
              const right = typeof rightLabel === 'function' ? rightLabel(it) || '' : '';

              if (isDisabled && isTaskHeader(it)) {
                return (
                  <div key={it} className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-gray-200 flex-1" />
                      <div className="text-xs font-bold text-gray-900">{headerText}</div>
                      <div className="h-px bg-gray-200 flex-1" />
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={it}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onSelect(it)}
                  className={[
                    'text-left py-2 px-3 rounded-lg text-sm',
                    right ? 'flex items-center justify-between gap-3' : '',
                    isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50',
                    isSel && !isDisabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                  ].join(' ')}
                >
                  <span className="truncate">{it}</span>
                  {right ? (
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        isSel && !isDisabled ? 'text-white/90' : 'text-[#008cfc]'
                      }`}
                    >
                      {right}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="text-xs text-gray-400 px-2 py-3">{emptyLabel}</div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 px-2">
          <div className="text-xs text-gray-400">
            {(filtered || []).length} result{(filtered || []).length === 1 ? '' : 's'}
          </div>
          <button type="button" onClick={() => onSelect('')} className="text-xs text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
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

  const addOrFillTask = (jobType, value) => {
    setServiceTask((prev) => {
      const arr = [...(prev[jobType] || [])];
      const emptyIdx = arr.findIndex((v) => !String(v || '').trim());
      if (emptyIdx > -1) {
        arr[emptyIdx] = value;
      } else {
        arr.push(value);
      }
      return { ...prev, [jobType]: arr };
    });
  };

  useEffect(() => {
    document.addEventListener('mousedown', () => {});
    return () => {
      document.removeEventListener('mousedown', () => {});
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        const savedTypes = Array.isArray(d.service_types) ? d.service_types.filter((t) => t !== 'Appliance') : [];
        const savedTasks = { ...(d.service_task || {}) };
        delete savedTasks.Appliance;
        setServiceTypesSelected(savedTypes);
        setServiceTask(savedTasks);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [hydrated, serviceTypesSelected, serviceTask, serviceDescription, yearsExperience, toolsProvided]);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/workers/me`, { credentials: 'include', headers: headersWithU });
        if (r.ok) {
          const j = await r.json();
          const em = j?.email_address || '';
          if (em) {
            setMeEmail(em);
            const known = localStorage.getItem('workerEmail') || localStorage.getItem('email_address') || '';
            if (!known) {
              try {
                localStorage.setItem('workerEmail', em);
              } catch {}
            }
          }
        }
      } catch {}
    };
    run();
  }, [headersWithU]);

  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  const handleYearsChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setYearsExperience('');
      return;
    }
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits === '') {
      setYearsExperience('');
      return;
    }
    let n = parseInt(onlyDigits, 10);
    if (Number.isNaN(n)) {
      setYearsExperience('');
      return;
    }
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
    serviceTypesSelected.every((t) => (serviceTask[t] || []).some((v) => String(v || '').trim() !== ''));

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
      tools_provided: toolsProvided,
      email_address: meEmail || ''
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
    onCollect?.(draft);
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      proceed();
    }, 2000);
  };

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingBack]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingBack]);

  const onBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      handleBack?.();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/jdklogo.png"
              alt=""
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
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
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold mb-6">Service Type</h3>

                <div className="mb-8">
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
                          className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center"
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
                    <h4 className="text-2xl font-semibold mb-2">Service Task</h4>
                    {serviceTypesSelected.map((jobType) => {
                      const options = jobTasks[jobType] || [];
                      const selectedNonEmpty = (serviceTask[jobType] || []).filter(
                        (v) => String(v || '').trim() !== '' && !isTaskHeader(v)
                      );
                      const hasDetail = selectedNonEmpty.length > 0;

                      return (
                        <div key={jobType} className="mb-6 rounded-xl border border-gray-200 bg-white shadow-xs">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-900">{jobType} Services</div>
                            <div className="text-xs text-gray-500">{selectedNonEmpty.length} selected</div>
                          </div>

                          <div className="px-4 py-4">
                            {(serviceTask[jobType] || []).map((task, index) => {
                              const key = `${jobType}-${index}`;
                              return (
                                <div key={index} className="mb-3" ref={(node) => setTaskRowRef(key, node)}>
                                  <div
                                    className={`flex items-stretch rounded-xl border ${
                                      attempted && !task ? 'border-red-500' : 'border-gray-300'
                                    } bg-white overflow-hidden`}
                                  >
                                    <div className="px-3 py-3 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 min-w-[62px] grid place-items-center">
                                      Task {index + 1}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setOpenTaskKey((k) => (k === key ? null : key))}
                                      className="flex-1 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                      {task ? <span className="truncate">{task}</span> : 'Select a service'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setOpenTaskKey((k) => (k === key ? null : key))}
                                      className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                  </div>

                                  {openTaskKey === key && (
                                    <div className="relative">
                                      <PopList
                                        items={options}
                                        value={task}
                                        fullWidth
                                        title={`Select ${jobType} Service`}
                                        disabledLabel={(opt) => {
                                          if (isTaskHeader(opt)) return true;
                                          return (serviceTask[jobType] || []).includes(opt) && opt !== task;
                                        }}
                                        onSelect={(val) => {
                                          if (!val) {
                                            handleJobDetailChange(jobType, index, '');
                                            setOpenTaskKey(null);
                                            return;
                                          }
                                          if (isTaskHeader(val)) return;
                                          handleJobDetailChange(jobType, index, val);
                                          setOpenTaskKey(null);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {!hasDetail && attempted && (
                              <p className="text-xs text-red-600 mt-1">Choose at least one {jobType} service.</p>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => addTaskField(jobType)}
                                className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 text-sm"
                              >
                                + Add Another Task
                              </button>

                              <button
                                type="button"
                                onClick={() => setServiceTask((prev) => ({ ...prev, [jobType]: [''] }))}
                                className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900"
                              >
                                Clear {jobType}
                              </button>
                            </div>
                          </div>
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
                    className={`w-full h-[180px] px-4 py-3 border ${
                      attempted && !serviceDescription.trim() ? 'border-red-500' : 'border-gray-300'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base`}
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
                    className={`w-full px-4 py-3 border ${
                      attempted && !isYearsValid ? 'border-red-500' : 'border-gray-300'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base`}
                    required
                    aria-invalid={attempted && !isYearsValid}
                  />
                  {attempted && !isYearsValid && (
                    <p className="text-xs text-red-600 mt-1">Enter a valid number from 1–50.</p>
                  )}
                </div>

                <div className="mb-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do you have your own tools or equipment? *
                  </label>

                  <select value={toolsProvided} onChange={(e) => setToolsProvided(e.target.value)} className="hidden" aria-hidden="true" tabIndex={-1}>
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
                  {attempted && !toolsProvided && <p className="text-xs text-red-600 mt-1">Please choose Yes or No.</p>}

                  {toolsOpen && (
                    <PopList
                      items={['Yes', 'No']}
                      value={toolsProvided}
                      fullWidth
                      title="Select Tools Provided"
                      hideSearch
                      onSelect={(v) => {
                        setToolsProvided(v);
                        setToolsOpen(false);
                      }}
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
            className={`w-full sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm mt-2.5 ${
              isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'
            }`}
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
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 1"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
