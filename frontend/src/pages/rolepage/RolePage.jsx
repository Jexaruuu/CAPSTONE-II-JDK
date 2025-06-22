import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const RolePage = () => {
  const [role, setRole] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white z-50">
        <div className="max-w-[1530px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
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

      <div className="flex justify-center items-center flex-grow px-4 py-6 -mt-24">
        <div className="bg-white p-8 rounded-xl max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-6">Join as a <span className='text-[#008cfc]'>Client</span> or <span className='text-[#008cfc]'>Worker</span></h2>
          <div className="space-y-4 mb-6">
            <div
              onClick={() => setRole('client')}
              className={`cursor-pointer p-6 border-2 rounded-md ${role === 'client' ? 'border-[#008cfc]' : 'border-gray-300'} hover:border-[#008cfc] transition-colors`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={role === 'client'}
                  onChange={() => setRole('client')}
                  className="form-radio text-[#008cfc]"
                />
                <span className="text-lg font-semibold">I'm a client, hiring for a service</span>
              </div>
            </div>

            <div
              onClick={() => setRole('worker')}
              className={`cursor-pointer p-6 border-2 rounded-md ${role === 'worker' ? 'border-[#008cfc]' : 'border-gray-300'} hover:border-[#008cfc] transition-colors`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  value="worker"
                  checked={role === 'worker'}
                  onChange={() => setRole('worker')}
                  className="form-radio text-[#008cfc]"
                />
                <span className="text-lg font-semibold">I'm a worker, looking for a service job</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            {role === 'client' ? (
              <Link to="/clientsignup">
                <button
                  className={`py-2 px-6 rounded-md w-full ${role === 'client' ? 'bg-[#008cfc]' : 'bg-gray-300 text-gray-500'} text-white transition duration-300`}
                >
                  Create Account as Client
                </button>
              </Link>
            ) : role === 'worker' ? (
              <Link to="/workersignup">
                <button
                  className={`py-2 px-6 rounded-md w-full ${role === 'worker' ? 'bg-[#008cfc]' : 'bg-gray-300 text-gray-500'} text-white transition duration-300`}
                >
                  Create Account as Worker
                </button>
              </Link>
            ) : (
              <button
                disabled
                className="py-2 px-6 rounded-md w-full bg-gray-300 text-gray-500 cursor-not-allowed"
              >
                Create Account
              </button>
            )}
          </div>

          <div className="text-center mt-4">
            <span>Already have an account? </span>
            <Link to="/login" className="text-blue-500 underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePage;
