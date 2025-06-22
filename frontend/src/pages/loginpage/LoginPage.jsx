import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../homecomponents/Footer';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white">
        <div className="max-w-[1535px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6 ml-2.5">
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

      <div className="flex justify-center items-center flex-grow px-4 py-6">
        <div className="bg-white p-8 rounded-xl max-w-lg w-full shadow-lg">
          <h2 className="text-3xl font-bold text-center mb-6">Log in to JDK Homecare</h2>
          
          <div className="space-y-4 mb-6">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username or Email"
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-4 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-center mt-4">
            <button
              disabled={!email || !password}
              className={`py-2 px-6 rounded-md w-full ${!email || !password ? 'bg-gray-300 text-gray-500' : 'bg-green-500'} text-white ${!email || !password ? 'cursor-not-allowed' : ''} transition duration-300`}
            >
              Log In
            </button>
          </div>

          <div className="text-center mt-4">
            <span>or</span>
          </div>

          <div className="flex space-x-4 mt-4">
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 border-blue-500 text-blue-500">
              <img src="/google-logo.png" alt="Google Logo" className="h-5 w-5 mr-2" />
              Continue with Google
            </button>
          </div>

          <div className="flex space-x-4 mt-4">
            <button className="flex items-center justify-center w-full py-2 px-4 rounded-md border-2 border-black text-black">
              <img src="/apple-logo.png" alt="Apple Logo" className="h-5 w-5 mr-2" />
              Continue with Apple
            </button>
          </div>

          <div className="text-center mt-6">
            <span>Don't have an Upwork account? </span>
            <Link to="/signup" className="text-blue-500 underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LoginPage;
