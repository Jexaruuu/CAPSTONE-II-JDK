import React, { useState } from 'react';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import StepTitle from '../../clientcomponents/requestcomponents/StepTitle';
import StepDescription from '../../clientcomponents/requestcomponents/StepDescription';

const ClientPostRequest = () => {
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

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <ClientNavigation />
      <div className="max-w-[1550px] mx-auto px-6 py-12">
        {/* Step-by-Step Service Request Form */}
        <div className="flex flex-col min-h-[calc(100vh-200px)]">
          <div className="max-w-[1550px] mx-auto w-full">
            {/* Dynamic Step Indicator */}
            <div className="flex justify-center mb-6">
              <div className="text-lg font-bold">
                Step {currentStep} of 5
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-6">Post a Service Request</h2>

            {/* Step 1: Title */}
            {currentStep === 1 && (
              <StepTitle
                title={title}
                setTitle={setTitle}
                handleNext={handleNext}
              />
            )}

            {/* Step 2: Description */}
            {currentStep === 2 && (
              <StepDescription
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {/* Step 3, 4, 5 would follow the same pattern for the rest of the form */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPostRequest;
