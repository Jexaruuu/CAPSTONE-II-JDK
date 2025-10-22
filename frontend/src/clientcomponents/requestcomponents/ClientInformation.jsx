import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { compressImageFileToDataURL } from '../../utils/imageCompression';
import ClientNavigation from '../../clientcomponents/ClientNavigation';

const STORAGE_KEY = 'clientInformationForm';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ClientInformation = ({ title, setTitle, handleNext }) => {
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail]           = useState('');
  const [street, setStreet]         = useState('');
  const [barangay, setBarangay]     = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureName, setProfilePictureName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attempted, setAttempted]   = useState(false);
  const [hydrated, setHydrated]     = useState(false);
  const dropdownRef = useRef(null);
  const [nameLocked, setNameLocked]   = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [contactLocked, setContactLocked] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try { 
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); 
    } catch {}
  };

  const barangays = [
    'Alangilan', 'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa',
    'Granada', 'Handumanan', 'Lopez Jaena', 'Mandalagan', 'Mansilingan',
    'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag',
    'Taculing', 'Tangub', 'Villa Esperanza'
  ];

  const sortedBarangays = useMemo(() => [...barangays].sort(), []);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const allowedPHPrefixes = useMemo(
    () =>
      new Set([
        '905','906','907','908','909','910','912','913','914','915','916','917','918','919',
        '920','921','922','923','925','926','927','928','929',
        '930','931','932','933','934','935','936','937','938','939',
        '940','941','942','943','944','945','946','947','948','949',
        '950','951','952','953','954','955','956','957','958','959',
        '960','961','962','963','964','965','966','967','968','969',
        '970','971','972','973','974','975','976','977','978','979',
        '980','981','982','983','984','985','986','987','988','989',
        '990','991','992','993','994','995','996','997','998','999'
      ]),
    []
  );

  const isTriviallyFake = (d) => {
    if (/^(\d)\1{9}$/.test(d)) return true;
    const asc = '0123456789';
    const desc = '9876543210';
    if (('9' + d).includes(asc) || ('9' + d).includes(desc)) return true;
    const uniq = new Set(d.split(''));
    return uniq.size < 4;
  };

  const isValidPHMobile = (d) => {
    if (d.length !== 10) return false;
    if (d[0] !== '9') return false;
    if (isTriviallyFake(d)) return false;
    const p = d.slice(0, 3);
    return allowedPHPrefixes.has(p);
  };

  const isContactValid = isValidPHMobile(contactNumber);

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    validateEmail(email) &&
    isContactValid &&
    street.trim() &&
    barangay.trim() &&
    additionalAddress.trim() &&
    !!profilePicture;

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePictureName(file.name);
    try {
      const compressed = await compressImageFileToDataURL(file, 1600, 1600, 0.85, 2 * 1024 * 1024);
      setProfilePicture(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => { setProfilePicture(reader.result); };
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setContactNumber(data.contactNumber || '');
        setEmail(data.email || '');
        setStreet(data.street || '');
        setBarangay(data.barangay || '');
        setAdditionalAddress(data.additionalAddress || '');
        setProfilePicture(data.profilePicture || null);
        setProfilePictureName(data.profilePictureName || '');
      } catch {}
    }
    setHydrated(true);
  }, []);

  const scanForEmailInObject = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 3) return '';
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && validateEmail(val)) return val;
      if (val && typeof val === 'object') {
        const found = scanForEmailInObject(val, depth + 1);
        if (found) return found;
      }
    }
    return '';
  };

  const findAuthEmail = () => {
    const candidateKeys = [
      'email_address', 'email', 'user_email', 'client_email', 'account_email'
    ];
    for (const k of candidateKeys) {
      const v = localStorage.getItem(k);
      if (v && validateEmail(v)) return v;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const raw = localStorage.getItem(key) || '';
        if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
          const parsed = JSON.parse(raw);
          const found = scanForEmailInObject(parsed);
          if (found) return found;
        }
        if (validateEmail(raw)) return raw;
      } catch {}
    }
    return '';
  };

  useEffect(() => {
    const authFirst = localStorage.getItem('first_name') || '';
    const authLast  = localStorage.getItem('last_name') || '';
    if (authFirst) setFirstName(authFirst);
    if (authLast)  setLastName(authLast);
    if (authFirst && authLast) setNameLocked(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const authEmail = findAuthEmail();
    if (authEmail) {
      setEmail(authEmail);
      setEmailLocked(true);
    }
  }, [hydrated]);

  const buildAppU = () => {
    try {
      const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
      const e = a.email || localStorage.getItem('client_email') || localStorage.getItem('email_address') || localStorage.getItem('email') || '';
      return encodeURIComponent(JSON.stringify({ r: 'client', e, au }));
    } catch { return ''; }
  };
  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    if (!hydrated) return;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/clients/me`, { withCredentials: true, headers: headersWithU });
        const fn = String(data?.first_name || '').trim();
        const ln = String(data?.last_name || '').trim();
        const em = String(data?.email_address || '').trim();
        const ph = String(data?.phone || '').trim();
        const cid = data?.id || null;
        const au = data?.auth_uid || null;
        if (fn) setFirstName(fn);
        if (ln) setLastName(ln);
        if (fn && ln) setNameLocked(true);
        if (em) { setEmail(em); setEmailLocked(true); }
        if (ph) { setContactNumber(ph); setContactLocked(true); }
        if (em) { localStorage.setItem('email_address', em); localStorage.setItem('client_email', em); localStorage.setItem('email', em); }
        if (fn) localStorage.setItem('first_name', fn);
        if (ln) localStorage.setItem('last_name', ln);
        if (ph) localStorage.setItem('client_phone', ph);
        if (cid) localStorage.setItem('client_id', String(cid));
        if (au) localStorage.setItem('auth_uid', String(au));
      } catch {}
    };
    load();
  }, [hydrated, headersWithU]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      firstName,
      lastName,
      contactNumber,
      email,
      street,
      barangay,
      additionalAddress,
      profilePicture,
      profilePictureName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    hydrated,
    firstName,
    lastName,
    contactNumber,
    email,
    street,
    barangay,
    additionalAddress,
    profilePicture,
    profilePictureName,
  ]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingNext]);

  useEffect(() => {
    if (!isLoadingNext) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  const onNextClick = () => {
    setAttempted(true);
    if (isFormValid) {
      jumpTop();
      setIsLoadingNext(true);
      setTimeout(() => {
        handleNext();
      }, 2000);
    }
  };

  const clearDraftsAndGoDashboard = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('clientServiceRequestDetails');
      localStorage.removeItem('clientServiceRate');
    } catch {}
    jumpTop();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <div className="text-lg font-semibold text-gray-900">Please fill in your details</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-gray-500">Step 1 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-1/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-gray-100/60 mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80">
            <h3 className="text-xl md:text-[22px] font-semibold text-gray-900">Personal Information</h3>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Client</span>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-6">
              <div className="lg:col-span-2">
                <p className="text-sm text-gray-600 mb-6">Please fill in your personal details to proceed.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => { if (!nameLocked) setFirstName(e.target.value); }}
                      placeholder="First Name"
                      readOnly={nameLocked}
                      aria-readonly={nameLocked}
                      title={nameLocked ? 'This name comes from your account' : undefined}
                      className={`w-full px-4 py-3 border ${attempted && !firstName.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 ${nameLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      aria-invalid={attempted && !firstName.trim()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => { if (!nameLocked) setLastName(e.target.value); }}
                      placeholder="Last Name"
                      readOnly={nameLocked}
                      aria-readonly={nameLocked}
                      title={nameLocked ? 'This name comes from your account' : undefined}
                      className={`w-full px-4 py-3 border ${attempted && !lastName.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 ${nameLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      aria-invalid={attempted && !lastName.trim()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <div className={`flex items-center rounded-xl border ${attempted && !isContactValid ? 'border-red-500' : 'border-gray-300'} ${contactLocked ? 'bg-gray-100' : ''} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                      <div className="w-8 h-5 ml-3 mr-2 rounded-md">
                        <img
                          src="philippines.png"
                          alt="Philippine Flag"
                          className="w-full h-full object-contain rounded-md"
                        />
                      </div>
                      <span className="text-gray-700 text-sm mr-3">+63</span>
                      <span className="h-6 w-px bg-gray-200 mr-2" />
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => {
                          if (contactLocked) return;
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setContactNumber(v);
                        }}
                        placeholder="9XXXXXXXXX"
                        readOnly={contactLocked}
                        aria-readonly={contactLocked}
                        title={contactLocked ? 'This number comes from your account' : undefined}
                        className={`w-full px-4 py-3 bg-transparent outline-none rounded-r-xl ${contactLocked ? 'cursor-not-allowed' : ''}`}
                        required
                        aria-invalid={attempted && !isContactValid}
                      />
                    </div>
                    {attempted && !isContactValid && (
                      <p className="text-xs text-red-600 mt-1">Enter a valid PH mobile number with a real prefix (e.g., 9XXXXXXXXX).</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { if (!emailLocked) setEmail(e.target.value); }}
                      placeholder="Email Address"
                      readOnly={emailLocked}
                      aria-readonly={emailLocked}
                      title={emailLocked ? 'This email comes from your account' : undefined}
                      className={`w-full px-4 py-3 border ${attempted && !validateEmail(email) ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 ${emailLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      aria-invalid={attempted && !validateEmail(email)}
                    />
                    {attempted && !validateEmail(email) && (
                      <p className="text-xs text-red-600 mt-1">Enter a valid email address.</p>
                    )}
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
                    <div className={`flex items-center rounded-xl border ${attempted && !barangay.trim() ? 'border-red-500' : 'border-gray-300'}`}>
                      <button
                        type="button"
                        onClick={toggleDropdown}
                        className="w-full px-4 py-3 text-left rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                        aria-expanded={showDropdown}
                        aria-haspopup="listbox"
                      >
                        {barangay || 'Select Barangay'}
                      </button>
                      <button
                        type="button"
                        onClick={toggleDropdown}
                        className="px-3 pr-4 text-gray-600 hover:text-gray-800"
                        aria-label="Open barangay list"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {showDropdown && (
                      <div
                        className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-3"
                        role="listbox"
                      >
                        <div className="text-sm font-semibold text-gray-800 px-2 pb-2">Select Barangay</div>
                        <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto px-2">
                          {sortedBarangays.map((barangayName, index) => {
                            const isSelected = barangayName === barangay;
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => { setBarangay(barangayName); setShowDropdown(false); }}
                                className={['text-left px-3 py-2 rounded-lg text-sm', isSelected ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-gray-700 hover:bg-blue-50'].join(' ')}
                                role="option"
                                aria-selected={isSelected}
                              >
                                {barangayName}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-end mt-3 px-2">
                          <button
                            type="button"
                            onClick={() => { setBarangay(''); setShowDropdown(false); }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {attempted && !barangay.trim() && (
                      <p className="text-xs text-red-600 mt-1">Please select your barangay.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="House No. and Street"
                      className={`w-full px-4 py-3 border ${attempted && !street.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40`}
                      required
                      aria-invalid={attempted && !street.trim()}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Address (Landmark etc.)</label>
                    <textarea
                      value={additionalAddress}
                      onChange={(e) => setAdditionalAddress(e.target.value)}
                      placeholder="Additional Address (Required)"
                      className={`w-full px-4 py-3 border ${attempted && !additionalAddress.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40`}
                      required
                      aria-invalid={attempted && !additionalAddress.trim()}
                    />
                    {attempted && !additionalAddress.trim() && (
                      <p className="text-xs text-red-600 mt-1">Please provide a landmark or additional address.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="text-base font-semibold mb-3 text-center">Client Profile Picture</div>
                <p className="text-sm text-gray-600 text-center mb-5">Upload your picture here.</p>
                <div className="flex flex-col items-center gap-5">
                  {!profilePicture ? (
                    <div className={`w-36 h-36 md:w-40 md:h-40 rounded-full grid place-items-center ${attempted && !profilePicture ? 'bg-red-200' : 'bg-gray-200'}`}>
                      <span className="text-white text-2xl">+</span>
                    </div>
                  ) : (
                    <img
                      src={profilePicture}
                      alt="Profile Preview"
                      className="w-36 h-36 md:w-40 md:h-40 rounded-full object-cover ring-2 ring-blue-100 shadow-sm"
                    />
                  )}
                  <div className="w-full flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="rounded-xl bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077d6] transition w-full shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                    >
                      Choose Photo
                    </button>
                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => { setProfilePicture(null); setProfilePictureName(''); }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition w-full"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </div>
                  {profilePictureName && (
                    <p className="text-xs text-gray-600 truncate text-center">Selected: {profilePictureName}</p>
                  )}
                  {attempted && !profilePicture && (
                    <p className="text-xs text-red-600 text-center mt-1">Please upload a profile picture.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Link to="/clientdashboard" onClick={clearDraftsAndGoDashboard} className="sm:w-1/3">
            <button
              type="button"
              className="w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
            >
              Back
            </button>
          </Link>

          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-[#0077d6]' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40`}
            aria-disabled={!isFormValid}
          >
            Next : Service Request Details
          </button>
        </div>
      </form>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loading next step"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
              <div className="text-base font-semibold text-gray-900">Preparing Step 2</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInformation;
