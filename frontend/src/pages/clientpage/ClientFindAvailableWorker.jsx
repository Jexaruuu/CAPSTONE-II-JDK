import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 mr-1.5 mb-1.5">
    {children}
  </span>
);

const FiltersPanel = ({ value, onChange }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const set = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <aside className="w-full sm:w-72 lg:w-80 shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="text-sm font-semibold text-gray-900 mb-3">Talent badge</div>
        <div className="space-y-2 mb-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.badges?.trp}
              onChange={(e) => set({ badges: { ...local.badges, trp: e.target.checked } })}
            />
            Top Rated Plus
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.badges?.tr}
              onChange={(e) => set({ badges: { ...local.badges, tr: e.target.checked } })}
            />
            Top Rated
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.badges?.rt}
              onChange={(e) => set({ badges: { ...local.badges, rt: e.target.checked } })}
            />
            Rising Talent
          </label>
        </div>

        <div className="text-sm font-semibold text-gray-900 mb-3">Hourly rate</div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={local.rateMin ?? ""}
            onChange={(e) => set({ rateMin: e.target.value ? Number(e.target.value) : undefined })}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={local.rateMax ?? ""}
            onChange={(e) => set({ rateMax: e.target.value ? Number(e.target.value) : undefined })}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
          />
        </div>

        <div className="text-sm font-semibold text-gray-900 mb-3">Location</div>
        <input
          type="text"
          placeholder="City, country or region"
          value={local.location ?? ""}
          onChange={(e) => set({ location: e.target.value })}
          className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm outline-none mb-5"
        />

        <div className="text-sm font-semibold text-gray-900 mb-3">Talent time zones</div>
        <input
          type="text"
          placeholder="Select time zones"
          value={local.timezones ?? ""}
          onChange={(e) => set({ timezones: e.target.value })}
          className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm outline-none mb-5"
        />

        <div className="text-sm font-semibold text-gray-900 mb-3">Talent type</div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="talentType"
              checked={local.talentType === "both"}
              onChange={() => set({ talentType: "both" })}
            />
            Freelancers & Agencies
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="talentType"
              checked={local.talentType === "freelancers"}
              onChange={() => set({ talentType: "freelancers" })}
            />
            Freelancers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="talentType"
              checked={local.talentType === "agencies"}
              onChange={() => set({ talentType: "agencies" })}
            />
            Agencies
          </label>
        </div>
      </div>
    </aside>
  );
};

const WorkerCard = ({ item }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <img
            src={item.avatar || "/Clienticon.png"}
            alt={item.name}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{item.name}</p>
              {item.badges?.includes("boosted") && (
                <span className="text-[11px] rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5">
                  Boosted
                </span>
              )}
            </div>
            <h3 className="text-[15px] md:text-base font-medium text-gray-900 mt-0.5">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{item.location}</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">${item.rate}/hr</span>
              </div>
              {item.jobSuccess && (
                <div className="flex items-center gap-1 text-gray-700">
                  <span className="text-[#008cfc]">●</span>
                  {item.jobSuccess}% Job Success
                </div>
              )}
              {item.earned && <div className="text-gray-700">{item.earned}+ earned</div>}
              {item.availableNow && (
                <div className="text-[#6b21a8] text-xs bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                  Available now
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap">
              {item.skills.slice(0, 7).map((s, idx) => (
                <Badge key={idx}>{s}</Badge>
              ))}
              {item.skills.length > 7 && <Badge>+{item.skills.length - 7}</Badge>}
            </div>

            {item.highlights?.length > 0 && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <ul className="list-disc ml-4 text-sm text-gray-700 space-y-1">
                  {item.highlights.slice(0, 3).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-3">
          <button className="rounded-lg border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">
            Invite to job
          </button>
          <button className="h-9 w-9 grid place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">
            ❤
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ClientFindAvailableWorker() {
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    badges: {},
    rateMin: undefined,
    rateMax: undefined,
    location: "",
    timezones: "",
    talentType: "both",
  });
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/client/workers/search`, {
          withCredentials: true,
          params: {
            q: query || undefined,
            rateMin: filters.rateMin,
            rateMax: filters.rateMax,
            location: filters.location || undefined,
            tz: filters.timezones || undefined,
            type: filters.talentType,
            trp: filters.badges?.trp ? 1 : 0,
            tr: filters.badges?.tr ? 1 : 0,
            rt: filters.badges?.rt ? 1 : 0,
            page,
          },
        });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((w, i) => ({
            id: w.id ?? `${i}`,
            name: w.name ?? "Unnamed",
            title: w.title ?? "Professional",
            avatar: w.avatar,
            location: w.location ?? "Unknown",
            rate: w.rate ?? 30,
            jobSuccess: w.jobSuccess ?? 100,
            earned: w.earned ?? "$0",
            availableNow: !!w.availableNow,
            badges: w.badges || [],
            skills: w.skills || [],
            highlights: w.highlights || [],
          }));
          setWorkers(normalized);
        }
      } catch {
        if (!cancelled) {
          setWorkers([
            {
              id: "w1",
              name: "Yuri Y.",
              title:
                "SaaS Growth Marketing | Google Ads, LinkedIn Ads, PPC, CRO, Meta Ads",
              avatar: "/Clienticon.png",
              location: "Cyprus",
              rate: 49,
              jobSuccess: 99,
              earned: "$3M+",
              availableNow: true,
              badges: ["boosted"],
              skills: [
                "PPC Campaign Setup & Management",
                "Pay Per Click Advertising",
                "Facebook Advertising",
                "Search Engine Marketing",
                "Google Analytics",
                "A/B Testing",
                "Conversion Rate Optimization",
                "B2B Marketing",
              ],
              highlights: [
                "Experience managing PPC across Google, Meta, and LinkedIn.",
                "High client satisfaction and repeat engagements.",
              ],
            },
            {
              id: "w2",
              name: "Noor M.",
              title:
                "Lead Generation | Data Entry | Contact Information Sourcing Expert",
              avatar: "/Clienticon.png",
              location: "India",
              rate: 5,
              jobSuccess: 100,
              earned: "$20K+",
              availableNow: true,
              skills: [
                "Data Entry",
                "List Building",
                "Lead Generation",
                "Online Research",
                "Web Scraping",
                "B2B Marketing",
                "Email List",
              ],
              highlights: ["Fast turnarounds", "Clean and verified leads"],
            },
             {
              id: "w2",
              name: "Noor M.",
              title:
                "Lead Generation | Data Entry | Contact Information Sourcing Expert",
              avatar: "/Clienticon.png",
              location: "India",
              rate: 5,
              jobSuccess: 100,
              earned: "$20K+",
              availableNow: true,
              skills: [
                "Data Entry",
                "List Building",
                "Lead Generation",
                "Online Research",
                "Web Scraping",
                "B2B Marketing",
                "Email List",
              ],
              highlights: ["Fast turnarounds", "Clean and verified leads"],
            },
             {
              id: "w2",
              name: "Noor M.",
              title:
                "Lead Generation | Data Entry | Contact Information Sourcing Expert",
              avatar: "/Clienticon.png",
              location: "India",
              rate: 5,
              jobSuccess: 100,
              earned: "$20K+",
              availableNow: true,
              skills: [
                "Data Entry",
                "List Building",
                "Lead Generation",
                "Online Research",
                "Web Scraping",
                "B2B Marketing",
                "Email List",
              ],
              highlights: ["Fast turnarounds", "Clean and verified leads"],
            },
             {
              id: "w2",
              name: "Noor M.",
              title:
                "Lead Generation | Data Entry | Contact Information Sourcing Expert",
              avatar: "/Clienticon.png",
              location: "India",
              rate: 5,
              jobSuccess: 100,
              earned: "$20K+",
              availableNow: true,
              skills: [
                "Data Entry",
                "List Building",
                "Lead Generation",
                "Online Research",
                "Web Scraping",
                "B2B Marketing",
                "Email List",
              ],
              highlights: ["Fast turnarounds", "Clean and verified leads"],
            },
             {
              id: "w2",
              name: "Noor M.",
              title:
                "Lead Generation | Data Entry | Contact Information Sourcing Expert",
              avatar: "/Clienticon.png",
              location: "India",
              rate: 5,
              jobSuccess: 100,
              earned: "$20K+",
              availableNow: true,
              skills: [
                "Data Entry",
                "List Building",
                "Lead Generation",
                "Online Research",
                "Web Scraping",
                "B2B Marketing",
                "Email List",
              ],
              highlights: ["Fast turnarounds", "Clean and verified leads"],
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, filters, page]);

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.title.toLowerCase().includes(q) ||
        w.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [workers, query]);

  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = filteredWorkers.slice(start, end);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <ClientNavigation />

      <div className="flex-1 flex flex-col">
        <header className="mx-auto w-full max-w-[1525px] px-6 pt-6 md:pt-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white w-full md:w-[520px]">
              <span className="text-gray-500 text-lg">🔍︎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="border-none outline-none text-black w-full h-full placeholder:text-gray-400 bg-transparent"
              />
            </div>
            <button
              type="button"
              className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition"
              onClick={() => setQuery(query.trim())}
            >
              Search
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1525px] px-6 mt-6 pb-12">
          <div className="flex flex-col sm:flex-row gap-6">
            <FiltersPanel value={filters} onChange={setFilters} />
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{filteredWorkers.length} results</span>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                  <div className="h-5 w-64 bg-gray-200 rounded" />
                  <div className="mt-3 h-3 w-40 bg-gray-200 rounded" />
                  <div className="mt-5 h-3 w-52 bg-gray-200 rounded" />
                </div>
              ) : pageItems.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
                  No workers found.
                </div>
              ) : (
                pageItems.map((w) => <WorkerCard key={w.id} item={w} />)
              )}

              {!loading && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </div>
                  <nav className="flex items-center gap-2">
                    <button
                      className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </button>
                    <button className="h-9 min-w-9 px-3 rounded-md border border-[#008cfc] bg-[#008cfc] text-white">
                      {page}
                    </button>
                    <button
                      className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ›
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto w-full">
        <ClientFooter />
      </div>
    </div>
  );
}
