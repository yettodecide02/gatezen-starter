import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiSearch,
} from "react-icons/fi";
import { getSAToken } from "../../lib/superAdminAuth";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PAGE_SIZE = 25;

function toLocationRows(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  return Object.entries(payload)
    .map(([location, count]) => ({
      location,
      count: Number(count) || 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${getSAToken()}` },
  });

  const fetchLocations = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/superadmin/location-counts`,
        authHeader(),
      );
      setLocations(toLocationRows(res.data));
      setError("");
    } catch {
      setError("Failed to load locations.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((row) =>
      row.location.toLowerCase().includes(query),
    );
  }, [locations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (loading)
    return <div className="p-8 text-gray-500">Loading locations…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            View visit counts captured by the backend
          </p>
        </div>
        <p className="text-sm text-gray-400">{locations.length} total</p>
      </div>

      <div className="relative mb-5">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city or country…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {pageRows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {filtered.length === 0 && search
            ? "No matching locations found."
            : "No locations recorded yet."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Location
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Visits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.map((row) => (
                <tr
                  key={row.location}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-800">
                      <FiMapPin size={14} className="text-gray-400" />
                      <span className="truncate">{row.location}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-gray-700">
                    {row.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500">
              Showing {filtered.length === 0 ? 0 : start + 1}-
              {Math.min(start + pageRows.length, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} /> Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
