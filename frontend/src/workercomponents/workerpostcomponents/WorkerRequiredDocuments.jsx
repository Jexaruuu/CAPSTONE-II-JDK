import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

const boxBase =
  'flex items-center justify-center w-full h-44 border-2 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition';
const boxInner = 'text-center text-sm text-gray-700';

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function DocDrop({ label, hint, required = false, value, onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(undefined);
  const [previewURL, setPreviewURL] = useState(null);

  useEffect(() => {
    if (value && value.type && value.type.startsWith('image/')) {
      const url = URL.createObjectURL(value);
      setPreviewURL(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewURL(null);
  }, [value]);

  const validateAndSet = useCallback(
    (file) => {
      if (!file) {
        setError(undefined);
        onChange(null);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        const msg = 'Only PDF, JPG, or PNG files are allowed.';
        setError(msg);
        onChange(null);
        return;
      }
      if (file.size > MAX_BYTES) {
        const msg = 'File too large. Max size is 5MB.';
        setError(msg);
        onChange(null);
        return;
      }
      setError(undefined);
      onChange(file);
    },
    [onChange]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    validateAndSet(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0] || null;
    validateAndSet(file);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[15px] font-semibold text-gray-900">
          {label} {required && <span className="text-red-500">*</span>}
        </h4>
      </div>

      <label
        className={[
          boxBase,
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
          'ring-1 ring-gray-100 hover:ring-blue-100 relative overflow-hidden'
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />

        {previewURL ? (
          <>
            <img
              src={previewURL}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 px-3 py-2 text-[11px] text-gray-700">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{value?.name}</span>
                <span className="shrink-0">{humanSize(value?.size || 0)}</span>
              </div>
              <div className="text-[10px] text-gray-500">Click to replace or drag a new file</div>
            </div>
          </>
        ) : (
          <div className={boxInner}>
            {!value || (value && value.type === 'application/pdf') ? (
              <>
                <div className="font-medium text-gray-900">Click to upload or drag and drop</div>
                <div className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG • Max 5MB</div>
                {value && value.type === 'application/pdf' && (
                  <div className="text-[11px] text-gray-500 mt-2 break-all">{value.name}</div>
                )}
              </>
            ) : null}
          </div>
        )}
      </label>

      {value && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-600 truncate">
            <span className="font-medium text-gray-800">Selected:</span>{' '}
            <span className="truncate">{value.name}</span>
          </div>
          <button
            type="button"
            onClick={() => validateAndSet(null)}
            className="text-xs px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {hint && <p className="text-[11px] text-gray-500 mt-2">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

const WorkerRequiredDocuments = ({ title, setTitle, handleNext, handleBack, onCollect }) => {
  const [primaryFront, setPrimaryFront] = useState(null);
  const [primaryBack, setPrimaryBack] = useState(null);
  const [secondaryId, setSecondaryId] = useState(null);
  const [nbi, setNbi] = useState(null);
  const [address, setAddress] = useState(null);
  const [medical, setMedical] = useState(null);
  const [certs, setCerts] = useState(null);

  const [attempted, setAttempted] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const isFormValid =
    !!primaryFront &&
    !!primaryBack &&
    !!secondaryId &&
    !!nbi &&
    !!address &&
    !!medical &&
    !!certs;

  const proceed = () => {
    const docs = {
      primary_front: primaryFront,
      primary_back: primaryBack,
      secondary_id: secondaryId,
      nbi: nbi,
      address: address,
      medical: medical,
      certs: certs
    };
    onCollect?.(docs);
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      setIsLoadingNext(false);
      proceed();
    }, 2000);
  };

  const onBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      setIsLoadingBack(false);
      handleBack?.();
    }, 2000);
  };

  return (
    <form className="space-y-8">
      <div className="w-full max-w-[1535px] mx-auto px-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Required Documents</h3>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Documents
            </span>
          </div>

          <div className="px-6 pt-5">
            <p className="text-base text-gray-600">
              Upload clear scans/photos of your documents. Accepted formats:{' '}
              <span className="font-medium">PDF, JPG, PNG</span> (max 5MB each).
            </p>
          </div>

          <div className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <>
                <DocDrop
                  label="Primary ID (Front)"
                  required
                  hint="UMID, Passport, Driver’s License, etc."
                  value={primaryFront}
                  onChange={setPrimaryFront}
                />
                {attempted && !primaryFront && (
                  <p className="text-xs text-red-600 -mt-3">Please upload your Primary ID (Front).</p>
                )}
              </>
              <>
                <DocDrop
                  label="Primary ID (Back)"
                  required
                  hint="UMID, Passport, Driver’s License, etc."
                  value={primaryBack}
                  onChange={setPrimaryBack}
                />
                {attempted && !primaryBack && (
                  <p className="text-xs text-red-600 -mt-3">Please upload your Primary ID (Back).</p>
                )}
              </>
              <>
                <DocDrop
                  label="Secondary ID"
                  required
                  hint="UMID, Passport, Driver’s License, etc."
                  value={secondaryId}
                  onChange={setSecondaryId}
                />
                {attempted && !secondaryId && (
                  <p className="text-xs text-red-600 -mt-3">Please upload a Secondary ID.</p>
                )}
              </>
              <>
                <DocDrop
                  label="NBI/Police Clearance"
                  required
                  hint="Barangay Certificate also accepted"
                  value={nbi}
                  onChange={setNbi}
                />
                {attempted && !nbi && (
                  <p className="text-xs text-red-600 -mt-3">Please upload your NBI/Police Clearance.</p>
                )}
              </>
              <>
                <DocDrop
                  label="Proof of Address"
                  required
                  hint="Barangay Certificate, Utility Bill"
                  value={address}
                  onChange={setAddress}
                />
                {attempted && !address && (
                  <p className="text-xs text-red-600 -mt-3">Please upload a Proof of Address.</p>
                )}
              </>
              <>
                <DocDrop
                  label="Medical Certificate"
                  required
                  hint="Latest medical/fit-to-work certificate"
                  value={medical}
                  onChange={setMedical}
                />
                {attempted && !medical && (
                  <p className="text-xs text-red-600 -mt-3">Please upload your Medical Certificate.</p>
                )}
              </>
              <div className="md:col-span-2">
                <>
                  <DocDrop
                    label="Certificates"
                    required
                    hint="TESDA, Training Certificates, etc."
                    value={certs}
                    onChange={setCerts}
                  />
                  {attempted && !certs && (
                    <p className="text-xs text-red-600 -mt-3">Please upload your Certificates.</p>
                  )}
                </>
              </div>
            </div>

            {attempted && !isFormValid && (
              <p className="text-xs text-red-600 mt-3">Please upload all required documents to continue.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={onBackClick}
            className="w-full sm:w-1/3 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Back : Work Information
          </button>
          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            aria-disabled={!isFormValid}
            className={`w-full sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${
              isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'
            }`}
          >
            Next : Set Your Price Rate
          </button>
        </div>
      </div>

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
                <div className="text-base font-semibold text-gray-900">Preparing Step 4</div>
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
                <div className="text-base font-semibold text-gray-900">Back to Step 2</div>
                <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </form>
  );
};

export default WorkerRequiredDocuments;
