import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homepage/HomePage';
import RolePage from './pages/rolepage/RolePage';  
import LoginPage from './pages/loginpage/LoginPage';
import ClientSignUpPage from './pages/signuppage/Clientsignup';
import WorkerSignUpPage from './pages/signuppage/WorkerSignup';
import ClientSuccessPage from "./pages/successpage/ClientSuccess";
import ClientWelcomePage from './pages/clientpage/ClientWelcome'; // Client welcome page

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/role" element={<RolePage />} /> 
          <Route path="/login" element={<LoginPage />} />
          <Route path="/clientsignup" element={<ClientSignUpPage />} />
          <Route path="/workersignup" element={<WorkerSignUpPage />} /> 
          <Route path="/clientsuccess" element={<ClientSuccessPage />} />
          <Route path="/clientwelcome" element={<ClientWelcomePage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
