import React from 'react';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';
import ClientPost from '../../clientcomponents/clientdashboardcomponents/ClientPost';
import ClientAvailableWorkers from '../../clientcomponents/clientdashboardcomponents/ClientAvailableWorkers';
import ClientAvailableServiceSection from '../../clientcomponents/clientdashboardcomponents/ClientAvailableServiceSection';

const ClientDashboardPage = () => {
  return (
    <div className="font-sans bg-white">
      <ClientNavigation />
      <ClientPost />
      <ClientAvailableWorkers />
      <ClientAvailableServiceSection />
      <ClientFooter />
    </div>
  );
};

export default ClientDashboardPage;