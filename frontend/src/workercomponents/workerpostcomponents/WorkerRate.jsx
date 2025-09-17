import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'workerRate';

const WorkerRate = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [rateType, setRateType] = useState('');
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');

  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setRateType(d.rate_type || '');
        setRateFrom(d.rate_from || '');
        setRateTo(d.rate_to || '');
        setRateValue(d.rate_value || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const draft = { rate_type: rateType, rate_from: rateFrom, rate_to: rateTo, rate_value: rateValue };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }, [hydrated, rateType, rateFrom, rateTo, rateValue]);

  const handleRateTypeChange = (e) => {
    setRateType(e.target.value);
    setRateFrom('');
    setRateTo('');
    setRateValue('');
  };
  const handleRateValueChange = (e) => setRateValue(e.target.value);
  const handleRateFromChange = (e) => setRateFrom(e.target.value);
  const handleRateToChange = (e) => setRateTo(e.target.value);

  const isHourlyValid = () => {
    if (!rateFrom || !rateTo) return false;
    const from = Number(rateFrom);
    const to = Number(rateTo);
    return Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0 && to >= from;
  };
  const isJobValid = () => {
    if (!rateValue) return false;
    const v = Number(rateValue);
    return Number.isFinite(v) && v > 0;
  };

  const isFormValid =
    rateType &&
    ((rateType === 'Hourly Rate' && isHourlyValid()) ||
      (rateType === 'By the Job Rate' && isJobValid()));

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

  const proceed = () => {
    const draft = { rate_type: rateType, rate_from: rateFrom, rate_to: rateTo, rate_value: rateValue };
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
    <form className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Service Price Rate</h3>
          <p className="text-sm text-gray-600 mb-6">Please choose the service rate type and enter the price.</p>

          <div className="flex space-x-6 mb-4">
            <div
              className={`w-1/2 cursor-pointer p-4 border rounded-md text-center ${rateType === 'Hourly Rate' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
              onClick={() => handleRateTypeChange({ target: { value: 'Hourly Rate' } })}
            >
              <div className="flex justify-center mb-2">
                <img src="/Clock.png" alt="Rate Icon" className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold">By the hour</p>
            </div>

            <div
              className={`w-1/2 cursor-pointer p-4 border rounded-md text-center ${rateType === 'By the Job Rate' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
              onClick={() => handleRateTypeChange({ target: { value: 'By the Job Rate' } })}
            >
              <div className="flex justify-center mb-2">
                <img src="/Contract.png" alt="Rate Icon" className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold">By the job</p>
            </div>
          </div>

          {rateType === 'Hourly Rate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate (Per Hour)</label>
              <div className="flex space-x-6">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="\d*"
                      value={rateFrom}
                      onChange={handleRateFromChange}
                      className={`w-full pl-8 px-4 py-3 border ${attempted && !isHourlyValid() && !rateFrom ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      required
                    />
                  </div>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="\d*"
                      value={rateTo}
                      onChange={handleRateToChange}
                      className={`w-full pl-8 px-4 py-3 border ${attempted && !isHourlyValid() && !rateTo ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      required
                    />
                  </div>
                </div>
              </div>
              {attempted && rateFrom && rateTo && !isHourlyValid() && (
                <p className="text-xs text-red-600 mt-1">Enter valid amounts, and make sure “To” ≥ “From”.</p>
              )}
              <p className="text-sm text-gray-600 mt-1">This is the average rate for similar home services.</p>
              <p className="text-md text-gray-600 mt-5">
                Our workers offer affordable rates for services like plumbing, carpentry, electrical work, car washing, and laundry. Prices may vary depending on the job, so feel free to talk with your service provider to agree on what works best.
              </p>
            </div>
          )}

          {rateType === 'By the Job Rate' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="\d*"
                  value={rateValue}
                  onChange={handleRateValueChange}
                  className={`w-full pl-8 px-4 py-3 border ${attempted && !isJobValid() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                />
              </div>
              {attempted && !isJobValid() && <p className="text-xs text-red-600 mt-1">Enter a valid amount greater than 0.</p>}
              <p className="text-sm text-gray-600 mt-2">Set a fixed price for the service request.</p>
              <p className="text-sm text-gray-600 mt-4">
                The fixed price is an amount that you and the service provider can discuss and agree on together. Feel free to negotiate the price based on the scope of the work.
              </p>
            </div>
          )}
        </div>
      </div>

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
          onClick={onNextClick}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
          className={`px-8 py-3 rounded-md shadow-md transition duration-300 -mt-4 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
        >
          Next : Terms & Condition Agreements
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
              <div className="text-base font-semibold text-gray-900">Preparing Step 5</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default WorkerRate;
