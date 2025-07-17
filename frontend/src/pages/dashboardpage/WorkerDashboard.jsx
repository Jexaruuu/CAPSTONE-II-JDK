import React from 'react';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerFooter from '../../workercomponents/WorkerFooter';
import WorkerPost from '../../workercomponents/workerdashboardcomponents/WorkerPost';
import WorkerAvailableServiceRequest from '../../workercomponents/workerdashboardcomponents/WorkerAvailableServiceRequest';
import WorkerAvailableServiceSection from '../../workercomponents/workerdashboardcomponents/WorkerAvailableServiceSection';

const WorkerDashboardPage = () => {
  return (
    <div className="font-sans bg-white">
      <WorkerNavigation />
      <WorkerPost />
      <WorkerAvailableServiceRequest />
      <WorkerAvailableServiceSection />
      <WorkerFooter />  
    </div>
  );
};

export default WorkerDashboardPage;