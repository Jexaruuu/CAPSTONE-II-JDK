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

  // Match reference: scroll to top on mount
  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  }, []);

  // Same tiny helper the reference uses
  const jumpTop = () => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  };

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

  // Loading: block back nav
  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => { window.removeEventListener('popstate', onPopState, true); };
  }, [isLoadingNext]);

  // Loading: lock body, block keys (same as reference)
  useEffect(() => {
    if (!isLoadingNext) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
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
    jumpTop(); // match reference before showing loader
    setIsLoadingNext(true);
    setTimeout(() => { proceed(); }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-lg font-semibold text-gray-900">Please choose your service rate</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-gray-500">Step 4 of 5</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-3/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Service Price Rate</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Rate</span>
          </div>

          <div className="px-6 py-6">
            <p className="text-sm text-gray-600 mb-6">Please choose the service rate type and enter the price.</p>

            {/* Rate type tiles (switched to blue theme like the reference) */}
            <div className="flex space-x-6 mb-6">
              <div
                className={`w-1/2 cursor-pointer p-4 border rounded-xl text-center ${rateType === 'Hourly Rate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => handleRateTypeChange({ target: { value: 'Hourly Rate' } })}
              >
                <div className="flex justify-center mb-2">
                  <img src="/Clock.png" alt="Rate Icon" className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold">By the hour</p>
              </div>

              <div
                className={`w-1/2 cursor-pointer p-4 border rounded-xl text-center ${rateType === 'By the Job Rate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => handleRateTypeChange({ target: { value: 'By the Job Rate' } })}
              >
                <div className="flex justify-center mb-2">
                  <img src="/Contract.png" alt="Rate Icon" className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold">By the job</p>
              </div>
            </div>

            {/* Hourly */}
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
                        className={`w-full pl-8 px-4 py-3 border ${attempted && !isHourlyValid() && !rateFrom ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                        className={`w-full pl-8 px-4 py-3 border ${attempted && !isHourlyValid() && !rateTo ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
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

            {/* By the Job */}
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
                    className={`w-full pl-8 px-4 py-3 border ${attempted && !isJobValid() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                {attempted && !isJobValid() && <p className="text-xs text-red-600 mt-1">Enter a valid amount greater than 0.</p>}
                <p className="text-sm text-gray-600 mt-2">Set a fixed price for the service request.</p>
                <p className="text-md text-gray-600 mt-4">
                  The fixed price is an amount that you and the service provider can discuss and agree on together. Feel free to negotiate the price based on the scope of the work.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions OUTSIDE the card (match reference) */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={() => { jumpTop(); handleBack?.(); }}
            className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Back : Required Documents
          </button>

          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            aria-disabled={!isFormValid}
            className={`sm:w-1/3 w-full px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
          >
            Next : Terms &amp; Condition Agreements
          </button>
        </div>
      </form>

      {/* Keep original bottom button row but hide it so no code is removed */}
      {false && (
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
      )}

      {/* Loading overlay — full white background, same design/logic as reference */}
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
    </div>
  );
};

export default WorkerRate;
