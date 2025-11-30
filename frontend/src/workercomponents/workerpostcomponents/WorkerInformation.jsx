import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compressImageFileToDataURL } from '../../utils/imageCompression';

const STORAGE_KEY = 'workerInformationForm';

const clearWorkerApplicationDrafts = () => {
  try {
    localStorage.removeItem('workerInformationForm');
  } catch {}
  try {
    localStorage.removeItem('workerWorkInformation');
    localStorage.removeItem('workerDocuments');
    localStorage.removeItem('workerDocumentsData');
    localStorage.removeItem('workerRate');
    localStorage.removeItem('workerAgreements');
  } catch {}
};

const WorkerInformation = ({ title, setTitle, handleNext, onCollect }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePictureName, setProfilePictureName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [attempted, setAttempted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const fileInputRef = useRef(null);

  const [dpOpen, setDpOpen] = useState(false);
  const [dpView, setDpView] = useState(new Date());
  const dpRef = useRef(null);

  const [birthLocked] = useState(false);
  const [contactLocked] = useState(false);

  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  const barangays = [
    'Alangilan','Alijis','Banago','Bata','Cabug','Estefania','Felisa',
    'Granada','Handumanan','Lopez Jaena','Mandalagan','Mansilingan',
    'Montevista','Pahanocoy','Punta Taytay','Singcang-Airport','Sum-ag',
    'Taculing','Tangub','Villa Esperanza'
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

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

  const computeAge = (iso) => {
    if (!iso) return '';
    const b = new Date(iso);
    if (isNaN(b.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age < 0 || age > 120 ? '' : String(age);
  };

  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toMDY = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${day}/${y}`;
  };

  const { minDOB, maxDOB, minDOBDate, maxDOBDate, minDOBLabel, maxDOBLabel } = useMemo(() => {
    const today = new Date();
    const max = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate());
    const min = new Date(today.getFullYear() - 55, today.getMonth(), today.getDate());
    return {
      minDOB: toYMD(min),
      maxDOB: toYMD(max),
      minDOBDate: min,
      maxDOBDate: max,
      minDOBLabel: toMDY(min),
      maxDOBLabel: toMDY(max),
    };
  }, []);

  const birthAge = computeAge(birthDate);
  const isBirthdateValid = useMemo(() => {
    if (!birthDate) return false;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return false;
    return birthDate >= minDOB && birthDate <= maxDOB;
  }, [birthDate, minDOB, maxDOB]);

  const isContactValid = isValidPHMobile(contactNumber.replace(/\D/g, ''));

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    birthDate &&
    isBirthdateValid &&
    validateEmail(email) &&
    isContactValid &&
    barangay.trim() &&
    street.trim() &&
    !!profilePicture;

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
    const handleOutside = (e) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        setProfilePicture(d.profilePicture || null);
        setProfilePictureName(d.profilePictureName || '');
        if (d.birth_date) setDpView(new Date(d.birth_date));
      } catch {}
    } else {
      setDpView(new Date(maxDOBDate));
    }
    setHydrated(true);
  }, [maxDOBDate]);

  useEffect(() => {
    const authFirst = localStorage.getItem('first_name') || '';
    const authLast = localStorage.getItem('last_name') || '';
    if (authFirst) setFirstName(authFirst);
    if (authLast) setLastName(authLast);
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
      profilePicture,
      profilePictureName,
      age: birthAge ? Number(birthAge) : null
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    hydrated,
    firstName,
    lastName,
    birthDate,
    contactNumber,
    email,
    barangay,
    street,
    profilePicture,
    profilePictureName,
    birthAge
  ]);

  useEffect(() => {
    if (!isLoadingNext) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingNext]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isLoadingBack]);

  useEffect(() => {
    if (!isLoadingBack) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isLoadingBack]);

  const proceed = () => {
    const draft = {
      firstName,
      lastName,
      birth_date: birthDate,
      contactNumber,
      email,
      barangay,
      street,
      profilePicture,
      profilePictureName
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
    onCollect?.({
      auth_uid: localStorage.getItem('auth_uid') || '',
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      contact_number: contactNumber,
      email_address: email,
      barangay,
      street,
      profile_picture: profileFile || null,
      profile_picture_name: profilePictureName || '',
      age: birthAge ? Number(birthAge) : null
    });
    handleNext?.();
  };

  const onNextClick = () => {
    setAttempted(true);
    if (!isFormValid) return;
    jumpTop();
    setIsLoadingNext(true);
    setTimeout(() => {
      proceed();
    }, 2000);
  };

  const onBackClick = (e) => {
    e.preventDefault();
    try {
      clearWorkerApplicationDrafts();
    } catch {}
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      navigate('/workerdashboard');
    }, 2000);
  };

  const monthName = (d) =>
    d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const canGoPrev = () => addMonths(startOfMonth(dpView), -1) >= startOfMonth(minDOBDate);
  const canGoNext = () => addMonths(startOfMonth(dpView), 1) <= startOfMonth(maxDOBDate);

  const inRange = (date) => date >= minDOBDate && date <= maxDOBDate;

  const openCalendar = () => {
    if (birthLocked) return;
    if (birthDate) setDpView(new Date(birthDate));
    else setDpView(new Date(maxDOBDate));
    setDpOpen((s) => !s);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FBFF] to-white pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/jdklogo.png" alt="" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="text-2xl md:text-3xl font-semibold text-gray-900">Please fill in your details</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-gray-500">Step 1 of 4</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/4 bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <form className="mx-auto w-full max-w-[1520px] px-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="text-xl md:text-2xl font-semibold">Personal Information</h3>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              <span className="h-3 w-3 rounded-full bg-current opacity-30" />
              Worker
            </span>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-6">
              <div className="lg:col-span-2">
                <p className="text-base text-gray-600 mb-6">Please fill in your personal details to proceed.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        if (!nameLocked) setFirstName(e.target.value);
                      }}
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
                      onChange={(e) => {
                        if (!nameLocked) setLastName(e.target.value);
                      }}
                      placeholder="Last Name"
                      readOnly={nameLocked}
                      aria-readonly={nameLocked}
                      title={nameLocked ? 'This name comes from your account' : undefined}
                      className={`w-full px-4 py-3 border ${attempted && !lastName.trim() ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40 ${nameLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      aria-invalid={attempted && !lastName.trim()}
                    />
                  </div>

                  <div className="relative" ref={dpRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
                    <div className={`flex items-center rounded-xl border ${attempted && (!birthDate || !isBirthdateValid) ? 'border-red-500' : 'border-gray-300'} ${birthLocked ? 'bg-gray-100' : ''} focus-within:ring-2 focus-within:ring-[#008cfc]/40`}>
                      <input
                        type="text"
                        value={birthDate ? toMDY(new Date(birthDate)) : ''}
                        onFocus={openCalendar}
                        readOnly
                        aria-readonly
                        disabled={birthLocked}
                        placeholder="mm/dd/yyyy"
                        title={birthLocked ? 'This birthdate comes from your account' : `Allowed: ${minDOBLabel} to ${maxDOBLabel} (21–55 years old)`}
                        className="w-full px-4 py-3 rounded-l-xl bg-transparent outline-none"
                        required
                        aria-invalid={attempted && (!birthDate || !isBirthdateValid)}
                        aria-describedby="birthdate-help"
                        inputMode="none"
                      />
                      <span className="h-6 w-px bg-gray-200 mr-1" />
                      <button
                        type="button"
                        onClick={openCalendar}
                        disabled={birthLocked}
                        className={`px-3 pr-4 ${birthLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
                        aria-label="Open calendar"
                        title={birthLocked ? 'Disabled' : 'Open calendar'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" />
                          <path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" />
                        </svg>
                      </button>
                    </div>
                    <p id="birthdate-help" className="text-xs text-gray-500 mt-1">
                      Must be between <span className="font-medium">{minDOBLabel}</span> and <span className="font-medium">{maxDOBLabel}</span> (21–55 yrs).
                    </p>
                    {attempted && (!birthDate || !isBirthdateValid) && (
                      <p className="text-xs text-red-600 mt-1">Birthdate must make you between 21 and 55 years old.</p>
                    )}

                    {dpOpen && !birthLocked && (
                      <div className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-3">
                        <div className="flex items-center justify-between px-2 pb-2">
                          <button
                            type="button"
                            onClick={() => canGoPrev() && setDpView(addMonths(dpView, -1))}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${canGoPrev() ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                            aria-label="Previous month"
                          >
                            ‹
                          </button>
                          <div className="text-sm font-semibold text-gray-800">{monthName(dpView)}</div>
                          <button
                            type="button"
                            onClick={() => canGoNext() && setDpView(addMonths(dpView, 1))}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${canGoNext() ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                            aria-label="Next month"
                          >
                            ›
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-1">
                              {d}
                            </div>
                          ))}
                        </div>

                        {(() => {
                          const first = startOfMonth(dpView);
                          const last = endOfMonth(dpView);
                          const offset = first.getDay();
                          const total = offset + last.getDate();
                          const rows = Math.ceil(total / 7);
                          const selected = birthDate ? new Date(birthDate) : null;
                          const cells = [];

                          for (let r = 0; r < rows; r++) {
                            const row = [];
                            for (let c = 0; c < 7; c++) {
                              const idx = r * 7 + c;
                              const dayNum = idx - offset + 1;
                              if (dayNum < 1 || dayNum > last.getDate()) {
                                row.push(
                                  <div key={`x-${r}-${c}`} className="py-2" />
                                );
                              } else {
                                const d = new Date(dpView.getFullYear(), dpView.getMonth(), dayNum);
                                const disabled = !inRange(d);
                                const isSelected = selected && isSameDay(selected, d);
                                row.push(
                                  <button
                                    key={`d-${dayNum}`}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      setBirthDate(toYMD(d));
                                      setDpOpen(false);
                                    }}
                                    className={[
                                      'py-2 rounded-lg transition text-sm',
                                      disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700',
                                      isSelected && !disabled ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                                    ].join(' ')}
                                  >
                                    {dayNum}
                                  </button>
                                );
                              }
                            }
                            cells.push(
                              <div key={`r-${r}`} className="grid grid-cols-7 gap-1 px-2">
                                {row}
                              </div>
                            );
                          }
                          return <div className="mt-1">{cells}</div>;
                        })()}

                        <div className="flex items-center justify-between mt-3 px-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBirthDate('');
                              setDpOpen(false);
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDpView(new Date(maxDOBDate));
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Jump to latest allowed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      type="text"
                      value={birthAge}
                      readOnly
                      aria-readonly
                      placeholder="Auto-calculated"
                      title="Age is calculated from Birthdate"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed focus:outline-none"
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
                      onChange={(e) => {
                        if (!emailLocked) setEmail(e.target.value);
                      }}
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
                        aria-label="Open barangay options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {showDropdown && (
                      <div
                        className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-2"
                        role="listbox"
                      >
                        <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto px-1">
                          {sortedBarangays.map((barangayName, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setBarangay(barangayName);
                                setShowDropdown(false);
                              }}
                              className="text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-gray-700"
                              role="option"
                              aria-selected={barangayName === barangay}
                            >
                              {barangayName}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-2 px-2">
                          <span className="text-xs text-gray-400">&nbsp;</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBarangay('');
                              setShowDropdown(false);
                            }}
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
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="text-xl md:text-2xl font-semibold mb-3 text-center">Worker Profile Picture</div>
                <p className="text-base text-gray-600 text-center mb-5">Upload your picture here.</p>
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
                  <div className="w-full">
                    <input
                      ref={fileInputRef}
                      id="worker-profile-file"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-[#008cfc] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition w-full"
                    >
                      Choose Photo
                    </button>
                    {profilePictureName && (
                      <p className="text-xs text-gray-600 truncate text-center mt-2">Selected: {profilePictureName}</p>
                    )}
                    {attempted && !profilePicture && (
                      <p className="text-xs text-red-600 text-center mt-1">Please upload a profile picture.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Link to="/workerdashboard" onClick={onBackClick} className="sm:w-1/3">
            <button
              type="button"
              className="w-full px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
          </Link>

          <button
            type="button"
            onClick={onNextClick}
            disabled={!isFormValid}
            className={`sm:w-1/3 px-6 py-3 rounded-xl transition shadow-sm ${isFormValid ? 'bg-[#008cfc] text-white hover:bg-blue-700' : 'bg-[#008cfc] text-white opacity-50 cursor-not-allowed'}`}
            aria-disabled={!isFormValid}
          >
            Next : Work Information
          </button>
        </div>
      </form>

      {isLoadingNext && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preparing Step 2"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
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

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Going back to Dashboard"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
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
              <div className="text-lg font-semibold text-gray-900">Going back to Dashboard</div>
              <div className="text-sm text-gray-500 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerInformation;
