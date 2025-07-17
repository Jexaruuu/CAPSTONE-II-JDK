import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import ClientNavigation from '../../clientcomponents/ClientNavigation';

const ClientReviewServiceRequest = ({ title, setTitle, handleNext }) => {
  const location = useLocation(); // Get location state
  const navigate = useNavigate(); // Initialize navigate

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  const {
    first_name,
    last_name,
    contact_number,
    email,
    street,
    barangay,
    additional_address,
    profile_picture,
    facebook,
    instagram,
    linkedin,
    service_type,
    service_task,
    preferred_date,
    preferred_time,
    is_urgent,
    tools_provided,
    service_description,
    rate_type,
    rate_from,
    rate_to,
    rate_value
  } = location.state || {}; // Destructure the data passed from previous steps

  return (
    <div className="space-y-8 pb-20">
      <ClientNavigation />
      <div className="max-w-[1535px] mx-auto flex flex-col md:flex-row gap-8">
        {/* Left Section */}
        <div className="w-full md:w-2/3 bg-white p-6">
          <div className="mb-8">
            <h3 className="text-3xl font-semibold mb-6">Service Request Review</h3>
            <p className="text-lg text-gray-600 mb-6">Please review your service request details below before submitting.</p>
            <div className="mb-6">
              <h4 className="text-2xl font-medium text-gray-700 mb-4">Personal Information</h4>
              <div className="text-lg text-gray-600">
                <p><strong>First Name: </strong>{first_name}</p>
                <p><strong>Last Name: </strong>{last_name}</p>
                <p><strong>Contact Number: </strong>{contact_number}</p>
                <p><strong>Email: </strong>{email}</p>
                <p><strong>Address: </strong>{street}, {barangay}</p>
                {additional_address && <p><strong>Additional Address: </strong>{additional_address}</p>}
                {profile_picture && <img src={profile_picture} alt="Profile" className="w-40 h-40 rounded-full object-cover mt-4" />}
                {facebook && <p><strong>Facebook: </strong>{facebook}</p>}
                {instagram && <p><strong>Instagram: </strong>{instagram}</p>}
                {linkedin && <p><strong>LinkedIn: </strong>{linkedin}</p>}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-2xl font-medium text-gray-700 mb-4">Service Request Details</h4>
              <div className="text-lg text-gray-600">
                <p><strong>Service Type: </strong>{service_type}</p>
                <p><strong>Service Task: </strong>{service_task}</p>
                <p><strong>Preferred Date: </strong>{preferred_date}</p>
                <p><strong>Preferred Time: </strong>{preferred_time}</p>
                <p><strong>Urgent: </strong>{is_urgent}</p>
                <p><strong>Tools Provided: </strong>{tools_provided}</p>
                <p><strong>Description: </strong>{service_description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="w-full md:w-1/3 bg-white p-6 mt-28">
          <h4 className="text-2xl font-medium text-gray-700 mb-6">Service Rate</h4>
          <div className="text-lg text-gray-600">
            <p><strong>Rate Type: </strong>{rate_type}</p>
            {rate_type === 'Hourly Rate' && (
              <p><strong>Rate: </strong>₱{rate_from} - ₱{rate_to} per hour</p>
            )}
            {rate_type === 'By the Job Rate' && (
              <p><strong>Rate: </strong>₱{rate_value}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="max-w-[1500px] mx-auto flex justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300 -mt-4"
        >
          Back
        </button>

        <button
          type="button"
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300 -mt-4"
        >
          Confirm Service Request
        </button>
      </div>
    </div>
  );
};

export default ClientReviewServiceRequest;
