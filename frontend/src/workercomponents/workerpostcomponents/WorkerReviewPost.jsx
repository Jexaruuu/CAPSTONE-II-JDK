import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function computeAge(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

const clearWorkerApplicationDrafts = () => {
  try {
    localStorage.removeItem('workerInformationForm');
    localStorage.removeItem('workerWorkInformation');
    localStorage.removeItem('workerDocuments');
    localStorage.removeItem('workerDocumentsData');
    localStorage.removeItem('workerRate');
    localStorage.removeItem('workerAgreements');
  } catch {}
};

const WorkerReviewPost = ({ handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoBroken, setLogoBroken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('workerInformationForm') || '{}'); } catch { return {}; }})();
  const savedWork = (() => { try { return JSON.parse(localStorage.getItem('workerWorkInformation') || '{}'); } catch { return {}; }})();
  const savedDocsMeta = (() => { try { return JSON.parse(localStorage.getItem('workerDocuments') || '{}'); } catch { return {}; }})();
  const savedDocsData = (() => { try { return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]'); } catch { return []; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('workerRate') || '{}'); } catch { return {}; }})();
  const savedAgree = (() => { try { return JSON.parse(localStorage.getItem('workerAgreements') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const first_name = s.first_name ?? savedInfo.firstName ?? '';
  const last_name = s.last_name ?? savedInfo.lastName ?? '';
  const birth_date = s.birth_date ?? savedInfo.birth_date ?? '';
  const age = s.age ?? savedInfo.age ?? computeAge(birth_date);
  const contact_number = s.contact_number ?? savedInfo.contactNumber ?? '';
  const email = s.email ?? savedInfo.email ?? '';
  const street = s.street ?? savedInfo.street ?? '';
  const barangay = s.barangay ?? savedInfo.barangay ?? '';
  const profile_picture = s.profile_picture ?? savedInfo.profilePicture ?? null;
  const profile_picture_name = s.profile_picture_name ?? savedInfo.profilePictureName ?? '';

  const service_types = s.service_types ?? savedWork.service_types ?? savedWork.serviceTypesSelected ?? [];
  const job_details = s.job_details ?? savedWork.job_details ?? savedWork.jobDetails ?? {};
  const years_experience = s.years_experience ?? savedWork.years_experience ?? savedWork.yearsExperience ?? '';
  const tools_provided = s.tools_provided ?? savedWork.tools_provided ?? savedWork.toolsProvided ?? '';
  const service_description = s.service_description ?? savedWork.service_description ?? savedWork.serviceDescription ?? '';

  const rate_type = s.rate_type ?? savedRate.rate_type ?? savedRate.rateType ?? '';
  const rate_from = s.rate_from ?? savedRate.rate_from ?? savedRate.rateFrom ?? '';
  const rate_to = s.rate_to ?? savedRate.rate_to ?? savedRate.rateTo ?? '';
  const rate_value = s.rate_value ?? savedRate.rate_value ?? savedRate.rateValue ?? '';

  const docsFromState = Array.isArray(s.docs) ? s.docs : [];
  const docs = docsFromState.length ? docsFromState : savedDocsData;

  const formatList = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '-';

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');
    const display = isEmpty ? emptyAs : value;
    return (
      <div className="flex items-start gap-2">
        <span className="font-bold text-gray-900 whitespace-nowrap">{label}:</span>
        <span className="text-[#008cfc]">{display}</span>
      </div>
    );
  };

  const handleBackClick = () => {
    if (typeof handleBack === 'function') handleBack();
    else navigate(-1);
  };

  const handleConfirm = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const payload = {
        worker_id: localStorage.getItem('worker_id') || null,
        first_name,
        last_name,
        email_address: email,
        contact_number,
        barangay,
        street,
        birth_date,
        age,
        facebook: savedInfo.facebook || '',
        instagram: savedInfo.instagram || '',
        linkedin: savedInfo.linkedin || '',
        profile_picture: profile_picture || null,
        profile_picture_name,
        service_types,
        job_details,
        years_experience,
        tools_provided,
        work_description: service_description,
        rate_type,
        rate_from,
        rate_to,
        rate_value,
        docs,
        metadata: {
          agree_verify: !!savedAgree.agree_verify,
          agree_tos: !!savedAgree.agree_tos,
          agree_privacy: !!savedAgree.agree_privacy
        }
      };

      const resp = await fetch(`${API_BASE}/api/workerapplication/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || 'Submission failed');
      }

      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (e) {
      setIsSubmitting(false);
      setSubmitError(String(e.message || 'Submission failed'));
    }
  };

  const handleGoDashboard = () => {
    clearWorkerApplicationDrafts();
    navigate('/workerdashboard', { state: { submitted: true }});
  };

  useEffect(() => {
    const lock = isSubmitting || showSuccess;
    if (!lock) return;

    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      window.removeEventListener('popstate', onPopState, true);
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isSubmitting, showSuccess]);

  return (
    <div className="space-y-8 pb-20">
      <div className="max-w-[1520px] mx-auto px-6 w-full">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-10">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
              <div className="text-lg md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <LabelValue label="First Name" value={first_name} />
                <LabelValue label="Last Name" value={last_name} />
                <LabelValue label="Birthdate" value={birth_date} />
                <LabelValue label="Contact Number" value={contact_number} />
                <LabelValue label="Email" value={email} />
                <LabelValue label="Address" value={street && barangay ? `${street}, ${barangay}` : street || barangay} />
                <div className="hidden md:block mt-14" />
                <div className="md:col-span-2 pt-2 mt-7">
                  <h4 className="text-2xl font-semibold">Social Media</h4>
                </div>
                <LabelValue label="Facebook" value={savedInfo.facebook || '-'} emptyAs="None" />
                <LabelValue label="Instagram" value={savedInfo.instagram || '-'} emptyAs="None" />
                <LabelValue label="LinkedIn" value={savedInfo.linkedin || '-'} emptyAs="None" />
              </div>
              <div className="md:col-span-1">
                <h4 className="text-xl font-semibold mb-2">Profile Picture</h4>
                {profile_picture ? (
                  <img
                    src={profile_picture}
                    alt="Profile"
                    className="w-40 h-40 rounded-full object-cover"
                  />
                ) : (
                  <div className="text-[#008cfc]">-</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-10">Work Details</h3>
            <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <LabelValue label="Service Types" value={formatList(service_types)} />
              <LabelValue label="Years of Experience" value={years_experience} />
              <LabelValue label="Tools Provided" value={tools_provided} />
              <div className="md:col-span-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-gray-900 whitespace-nowrap">Description:</span>
                  <span className="text-[#008cfc]">{service_description || '-'}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <h4 className="text-xl font-semibold mb-2">Selected Tasks</h4>
                <div className="text-[#008cfc]">
                  {job_details && typeof job_details === 'object' && Object.keys(job_details).length
                    ? Object.entries(job_details).map(([k, v]) => (
                        <div key={k} className="mb-1">
                          <span className="font-semibold text-gray-900 mr-1">{k}:</span>
                          <span>{formatList(v)}</span>
                        </div>
                      ))
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-10">Service Rate</h3>
            <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <LabelValue label="Rate Type" value={rate_type} />
              {rate_type === 'Hourly Rate' ? (
                <LabelValue
                  label="Rate"
                  value={rate_from && rate_to ? `₱${rate_from} - ₱${rate_to} per hour` : ''}
                />
              ) : (
                <LabelValue label="Rate" value={rate_value ? `₱${rate_value}` : ''} />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-28">
          <button
            type="button"
            onClick={handleBackClick}
            className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
          >
            Back : Step 5
          </button>

        <button
            type="button"
            onClick={handleConfirm}
            className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
          >
            Confirm Application
          </button>
        </div>

        {submitError && (
          <div className="mt-6 text-red-600 text-sm">{submitError}</div>
        )}
      </div>

      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting application"
          tabIndex={-1}
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
              <div className="text-base font-semibold text-gray-900">Submitting Application</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && !isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Application submitted"
          tabIndex={-1}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="relative w-[360px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center">
              {!logoBroken ? (
                <img
                  src="/jdklogo.png"
                  alt="JDK Homecare Logo"
                  className="w-16 h-16 object-contain"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Application Submitted!</div>
              <div className="text-sm text-gray-600">Please wait for admin approval.</div>
              <div className="text-xs text-gray-500">The details below will remain on this page for your reference.</div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300"
              >
                Go back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerReviewPost;
