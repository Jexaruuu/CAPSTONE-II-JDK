import React, { useState } from 'react';
import ClientNavigation from '../../clientcomponents/ClientNavigation';
import ClientInformation from '../../clientcomponents/requestcomponents/ClientInformation';
import ClientServiceRequestDetails from '../../clientcomponents/requestcomponents/ClientServiceRequestDetails';
import ClientServiceRate from '../../clientcomponents/requestcomponents/ClientServiceRate';
import ClientReviewServiceRequest from '../../clientcomponents/requestcomponents/ClientReviewServiceRequest';
import ClientTermsAndAgreements from '../../clientcomponents/requestcomponents/ClientTermsAndAgreements';
import ClientFooter from '../../clientcomponents/ClientFooter';

const TOTAL_STEPS = 5;

const ClientPostRequest = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = () => setCurrentStep((prevStep) => prevStep + 1);
  const handleBack = () => setCurrentStep((prevStep) => prevStep - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Service request submitted:', { title, description });
  };

  const stepTitles = {
    1: 'Step 1: Client Information',
    2: 'Step 2: Describe Your Request',
    3: 'Step 3: Set Your Price Rate',
    4: 'Step 4: Terms & Agreements',
    5: 'Step 5: Review & Submit',
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <div className="fixed top-0 inset-x-0 z-[110]">
        <ClientNavigation />
      </div>
      <div className="h-[72px]" />

      <div className="max-w-[1550px] mx-auto px-6 py-12">
        <div className="flex flex-col min-h-[calc(100vh-200px)]">
          <div className="max-w-[1550px] mx-auto w-full">
            <div className="flex justify-start mb-6 ml-3">
              <div className="text-lg font-extralight">
                {currentStep} of {TOTAL_STEPS} | Post a Service Request
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-6 ml-3">{stepTitles[currentStep]}</h2>

            {currentStep === 1 && (
              <ClientInformation title={title} setTitle={setTitle} handleNext={handleNext} />
            )}

            {currentStep === 2 && (
              <ClientServiceRequestDetails
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <ClientServiceRate
                title={title}
                setTitle={setTitle}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 4 && (
                          <ClientTermsAndAgreements
                            description={description}
                            setDescription={setDescription}
                            handleNext={handleNext}
                            handleBack={handleBack}
                          />
                        )}

            {currentStep === 5 && (
              <ClientReviewServiceRequest
                title={title}
                setTitle={setTitle}
                handleNext={handleNext}
                handleBack={() => setCurrentStep(3)}
              />
            )}
          </div>
        </div>
      </div>
      <ClientFooter />
    </div>
  );
};

export default ClientPostRequest;
