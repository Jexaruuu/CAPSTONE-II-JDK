// src/pages/admin/AdminDashboardPage.jsx
import React from 'react';
import AdminSideNavigation from '../../admincomponents/AdminSideNavigation';
import AdminTopNavigation from '../../admincomponents/AdminTopNavigation';
import AdminInDemandStats from '../../admincomponents/admindashboardcomponents/AdminIndemandStats';

const AdminDashboardPage = () => {
  return (
    <div className="min-h-screen flex bg-indigo-50/30">
      <AdminSideNavigation />
      <div className="flex-1 flex flex-col">
        <AdminTopNavigation />
        <AdminInDemandStats />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
