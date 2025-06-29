import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="bg-white py-12 min-h-screen">
      <div className="max-w-[1525px] mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        <div className="space-y-6">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Reliable home services for a safer, better home.<br />
             <br/>
           <span className="text-[#008cfc] font-semibold">JDK HOMECARE: Home Service and Maintenance</span>
          </h1>

          <p className="text-gray-600 text-lg">
            Connects clients with skilled workers to get their home services done. Whether you’re looking for a plumber, electrician, cleaner, or handyman, our platform makes it easy to find trusted workers. For workers, it’s a great opportunity to offer your skills and connect with clients in need of your expertise. Everyone’s home deserves the best care, and we’re here to make it happen.
          </p>
          
          <Link to ="/login">
          <button className="bg-[#008cfc] text-white font-medium py-3 px-6 rounded-md flex items-center gap-2 hover:bg-blue-700 transition mt-5">
            Book a Service Now <span>↗</span>
          </button>
          </Link>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6">
            <div>
              <p className="text-xl font-bold text-gray-900 mt-2">No cost to book</p>
              <p className="text-sm text-gray-500">Browse a wide variety of home services, from repairs to cleaning. Booking is free, with an option for urgent services at an additional charge.</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 mt-2">Book a service</p>
              <p className="text-sm text-gray-500">Quickly find the right worker for your home service. Simply request a service, or let us match you with the best tasker available.</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 mt-2">Affordable</p>
              <p className="text-sm text-gray-500">Get top-quality home services at budget-friendly prices, with transparent pricing and no hidden fees.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <img
            src="/Carpenter.jpg"
            alt="Carpenter"
            className="rounded-md object-cover w-full h-96 mt-5 ml-3"
          />
          <img
            src="/Carwash.jpg"
            alt="Carwash"
            className="rounded-md object-cover w-full h-80 mt-5 ml-3.5"
          />
          <img
            src="/Plumber2.jpg"
            alt="Plumbing"
            className="rounded-md object-cover w-full h-80 ml-3"
          />
          <img
            src="/Electrician.jpg"
            alt="Electrician"
            className="rounded-md object-cover w-full h-96 -mt-16 ml-3.5"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
