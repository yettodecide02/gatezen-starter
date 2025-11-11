import { useEffect, useMemo, useState } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiMail,
  FiCalendar,
  FiMapPin,
  FiTruck,
  FiCheckCircle,
  FiActivity,
  FiX,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

// Status Badge Component
function StatusBadge({ status }) {
  const styles = {
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <FiClock className="w-3 h-3" />,
      label: "Pending",
    },
    cancelled: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      icon: <FiX className="w-3 h-3" />,
      label: "Cancelled",
    },
    checked_in: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: <FiCheckCircle className="w-3 h-3" />,
      label: "Checked In",
    },
    checked_out: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <FiActivity className="w-3 h-3" />,
      label: "Checked Out",
    },
  };

  const style = styles[status] || styles.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
}

function isoNowLocalDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoNowLocalTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Visitors() {
  const user = useMemo(() => {
    return getUser() || null;
  }, []);

  const [list, setList] = useState([]);
  const [from, setFrom] = useState(isoNowLocalDate());
  const [to, setTo] = useState(isoNowLocalDate());
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [visitorType, setVisitorType] = useState("GUEST");
  const [visitDate, setVisitDate] = useState(isoNowLocalDate());
  const [visitTime, setVisitTime] = useState(isoNowLocalTime());
  const [vehicleNo, setVehicleNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (!user || !token) {
      addToast(
        "error",
        "Authentication Required",
        "Please log in to access visitor management."
      );
      return;
    }
    if (!user.communityId || !user.id) {
      addToast(
        "error",
        "Profile Incomplete",
        "User profile incomplete. Please contact administrator."
      );
      return;
    }
  }, [user, token]);

  async function load() {
    if (!user || !user.communityId || !user.id) {
      addToast(
        "error",
        "Authentication Error",
        "User information missing. Please log in again."
      );
      return;
    }

    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      qs.set("communityId", user.communityId);
      qs.set("userId", user.id);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/resident/visitors?${qs.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const visitors = Array.isArray(res.data) ? res.data : [];
      setList(visitors);
    } catch (error) {
      console.error("Error loading visitors:", error);
      addToast(
        "error",
        "Loading Failed",
        "Error loading visitors. Please try again."
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [from, to]);

  async function preAuthorize(e) {
    e.preventDefault();

    if (!name) {
      addToast("error", "Validation Error", "Please fill visitor name.");
      return;
    }
    if (visitorType === "GUEST" && !contact) {
      addToast(
        "error",
        "Validation Error",
        "Email is required for GUEST visitor type."
      );
      return;
    }
    if (!user || !user.communityId || !user.id) {
      addToast(
        "error",
        "Authentication Error",
        "User information missing. Please log in again."
      );
      return;
    }

    try {
      setSubmitting(true);
      const localDateTime = `${visitDate}T${visitTime}:00`;
      const visitDateTime = new Date(localDateTime).toISOString();

      const requestData = {
        name: name.trim(),
        contact: contact.trim(),
        visitorType: visitorType || "GUEST",
        visitDate: visitDateTime,
        vehicleNo: vehicleNo?.trim() || null,
        communityId: user.communityId,
        userId: user.id,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/visitor-creation`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setName("");
      setContact("");
      setVisitorType("GUEST");
      setVehicleNo("");
      addToast(
        "success",
        "Success",
        "Pre-authorization submitted successfully!"
      );
      load();
    } catch (error) {
      console.error("Error creating visitor:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Error creating visitor. Please try again.";
      addToast("error", "Creation Failed", errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !token || !user.communityId || !user.id) {
    return (
      <div className="min-h-screen">
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FiUsers className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Visitor & Access Management
            </h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">
              {!user || !token
                ? "Please log in to access visitor management."
                : "User profile incomplete. Please contact administrator."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <FiUsers className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Visitor & Access Management
          </h1>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pre-Authorization Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-6">
              <FiUserPlus className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Pre-Authorize Guest
              </h2>
            </div>

            <form onSubmit={preAuthorize} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email/Contact
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="visitor@example.com or +91-9876543210"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Type
                </label>
                <select
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="GUEST">Guest</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="CAB_AUTO">Cab/Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle (optional)
                </label>
                <div className="relative">
                  <FiTruck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="KA01 AB 1234"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="w-5 h-5" />
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>

          {/* Right: Visitor List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-6">
              <FiCalendar className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming / Recent
              </h2>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Visitor List */}
            <div className="space-y-3">
              {loading && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading visitors...</p>
                </div>
              )}

              {!loading && (!Array.isArray(list) || list.length === 0) && (
                <div className="text-center py-12">
                  <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No visitors in range.</p>
                </div>
              )}

              {!loading &&
                Array.isArray(list) &&
                list.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {v.name}
                        </h3>
                        <span className="text-sm text-gray-500">—</span>
                        <span className="text-sm text-gray-600">
                          {v.contact}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <FiMapPin className="w-4 h-4" />
                        <span>{new Date(v.visitDate).toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>
                          Type:{" "}
                          {v.visitorType
                            ?.replace("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                            "Guest"}
                        </span>
                        {v.vehicleNo && (
                          <span className="flex items-center gap-1">
                            <FiTruck className="w-3 h-3" />
                            {v.vehicleNo}
                          </span>
                        )}
                      </div>
                    </div>

                    <StatusBadge status={v.status} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
