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
import WorkerDashboardPage from './pages/dashboardpage/WorkerDashboard';
import WorkerPostApplication from './pages/workerpage/WorkerPostApplication';

// ✅ Protected route for logged-in users
const ProtectedRoute = ({ children }) => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const role = localStorage.getItem('role');

  return firstName && lastName && role ? children : <Navigate to="/login" />;
};

// ✅ Guest-only route (for login page)
const GuestRoute = ({ children }) => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const role = localStorage.getItem('role');

  return firstName && lastName && role
    ? <Navigate to={role === 'client' ? '/clientdashboard' : '/workerdashboard'} />
    : children;
};

const App = () => {
  return (
    <Router>
      <Routes>
  <Route path="/" element={
    <GuestRoute>
      <HomePage />
    </GuestRoute>
  } />
  <Route path="/role" element={<RolePage />} />

  <Route path="/login" element={
    <GuestRoute>
      <LoginPage />
    </GuestRoute>
  } />

        {/* ✅ Protected Client Routes */}
        <Route path="/clientdashboard" element={
          <ProtectedRoute>
            <ClientDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/clientwelcome" element={<ClientWelcomePage />} />
        <Route path="/clientpostrequest" element={<ClientPostRequest />} />
        <Route path="/clientreviewservicerequest" element={<ClientReviewServiceRequest />} />
        <Route path="/clientsignup" element={<ClientSignUpPage />} />
        <Route path="/clientsuccess" element={<ClientSuccessPage />} />

        {/* ✅ Protected Worker Routes */}
        <Route path="/workerdashboard" element={
          <ProtectedRoute>
            <WorkerDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/workerwelcome" element={<WorkerWelcomePage />} />
        <Route path="/workerpostapplication" element={<WorkerPostApplication />} />
        <Route path="/workersignup" element={<WorkerSignUpPage />} />
        <Route path="/workersuccess" element={<WorkerSuccessPage />} />
      </Routes>
    </Router>
  );
};

export default App;
