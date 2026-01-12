// ClientServiceRate.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'clientServiceRate';
const DETAILS_KEY = 'clientServiceRequestDetails';
const NIGHT_TIME_FEE = 200;
const MIN_LAUNDRY_KG = 8;

const INCLUDED_WORKERS = 2;
const EXTRA_WORKER_FEE = 150;
const MAX_WORKERS = 6;

const MIN_UNITS_FOR_EXTRA_WORKERS = 5;

const ClientServiceRate = ({ title, setTitle, handleNext, handleBack }) => {
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const [serviceType, setServiceType] = useState('');
  const [serviceTask, setServiceTask] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [units, setUnits] = useState(1);

  const [workersNeeded, setWorkersNeeded] = useState(1);
  const [extraWorkerCount, setExtraWorkerCount] = useState(0);
  const [extraWorkersFeeTotal, setExtraWorkersFeeTotal] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  const navigate = useNavigate();

  const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;

  const clampInt = (v, min, max) => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const workersRef = useRef(null);
  const [workersOpen, setWorkersOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      if (workersRef.current && !workersRef.current.contains(t)) setWorkersOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workerOptions = useMemo(() => Array.from({ length: MAX_WORKERS }, (_, i) => i + 1), []);

  const inputUnitsSafe = useMemo(() => Math.max(1, Number(units) || 1), [units]);
  const allowExtraWorkers = useMemo(() => inputUnitsSafe >= MIN_UNITS_FOR_EXTRA_WORKERS, [inputUnitsSafe]);

  const workersNeededSafe = useMemo(() => {
    if (!allowExtraWorkers) return 1;
    return clampInt(workersNeeded, 1, MAX_WORKERS);
  }, [workersNeeded, allowExtraWorkers]);

  const applyWorkersNeeded = (v) => {
    if (!allowExtraWorkers) {
      setWorkersNeeded(1);
      setExtraWorkerCount(0);
      setExtraWorkersFeeTotal(0);
      return;
    }
    const safe = clampInt(v, 1, MAX_WORKERS);
    const extra = Math.max(0, safe - INCLUDED_WORKERS);
    const fee = extra * EXTRA_WORKER_FEE;
    setWorkersNeeded(safe);
    setExtraWorkerCount(extra);
    setExtraWorkersFeeTotal(fee);
  };

  useEffect(() => {
    if (!hydrated) return;

    if (!allowExtraWorkers) {
      if (workersNeeded !== 1) setWorkersNeeded(1);
      if ((Number(extraWorkerCount) || 0) !== 0) setExtraWorkerCount(0);
      if ((Number(extraWorkersFeeTotal) || 0) !== 0) setExtraWorkersFeeTotal(0);
      if (workersOpen) setWorkersOpen(false);
      return;
    }

    const extra = Math.max(0, workersNeededSafe - INCLUDED_WORKERS);
    const fee = extra * EXTRA_WORKER_FEE;
    if ((Number(extraWorkerCount) || 0) !== extra) setExtraWorkerCount(extra);
    if ((Number(extraWorkersFeeTotal) || 0) !== fee) setExtraWorkersFeeTotal(fee);
  }, [hydrated, allowExtraWorkers, workersNeededSafe]);

  const PopList = ({
    items,
    value,
    onSelect,
    emptyLabel = 'No options',
    fullWidth = false,
    title = 'Select',
    clearable = false,
    onClear,
    clearText = 'Clear',
    rightLabel
  }) => {
    return (
      <div
        className={`absolute z-50 mt-2 ${fullWidth ? 'left-0 right-0 w-full' : 'w-80'} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}
      >
        <div className="text-sm font-semibold text-gray-800 px-2 pb-2">{title}</div>
        <div className="max-h-64 overflow-y-auto px-2 grid grid-cols-1 gap-1">
          {items && items.length ? (
            items.map((it) => {
              const isSel = value === it;
              const right = typeof rightLabel === 'function' ? rightLabel(it) || '' : '';
              return (
                <button
                  key={String(it)}
                  type="button"
                  onClick={() => onSelect(it)}
                  className={[
                    'text-left py-2 px-3 rounded-lg text-sm hover:bg-blue-50 text-gray-700',
                    right ? 'flex items-center justify-between gap-3' : '',
                    isSel ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                  ].join(' ')}
                >
                  <span className="truncate">{it}</span>
                  {right ? (
                    <span className={`shrink-0 text-xs font-semibold ${isSel ? 'text-white/90' : 'text-[#008cfc]'}`}>
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
          <span className="text-xs text-gray-400">
            {items && items.length ? items.length : 0} result{items && items.length === 1 ? '' : 's'}
          </span>
          {clearable ? (
            <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">
              {clearText}
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    );
  };

  const serviceTaskRates = useMemo(
    () => ({
      Carpentry: {
        'General Carpentry': 1000,
        'Furniture Repair': 900,
        'Wood Polishing': 1200,
        'Door & Window Fitting': 1500,
        'Custom Furniture Design': 2000,
        'Modular Kitchen Installation': 6000,
        'Flooring & Decking': 3500,
        'Cabinet & Wardrobe Fixing': 1200,
        'Wall Paneling & False Ceiling': 4000,
        'Wood Restoration & Refinishing': 2500
      },
      'Electrical Works': {
        'Wiring Repair': 1000,
        'Appliance Installation': 800,
        'Lighting Fixtures': 700,
        'Circuit Breaker & Fuse Repair': 1200,
        'CCTV & Security System Setup': 2500,
        'Fan & Exhaust Installation': 700,
        'Inverter & Battery Setup': 1800,
        'Switchboard & Socket Repair': 800,
        'Electrical Safety Inspection': 1500,
        'Smart Home Automation': 3000
      },
      Plumbing: {
        'Leak Fixing': 900,
        'Pipe Installation': 1500,
        'Bathroom Fittings': 1200,
        'Drain Cleaning & Unclogging': 1800,
        'Water Tank Installation': 2500,
        'Gas Pipeline Installation': 3500,
        'Septic Tank & Sewer Repair': 4500,
        'Water Heater Installation': 2000,
        'Toilet & Sink Repair': 1000,
        'Kitchen Plumbing Solutions': 1800
      },
      'Car Washing': {
        'Exterior Wash': 350,
        'Interior Cleaning': 700,
        'Wax & Polish': 1200,
        'Underbody Cleaning': 500,
        'Engine Bay Cleaning': 900,
        'Headlight Restoration': 1500,
        'Ceramic Coating': 12000,
        'Tire & Rim Cleaning': 400,
        'Vacuum & Odor Removal': 700,
        'Paint Protection Film Application': 15000
      },
      Laundry: {
        'Wash & Fold': '₱50/kg',
        Ironing: '₱100/kg',
        'Dry Cleaning': '₱130/kg',
        'Steam Pressing': '₱130/kg',
        'Stain Removal Treatment': '₱180/kg',
        'Delicate Fabric Care': '₱90/kg',
        'Eco-Friendly Washing': '₱60/kg',
        'Express Same-Day Laundry': '₱70/kg',
        'Curtains & Upholstery Cleaning': '₱600/pc',
        'Shoe & Leather Cleaning': '₱250/pair'
      }
    }),
    []
  );

  const formatRate = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string') return v.trim().startsWith('₱') ? v.trim() : `₱${v}`;
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
  };

  const shouldShowPerUnit = (type) =>
    type === 'Car Washing' || type === 'Plumbing' || type === 'Carpentry' || type === 'Electrical Works';

  const withPerUnitLabel = (rateStr) => {
    if (!rateStr) return '';
    return `per unit ${rateStr}`;
  };

  const parseNumericRate = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v);
    const nums = s.match(/\d+(\.\d+)?/g);
    if (!nums || !nums.length) return null;
    const a = Number(nums[0]);
    const b = nums.length >= 2 ? Number(nums[1]) : null;
    if (!Number.isFinite(a)) return null;
    if (b !== null && Number.isFinite(b)) return Math.round((a + b) / 2);
    return a;
  };

  const isNightTimeForFee = (t) => {
    if (!t) return false;
    const [hh, mm] = String(t).split(':').map((x) => parseInt(x, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    if (hh >= 20) return true;
    if (hh >= 0 && hh <= 5) return true;
    if (hh === 6 && (mm === 0 || mm === 30)) return true;
    return false;
  };

  const isLaundry = serviceType === 'Laundry';

  const baseRateRaw = useMemo(() => {
    if (!serviceType || !serviceTask) return '';
    const v = serviceTaskRates?.[serviceType]?.[serviceTask];
    return v === undefined ? '' : v;
  }, [serviceType, serviceTask, serviceTaskRates]);

  const baseRateNum = useMemo(() => parseNumericRate(baseRateRaw), [baseRateRaw]);

  const baseRateDisplay = useMemo(() => {
    const r = formatRate(baseRateRaw);
    if (!r) return '';
    return shouldShowPerUnit(serviceType) ? withPerUnitLabel(r) : r;
  }, [baseRateRaw, serviceType]);

  const quantityUnit = useMemo(() => {
    if (!isLaundry) return 'unit';
    const s = String(baseRateRaw || '').toLowerCase();
    if (s.includes('/pair') || s.includes('pair')) return 'pair';
    if (s.includes('/pc') || s.includes('/piece') || s.includes('piece')) return 'pc';
    if (s.includes('/load') || s.includes('load')) return 'load';
    if (s.includes('/bag') || s.includes('bag')) return 'bag';
    if (s.includes('/kg') || s.includes('kg')) return 'kg';
    return 'item';
  }, [isLaundry, baseRateRaw]);

  const unitLabel = useMemo(() => {
    const n = Math.max(1, Number(units) || 1);
    if (quantityUnit === 'kg') return 'kg';
    if (quantityUnit === 'pc') return n === 1 ? 'pc' : 'pcs';
    return n === 1 ? quantityUnit : `${quantityUnit}s`;
  }, [quantityUnit, units]);

  const billableUnits = useMemo(() => {
    if (isLaundry && quantityUnit === 'kg') return Math.max(MIN_LAUNDRY_KG, inputUnitsSafe);
    return inputUnitsSafe;
  }, [isLaundry, quantityUnit, inputUnitsSafe]);

  const minApplied = useMemo(
    () => isLaundry && quantityUnit === 'kg' && inputUnitsSafe < MIN_LAUNDRY_KG,
    [isLaundry, quantityUnit, inputUnitsSafe]
  );

  const nightFeeApplies = useMemo(() => !!preferredTime && isNightTimeForFee(preferredTime), [preferredTime]);
  const nightFee = nightFeeApplies ? NIGHT_TIME_FEE : 0;

  const computedSubtotal = useMemo(() => {
    if (!Number.isFinite(baseRateNum) || baseRateNum <= 0) return 0;
    return baseRateNum * billableUnits;
  }, [baseRateNum, billableUnits]);
  

  const computedTotal = useMemo(() => computedSubtotal + nightFee + (Number(extraWorkersFeeTotal) || 0), [
    computedSubtotal,
    nightFee,
    extraWorkersFeeTotal
  ]);

  const hasDetails = !!serviceType && !!serviceTask;
  const isFormValid = hasDetails && Number.isFinite(baseRateNum) && baseRateNum > 0 && (Number(units) || 0) >= 1;

  useEffect(() => {
    const savedDetails = localStorage.getItem(DETAILS_KEY);
    if (savedDetails) {
      try {
        const d = JSON.parse(savedDetails);
        setServiceType(d.serviceType || '');
        setServiceTask(d.serviceTask || '');
        setPreferredTime(d.preferredTime || '');
        const wn = Number(d.workersNeeded ?? d.workers_needed);
        const safeWN = Number.isFinite(wn) && wn >= 1 ? clampInt(wn, 1, MAX_WORKERS) : 1;

        const ec = Number(d.extra_worker_count);
        const ef = Number(d.extra_workers_fee);

        setWorkersNeeded(safeWN);

        if (Number.isFinite(ec) && ec >= 0) setExtraWorkerCount(ec);
        else setExtraWorkerCount(Math.max(0, safeWN - INCLUDED_WORKERS));

        if (Number.isFinite(ef) && ef >= 0) setExtraWorkersFeeTotal(ef);
        else setExtraWorkersFeeTotal(Math.max(0, safeWN - INCLUDED_WORKERS) * EXTRA_WORKER_FEE);
      } catch {}
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const u = Number(data.units);
        setUnits(Number.isFinite(u) && u >= 1 ? u : 1);
        if (!serviceType && (data.serviceType || '')) setServiceType(data.serviceType || '');
        if (!serviceTask && (data.serviceTask || '')) setServiceTask(data.serviceTask || '');
        if (!preferredTime && (data.preferredTime || '')) setPreferredTime(data.preferredTime || '');

        const wn2 = Number(data.workersNeeded ?? data.workers_needed);
        const safeWN2 = Number.isFinite(wn2) && wn2 >= 1 ? clampInt(wn2, 1, MAX_WORKERS) : null;
        if (safeWN2 !== null) setWorkersNeeded(safeWN2);

        const ec2 = Number(data.extra_worker_count);
        const ef2 = Number(data.extra_workers_fee);
        if (Number.isFinite(ec2) && ec2 >= 0) setExtraWorkerCount(ec2);
        if (Number.isFinite(ef2) && ef2 >= 0) setExtraWorkersFeeTotal(ef2);
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload = {
      serviceType,
      serviceTask,
      preferredTime,
      units: inputUnitsSafe,
      quantity_unit: quantityUnit,
      billable_units: billableUnits,
      minimum_quantity: isLaundry && quantityUnit === 'kg' ? MIN_LAUNDRY_KG : null,
      minimum_applied: !!minApplied,
      base_rate_raw: baseRateRaw,
      base_rate_numeric: Number.isFinite(baseRateNum) ? baseRateNum : null,
      subtotal: Number.isFinite(computedSubtotal) ? computedSubtotal : 0,
      preferred_time_fee: nightFee,
      workersNeeded: workersNeededSafe,
      extra_worker_count: Number.isFinite(Number(extraWorkerCount)) ? Number(extraWorkerCount) : 0,
      extra_workers_fee: Number.isFinite(Number(extraWorkersFeeTotal)) ? Number(extraWorkersFeeTotal) : 0,
      total: Number.isFinite(computedTotal) ? computedTotal : 0
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    hydrated,
    serviceType,
    serviceTask,
    preferredTime,
    units,
    baseRateRaw,
    baseRateNum,
    computedSubtotal,
    nightFee,
    computedTotal,
    quantityUnit,
    inputUnitsSafe,
    billableUnits,
    minApplied,
    isLaundry,
    workersNeededSafe,
    extraWorkerCount,
    extraWorkersFeeTotal
  ]);

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
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

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

  const handleReviewClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      const statePayload = {
        title,
        service_type: serviceType,
        service_task: serviceTask,
        units: inputUnitsSafe,
        quantity_unit: quantityUnit,
        billable_units: billableUnits,
        minimum_quantity: isLaundry && quantityUnit === 'kg' ? MIN_LAUNDRY_KG : null,
        minimum_applied: !!minApplied,
        base_rate_raw: baseRateRaw,
        base_rate_numeric: Number.isFinite(baseRateNum) ? baseRateNum : null,
        subtotal: computedSubtotal,
        preferred_time_fee: nightFee,
        workers_needed: workersNeededSafe,
        extra_worker_count: Number(extraWorkerCount) || 0,
        extra_workers_fee: Number(extraWorkersFeeTotal) || 0,
        total: computedTotal
      };

      if (typeof handleNext === 'function') {
        handleNext();
      } else {
        navigate('/clientreviewservicerequest', { state: statePayload });
      }
    }, 2000);
  };

  const onBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      if (typeof handleBack === 'function') handleBack();
    }, 2000);
  };

  const decUnits = () => setUnits((u) => Math.max(1, (Number(u) || 1) - 1));
  const incUnits = () => setUnits((u) => Math.min(999, (Number(u) || 1) + 1));

  const workersFeeApplies = (Number(extraWorkersFeeTotal) || 0) > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
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
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Service rate based on your selected task</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 3 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-3/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-gray-100/60 mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900">Service Request Price Rate</h3>
            <span
              style={{ display: 'none' }}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Rate
            </span>
          </div>

          <div className="px-6 py-6">
            <p className="text-base text-gray-600 mb-6">Your rate is automatically based on the service type and task you selected in the previous step.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Service Type</div>
                      <div className={`rounded-xl border px-4 py-3 ${attempted && !serviceType ? 'border-red-500' : 'border-gray-300'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-gray-900">{serviceType || 'Not selected'}</span>
                        </div>
                      </div>
                      {attempted && !serviceType && <p className="text-xs text-red-600 mt-1">Please go back and select a service type.</p>}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Service Task</div>
                      <div className={`rounded-xl border px-4 py-3 ${attempted && !serviceTask ? 'border-red-500' : 'border-gray-300'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-gray-900">{serviceTask || 'Not selected'}</span>
                          {baseRateDisplay ? <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{baseRateDisplay}</span> : null}
                        </div>
                      </div>
                      {attempted && !serviceTask && <p className="text-xs text-red-600 mt-1">Please go back and select a service task.</p>}
                    </div>

                    <div className="relative" ref={workersRef}>
                      <div className="text-sm font-medium text-gray-700 mb-2">Workers Needed</div>

                      <select
                        value={workersNeededSafe}
                        onChange={(e) => applyWorkersNeeded(e.target.value)}
                        className="hidden"
                        aria-hidden="true"
                        tabIndex={-1}
                        disabled={!allowExtraWorkers}
                      >
                        {workerOptions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>

                      <div
                        className={`flex items-center rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#008cfc]/40 ${
                          !allowExtraWorkers ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => allowExtraWorkers && setWorkersOpen((s) => !s)}
                          className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none"
                          disabled={!allowExtraWorkers}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-gray-900">
                              {workersNeededSafe} worker{workersNeededSafe === 1 ? '' : 's'}
                            </span>
                            {allowExtraWorkers && workersFeeApplies ? (
                              <span className="shrink-0 text-xs font-semibold text-[#008cfc]">{`+ fee ${peso(extraWorkersFeeTotal)}`}</span>
                            ) : null}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => allowExtraWorkers && setWorkersOpen((s) => !s)}
                          className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                          aria-label="Open workers options"
                          disabled={!allowExtraWorkers}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        {allowExtraWorkers ? (
                          <>
                            Up to <span className="font-medium">{INCLUDED_WORKERS}</span> workers included. Extra worker fee is{' '}
                            <span className="font-medium">{peso(EXTRA_WORKER_FEE)}</span> per added worker.
                          </>
                        ) : (
                          <>
                            Add workers is available when units is <span className="font-medium">{MIN_UNITS_FOR_EXTRA_WORKERS}</span> and above.
                          </>
                        )}
                      </p>

                      <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-700">Selected workers</span>
                          <span className="text-xs font-semibold text-[#008cfc]">
                            {workersNeededSafe} {workersNeededSafe === 1 ? 'worker' : 'workers'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <span className="text-xs text-gray-700">Extra workers fee</span>
                          <span
                            className={`text-xs font-semibold ${
                              allowExtraWorkers && workersFeeApplies ? 'text-[#008cfc]' : 'text-gray-400'
                            }`}
                          >
                            {allowExtraWorkers && workersFeeApplies ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                          </span>
                        </div>
                      </div>

                      {allowExtraWorkers && workersOpen && (
                        <PopList
                          items={workerOptions}
                          value={workersNeededSafe}
                          onSelect={(v) => {
                            applyWorkersNeeded(v);
                            setWorkersOpen(false);
                          }}
                          fullWidth
                          title="Select Number of Workers"
                          clearable
                          onClear={() => {
                            applyWorkersNeeded(1);
                            setWorkersOpen(false);
                          }}
                          rightLabel={(it) => {
                            const n = clampInt(it, 1, MAX_WORKERS);
                            const extra = Math.max(0, n - INCLUDED_WORKERS);
                            const fee = extra * EXTRA_WORKER_FEE;
                            return extra > 0 ? `+ fee ${peso(fee)}` : '';
                          }}
                        />
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700">
                          {isLaundry ? `How many ${quantityUnit === 'kg' ? 'kg' : unitLabel}?` : 'How many units?'}
                        </div>
                        {attempted && hasDetails && !(Number.isFinite(baseRateNum) && baseRateNum > 0) ? (
                          <span className="text-xs text-red-600">Rate not available for this task</span>
                        ) : null}
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${attempted && !isFormValid ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-gray-50/40'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={decUnits}
                              disabled={!Number.isFinite(baseRateNum) || baseRateNum <= 0}
                              className={`h-11 w-11 rounded-xl border text-lg font-semibold transition ${
                                Number.isFinite(baseRateNum) && baseRateNum > 0
                                  ? 'border-gray-300 hover:bg-white text-gray-900'
                                  : 'border-gray-200 text-gray-300 cursor-not-allowed bg-white/50'
                              }`}
                            >
                              −
                            </button>
                            <div className="min-w-[90px] text-center">
                              <div className="text-2xl font-semibold text-gray-900">{inputUnitsSafe}</div>
                              <div className="text-xs text-gray-500">{unitLabel}</div>
                            </div>
                            <button
                              type="button"
                              onClick={incUnits}
                              disabled={!Number.isFinite(baseRateNum) || baseRateNum <= 0}
                              className={`h-11 w-11 rounded-xl border text-lg font-semibold transition ${
                                Number.isFinite(baseRateNum) && baseRateNum > 0
                                  ? 'border-gray-300 hover:bg-white text-gray-900'
                                  : 'border-gray-200 text-gray-300 cursor-not-allowed bg-white/50'
                              }`}
                            >
                              +
                            </button>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Subtotal</span>
                              <span className="text-sm font-semibold text-gray-900">{peso(computedSubtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-600">Preferred time fee</span>
                              <span className={`text-sm font-semibold ${nightFeeApplies ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                                {nightFeeApplies ? `+ ${peso(nightFee)}` : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-600">Extra workers fee</span>
                              <span
                                className={`text-sm font-semibold ${
                                  allowExtraWorkers && workersFeeApplies ? 'text-[#008cfc]' : 'text-gray-400'
                                }`}
                              >
                                {allowExtraWorkers && workersFeeApplies ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                              </span>
                            </div>
                            <div className="h-px bg-gray-200 my-3" />
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-gray-900">Total</span>
                              <span className="text-base font-semibold text-gray-900">{peso(computedTotal)}</span>
                            </div>
                            {isLaundry && quantityUnit === 'kg' ? (
                              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                                <div className="text-xs text-gray-700">
                                  Minimum charge is <span className="font-semibold">8kg</span>.
                                  {minApplied ? (
                                    <span className="ml-1">
                                      You entered <span className="font-semibold">{inputUnitsSafe}kg</span>, billed as{' '}
                                      <span className="font-semibold">8kg</span>.
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {attempted && !isFormValid ? (
                        <p className="text-xs text-red-600 mt-2">Please ensure your service type/task is selected and the task has a valid rate.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="text-lg font-semibold text-gray-900">Summary</div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Base rate</span>
                      <span className="text-sm font-semibold text-gray-900">{baseRateDisplay || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Workers</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {workersNeededSafe} worker{workersNeededSafe === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Extra workers fee</span>
                      <span className={`text-sm font-semibold ${allowExtraWorkers && workersFeeApplies ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                        {allowExtraWorkers && workersFeeApplies ? `+ ${peso(extraWorkersFeeTotal)}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">{isLaundry ? 'Quantity' : 'Units'}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {inputUnitsSafe} {unitLabel}
                      </span>
                    </div>
                    {isLaundry && quantityUnit === 'kg' ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-600">Billable kg</span>
                        <span className={`text-sm font-semibold ${minApplied ? 'text-[#008cfc]' : 'text-gray-900'}`}>{billableUnits} kg</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="text-sm font-semibold text-gray-900">{peso(computedSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600">Preferred time fee</span>
                      <span className={`text-sm font-semibold ${nightFeeApplies ? 'text-[#008cfc]' : 'text-gray-400'}`}>
                        {nightFeeApplies ? `+ ${peso(nightFee)}` : '—'}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200 my-2" />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-base font-semibold text-gray-900">{peso(computedTotal)}</span>
                    </div>
                    {!hasDetails ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Go back to Step 2 and select your service type and task.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={onBackClick}
            className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
          >
            Back : Service Request Details
          </button>

          <button
            type="button"
            onClick={handleReviewClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${
              isFormValid ? 'bg-[#008cfc] text-white hover:bg-[#0077d6]' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40`}
            aria-disabled={!isFormValid}
          >
            Review Service Request
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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-lg font-semibold text-gray-900">Preparing Step 4</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 2"
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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-lg font-semibold text-gray-900">Back to Step 2</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientServiceRate;
