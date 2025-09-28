import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";

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
            to={`/clientreviewservicerequest?id=${encodeURIComponent(item.id)}`}
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
              to={`/current-service-request/${encodeURIComponent(item.id)}`}
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

export default function ClientCurrentServiceRequest() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/client/service-requests?scope=current`,
          { withCredentials: true }
        );
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((r, i) => ({
            id: r.id ?? `${i}`,
            title: r.title ?? "Untitled request",
            status: (r.status || "draft").toLowerCase(),
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || r.created_at || new Date().toISOString(),
            saved_at: r.saved_at,
          }));
          setItems(
            normalized.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
          );
        }
      } catch {
        if (!cancelled) {
          setItems([
            {
              id: "draft-1",
              title: "Web Development Project: Create a Dynamic Website",
              status: "draft",
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
              saved_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
              updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
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
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  const onEdit = (item) => {
    navigate(`/clientreviewservicerequest?id=${encodeURIComponent(item.id)}`);
  };

  const onOpenMenu = () => {};

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <ClientNavigation />

      <div className="flex-1 flex flex-col">
        <header className="mx-auto w-full max-w-[1525px] px-6 pt-6 md:pt-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Current Service Requests
          </h1>
        </header>

        <div className="mx-auto w-full max-w-[1525px] px-6 mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:w-auto">
                <div className="flex items-center h-10 border border-gray-300 rounded-md px-3 gap-2 bg-white">
                  <span className="text-gray-500 text-lg">🔍︎</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search service requests"
                    className="border-none outline-none text-black w-full sm:w-64 md:w-80 h-full placeholder:text-gray-400 bg-transparent"
                  />
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="-ml-0.5">⚙️</span>
                Filters
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
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
              No service requests found.
            </div>
          ) : (
            filtered.map((item) => (
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
                {filtered.length} {filtered.length === 1 ? "request" : "requests"}
              </div>

              <nav className="flex items-center gap-2">
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  disabled
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <button
                  className="h-9 min-w-9 px-3 rounded-md border border-[#008cfc] bg-[#008cfc] text-white"
                  aria-current="page"
                >
                  1
                </button>
                <button
                  className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled
                  aria-label="Next page"
                >
                  ›
                </button>
              </nav>
            </div>
          )}
        </main>
      </div>

      <ClientFooter />
    </div>
  );
}
