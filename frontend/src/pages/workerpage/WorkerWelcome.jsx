import React from 'react';
import { Link } from 'react-router-dom';
import WorkerNavigation from '../../workercomponents/WorkerNavigation'; // You can rename this to WorkerNavigation if available
import WorkerFooter from '../../workercomponents/WorkerFooter'; // You can rename this to WorkerFooter if available

const WorkerWelcomePage = () => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const sex = localStorage.getItem('sex'); // ✅ Retrieve sex from localStorage

  // ✅ Determine prefix based on sex
  const prefix = sex === 'Male' ? 'Mr.' : sex === 'Female' ? 'Ms.' : '';

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation /> {/* Replace with WorkerNavigation if you have one */}
      <div className="max-w-[1525px] mx-auto px-6 py-12">
        <div className="flex flex-col justify-start items-start">
          {/* Logo above the welcome text */}
          <div className="mb-6">
            <img
              src="/Bluelogo.png"
              alt="JDK HOMECARE Logo"
              className="h-36 w-36 object-contain -ml-5"
            />
          </div>

          <h1 className="text-5xl font-bold text-left mb-6">
            Welcome Worker, {prefix} <span className='text-[#008cfc]'>{`${firstName} ${lastName}`}</span>!
          </h1>
          <p className="text-xl text-left mb-6">
            We’re excited to have you on board. Start browsing job requests and find opportunities that match your skills!
          </p>
          <p className="text-left mb-8">
            <span className='text-[#008cfc]'>JDK HOMECARE</span> connects skilled workers like you with clients needing home maintenance. Let’s deliver great service together!
          </p>

          {/* Buttons */}
          <div className="flex justify-start gap-6">
            <Link
              to="/workerjoblist"
              className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
            >
              View Job Requests
            </Link>
          </div>

          {/* Footer Section */}
          <p className="text-left mt-12 text-sm text-gray-500">
            Let’s help more homes get the care they deserve.
          </p>
        </div>
      </div>
      <WorkerFooter /> {/* Replace with WorkerFooter if you have one */}
    </div>
  );
};

export default WorkerWelcomePage;
