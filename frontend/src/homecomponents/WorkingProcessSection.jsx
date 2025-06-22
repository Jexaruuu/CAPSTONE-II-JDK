import React from 'react';

const steps = [
  {
    title: 'Sign Up or Log In',
    description: 'Whether you\'re a client or a worker, you need to sign up or log in to get started. If you\'re a client, book a service. If you\'re a worker, post your application to offer your skills.',
    linkText: 'Sign Up or Log In'
  },
  {
    title: 'Book a Service or Apply to Work',
    description: 'Clients can easily book services online or via phone. Workers can apply to available service requests or offer their expertise.',
    linkText: 'Get Started'
  },
  {
    title: 'Admin Verification',
    description: 'Once you\'ve applied, our admin team will verify all applications to ensure everyone is legitimate and ready to work.',
    linkText: 'Check Status'
  },
  {
    title: 'Get the Job Done',
    description: 'Once verified, the worker or client will begin the job. Our team makes sure everything is done professionally and to your satisfaction!',
    linkText: 'See How It Works'
  },
];

const WorkingProcessSection = () => {
  return (
    <section className="bg-[white] mb-12">
      <div className="max-w-[1525px] mx-auto px-6">
        <div className="flex items-start">
          <div className="flex-1 text-left">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Our Simple Process</h2>
            <p className="text-lg text-gray-700 mb-12 max-w-2xl">
              At <span className="text-[#008cfc]">JDK HOMECARE</span>, we make home service easy and stress-free. Here's how it works.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="cursor-pointer relative group flex flex-col justify-between rounded-md overflow-hidden p-6 bg-white border border-gray-300 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl"
            >
              {/* Removed the icon (img) tag */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#008cfc] transition-colors duration-300">{step.title}</h3>
              <p className="text-sm text-gray-600 mb-4 flex-grow">{step.description}</p>
              <a
                href="#"
                className="text-sm font-medium text-gray-800 group-hover:text-[#008cfc] flex items-center transition-all duration-300"
              >
                {step.linkText} 
                <span className="ml-2 transform group-hover:translate-x-2 transition-all duration-300">➜</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkingProcessSection;
