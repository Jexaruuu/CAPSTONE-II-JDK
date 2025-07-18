import React from 'react';
import { Link } from 'react-router-dom';

const ClientPost = () => {
  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">
      <h2 className="text-4xl font-semibold mb-10">Welcome back, Jex</h2>

      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4">Service Request Post</h3>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <img
              src="/Request.png" 
              alt="Request"
              className="w-20 h-20 object-contain"
            />
          </div>
          <p className="text-gray-600 mb-4">
            No active service requests found. You can post a new service request to find available workers.
          </p>
          <Link
            to="/clientpostrequest"
            className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
          >
            + Post a service request
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientPost;
