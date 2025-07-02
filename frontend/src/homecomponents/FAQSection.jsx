import React, { useState } from "react";

const faqs = [
  {
    question: "What services does JDK HOMECARE offer?",
    answer: "We provide home maintenance and repair services like plumbing, electrical, cleaning, and general handyman tasks."
  },
  {
    question: "How quickly can I get a service appointment?",
    answer: "We aim to schedule your service as soon as possible, depending on our workers' availability and how urgent the job is. We’ll work with you to find a time that fits your needs."
  },
  {
    question: "Are your workers qualified?",
    answer: "Yes! Our admin team carefully verifies each worker to ensure they are legitimate and meet our high standards before they’re allowed to work with us."
  },
  {
    question: "What areas do you service?",
    answer: "We offer services exclusively in Bacolod City. Contact us for more details!"
  },
  {
    question: "How are your service prices determined?",
    answer: "Pricing depends on how urgent the service is, the difficulty of the work, and the worker’s rate. We ensure fair pricing and provide free quotes."
  },
  {
    question: "Do you offer warranties on your work?",
    answer: "Yes, we provide warranties on our services to guarantee quality and your satisfaction."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept payments via GCash, PayMaya, and credit card for your convenience."
  },
  {
    question: "Can I schedule regular maintenance services?",
    answer: "Yes! We offer flexible maintenance plans to keep your home in great shape, based on your needs."
  },
];

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const handleToggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 mt-12 bg-white">
      <div className="max-w-[1525px] mx-auto px-6">
        {/* Title and Description */}
        <div className="text-left mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">JDK HOMECARE FAQs</h2>
          <p className="text-lg text-gray-700 mt-4">
            Have questions about <span className="text-[#008cfc]">JDK HOMECARE</span>? We’ve got answers! Here’s a list of common questions we receive to help you get the information you need quickly.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {faqs.map((faq, index) => (
            <div key={index} className="cursor-pointer relative group flex flex-col justify-between rounded-md overflow-hidden p-6 bg-white border border-gray-300 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl">
              <div onClick={() => handleToggle(index)} className="flex justify-between items-center cursor-pointer">
                <h3 className="text-md font-semibold text-gray-900 mb-2 group-hover:text-[#008cfc] transition-colors duration-300">{faq.question}</h3>
                <span className="text-[#008CFC] font-semibold">{activeIndex === index ? "-" : "+"}</span>
              </div>
              {activeIndex === index && <p className="mt-4 text-md text-gray-600">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
