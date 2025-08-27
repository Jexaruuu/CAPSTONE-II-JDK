// AdminDashboard.jsx (unchanged from the version I sent)
import React from 'react';
import { Outlet, useOutlet } from 'react-router-dom';
import AdminSideNavigation from '../../admincomponents/AdminSideNavigation';
import AdminTopNavigation from '../../admincomponents/AdminTopNavigation';
import AdminInDemandStats from '../../admincomponents/admindashboardcomponents/AdminIndemandStats';
import AdminWorkerApplications from '../../admincomponents/admindashboardcomponents/AdminWorkerApplications';
import AdminServiceRequest from '../../admincomponents/admindashboardcomponents/AdminServiceRequest';

const AdminDashboardPage = () => {
  const outlet = useOutlet();
  return (
    <div className="min-h-screen flex bg-indigo-50/30">
      <AdminSideNavigation />
      <div className="flex-1 flex flex-col">
        <AdminTopNavigation />   
        <div className="flex-1">
          {outlet || <AdminInDemandStats />}
          {outlet || <AdminServiceRequest />}
          {outlet || <AdminWorkerApplications />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
