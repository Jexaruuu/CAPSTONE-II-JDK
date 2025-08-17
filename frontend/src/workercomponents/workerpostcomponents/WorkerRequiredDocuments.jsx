import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const boxBase =
  'flex items-center justify-center w-full h-40 border-2 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition';
const boxInner =
  'text-center text-sm text-gray-600';

/** Reusable dropzone */
function DocDrop({
  label,
  hint,
  required = false,
  value,
  onChange,
}) {
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
        setError(msg);
        onChange(null, msg);
        return;
      }
      if (file.size > MAX_BYTES) {
        const msg = 'File too large. Max size is 5MB.';
        setError(msg);
        onChange(null, msg);
        return;
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleChange}
        />
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

const WorkerRequiredDocuments = ({ title, setTitle, handleNext, handleBack }) => {
  // State for each required document
  const [primaryFront, setPrimaryFront] = useState(null);
  const [primaryBack, setPrimaryBack] = useState(null);
  const [secondaryId, setSecondaryId] = useState(null);
  const [nbi, setNbi] = useState(null);
  const [address, setAddress] = useState(null);
  const [medical, setMedical] = useState(null);
  const [certs, setCerts] = useState(null);

  // Optional: simple required check for Primary ID (Front)
  const canProceed = !!primaryFront;

  return (
    <form className="space-y-8">
      {/* Main container that aligns with Step 3 */}
      <div className="w-full max-w-[1535px] mx-auto px-6">
        
        {/* Header aligned with Step 3 */}
        <div>
          <h3 className="text-2xl font-semibold -ml-3 mt-12">Worker Documents</h3>
        </div>

        {/* Two-column grid, certificates spans both */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <DocDrop
            label="Primary ID (Front)"
            required
            hint="UMID, Passport, Driver’s License, etc."
            value={primaryFront}
            onChange={setPrimaryFront}
          />
          <DocDrop
            label="Primary ID (Back)"
            hint="UMID, Passport, Driver’s License, etc."
            value={primaryBack}
            onChange={setPrimaryBack}
          />
          <DocDrop
            label="Secondary ID"
            hint="UMID, Passport, Driver’s License, etc."
            value={secondaryId}
            onChange={setSecondaryId}
          />
          <DocDrop
            label="NBI/Police Clearance"
            hint="Barangay Certificate also accepted"
            value={nbi}
            onChange={setNbi}
          />
          <DocDrop
            label="Proof of Address"
            hint="Barangay Certificate, Utility Bill"
            value={address}
            onChange={setAddress}
          />
          <DocDrop
            label="Medical Certificate"
            hint="Latest medical/fit-to-work certificate"
            value={medical}
            onChange={setMedical}
          />

          {/* Certificates full width */}
          <div className="md:col-span-2">
            <DocDrop
              label="Certificates"
              hint="TESDA, Training Certificates, etc."
              value={certs}
              onChange={setCerts}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
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
    onClick={handleNext}
    className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 mt-2.5"
  >
    Next : Set Your Price Rate
  </button>
</div>

      </div>
    </form>
  );
};

export default WorkerRequiredDocuments;
