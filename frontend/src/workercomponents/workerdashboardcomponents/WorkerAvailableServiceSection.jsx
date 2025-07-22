import React from 'react';

const services = [
  {
    image: '/Carpentry.jpg',
    title: 'Carpentry',
    description: 'Need help with carpentry? Book a carpenter today and enjoy hassle-free service right at your doorstep!',
  },
  {
    image: '/Electrician2.jpg',
    title: 'Electrical Works',
    description: 'Have electrical issues? Book an expert today for quick and reliable electrical services, right at your home!',
  },
  {
    image: '/Plumbing.jpg',
    title: 'Plumbing',
    description: 'Got plumbing problems? Book a plumber now for fast and reliable service to fix leaks, pipes, and more!',
  },
  {
    image: '/Carwasher.jpg',
    title: 'Car Washing',
    description: 'Want a spotless car? Book a car wash today and enjoy a clean, shiny ride without the hassle!',
  },
  {
    image: '/Laundry.jpg', 
    title: 'Laundry',
    description: 'Need your clothes cleaned? Book a laundry service today for fresh, clean clothes delivered right to your door!',
  },
];

const WorkerAvailableServiceSection = () => {
  return (
    <section id="services" className="bg-white py-20">
      <div className="max-w-[1525px] mx-auto px-6">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          At JDK HOMECARE,
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          Need help at home? Just post a service request and we’ll connect you with trusted workers. From quick fixes to regular upkeep, we’re here to make your home safer, cleaner, and worry-free.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="relative group rounded-md overflow-hidden p-4 bg-white border border-gray-300 transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl"
            >
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-36 object-cover rounded-xl mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkerAvailableServiceSection;
