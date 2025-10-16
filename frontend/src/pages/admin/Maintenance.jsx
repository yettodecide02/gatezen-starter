import React, { useEffect, useState } from "react";
import {
  FiTool,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiCalendar,
  FiMail,
  FiAlertCircle,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_CONFIG = {
  SUBMITTED: {
    icon: FiClock,
    color: "#f59e0b",
    bg: "#fef3c7",
    label: "submitted",
  },
  IN_PROGRESS: {
    icon: FiTool,
    color: "#3b82f6",
    bg: "#dbeafe",
    label: "In Progress",
  },
  RESOLVED: {
    icon: FiCheckCircle,
    color: "#10b981",
    bg: "#d1fae5",
    label: "Resolved",
  },
};

export default function Maintenance() {
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updateLoading, setUpdateLoading] = useState({});

  // Toast management using custom hook
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
      const response = await axios.post(
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

      // Update the maintenance request in the list
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

  return (
    <div className="modern-content">
      {/* Header */}
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon">
            <FiTool />
          </div>
          <div>
            <h2>Maintenance Requests</h2>
            <p className="muted">Manage community maintenance and repairs</p>
          </div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="modern-card maintenance-spacing">
        <div className="filter-pills">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`filter-pill ${
                filterStatus === status ? "active" : ""
              }`}
            >
              {status !== "ALL" &&
                STATUS_CONFIG[status] &&
                React.createElement(STATUS_CONFIG[status].icon, { size: 14 })}
              <span>
                {status === "ALL"
                  ? "All"
                  : STATUS_CONFIG[status]?.label || status}
              </span>
              <span className="badge">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="modern-card">
          <div className="loading-center">
            <p>Loading maintenance requests...</p>
          </div>
        </div>
      ) : (
        /* Maintenance Requests List */
        <div className="modern-card">
          <div className="card-header">
            <h3>
              {filterStatus === "ALL"
                ? `All Maintenance Requests (${filteredMaintenance.length})`
                : `${
                    STATUS_CONFIG[filterStatus]?.label || filterStatus
                  } Requests (${filteredMaintenance.length})`}
            </h3>
          </div>

          {filteredMaintenance.length === 0 ? (
            <div className="empty empty-center">
              <FiTool size={48} className="empty-icon" />
              <p>
                {filterStatus === "ALL"
                  ? "No maintenance requests found"
                  : `No ${
                      STATUS_CONFIG[filterStatus]?.label.toLowerCase() ||
                      filterStatus.toLowerCase()
                    } requests`}
              </p>
              <p className="empty-subtitle">
                Maintenance requests will appear here when residents submit them
              </p>
            </div>
          ) : (
            <div className="stack">
              {filteredMaintenance.map((request) => {
                const StatusIcon =
                  STATUS_CONFIG[request.status]?.icon || FiAlertCircle;
                const statusConfig = STATUS_CONFIG[request.status];

                return (
                  <div key={request.id} className="item">
                    <div className="item-header">
                      <div className="item-content">
                        <div className="item-title item-title-spacing">
                          {request.title}
                        </div>

                        <div className="item-meta">
                          <div className="item-sub">
                            <FiUser size={12} className="item-meta-icon" />
                            {request.user?.name || "Unknown User"}
                          </div>
                          <div className="item-sub">
                            <FiMail size={12} className="item-meta-icon" />
                            {request.user?.email || "No email"}
                          </div>
                          <div className="item-sub">
                            <FiCalendar size={12} className="item-meta-icon" />
                            {formatDate(request.createdAt)}
                          </div>
                        </div>

                        <div className="item-badges">
                          {/* Status Badge */}
                          <div
                            className={`status-badge ${
                              request.status?.toLowerCase().replace("_", "-") ||
                              "submitted"
                            }`}
                          >
                            {React.createElement(StatusIcon, { size: 12 })}
                            {statusConfig?.label || request.status}
                          </div>

                          {/* Priority Badge */}
                          {request.priority && (
                            <div
                              className={`priority-badge ${request.priority.toLowerCase()}`}
                            >
                              {request.priority} Priority
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="status-buttons">
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
                                className="btn ghost status-btn"
                                style={{
                                  color: config.color,
                                  borderColor: config.bg,
                                }}
                                title={`Mark as ${config.label}`}
                              >
                                {React.createElement(config.icon, { size: 12 })}
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
                    <div className="item-body item-description">
                      {request.description ||
                        request.content ||
                        "No description provided"}
                    </div>

                    {/* Additional Details */}
                    {(request.location || request.category) && (
                      <div className="item-details">
                        {request.location && <span>📍 {request.location}</span>}
                        {request.category && <span>🏷️ {request.category}</span>}
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
