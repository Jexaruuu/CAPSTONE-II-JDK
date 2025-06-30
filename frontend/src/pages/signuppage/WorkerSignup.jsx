import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const WorkerSignUpPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEmailOptIn, setIsEmailOptIn] = useState(false);
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    console.log('Form submitted:', { firstName, lastName, email, password });
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
          <h2 className="text-3xl font-semibold text-center mb-6">Sign up to be a <span className="text-[#008cfc]">Worker</span></h2>

          <div className="flex space-x-4 mt-4">
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 transition hover:bg-[#008cfc] border-[#008cfc] text-[#008cfc] hover:text-white">
              <img src="/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-4 text-gray-500">or</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <div className="space-y-6 mb-6">
            <div className="flex space-x-4">
              <div className="w-full">
                <label htmlFor="firstName" className="block text-sm font-semibold mb-2">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-3 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
              <div className="w-full">
                <label htmlFor="lastName" className="block text-sm font-semibold mb-2">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full p-3 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-3 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
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
                className="w-full p-3 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full p-3 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
            </div>
          </div>

          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              checked={isAgreedToTerms}
              onChange={() => setIsAgreedToTerms(!isAgreedToTerms)}
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
              </Link>{' '}
              and{' '}
              <Link to="#" className="text-[#008cfc] underline">
                Privacy Policy
              </Link>
              .
            </span>
          </div>

          <div className="text-center mt-6">
            <button
              disabled={!firstName || !lastName || !email || !password || !confirmPassword || password !== confirmPassword || !isAgreedToTerms}
              className={`py-2 px-6 rounded-md w-full ${!firstName || !lastName || !email || !password || !confirmPassword || password !== confirmPassword || !isAgreedToTerms ? 'bg-gray-300 text-gray-500' : 'bg-White border-2 transition border-[#008cfc] hover:bg-[#008cfc]' } text-[#008cfc] hover:text-white ${!firstName || !lastName || !email || !password || !confirmPassword || password !== confirmPassword || !isAgreedToTerms ? 'cursor-not-allowed ' : ''} transition duration-300`}
              onClick={handleSubmit}
            >
              Create my account
            </button>
          </div>

          {errorMessage && (
            <div className="text-red-500 text-center mt-4">
              {errorMessage}
            </div>
          )}

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

export default WorkerSignUpPage;
