import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('clientAuth') || '{}');
    const e =
      a.email ||
      localStorage.getItem('clientEmail') ||
      localStorage.getItem('client_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem('client_auth_uid') ||
      null;
    return { e, r: 'client', au };
  } catch {
    return {
      e:
        localStorage.getItem('clientEmail') ||
        localStorage.getItem('client_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        '',
      r: 'client',
      au: null,
    };
  }
}

const ClientWelcomePage = () => {
  const [firstName, setFirstName] = useState(localStorage.getItem('first_name') || '');
  const [lastName, setLastName] = useState(localStorage.getItem('last_name') || '');
  const [sex, setSex] = useState(localStorage.getItem('sex') || '');

  useEffect(() => {
    const ctrl = new AbortController();
    const x = encodeURIComponent(JSON.stringify(buildAppU()));
    fetch(`${API_BASE}/api/client/me`, {
      headers: { 'x-app-u': x },
      credentials: 'include',
      signal: ctrl.signal
    })
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        if (!p) return;
        const fn = p.first_name || '';
        const ln = p.last_name || '';
        const sx = p.sex || '';
        setFirstName(fn); localStorage.setItem('first_name', fn);
        setLastName(ln);  localStorage.setItem('last_name', ln);
        setSex(sx);       localStorage.setItem('sex', sx);
      })
      .catch(() => {})
    return () => ctrl.abort();
  }, []);

  const prefix = sex === 'Male' ? 'Mr.' : sex === 'Female' ? 'Ms.' : '';

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <ClientNavigation />
      <div className="max-w-[1525px] mx-auto px-6 py-[66.5px]">
        <div className="flex flex-col justify-start items-start">
          <div className="mb-6">
            <img
              src="/Bluelogo.png"
              alt="JDK HOMECARE Logo"
              className="h-36 w-36 object-contain -ml-5"
            />
          </div>

          <h1 className="text-5xl font-bold text-left mb-6">
            Welcome Client, {prefix} <span className='text-[#008cfc]'>{`${firstName} ${lastName}`}</span>!
          </h1>
          <p className="text-xl text-left mb-6">
            We’re excited to have you with us. Let’s get started!
          </p>
          <p className="text-left mb-8">
            <span className='text-[#008cfc]'>JDK HOMECARE</span> provides better home service and maintenance solutions. Whether it’s cleaning, repairs, or anything in between, we’ve got you covered. Your satisfaction is our priority!
          </p>

          <div className="flex justify-start gap-6">
            <Link
              to="/clientdashboard"
              className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-left mt-12 text-sm text-gray-500">
            We’re here to help you make your home a better place to live.
          </p>
        </div>
      </div>
      <ClientFooter />
    </div>
  );
};

export default ClientWelcomePage;
