import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';  // Add 'useLocation' here
import axios from 'axios';

const ClientSignUpPage = () => {
  const location = useLocation(); // Use useLocation to get the role passed from RolePage
  const { role } = location.state || { role: 'client' }; // Default to 'client' if no role is passed

  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email_address, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [is_email_opt_in, setIsEmailOptIn] = useState(false);
  const [is_agreed_to_terms, setIsAgreedToTerms] = useState(false);
  const [error_message, setErrorMessage] = useState('');
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
  e.preventDefault();
  setErrorMessage(''); // Reset error message before submitting

  try {
    const response = await axios.post('http://localhost:5000/api/clients/register', {
      first_name,
      last_name,
      email_address,
      password,
    });

    if (response.status === 201) {
      // Store the first and last name in localStorage after successful signup
      localStorage.setItem('first_name', first_name);
      localStorage.setItem('last_name', last_name);
      
      navigate('/clientsuccess');
    }
  } catch (error) {
    console.error('Error registering client:', error);
    if (error.response && error.response.data) {
      setErrorMessage(error.response.data.message || 'There was an error registering the client');
    } else {
      setErrorMessage('There was an error registering the client');
    }
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
            <span className="text-md">Looking for work? </span>
            <Link to="/workersignup" className="text-[#008cfc]">
              Apply as Worker
            </Link>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="flex justify-center items-center flex-grow px-4 py-12 -mt-[30px]">
        <div className="bg-white p-8 max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-6">Sign up to be a <span className="text-[#008cfc]">Client</span></h2>

          {/* Google Sign Up Button */}
          <div className="flex space-x-4 mt-4">
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 transition hover:bg-[#008cfc] border-[#008cfc] text-[#008cfc] hover:text-white">
              <img src="/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          {/* "or" with borders on the left and right */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-4 text-gray-500">or</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Form Fields */}
          <div className="space-y-6 mb-6">
            <div className="flex space-x-4">
              <div className="w-full">
                <label htmlFor="first_name" className="block text-sm font-semibold mb-2">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  value={first_name}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
              <div className="w-full">
                <label htmlFor="last_name" className="block text-sm font-semibold mb-2">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  value={last_name}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email_address" className="block text-sm font-semibold mb-2">Email Address</label>
              <input
                id="email_address"
                type="email"
                value={email_address}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2">Password (8 or more characters)</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              checked={is_agreed_to_terms}
              onChange={() => setIsAgreedToTerms(!is_agreed_to_terms)}
              className="form-checkbox text-[#008cfc] -mt-12"
            />
            <span className="ml-2">
              Yes, I understand and agree to the{' '}
              <Link to="#" className="text-[#008cfc] underline">
                Upwork Terms of Service
              </Link>
              , including the{' '}
              <Link to="#" className="text-[#008cfc] underline">
                User Agreement
              </Link> and{' '}
              <Link to="#" className="text-[#008cfc] underline">
                Privacy Policy
              </Link>.
            </span>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-6">
            <button
              disabled={!first_name || !last_name || !email_address || !password || !is_agreed_to_terms}
              className={`py-2 px-6 rounded-md w-full ${!first_name || !last_name || !email_address || !password || !is_agreed_to_terms ? 'bg-gray-300 text-gray-500' : 'bg-White border-2 transition border-[#008cfc] hover:bg-[#008cfc]' } text-[#008cfc] hover:text-white`}
              onClick={handleSubmit}
            >
              Create my account
            </button>
          </div>

          {/* Error Message */}
          {error_message && (
            <div className="text-red-500 text-center mt-4">
              {error_message}
            </div>
          )}

          {/* Already have an account link */}
          <div className="text-center mt-4">
            <span>Already have an account? </span>
            <Link to="/login" className="text-[#008cfc] underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSignUpPage;
