import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // ✅ Added useLocation like Client page
import axios from 'axios';

const WorkerSignUpPage = () => {
  const location = useLocation(); // ✅ Same as Client page
  const navigate = useNavigate();

  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [sex, setSex] = useState('');
  const [email_address, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [is_email_opt_in, setIsEmailOptIn] = useState(false);
  const [is_agreed_to_terms, setIsAgreedToTerms] = useState(false);
  const [error_message, setErrorMessage] = useState('');

  // ✅ Added: show/hide states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ NEW: same UX as client
  const [loading, setLoading] = useState(false);
  const [info_message, setInfoMessage] = useState('');
  const [canResend, setCanResend] = useState(false);

  // ✅ Same password validation as Client page
  const isFormValid = (
    first_name.trim() !== '' &&
    last_name.trim() !== '' &&
    sex.trim() !== '' &&
    email_address.trim() !== '' &&
    password.trim().length >= 12 && // ✅ Require at least 12 characters
    confirm_password.trim() !== '' &&
    password === confirm_password &&
    is_agreed_to_terms
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setCanResend(false);

    if (password !== confirm_password) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.trim().length < 12) {
      setErrorMessage('Password must be at least 12 characters long');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post('http://localhost:5000/api/workers/register', {
        first_name,
        last_name,
        sex,
        email_address,
        password,
        // ✅ send agreement flag like client side
        is_agreed_to_terms,
      });

      if (response.status === 201) {
        const { auth_uid } = response.data.data || {};
        localStorage.setItem('first_name', first_name);
        localStorage.setItem('last_name', last_name);
        localStorage.setItem('sex', sex);
        if (auth_uid) {
          localStorage.setItem('auth_uid', auth_uid); // ✅ store Supabase UID
        }

        setInfoMessage('Signup started. Please check your inbox for the verification link.');
        navigate('/workersuccess');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;

      if (status === 429) {
        setErrorMessage('Too many verification emails were sent. Please wait a minute and try again.');
        setCanResend(true);
      } else if (status === 409) {
        setErrorMessage('This email already started signup. You can resend the verification email.');
        setCanResend(true);
      } else if (status === 502) {
        setErrorMessage('Email delivery failed. Check SMTP settings in Supabase (host/port/username/app password).');
        // Resend may not help if SMTP is broken, but we leave the button available
        setCanResend(true);
      } else if (msg) {
        setErrorMessage(msg);
      } else {
        setErrorMessage('Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Resend flow (same endpoint used by client)
  const handleResend = async () => {
    try {
      setErrorMessage('');
      setInfoMessage('Resending verification email…');
      await axios.post('http://localhost:5000/api/auth/resend', { email: email_address });
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
              <img
                src="/jdklogo.png"
                alt="Logo"
                className="h-48 w-48 object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-md">Want to hire a worker? </span>
            <Link to="/clientsignup" className="text-[#008cfc]">
              Apply as Client
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center flex-grow px-4 py-12 -mt-[84px]">
        <div className="bg-white p-8 max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-4">
            Sign up to be a <span className="text-[#008cfc]">Worker</span>
          </h2>

          <div className="flex space-x-4 mt-4">
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 transition hover:bg-[#008cfc] border-[#008cfc] text-[#008cfc] hover:text-white" disabled>
              <img src="/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-4 text-gray-500">or</span>
            <hr className="flex-grow border-gray-300" />
          </div>

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
                />
              </div>
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
              <label htmlFor="email_address" className="block text-sm font-semibold mb-1">Email Address</label>
              <input
                id="email_address"
                type="email"
                value={email_address}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
            </div>

            {/* ✅ Password with conditional Show/Hide */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-1">
                Password (12 or more characters) {/* ✅ Updated label */}
              </label>
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
            </div>

            {/* ✅ Confirm Password with conditional Show/Hide */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-semibold mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm_password}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={`w-full p-2.5 ${confirm_password ? 'pr-20' : ''} border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]`}
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
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              checked={is_agreed_to_terms}
              onChange={() => setIsAgreedToTerms(!is_agreed_to_terms)}
              className="form-checkbox text-[#008cfc] -mt-6"
            />
            <span className="ml-2 text-sm">
              I agree to JDK HOMECARE’s{' '}
              <Link to="#" className="text-[#008cfc] underline">Terms of Service</Link>{' '}
              and{' '}
              <Link to="#" className="text-[#008cfc] underline">Privacy Policy</Link>.
            </span>
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
              {loading ? 'Submitting…' : 'Create my account'}
            </button>
          </div>

          {info_message && (
            <div className="text-green-600 text-center mt-4">
              {info_message}
            </div>
          )}

          {error_message && (
            <div className="text-red-500 text-center mt-4">
              {error_message}
            </div>
          )}

          {/* ✅ NEW: Resend UI */}
          {canResend && (
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleResend}
                className="text-[#008cfc] underline"
              >
                Resend verification email
              </button>
            </div>
          )}

          <div className="text-center mt-4">
            <span>Already have an account? </span>
            <Link to="/login" className="text-[#008cfc] underline">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerSignUpPage;
