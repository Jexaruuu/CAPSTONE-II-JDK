import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [navLoading, setNavLoading] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const navigate = useNavigate();

  const goTop = () => { try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {} };

  const beginRoute = (to) => {
    if (navLoading) return;
    setNavLoading(true);
    setTimeout(() => { navigate(to, { replace: true }); }, 2000);
  };

  useEffect(() => {
    if (!navLoading) return;
    const onPopState = () => { window.history.pushState(null, '', window.location.href); };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.activeElement && document.activeElement.blur();
    const blockKeys = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [navLoading]);

  useEffect(() => {
  const ctrl = new AbortController();
  const x = encodeURIComponent(JSON.stringify(buildAppU()));
  const paths = [
    `${API_BASE}/api/clients/me`,
    `${API_BASE}/api/client/me`,
    `${API_BASE}/clients/me`,
    `${API_BASE}/client/me`,
    `${API_BASE}/api/v1/clients/me`,
    `${API_BASE}/api/v1/client/me`
  ];
  const tryFetch = async (u) => {
    try {
      const r = await fetch(`${u}?app_u=${x}`, {
        headers: { 'x-app-u': x },
        credentials: 'include',
        signal: ctrl.signal
      });
      return r;
    } catch {
      return null;
    }
  };
  (async () => {
    let payload = null;
    for (const u of paths) {
      const r = await tryFetch(u);
      if (r && r.status !== 404) {
        payload = r.ok ? await r.json() : null;
        break;
      }
    }
    if (!payload) return;
    const fn = payload.first_name || '';
    const ln = payload.last_name || '';
    const sx = payload.sex || '';
    setFirstName(fn); localStorage.setItem('first_name', fn);
    setLastName(ln);  localStorage.setItem('last_name', ln);
    setSex(sx);       localStorage.setItem('sex', sx);
  })();
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
              onClick={(e) => { e.preventDefault(); goTop(); beginRoute('/clientdashboard'); }}
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

      {navLoading && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading next step"
            tabIndex={-1}
            className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]"
          >
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-base font-semibold text-gray-900 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWelcomePage;
