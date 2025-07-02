import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/role" element={<RolePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/clientsignup" element={<ClientSignUpPage />} />
          <Route path="/clientsuccess" element={<ClientSuccessPage />} />
          <Route path="/clientwelcome" element={<ClientWelcomePage />} />
          <Route path="/clientpostrequest" element={<ClientPostRequest />} />
          <Route path="/clientreviewservicerequest" element={<ClientReviewServiceRequest />} /> 
          <Route path="/clientdashboard" element={<ClientDashboardPage />} />
          
        

          <Route path="/workersignup" element={<WorkerSignUpPage />} />
          <Route path="/workersuccess" element={<WorkerSuccessPage />} />
          <Route path="/workerwelcome" element={<WorkerWelcomePage />} />
          <Route path="/workerdashboard" element={<WorkerDashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
