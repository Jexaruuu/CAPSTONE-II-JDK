import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronsUpDown, Check, Mars, Venus, RotateCcw } from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ENABLE_SELECTION = false;
const BOLD_FIRST_NAME = false;

const formatPrettyDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const mins = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mmins = String(mins).padStart(2, "0");
  return `${mm}/${dd}/${yyyy}, ${h}:${mmins} ${ampm}`;
};
const avatarFromName = (name) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

export default function AdminManageUser() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [selected, setSelected] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [sectionOpen, setSectionOpen] = useState("info");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const normalizeUsers = (list) => {
    return (list || []).map((u) => {
      const first_name =
        u.first_name ||
        (u.name ? String(u.name).trim().split(" ")[0] : "") ||
        "";
      const last_name =
        u.last_name ||
        (u.name ? String(u.name).trim().split(" ").slice(1).join(" ") : "") ||
        "";
      const email = u.email || u.email_address || "";
      const role =
        (u.role && String(u.role).toLowerCase()) ||
        (u.jobTitle === "Worker" ? "worker" : "client");
      const sex = u.sex || "-";
      const date = u.date || u.created_at || null;
      const facebook = u.facebook || u.social_facebook || "";
      const instagram = u.instagram || u.social_instagram || "";
      const phone = u.phone || u.contact_number || "";
      const profile_picture = u.profile_picture || u.avatar || null;

      return {
        id: u.id || u.auth_uid || email,
        first_name,
        last_name,
        sex,
        email,
        role,
        date,
        facebook,
        instagram,
        phone,
        profile_picture
      };
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE}/api/admin/users`, { withCredentials: true });
      const list = Array.isArray(res?.data?.users) ? res.data.users : [];
      const mapped = normalizeUsers(list);
      setRows(mapped);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchUsers();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ENABLE_SELECTION) return;
    const el = headerCheckboxRef.current;
    if (!el) return;
    if (selected.size === 0) {
      el.indeterminate = false;
      el.checked = false;
    } else if (selected.size === rows.length) {
      el.indeterminate = false;
      el.checked = true;
    } else {
      el.indeterminate = true;
    }
  }, [selected, rows.length]);

  useEffect(() => {
    if (viewOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewOpen]);

  const roleCounts = useMemo(() => {
    const acc = { client: 0, worker: 0, admin: 0, total: 0 };
    for (const u of rows) {
      const rRaw = String(u.role || "").toLowerCase();
      const r = rRaw === "worker" ? "worker" : rRaw === "admin" ? "admin" : "client";
      acc[r] += 1;
      acc.total += 1;
    }
    return acc;
  }, [rows]);

  const filteredByRole = useMemo(() => {
    if (roleFilter === "all") return rows;
    return rows.filter((u) => String(u.role || "").toLowerCase() === roleFilter);
  }, [rows, roleFilter]);

  const baseRows = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return filteredByRole;
    return filteredByRole.filter((u) => {
      const fn = String(u.first_name || "").toLowerCase();
      const ln = String(u.last_name || "").toLowerCase();
      const full = `${fn} ${ln}`.trim();
      const email = String(u.email || "").toLowerCase();
      const sex = String(u.sex || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      const date = formatPrettyDate(u.date).toLowerCase();
      const phone = String(u.phone || "").toLowerCase();
      return (
        fn.includes(term) ||
        ln.includes(term) ||
        full.includes(term) ||
        email.includes(term) ||
        sex.includes(term) ||
        role.includes(term) ||
        date.includes(term) ||
        phone.includes(term)
      );
    });
  }, [filteredByRole, debouncedSearch]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return baseRows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...baseRows].sort((a, b) => {
      const av = String(a[sort.key] ?? "").toLowerCase();
      const bv = String(b[sort.key] ?? "").toLowerCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [baseRows, sort]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key !== key ? { key, dir: "asc" } : { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    );

  const allSelected = ENABLE_SELECTION && selected.size === baseRows.length && baseRows.length > 0;

  const toggleSelectAll = () => {
    if (!ENABLE_SELECTION) return;
    setSelected(allSelected ? new Set() : new Set(baseRows.map((r) => r.id)));
  };
  const toggleSelectRow = (id) =>
    setSelected((prev) => {
      if (!ENABLE_SELECTION) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const COLSPAN = ENABLE_SELECTION ? 8 : 7;

  const roleTabs = [
    { key: "all", label: "All", count: roleCounts.total },
    { key: "client", label: "Client", count: roleCounts.client },
    { key: "worker", label: "Worker", count: roleCounts.worker },
    { key: "admin", label: "Admin", count: roleCounts.admin },
  ];

  const closeModal = () => {
    setViewOpen(false);
    setViewUser(null);
  };

  const handleDisable = (user) => {
    alert(`Disable ${user.first_name || ""} ${user.last_name || ""}`);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (viewOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewOpen]);

  const RolePill = ({ role }) => {
    const r = String(role || "").toLowerCase();
    const isWorker = r === "worker";
    const isAdmin = r === "admin";
    const cls = isAdmin
      ? "border-indigo-200 text-indigo-700 bg-indigo-50"
      : isWorker
      ? "border-sky-200 text-sky-700 bg-sky-50"
      : "border-teal-200 text-teal-700 bg-teal-50";
    return (
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
          cls,
        ].join(" ")}
      >
        <span className="h-3 w-3 rounded-full bg-current opacity-30" />
        {(role || "-").charAt(0).toUpperCase() + (role || "-").slice(1)}
      </span>
    );
  };

  const SexBadge = ({ sex }) => {
    const s = String(sex || "").toLowerCase();
    const isMale = s === "male";
    const isFemale = s === "female";
    const cls = isMale
      ? "border-blue-200 text-blue-700 bg-blue-50"
      : isFemale
      ? "border-pink-200 text-pink-700 bg-pink-50"
      : "border-gray-200 text-gray-700 bg-gray-50";
    return (
      <span className={["inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", cls].join(" ")}>
        {isMale && <Mars className="h-3.5 w-3.5" />}
        {isFemale && <Venus className="h-3.5 w-3.5" />}
        <span>{sex || "-"}</span>
      </span>
    );
  };

  const Field = ({ label, value }) => (
    <div className="text-left space-y-0.5">
      <div className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="text-[14px] font-semibold text-gray-900 break-words">{value ?? "-"}</div>
    </div>
  );

  const SectionCard = ({ title, children, badge }) => (
    <section className="relative rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {badge || null}
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );

  const ProfileCircle = ({ initials, size = 72 }) => (
    <div
      className="bg-blue-50 border border-blue-200 text-blue-600 grid place-items-center font-semibold uppercase"
      style={{ width: size, height: size, borderRadius: 9999 }}
    >
      <span className="text-xl">{initials}</span>
    </div>
  );

  const SectionButton = ({ k, label }) => {
    const active = sectionOpen === k;
    return (
      <button
        onClick={() => setSectionOpen(k)}
        className={[
          "rounded-full px-3 py-1.5 text-xs md:text-sm border transition",
          active ? "bg-[#0b82ff] text-white border-[#0b82ff] shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const renderSection = () => {
    if (!viewUser) return null;
    if (sectionOpen === "info") {
      return (
        <SectionCard
          title="Personal Information"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700 border-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0b82ff]" />
              User
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 max-w-5xl">
            <Field
              label="Gender"
              value={<SexBadge sex={viewUser.sex} />}
            />
            <Field
              label="Contact Number"
              value={
                viewUser.phone ? (
                  <span className="inline-flex items-center gap-2">
                    <img src="/philippines.png" alt="PH" className="h-4 w-6 rounded-sm object-cover" />
                    <span className="text-black">+63</span>
                    <span className="font-semibold tracking-wide text-black">{viewUser.phone}</span>
                  </span>
                ) : (
                  "None"
                )
              }
            />
          </div>
        </SectionCard>
      );
    }
    if (sectionOpen === "social") {
      return (
        <SectionCard
          title="Social Links"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700 border-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0b82ff]" />
              Social
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-w-4xl">
            <Field
              label="Facebook"
              value={
                viewUser.facebook ? (
                  <a
                    href={viewUser.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 justify-start text-[#008cfc] hover:underline break-all"
                  >
                    <FaFacebookF /> {viewUser.facebook}
                  </a>
                ) : (
                  "None"
                )
              }
            />
            <Field
              label="Instagram"
              value={
                viewUser.instagram ? (
                  <a
                    href={viewUser.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 justify-start text-[#008cfc] hover:underline break-all"
                  >
                    <FaInstagram className="text-pink-500" /> {viewUser.instagram}
                  </a>
                ) : (
                  "None"
                )
              }
            />
          </div>
        </SectionCard>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        .blue-scroll {
          scrollbar-width: thin;
          scrollbar-color: #0b82ff #e6f0ff;
        }
        .blue-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .blue-scroll::-webkit-scrollbar-track {
          background: #e6f0ff;
          border-radius: 8px;
        }
        .blue-scroll::-webkit-scrollbar-thumb {
          background: #0b82ff;
          border-radius: 8px;
        }
        .blue-scroll::-webkit-scrollbar-thumb:hover {
          background: #086bd4;
        }
      `}</style>

      <main className="p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-2">Browse Clients, Workers, or Admins search by name or email, see when they were created, and open details.</p>
        </div>

        <section className="mt-6">
          <div className="-mx-6">
            <div className="px-6 mb-3.hidden">
              <h2 className="text-lg font-semibold text-gray-900 sr-only">Users</h2>
              <div className="flex items-center gap-2">
              </div>
            </div>

            <div className="px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Filter</span>
                <div className="flex items-center gap-2">
                  {roleTabs.map((t) => {
                    const active = roleFilter === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setRoleFilter(t.key)}
                        className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${
                          active
                            ? "border-[#008cfc] bg-[#008cfc] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        title={`${t.label} (${typeof t.count === "number" ? t.count : "0"})`}
                      >
                        <span>{t.label}</span>
                        <span
                          className={`inline-flex items-center justify-center min-w-6 rounded-full px-1.5 text-xs font-semibold ${
                            active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {typeof t.count === "number" ? t.count : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Users"
                    className="mt-7 h-10 w-72 rounded-md border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Search users"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-3.5 absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-gray-500 hover:bg-gray-100"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={fetchUsers}
                  className="mt-7 inline-flex items-center gap-2 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#008cfc] hover:bg-blue-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="px-6">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                {loading && (
                  <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b border-blue-100">
                    Loading users…
                  </div>
                )}
                {loadError && !loading && (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
                    {loadError}
                  </div>
                )}

                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                  <div className="max-h-[520px] md:max-h-[63vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-sm text-gray-600">
                          {ENABLE_SELECTION && (
                            <th className="sticky top-0 z-10 bg-white px-4 py-3 w-12 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200">
                              <input
                                ref={headerCheckboxRef}
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                onChange={toggleSelectAll}
                                checked={allSelected}
                                aria-label="Select all users"
                              />
                            </th>
                          )}
                          <th className="hidden sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 select-none shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200">
                            Avatar
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                            onClick={() => toggleSort("first_name")}
                          >
                            <span className="inline-flex items-center gap-1">
                              User Name
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                            onClick={() => toggleSort("sex")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Sex
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                            onClick={() => toggleSort("email")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Email
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                            onClick={() => toggleSort("date")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Created
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th
                            className="sticky top-0 z-10 bg-white px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200"
                            onClick={() => toggleSort("role")}
                          >
                            <span className="inline-flex items-center gap-1">
                              Role
                              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                            </span>
                          </th>
                          <th className="sticky top-0 z-10 bg-white px-4 py-3 w-40 font-semibold text-gray-700.shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] border border-gray-200">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-sm text-gray-800 font-semibold">
                        {sortedRows.map((u, idx) => (
                          <tr
                            key={u.id}
                            className={`border-t border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}
                          >
                            {ENABLE_SELECTION && (
                              <td className="px-4 py-4 border border-gray-200">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  checked={selected.has(u.id)}
                                  onChange={() => toggleSelectRow(u.id)}
                                  aria-label={`Select ${u.first_name} ${u.last_name}`}
                                />
                              </td>
                            )}
                            <td className="hidden px-4 py-4 border border-gray-200">
                              <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-300">
                                <img
                                  src={"/Clienticon.png"}
                                  alt={`${u.first_name} ${u.last_name}`}
                                  className="h-full w-full object-cover"
                                  onError={({ currentTarget }) => {
                                    currentTarget.style.display = "none";
                                    const parent = currentTarget.parentElement;
                                    if (parent) {
                                      const initials = `${(u.first_name || "").trim().slice(0,1)}${(u.last_name || "").trim().slice(0,1)}`.toUpperCase();
                                      parent.innerHTML = `<div class="h-9 w-9 rounded-full bg-blue-50 border border-blue-200 text-blue-600 grid place-items-center text-xs font-semibold">${initials || ""}</div>`;
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="min-w-0">
                                  <div className={`text-gray-900 truncate ${BOLD_FIRST_NAME ? "font-medium" : "font-normal"} font-semibold`}>
                                    <span className="font-semibold">
                                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <SexBadge sex={u.sex} />
                            </td>
                            <td className="px-4 py-4 border border-gray-200">
                              <div className="text-gray-700 truncate">{u.email}</div>
                            </td>
                            <td className="px-4 py-4 border border-gray-200">{formatPrettyDate(u.date)}</td>
                            <td className="px-4 py-4 border border-gray-200">
                              {(() => {
                                const r = String(u.role || "").toLowerCase();
                                const cls =
                                  r === "admin"
                                    ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                                    : r === "worker"
                                    ? "border-sky-200 text-sky-700 bg-sky-50"
                                    : "border-teal-200 text-teal-700 bg-teal-50";
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
                                  >
                                    <span className="h-3 w-3 rounded-full bg-current opacity-30" />
                                    {u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4 w-40 text-left border border-gray-200">
                              <RowMenu
                                onView={() => { setViewUser(u); setSectionOpen("info"); setViewOpen(true); }}
                                onEdit={() => {}}
                                onRemove={() => {}}
                                onDisable={() => handleDisable(u)}
                                isAdmin={String(u.role || "").toLowerCase() === "admin"}
                              />
                            </td>
                          </tr>
                        ))}

                        {!loading && !loadError && sortedRows.length === 0 && (
                          <tr>
                            <td colSpan={COLSPAN} className="px-4 py-16 text-center text-gray-500 border border-gray-200">
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {ENABLE_SELECTION && selected.size > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      {selected.size} selected
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                        onClick={() => setSelected(new Set())}
                      >
                        Clear
                      </button>
                      <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                        onClick={() => alert("Bulk action")}
                      >
                        Bulk action
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {viewOpen && viewUser && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="User details"
            tabIndex={-1}
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative w-full max-w-[960px] max-h-[80vh] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="relative px-6 sm:px-8 py-4 border-b border-gray-200 bg-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-gray-200 bg-gray-100 overflow-hidden">
                      {viewUser.profile_picture ? (
                        <img
                          src={viewUser.profile_picture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={({ currentTarget }) => {
                            currentTarget.style.display = "none";
                            const parent = currentTarget.parentElement;
                            if (parent) {
                              const initials = `${(viewUser.first_name || "").trim().slice(0,1)}${(viewUser.last_name || "").trim().slice(0,1)}`.toUpperCase();
                              parent.innerHTML = `<div class="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">${initials || ""}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xl font-semibold text-[#0b82ff]">
                          {(`${(viewUser.first_name || "").trim().slice(0,1)}${(viewUser.last_name || "").trim().slice(0,1)}` || "?").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg sm:text-xl font-semibold text-gray-900">
                        {[viewUser.first_name, viewUser.last_name].filter(Boolean).join(" ") || "-"}
                      </div>
                      <div className="text-sm text-gray-500">{viewUser.email || "-"}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500">
                      User Summary
                    </div>
                    <div className="text-xs text-gray-500">
                      Created{" "}
                      <span className="font-medium text-gray-700">
                        {formatPrettyDate(viewUser.date)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RolePill role={viewUser.role} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-4 flex-1 bg-gray-50 flex flex-col overflow-hidden">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionButton k="info" label="Personal Information" />
                    <SectionButton k="social" label="Social Links" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto blue-scroll pt-3">
                  {renderSection()}
                </div>
              </div>

              <div className="px-6 sm:px-8 py-4 border-t border-gray-200 bg-white flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function RowMenu({ onView, onEdit, onRemove, onDisable, isAdmin }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative.inline-block text-left" ref={ref}>
      <div className="flex items-center gap-2">
        <span
          role="button"
          tabIndex={0}
          onClick={() => {
            setOpen(false);
            onView?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onView?.();
            }
          }}
          className="cursor-pointer inline-flex items-center rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-[#008cfc] hover:bg-blue-50"
          aria-label="View user"
        >
          View
        </span>
        {!isAdmin && (
          <span
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onDisable?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDisable?.();
              }
            }}
            className="cursor-pointer inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            aria-label="Disable user"
          >
            Disable
          </span>
        )}
      </div>
    </div>
  );
}
