import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { compressImageFileToDataURL } from '../../utils/imageCompression'; // align with client

const STORAGE_KEY = 'workerInformationForm';

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
  const [profilePicture, setProfilePicture] = useState(null);     // DataURL for preview + persist
  const [profileFile, setProfileFile] = useState(null);           // original File for onCollect
  const [profilePictureName, setProfilePictureName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // client-like flags
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);

  const barangays = [
    'Alangilan','Alijis','Banago','Bata','Cabug','Estefania','Felisa',
    'Granada','Handumanan','Lopez Jaena','Mandalagan','Mansilingan',
    'Montevista','Pahanocoy','Punta Taytay','Singcang-Airport','Sum-ag',
    'Taculing','Tangub','Villa Esperanza'
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  const isContactValid = contactNumber.replace(/\D/g, '').length === 10;

  // Minimal, practical validation (keeps optional "Additional Address" + profile pic optional)
  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    birthDate &&
    validateEmail(email) &&
    isContactValid &&
    barangay.trim() &&
    street.trim();

  // Compress to DataURL like client, but keep original File for onCollect
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePictureName(file.name);
    try {
      const compressed = await compressImageFileToDataURL(file, 1600, 1600, 0.85, 2 * 1024 * 1024);
      setProfilePicture(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setProfilePicture(reader.result);
      reader.readAsDataURL(file);
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
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  // hydrate like client
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setBirthDate(d.birth_date || '');
        setContactNumber(d.contactNumber || '');
        setEmail(d.email || '');
        setBarangay(d.barangay || '');
        setStreet(d.street || '');
        setAdditionalAddress(d.additionalAddress || '');
        setFacebook(d.facebook || '');
        setInstagram(d.instagram || '');
        setLinkedin(d.linkedin || '');
        setProfilePicture(d.profilePicture || null);
        setProfilePictureName(d.profilePictureName || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  // lock from account (optional; mirrors client behavior if values exist)
  useEffect(() => {
    const authFirst = localStorage.getItem('first_name') || '';
    const authLast  = localStorage.getItem('last_name') || '';
    if (authFirst) setFirstName(authFirst);
    if (authLast)  setLastName(authLast);
    if (authFirst && authLast) setNameLocked(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const authEmail = localStorage.getItem('email_address') || localStorage.getItem('email') || '';
    if (authEmail && validateEmail(authEmail)) {
      setEmail(authEmail);
      setEmailLocked(true);
    }
  }, [hydrated]);

  // autosave like client
  useEffect(() => {
    if (!hydrated) return;
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
      profilePicture,       // DataURL
      profilePictureName,   // filename
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }, [
    hydrated, firstName, lastName, birthDate, contactNumber, email, barangay,
    street, additionalAddress, facebook, instagram, linkedin, profilePicture, profilePictureName
  ]);

  // lock back/keys/scroll while loading
  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

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
      profilePicture,       // keep DataURL preview
      profilePictureName
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}

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

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    setIsLoadingNext(true);
    setTimeout(() => { proceed(); }, 2000);
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
                onChange={(e) => { if (!nameLocked) setFirstName(e.target.value); }}
                placeholder="First Name"
                readOnly={nameLocked}
                aria-readonly={nameLocked}
                title={nameLocked ? 'This name comes from your account' : undefined}
                className={`w-full px-4 py-3 border ${attempted && !firstName.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                aria-invalid={attempted && !firstName.trim()}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { if (!nameLocked) setLastName(e.target.value); }}
                placeholder="Last Name"
                readOnly={nameLocked}
                aria-readonly={nameLocked}
                title={nameLocked ? 'This name comes from your account' : undefined}
                className={`w-full px-4 py-3 border ${attempted && !lastName.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                aria-invalid={attempted && !lastName.trim()}
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
                className={`w-full px-4 py-3 border ${attempted && !birthDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
                aria-invalid={attempted && !birthDate}
              />
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <div className={`flex items-center border rounded-md ${attempted && !isContactValid ? 'border-red-500' : 'border-gray-300'}`}>
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
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setContactNumber(v);
                  }}
                  placeholder="Mobile Number"
                  className="w-full px-4 py-3 border-l border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-md"
                  required
                  aria-invalid={attempted && !isContactValid}
                />
              </div>
              {attempted && !isContactValid && (
                <p className="text-xs text-red-600 mt-1">Enter a 10-digit PH mobile number (e.g., 9XXXXXXXXX).</p>
              )}
            </div>
          </div>

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { if (!emailLocked) setEmail(e.target.value); }}
                placeholder="Email Address"
                readOnly={emailLocked}
                aria-readonly={emailLocked}
                title={emailLocked ? 'This email comes from your account' : undefined}
                className={`w-full px-4 py-3 border ${attempted && !validateEmail(email) ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${emailLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                aria-invalid={attempted && !validateEmail(email)}
              />
              {attempted && !validateEmail(email) && (
                <p className="text-xs text-red-600 mt-1">Enter a valid email address.</p>
              )}
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className={`w-full px-4 py-3 border ${attempted && !barangay.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left`}
                  aria-expanded={showDropdown}
                  aria-haspopup="listbox"
                >
                  {barangay || 'Select Barangay'}
                </button>
                {showDropdown && (
                  <div
                    className="absolute bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto mt-2"
                    style={{ top: '100%', left: 0, zIndex: 10, width: 'calc(100% + 250px)' }}
                    role="listbox"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {sortedBarangays.map((barangayName, index) => (
                        <div
                          key={index}
                          onClick={() => { setBarangay(barangayName); setShowDropdown(false); }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          role="option"
                          aria-selected={barangayName === barangay}
                        >
                          {barangayName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {attempted && !barangay.trim() && (
                <p className="text-xs text-red-600 mt-1">Please select your barangay.</p>
              )}
            </div>
          </div>

          <div className="flex space-x-6 mb-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="House No. and Street"
                className={`w-full px-4 py-3 border ${attempted && !street.trim() ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
                aria-invalid={attempted && !street.trim()}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Address (Landmark etc.)</label>
              <textarea
                value={additionalAddress}
                onChange={(e) => setAdditionalAddress(e.target.value)}
                placeholder="Additional Address (Optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-md mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-white p-6">
          <h3 className="text-2xl font-semibold mb-5">Profile Picture</h3>
          <p className="text-sm text-gray-600 mb-5">Upload your profile picture.</p>

          <div className="flex items-center mb-6">
            <div className="w-1/3">
              {!profilePicture ? (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-white text-xl">+</span>
                </div>
              ) : (
                <img src={profilePicture} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover" />
              )}
            </div>

            <div className="-ml-5 w-2/3">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="mb-1 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {profilePictureName && (
                <p className="text-xs text-gray-600 truncate">Selected: {profilePictureName}</p>
              )}
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
          onClick={onNextClick}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
          className={`px-8 py-3 rounded-md shadow-md transition duration-300 ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
        >
          Next : Work Information
        </button>
      </div>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
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
                style={{ borderWidth: '10px', borderStyle: 'solid', borderColor: '#008cfc22', borderTopColor: '#008cfc', borderRadius: '9999px' }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-base font-semibold text-gray-900">Preparing Step 2</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default WorkerInformation;
