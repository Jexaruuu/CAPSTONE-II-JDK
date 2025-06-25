import React, { useState, useEffect, useRef } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa'; // Import social media icons
import { Link } from 'react-router-dom';

const ClientInformation = ({ title, setTitle, handleNext }) => {
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
  const [profilePicture, setProfilePicture] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false); // State for toggling the dropdown visibility

  const dropdownRef = useRef(null); // Reference for the dropdown container

  // Barangay options, manually added or imported
  const barangays = [
    'Alangilan', 'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa',
    'Granada', 'Handumanan', 'Lopez Jaena', 'Mandalagan', 'Mansilingan', 
    'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag', 
    'Taculing', 'Tangub', 'Villa Esperanza'
  ];

  // Sort the barangay list alphabetically
  const sortedBarangays = barangays.sort();

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  // Close the dropdown when clicking outside of it
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  // Set up event listener to handle clicks outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside); // Listen for click outside
    return () => {
      document.removeEventListener('mousedown', handleClickOutside); // Cleanup event listener on unmount
    };
  }, []);

  return (
    <form className="space-y-8">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3">
          <h3 className="text-2xl font-semibold mb-6">Personal Information</h3>
          <p className="text-sm text-gray-600 mb-6">Please fill in your personal details to proceed.</p>

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

          {/* Contact Number with Flag and +63 */}
          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <div className="flex items-center border border-gray-300 rounded-md">
                {/* Philippine Flag */}
                <div className="w-8 h-5 mr-2 rounded-md">
                  <img 
                    src="philippines.png" 
                    alt="Philippine Flag" 
                    className="w-full h-full object-contain rounded-md ml-1" 
                  />
                </div>
                {/* Country Code +63 */}
                <span className="text-gray-700 text-sm mr-2">+63</span>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Mobile Number"
                  className="w-full px-4 py-3 border-l border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-md"
                  required
                />
              </div>
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

         <div className="flex space-x-6 mb-4">
  {/* Barangay Field on the Left */}
  <div className="w-1/2">
    <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        {barangay || 'Select Barangay'}
             <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 ml-36 inline-block"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
      </button>
      {showDropdown && (
        <div
          className="absolute bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto mt-2"
          style={{
            top: '100%',
            left: '0',
            zIndex: 10,
            width: 'calc(100% + 250px)', // Add a little extra width to the dropdown
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {sortedBarangays.map((barangayName, index) => (
              <div
                key={index}
                onClick={() => setBarangay(barangayName)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {barangayName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Street Field on the Right */}
  <div className="w-1/2">
    <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
    <input
      type="text"
      value={street}
      onChange={(e) => setStreet(e.target.value)}
      placeholder="House No. and Street"
      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
</div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Address (Landmark etc.)</label>
            <textarea
              value={additionalAddress}
              onChange={(e) => setAdditionalAddress(e.target.value)}
              placeholder="Additional Address (Optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-5">Profile Picture</h3>
          <p className="text-sm text-gray-600 mb-5">Upload your profile picture (optional).</p>

          <div className="flex items-center mb-6">
            <div className="w-1/3">
              {!profilePicture && (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-white text-xl">+</span>
                </div>
              )}

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
