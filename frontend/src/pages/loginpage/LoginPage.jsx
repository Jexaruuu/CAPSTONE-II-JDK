import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Redirect to dashboard if already logged in
useEffect(() => {
  const isLoggedIn = localStorage.getItem('first_name') && localStorage.getItem('last_name');
  if (isLoggedIn) {
    const role = localStorage.getItem('role');
    if (role === 'client') navigate('/clientdashboard', { replace: true });
    else if (role === 'worker') navigate('/workerdashboard', { replace: true });
  }
}, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/login', {
        email_address: email,
        password,
      });

      console.log('✅ Login Success:', response.data);
      const { user, role } = response.data;

      // ✅ Store user info in localStorage
      localStorage.setItem('first_name', user.first_name || '');
      localStorage.setItem('last_name', user.last_name || '');
      localStorage.setItem('sex', user.sex || '');
      localStorage.setItem('role', role); // ✅ also store role

      // ✅ Redirect based on role
      if (role === 'client') {
        navigate('/clientdashboard');
      } else if (role === 'worker') {
        navigate('/workerdashboard');
      }

    } catch (err) {
      console.error('❌ Login Failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-semibold text-center mb-6">
            Log in to <span className="text-[#008cfc]">JDK HOMECARE</span>
          </h2>

          <div className="space-y-4 mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center mb-2">{error}</div>
          )}

          <div className="text-center mt-4">
            <button
              onClick={handleLogin}
              disabled={!email || !password || loading}
              className={`py-2 px-6 rounded-md w-full ${
                !email || !password || loading
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
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 transition hover:bg-[#008cfc] border-[#008cfc] text-[#008cfc] hover:text-white">
              <img src="/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          <div className="text-center mt-6">
            <span>Don't have an account? </span>
            <Link to="/role" className="text-blue-500 underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
