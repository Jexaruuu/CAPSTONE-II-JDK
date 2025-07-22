import React, { useRef } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const ClientAvailableWorkers = () => {
  const workers = [
    {
      id: 1,
      name: 'Juan Dela Cruz',
      skill: 'Plumber',
      image: '/workers/juan.png',
    },
    {
      id: 2,
      name: 'Maria Santos',
      skill: 'Electrician',
      image: '/workers/maria.png',
    },
    {
      id: 3,
      name: 'Pedro Reyes',
      skill: 'Carpenter',
      image: '/workers/pedro.png',
    },
    {
      id: 4,
      name: 'Ana Lopez',
      skill: 'House Cleaner',
      image: '/workers/ana.png',
    },
    {
      id: 5,
      name: 'Ana Lopez',
      skill: 'House Cleaner',
      image: '/workers/ana.png',
    },
    {
      id: 6,
      name: 'Ana Lopez',
      skill: 'House Cleaner',
      image: '/workers/ana.png',
    },
    {
      id: 7,
      name: 'Ana Lopez',
      skill: 'House Cleaner',
      image: '/workers/ana.png',
    },
  ];

  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    const container = scrollRef.current;
    const cardWidth = 270 + 24; // card width + spacing

    if (container) {
      container.scrollBy({
        left: direction === 'left' ? -cardWidth : cardWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="max-w-[1525px] mx-auto px-6 py-10 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Available Workers</h2>
        <a
          href="/browse-workers"
          className="text-[#008cfc] flex items-center gap-1 font-medium hover:underline"
        >
          Browse available workers <ArrowRight size={16} />
        </a>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full flex justify-center items-center">
        {/* Left Arrow */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
        >
          <ArrowLeft size={22} />
        </button>

        {/* Card Row Container (with inner padding) */}
        <div className="w-full max-w-[1425px] overflow-hidden px-12">
          <div
            ref={scrollRef}
            className="flex space-x-6 overflow-x-scroll scroll-smooth no-scrollbar pl-4 pr-4"
          >
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="min-w-[270px] h-[300px] flex-shrink-0 border border-gray-200 rounded-xl p-6 text-center bg-white shadow hover:shadow-lg transition duration-300"
              >
                <img
                  src={worker.image}
                  alt={worker.name}
                  className="w-24 h-24 object-cover rounded-full mx-auto mb-4 border-4 border-white shadow-inner ring-2 ring-[#008cfc]"
                />
                <p className="text-lg font-semibold text-gray-800">{worker.name}</p>
                <p className="text-sm text-gray-500">{worker.skill}</p>
                <button className="mt-4 px-4 py-2 text-sm text-white bg-[#008cfc] rounded-full hover:bg-[#0074d1] transition">
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute -right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 hover:bg-gray-100 rounded-full shadow-md p-2 z-10 transition"
        >
          <ArrowRight size={22} />
        </button>
      </div>

      {/* Hide native scrollbar styles */}
      <style>{`
        .no-scrollbar {
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Edge */
        }
      `}</style>
    </div>
  );
};

export default ClientAvailableWorkers;
