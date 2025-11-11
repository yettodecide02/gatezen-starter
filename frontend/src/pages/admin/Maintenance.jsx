import React, { useEffect, useState } from "react";
import {
  FiTool,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiCalendar,
  FiMail,
  FiAlertCircle,
  FiMapPin,
  FiTag,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_CONFIG = {
  SUBMITTED: {
    icon: FiClock,
    color: "amber",
    label: "Submitted",
  },
  IN_PROGRESS: {
    icon: FiTool,
    color: "blue",
    label: "In Progress",
  },
  RESOLVED: {
    icon: FiCheckCircle,
    color: "green",
    label: "Resolved",
  },
};

const PRIORITY_CONFIG = {
  LOW: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  MEDIUM: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  HIGH: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  URGENT: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
};

export default function Maintenance() {
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updateLoading, setUpdateLoading] = useState({});

  const { toasts, addToast, removeToast } = useToast();
  const token = getToken();

  // Fetch all maintenance requests
  const fetchMaintenance = async () => {
    const user = getUser();
    if (!user || !user.communityId) {
      addToast(
        "error",
        "Authentication Error",
        "User not authenticated or missing community information"
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${url}/admin/maintenance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: user.communityId },
      });
      setMaintenance(response.data.maintenance || []);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      addToast("error", "Load Failed", "Failed to load maintenance requests");
    } finally {
      setLoading(false);
    }
  };

  // Update maintenance request status
  const handleStatusUpdate = async (ticketId, newStatus) => {
    setUpdateLoading((prev) => ({ ...prev, [ticketId]: true }));

    try {
      await axios.post(
        `${url}/admin/maintenance/update`,
        {
          ticketId,
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMaintenance((prev) =>
        prev.map((item) =>
          item.id === ticketId ? { ...item, status: newStatus } : item
        )
      );

      addToast(
        "success",
        "Status Updated",
        `Maintenance request updated to ${STATUS_CONFIG[newStatus].label}`
      );
    } catch (error) {
      console.error("Error updating maintenance request:", error);
      addToast(
        "error",
        "Update Failed",
        error.response?.data?.error || "Failed to update maintenance request"
      );
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  // Filter maintenance requests
  const filteredMaintenance = maintenance.filter(
    (item) => filterStatus === "ALL" || item.status === filterStatus
  );

  // Get status counts
  const statusCounts = {
    ALL: maintenance.length,
    SUBMITTED: maintenance.filter((item) => item.status === "SUBMITTED").length,
    IN_PROGRESS: maintenance.filter((item) => item.status === "IN_PROGRESS")
      .length,
    RESOLVED: maintenance.filter((item) => item.status === "RESOLVED").length,
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const getStatusColorClasses = (status) => {
    const colorMap = {
      SUBMITTED: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      IN_PROGRESS: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      RESOLVED: {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-200",
      },
    };
    return (
      colorMap[status] || {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
      }
    );
  };

  const getStatusButtonClasses = (status) => {
    const colorMap = {
      SUBMITTED: "text-amber-600 hover:bg-amber-50 border-amber-200",
      IN_PROGRESS: "text-blue-600 hover:bg-blue-50 border-blue-200",
      RESOLVED: "text-green-600 hover:bg-green-50 border-green-200",
    };
    return colorMap[status] || "text-gray-600 hover:bg-gray-50 border-gray-200";
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg">
            <FiTool size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Maintenance Requests
            </h2>
            <p className="text-sm text-gray-600">
              Manage community maintenance and repairs
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => {
            const StatusIcon = STATUS_CONFIG[status]?.icon;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {StatusIcon && <StatusIcon size={14} />}
                <span>
                  {status === "ALL"
                    ? "All"
                    : STATUS_CONFIG[status]?.label || status}
                </span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    filterStatus === status
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10">
          <div className="text-center">
            <p className="text-gray-600">Loading maintenance requests...</p>
          </div>
        </div>
      ) : (
        /* Maintenance Requests List */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {filterStatus === "ALL"
                ? `All Maintenance Requests (${filteredMaintenance.length})`
                : `${
                    STATUS_CONFIG[filterStatus]?.label || filterStatus
                  } Requests (${filteredMaintenance.length})`}
            </h3>
          </div>

          {filteredMaintenance.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiTool size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {filterStatus === "ALL"
                  ? "No maintenance requests found"
                  : `No ${
                      STATUS_CONFIG[filterStatus]?.label.toLowerCase() ||
                      filterStatus.toLowerCase()
                    } requests`}
              </p>
              <p className="text-sm text-gray-600">
                Maintenance requests will appear here when residents submit them
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMaintenance.map((request) => {
                const StatusIcon =
                  STATUS_CONFIG[request.status]?.icon || FiAlertCircle;
                const statusConfig = STATUS_CONFIG[request.status];
                const statusColors = getStatusColorClasses(request.status);
                const priorityConfig =
                  PRIORITY_CONFIG[request.priority?.toUpperCase()];

                return (
                  <div
                    key={request.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                          {request.title}
                        </h4>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <FiUser size={14} className="flex-shrink-0" />
                            <span>{request.user?.name || "Unknown User"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiMail size={14} className="flex-shrink-0" />
                            <span className="truncate">
                              {request.user?.email || "No email"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiCalendar size={14} className="flex-shrink-0" />
                            <span>{formatDate(request.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                          >
                            <StatusIcon size={14} />
                            {statusConfig?.label || request.status}
                          </span>

                          {/* Priority Badge */}
                          {request.priority && priorityConfig && (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                            >
                              {request.priority} Priority
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {Object.entries(STATUS_CONFIG).map(
                          ([status, config]) => {
                            if (status === request.status) return null;

                            return (
                              <button
                                key={status}
                                onClick={() =>
                                  handleStatusUpdate(request.id, status)
                                }
                                disabled={updateLoading[request.id]}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getStatusButtonClasses(
                                  status
                                )}`}
                                title={`Mark as ${config.label}`}
                              >
                                {React.createElement(config.icon, { size: 14 })}
                                {updateLoading[request.id]
                                  ? "..."
                                  : config.label}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3 text-sm text-gray-700 leading-relaxed">
                      {request.description ||
                        request.content ||
                        "No description provided"}
                    </div>

                    {/* Additional Details */}
                    {(request.location || request.category) && (
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        {request.location && (
                          <div className="flex items-center gap-1.5">
                            <FiMapPin size={14} className="text-gray-400" />
                            <span>{request.location}</span>
                          </div>
                        )}
                        {request.category && (
                          <div className="flex items-center gap-1.5">
                            <FiTag size={14} className="text-gray-400" />
                            <span>{request.category}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
