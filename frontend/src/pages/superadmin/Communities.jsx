import { useEffect, useState } from "react";
import axios from "axios";
import { FiSearch, FiMapPin, FiUsers, FiPackage } from "react-icons/fi";
import { getSAToken } from "../../lib/superAdminAuth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState({}); // communityId → bool
  const [toast, setToast] = useState(null);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${getSAToken()}` },
  });

  const fetchData = async () => {
    try {
      const [commRes, planRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/superadmin/communities`, authHeader()),
        axios.get(`${BACKEND_URL}/superadmin/plans`, authHeader()),
      ]);
      setCommunities(commRes.data.communities || []);
      setPlans(planRes.data.plans || []);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const assignPlan = async (communityId, planId) => {
    setAssigning((a) => ({ ...a, [communityId]: true }));
    try {
      await axios.put(
        `${BACKEND_URL}/superadmin/communities/${communityId}/plan`,
        { planId: planId || null },
        authHeader(),
      );
      setCommunities((prev) =>
        prev.map((c) => {
          if (c.id !== communityId) return c;
          const plan = planId ? plans.find((p) => p.id === planId) : null;
          return { ...c, planId: planId || null, plan: plan || null };
        }),
      );
      showToast("Plan updated successfully.");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update plan.", "error");
    } finally {
      setAssigning((a) => ({ ...a, [communityId]: false }));
    }
  };

  const filtered = communities.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return <div className="p-8 text-gray-500">Loading communities…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-green-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Assign plans to communities
          </p>
        </div>
        <p className="text-sm text-gray-400">{communities.length} total</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or address…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No communities found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Community
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Members
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Current Plan
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Assign Plan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((community) => (
                <tr
                  key={community.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Name + Address */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900 text-sm">
                      {community.name}
                    </p>
                    {community.address && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <FiMapPin size={11} /> {community.address}
                      </p>
                    )}
                  </td>

                  {/* User count */}
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FiUsers size={14} className="text-gray-400" />
                      {community._count?.users ?? 0}
                    </span>
                  </td>

                  {/* Current plan badge */}
                  <td className="px-5 py-4">
                    {community.plan ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                        <FiPackage size={11} /> {community.plan.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No plan
                      </span>
                    )}
                  </td>

                  {/* Assign dropdown */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        disabled={assigning[community.id]}
                        value={community.planId || ""}
                        onChange={(e) =>
                          assignPlan(community.id, e.target.value || null)
                        }
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                      >
                        <option value="">— No Plan —</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {assigning[community.id] && (
                        <svg
                          className="animate-spin h-4 w-4 text-violet-500"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
