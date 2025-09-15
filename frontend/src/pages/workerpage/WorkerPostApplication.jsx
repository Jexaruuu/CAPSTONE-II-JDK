import React, { useState } from 'react';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerInformation from '../../workercomponents/workerpostcomponents/WorkerInformation';
import WorkerWorkInformation from '../../workercomponents/workerpostcomponents/WorkerWorkInformation';
import WorkerRequiredDocuments from '../../workercomponents/workerpostcomponents/WorkerRequiredDocuments';
import WorkerRate from '../../workercomponents/workerpostcomponents/WorkerRate';
import WorkerTermsAndAgreements from '../../workercomponents/workerpostcomponents/WorkerTermsAndAgreements';
import WorkerReviewPost from '../../workercomponents/workerpostcomponents/WorkerReviewPost';
import WorkerFooter from '../../workercomponents/WorkerFooter';

const WorkerPost = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = () => setCurrentStep((prevStep) => prevStep + 1);
  const handleBack = () => setCurrentStep((prevStep) => prevStep - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Service request submitted:', {
      title,
      description,
    });
  };

  const stepTitles = {
    1: 'Step 1: Worker Information',
    2: 'Step 2: Describe Your Work',
    3: 'Step 3: Required Documents',
    4: 'Step 5: Set Your Price Rate',
    5: 'Step 4: Terms & Agreements',
    6: 'Step 6: Review Application',
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation />
      <div className="max-w-[1550px] mx-auto px-6 py-12">
        <div className="flex flex-col min-h-[calc(100vh-200px)]">
          <div className="max-w-[1550px] mx-auto w-full">
            <div className="flex justify-start mb-6 ml-3">
              <div className="text-lg font-extralight">
                {currentStep} of 6 | Post a Worker Application
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-6 ml-3">{stepTitles[currentStep]}</h2>

            {currentStep === 1 && (
              <WorkerInformation
                title={title}
                setTitle={setTitle}
                handleNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <WorkerWorkInformation
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <WorkerRequiredDocuments
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <WorkerRate
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 5 && (
              <WorkerTermsAndAgreements
                description={description}
                setDescription={setDescription}
                handleNext={handleNext}
                handleBack={handleBack}
              />
            )}

            {currentStep === 6 && (
              <WorkerReviewPost
                handleBack={handleBack}
              />
            )}
          </div>
        </div>
      </div>
      <WorkerFooter />
    </div>
  );
};

export default WorkerPost;
