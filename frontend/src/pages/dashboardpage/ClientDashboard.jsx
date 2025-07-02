import React from 'react';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';
import ClientPost from '../../clientcomponents/clientdashboardcomponents/ClientPost';
import ClientAvailableWorkers from '../../clientcomponents/clientdashboardcomponents/ClientAvailableWorkers';

const ClientDashboardPage = () => {
  return (
    <div className="font-sans bg-white">
      <ClientNavigation />
      <ClientPost />
      <ClientAvailableWorkers />
      <ClientFooter />
    </div>
  );
};

export default ClientDashboardPage;