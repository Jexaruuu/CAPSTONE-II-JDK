import React from 'react';
import Navigation from '../../homecomponents/Navigation';
import HeroSection from '../../homecomponents/HeroSection';
import WhyChooseUsSection from '../../homecomponents/WhyChooseUsSection';
import AvailableServiceSection from '../../homecomponents/AvailableServiceSection';
import WorkingProcessSection from '../../homecomponents/WorkingProcessSection';
import Footer from '../../homecomponents/Footer'
import ContactUsSection from '../../homecomponents/ContactUsSection';
import FAQSection from '../../homecomponents/FAQSection';

const HomePage = () => {
  return (
    <div className="font-sans bg-white">
      <Navigation />
      <HeroSection />
      <WhyChooseUsSection />
      <AvailableServiceSection />
      <WorkingProcessSection />
      <FAQSection />
      <ContactUsSection />
      <Footer />
    </div>
  );
};

export default HomePage;
