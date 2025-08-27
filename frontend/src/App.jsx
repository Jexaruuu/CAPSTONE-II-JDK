// App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import HomePage from './pages/homepage/HomePage';
import RolePage from './pages/rolepage/RolePage';
import LoginPage from './pages/loginpage/LoginPage';
import AdminDashboardPage from './pages/dashboardpage/AdminDashboard';

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
import AdminSuccessPage from './pages/successpage/AdminSuccess';

// ✅ import your real admin center content
import DashboardMenu from './admincomponents/admindashboardcomponents/DashboardMenu';
import ManageUserMenu from './admincomponents/admindashboardcomponents/ManageUserMenu';
import ServiceRequestMenu from './admincomponents/admindashboardcomponents/ServiceRequestMenu';
import WorkerApplicationMenu from './admincomponents/admindashboardcomponents/WorkerApplicationMenu';

// (You can replace this with a real page later)
const AdminSettings = () => <div className="p-6">Settings</div>;

// ---- route guards (unchanged) ----
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
  if (firstName && lastName && role) {
    if (role === 'client') return <Navigate to="/clientdashboard" />;
    if (role === 'worker') return <Navigate to="/workerdashboard" />;
    return children;
  }
  return children;
};

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
        <Route path="/" element={<GuestRoute><HomePage /></GuestRoute>} />
        <Route path="/role" element={<GuestRoute><RolePage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

        <Route path="/adminlogin" element={<AdminLoginPage />} />
        <Route path="/adminsignup" element={<GuestRoute><AdminSignup /></GuestRoute>} />

        {/* ✅ LAYOUT route with nested admin content */}
        <Route path="/admindashboard" element={<AdminDashboardPage />}>
          {/* show stats on the plain /admindashboard URL */}
          <Route index element={<DashboardMenu />} />
          <Route path="manage-users" element={<ManageUserMenu />} />
          <Route path="service-requests" element={<ServiceRequestMenu />} />
          <Route path="worker-applications" element={<WorkerApplicationMenu />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/adminsuccess" element={<AdminSuccessPage />} />

        {/* client */}
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
        <Route path="/clientsignup" element={<GuestRoute><ClientSignUpPage /></GuestRoute>} />
        <Route path="/clientsuccess" element={<ClientSuccessPage />} />

        {/* worker */}
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
        <Route path="/workersignup" element={<GuestRoute><WorkerSignUpPage /></GuestRoute>} />
        <Route path="/workersuccess" element={<WorkerSuccessPage />} />
      </Routes>
    </Router>
  );
};

export default App;
