import React, { useState, useCallback, useEffect } from 'react';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

const boxBase = 'flex items-center justify-center w-full h-40 border-2 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition';
const boxInner = 'text-center text-sm text-gray-600';

function DocDrop({ label, hint, required = false, value, onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(undefined);

  const validateAndSet = useCallback(
    (file) => {
      if (!file) {
        setError(undefined);
        onChange(null, undefined);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        const msg = 'Only PDF, JPG, or PNG files are allowed.';
        setError(msg); onChange(null, msg); return;
      }
      if (file.size > MAX_BYTES) {
        const msg = 'File too large. Max size is 5MB.';
        setError(msg); onChange(null, msg); return;
      }
      setError(undefined);
      onChange(file, undefined);
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
    <div className="bg-white p-4 rounded-md border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[15px] font-medium text-gray-800">
          {label} {required && <span className="text-red-500">*</span>}
        </h4>
      </div>

      <label
        className={`${boxBase} ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
        <div className={boxInner}>
          {!value ? (
            <>
              <div className="font-medium">Click to upload or drag and drop</div>
              <div className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max: 5MB)</div>
            </>
          ) : (
            <>
              <div className="font-medium">Selected:</div>
              <div className="text-xs text-gray-700 mt-1 break-all">{value.name}</div>
              <div className="text-[11px] text-gray-500 mt-1">Click to replace or drag a new file</div>
            </>
          )}
        </div>
      </label>

      {hint && <p className="text-[11px] text-gray-500 mt-2">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

const STORAGE_KEY = 'workerDocuments';

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
  const [logoBroken, setLogoBroken] = useState(false);

  // Note: File objects can’t be rehydrated; we only keep names in storage after proceed (same as your code).
  useEffect(() => {}, []);

  const isFormValid = !!primaryFront;

  const proceed = () => {
    const draft = {
      primary_front_name: primaryFront?.name || null,
      primary_back_name: primaryBack?.name || null,
      secondary_id_name: secondaryId?.name || null,
      nbi_name: nbi?.name || null,
      address_name: address?.name || null,
      medical_name: medical?.name || null,
      certs_name: certs?.name || null
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
    onCollect?.({ primary_front: primaryFront, primary_back: primaryBack, secondary_id: secondaryId, nbi, address, medical, certs });
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    setIsLoadingNext(true);
    setTimeout(() => { proceed(); }, 2000);
  };

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

  return (
    <form className="space-y-8">
      <div className="w-full max-w-[1535px] mx-auto px-6">
        <div>
          <h3 className="text-2xl font-semibold -ml-3 mt-12">Worker Documents</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <DocDrop label="Primary ID (Front)" required hint="UMID, Passport, Driver’s License, etc." value={primaryFront} onChange={setPrimaryFront} />
          <DocDrop label="Primary ID (Back)" hint="UMID, Passport, Driver’s License, etc." value={primaryBack} onChange={setPrimaryBack} />
          <DocDrop label="Secondary ID" hint="UMID, Passport, Driver’s License, etc." value={secondaryId} onChange={setSecondaryId} />
          <DocDrop label="NBI/Police Clearance" hint="Barangay Certificate also accepted" value={nbi} onChange={setNbi} />
          <DocDrop label="Proof of Address" hint="Barangay Certificate, Utility Bill" value={address} onChange={setAddress} />
          <DocDrop label="Medical Certificate" hint="Latest medical/fit-to-work certificate" value={medical} onChange={setMedical} />
          <div className="md:col-span-2">
            <DocDrop label="Certificates" hint="TESDA, Training Certificates, etc." value={certs} onChange={setCerts} />
          </div>
        </div>

        {attempted && !isFormValid && (
          <p className="text-xs text-red-600 mt-3 ml-[-0.75rem]">Primary ID (Front) is required.</p>
        )}

        <div className="flex justify-between mt-8 ml-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 mt-2.5"
          >
            Back : Work Information
          </button>
          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            aria-disabled={!isFormValid}
            className={`px-8 py-3 rounded-md shadow-md transition duration-300 mt-2.5 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
          >
            Next : Set Your Price Rate
          </button>
        </div>
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
              <div className="text-base font-semibold text-gray-900">Preparing Step 4</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default WorkerRequiredDocuments;
