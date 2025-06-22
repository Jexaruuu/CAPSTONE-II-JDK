import React from 'react';
import Navigation from '../../components/Navigation';
import HeroSection from '../../components/HeroSection';
import WhyChooseUsSection from '../../components/WhyChooseUsSection';
import AvailableServiceSection from '../../components/AvailableServiceSection';
import WorkingProcessSection from '../../components/WorkingProcessSection';
import Footer from '../../components/Footer'
import ContactUsSection from '../../components/ContactUsSection';
import FAQSection from '../../components/FAQSection';

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
