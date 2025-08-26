import React, { useRef } from 'react';
import AdminSideNavigation from '../../admincomponents/AdminSideNavigation';
import AdminTopNavigation from '../../admincomponents/AdminTopNavigation';
import {
  Hammer,
  Zap,
  Wrench,
  Car,
  Shirt,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/** Small reusable card that matches the screenshot’s style */
const StatsCard = ({
  title,
  Icon = TrendingUp,
  primaryLabel = 'Completed',
  primaryValue = '0',
  primaryDelta = '+0.00%',
  secondaryLabel = 'Pending',
  secondaryValue = '0',
  secondaryDelta = '+0.00%',
}) => {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
      {/* Header: Title + Icon */}
      <div className="flex items-start justify-between">
        <div className="text-gray-900 font-semibold">{title}</div>
        <div className="h-9 w-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Metrics: two columns, like the example */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div>
          <div className="text-sm text-gray-500">{primaryLabel}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-semibold text-gray-900">{primaryValue}</div>
            <div className="text-sm font-medium text-emerald-600">{primaryDelta}</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">{secondaryLabel}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-semibold text-gray-900">{secondaryValue}</div>
            <div className="text-sm font-medium text-emerald-600">{secondaryDelta}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboardPage = () => {
  // Placeholder data per category (feel free to wire these to real values later)
  const cards = [
    { title: 'Carpentry',        Icon: Hammer },
    { title: 'Electrical Works', Icon: Zap },
    { title: 'Plumbing',         Icon: Wrench },
    { title: 'Car Washing',      Icon: Car },
    { title: 'Laundry',          Icon: Shirt },
  ];

  // ✅ NEW: Placeholder ribbons
  const inDemandWorks = [
    { title: 'Carpentry',        Icon: Hammer, primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
    { title: 'Electrical Works', Icon: Zap,    primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
    { title: 'Plumbing',         Icon: Wrench, primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
    { title: 'Car Washing',      Icon: Car,    primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
    { title: 'Laundry',          Icon: Shirt,  primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
  ];

  const inDemandWorkers = [
    { title: 'Carpenter',            Icon: Hammer, primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
    { title: 'Electrician',          Icon: Zap,    primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
    { title: 'Plumber',              Icon: Wrench, primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
    { title: 'Car Washer',           Icon: Car,    primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
    { title: 'Laundry Attendant',    Icon: Shirt,  primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
  ];

  // ✅ NEW: refs + scroll helpers for the ribbons
  const worksRef = useRef(null);
  const workersRef = useRef(null);

  const scrollByAmount = (ref, dir = 1) => {
    const node = ref.current;
    if (!node) return;
    const cardWidth = 340; // ~min-w + gap
    node.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex bg-indigo-50/30">
      <AdminSideNavigation />

      <div className="flex-1 flex flex-col">
        <AdminTopNavigation />

        <main className="p-6">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Check here what's in-demand works and workers here.</p>
          </div>

          {/* ✅ In-demand Works (horizontal scroll + arrow buttons) */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">In-demand Works (placeholder)</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => scrollByAmount(worksRef, -1)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Scroll left Works"
                  title="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(worksRef, 1)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Scroll right Works"
                  title="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="-mx-6 relative">
              <div
                ref={worksRef}
                className="px-6 overflow-x-auto pb-2"
                role="region"
                aria-label="In-demand works"
              >
                <div className="flex gap-4 snap-x snap-mandatory">
                  {inDemandWorks.map(({ title, Icon, primaryLabel, primaryValue, primaryDelta, secondaryLabel, secondaryValue, secondaryDelta }) => (
                    <div key={title} className="min-w-[320px] snap-start">
                      <StatsCard
                        title={title}
                        Icon={Icon}
                        primaryLabel={primaryLabel}
                        primaryValue={primaryValue}
                        primaryDelta={primaryDelta}
                        secondaryLabel={secondaryLabel}
                        secondaryValue={secondaryValue}
                        secondaryDelta={secondaryDelta}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ✅ In-demand Workers (horizontal scroll + arrow buttons) */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">In-demand Workers (placeholder)</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => scrollByAmount(workersRef, -1)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Scroll left Workers"
                  title="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(workersRef, 1)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Scroll right Workers"
                  title="Scroll right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="-mx-6 relative">
              <div
                ref={workersRef}
                className="px-6 overflow-x-auto pb-2"
                role="region"
                aria-label="In-demand workers"
              >
                <div className="flex gap-4 snap-x snap-mandatory">
                  {inDemandWorkers.map(({ title, Icon, primaryLabel, primaryValue, primaryDelta, secondaryLabel, secondaryValue, secondaryDelta }) => (
                    <div key={title} className="min-w-[320px] snap-start">
                      <StatsCard
                        title={title}
                        Icon={Icon}
                        primaryLabel={primaryLabel}
                        primaryValue={primaryValue}
                        primaryDelta={primaryDelta}
                        secondaryLabel={secondaryLabel}
                        secondaryValue={secondaryValue}
                        secondaryDelta={secondaryDelta}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
