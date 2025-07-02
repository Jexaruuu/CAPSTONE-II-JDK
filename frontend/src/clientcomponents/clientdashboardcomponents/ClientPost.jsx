import React from 'react';
import { Link } from 'react-router-dom';

const ClientPost = () => {
  return (
    <div className="max-w-[1535px] mx-auto bg-white px-6 py-8">
      {/* Welcome Message */}
      <h2 className="text-2xl font-semibold mb-6">Welcome back, Jex</h2>

      {/* Overview Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Overview</h3>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <img
              src="/briefcase.png" // Replace with your actual image path
              alt="Briefcase"
              className="w-12 h-12 object-contain"
            />
          </div>
          <p className="text-gray-600 mb-4">
            No job posts or contracts in progress right now
          </p>
          <Link
            to="/client/post-job"
            className="inline-block px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50 transition"
          >
            + Post a job
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientPost;
