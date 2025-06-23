import React from 'react';

const StepDescription = ({ description, setDescription, handleNext, handleBack }) => {
  return (
    <form className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4">Describe your service request.</h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your service request in detail"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
          rows="4"
        />
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-3 bg-gray-300 text-white rounded-md"
        >
          Back
        </button>
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

export default StepDescription;
