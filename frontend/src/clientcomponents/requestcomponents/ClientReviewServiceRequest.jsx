import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ClientReviewServiceRequest = ({ title, setTitle, handleNext, handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Success overlay & ID (approval notice)
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestGroupId, setRequestGroupId] = useState(null);

  // 🔒 Lock page scroll when loading or success overlay is visible
  useEffect(() => {
    const lock = isSubmitting || showSuccess;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    if (lock) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    }

    return () => {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    };
  }, [isSubmitting, showSuccess]);

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

      // Keep your original nested payload (not used by API, but we won't remove it)
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
          profilePicture: infoDraft.profilePicture,
          profilePictureName: infoDraft.profilePictureName
        },
        details: {
          serviceType: detailsDraft.serviceType,
          serviceTask: detailsDraft.serviceTask,
          preferredDate: detailsDraft.preferredDate,
          preferredTime: detailsDraft.preferredTime,
          isUrgent: detailsDraft.isUrgent,
          toolsProvided: detailsDraft.toolsProvided,
          serviceDescription: detailsDraft.serviceDescription,
          image: detailsDraft.image,
          imageName: detailsDraft.imageName
        },
        rate: {
          rateType: rateDraft.rateType,
          rateFrom: rateDraft.rateFrom,
          rateTo: rateDraft.rateTo,
          rateValue: rateDraft.rateValue
        }
      };

      // Build the flat payload that your backend expects
      const clientId =
        infoDraft.client_id ||
        infoDraft.clientId ||
        localStorage.getItem('client_id') ||
        localStorage.getItem('auth_uid') ||
        null;

      // NOTE: if clientId is null, backend will resolve using email_address

      const addressCombined = payload.info?.street
        ? (payload.info.additionalAddress
            ? `${payload.info.street}, ${payload.info.additionalAddress}`
            : payload.info.street)
        : payload.info?.additionalAddress || null;

      const apiPayload = {
        client_id: clientId,

        // client info
        first_name: payload.info.firstName,
        last_name: payload.info.lastName,
        email_address: payload.info.email,
        barangay: payload.info.barangay,
        address: addressCombined,

        // details
        service_type: payload.details.serviceType,
        service_task: payload.details.serviceTask,
        description: payload.details.serviceDescription || 'No description provided',
        preferred_date: payload.details.preferredDate,
        preferred_time: payload.details.preferredTime,
        is_urgent: !!payload.details.isUrgent,
        tools_provided: !!payload.details.toolsProvided,

        // rate
        rate_type: payload.rate.rateType,
        rate_from: payload.rate.rateFrom,
        rate_to: payload.rate.rateTo,
        rate_value: payload.rate.rateValue,

        // optional
        attachments: payload.details.image ? [payload.details.image] : [],
        metadata: {
          contact_number: payload.info.contactNumber,
          facebook: payload.info.facebook,
          instagram: payload.info.instagram,
          linkedin: payload.info.linkedin,
          profile_picture: payload.info.profilePicture,
          profile_picture_name: payload.info.profilePictureName,
          image_name: payload.details.imageName,
        },
      };

      // ✅ Correct plural path
      const res = await axios.post(
        `${API_BASE}/api/clientservicerequests/submit`,
        apiPayload,
        { withCredentials: true }
      );

      // ⛔ Do NOT clear localStorage here.
      // Keep details visible under the approval notification.

      // ✅ Read nested "request.request_group_id" from server response
      setRequestGroupId(res?.data?.request?.request_group_id || null);
      setShowSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoDashboard = () => {
    // ✅ Now clear drafts only when leaving the page
    try {
      localStorage.removeItem('clientInformationForm');
      localStorage.removeItem('clientServiceRequestDetails');
      localStorage.removeItem('clientServiceRate');
    } catch {}
    navigate('/clientdashboard', {
      state: { submitted: true, request_group_id: requestGroupId }
    });
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
            <h3 className="text-2xl font-semibold mb-10">Personal Information</h3>

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
            <h3 className="text-2xl font-semibold mb-10">Service Request Details</h3>
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

      {/* Success / Approval notice overlay */}
      {showSuccess && !isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Request submitted"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
              <div className="text-lg font-semibold text-gray-900">Request Submitted!</div>
              <div className="text-sm text-gray-600">
                Please wait for admin approval within <span className="font-medium">1–2 hours</span>.
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

export default ClientReviewServiceRequest;
