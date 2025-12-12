import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

const baseWorks = [
  { key: 'carpentry',        title: 'Carpentry',        Icon: Hammer },
  { key: 'electrical works', title: 'Electrical Works', Icon: Zap },
  { key: 'plumbing',         title: 'Plumbing',         Icon: Wrench },
  { key: 'car washing',      title: 'Car Washing',      Icon: Car },
  { key: 'laundry',          title: 'Laundry',          Icon: Shirt },
];

const baseWorkers = [
  { key: 'carpentry',        title: 'Carpenter',         Icon: Hammer },
  { key: 'electrical works', title: 'Electrician',       Icon: Zap },
  { key: 'plumbing',         title: 'Plumber',           Icon: Wrench },
  { key: 'car washing',      title: 'Car Washer',        Icon: Car },
  { key: 'laundry',          title: 'Laundry Attendant', Icon: Shirt },
];

const staticWorkCards = baseWorks.map(({ title, Icon }) => ({
  title,
  Icon,
  primaryLabel: 'Requests',
  primaryValue: '0',
  primaryDelta: '+0.00%',
  secondaryLabel: 'Completion',
  secondaryValue: '0%',
  secondaryDelta: '+0.00%',
}));

const staticWorkerCards = baseWorkers.map(({ title, Icon }) => ({
  title,
  Icon,
  primaryLabel: 'Hires',
  primaryValue: '0',
  primaryDelta: '+0.00%',
  secondaryLabel: 'Rating',
  secondaryValue: '0.0',
  secondaryDelta: '+0.00%',
}));

const staticBarangayData = [
  { name: 'Alangilan', requests: 0, completed: 0 },
  { name: 'Alijis', requests: 0, completed: 0 },
  { name: 'Banago', requests: 0, completed: 0 },
  { name: 'Bata', requests: 0, completed: 0 },
  { name: 'Cabug', requests: 0, completed: 0 },
  { name: 'Estefania', requests: 0, completed: 0 },
  { name: 'Felisa', requests: 0, completed: 0 },
  { name: 'Granada', requests: 0, completed: 0 },
  { name: 'Handumanan', requests: 0, completed: 0 },
  { name: 'Lopez Jaena', requests: 0, completed: 0 },
  { name: 'Mandalagan', requests: 0, completed: 0 },
  { name: 'Mansilingan', requests: 0, completed: 0 },
  { name: 'Montevista', requests: 0, completed: 0 },
  { name: 'Pahanocoy', requests: 0, completed: 0 },
  { name: 'Punta Taytay', requests: 0, completed: 0 },
  { name: 'Singcang-Airport', requests: 0, completed: 0 },
  { name: 'Sum-ag', requests: 0, completed: 0 },
  { name: 'Taculing', requests: 0, completed: 0 },
  { name: 'Tangub', requests: 0, completed: 0 },
  { name: 'Villa Esperanza', requests: 0, completed: 0 },
];

const zeroBarangayData = staticBarangayData;

const formatK = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v);

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase();
}

export default function DashboardMenu() {
  const [workCards, setWorkCards] = useState(staticWorkCards);
  const [workerCards, setWorkerCards] = useState(staticWorkerCards);
  const [barangayRows, setBarangayRows] = useState(zeroBarangayData);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [requestsRes, workersRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/clientservicerequests/open`, { params: { limit: 500 } }),
          axios.get(`${API_BASE}/api/workerapplications/public/approved`, { params: { limit: 500 } }),
        ]);

        const reqItems =
          requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value?.data?.items)
            ? requestsRes.value.data.items
            : [];

        const wrkItems =
          workersRes.status === 'fulfilled' && Array.isArray(workersRes.value?.data?.items)
            ? workersRes.value.data.items
            : [];

        const serviceTypeCount = {};
        const barangayCount = {};

        reqItems.forEach((r) => {
          const st = normalizeKey(r?.details?.service_type);
          if (st) serviceTypeCount[st] = (serviceTypeCount[st] || 0) + 1;
          const brgy = String(r?.info?.barangay || '').trim();
          if (brgy) barangayCount[brgy] = (barangayCount[brgy] || 0) + 1;
        });

        const workerTypeCount = {};
        wrkItems.forEach((w) => {
          const arr = Array.isArray(w?.work?.service_types) ? w.work.service_types : [];
          arr.forEach((t) => {
            const k = normalizeKey(t);
            if (k) workerTypeCount[k] = (workerTypeCount[k] || 0) + 1;
          });
        });

        const nextWorkCards = baseWorks.map(({ key, title, Icon }) => {
          const cnt = serviceTypeCount[key] || 0;
          return {
            title,
            Icon,
            primaryLabel: 'Requests',
            primaryValue: String(cnt),
            primaryDelta: '+0.00%',
            secondaryLabel: 'Completion',
            secondaryValue: '0%',
            secondaryDelta: '+0.00%',
          };
        });

        const nextWorkerCards = baseWorkers.map(({ key, title, Icon }) => {
          const cnt = workerTypeCount[key] || 0;
          return {
            title,
            Icon,
            primaryLabel: 'Hires',
            primaryValue: String(cnt),
            primaryDelta: '+0.00%',
            secondaryLabel: 'Rating',
            secondaryValue: '0.0',
            secondaryDelta: '+0.00%',
          };
        });

        const barangayList = Object.keys(barangayCount).sort();
        const nextBarangay = barangayList.length
          ? barangayList.map((name) => ({
              name,
              requests: barangayCount[name],
              completed: 0,
            }))
          : zeroBarangayData;

        if (!cancelled) {
          setWorkCards(nextWorkCards);
          setWorkerCards(nextWorkerCards);
          setBarangayRows(nextBarangay);
        }
      } catch {}
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inDemandWorks = useMemo(() => workCards, [workCards]);
  const inDemandWorkers = useMemo(() => workerCards, [workerCards]);
  const barangayData = useMemo(() => barangayRows, [barangayRows]);

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
                  <div key={title} className="min-w=[302px] snap-start" data-card>
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
