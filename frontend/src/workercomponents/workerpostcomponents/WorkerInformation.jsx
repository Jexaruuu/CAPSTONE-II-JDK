import React, { useState, useEffect, useRef } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const WorkerInformation = ({ title, setTitle, handleNext, onCollect }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  const barangays = [
    'Alangilan', 'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa',
    'Granada', 'Handumanan', 'Lopez Jaena', 'Mandalagan', 'Mansilingan',
    'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag',
    'Taculing', 'Tangub', 'Villa Esperanza'
  ];

  const sortedBarangays = barangays.sort();

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(URL.createObjectURL(file));
      setProfileFile(file);
    }
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const proceed = () => {
    const draft = {
      firstName,
      lastName,
      birth_date: birthDate,
      contactNumber,
      email,
      barangay,
      street,
      additionalAddress,
      facebook,
      instagram,
      linkedin,
      profilePicture,
      profilePictureName: profileFile?.name || null
    };
    try {
      localStorage.setItem('workerInformationForm', JSON.stringify(draft));
    } catch {}
    onCollect?.({
      auth_uid: localStorage.getItem('auth_uid') || '',
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      contact_number: contactNumber,
      email_address: email,
      barangay,
      additional_address: additionalAddress,
      facebook,
      instagram,
      linkedin,
      profile_picture: profileFile || null
    });
    handleNext?.();
  };

  return (
    <form className="space-y-8">
      <div className="flex flex-wrap gap-8">
        <div className="w-full md:w-2/4 bg-white p-6 -ml-3 mt-0.5">
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

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <div className="w-8 h-5 mr-2 rounded-md">
                  <img
                    src="philippines.png"
                    alt="Philippine Flag"
                    className="w-full h-full object-contain rounded-md ml-1"
                  />
                </div>
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
          </div>

          <div className="flex space-x-6 mb-4">
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

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                >
                  {barangay || 'Select Barangay'}
                </button>
                {showDropdown && (
                  <div
                    className="absolute bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto mt-2"
                    style={{
                      top: '100%',
                      left: '0',
                      zIndex: 10,
                      width: 'calc(100% + 250px)',
                    }}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {sortedBarangays.map((barangayName, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setBarangay(barangayName);
                            setShowDropdown(false);
                          }}
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
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Address (Landmark etc.)</label>
            <textarea
              value={additionalAddress}
              onChange={(e) => setAdditionalAddress(e.target.value)}
              placeholder="Additional Address (Optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
            />
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-5">Profile Picture</h3>
          <p className="text-sm text-gray-600 mb-5">Upload your profile picture.</p>

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
          <p className="text-sm text-gray-600 mb-3">Please provide your social media links (For reference only).</p>

          <div className="flex space-x-4 mb-3.5">
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

          <div className="flex space-x-4 mb-3.5">
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

          <div className="flex space-x-4 mb-3.5">
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
        <Link to="/workerdashboard">
          <button
            type="button"
            className="px-8 py-3 bg-gray-300 text-white rounded-md shadow-md hover:bg-gray-400 transition duration-300"
          >
            Back
          </button>
        </Link>
        <button
          type="button"
          onClick={proceed}
          className="px-8 py-3 bg-[#008cfc] text-white rounded-md shadow-md hover:bg-blue-700 transition duration-300"
        >
          Next : Work Information
        </button>
      </div>
    </form>
  );
};

export default WorkerInformation;
