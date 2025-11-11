import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  FiClock,
  FiXCircle,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiUser,
  FiHome,
  FiClipboard,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const STATUS_STYLES = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: <FiClock className="text-amber-800 w-4 h-4" />,
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-300",
    icon: <FiXCircle className="text-red-800 w-4 h-4" />,
  },
  checked_in: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-300",
    icon: <FiLogIn className="text-blue-800 w-4 h-4" />,
  },
  checked_out: {
    bg: "bg-gray-50",
    text: "text-gray-800",
    border: "border-gray-300",
    icon: <FiLogOut className="text-gray-800 w-4 h-4" />,
  },
};

function StatusChip({ status }) {
  const key = (status || "pending").toLowerCase();
  const s = STATUS_STYLES[key] || STATUS_STYLES.pending;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${s.bg} ${s.border}`}
    >
      {s.icon}
      <span className={`font-semibold text-sm ${s.text}`}>
        {key.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </span>
    </div>
  );
}

export default function GatekeeperVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setToken(t);
        setUser(u || { name: "Gatekeeper", role: "GATEKEEPER" });
      } catch {
        setUser({ name: "Gatekeeper", role: "GATEKEEPER" });
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setVisitors(Array.isArray(res.data) ? res.data : []);
      console.log(res.data);
    } catch {
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (user && visitors.length == 0) load();
  }, [user, load]);

  const updateVisitorStatus = async (visitorId, newStatus) => {
    try {
      const res = await axios.post(
        `${backendUrl}/gatekeeper`,
        { id: visitorId, status: newStatus },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      const updated = res.data;
      setVisitors((prev) =>
        prev.map((v) => (v.id === visitorId ? updated : v))
      );
      
      addToast("success", "Success", `Visitor ${newStatus.replace("_", " ")}`);
    } catch {
      alert("Failed to update visitor status.");
    }
  };

  return (
    <div className="text-gray-900 px-4 py-4 relative">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Visitor Management</h1>
          <p className="text-gray-500 text-sm">
            Monitor and manage visitor access
          </p>
        </div>
        <button
          onClick={load}
          className="p-3 rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent animate-spin rounded-full" />
          ) : (
            <FiRefreshCw className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Visitors Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <h2 className="text-xl font-bold mb-4">Today's Visitors</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent animate-spin rounded-full" />
          </div>
        ) : visitors.length === 0 ? (
          <p className="text-gray-500">No visitors today.</p>
        ) : (
          <div className="space-y-6">
            {visitors.map((visitor) => (
              <div
                key={visitor.id}
                className="border border-gray-200 rounded-2xl p-5 bg-gray-50 shadow-sm"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{visitor.name}</h3>
                    <StatusChip status={visitor.status} />
                  </div>

                  {/* Actions */}
                  {visitor.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateVisitorStatus(visitor.id, "checked_in")
                        }
                        className="w-10 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"
                      >
                        <FiCheck />
                      </button>
                      <button
                        onClick={() =>
                          updateVisitorStatus(visitor.id, "cancelled")
                        }
                        className="w-10 h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : visitor.status === "checked_in" ? (
                    <button
                      onClick={() =>
                        updateVisitorStatus(visitor.id, "checked_out")
                      }
                      className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span className="font-semibold">Check Out</span>
                    </button>
                  ) : null}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Detail
                    icon={<FiUser />}
                    label="Visiting"
                    value={visitor.hostName || "Unknown Host"}
                  />
                  <Detail
                    icon={<FiHome />}
                    label="Unit"
                    value={visitor.unitNumber || "—"}
                  />
                  <Detail
                    icon={<FiClipboard />}
                    label="Purpose"
                    value={visitor.visitorType == "DELIVERY" || visitor.visitorType == "CAB_AUTO"? visitor.visitorType : visitor.purpose || "General Visit"}
                  />
                  <Detail
                    icon={<FiClock />}
                    label="Expected Time"
                    value={new Date(
                      visitor.visitDate || visitor.createdAt
                    ).toLocaleString()}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase font-semibold text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
