import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";
import { Star, Hammer, Zap, Wrench, Car, Shirt } from "lucide-react";
import ClientViewWorker from "../../clientcomponents/clientdashboardcomponents/clientavailableworkercomponents/ClientViewWorker";

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

const RateTypeOption = ({ name, label, value, selected, onSelect }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="radio"
      name={name}
      checked={selected}
      onChange={() => onSelect(value)}
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

  const dropdownRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [barangayQuery, setBarangayQuery] = useState("");

  const barangays = [
    "Alangilan","Alijis","Banago","Bata","Cabug","Estefania","Felisa",
    "Granada","Handumanan","Lopez Jaena","Mandalagan","Mansilingan",
    "Montevista","Pahanocoy","Punta Taytay","Singcang-Airport","Sum-ag",
    "Taculing","Tangub","Villa Esperanza"
  ];
  const sortedBarangays = useMemo(() => [...barangays].sort(), []);
  const filteredBarangays = useMemo(() => {
    const q = barangayQuery.trim().toLowerCase();
    if (!q) return sortedBarangays;
    return sortedBarangays.filter((b) => b.toLowerCase().includes(q));
  }, [sortedBarangays, barangayQuery]);

  const toggleDropdown = () => {
    setBarangayQuery("");
    setShowDropdown((s) => !s);
  };
  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

        <div className="text-sm font-semibold text-gray-900 mb-3">Barangay</div>
        <div className="relative mb-5" ref={dropdownRef}>
          <div className="flex items-center rounded-md border border-gray-300">
            <button
              type="button"
              onClick={toggleDropdown}
              className="w-full h-10 px-3 text-left rounded-l-md focus:outline-none"
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
            >
              {local.location?.trim() ? local.location : "Select Barangay"}
            </button>
            <button
              type="button"
              onClick={toggleDropdown}
              className="px-3 text-gray-600 hover:text-gray-800"
              aria-label="Open barangay options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {showDropdown && (
            <div
              className="absolute z-50 mt-2 left-0 right-0 w-full rounded-xl border border-gray-200 bg-white shadow-xl p-2"
              role="listbox"
            >
              <div className="px-2 pb-2">
                <input
                  value={barangayQuery}
                  onChange={(e) => setBarangayQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto px-1">
                {filteredBarangays.length ? (
                  filteredBarangays.map((barangayName, index) => (
                    <button
                      key={`${barangayName}-${index}`}
                      type="button"
                      onClick={() => {
                        set({ location: barangayName });
                        setShowDropdown(false);
                      }}
                      className="text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-gray-700"
                      role="option"
                      aria-selected={barangayName === local.location}
                    >
                      {barangayName}
                    </button>
                  ))
                ) : (
                  <div className="col-span-1 text-center text-xs text-gray-400 py-3">No options</div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-2">
                <span className="text-xs text-gray-400">
                  {filteredBarangays.length} result{filteredBarangays.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    set({ location: "" });
                    setBarangayQuery("");
                    setShowDropdown(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm font-semibold text-gray-900 mb-2">Service rate</div>
        <div className="space-y-3 mb-3">
          <RateTypeOption
            name="rateType"
            label="Any"
            value="any"
            selected={local.rateType === "any"}
            onSelect={(v) => set({ rateType: v })}
          />
          <RateTypeOption
            name="rateType"
            label="Hourly Rate"
            value="hourly"
            selected={local.rateType === "hourly"}
            onSelect={(v) => set({ rateType: v })}
          />
          <RateTypeOption
            name="rateType"
            label="By the Job Rate"
            value="job"
            selected={local.rateType === "job"}
            onSelect={(v) => set({ rateType: v })}
          />
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

        <div className="text-sm font-semibold text-gray-900 mb-2">Rating</div>
        <div className="space-y-3 mb-5">
          <RateTypeOption
            name="ratingMin"
            label="Any"
            value={0}
            selected={!Number(local.ratingMin)}
            onSelect={(v) => set({ ratingMin: v })}
          />
          <RateTypeOption
            name="ratingMin"
            label="4+ stars"
            value={4}
            selected={Number(local.ratingMin) === 4}
            onSelect={(v) => set({ ratingMin: v })}
          />
          <RateTypeOption
            name="ratingMin"
            label="3+ stars"
            value={3}
            selected={Number(local.ratingMin) === 3}
            onSelect={(v) => set({ ratingMin: v })}
          />
          <RateTypeOption
            name="ratingMin"
            label="2+ stars"
            value={2}
            selected={Number(local.ratingMin) === 2}
            onSelect={(v) => set({ ratingMin: v })}
          />
          <RateTypeOption
            name="ratingMin"
            label="1+ star"
            value={1}
            selected={Number(local.ratingMin) === 1}
            onSelect={(v) => set({ ratingMin: v })}
          />
        </div>
      </div>
    </aside>
  );
};

const WorkerCard = ({ item, onView }) => {
  const serviceTypes = Array.isArray(item.serviceTypeList) ? item.serviceTypeList : [];
  const serviceTasks = Array.isArray(item.serviceTaskList) ? item.serviceTaskList : [];
  const icons = (serviceTypes || []).slice(0, 5).map((lbl) => iconFor(lbl));
  const rating = Number.isFinite(item.rating) ? Math.max(0, Math.min(5, item.rating)) : 0;
  const filledStars = Math.round(rating);
  const singleIcon = icons.length === 1;
  const workDone = Number.isFinite(item.workDone) ? item.workDone : 0;

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center rounded-md bg-blue-50 text-[#008cfc] border border-blue-200 px-3 text-xs font-medium">
                Work Done
                <span className="ml-2 text-sm font-semibold text-[#008cfc]">{workDone}</span>
              </span>
            </div>
            <button onClick={() => onView(item)} className="inline-flex items-center justify-center px-4 h-10 rounded-lg bg-[#008cfc] text-white text-sm font-medium hover:bg-[#0078d6] transition">
              View worker
            </button>
          </div>
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
    serviceTypes: {},
    ratingMin: 0
  });
  const [page, setPage] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewWorker, setViewWorker] = useState(null);
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
      const rawRating =
        r.rating ?? r.avg_rating ?? r.average_rating ?? r.reviews_avg ?? r.rating_average ?? (r.reviews && r.reviews.avg);
      const rating = Number(rawRating);
      const ratingSafe = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;

      const rawWorkDone =
        r.work_done ?? r.completed_jobs ?? r.jobs_completed ?? r.completed_works ?? (r.stats && (r.stats.work_done || r.stats.completed || r.stats.jobs));
      const wd = Number(rawWorkDone);
      const workDone = Number.isFinite(wd) && wd >= 0 ? Math.floor(wd) : 0;

      const rawSuccess =
        r.success_rate ?? r.job_success ?? r.jobs_success ?? r.jobSuccess ?? (r.stats && r.stats.success_rate) ?? rate.rate_success;
      const succ = Number(rawSuccess);
      const workerSuccessBase = Number.isFinite(succ) ? Math.max(0, Math.min(100, succ)) : 0;
      const workerSuccess = ratingSafe > 0 ? workerSuccessBase : 0;

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
        rating: ratingSafe,
        workDone,
        workerSuccess,
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

    if (typeof filters.ratingMin === "number" && filters.ratingMin > 0) {
      base = base.filter((w) => (Number(w.rating) || 0) >= filters.ratingMin);
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
                    placeholder="Search Worker Name"
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
                pageItems.map((w) => <WorkerCard key={w.id} item={w} onView={(item)=>{ setViewWorker(item); setViewOpen(true); }} />)
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

      <ClientViewWorker open={viewOpen} onClose={() => setViewOpen(false)} worker={viewWorker} />
    </div>
  );
}
