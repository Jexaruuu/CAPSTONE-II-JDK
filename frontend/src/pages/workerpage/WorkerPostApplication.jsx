import React, { useState } from 'react';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerInformation from '../../workercomponents/workerpostcomponents/WorkerInformation';
import WorkerWorkInformation from '../../workercomponents/workerpostcomponents/WorkerWorkInformation';

const WorkerPost = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // State variables for the form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = () => setCurrentStep((prevStep) => prevStep + 1);
  const handleBack = () => setCurrentStep((prevStep) => prevStep - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can send the form data to the backend
    console.log('Service request submitted:', {
      title,
      description,
    });
  };

  // Define the titles for each step
  const stepTitles = {
    1: "Step 1: Personal Basic Information",
    2: "Step 2: Work Information",
    3: "Step 3: Set Your Price Rate",
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation />
      <div className="max-w-[1550px] mx-auto px-6 py-12">
        {/* Step-by-Step Service Request Form */}
        <div className="flex flex-col min-h-[calc(100vh-200px)]">
          <div className="max-w-[1550px] mx-auto w-full">
            {/* Step Indicator above the Content */}
            <div className="flex justify-start mb-6 ml-3">
              <div className="text-lg font-extralight">
                {currentStep} of 3 | Post a Worker Application
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-6 ml-3">{stepTitles[currentStep]}</h2>

            {/* Step 1: Title */}
            {currentStep === 1 && (
              <WorkerInformation
                title={title}
                setTitle={setTitle}
                handleNext={handleNext}
              />
            )}

            {/* Step 2: Description */}
            {currentStep === 2 && (
              <WorkerWorkInformation
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerPost;
