import React, { useEffect } from 'react';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientFooter from '../../clientcomponents/ClientFooter';
import ClientPost from '../../clientcomponents/clientdashboardcomponents/ClientPost';
import ClientAvailableWorkers from '../../clientcomponents/clientdashboardcomponents/ClientAvailableWorkers';
import ClientAvailableServiceSection from '../../clientcomponents/clientdashboardcomponents/ClientAvailableServiceSection';

const ClientDashboardPage = () => {
  // ✅ Safety net: whenever Dashboard mounts, clear any draft forms
  useEffect(() => {
    try {
      localStorage.removeItem('clientInformationForm');
      localStorage.removeItem('clientServiceRequestDetails');
      localStorage.removeItem('clientServiceRate');
    } catch (e) {
      console.warn('Failed clearing drafts on dashboard mount', e);
    }
  }, []);

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
