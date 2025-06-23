import React from 'react';

const StepTitle = ({ title, setTitle, handleNext }) => {
  return (
    <form className="space-y-8">
      <div className="flex justify-between">
        {/* Left side - Title Instructions */}
        <div className="w-2/3">
          <h3 className="text-xl font-semibold mb-4">Let's start with a strong title.</h3>
          <p className="text-sm text-gray-600 mb-4">
            This helps your job post stand out to the right candidates. It’s the first thing they’ll see, so make it count!
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write a title for your service request"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        {/* Right side - Example Titles */}
        <div className="w-1/3 pl-8">
          <h4 className="text-lg font-semibold mb-4">Example titles</h4>
          <ul className="text-sm text-gray-600">
            <li>Build responsive WordPress site with booking/payment functionality</li>
            <li>Graphic designer needed to design ad creative for multiple campaigns</li>
            <li>Facebook ad specialist needed for product launch</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 bg-blue-500 text-white rounded-md"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default StepTitle;
