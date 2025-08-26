// src/pages/AdminDashboardPage.jsx
import React from 'react';
import AdminSideNavigation from '../../admincomponents/AdminSideNavigation';
import AdminTopNavigation from '../../admincomponents/AdminTopNavigation';

const AdminDashboardPage = () => {
  return (
    // Full-height app shell with a left sidebar and a right content column
    <div className="min-h-screen flex bg-indigo-50/30">
      {/* Left: Sidebar */}
      <AdminSideNavigation />

      {/* Right: Top nav + page content */}
      <div className="flex-1 flex flex-col">
        {/* Sticky top navigation (will span only the right column) */}
        <AdminTopNavigation />

        {/* Page content */}
        <main className="p-6">
          {/* Replace this with your dashboard content */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome! Your widgets and reports go here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
