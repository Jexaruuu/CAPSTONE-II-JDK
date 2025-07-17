import React from 'react';
import { Link } from 'react-router-dom';

const WorkerPost = () => {
  return (
    <div className="max-w-[1525px] mx-auto bg-white px-6 py-8">

      <h2 className="text-4xl font-semibold mb-10">Welcome back, Jex</h2>

      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4">Work Application Post</h3>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <img
              src="/Resume.png" 
              alt="Resume"
              className="w-20 h-20 object-contain"
            />
          </div>
          <p className="text-gray-600 mb-4">
            No applications found. You can post your application now to start finding jobs and get hired for home service work.
          </p>
          <Link
            to="/workerpost"
            className="inline-block px-4 py-2 border border-[#008cfc] text-[#008cfc] rounded hover:bg-blue-50 transition"
          >
            + Become a worker
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WorkerPost;
