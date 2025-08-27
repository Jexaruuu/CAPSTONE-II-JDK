import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSuccessPage = () => {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const lockToSuccess = () => {
      navigate('/adminsuccess', { replace: true });
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', lockToSuccess);

    const tick = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    const t = setTimeout(() => {
      navigate('/admindashboard', { replace: true });
    }, 5000);

    return () => {
      window.removeEventListener('popstate', lockToSuccess);
      clearInterval(tick);
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <div className="text-center">
        <img src="Success.png" alt="Success" className="h-24 w-24 mx-auto" />
        <h2 className="text-2xl font-semibold text-[#008cfc] mt-4">
          Congratulations, your account has been created!
        </h2>
        <p className="text-lg mt-2">You're an admin now!</p>
      </div>
    </div>
  );
};

export default AdminSuccessPage;
