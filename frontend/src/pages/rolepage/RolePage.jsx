import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const RolePage = () => {
  const [role, setRole] = useState('');

  return (
   <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white">
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

      <div className="flex justify-center items-center flex-grow px-4 py-6">
        <div className="bg-white p-8 rounded-xl max-w-lg w-full">
          <h2 className="text-3xl font-bold text-center mb-6">Join as a Client or Worker</h2>
          
          <div className="space-y-4 mb-6">
            <div 
              onClick={() => setRole('client')}
              className={`cursor-pointer p-6 border-2 rounded-md ${role === 'client' ? 'border-blue-500' : 'border-gray-300'} hover:border-blue-500 transition-colors`}
            >
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  name="role" 
                  value="client" 
                  checked={role === 'client'} 
                  onChange={() => setRole('client')} 
                  className="form-radio text-blue-500"
                />
                <span className="text-lg font-semibold">I'm a client, hiring for a service</span>
              </div>
            </div>
            
            <div 
              onClick={() => setRole('worker')}
              className={`cursor-pointer p-6 border-2 rounded-md ${role === 'worker' ? 'border-green-500' : 'border-gray-300'} hover:border-green-500 transition-colors`}
            >
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  name="role" 
                  value="worker" 
                  checked={role === 'worker'} 
                  onChange={() => setRole('worker')} 
                  className="form-radio text-green-500"
                />
                <span className="text-lg font-semibold">I'm a worker, looking for a service job</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link to="/signup">
              <button
                disabled={!role}
                className={`py-2 px-6 rounded-md w-full ${role === '' ? 'bg-gray-300 text-gray-500' : role === 'client' ? 'bg-blue-500' : 'bg-green-500'} text-white ${role === '' ? 'cursor-not-allowed' : ''} transition duration-300`}
              >
                {role === '' ? "Create Account" : `Create Account as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
              </button>
            </Link>
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
