import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'clientServiceRate';

const ClientServiceRate = ({ title, setTitle, handleNext, handleBack }) => {
  const [rateType, setRateType] = useState('');
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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

  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setRateType(data.rateType || '');
        setRateFrom(data.rateFrom || '');
        setRateTo(data.rateTo || '');
        setRateValue(data.rateValue || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = { rateType, rateFrom, rateTo, rateValue };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

  const handleReviewClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      if (typeof handleNext === 'function') {
        handleNext();
      } else {
        navigate('/clientreviewservicerequest', {
          state: { title, rate_type: rateType, rate_from: rateFrom, rate_to: rateTo, rate_value: rateValue },
        });
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Please choose your service rate</div>
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
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Rate
            </span>
          </div>

          <div className="px-6 py-6">
            <p className="text-base text-gray-600 mb-6">Please choose the service rate type and enter the price.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => handleRateTypeChange({ target: { value: 'Hourly Rate' } })}
                className={`p-4 border rounded-xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 ${rateType === 'Hourly Rate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 grid place-items-center rounded-lg bg-blue-100">
                    <img src="/Clock.png" alt="" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">By the hour</p>
                    <p className="text-sm text-gray-500">Pay per hour of work</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRateTypeChange({ target: { value: 'By the Job Rate' } })}
                className={`p-4 border rounded-xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 ${rateType === 'By the Job Rate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 grid place-items-center rounded-lg bg-blue-100">
                    <img src="/Contract.png" alt="" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">By the job</p>
                    <p className="text-sm text-gray-500">Single fixed price</p>
                  </div>
                </div>
              </button>
            </div>

            {rateType === 'Hourly Rate' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate (Per Hour)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                    <div className={`relative rounded-xl border ${attempted && !isHourlyValid() && !rateFrom ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="\d*"
                        value={rateFrom}
                        onChange={handleRateFromChange}
                        className="w-full pl-8 px-4 py-3 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                    <div className={`relative rounded-xl border ${attempted && !isHourlyValid() && !rateTo ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="\d*"
                        value={rateTo}
                        onChange={handleRateToChange}
                        className="w-full pl-8 px-4 py-3 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
                {attempted && rateFrom && rateTo && !isHourlyValid() && (
                  <p className="text-xs text-red-600 mt-1">Enter valid amounts, and make sure “To” is greater than or equal to “From”.</p>
                )}
                <p className="text-base text-gray-600 mt-2">This is the average rate for similar home services.</p>
                <p className="text-base text-gray-600 mt-4">For service requests like plumbing, carpentry, electrical work, car washing, or laundry, costs can change based on the task and time needed.</p>
              </div>
            )}

            {rateType === 'By the Job Rate' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter the Rate</label>
                <div className={`relative rounded-xl border ${attempted && !isJobValid() ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="\d*"
                    value={rateValue}
                    onChange={handleRateValueChange}
                    className="w-full pl-8 px-4 py-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                {attempted && !isJobValid() && <p className="text-xs text-red-600 mt-1">Enter a valid amount greater than 0.</p>}
                <p className="text-base text-gray-600 mt-2">Set a fixed price for the service request.</p>
                <p className="text-base text-gray-600 mt-4">The fixed price is an amount that you and the service provider can discuss and agree on together. Feel free to negotiate the price based on the scope of the work.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={() => { jumpTop(); handleBack(); }}
            className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
          >
            Back : Step 2
          </button>

          <button
            type="button"
            onClick={handleReviewClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-[#0077d6]' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40`}
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
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
              <div className="text-lg font-semibold text-gray-900">Preparing Step 4</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientServiceRate;
