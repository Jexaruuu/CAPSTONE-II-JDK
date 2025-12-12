import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import HomePage from './pages/homepage/HomePage';
import RolePage from './pages/rolepage/RolePage';
import LoginPage from './pages/loginpage/LoginPage';
import AdminDashboardPage from './pages/dashboardpage/AdminDashboard';

import ClientSignUpPage from './pages/signuppage/ClientSignup';
import ClientSuccessPage from './pages/successpage/ClientSuccess';
import ClientWelcomePage from './pages/clientpage/ClientWelcome';
import ClientPostRequest from './pages/clientpage/ClientPostRequest';
import ClientReviewServiceRequest from './clientcomponents/requestcomponents/ClientReviewServiceRequest';
import ClientDashboardPage from './pages/dashboardpage/ClientDashboard';
import ClientMessages from './pages/clientpage/ClientMessages';
import ClientAccountSettings from './pages/clientpage/ClientAccountSettings';
import ClientNotifications from './pages/clientpage/ClientNotifications';
import ClientCurrentServiceRequest from './pages/clientpage/ClientCurrentServiceRequest';
import ClientCompletedRequest from './pages/clientpage/ClientCompletedRequest';
import ClientFindAvailableWorker from './pages/clientpage/ClientFindAvailableWorker';
import ClientViewServiceRequest from './pages/clientpage/ClientViewServiceRequest';
import ClientEditServiceRequest from './pages/clientpage/ClientEditServiceRequest';
import ClientOnGoingRequest from './pages/clientpage/ClientOnGoingRequest';

import WorkerSignUpPage from './pages/signuppage/WorkerSignup';
import WorkerSuccessPage from './pages/successpage/WorkerSuccess';
import WorkerWelcomePage from './pages/workerpage/WorkerWelcome';
import WorkerPostApplication from './pages/workerpage/WorkerPostApplication';
import WorkerDashboardPage from './pages/dashboardpage/WorkerDashboard';
import WorkerMessages from './pages/workerpage/WorkerMessages';
import WorkerAccountSettings from './pages/workerpage/WorkerAccountSettings';
import WorkerNotifications from './pages/workerpage/WorkerNotifications';
import WorkerCurrentApplication from './pages/workerpage/WorkerCurrentApplication';
import WorkerCompletedWorks from './pages/workerpage/WorkerCompletedWorks';
import WorkerFindAvailableClient from './pages/workerpage/WorkerFindAvailableClient';
import WorkerViewApplication from './pages/workerpage/WorkerViewApplication';
import WorkerEditApplication from './pages/workerpage/WorkerEditApplication';
import WorkerOnGoingService from './pages/workerpage/WorkerOnGoingService';

import AdminLoginPage from './pages/loginpage/AdminLoginPage';
import AdminSignup from './pages/signuppage/AdminSignup';
import AdminSuccessPage from './pages/successpage/AdminSuccess';

import DashboardMenu from './admincomponents/admindashboardcomponents/DashboardMenu';
import ManageUserMenu from './admincomponents/admindashboardcomponents/ManageUserMenu';
import ServiceRequestMenu from './admincomponents/admindashboardcomponents/ServiceRequestMenu';
import WorkerApplicationMenu from './admincomponents/admindashboardcomponents/WorkerApplicationMenu';
import CanceledRequestMenu from './admincomponents/admindashboardcomponents/CanceledRequestMenu';
import CanceledApplicationMenu from './admincomponents/admindashboardcomponents/CanceledApplicationMenu';

const AdminSettings = () => <div className="p-6">Settings</div>;

const ProtectedRoute = ({ children }) => {
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  const role = localStorage.getItem('role');
  return firstName && lastName && role ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
  const role = String(localStorage.getItem('role') || '').toLowerCase();
  if (role === 'client') return <Navigate to="/clientwelcome" replace />;
  if (role === 'worker') return <Navigate to="/workerwelcome" replace />;
  return children;
};

const ClientOnlyRoute = ({ children }) => {
  const role = String(localStorage.getItem('role') || '').toLowerCase();
  return role === 'client' ? children : <Navigate to="/login" replace />;
};

const WorkerOnlyRoute = ({ children }) => {
  const role = String(localStorage.getItem('role') || '').toLowerCase();
  return role === 'worker' ? children : <Navigate to="/login" replace />;
};

const AdminOnlyRoute = ({ children }) => {
  const role = String(localStorage.getItem('role') || '').toLowerCase();
  const adminNo = localStorage.getItem('admin_no');
  const firstName = localStorage.getItem('first_name');
  const lastName = localStorage.getItem('last_name');
  return role === 'admin' && adminNo && firstName && lastName ? children : <Navigate to="/adminlogin" replace />;
};

const OngoingServiceRouter = () => {
  const role = String(localStorage.getItem('role') || '').toLowerCase();
  if (role === 'worker') return <WorkerOnGoingService />;
  if (role === 'client') return <ClientOnGoingRequest />;
  return <Navigate to="/login" replace />;
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

        <Route
          path="/admindashboard"
          element={
            <AdminOnlyRoute>
              <AdminDashboardPage />
            </AdminOnlyRoute>
          }
        >
          <Route index element={<DashboardMenu />} />
          <Route path="manage-users" element={<ManageUserMenu />} />
          <Route path="service-requests" element={<ServiceRequestMenu />} />
          <Route path="service-requests/cancelled" element={<CanceledRequestMenu />} />
          <Route path="worker-applications" element={<WorkerApplicationMenu />} />
          <Route path="worker-applications/cancelled" element={<CanceledApplicationMenu />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/adminsuccess" element={<AdminSuccessPage />} />

        <Route
          path="/clientmessages"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientMessages />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/account-settings"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientAccountSettings />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-notifications"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientNotifications />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/current-service-request"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientCurrentServiceRequest />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/current-service-request/:id"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientViewServiceRequest />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/completed-service-request"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientCompletedRequest />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/find-a-worker"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientFindAvailableWorker />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/workermessages"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerMessages />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/worker-account-settings"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerAccountSettings />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/worker-notifications"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerNotifications />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/current-work-post"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerCurrentApplication />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/current-work-post/:id"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerViewApplication />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/completed-works"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerCompletedWorks />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/find-a-client"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerFindAvailableClient />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/current-service-request/:id"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientViewServiceRequest />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-service-request/:id"
          element={
            <ProtectedRoute>
              <ClientOnlyRoute>
                <ClientEditServiceRequest />
              </ClientOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-work-application/:id"
          element={
            <ProtectedRoute>
              <WorkerOnlyRoute>
                <WorkerEditApplication />
              </WorkerOnlyRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ongoing-service"
          element={
            <ProtectedRoute>
              <OngoingServiceRouter />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
