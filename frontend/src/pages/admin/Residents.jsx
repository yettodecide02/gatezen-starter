import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiCheck,
  FiX,
  FiMail,
  FiCalendar,
  FiHome,
  FiClock,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

function ResidentCard({ resident, onAction, showActions = false }) {
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
            Approved
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600 border border-red-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-gray-900 mb-2">
            {resident.name}
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <FiMail className="inline mr-1.5 flex-shrink-0" />
            <span className="truncate">{resident.email}</span>
          </div>
          {(resident.block || resident.unit) && (
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <FiHome className="inline mr-1.5 flex-shrink-0" />
              <span>
                {resident.block && `Block ${resident.block.name}`}
                {resident.block && resident.unit && " - "}
                {resident.unit && `Unit ${resident.unit.number}`}
                {!resident.block && !resident.unit && "No block/unit assigned"}
              </span>
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600">
            <FiCalendar className="inline mr-1.5 flex-shrink-0" />
            Joined: {new Date(resident.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {getStatusBadge(resident.status)}
          {showActions && resident.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                onClick={() => onAction(resident.id, "approve")}
              >
                <FiCheck /> Approve
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => onAction(resident.id, "reject")}
              >
                <FiX /> Reject
              </button>
            </div>
          )}
          {showActions && resident.status === "REJECTED" && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              onClick={() => onAction(resident.id, "approve")}
            >
              <FiCheck /> Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color = "indigo" }) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    amber: "bg-amber-100 text-amber-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="text-sm font-medium text-gray-600">{title}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const { toasts, addToast, removeToast } = useToast();

  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = getToken() || "";

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(url + "/admin/residents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: getUser().communityId },
      });

      setResidents(res.data.residents || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
      addToast("error", "Fetch Failed", "Failed to load residents data.");
    } finally {
      setLoading(false);
    }
  };

  const handleResidentAction = async (userId, action) => {
    try {
      const endpoint =
        action === "approve"
          ? "/admin/approve-resident"
          : "/admin/reject-resident";

      await axios.post(
        url + endpoint,
        { userId, communityId: getUser().communityId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (action === "approve") {
        addToast(
          "success",
          "Resident Approved",
          "Resident has been successfully approved and can now access the system."
        );
      } else {
        addToast(
          "success",
          "Resident Rejected",
          "Resident application has been rejected."
        );
      }

      fetchResidents();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);
      addToast(
        "error",
        "Action Failed",
        `Failed to ${action} resident. Please try again.`
      );
    }
  };

  const getFilteredResidents = () => {
    switch (activeTab) {
      case "pending":
        return residents.filter((r) => r.status === "PENDING");
      case "approved":
        return residents.filter((r) => r.status === "APPROVED");
      case "rejected":
        return residents.filter((r) => r.status === "REJECTED");
      default:
        return residents;
    }
  };

  const getStats = () => {
    const pending = residents.filter((r) => r.status === "PENDING").length;
    const approved = residents.filter((r) => r.status === "APPROVED").length;
    const rejected = residents.filter((r) => r.status === "REJECTED").length;
    return { total: residents.length, pending, approved, rejected };
  };

  const stats = getStats();
  const filteredResidents = getFilteredResidents();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-10">
          <div className="text-gray-600">Loading residents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-2xl p-2 font-bold text-gray-900 mb-6 flex items-center gap-2.5">
        <FiUsers /> Residents Management
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={<FiUsers size={24} />}
          title="Total Residents"
          value={stats.total}
          color="indigo"
        />
        <StatCard
          icon={<FiClock size={24} />}
          title="Pending Approval"
          value={stats.pending}
          color="amber"
        />
        <StatCard
          icon={<FiUserCheck size={24} />}
          title="Approved"
          value={stats.approved}
          color="green"
        />
        <StatCard
          icon={<FiUserX size={24} />}
          title="Rejected"
          value={stats.rejected}
          color="red"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-5">
        <div className="flex gap-3 flex-wrap">
          {[
            { key: "all", label: "All Residents", count: stats.total },
            { key: "pending", label: "Pending", count: stats.pending },
            { key: "approved", label: "Approved", count: stats.approved },
            { key: "rejected", label: "Rejected", count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.key
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Residents List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FiUsers size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === "all" && "All Residents"}
              {activeTab === "pending" && "Pending Approvals"}
              {activeTab === "approved" && "Approved Residents"}
              {activeTab === "rejected" && "Rejected Applications"}
            </h3>
          </div>
          <div className="text-sm text-gray-600">
            {filteredResidents.length} resident
            {filteredResidents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {filteredResidents.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {activeTab === "all" && "No residents found."}
            {activeTab === "pending" && "No pending approvals."}
            {activeTab === "approved" && "No approved residents."}
            {activeTab === "rejected" && "No rejected applications."}
          </div>
        ) : (
          <div className="p-4">
            {filteredResidents.map((resident) => (
              <ResidentCard
                key={resident.id}
                resident={resident}
                onAction={handleResidentAction}
                showActions={
                  activeTab === "pending" ||
                  activeTab === "all" ||
                  activeTab === "rejected"
                }
              />
            ))}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
