import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WorkerSuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect after 5 seconds
    setTimeout(() => {
      navigate('/workerwelcome');  // Replace with your client welcome page route
    }, 5000);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <div className="text-center">
        <img src="Success.png" alt="Success" className="h-24 w-24 mx-auto" />
        <h2 className="text-2xl font-semibold text-[#008cfc] mt-4">Congratulations, your account has been created!</h2>
        <p className="text-lg mt-2">Let's get you started!</p>
      </div>
    </div>
  );
};

export default WorkerSuccessPage;
