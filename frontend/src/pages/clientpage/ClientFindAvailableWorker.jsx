import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";
import { Star, Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 mr-1.5 mb-1.5">
    {children}
  </span>
);

const ServiceTypeCheckbox = ({ label, checked, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="peer sr-only"
    />
    <span
      className="relative h-5 w-5 rounded-md border border-gray-300 bg-white transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-[#008cfc] peer-checked:border-[#008cfc] grid place-items-center"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
    <span className="text-sm text-gray-900">{label}</span>
  </label>
);

const iconFor = (s) => {
  const k = String(s || "").toLowerCase();
  if (k.includes("elect")) return Zap;
  if (k.includes("plumb")) return Wrench;
  if (k.includes("car wash") || k.includes("carwash") || k.includes("auto") || k.includes("carwasher")) return Car;
  if (k.includes("laund") || k.includes("clean")) return Shirt;
  if (k.includes("carpent") || k.includes("wood")) return Hammer;
  return Hammer;
};

const FiltersPanel = ({ value, onChange }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const set = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };
  const setService = (key, val) =>
    set({ serviceTypes: { ...(local.serviceTypes || {}), [key]: val } });

  return (
    <aside className="w-full sm:w-72 lg:w-80 shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="text-sm font-semibold text-gray-900 mb-3">Service Type</div>
        <div className="space-y-3 mb-5">
          <ServiceTypeCheckbox
            label="Carwasher"
            checked={!!local.serviceTypes?.carwasher}
            onChange={(v) => setService("carwasher", v)}
          />
          <ServiceTypeCheckbox
            label="Carpenter"
            checked={!!local.serviceTypes?.carpenter}
            onChange={(v) => setService("carpenter", v)}
          />
          <ServiceTypeCheckbox
            label="Electrician"
            checked={!!local.serviceTypes?.electrician}
            onChange={(v) => setService("electrician", v)}
          />
          <ServiceTypeCheckbox
            label="Laundry"
            checked={!!local.serviceTypes?.laundry}
            onChange={(v) => setService("laundry", v)}
          />
          <ServiceTypeCheckbox
            label="Plumber"
            checked={!!local.serviceTypes?.plumber}
            onChange={(v) => setService("plumber", v)}
          />
        </div>

        <div className="text-sm font-semibold text-gray-900 mb-2">Service rate</div>
        <div className="space-y-2 mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="rateType"
              checked={local.rateType === "any"}
              onChange={() => set({ rateType: "any" })}
            />
            Any
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="rateType"
              checked={local.rateType === "hourly"}
              onChange={() => set({ rateType: "hourly" })}
            />
            Hourly Rate
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="rateType"
              checked={local.rateType === "job"}
              onChange={() => set({ rateType: "job" })}
            />
            By the Job Rate
          </label>
        </div>

        {local.rateType === "hourly" && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            <input
              type="number"
              min={0}
              placeholder="From"
              value={local.rateMin ?? ""}
              onChange={(e) =>
                set({ rateMin: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
            <input
              type="number"
              min={0}
              placeholder="To"
              value={local.rateMax ?? ""}
              onChange={(e) =>
                set({ rateMax: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
          </div>
        )}

        {local.rateType === "job" && (
          <div className="mb-5">
            <input
              type="number"
              min={0}
              placeholder="Rate"
              value={local.rateJob ?? ""}
              onChange={(e) =>
                set({ rateJob: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
          </div>
        )}

        <div className="text-sm font-semibold text-gray-900 mb-3">Location</div>
        <input
          type="text"
          placeholder="Barangay"
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
  const serviceTypes = Array.isArray(item.serviceTypeList) ? item.serviceTypeList : [];
  const serviceTasks = Array.isArray(item.serviceTaskList) ? item.serviceTaskList : [];
  const icons = (serviceTypes || []).slice(0, 5).map((lbl) => iconFor(lbl));
  const rating = 0;
  const filledStars = 0;
  const singleIcon = icons.length === 1;

  return (
    <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-inset hover:ring-[#008cfc] hover:shadow-xl">
      <div className="absolute inset-0 bg-[url('/Bluelogo.png')] bg-no-repeat bg-[length:555px] bg-[position:right_50%] opacity-10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
              <img
                src={item.avatar || "/Clienticon.png"}
                alt={item.name}
                className="h-full w-full object-cover"
                onError={({ currentTarget }) => {
                  currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight truncate">{item.name}</div>
              {item.emailAddress ? (
                <div className="text-xs text-gray-600 truncate">{item.emailAddress}</div>
              ) : null}
              <div className="mt-1 flex items-center gap-1">
                {[0,1,2,3,4].map((idx) => (
                  <Star
                    key={idx}
                    size={14}
                    className={idx < filledStars ? "text-yellow-400" : "text-gray-300"}
                    fill="currentColor"
                  />
                ))}
                <span className="text-xs font-medium text-gray-700">{`${(rating || 0).toFixed(1)}/5`}</span>
              </div>
            </div>
          </div>

          {singleIcon ? (
            <div className="relative w-18 h-18 flex items-start justify-end">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                {React.createElement(icons[0], { size: 16, className: "text-[#008cfc]" })}
              </span>
            </div>
          ) : (
            <div className="relative w-18 h-18 grid grid-cols-2 auto-rows-[minmax(0,1fr)] gap-2">
              {icons.map((Icon, idx) => {
                const pos = [
                  { gridColumn: "1", gridRow: "1" },
                  { gridColumn: "2", gridRow: "1" },
                  { gridColumn: "2", gridRow: "2" },
                  { gridColumn: "1", gridRow: "2" },
                  { gridColumn: "2", gridRow: "3" }
                ][idx] || { gridColumn: "1", gridRow: "3" };
                return (
                  <span
                    key={idx}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200"
                    style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
                  >
                    <Icon size={16} className="text-[#008cfc]" />
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 h-px bg-gray-200" />

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-gray-700">Service Type:</div>
            {(serviceTypes.length ? serviceTypes : ["—"]).map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                {lbl}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-gray-700">Service Task:</div>
            {(serviceTasks.length ? serviceTasks : ["—"]).map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                {lbl}
              </span>
            ))}
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Work Description</div>
            <div className="text-sm text-[#008cfc] line-clamp-3">{item.title || "—"}</div>
          </div>
        </div>

        <div className="mt-4 h-px bg-gray-200" />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#008cfc]">{item.location || "Philippines"}</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-[#008cfc]">{item.rateTypeLabel || "Service Rate"}</div>
              <span className="text-gray-400">•</span>
              <div className="text-sm font-semibold text-[#008cfc]">{item.displayRate || "Rate upon request"}</div>
            </div>
          </div>
          <a href="#" className="inline-flex items-center justify-center px-4 h-10 rounded-lg bg-[#008cfc] text-white text-sm font-medium hover:bg-[#0078d6] transition">
            View worker
          </a>
        </div>
      </div>

      <style>{`
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
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
    rateJob: undefined,
    rateType: "any",
    location: "",
    timezones: "",
    talentType: "both",
    serviceTypes: {}
  });
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const normalizeItems = (rows) => {
    const arr = Array.isArray(rows) ? rows : [];

    const flattenTasks = (v) => {
      const out = [];
      if (v == null) return out;
      if (Array.isArray(v)) {
        v.forEach((x) => {
          if (typeof x === "string") out.push(x);
          else if (x && typeof x === "object") {
            if (Array.isArray(x.tasks)) out.push(...x.tasks);
            else out.push(...Object.values(x));
          }
        });
      } else if (typeof v === "object") {
        if (Array.isArray(v.tasks)) out.push(...v.tasks);
        else out.push(...Object.values(v));
      } else {
        out.push(v);
      }
      return out;
    };

    return arr.map((r, i) => {
      const info = r.info || {};
      const work = r.work || {};
      const rate = r.rate || {};
      const name = [info.first_name, info.last_name].filter(Boolean).join(" ") || "Unnamed";

      const stArr = Array.isArray(work.service_types) ? work.service_types : [];
      const typeLabels = [];
      stArr.forEach((x) => {
        if (typeof x === "string") typeLabels.push(x);
        else if (x && typeof x === "object") {
          const lbl = x.category || x.name || "";
          if (lbl) typeLabels.push(String(lbl));
        }
      });
      const serviceTypeList = [...new Set(typeLabels.map((s) => String(s).trim()).filter(Boolean))];

      const serviceTaskRaw = [
        ...flattenTasks(work.service_task),
        ...flattenTasks(work.task),
        ...flattenTasks(work.serviceTask)
      ];
      stArr.forEach((x) => {
        if (x && typeof x === "object" && x.tasks) serviceTaskRaw.push(...flattenTasks(x.tasks));
      });
      const serviceTaskList = [
        ...new Set(
          serviceTaskRaw
            .map((t) => String(t))
            .flatMap((t) => t.split(/[,/|]+/))
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ];

      const primaryService = serviceTypeList[0] || "";
      const skills = [...serviceTypeList, ...serviceTaskList];

      const rawType = String(rate.rate_type || "").trim();
      const s = rawType.toLowerCase();
      const rateType = s.includes("hour") ? "hourly" : s.includes("job") || s.includes("fixed") || s.includes("flat") ? "job" : "";
      const rateTypeLabel = rawType || (rateType === "hourly" ? "Hourly Rate" : rateType === "job" ? "By the Job Rate" : "");

      const rateFrom = rate.rate_from != null ? Number(rate.rate_from) : null;
      const rateTo = rate.rate_to != null ? Number(rate.rate_to) : null;
      const rateValue = rate.rate_value != null ? Number(rate.rate_value) : null;

      let displayRate = "";
      if (rateType === "hourly") {
        const fromStr = Number.isFinite(rateFrom) && rateFrom > 0 ? `₱${rateFrom.toLocaleString()}` : "";
        const toStr = Number.isFinite(rateTo) && rateTo > 0 ? `₱${rateTo.toLocaleString()}` : "";
        if (fromStr && toStr && rateFrom !== rateTo) displayRate = `${fromStr}–${toStr}/hr`;
        else if (fromStr && !toStr) displayRate = `${fromStr}/hr`;
        else if (!fromStr && toStr) displayRate = `${toStr}/hr`;
      } else if (rateType === "job") {
        if (Number.isFinite(rateValue) && rateValue > 0) displayRate = `₱${rateValue.toLocaleString()} per job`;
      }

      const street = String(info.street || "").trim();
      const barangay = String(info.barangay || "").trim();
      const location = [barangay, street].filter(Boolean).join(", ");

      let rateNum = 0;
      if (rateType === "hourly") {
        rateNum = Number(rateFrom || rateTo || 0) || 0;
      } else if (rateType === "job") {
        rateNum = Number(rateValue || 0) || 0;
      }

      const emailAddress = info.email_address || r.email_address || r.email || "";

      return {
        id: r.id || r.request_group_id || `${i}`,
        name,
        title: work.work_description || primaryService || "Professional",
        avatar: info.profile_picture_url || "/Clienticon.png",
        location,
        rate: rateNum,
        rateType,
        rateTypeLabel,
        rateFrom,
        rateTo,
        rateValue,
        displayRate,
        jobSuccess: 100,
        earned: "",
        availableNow: false,
        badges: [],
        skills,
        highlights: [],
        serviceTypeList,
        serviceTaskList,
        emailAddress,
        raw: r
      };
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/workerapplications/public/approved`,
          {
            params: { limit: 200 },
            withCredentials: true
          }
        );
        if (!cancelled) {
          const items = Array.isArray(data?.items) ? data.items : [];
          setWorkers(normalizeItems(items));
        }
      } catch {
        if (!cancelled) setWorkers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = workers;
    if (q) {
      base = base.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.title.toLowerCase().includes(q) ||
          w.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (filters.location && filters.location.trim()) {
      const loc = filters.location.trim().toLowerCase();
      base = base.filter((w) =>
        String(w.location || "").toLowerCase().includes(loc)
      );
    }

    if (filters.rateType === "hourly") {
      base = base.filter((w) => w.rateType === "hourly");
      if (typeof filters.rateMin === "number") {
        base = base.filter((w) => {
          const lo = w.rateFrom ?? w.rate ?? 0;
          return lo >= filters.rateMin;
        });
      }
      if (typeof filters.rateMax === "number") {
        base = base.filter((w) => {
          const hi = w.rateTo ?? w.rate ?? 0;
          return hi <= filters.rateMax;
        });
      }
    } else if (filters.rateType === "job") {
      base = base.filter((w) => w.rateType === "job");
      if (typeof filters.rateJob === "number") {
        base = base.filter((w) => (w.rateValue ?? w.rate ?? 0) <= filters.rateJob);
      }
    } else {
      if (typeof filters.rateMin === "number") {
        base = base.filter((w) => (Number(w.rate) || 0) >= filters.rateMin);
      }
      if (typeof filters.rateMax === "number") {
        base = base.filter((w) => (Number(w.rate) || 0) <= filters.rateMax);
      }
    }

    const map = filters.serviceTypes || {};
    const selected = Object.keys(map).filter((k) => map[k]);
    if (selected.length) {
      const labels = {
        carwasher: ["carwasher", "car washing", "car wash"],
        carpenter: ["carpenter", "carpentry"],
        electrician: ["electrician"],
        laundry: ["laundry", "laundy"],
        plumber: ["plumber", "plumbing"]
      };
      base = base.filter((w) => {
        const skillSet = w.skills.map((s) => s.toLowerCase());
        return selected.some((k) =>
          (labels[k] || []).some((alias) => skillSet.includes(alias))
        );
      });
    }
    return base;
  }, [workers, query, filters]);

  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = filteredWorkers.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <ClientNavigation />

      <div className="flex-1 flex flex-col">
        <section className="mx-auto w-full max-w-[1525px] px-6 mt-6 pb-12">
          <div className="flex flex-col sm:flex-row gap-6">
            <FiltersPanel value={filters} onChange={setFilters} />
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-end gap-3">
                <div className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white w-full md:w-[520px] max-w-full sm:max-w-[520px]">
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
