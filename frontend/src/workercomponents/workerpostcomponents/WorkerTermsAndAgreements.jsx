import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'workerAgreements';

const WorkerTermsAndAgreements = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [agreeVerify, setAgreeVerify] = useState(false);
  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const canProceed = agreeVerify && agreeTos && agreePrivacy;

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setAgreeVerify(!!d.agree_verify);
        setAgreeTos(!!d.agree_tos);
        setAgreePrivacy(!!d.agree_privacy);
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!hydrated) return;
    const draft = {
      agree_verify: agreeVerify,
      agree_tos: agreeTos,
      agree_privacy: agreePrivacy
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }, [hydrated, agreeVerify, agreeTos, agreePrivacy]);

  // Lock back button / keys / scroll while loading (same as client)
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

    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  const proceed = () => {
    const draft = {
      agree_verify: agreeVerify,
      agree_tos: agreeTos,
      agree_privacy: agreePrivacy
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
    onCollect?.(draft);
    handleNext?.();
  };

  const onNextClick = () => {
    if (!canProceed) return;
    setIsLoadingNext(true);
    setTimeout(() => {
      proceed();
    }, 2000);
  };

  return (
    <form className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Agreements</h3>

          <div className="space-y-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeVerify}
                onChange={(e) => setAgreeVerify(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I consent to background checks and verify my documents. <span className="text-red-500">*</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  JD HOMECARE may verify the authenticity of your submitted documents.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTos}
                onChange={(e) => setAgreeTos(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I agree to JD HOMECARE&apos;s Terms of Service and Privacy Policy. <span className="text-red-500">*</span>
                </div>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-blue-600 hover:underline">
                  View Terms of Service and Privacy Policy
                </a>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm text-gray-800">
                  I consent to the collection and processing of my personal data in accordance with the Data Privacy Act (RA 10173). <span className="text-red-500">*</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Your data will be protected and processed in compliance with Philippine law.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
        >
          Back : Set Your Price Rate
        </button>

        <button
          type="button"
          onClick={onNextClick}
          className={`px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4 ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canProceed}
          aria-disabled={!canProceed}
        >
          Next : Review Application
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
              <div className="text-base font-semibold text-gray-900">Preparing Step 6</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default WorkerTermsAndAgreements;
