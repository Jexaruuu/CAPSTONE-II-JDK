import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
    const e =
      a.email ||
      localStorage.getItem('clientEmail') ||
      localStorage.getItem('client_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem('client_auth_uid') ||
      localStorage.getItem('auth_uid') ||
      null;
    return encodeURIComponent(JSON.stringify({ e, r: 'client', au }));
  } catch {
    const e =
      localStorage.getItem('clientEmail') ||
      localStorage.getItem('client_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    return encodeURIComponent(JSON.stringify({ e, r: 'client', au: null }));
  }
}

const ClientTermsAndAgreements = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [agreeVerify, setAgreeVerify] = useState(false);
  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [meEmail, setMeEmail] = useState('');
  const canProceed = agreeVerify && agreeTos && agreePrivacy;

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  useEffect(() => {
    const draft = { agree_verify: agreeVerify, agree_tos: agreeTos, agree_privacy: agreePrivacy };
    try {
      localStorage.setItem('clientAgreements', JSON.stringify(draft));
    } catch {}
  }, [agreeVerify, agreeTos, agreePrivacy]);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/clients/me`, { credentials: 'include', headers: headersWithU });
        if (r.ok) {
          const j = await r.json();
          const em = j?.email_address || '';
          if (em) {
            setMeEmail(em);
            const known = localStorage.getItem('clientEmail') || localStorage.getItem('email_address') || '';
            if (!known) { try { localStorage.setItem('clientEmail', em); } catch {} }
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

  useEffect(() => {
    if (!isLoadingBack) return;
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
  }, [isLoadingBack]);

  const proceed = () => {
    const draft = { email_address: meEmail || '', agree_verify: agreeVerify, agree_tos: agreeTos, agree_privacy: agreePrivacy };
    try {
      localStorage.setItem('clientAgreements', JSON.stringify(draft));
    } catch {}
    onCollect?.(draft);
    handleNext?.();
  };

  const onNextClick = () => {
    if (!canProceed) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      proceed();
    }, 2000);
  };

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
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Terms & Agreements</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 5 of 6</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-5/6 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Agreements</h3>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-5">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeVerify}
                  onChange={(e) => setAgreeVerify(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <div className="text-[15px] md:text-base text-gray-900">
                    I consent to background checks and verify my documents. <span className="text-red-500">*</span>
                  </div>
                  <div className="text-[13px] md:text-sm text-gray-500 mt-1">
                    JD HOMECARE may verify the authenticity of your submitted documents.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTos}
                  onChange={(e) => setAgreeTos(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <div className="text-[15px] md:text-base text-gray-900">
                    I agree to JD HOMECARE&apos;s Terms of Service and Privacy Policy. <span className="text-red-500">*</span>
                  </div>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] md:text-sm text-blue-600 hover:underline">
                    View Terms of Service and Privacy Policy
                  </a>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <div className="text-[15px] md:text-base text-gray-900">
                    I consent to the collection and processing of my personal data in accordance with the Data Privacy Act (RA 10173). <span className="text-red-500">*</span>
                  </div>
                  <div className="text-[13px] md:text-sm text-gray-500 mt-1">
                    Your data will be protected and processed in compliance with Philippine law.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={onBackClick}
            className="sm:w-1/3 w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Back : Previous Step
          </button>

          <button
            type="button"
            onClick={onNextClick}
            className={`sm:w-1/3 w-full px-6 py-3 rounded-xl transition shadow-sm ${
              canProceed ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'
            }`}
            disabled={!canProceed}
            aria-disabled={!canProceed}
          >
            Next : Review Request
          </button>
        </div>
      </form>

      {false && isLoadingNext && (
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
              <div className="text-base font-semibold text-gray-900">Preparing Step 6</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingNext &&
        createPortal(
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
                <div className="text-base font-semibold text-gray-900">Preparing Step 6</div>
                <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {isLoadingBack &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Back to previous step"
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
                <div className="text-base font-semibold text-gray-900">Back to Step 5</div>
                <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ClientTermsAndAgreements;
