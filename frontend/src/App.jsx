import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homepage/HomePage';
import RolePage from './pages/rolepage/RolePage';  

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/role" element={<RolePage />} /> 
        </Routes>
      </div>
    </Router>
  );
};

export default App;
