import React, { useState } from 'react';
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

  // Barangay options (this can be updated dynamically if you have a list)
  const barangays = [
    'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'
  ];

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

        {/* Right side - Social Media Section */}
        <div className="w-full md:w-1/3 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-5">Social Media</h3>
          <p className="text-sm text-gray-600 mb-7">Please provide your social media links (optional).</p>

          {/* Facebook */}
          <div className="flex space-x-6 mb-4 ">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
              <div className="flex items-center">
                <FaFacebookF className="mr-2 text-blue-600" />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Facebook Link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Instagram */}
          <div className="flex space-x-6 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
              <div className="flex items-center">
                <FaInstagram className="mr-2 text-pink-500" />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram Link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="flex space-x-6 mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
              <div className="flex items-center">
                <FaLinkedinIn className="mr-2 text-blue-600" />
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn Link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button Section with Back and Next Buttons */}
      <div className="flex justify-between mt-8 ml-3">
        <button
          type="button"
          onClick={() => console.log('Back Button Clicked')}  
          className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition duration-300"
        >
          Next : Service Request Details
        </button>
      </div>
    </form>
  );
};

export default ClientInformation;
