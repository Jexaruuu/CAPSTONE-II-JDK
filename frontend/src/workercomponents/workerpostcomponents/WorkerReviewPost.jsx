import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const WorkerReviewPost = ({ handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoBroken, setLogoBroken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('workerInformationForm') || '{}'); } catch { return {}; }})();
  const savedWork = (() => { try { return JSON.parse(localStorage.getItem('workerWorkInformation') || '{}'); } catch { return {}; }})();
  const savedDocs = (() => { try { return JSON.parse(localStorage.getItem('workerDocuments') || '{}'); } catch { return {}; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('workerRate') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const {
    first_name = savedInfo.firstName,
    last_name = savedInfo.lastName,
    birth_date = savedInfo.birthDate,
    contact_number = savedInfo.contactNumber,
    email = savedInfo.email,
    street = savedInfo.street,
    barangay = savedInfo.barangay,
    additional_address = savedInfo.additionalAddress,
    profile_picture = savedInfo.profilePicture,
    facebook = savedInfo.facebook,
    instagram = savedInfo.instagram,
    linkedin = savedInfo.linkedin,
    service_types = savedWork.serviceTypesSelected,
    job_details = savedWork.jobDetails,
    years_experience = savedWork.yearsExperience,
    tools_provided = savedWork.toolsProvided,
    service_description = savedWork.serviceDescription,
    rate_type = savedRate.rateType,
    rate_from = savedRate.rateFrom,
    rate_to = savedRate.rateTo,
    rate_value = savedRate.rateValue
  } = s;

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
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 800);
  };

  const handleGoDashboard = () => {
    navigate('/workerdashboard', { state: { submitted: true }});
  };

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
                <LabelValue
                  label="Address"
                  value={street && barangay ? `${street}, ${barangay}` : street || barangay}
                />
                {additional_address ? (
                  <LabelValue label="Additional Address" value={additional_address} />
                ) : (
                  <div className="hidden md:block mt-14" />
                )}
                <div className="md:col-span-2 pt-2 mt-7">
                  <h4 className="text-2xl font-semibold">Social Media</h4>
                </div>
                <LabelValue label="Facebook" value={facebook} emptyAs="None" />
                <LabelValue label="Instagram" value={instagram} emptyAs="None" />
                <LabelValue label="LinkedIn" value={linkedin} emptyAs="None" />
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
              <div className="text-sm text-gray-600">
                Please wait for admin approval.
              </div>
              <div className="text-xs text-gray-500">
                The details below will remain on this page for your reference.
              </div>
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
