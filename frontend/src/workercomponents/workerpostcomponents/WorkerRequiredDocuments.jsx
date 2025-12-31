import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;
const boxBase = 'relative flex items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed transition';
const boxInner = 'text-center text-sm text-gray-700';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function fileToDataUrl(file) {
  if (!file) return null;
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return String(b64 || '');
}

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
      if (!file) { setError(undefined); onChange(null); return; }
      if (!ALLOWED_TYPES.includes(file.type)) { setError('Only PDF, JPG, or PNG files are allowed.'); onChange(null); return; }
      if (file.size > MAX_BYTES) { setError('File too large. Max size is 5MB.'); onChange(null); return; }
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

  const statusPill = value ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200';
  const borderState = dragOver ? 'border-[#008cfc]' : 'border-blue-300';

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-semibold text-gray-900">{label} {required && <span className="text-red-500">*</span>}</h4>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium ${statusPill}`}>
          <span className={`h-2 w-2 rounded-full ${value ? 'bg-[#008cfc]' : 'bg-[#008cfc]/60'}`} />
          {value ? 'Uploaded' : 'Required'}
        </span>
      </div>

      <label
        className={[boxBase, borderState, dragOver ? 'bg-blue-50/40' : 'bg-gray-50 hover:bg-gray-100', 'ring-1 ring-blue-100 hover:ring-blue-200 overflow-hidden'].join(' ')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />

        {previewURL ? (
          <>
            <img src={previewURL} alt="Preview" className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-2xl" />
            <div className="absolute inset-x-0 bottom-0 bg-white/85 backdrop-blur-sm border-t border-blue-100 px-3 py-2 text-[11px] text-gray-700">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{value?.name}</span>
                <span className="shrink-0">{humanSize(value?.size || 0)}</span>
              </div>
              <div className="text-[10px] text-gray-500">Click to replace or drag a new file</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {value && value.type === 'application/pdf' ? (
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-xl border border-blue-200 grid place-items-center bg-white shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                </div>
                <div className="mt-2 text-[11px] text-gray-700 max-w-[85%] truncate">{value.name}</div>
                <div className="text-[10px] text-gray-500">{humanSize(value?.size || 0)}</div>
                <div className="text-[10px] text-gray-500 mt-1">Click to replace or drag a new file</div>
              </div>
            ) : (
              <div className={boxInner}>
                <div className="font-medium text-gray-900">Click to upload or drag and drop</div>
                <div className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG • Max 5MB</div>
              </div>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-blue-100" />
      </label>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-600 truncate">
          {value ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-medium text-gray-800">Selected:</span>
              <span className="truncate max-w-[220px]">{value.name}</span>
              <span className="text-gray-400">•</span>
              <span>{humanSize(value.size || 0)}</span>
            </span>
          ) : (
            <span className="text-gray-400">No file selected</span>
          )}
        </div>
        {value ? (
          <div className="flex items-center gap-2">
            {previewURL && (
              <a
                href={previewURL}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2.5 py-1 rounded-md border border-blue-200 hover:bg-blue-50 text-blue-700"
              >
                View
              </a>
            )}
            <button
              type="button"
              onClick={() => validateAndSet(null)}
              className="text-xs px-2.5 py-1 rounded-md border border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400">{hint || ''}</span>
        )}
      </div>

      {hint && value && <p className="text-[11px] text-gray-500 mt-2">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  (arr || []).forEach((x) => {
    const v = String(x || '').trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  });
  return out;
}

function normalizeServiceType(t) {
  const v = String(t || '').trim();
  if (!v) return '';
  const k = v.toLowerCase();
  if (k === 'carpentry') return 'Carpenter';
  if (k === 'carpenter') return 'Carpenter';
  if (k === 'plumber' || k === 'plumbing') return 'Plumber';
  if (k === 'electrician' || k === 'electrical') return 'Electrician';
  if (k === 'carwashing' || k === 'carwash' || k === 'carwasher' || k === 'car wash') return 'Carwasher';
  if (k === 'laundry') return 'Laundry';
  if (k === 'housekeeping') return 'Laundry';
  return v;
}

function readSelectedServiceTypes() {
  const tryParse = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const wwi = tryParse('workerWorkInformation');
  const fromWWI = Array.isArray(wwi?.service_types) ? wwi.service_types : null;

  const wi = tryParse('workerInformation');
  const fromWI =
    Array.isArray(wi?.service_types) ? wi.service_types
      : Array.isArray(wi?.service_type) ? wi.service_type
        : typeof wi?.service_type === 'string' ? wi.service_type.split(',').map((x) => x.trim()).filter(Boolean)
          : null;

  const fallbackStr =
    localStorage.getItem('worker_service_types') ||
    localStorage.getItem('workerServiceTypes') ||
    localStorage.getItem('service_types') ||
    '';

  const fromFallback = fallbackStr
    ? fallbackStr.split(',').map((x) => x.trim()).filter(Boolean)
    : null;

  return uniq([...(fromWWI || []), ...(fromWI || []), ...(fromFallback || [])].map(normalizeServiceType).filter(Boolean));
}

function safeStringify(v) {
  try { return JSON.stringify(v); } catch { return ''; }
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
  const [meEmail, setMeEmail] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [tesdaCertFiles, setTesdaCertFiles] = useState({});

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    setSelectedServices(readSelectedServiceTypes());
    const onStorage = () => setSelectedServices(readSelectedServiceTypes());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const certMap = useMemo(
    () => ({
      Carpenter: 'TESDA Carpentry NC II Certificate',
      Plumber: 'TESDA Plumbing NC II Certificate',
      Electrician: 'TESDA Electrical Installation and Maintenance NC II Certificate',
      Carwasher: 'TESDA Automotive Servicing NC II Certificate',
      Laundry: 'TESDA Housekeeping NC II Certificate',
    }),
    []
  );

  const requiredCertTypes = useMemo(() => {
    const types = uniq((selectedServices || []).map(normalizeServiceType)).filter(Boolean);
    return types.filter((t) => !!certMap[t]);
  }, [selectedServices, certMap]);

  const requiredCertLabels = useMemo(() => {
    return uniq(requiredCertTypes.map((t) => certMap[t]).filter(Boolean));
  }, [requiredCertTypes, certMap]);

  const showCerts = requiredCertTypes.length > 0;

  useEffect(() => {
    setTesdaCertFiles((prev) => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((k) => {
        if (!requiredCertTypes.includes(k)) delete next[k];
      });
      return next;
    });
    if (!showCerts) {
      setCerts(null);
    }
  }, [requiredCertTypes, showCerts]);

  const uploadedCount = useMemo(() => {
    const base = [primaryFront, primaryBack, secondaryId, nbi, address, medical].filter(Boolean).length;
    const certCount = requiredCertTypes.reduce((n, t) => n + (tesdaCertFiles?.[t] ? 1 : 0), 0);
    return base + certCount;
  }, [primaryFront, primaryBack, secondaryId, nbi, address, medical, requiredCertTypes, tesdaCertFiles]);

  const totalRequired = useMemo(() => 6 + (showCerts ? requiredCertTypes.length : 0), [showCerts, requiredCertTypes]);

  const jumpTop = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch { } };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

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
            if (!known) { try { localStorage.setItem('workerEmail', em); } catch { } }
          }
        }
      } catch { }
    };
    run();
  }, [headersWithU]);

  const hasAllTesdaCerts = useMemo(() => {
    if (!showCerts) return true;
    return requiredCertTypes.every((t) => !!tesdaCertFiles?.[t]);
  }, [showCerts, requiredCertTypes, tesdaCertFiles]);

  const isFormValid = !!primaryFront && !!primaryBack && !!secondaryId && !!nbi && !!address && !!medical && hasAllTesdaCerts;

  const proceed = async () => {
    const tesdaCertsData = {};
    const tesdaCertsMeta = {};
    for (const t of requiredCertTypes) {
      const f = tesdaCertFiles?.[t] || null;
      tesdaCertsData[t] = await fileToDataUrl(f);
      tesdaCertsMeta[t] = {
        name: f?.name || '',
        type: f?.type || '',
        size: f?.size || 0,
        label: certMap[t] || t
      };
    }

    const docsData = {
      primary_front: await fileToDataUrl(primaryFront),
      primary_back: await fileToDataUrl(primaryBack),
      secondary_id: await fileToDataUrl(secondaryId),
      nbi: await fileToDataUrl(nbi),
      address: await fileToDataUrl(address),
      medical: await fileToDataUrl(medical),
      certs: showCerts ? safeStringify(tesdaCertsData) : await fileToDataUrl(certs)
    };

    const docsMeta = {
      primary_front_name: primaryFront?.name || '',
      primary_back_name: primaryBack?.name || '',
      secondary_id_name: secondaryId?.name || '',
      nbi_name: nbi?.name || '',
      address_name: address?.name || '',
      medical_name: medical?.name || '',
      certs_name: showCerts ? safeStringify(Object.fromEntries(Object.entries(tesdaCertsMeta).map(([k, v]) => [k, v?.name || '']))) : (certs?.name || ''),
      primary_front_type: primaryFront?.type || '',
      primary_back_type: primaryBack?.type || '',
      secondary_id_type: secondaryId?.type || '',
      nbi_type: nbi?.type || '',
      address_type: address?.type || '',
      medical_type: medical?.type || '',
      certs_type: showCerts ? 'application/json' : (certs?.type || ''),
      primary_front_size: primaryFront?.size || 0,
      primary_back_size: primaryBack?.size || 0,
      secondary_id_size: secondaryId?.size || 0,
      nbi_size: nbi?.size || 0,
      address_size: address?.size || 0,
      medical_size: medical?.size || 0,
      certs_size: showCerts ? safeStringify(Object.fromEntries(Object.entries(tesdaCertsMeta).map(([k, v]) => [k, v?.size || 0]))) : (certs?.size || 0),
      required_tesda_certificates: requiredCertLabels,
      tesda_certificates_meta: tesdaCertsMeta
    };

    try { localStorage.setItem('workerDocumentsData', JSON.stringify(docsData)); } catch { }
    try { localStorage.setItem('workerDocuments', JSON.stringify(docsMeta)); } catch { }

    const canon = {
      primary_id_front: docsData.primary_front || '',
      primary_id_back: docsData.primary_back || '',
      secondary_id: docsData.secondary_id || '',
      nbi_police_clearance: docsData.nbi || '',
      proof_of_address: docsData.address || '',
      medical_certificate: docsData.medical || '',
      certificates: docsData.certs || '',
      tesda_carpentry_certificate: tesdaCertsData.Carpenter || '',
      tesda_electrician_certificate: tesdaCertsData.Electrician || '',
      tesda_plumbing_certificate: tesdaCertsData.Plumber || '',
      tesda_carwashing_certificate: tesdaCertsData.Carwasher || '',
      tesda_laundry_certificate: tesdaCertsData.Laundry || ''
    };

    try { localStorage.setItem('worker_required_documents', JSON.stringify(canon)); } catch { }
    try { localStorage.setItem('workerRequiredDocuments', JSON.stringify(canon)); } catch { }

    const extra = showCerts ? { tesda_certificates: tesdaCertsData, tesda_certificates_meta: tesdaCertsMeta } : {};
    onCollect?.({ email_address: meEmail || '', ...docsMeta, ...docsData, ...extra });
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(async () => {
      await proceed();
      setIsLoadingNext(false);
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
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Please upload your documents</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 3 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-3/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1535px] mx-auto px-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h3 className="text-xl md:text-2xl font-semibold">Required Documents</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{uploadedCount}/{totalRequired} uploaded</span>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <>
                <DocDrop label="Primary ID (Front)" required hint="UMID, Passport, Driver’s License, etc." value={primaryFront} onChange={setPrimaryFront} />
                {attempted && !primaryFront && <p className="text-xs text-red-600 -mt-3">Please upload your Primary ID (Front).</p>}
              </>
              <>
                <DocDrop label="Primary ID (Back)" required hint="UMID, Passport, Driver’s License, etc." value={primaryBack} onChange={setPrimaryBack} />
                {attempted && !primaryBack && <p className="text-xs text-red-600 -mt-3">Please upload your Primary ID (Back).</p>}
              </>
              <>
                <DocDrop label="Secondary ID" required hint="UMID, Passport, Driver’s License, etc." value={secondaryId} onChange={setSecondaryId} />
                {attempted && !secondaryId && <p className="text-xs text-red-600 -mt-3">Please upload a Secondary ID.</p>}
              </>
              <>
                <DocDrop label="NBI/Police Clearance" required hint="Barangay Certificate also accepted" value={nbi} onChange={setNbi} />
                {attempted && !nbi && <p className="text-xs text-red-600 -mt-3">Please upload your NBI/Police Clearance.</p>}
              </>
              <>
                <DocDrop label="Proof of Address" required hint="Barangay Certificate, Utility Bill" value={address} onChange={setAddress} />
                {attempted && !address && <p className="text-xs text-red-600 -mt-3">Please upload a Proof of Address.</p>}
              </>
              <>
                <DocDrop label="Medical Certificate" required hint="Latest medical/fit-to-work certificate" value={medical} onChange={setMedical} />
                {attempted && !medical && <p className="text-xs text-red-600 -mt-3">Please upload your Medical Certificate.</p>}
              </>

              {showCerts && (
                <div className="md:col-span-2">
                  <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">TESDA Certificate Requirement</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Based on your selected service type{requiredCertLabels.length === 1 ? '' : 's'}:
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {requiredCertLabels.map((c) => (
                        <span key={c} className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {requiredCertTypes.map((t) => {
                      const label = certMap[t] || t;
                      const file = tesdaCertFiles?.[t] || null;
                      return (
                        <div key={t}>
                          <DocDrop
                            label={label}
                            required
                            hint="Upload your TESDA certificate (PDF, JPG, or PNG)."
                            value={file}
                            onChange={(f) => setTesdaCertFiles((p) => ({ ...(p || {}), [t]: f }))}
                          />
                          {attempted && !file && <p className="text-xs text-red-600 -mt-3">Please upload your {label}.</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {attempted && !isFormValid && (
              <p className="text-xs text-red-600 mt-3">Please upload all required documents to continue.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <button type="button" onClick={onBackClick} className="w-full sm:w-1/3 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition">Back : Work Information</button>
          <button type="button" onClick={onNextClick} disabled={!isFormValid} aria-disabled={!isFormValid} className={`w-full sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}>Next : Set Your Price Rate</button>
        </div>
      </div>

      {isLoadingNext &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Loading next step" tabIndex={-1} autoFocus onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 animate-spin rounded-full" style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }} />
                <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} /> : <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center"><span className="font-bold text-[#008cfc]">JDK</span></div>}
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
          <div role="dialog" aria-modal="true" aria-label="Back to previous step" tabIndex={-1} autoFocus onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 animate-spin rounded-full" style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }} />
                <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} /> : <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center"><span className="font-bold text-[#008cfc]">JDK</span></div>}
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
