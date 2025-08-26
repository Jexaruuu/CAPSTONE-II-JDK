import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import HomePage from './pages/homepage/HomePage';
import RolePage from './pages/rolepage/RolePage';
import LoginPage from './pages/loginpage/LoginPage';

import ClientSignUpPage from './pages/signuppage/ClientSignup';
import ClientSuccessPage from "./pages/successpage/ClientSuccess";
import ClientWelcomePage from './pages/clientpage/ClientWelcome';
import ClientPostRequest from './pages/clientpage/ClientPostRequest';
import ClientReviewServiceRequest from './clientcomponents/requestcomponents/ClientReviewServiceRequest';
import ClientDashboardPage from './pages/dashboardpage/ClientDashboard';

import WorkerSignUpPage from './pages/signuppage/WorkerSignup';
import WorkerSuccessPage from "./pages/successpage/WorkerSuccess";
import WorkerWelcomePage from './pages/workerpage/WorkerWelcome';
import WorkerPostApplication from './pages/workerpage/WorkerPostApplication';

import WorkerDashboardPage from './pages/dashboardpage/WorkerDashboard';

import AdminLoginPage from './pages/loginpage/AdminLoginPage';
import AdminSignup from './pages/signuppage/AdminSignup';
import AdminDashboardPage from './pages/dashboardpage/AdminDashboard';

/* ✅ OPTIONAL: Minimal inline success page so /adminsuccess works
   (replace with your own AdminSuccess component later if you have one) */
const AdminSuccessInline = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Admin account created!</h1>
      <p>You can now log in on the <a href="/adminlogin" style={{ color: '#008cfc', textDecoration: 'underline' }}>Admin Login</a> page.</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const role = localStorage.getItem('role');
  return firstName && lastName && role ? children : <Navigate to="/login" />;
};

const GuestRoute = ({ children }) => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const role = localStorage.getItem('role');

  // ✅ Tiny tweak: avoid redirecting admins to worker dashboard while no admin dashboard exists
  if (firstName && lastName && role) {
    if (role === 'client') return <Navigate to="/clientdashboard" />;
    if (role === 'worker') return <Navigate to="/workerdashboard" />;
    // role === 'admin' => allow guest pages for now (no admin dashboard yet)
    return children;
  }
  return children;
};

/** ✅ NEW: role-specific guards (unchanged below) */
const ClientOnlyRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  return role === 'client'
    ? children
    : role
      ? <Navigate to="/workerdashboard" replace />
      : <Navigate to="/login" replace />;
};

const WorkerOnlyRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  return role === 'worker'
    ? children
    : role
      ? <Navigate to="/clientdashboard" replace />
      : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <GuestRoute>
              <HomePage />
            </GuestRoute>
          }
        />

        <Route
          path="/role"
          element={
            <GuestRoute>
              <RolePage />
            </GuestRoute>
          }
        />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          path="/adminlogin"
          element={<AdminLoginPage />}
        />

        <Route
          path="/adminsignup"
          element={
            <GuestRoute>
              <AdminSignup />
            </GuestRoute>
          }
        />

        <Route path="/admindashboard" element={<AdminDashboardPage />} />

        <Route path="/adminsuccess" element={<AdminSuccessInline />} />

        {/* CLIENT ROUTES */}
        <Route
          path="/clientdashboard"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientDashboardPage />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/clientwelcome" element={<ClientWelcomePage />} />
        <Route path="/clientpostrequest" element={<ClientPostRequest />} />
        <Route path="/clientreviewservicerequest" element={<ClientReviewServiceRequest />} />
        <Route
          path="/clientsignup"
          element={
            <GuestRoute>
              <ClientSignUpPage />
            </GuestRoute>
          }
        />
        <Route path="/clientsuccess" element={<ClientSuccessPage />} />

        {/* WORKER ROUTES */}
        <Route
          path="/workerdashboard"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerDashboardPage />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/workerwelcome" element={<WorkerWelcomePage />} />
        <Route path="/workerpostapplication" element={<WorkerPostApplication />} />
        <Route
          path="/workersignup"
          element={
            <GuestRoute>
              <WorkerSignUpPage />
            </GuestRoute>
          }
        />
        <Route path="/workersuccess" element={<WorkerSuccessPage />} />
      </Routes>
    </Router>
  );
};

export default App;
