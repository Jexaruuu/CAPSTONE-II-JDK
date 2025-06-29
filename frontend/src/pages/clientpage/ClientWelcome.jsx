import React from 'react';
import { Link } from 'react-router-dom';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const ClientWelcomePage = () => {
  // Get first name and last name from localStorage
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <ClientNavigation />
      <div className="max-w-[1525px] mx-auto px-6 py-12">
        <div className="flex flex-col justify-start items-start">
          {/* Logo above the welcome text */}
          <div className="mb-6">
            <img
              src="/Bluelogo.png" // Make sure to update this with the correct path to your logo
              alt="JDK HOMECARE Logo"
              className="h-36 w-36 object-contain -ml-5"
            />
          </div>

          <h1 className="text-5xl font-bold text-left mb-6">
            Welcome, Client <span className='text-[#008cfc]'>{`${firstName} ${lastName}`}</span> !
          </h1>
          <p className="text-xl text-left mb-6">
            We’re excited to have you with us. Let’s get started with your first service request!
          </p>
          <p className="text-left mb-8">
            <span className='text-[#008cfc]'>JDK HOMECARE</span> provides better home service and maintenance solutions. Whether it’s cleaning, repairs, or anything in between, we’ve got you covered. Your satisfaction is our priority!
          </p>

          {/* Buttons */}
          <div className="flex justify-start gap-6">
            <Link
              to="/clientpostrequest"
              className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
            >
              Request a Service Now
            </Link>
          </div>

          {/* Footer Section */}
          <p className="text-left mt-12 text-sm text-gray-500">
            We’re here to help you make your home a better place to live.{' '}
          </p>
        </div>
      </div>
      <ClientFooter />
    </div>
  );
};

export default ClientWelcomePage;
