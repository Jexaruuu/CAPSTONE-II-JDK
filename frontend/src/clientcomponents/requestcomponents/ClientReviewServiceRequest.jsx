import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ClientReviewServiceRequest = ({ title, setTitle, handleNext, handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleBackClick = () => {
    if (typeof handleBack === 'function') {
      handleBack();
    } else {
      navigate(-1);
    }
  };

  const savedInfo = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
  const savedDetails = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
  const savedRate = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();

  const s = location.state || {};

  const {
    first_name = savedInfo.firstName,
    last_name = savedInfo.lastName,
    contact_number = savedInfo.contactNumber,
    email = savedInfo.email,
    street = savedInfo.street,
    barangay = savedInfo.barangay,
    additional_address = savedInfo.additionalAddress,
    profile_picture = savedInfo.profilePicture,
    facebook = savedInfo.facebook,
    instagram = savedInfo.instagram,
    linkedin = savedInfo.linkedin,
    service_type = savedDetails.serviceType,
    service_task = savedDetails.serviceTask,
    preferred_date = savedDetails.preferredDate,
    preferred_time = savedDetails.preferredTime,
    is_urgent = savedDetails.isUrgent,
    tools_provided = savedDetails.toolsProvided,
    service_description = savedDetails.serviceDescription,
    rate_type = savedRate.rateType,
    rate_from = savedRate.rateFrom,
    rate_to = savedRate.rateTo,
    rate_value = savedRate.rateValue
  } = s;

  // Helper: "HH:MM" -> "h:MM AM/PM"
  const formatTime12h = (t) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return t || '-';
    const [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mm} ${suffix}`;
  };

  const preferred_time_display = formatTime12h(preferred_time);

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

  const isEmbeddedInStepper = location.pathname.includes('/clientpostrequest');

  const handleConfirm = async () => {
    try {
      setSubmitError('');
      setIsSubmitting(true);

      // Pull latest drafts
      const infoDraft = (() => { try { return JSON.parse(localStorage.getItem('clientInformationForm') || '{}'); } catch { return {}; }})();
      const detailsDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRequestDetails') || '{}'); } catch { return {}; }})();
      const rateDraft = (() => { try { return JSON.parse(localStorage.getItem('clientServiceRate') || '{}'); } catch { return {}; }})();

      const payload = {
        info: {
          firstName: infoDraft.firstName,
          lastName: infoDraft.lastName,
          contactNumber: infoDraft.contactNumber,
          email: infoDraft.email,
          street: infoDraft.street,
          barangay: infoDraft.barangay,
          additionalAddress: infoDraft.additionalAddress,
          facebook: infoDraft.facebook,
          instagram: infoDraft.instagram,
          linkedin: infoDraft.linkedin,
          profilePicture: infoDraft.profilePicture,        // data URL
          profilePictureName: infoDraft.profilePictureName // filename (optional)
        },
        details: {
          serviceType: detailsDraft.serviceType,
          serviceTask: detailsDraft.serviceTask,
          preferredDate: detailsDraft.preferredDate,
          preferredTime: detailsDraft.preferredTime,
          isUrgent: detailsDraft.isUrgent,
          toolsProvided: detailsDraft.toolsProvided,
          serviceDescription: detailsDraft.serviceDescription,
          image: detailsDraft.image,       // data URL
          imageName: detailsDraft.imageName
        },
        rate: {
          rateType: rateDraft.rateType,
          rateFrom: rateDraft.rateFrom,
          rateTo: rateDraft.rateTo,
          rateValue: rateDraft.rateValue
        }
      };

      const res = await axios.post(`${API_BASE}/api/clientservicerequest/submit`, payload, {
        withCredentials: true
      });

      // Clear drafts on success
      try {
        localStorage.removeItem('clientInformationForm');
        localStorage.removeItem('clientServiceRequestDetails');
        localStorage.removeItem('clientServiceRate');
      } catch {}

      // Redirect to dashboard (or success page)
      navigate('/clientdashboard', {
        state: { submitted: true, request_group_id: res?.data?.request_group_id }
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="max-w-[1520px] mx-auto px-6 w-full">
        {!isEmbeddedInStepper && (
          <>
            <div className="flex justify-start mb-6">
              <div className="text-lg font-extralight">4 of 4 | Post a Service Request</div>
            </div>
            <h2 className="text-3xl font-bold mb-6">Step 4: Review and Submit</h2>
          </>
        )}

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-4">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
              <div className="text-lg md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <LabelValue label="First Name" value={first_name} />
                <LabelValue label="Last Name" value={last_name} />
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

                {/* Social Media */}
                <div className="md:col-span-2 pt-2 mt-7">
                  <h4 className="text-2xl font-semibold">Social Media</h4>
                </div>
                <LabelValue label="Facebook" value={facebook} emptyAs="None" />
                <LabelValue label="Instagram" value={instagram} emptyAs="None" />
                <LabelValue label="LinkedIn" value={linkedin} emptyAs="None" />
              </div>

              {/* Profile picture */}
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

          {/* Service Request Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-4">Service Request Details</h3>
            <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <LabelValue label="Service Type" value={service_type} />
              <LabelValue label="Service Task" value={service_task} />
              <LabelValue label="Preferred Date" value={preferred_date} />
              <LabelValue label="Preferred Time" value={preferred_time_display} />
              <LabelValue label="Urgent" value={is_urgent} />
              <LabelValue label="Tools Provided" value={tools_provided} />
              <div className="md:col-span-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-gray-900 whitespace-nowrap">Description:</span>
                  <span className="text-[#008cfc]">{service_description || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Rate */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-2xl font-semibold mb-4">Service Rate</h3>
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

        {/* Errors */}
        {submitError ? (
          <div className="mt-4 text-red-600 text-sm">{submitError}</div>
        ) : null}

        {/* Actions */}
        <div className="flex justify-between mt-28">
          <button
            type="button"
            onClick={handleBackClick}
            className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
          >
            Back : Step 3
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
          >
            Confirm Service Request
          </button>
        </div>
      </div>

      {/* Submission overlay */}
      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting service request"
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
              <div className="text-base font-semibold text-gray-900">Submitting Request</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReviewServiceRequest;
