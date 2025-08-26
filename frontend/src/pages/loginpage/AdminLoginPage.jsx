import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ✅ Your direct Supabase credentials
const supabaseUrl = 'https://uoyzcboehvwxcadrqqfq.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE4MzcsImV4cCI6MjA2ODg1NzgzN30.09tdQtyneRfAbQJRoVy5J9YpsuLTwn-EDF0tt2hUosg';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_ROLE = 'admin';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  // Login states
  const [email, setEmail] = useState(''); // 🔸 kept for backward-compat / Google / hidden signup
  const [adminNo, setAdminNo] = useState(''); // ✅ NEW: Admin No login identifier
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👁️ toggle state

  // Create-admin states (🔹 NEW)
  const [isCreating, setIsCreating] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState(''); // optional
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Helper: ensure this page is admin-only
  const ensureAdminOrThrow = (role) => {
    if (role !== ADMIN_ROLE) throw new Error('This login is for admins only.');
  };

  // Redirect if already logged in (admin only on this page)
  useEffect(() => {
    const first = localStorage.getItem('first_name');
    const last = localStorage.getItem('last_name');
    const role = localStorage.getItem('role');

    if (first && last && role === ADMIN_ROLE) {
      navigate('/admindashboard', { replace: true });
    }
    // If the user is logged in as client/worker, stay on this page (no redirect)
  }, [navigate]);

  // Google OAuth with admin gate (unchanged; still uses email identity through provider)
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthErr) throw oauthErr;

      // If your flow returns here without changing page, finalize by checking session:
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const role = user.user_metadata?.role || 'client';
        ensureAdminOrThrow(role);

        localStorage.setItem('first_name', user.user_metadata?.first_name || '');
        localStorage.setItem('last_name', user.user_metadata?.last_name || '');
        localStorage.setItem('sex', user.user_metadata?.sex || '');
        localStorage.setItem('role', role);

        navigate('/admindashboard');
      }
    } catch (e) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Login Handler (Admin No. first)
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // 0) Dedicated ADMIN endpoint with Admin No.
      try {
        const adminResp = await axios.post(
          'http://localhost:5000/api/admin/login',
          { admin_no: adminNo, password }, // ✅ switched to admin_no
          { withCredentials: true }
        );

        const { user, role } = adminResp.data || {};
        ensureAdminOrThrow(role);

        localStorage.setItem('first_name', user.first_name || '');
        localStorage.setItem('last_name', user.last_name || '');
        localStorage.setItem('sex', user.sex || '');
        localStorage.setItem('role', role || ADMIN_ROLE);

        navigate('/admindashboard');
        return; // ✅ done
      } catch (_) {
        // continue to generic backend flow
      }

      // 1) Generic backend login (try admin_no)
      try {
        const response = await axios.post(
          'http://localhost:5000/api/login',
          { admin_no: adminNo, password }, // ✅ try admin_no on generic endpoint
          { withCredentials: true }
        );

        const { user, role } = response.data;

        ensureAdminOrThrow(role);

        localStorage.setItem('first_name', user.first_name || '');
        localStorage.setItem('last_name', user.last_name || '');
        localStorage.setItem('sex', user.sex || '');
        localStorage.setItem('role', role || ADMIN_ROLE);

        navigate('/admindashboard');
        return;
      } catch (_) {
        // fall through to Supabase legacy fallback
      }

      // 2) Supabase fallback (only if an email is intentionally provided)
      if (email) {
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (supabaseError) {
          setError(supabaseError.message || 'Login failed');
        } else {
          const role = data.user?.user_metadata?.role || 'client';
          try {
            ensureAdminOrThrow(role);
          } catch (e) {
            setError(e.message);
            await supabase.auth.signOut(); // clear non-admin session
            setLoading(false);
            return;
          }

          localStorage.setItem('first_name', data.user?.user_metadata?.first_name || '');
          localStorage.setItem('last_name', data.user?.user_metadata?.last_name || '');
          localStorage.setItem('sex', data.user?.user_metadata?.sex || '');
          localStorage.setItem('role', role);

          navigate('/admindashboard');
        }
      } else {
        // If no email and both backend paths failed:
        setError('Login failed. Please check your Admin No. and password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 NEW: Create Admin Account (backend first, Supabase fallback)
  const handleAdminSignup = async () => {
    setSignupError('');
    setSignupSuccess('');

    // Basic validation
    if (!firstName.trim() || !lastName.trim()) {
      setSignupError('Please enter your first and last name.');
      return;
    }
    if (!email.trim()) {
      setSignupError('Please enter an email.');
      return;
    }
    if (!password) {
      setSignupError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    try {
      setSignupLoading(true);

      // 0) Try your backend first if you have it
      try {
        const resp = await axios.post(
          'http://localhost:5000/api/admin/register',
          {
            first_name: firstName,
            last_name: lastName,
            sex,
            email_address: email,
            password,
          },
          { withCredentials: true }
        );

        const { user, role } = resp.data || {};
        ensureAdminOrThrow(role || ADMIN_ROLE);

        // Save + redirect (auto-login if backend returns session)
        localStorage.setItem('first_name', user?.first_name || firstName);
        localStorage.setItem('last_name', user?.last_name || lastName);
        localStorage.setItem('sex', user?.sex || sex || '');
        localStorage.setItem('role', role || ADMIN_ROLE);

        navigate('/admindashboard');
        return; // ✅ done
      } catch (_) {
        // continue to Supabase signUp
      }

      // 1) Supabase signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: ADMIN_ROLE,
            first_name: firstName,
            last_name: lastName,
            sex,
          },
        },
      });

      if (error) {
        setSignupError(error.message || 'Failed to create admin account.');
        return;
      }

      // If email confirmation is ON in Supabase, session may be null
      if (!data.session) {
        setSignupSuccess('Account created! Please check your email to confirm your address, then log in.');
        return;
      }

      // If session exists, log them in and route
      const user = data.user;
      const role = user?.user_metadata?.role || ADMIN_ROLE;

      localStorage.setItem('first_name', user?.user_metadata?.first_name || firstName);
      localStorage.setItem('last_name', user?.user_metadata?.last_name || lastName);
      localStorage.setItem('sex', user?.user_metadata?.sex || sex || '');
      localStorage.setItem('role', role);

      navigate('/admindashboard');
    } catch (e) {
      setSignupError(e.message || 'Failed to create admin account.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white z-50">
        <div className="max-w-[1545px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6">
            <Link to="/">
              <img
                src="/jdklogo.png"
                alt="Logo"
                className="h-48 w-48 object-contain"
              />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center flex-grow px-4 py-6 -mt-20">
        <div className="p-8 rounded-md max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-2">
            Welcome to <span className="text-[#008cfc]">JDK HOMECARE</span>{' '}
          </h2>
          <p className="text-center text-gray-500 mb-6">
            Admin accounts only. {/* For clients/workers, use the links below. */}
          </p>

          {/* ======= Login Card ======= */}
          <div className="space-y-4 mb-6">
            {/* ✅ Admin No. instead of Email */}
            <input
              type="text"
              value={adminNo}
              onChange={(e) => setAdminNo(e.target.value.replace(/\D/g, ''))} // ✅ NEW: numeric-only
              placeholder="Admin No."
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              autoComplete="username"
              inputMode="numeric"
              pattern="[0-9]*"
            />

            {/* Password input with conditional Show/Hide */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc] ${password ? 'pr-16' : ''}`}
                autoComplete="current-password"
              />
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[#008cfc] hover:underline focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center mb-2">{error}</div>
          )}

          <div className="text-center mt-4">
            <button
              onClick={handleLogin}
              disabled={!adminNo || !password || loading} // ✅ uses Admin No.
              className={`py-2 px-6 rounded-md w-full ${
                !adminNo || !password || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#008cfc] text-white'
              } transition duration-300`}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>

          <div className="text-center mt-4">
            <span>or</span>
          </div>

          <div className="flex space-x-4 mt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 transition hover:bg-[#008cfc] border-[#008cfc] text-[#008cfc] hover:text-white disabled:opacity-60"
            >
              <img src="/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          {/* 🔹 Separate role links (HIDDEN per your request but kept in code) */}
          {false && (
            <div className="text-center mt-6 space-y-2">
              <span>Not an admin?</span>
              <div className="flex items-center justify-center gap-4">
                <Link to="/clientlogin" className="text-blue-500 underline">
                  Client Login
                </Link>
                <Link to="/workerlogin" className="text-blue-500 underline">
                  Worker Login
                </Link>
              </div>
            </div>
          )}

          {/* ✅ Login-page style footer — go to separate page */}
          <div className="text-center mt-6">
            <span>Not an admin? </span>
            <Link to="/adminsignup" className="text-blue-500 underline">
              Create Account
            </Link>
          </div>

          {/* ======= Inline Create Admin Account (kept but hidden) ======= */}
          {false && (
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Create Admin Account</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(v => !v)}
                  className="text-[#008cfc] underline"
                >
                  {isCreating ? 'Hide' : 'Show'}
                </button>
              </div>

              {isCreating && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                    />
                  </div>

                  {/* Optional field */}
                  <input
                    type="text"
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    placeholder="Sex (optional)"
                    className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                  />

                  {/* Reuse email from login (kept) */}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                    autoComplete="email"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className={`w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc] ${password ? 'pr-16' : ''}`}
                        autoComplete="new-password"
                      />
                      {password.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[#008cfc] hover:underline focus:outline-none"
                        >
                          {showSignupPassword ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                      autoComplete="new-password"
                    />
                  </div>

                  {signupError && (
                    <div className="text-red-600 text-sm text-center">{signupError}</div>
                  )}
                  {signupSuccess && (
                    <div className="text-green-600 text-sm text-center">{signupSuccess}</div>
                  )}

                  <button
                    onClick={handleAdminSignup}
                    disabled={
                      signupLoading ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !email.trim() ||
                      !password ||
                      !confirmPassword
                    }
                    className={`py-2 px-6 rounded-md w-full ${
                      signupLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#008cfc] text-white'
                    } transition duration-300`}
                  >
                    {signupLoading ? 'Creating…' : 'Create Admin Account'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
