import React from 'react';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerFooter from '../../workercomponents/WorkerFooter';

const WorkerDashboardPage = () => {
  return (
    <div className="font-sans bg-white">
      <WorkerNavigation />
      <WorkerFooter />  
    </div>
  );
};

export default WorkerDashboardPage;