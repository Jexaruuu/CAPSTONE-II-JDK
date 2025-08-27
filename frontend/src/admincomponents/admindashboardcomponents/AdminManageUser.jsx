import React from 'react';
import { Hammer, Zap, Wrench, Car, Shirt, TrendingUp } from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

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
      <div className="flex items-start justify-between">
        <div className="text-gray-900 font-semibold">{title}</div>
        <div className="h-9 w-9 rounded-lg border border-gray-400 text-[#008cfc] flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>

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

const inDemandWorks = [
  { title: 'Carpentry',        Icon: Hammer, primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
  { title: 'Electrical Works', Icon: Zap,    primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
  { title: 'Plumbing',         Icon: Wrench, primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
  { title: 'Car Washing',      Icon: Car,    primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
  { title: 'Laundry',          Icon: Shirt,  primaryLabel: 'Requests', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Completion', secondaryValue: '0%', secondaryDelta: '+0.00%' },
];

const inDemandWorkers = [
  { title: 'Carpenter',         Icon: Hammer, primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
  { title: 'Electrician',       Icon: Zap,    primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
  { title: 'Plumber',           Icon: Wrench, primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
  { title: 'Car Washer',        Icon: Car,    primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
  { title: 'Laundry Attendant', Icon: Shirt,  primaryLabel: 'Hires', primaryValue: '0', primaryDelta: '+0.00%', secondaryLabel: 'Rating', secondaryValue: '0.0', secondaryDelta: '+0.00%' },
];

const barangayData = [
  { name: 'Alangilan', requests: 14000, completed: 12000 },
  { name: 'Alijis', requests: 17000, completed: 9000  },
  { name: 'Banago', requests: 5000,  completed: 22000 },
  { name: 'Bata', requests: 16000, completed: 6000  },
  { name: 'Cabug', requests: 12000, completed: 11000 },
  { name: 'Estefania', requests: 16500, completed: 14000 },
  { name: 'Felisa', requests: 21000, completed: 10500 },
  { name: 'Granada', requests: 21000, completed: 10500 },
  { name: 'Handumanan', requests: 21000, completed: 10500 },
  { name: 'Lopez Jaena', requests: 21000, completed: 10500 },
  { name: 'Mandalagan', requests: 21000, completed: 10500 },
  { name: 'Mansilingan', requests: 21000, completed: 10500 },
  { name: 'Montevista', requests: 21000, completed: 10500 },
  { name: 'Pahanocoy', requests: 21000, completed: 10500 },
  { name: 'Punta Taytay', requests: 21000, completed: 10500 },
  { name: 'Singcang-Airport', requests: 21000, completed: 10500 },
  { name: 'Sum-ag', requests: 21000, completed: 10500 },
  { name: 'Taculing', requests: 21000, completed: 10500 },
  { name: 'Tangub', requests: 21000, completed: 10500 },
  { name: 'Villa Esperanza', requests: 21000, completed: 10500 },
];

const formatK = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v);

export default function AdminManageUser() {
  return (
    <main className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Check here what's in-demand works and workers here.</p>
      </div>

      <section className="mt-8">
        <div className="-mx-6">
          <div className="px-6 flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Work Stats</h2>
          </div>

          <div className="relative">
            <div
              className="px-6 overflow-x-auto pb-2"
              role="region"
              aria-label="In-demand works"
            >
              <div className="flex gap-4 snap-x snap-mandatory" data-card-list>
                {inDemandWorks.map(({ title, Icon, primaryLabel, primaryValue, primaryDelta, secondaryLabel, secondaryValue, secondaryDelta }) => (
                  <div key={title} className="min-w-[302px] snap-start" data-card>
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
        </div>
      </section>

      <section className="mt-8">
        <div className="-mx-6">
          <div className="px-6 flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Worker Stats</h2>
          </div>

          <div className="relative">
            <div
              className="px-6 overflow-x-auto pb-2"
              role="region"
              aria-label="In-demand workers"
            >
              <div className="flex gap-4 snap-x snap-mandatory" data-card-list>
                {inDemandWorkers.map(({ title, Icon, primaryLabel, primaryValue, primaryDelta, secondaryLabel, secondaryValue, secondaryDelta }) => (
                  <div key={title} className="min-w-[302px] snap-start" data-card>
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
        </div>
      </section>

      <section className="mt-8">
        <div className="-mx-6">
          <div className="px-6 flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Service Requests by Barangay</h2>
          </div>

          <div className="px-6">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
              <div className="h-[175px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barangayData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tickFormatter={formatK}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip formatter={(val) => Number(val).toLocaleString()} />
                    <Legend verticalAlign="bottom" height={28} />
                    <Bar name="Requests"  dataKey="requests"  fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar name="Completed" dataKey="completed" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
