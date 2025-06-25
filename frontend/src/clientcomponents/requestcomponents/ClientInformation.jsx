import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Add this import to use Link for navigation
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa'; // Import social media icons

const ClientInformation = ({ title, setTitle, handleNext }) => {
  // State for personal information fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [profilePicture, setProfilePicture] = useState(null); // State for profile picture

  // Barangay options (this can be updated dynamically if you have a list)
  const barangays = [
    'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'
  ];

  // Handle profile picture upload
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(URL.createObjectURL(file)); // Create a preview URL for the uploaded image
    }
  };

  return (
    <form className="space-y-8">
      <div className="flex flex-wrap gap-8">
        {/* Left side - Personal Information Section */}
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Personal Information</h3>
          <p className="text-sm text-gray-600 mb-6">Please fill in your personal details to proceed.</p>

          {/* First Name and Last Name (Left and Right) */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Contact Number and Email Address (Left and Right) */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Contact Number"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Street and Barangay Dropdown (Left and Right) */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
              <select
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Barangay</option>
                {barangays.map((barangayName, index) => (
                  <option key={index} value={barangayName}>
                    {barangayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Address (Optional)</label>
            <textarea
              value={additionalAddress}
              onChange={(e) => setAdditionalAddress(e.target.value)}
              placeholder="Additional Address (Optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right side - Profile Picture and Social Media Section */}
        <div className="w-full md:w-1/3 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-5">Profile Picture</h3>
          <p className="text-sm text-gray-600 mb-5">Upload your profile picture (optional).</p>

          {/* Profile Picture Upload */}
          <div className="flex items-center mb-6">
            <div className="w-1/3">
              {/* Placeholder image */}
              {!profilePicture && (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-white text-xl">+</span>
                </div>
              )}
              {/* Displayv the uploaded image */}
              {profilePicture && (
                <img
                  src={profilePicture}
                  alt="Profile Preview"
                  className="w-32 h-32 rounded-full object-cover"
                />
              )}
            </div>

            <div className="-ml-5 w-2/3">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="mb-4 w-full px-4 py-3 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <h3 className="text-2xl font-semibold mb-5 mt-6">Social Media</h3>
          <p className="text-sm text-gray-600 mb-3">Please provide your social media links (optional).</p>

          {/* Facebook */}
          <div className="flex space-x-6 mb-4">
            <div className="w-full">
              <div className="flex items-center">
                <FaFacebookF className="mr-2 text-blue-600" />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Facebook Link"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Instagram */}
          <div className="flex space-x-6 mb-4">
            <div className="w-full">
              <div className="flex items-center">
                <FaInstagram className="mr-2 text-pink-500" />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram Link"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="flex space-x-6 mb-4">
            <div className="w-full">
              <div className="flex items-center">
                <FaLinkedinIn className="mr-2 text-blue-600" />
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn Link"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button Section with Back and Next Buttons */}
      <div className="flex justify-between mt-8 ml-3">
        <Link to="/clientwelcome">
          <button
            type="button"
            className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300"
          >
            Back
          </button>
        </Link>

        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300"
        >
          Next : Service Request Details
        </button>
      </div>
    </form>
  );
};

export default ClientInformation;
