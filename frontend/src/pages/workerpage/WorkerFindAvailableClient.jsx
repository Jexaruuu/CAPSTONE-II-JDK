import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 mr-1.5 mb-1.5">
    {children}
  </span>
);

const FilterSidebar = ({ filters, setFilters }) => {
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <aside className="w-full sm:w-72 lg:w-80 shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Client badges</h3>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.verified}
                onChange={(e) => update("verified", e.target.checked)}
                className="h-4 w-4"
              />
              Verified Payment
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.rehire}
                onChange={(e) => update("rehire", e.target.checked)}
                className="h-4 w-4"
              />
              Rehiring Often
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900">Budget</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minBudget ?? ""}
              onChange={(e) => update("minBudget", e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxBudget ?? ""}
              onChange={(e) => update("maxBudget", e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900">Location</h3>
          <select
            value={filters.location || ""}
            onChange={(e) => update("location", e.target.value)}
            className="mt-3 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">Anywhere</option>
            <option value="US">United States</option>
            <option value="EU">Europe</option>
            <option value="APAC">APAC</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() =>
            setFilters({ verified: false, rehire: false, minBudget: "", maxBudget: "", location: "" })
          }
          className="w-full h-10 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Reset filters
        </button>
      </div>
    </aside>
  );
};

const ClientCard = ({ item }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {/* CHANGED: match ClientFindAvailableWorker.jsx avatar/placeholder */}
            <img
              src={item.avatar || "/Clienticon.png"}
              alt={item.company || "Client"}
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {item.company} • {item.locationLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap">
            {item.tags.map((t, i) => (
              <Badge key={i}>{t}</Badge>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-gray-500">Budget</div>
              <div className="font-medium text-gray-900">{item.budgetLabel}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-gray-500">Payment</div>
              <div className="font-medium text-gray-900">{item.paymentLabel}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-gray-500">Posted</div>
              <div className="font-medium text-gray-900">{item.postedLabel}</div>
            </div>
          </div>
        </div>

        <button className="rounded-lg border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">
          Invite me
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-700 leading-relaxed">
        {item.description}
      </div>
    </div>
  );
};

export default function WorkerFindAvailableClient() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSearch = searchParams.get("search") || "";
  const [query, setQuery] = useState(initialSearch);
  const [filters, setFilters] = useState({
    verified: false,
    rehire: false,
    minBudget: "",
    maxBudget: "",
    location: "",
  });
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  // NEW: local pagination state (5 cards per page)
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/api/worker/find-clients`, {
          withCredentials: true,
        });
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : data?.items || [];
          const normalized = arr.map((r, i) => ({
            id: r.id ?? `${i}`,
            // NEW: include avatar if backend sends it so <img> can use it
            avatar: r.avatar,
            initials: (r.company?.[0] || r.contact?.[0] || "C").toUpperCase(),
            title: r.title ?? "Looking for ongoing help",
            company: r.company ?? "Private Client",
            locationLabel: r.location ?? "Remote",
            tags: r.tags ?? ["Ongoing", "Contract"],
            budgetLabel: r.budget ? `$${r.budget}/project` : "Negotiable",
            paymentLabel: r.payment_verified ? "Verified payment" : "Unverified payment",
            postedLabel: r.posted_label ?? "Recently",
            description:
              r.description ??
              "We’re looking for a reliable professional to support our team. Experience with similar projects is a plus.",
          }));
          setItems(normalized);
        }
      } catch {
        if (!cancelled) {
          setItems([
            {
              id: "c1",
              // sample: no avatar -> will use /Clienticon.png
              initials: "AC",
              title: "E-commerce product upload & data cleanup",
              company: "Acme Co.",
              locationLabel: "Remote",
              tags: ["Data Entry", "Shopify", "Ongoing"],
              budgetLabel: "$300 - $600",
              paymentLabel: "Verified payment",
              postedLabel: "1d ago",
              description:
                "Need help organizing and uploading 250 SKUs to Shopify with clean categories and high-quality descriptions.",
            },
            {
              id: "c2",
              initials: "BL",
              title: "Blog content updates and on-page SEO",
              company: "Bright Labs",
              locationLabel: "US",
              tags: ["SEO", "Content", "WordPress"],
              budgetLabel: "$20/hr",
              paymentLabel: "Unverified payment",
              postedLabel: "3d ago",
              description:
                "Update older blog posts, fix internal links, and improve on-page SEO across 30 articles.",
            },
            {
              id: "c2",
              initials: "BL",
              title: "Blog content updates and on-page SEO",
              company: "Bright Labs",
              locationLabel: "US",
              tags: ["SEO", "Content", "WordPress"],
              budgetLabel: "$20/hr",
              paymentLabel: "Unverified payment",
              postedLabel: "3d ago",
              description:
                "Update older blog posts, fix internal links, and improve on-page SEO across 30 articles.",
            },
            {
              id: "c2",
              initials: "BL",
              title: "Blog content updates and on-page SEO",
              company: "Bright Labs",
              locationLabel: "US",
              tags: ["SEO", "Content", "WordPress"],
              budgetLabel: "$20/hr",
              paymentLabel: "Unverified payment",
              postedLabel: "3d ago",
              description:
                "Update older blog posts, fix internal links, and improve on-page SEO across 30 articles.",
            },
            {
              id: "c2",
              initials: "BL",
              title: "Blog content updates and on-page SEO",
              company: "Bright Labs",
              locationLabel: "US",
              tags: ["SEO", "Content", "WordPress"],
              budgetLabel: "$20/hr",
              paymentLabel: "Unverified payment",
              postedLabel: "3d ago",
              description:
                "Update older blog posts, fix internal links, and improve on-page SEO across 30 articles.",
            },
            {
              id: "c2",
              initials: "BL",
              title: "Blog content updates and on-page SEO",
              company: "Bright Labs",
              locationLabel: "US",
              tags: ["SEO", "Content", "WordPress"],
              budgetLabel: "$20/hr",
              paymentLabel: "Unverified payment",
              postedLabel: "3d ago",
              description:
                "Update older blog posts, fix internal links, and improve on-page SEO across 30 articles.",
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

  // Reset to first page when query/filters change
  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQ =
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.company.toLowerCase().includes(q) ||
        it.tags.some((t) => t.toLowerCase().includes(q));
      const okVerified = !filters.verified || it.paymentLabel === "Verified payment";
      const okRehire = !filters.rehire || it.tags.some((t) => t.toLowerCase().includes("ongoing"));
      const budgetNum = parseInt((it.budgetLabel.match(/\d+/) || [0])[0], 10);
      const okMin = !filters.minBudget || budgetNum >= Number(filters.minBudget);
      const okMax = !filters.maxBudget || budgetNum <= Number(filters.maxBudget);
      const okLoc =
        !filters.location ||
        it.locationLabel.toLowerCase().includes(filters.location.toLowerCase());
      return matchesQ && okVerified && okRehire && okMin && okMax && okLoc;
    });
  }, [items, query, filters]);

  // Slice to 5 per page (client-side pagination)
  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#F7FBFF] to-white">
      <WorkerNavigation />

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
          <FilterSidebar filters={filters} setFilters={setFilters} />
          <main className="flex-1 space-y-4">
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
              pageItems.map((it) => <ClientCard key={it.id} item={it} />)
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

      {/* ✅ Keep footer pinned to the bottom when content is short */}
      <div className="mt-auto w-full">
        <WorkerFooter />
      </div>
    </div>
  );
}
