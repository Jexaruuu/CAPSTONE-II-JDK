import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";
import WorkerViewRequest from "../../workercomponents/workerdashboardcomponents/workeravailablerequestcomponents/WorkerViewRequest";
import { Hammer, Zap, Wrench, Car, Shirt, Star } from "lucide-react";

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

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(v) {
  if (!v) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v));
  if (!m) return v;
  const h = +m[1];
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${min} ${ampm}`;
}
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "t", "1"].includes(s)) return true;
  if (["no", "n", "false", "f", "0"].includes(s)) return false;
  return !!v;
}
const getServiceIcon = (t) => {
  const s = String(t || "").toLowerCase();
  if (s.includes("electric")) return Zap;
  if (s.includes("plumb")) return Wrench;
  if (s.includes("wash")) return Car;
  if (s.includes("laundry") || s.includes("clean")) return Shirt;
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

        <div className="text-sm font-semibold text-gray-900 mb-2">Client budget</div>
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
              placeholder="Budget"
              value={local.rateJob ?? ""}
              onChange={(e) =>
                set({ rateJob: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
          </div>
        )}
      </div>
    </aside>
  );
};

const ClientCard = ({ item, onView }) => {
  const serviceTypes = Array.isArray(item.serviceTypeList) ? item.serviceTypeList : [];
  const serviceTasks = Array.isArray(item.serviceTaskList) ? item.serviceTaskList : [];
  const iconLabels = serviceTypes.length ? serviceTypes : [item.service_type].filter(Boolean);
  const seen = new Set();
  const serviceIcons = [];
  iconLabels.forEach((lbl) => {
    const Ic = getServiceIcon(lbl);
    const key = Ic.displayName || Ic.name || "Icon";
    if (!seen.has(key)) {
      seen.add(key);
      serviceIcons.push(Ic);
    }
  });
  const topIcons = serviceIcons.slice(0, 3);
  const primaryType = serviceTypes[0] || item.service_type || "—";
  const primaryTask = serviceTasks[0] || item.service_task || "—";

  return (
    <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:border-[#008cfc] hover:ring-2 hover:ring-inset hover:ring-[#008cfc] hover:shadow-xl">
      <div className="absolute inset-0 bg-[url('/Bluelogo.png')] bg-no-repeat bg-[length:600px] bg-[position:right_50%] opacity-10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
              <img
                src={item.avatar || "/Clienticon.png"}
                alt={item.title || "Client"}
                className="h-full w-full object-cover"
                onError={({ currentTarget }) => {
                  currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-sm md:text-lg font-semibold text-gray-700">Client:</span>
                <span className="text-lg md:text-lg font-semibold text-[#008cfc] leading-tight truncate">{item.title || "Service request"}</span>
              </div>
              {item.emailAddress ? <div className="text-xs text-gray-600 truncate">{item.emailAddress}</div> : null}
              <div className="mt-1 flex items-center gap-1">
                {[0,1,2,3,4].map((idx) => (
                  <Star key={idx} size={14} className="text-gray-300" fill="currentColor" />
                ))}
                <span className="text-xs font-medium text-gray-700">0.0/5</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(topIcons.length ? topIcons : [Hammer]).map((Ic, idx) => (
              <span key={idx} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                <Ic size={16} className="text-[#008cfc]" />
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 h-px bg-gray-200" />

        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-700">Preferred Schedule</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium">
            <span className="text-[#008cfc]">{fmtDate(item.preferred_date) || "—"}</span>
            <span className="text-gray-400">•</span>
            <span className="text-[#008cfc]">{fmtTime(item.preferred_time) || "—"}</span>
            <span className="text-gray-400">•</span>
            <span className="text-[#008cfc]">{toBool(item.urgency) ? "Urgent" : "Not urgent"}</span>
          </div>

          <div className="mt-3 flex items-start gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-700">Service Type</div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                  {primaryType}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-700">Service Task</div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                  {primaryTask}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-700">Rate Type</div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                  {item.rateTypeLabel || "—"}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-700">Service Rate</div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium bg-blue-50 text-[#008cfc] border-blue-200">
                  {item.displayRate || item.budgetLabel || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm font-semibold text-gray-700">Request Description</div>
          <div className="text-sm text-[#008cfc] font-medium leading-relaxed line-clamp-3">{item.description || "—"}</div>
        </div>

        <div className="mt-4 h-px bg-gray-200" />

        <div className="mt-4">
          <div className="text-sm font-semibold text-[#008cfc]">
            {[item.barangay, item.street].filter(Boolean).join(", ") || item.locationLabel || "Philippines"}
          </div>
          {item.additional_address ? (
            <div className="text-sm mt-1 flex items-baseline gap-2">
              <span className="font-semibold text-gray-700">Landmark:</span>
              <span className="text-[#008cfc]">{item.additional_address}</span>
            </div>
          ) : null}

          <div className="mt-3 flex items-end justify-between">
            <div className="flex items-center gap-2">
              {item.rateTypeLabel ? <div className="text-sm font-semibold text-[#008cfc]">{item.rateTypeLabel}</div> : null}
              {item.rateTypeLabel ? <span className="text-gray-400">•</span> : null}
              <div className="text-sm font-semibold text-[#008cfc]">{item.displayRate || item.budgetLabel || "Rate upon request"}</div>
            </div>
            <button
              onClick={() => onView(item)}
              className="inline-flex items-center justify-center px-4 h-10 rounded-lg bg-[#008cfc] text-white text-sm font-medium hover:bg-[#0078d6] transition self-end"
            >
              View Request
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

export default function WorkerFindAvailableClient() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") || "";
  const [query, setQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    serviceTypes: {},
    rateMin: undefined,
    rateMax: undefined,
    rateJob: undefined,
    rateType: "any",
    location: ""
  });

  const normalizeItems = (rows) => {
    const arr = Array.isArray(rows) ? rows : rows?.items || [];
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
      const work = r.details || r.work || {};
      const rate = r.rate || {};

      const first = String(info.first_name || "").trim();
      const last = String(info.last_name || "").trim();
      const clientName = [first, last].filter(Boolean).join(" ");

      const title = clientName || r.title || work.service_type || work.work_description || "Looking for ongoing help";

      const stArrRaw = work.service_types || work.serviceTypes || r.service_types || r.service_type || [];
      const stArr = Array.isArray(stArrRaw) ? stArrRaw : [stArrRaw].filter(Boolean);
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
        ...flattenTasks(work.serviceTask),
        ...flattenTasks(r.service_task),
        ...flattenTasks(r.serviceTask)
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

      const rawType = String(rate.rate_type || r.rate_type || "").trim();
      const s = rawType.toLowerCase();
      let rateType = "";
      if (s.includes("hour") || s === "range") rateType = "hourly";
      else if (s.includes("job") || s.includes("fixed") || s.includes("flat")) rateType = "job";
      const rateTypeLabel = rateType === "hourly" ? "Hourly Rate" : rateType === "job" ? "By the Job Rate" : (rawType || "");

      const n = (v) => {
        const num = v == null ? null : Number(v);
        return Number.isFinite(num) ? num : null;
      };
      const rateFrom = n(rate.rate_from);
      const rateTo = n(rate.rate_to);
      const rateValue = n(rate.rate_value) ?? n(r.price);

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

      const street = String(r.street || info.street || "").trim();
      const barangay = String(r.barangay || info.barangay || "").trim();
      const additional_address = String(r.additional_address || info.additional_address || "").trim();
      const locationLabel = [barangay, street].filter(Boolean).join(", ") || r.location || "Philippines";

      let rateNum = 0;
      if (rateType === "hourly") {
        rateNum = Number(rateFrom || rateTo || 0) || 0;
      } else if (rateType === "job") {
        rateNum = Number(rateValue || 0) || 0;
      }

      const postedLabel = r.posted_label || r.created_at || "Recently";
      const paymentVerified = !!(r.payment_verified || r.payment_verified === true);
      const budgetLabel = r.budget ? `₱${Number(r.budget).toLocaleString()}` : displayRate || "Negotiable";
      const emailAddress = r.email || r.email_address || info.email_address || "";

      return {
        id: r.id ?? r.request_group_id ?? `${i}`,
        avatar: info.profile_picture_url || r.avatar,
        title,
        company: r.company ?? "Private Client",
        locationLabel,
        tags: r.tags ?? ["Ongoing", "Contract"],
        budgetLabel,
        paymentLabel: paymentVerified ? "Verified payment" : "Unverified payment",
        paymentVerified,
        postedLabel,
        description: r.description ?? work.service_description ?? work.description ?? "",
        request_group_id: r.request_group_id || "",
        email: r.email || r.email_address || "",
        emailAddress,
        barangay: barangay || "",
        street: street || "",
        additional_address: additional_address || "",
        preferred_date: work.preferred_date || r.preferred_date || "",
        preferred_time: work.preferred_time || r.preferred_time || "",
        urgency: r.urgency || r.is_urgent || work.is_urgent || "",
        service_type: r.service_type || work.service_type || "",
        service_task: r.service_task || work.service_task || "",
        serviceTypeList,
        serviceTaskList,
        rateType,
        rateTypeLabel,
        displayRate,
        rateFrom,
        rateTo,
        rateValue,
        rateNum
      };
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/clientservicerequests/open`, { params: { limit: 50 } });
        if (!cancelled) setItems(normalizeItems(data?.items || []));
      } catch {
        if (!cancelled) {
          setItems(normalizeItems([
            { id: "c1", title: "E-commerce product upload & data cleanup", company: "Acme Co.", location: "Remote", tags: ["Data Entry", "Shopify", "Ongoing"], payment_verified: true, posted_label: "1d ago", description: "Need help organizing and uploading 250 SKUs to Shopify with clean categories and high-quality descriptions.", rate_type: "Job", price: 500, barangay: "", street: "" }
          ]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = items;
    if (q) {
      base = base.filter(
        (it) =>
          String(it.title || "").toLowerCase().includes(q) ||
          String(it.company || "").toLowerCase().includes(q) ||
          (it.tags || []).some((t) => String(t).toLowerCase().includes(q)) ||
          (it.serviceTypeList || []).some((t) => String(t).toLowerCase().includes(q)) ||
          (it.serviceTaskList || []).some((t) => String(t).toLowerCase().includes(q))
      );
    }

    if (filters.location && filters.location.trim()) {
      const loc = filters.location.trim().toLowerCase();
      base = base.filter((it) => String(it.locationLabel || "").toLowerCase().includes(loc));
    }

    if (filters.rateType === "hourly") {
      base = base.filter((it) => it.rateType === "hourly");
      if (typeof filters.rateMin === "number") {
        base = base.filter((it) => {
          const lo = it.rateFrom ?? it.rateNum ?? 0;
          return (Number(lo) || 0) >= filters.rateMin;
        });
      }
      if (typeof filters.rateMax === "number") {
        base = base.filter((it) => {
          const hi = it.rateTo ?? it.rateNum ?? 0;
          return (Number(hi) || 0) <= filters.rateMax;
        });
      }
    } else if (filters.rateType === "job") {
      base = base.filter((it) => it.rateType === "job");
      if (typeof filters.rateJob === "number") {
        base = base.filter((it) => (Number(it.rateValue || it.rateNum || 0)) <= filters.rateJob);
      }
    } else {
      if (typeof filters.rateMin === "number") {
        base = base.filter((it) => (Number(it.rateNum) || 0) >= filters.rateMin);
      }
      if (typeof filters.rateMax === "number") {
        base = base.filter((it) => (Number(it.rateNum) || 0) <= filters.rateMax);
      }
    }

    const map = filters.serviceTypes || {};
    const selected = Object.keys(map).filter((k) => map[k]);
    if (selected.length) {
      const labels = {
        carwasher: ["carwasher", "car washing", "car wash"],
        carpenter: ["carpenter", "carpentry"],
        electrician: ["electrician"],
        laundry: ["laundry", "laundy", "cleaning"],
        plumber: ["plumber", "plumbing"]
      };
      base = base.filter((it) => {
        const skillSet = [...(it.serviceTypeList || []), ...(it.serviceTaskList || [])].map((s) => String(s).toLowerCase());
        return selected.some((k) =>
          (labels[k] || []).some((alias) => skillSet.includes(alias))
        );
      });
    }
    return base;
  }, [items, query, filters]);

  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <WorkerNavigation />

      <section className="mx-auto w-full max-w-[1525px] px-6 mt-6 pb-12">
        <div className="flex flex-col sm:flex-row gap-6">
          <FiltersPanel value={filters} onChange={setFilters} />

          <main className="flex-1 space-y-4">
            <div className="flex items-center justify-end gap-3">
              <div className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white w-full md:w-[520px] max-w-full sm:max-w-[520px]">
                <span className="text-gray-500 text-lg">🔍︎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Client Name"
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
              <span>{filtered.length} results</span>
            </div>

            {loading ? (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                  <div className="h-5 w-64 bg-gray-200 rounded" />
                  <div className="mt-3 h-3 w-40 bg-gray-200 rounded" />
                  <div className="mt-5 h-3 w-52 bg-gray-200 rounded" />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
                  <div className="h-5 w-64 bg-gray-200 rounded" />
                  <div className="mt-3 h-3 w-40 bg-gray-200 rounded" />
                  <div className="mt-5 h-3 w-52 bg-gray-200 rounded" />
                </div>
              </>
            ) : pageItems.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
                No clients found.
              </div>
            ) : (
              pageItems.map((it) => (
                <ClientCard
                  key={it.id}
                  item={it}
                  onView={(req) => {
                    setViewRequest(req);
                    setViewOpen(true);
                  }}
                />
              ))
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
          </main>
        </div>
      </section>

      <div className="mt-auto w-full">
        <WorkerFooter />
      </div>

      <WorkerViewRequest open={viewOpen} onClose={() => setViewOpen(false)} request={viewRequest} />
    </div>
  );
}
