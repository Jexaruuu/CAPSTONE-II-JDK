import React from 'react';
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
  ];

  return (
    <div className="max-w-[1525px] mx-auto px-6 py-10 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Explore Skilled Workers</h2>
        <a
          href="/browse-workers"
          className="text-green-600 flex items-center gap-1 font-medium hover:underline"
        >
          Browse all workers <ArrowRight size={16} />
        </a>
      </div>

      {/* Arrows - placed outside the scroll container */}
      <button className="absolute left-4 top-[55%] transform -translate-y-1/2 bg-white border rounded-full shadow p-1 z-10">
        <ArrowLeft size={20} />
      </button>
      <button className="absolute right-4 top-[55%] transform -translate-y-1/2 bg-white border rounded-full shadow p-1 z-10">
        <ArrowRight size={20} />
      </button>

      {/* Scrollable Worker Cards */}
      <div className="overflow-x-auto no-scrollbar px-6">
        <div className="flex space-x-4 ml-3">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="min-w-[270px] h-[280px] flex-shrink-0 border border-gray-200 rounded-lg p-8 text-center bg-white hover:shadow-md transition"
            >
              <img
                src={worker.image}
                alt={worker.name}
                className="w-24 h-24 object-cover rounded-full mx-auto mb-4"
              />
              <p className="text-md font-semibold">{worker.name}</p>
              <p className="text-sm text-gray-600">{worker.skill}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientAvailableWorkers;
