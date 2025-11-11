import React, { useCallback, useEffect, useState } from "react";
import {
  FiSettings,
  FiHelpCircle,
  FiShield,
  FiLogOut,
  FiRefreshCw,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";

export default function GateProfile() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setToken(t);
        setUser(u );
      } catch {
        setUser({ id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      }
    })();
  }, []);

  const loadStats = useCallback(async () => {
    if (!token) return;

    setLoadingStats(true);
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.today);
    } catch {
      setStats({ checkedIn: 0, pending: 0, checkedOut: 0, total: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (token) loadStats();
  }, [token, loadStats]);


  return (
    <div className=" text-gray-900 p-x-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Profile</h1>
          <p className="text-gray-500  mt-1">
            Manage your gatekeeper account
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-md">
            <FiShield size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">{user?.name || "Gatekeeper"}</h2>
          <p className="text-gray-500  text-sm mt-1">
            Security Personnel
          </p>
          <p className="text-gray-400 text-xs mt-1">
            ID: {user?.id || "GK001"}
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Today's Summary</h3>
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="text-gray-500 hover:text-gray-800"
            >
              {loadingStats ? (
                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              ) : (
                <FiRefreshCw size={18} />
              )}
            </button>
          </div>

          {loadingStats ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-around mb-4">
                <div className="flex flex-col items-center">
                  <span className="text-green-600 font-extrabold text-2xl">
                    {stats?.checkedIn || 0}
                  </span>
                  <span className="text-sm text-gray-500 ">
                    Checked In
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-amber-500 font-extrabold text-2xl">
                    {stats?.pending || 0}
                  </span>
                  <span className="text-sm text-gray-500 ">
                    Pending
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 font-extrabold text-2xl">
                    {stats?.checkedOut || 0}
                  </span>
                  <span className="text-sm text-gray-500 ">
                    Checked Out
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 text-center">
                <span className="block text-2xl font-extrabold">
                  {stats?.total || 0}
                </span>
                <span className="text-sm text-gray-500 ">
                  Total Visitors
                </span>
              </div>
            </>
          )}
        </div>
        {/* Footer */}
        <div className="text-center text-gray-400 text-xs pt-3">
          <p>GateZen Gatekeeper v1.0.0</p>
          <p className="mt-1">Security & Visitor Management</p>
        </div>
      </div>
    </div>
  );
}
