import React from 'react';
import { Outlet, useOutlet } from 'react-router-dom';
import AdminSideNavigation from '../../admincomponents/AdminSideNavigation';
import AdminTopNavigation from '../../admincomponents/AdminTopNavigation';
import DashboardMenu from '../../admincomponents/admindashboardcomponents/DashboardMenu';
import ManageUserMenu from '../../admincomponents/admindashboardcomponents/ManageUserMenu';

const AdminDashboardPage = () => {
  const outlet = useOutlet();
  return (
    <div className="min-h-screen flex bg-indigo-50/30">
      <AdminSideNavigation />
      <div className="flex-1 flex flex-col">
        <AdminTopNavigation />
        <div className="flex-1">
          {outlet || (
            <>
              <DashboardMenu />
              <ManageUserMenu />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
