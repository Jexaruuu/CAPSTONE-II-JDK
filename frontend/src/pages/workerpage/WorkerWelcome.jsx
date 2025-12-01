import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerFooter from '../../workercomponents/WorkerFooter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    const e =
      a.email ||
      localStorage.getItem('workerEmail') ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem('worker_auth_uid') ||
      null;
    return { e, r: 'worker', au };
  } catch {
    return {
      e:
        localStorage.getItem('workerEmail') ||
        localStorage.getItem('worker_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        '',
      r: 'worker',
      au: null,
    };
  }
}

const WorkerWelcomePage = () => {
  const [firstName, setFirstName] = useState(localStorage.getItem('first_name') || '');
  const [lastName, setLastName] = useState(localStorage.getItem('last_name') || '');
  const [sex, setSex] = useState(localStorage.getItem('sex') || '');

  useEffect(() => {
    const x = encodeURIComponent(JSON.stringify(buildAppU()));
    axios
      .get(`${API_BASE}/api/worker/me`, {
        headers: { 'x-app-u': x },
        withCredentials: true,
      })
      .then((r) => r.data)
      .then((p) => {
        if (!p) return;
        if (typeof p.first_name === 'string') {
          setFirstName(p.first_name || '');
          localStorage.setItem('first_name', p.first_name || '');
        }
        if (typeof p.last_name === 'string') {
          setLastName(p.last_name || '');
          localStorage.setItem('last_name', p.last_name || '');
        }
        if (typeof p.sex === 'string') {
          setSex(p.sex || '');
          localStorage.setItem('sex', p.sex || '');
        }
      })
      .catch(() => {});
  }, []);

  const prefix = sex === 'Male' ? 'Mr.' : sex === 'Female' ? 'Ms.' : '';

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation />
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
            Welcome Worker, {prefix}{' '}
            <span className="text-[#008cfc]">{`${firstName} ${lastName}`}</span>!
          </h1>
          <p className="text-xl text-left mb-6">
            We’re excited to have you on board. Start browsing job requests and find opportunities that match your skills!
          </p>
          <p className="text-left mb-8">
            <span className="text-[#008cfc]">JDK HOMECARE</span> connects skilled workers like you with clients needing home maintenance. Let’s deliver great service together!
          </p>

          <div className="flex justify-start gap-6">
            <Link
              to="/workerjoblist"
              className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition"
            >
              View Job Requests
            </Link>
          </div>

          <p className="text-left mt-12 text-sm text-gray-500">
            Let’s help more homes get the care they deserve.
          </p>
        </div>
      </div>
      <WorkerFooter />
    </div>
  );
};

export default WorkerWelcomePage;
