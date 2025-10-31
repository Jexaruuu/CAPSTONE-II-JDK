import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const timeAgo = (iso) => {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    const opts = { month: "short", day: "numeric", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
};

const Card = ({ item, onEdit, onOpenMenu }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={`/workerpostapplication?id=${encodeURIComponent(item.id)}`}
            className="block"
          >
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 truncate hover:underline">
              {item.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-gray-500">Created {timeAgo(item.created_at)} by You</p>
          <p className="mt-4 text-sm text-gray-700">
            {item.status === "draft" ? "Draft" : item.status === "active" ? "Active" : item.status}
            <span className="text-gray-400"> • Saved {formatDate(item.saved_at || item.updated_at || item.created_at)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {item.status === "draft" ? (
            <button
              onClick={() => onEdit(item)}
              className="rounded-lg border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50"
            >
              Edit draft
            </button>
          ) : (
            <Link
              to={`/current-work-post/${encodeURIComponent(item.id)}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View
            </Link>
          )}
          <button
            onClick={() => onOpenMenu(item)}
            className="h-9 w-9 grid place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="More actions"
            title="More actions"
          >
            •••
          </button>
        </div>
      </div>
    </div>
  );
};

export default function WorkerCurrentApplication() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const navigate = useNavigate();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/worker/applications?scope=current`,
        { withCredentials: true }
      );
      const arr = Array.isArray(data) ? data : data?.items || [];
      const normalized = arr.map((r, i) => ({
        id: r.id ?? `${i}`,
        title: r.title ?? "Untitled application",
        status: String(r.status || "draft").toLowerCase(),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        saved_at: r.saved_at,
      }));
      setItems(
        normalized.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      );
    } catch {
      setItems([
        {
          id: "draft-1",
          title: "House Cleaning — South District",
          status: "draft",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          saved_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchItems();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return items;
    const key = String(statusFilter).toLowerCase();
    return items.filter((i) => String(i.status || "").toLowerCase() === key);
  }, [items, statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((i) => i.title.toLowerCase().includes(q));
  }, [filteredByStatus, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pages = useMemo(() => {
    const t = totalPages;
    const p = page;
    const out = [];
    if (t <= 7) {
      for (let i = 1; i <= t; i++) out.push(i);
    } else {
      out.push(1);
      if (p > 4) out.push("…");
      const start = Math.max(2, p - 1);
      const end = Math.min(t - 1, p + 1);
      for (let i = start; i <= end; i++) out.push(i);
      if (p < t - 3) out.push("…");
      out.push(t);
    }
    return out;
  }, [totalPages, page]);

  const onEdit = (item) => {
    navigate(`/workerpostapplication?id=${encodeURIComponent(item.id)}`);
  };

  const onOpenMenu = () => {};

  const onRefresh = async () => {
    await fetchItems();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <WorkerNavigation />

      <div className="flex-1 flex flex-col">
        <header className="mx-auto w-full max-w-[1525px] px-6 pt-6 md:pt-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Current Applications
          </h1>
        </header>

        <div className="mx-auto w-full max-w-[1525px] px-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">Filter</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "all" ? "border-[#008cfc] bg-[#008cfc] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "pending" ? "all" : "pending"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "pending" ? "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Pending Applications
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "approved" ? "all" : "approved"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "approved" ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Approved Applications
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "declined" ? "all" : "declined"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "declined" ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Declined Applications
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter((v) => (v === "cancelled" ? "all" : "cancelled"))}
                  className={`inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${statusFilter === "cancelled" ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Canceled Applications
                </button>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 sm:ml-auto">
              <div className="mt-7 flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white">
                <span className="text-gray-500 text-lg">🔍︎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search applications"
                  className="border-none outline-none text-black w-full sm:w-64 md:w-80 h-full placeholder:text-gray-400 bg-transparent"
                />
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="mt-6 inline-flex items-center gap-2 h-10 rounded-md border border-blue-300 px-3 text-sm text-[#008cfc] hover:bg-blue-50 disabled:opacity-50"
                title="Refresh"
                aria-label="Refresh"
              >
                ⟳ Refresh
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1525px] px-6 mt-6 space-y-4 pb-10">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
              <div className="h-5 w-64 bg-gray-200 rounded" />
              <div className="mt-3 h-3 w-40 bg-gray-200 rounded" />
              <div className="mt-5 h-3 w-52 bg-gray-200 rounded" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
              No applications found.
            </div>
          ) : (
            paginated.map((item) => (
              <Card
                key={item.id}
                item={item}
                onEdit={onEdit}
                onOpenMenu={onOpenMenu}
              />
            ))
          )}

          {!loading && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? "application" : "applications"}
              </div>

              <nav className="flex items-center gap-2">
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {pages.map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={`${p}-${idx}`}
                      onClick={() => setPage(p)}
                      className={`h-9 min-w-9 px-3 rounded-md border text-sm ${
                        p === page
                          ? "border-[#008cfc] bg-[#008cfc] text-white"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={`dots-${idx}`} className="px-1 text-gray-500 select-none">…</span>
                  )
                )}
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </nav>
            </div>
          )}
        </main>
      </div>

      <WorkerFooter />
    </div>
  );
}
