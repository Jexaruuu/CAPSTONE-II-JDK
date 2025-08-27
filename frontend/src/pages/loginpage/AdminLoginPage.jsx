import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { sbAdmin as supabase } from '../../supabaseBrowser';

const ADMIN_ROLE = 'admin';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [adminNo, setAdminNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const ensureAdminOrThrow = (role) => {
    if (role !== ADMIN_ROLE) throw new Error('This login is for admins only.');
  };

  useEffect(() => {
    const first = localStorage.getItem('first_name');
    const last = localStorage.getItem('last_name');
    const role = localStorage.getItem('role');
    if (first && last && role === ADMIN_ROLE) {
      navigate('/admindashboard', { replace: true });
    }
  }, [navigate]);

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

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      try {
        const adminResp = await axios.post(
          'http://localhost:5000/api/admin/login',
          { admin_no: adminNo, password },
          { withCredentials: true }
        );
        const { user, role } = adminResp.data || {};
        ensureAdminOrThrow(role);
        localStorage.setItem('first_name', user.first_name || '');
        localStorage.setItem('last_name', user.last_name || '');
        localStorage.setItem('sex', user.sex || '');
        localStorage.setItem('role', role || ADMIN_ROLE);
        navigate('/admindashboard');
        return;
      } catch (_) {}
      try {
        const response = await axios.post(
          'http://localhost:5000/api/login',
          { admin_no: adminNo, password },
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
      } catch (_) {}
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
            await supabase.auth.signOut();
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
        setError('Login failed. Please check your Admin No. and password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async () => {
    setSignupError('');
    setSignupSuccess('');
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
        localStorage.setItem('first_name', user?.first_name || firstName);
        localStorage.setItem('last_name', user?.last_name || lastName);
        localStorage.setItem('sex', user?.sex || sex || '');
        localStorage.setItem('role', role || ADMIN_ROLE);
        navigate('/admindashboard');
        return;
      } catch (_) {}
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
      if (!data.session) {
        setSignupSuccess('Account created! Please check your email to confirm your address, then log in.');
        return;
      }
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
              <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center flex-grow px-4 py-6 -mt-20">
        <div className="p-8 rounded-md max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-2">
            Welcome to <span className="text-[#008cfc]">JDK HOMECARE</span>{' '}
          </h2>
          <p className="text-center text-gray-500 mb-6">Admin accounts only.</p>

          <div className="space-y-4 mb-6">
            <input
              type="text"
              value={adminNo}
              onChange={(e) => setAdminNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Admin No."
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              autoComplete="username"
              inputMode="numeric"
              pattern="[0-9]*"
            />
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

          {error && <div className="text-red-600 text-sm text-center mb-2">{error}</div>}

          <div className="text-center mt-4">
            <button
              onClick={handleLogin}
              disabled={!adminNo || !password || loading}
              className={`py-2 px-6 rounded-md w-full ${
                !adminNo || !password || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#008cfc] text-white'
              } transition duration-300`}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>

          <div className="text-center mt-6">
            <span>Not an admin? </span>
            <Link to="/adminsignup" className="text-blue-500 underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
