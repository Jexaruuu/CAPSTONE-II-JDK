import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ClientSuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('first_name');
    localStorage.removeItem('last_name');
    localStorage.removeItem('sex');
    localStorage.removeItem('role');
    localStorage.removeItem('auth_uid');

    const t = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 5000);

    const blockBack = (e) => {
      e?.preventDefault?.();
      navigate('/login', { replace: true });
      setTimeout(() => window.history.go(1), 0);
    };
    window.history.replaceState(null, '', window.location.href);
    window.addEventListener('popstate', blockBack);

    return () => {
      clearTimeout(t);
      window.removeEventListener('popstate', blockBack);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <div className="text-center">
        <img src="Success.png" alt="Success" className="h-24 w-24 mx-auto" />
        <h2 className="text-2xl font-semibold text-[#008cfc] mt-4">Congratulations, your account has been created!</h2>
      </div>
    </div>
  );
};

export default ClientSuccessPage;
