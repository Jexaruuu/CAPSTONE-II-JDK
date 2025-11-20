import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const AdminSignup = () => {
  const location = useLocation();

  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [admin_no, setAdminNo] = useState('');
  const [sex, setSex] = useState('');
  const [email_address, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [is_email_opt_in, setIsEmailOptIn] = useState(false);
  const [error_message, setErrorMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [info_message, setInfoMessage] = useState('');
  const [canResend, setCanResend] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [canResendAt, setCanResendAt] = useState(0);

  const [adminNoLocked, setAdminNoLocked] = useState(true);
  const [adminNoRequesting, setAdminNoRequesting] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const now = () => Date.now();
  const canResendOtp = now() >= canResendAt;

  const navigate = useNavigate();

  const normEmail = (s) => String(s || '').trim().toLowerCase();

  const passwordRules = useMemo(() => {
    const v = password || '';
    const len = v.length >= 8;
    const upper = /[A-Z]/.test(v);
    const num = /\d/.test(v);
    const special = /[^A-Za-z0-9]/.test(v);
    const match = password && password === confirm_password;
    const score = [len, upper, num, special].filter(Boolean).length;
    return { len, upper, num, special, match, score };
  }, [password, confirm_password]);

  const isFormValid =
    first_name.trim() !== '' &&
    last_name.trim() !== '' &&
    admin_no.trim() !== '' &&
    sex.trim() !== '' &&
    email_address.trim() !== '' &&
    passwordRules.len &&
    passwordRules.upper &&
    passwordRules.num &&
    passwordRules.special &&
    passwordRules.match;

  const requestOtp = async () => {
    try {
      setOtpError('');
      setOtpInfo('Sending code…');
      setOtpSending(true);
      await axios.post(
        'http://localhost:5000/api/auth/request-otp',
        { email: normEmail(email_address) },
        { withCredentials: true }
      );
      setOtpInfo('We sent a 6-digit code to your email. Enter it below.');
      setCanResendAt(now() + 60000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send OTP.';
      setOtpError(msg);
      setOtpInfo('');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setOtpError('');
      setOtpInfo('Verifying…');
      setOtpVerifying(true);
      await axios.post(
        'http://localhost:5000/api/auth/verify-otp',
        { email: normEmail(email_address), code: otpCode },
        { withCredentials: true }
      );
      setOtpInfo('Verified! Creating your account…');
      setOtpOpen(false);
      await completeRegistration();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid code.';
      setOtpError(msg);
      setOtpInfo('');
    } finally {
      setOtpVerifying(false);
    }
  };

  const sendAdminNoEmail = async () => {
    try {
      await axios.post(
        'http://localhost:5000/api/admins/send-admin-no',
        {
          to: normEmail(email_address),
          first_name,
          last_name,
          admin_no,
        },
        { withCredentials: true }
      );
      setInfoMessage(`We emailed your Admin No. to ${normEmail(email_address)}.`);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to email your Admin No.';
      setErrorMessage(msg);
    }
  };

  const completeRegistration = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        'http://localhost:5000/api/admins/register',
        {
          first_name,
          last_name,
          admin_no,
          sex,
          email_address: normEmail(email_address),
          password,
          is_agreed_to_terms: true,
        },
        { withCredentials: true }
      );

      if (response.status === 201) {
        localStorage.setItem('first_name', first_name);
        localStorage.setItem('last_name', last_name);
        localStorage.setItem('sex', sex);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('admin_no', admin_no);

        const uid = response?.data?.data?.auth_uid || response?.data?.auth_uid;
        if (uid) {
          localStorage.setItem('auth_uid', uid);
        }

        await sendAdminNoEmail();

        setInfoMessage('Admin account created. You’re all set!');
        navigate('/adminsuccess', { replace: true });
      }
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;

      if (status === 429) {
        setErrorMessage('Too many verification emails were sent. Please wait a minute and try again.');
        setCanResend(true);
      } else if (status === 409) {
        setErrorMessage('This email already started signup. You can resend the verification email.');
        setCanResend(true);
      } else if (msg) {
        setErrorMessage(msg);
      } else {
        setErrorMessage('There was an error registering the admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkEmailAvailable = async () => {
    try {
      const resp = await axios.post(
        'http://localhost:5000/api/auth/check-email',
        { email: normEmail(email_address) },
        { withCredentials: true }
      );
      return resp?.data?.exists === true ? false : true;
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to check email.';
      setErrorMessage(msg);
      return false;
    }
  };

  const handleRequestAdminNo = async () => {
    try {
      setErrorMessage('');
      setInfoMessage('');
      setAdminNoRequesting(true);
      const email = normEmail(email_address);
      if (!email || !email.includes('@')) {
        setErrorMessage('Enter a valid email address.');
        return;
      }
      const available = await checkEmailAvailable();
      if (!available) {
        setErrorMessage('Email already in use');
        return;
      }
      await axios.post(
        'http://localhost:5000/api/admins/request-admin-no',
        { email },
        { withCredentials: true }
      );
      setInfoMessage(`We sent your 6-digit Admin No. to ${email}. Check your inbox.`);
      setAdminNoLocked(false);
      setEmailVerified(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send Admin No.';
      setErrorMessage(msg);
    } finally {
      setAdminNoRequesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setCanResend(false);

    if (!emailVerified) {
      setErrorMessage('Please tap “Send Admin No.” to your email first.');
      return;
    }
    if (!admin_no.trim()) {
      setErrorMessage('Admin No. is required');
      return;
    }
    if (!passwordRules.match) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (
      !passwordRules.len ||
      !passwordRules.upper ||
      !passwordRules.num ||
      !passwordRules.special
    ) {
      setErrorMessage(
        'Password must be at least 8 characters and include a capital letter, a number, and a special character'
      );
      return;
    }

    await completeRegistration();
  };

  const handleResend = async () => {
    try {
      setErrorMessage('');
      setInfoMessage('Resending verification email…');
      await axios.post('http://localhost:5000/api/auth/resend', { email: normEmail(email_address) });
      setInfoMessage('Verification email resent. Please check your inbox.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend verification.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white z-50">
        <div className="max-w-[1540px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6">
            <Link to="/">
              <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center flex-grow px-4 py-12 -mt-[84px]">
        <div className="bg-white p-8 max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-4">
            Sign up to be an <span className="text-[#008cfc]">Admin</span>
          </h2>
          <div className="w-16 h-[2px] bg-gray-300 mx-auto mb-4"></div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="w-full">
                <label htmlFor="first_name" className="block text-sm font-semibold mb-1">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  value={first_name}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                  autoComplete="given-name"
                />
              </div>
              <div className="w-full">
                <label htmlFor="last_name" className="block text-sm font-semibold mb-1">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  value={last_name}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email_address" className="block text-sm font-semibold mb-1">Email Address</label>
              <div className="flex gap-2">
                <input
                  id="email_address"
                  type="email"
                  value={email_address}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-[278px] p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                  autoComplete="email"
                />
                <button
                  type="button"
                  onClick={handleRequestAdminNo}
                  disabled={adminNoRequesting || !email_address.trim()}
                  className={`w-[160px] shrink-0 px-4 rounded-md border-2 ${
                    adminNoRequesting || !email_address.trim()
                      ? 'border-gray-300 text-gray-400'
                      : 'border-[#008cfc] text-[#008cfc] hover:bg-[#008cfc] hover:text-white'
                  }`}
                >
                  {adminNoLocked
                    ? (adminNoRequesting ? 'Sending…' : 'Get Admin No.')
                    : (adminNoRequesting ? 'Sending…' : 'Resend')}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="admin_no" className="block text-sm font-semibold mb-1">Admin No.</label>
              <input
                id="admin_no"
                type="text"
                inputMode="numeric"
                value={admin_no}
                onChange={(e) => setAdminNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit Admin No."
                className={`w-full p-2.5 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008cfc] ${adminNoLocked ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-gray-300'}`}
                autoComplete="off"
                disabled={adminNoLocked}
              />
            </div>

            <div>
              <label htmlFor="sex" className="block text-sm font-semibold mb-1">Sex</label>
              <select
                id="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc] appearance-none bg-no-repeat"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-1">Password (8 or more characters)</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full p-2.5 ${password ? 'pr-20' : ''} border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]`}
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto text-sm font-medium text-[#008cfc] hover:underline px-2"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={[
                      'h-full transition-all',
                      !password
                        ? 'bg-gray-300 w-0'
                        : passwordRules.score <= 1
                        ? 'bg-red-500 w-1/4'
                        : passwordRules.score === 2
                        ? 'bg-amber-500 w-2/4'
                        : passwordRules.score === 3
                        ? 'bg-yellow-500 w-3/4'
                        : 'bg-emerald-500 w-full',
                    ].join(' ')}
                  />
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <li className={passwordRules.len ? 'text-emerald-600' : 'text-gray-500'}>At least 8 characters</li>
                  <li className={passwordRules.upper ? 'text-emerald-600' : 'text-gray-500'}>One uppercase letter</li>
                  <li className={passwordRules.num ? 'text-emerald-600' : 'text-gray-500'}>One number</li>
                  <li className={passwordRules.special ? 'text-emerald-600' : 'text-gray-500'}>One special character</li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-semibold mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm_password}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={[
                    `w-full p-2.5 ${confirm_password ? 'pr-20' : ''} border-2 rounded-md focus:outline-none focus:ring-2`,
                    passwordRules.match || !confirm_password
                      ? 'border-gray-300 focus:ring-[#008cfc]'
                      : 'border-red-300 focus:ring-red-400',
                  ].join(' ')}
                  autoComplete="new-password"
                />
                {confirm_password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto text-sm font-medium text-[#008cfc] hover:underline px-2"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              {confirm_password &&
              (!passwordRules.match ||
                !passwordRules.len ||
                !passwordRules.upper ||
                !passwordRules.num ||
                !passwordRules.special) ? (
                <p className="text-xs text-red-600 mt-1">
                  {!passwordRules.match
                    ? 'Passwords do not match'
                    : 'Password must be at least 8 characters and include a capital letter, a number, and a special character'}
                </p>
              ) : null}
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              disabled={!isFormValid || loading}
              className={`py-2 px-6 rounded-md w-full ${
                (!isFormValid || loading)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-2 transition border-[#008cfc] hover:bg-[#008cfc] text-[#008cfc] hover:text-white'
              }`}
              onClick={handleSubmit}
            >
              {loading ? 'Submitting…' : 'Create my admin account'}
            </button>
          </div>

          {info_message && <div className="text-[#008cfc] text-center mt-4">{info_message}</div>}
          {error_message && <div className="text-red-500 text-center mt-4">{error_message}</div>}

          {canResend && (
            <div className="text-center mt-2">
              <button type="button" onClick={handleResend} className="text-[#008cfc] underline">
                Resend verification email
              </button>
            </div>
          )}

          <div className="text-center mt-4">
            <span>Already have an admin account? </span>
            <Link to="/adminlogin" className="text-[#008cfc] underline">Log In</Link>
          </div>
        </div>
      </div>

      {otpOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-center">Verify your email</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Enter the 6-digit code we sent to <b>{email_address || 'your email'}</b>.
            </p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0,6))}
              placeholder="123456"
              className="w-full p-3 border-2 rounded-md border-gray-300 text-center tracking-widest text-lg"
            />
            {otpInfo && <div className="text-[#008cfc] text-center mt-3">{otpInfo}</div>}
            {otpError && <div className="text-red-600 text-center mt-3">{otpError}</div>}

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setOtpOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300"
                disabled={otpVerifying}
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={requestOtp}
                  disabled={!canResendOtp || otpSending}
                  className={`px-4 py-2 rounded-md border ${!canResendOtp || otpSending ? 'opacity-50 cursor-not-allowed' : 'border-[#008cfc] text-[#008cfc]'}`}
                >
                  {otpSending ? 'Sending…' : (canResendOtp ? 'Resend code' : 'Wait…')}
                </button>
                <button
                  onClick={verifyOtp}
                  disabled={otpCode.length !== 6 || otpVerifying}
                  className="px-4 py-2 rounded-md bg-[#008cfc] text-white"
                >
                  {otpVerifying ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSignup;
