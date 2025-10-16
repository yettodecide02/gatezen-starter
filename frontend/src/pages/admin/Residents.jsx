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
  FiClock,
  FiHome,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

function ResidentCard({ resident, onAction, showActions = false }) {
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return (
          <span
            className="badge"
            style={{
              background: "#dcfce7",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
            }}
          >
            Approved
          </span>
        );
      case "PENDING":
        return (
          <span
            className="badge"
            style={{
              background: "#fef3c7",
              color: "#d97706",
              border: "1px solid #fde68a",
            }}
          >
            Pending
          </span>
        );
      case "REJECTED":
        return (
          <span
            className="badge"
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            Rejected
          </span>
        );
      default:
        return <span className="badge">Unknown</span>;
    }
  };

  return (
    <div className="card" style={{ marginBottom: "12px" }}>
      <div className="list-row">
        <div style={{ flex: 1 }}>
          <div className="list-title">{resident.name}</div>
          <div className="list-sub">
            <FiMail style={{ display: "inline", marginRight: "4px" }} />
            {resident.email}
          </div>
          {(resident.block || resident.unit) && (
            <div className="list-sub">
              <FiHome style={{ display: "inline", marginRight: "4px" }} />
              {resident.block && `Block ${resident.block.name}`}
              {resident.block && resident.unit && " - "}
              {resident.unit && `Unit ${resident.unit.number}`}
              {!resident.block && !resident.unit && "No block/unit assigned"}
            </div>
          )}
          <div className="list-sub">
            <FiCalendar style={{ display: "inline", marginRight: "4px" }} />
            Joined: {new Date(resident.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {getStatusBadge(resident.status)}
          {showActions && resident.status === "PENDING" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn ghost"
                onClick={() => onAction(resident.id, "approve")}
                style={{ color: "#22c55e", padding: "6px 12px" }}
              >
                <FiCheck /> Approve
              </button>
              <button
                className="btn ghost"
                onClick={() => onAction(resident.id, "reject")}
                style={{ color: "#ef4444", padding: "6px 12px" }}
              >
                <FiX /> Reject
              </button>
            </div>
          )}
          {showActions && resident.status === "REJECTED" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn ghost"
                onClick={() => onAction(resident.id, "approve")}
                style={{ color: "#22c55e", padding: "6px 12px" }}
              >
                <FiCheck /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color = "#6366f1" }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Toast management using custom hook
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

      // Show success toast
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
      <div className="modern-content">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div>Loading residents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-content">
      <h2
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <FiUsers /> Residents Management
      </h2>

      {/* Stats Cards */}
      <div className="dash-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<FiUsers />}
          title="Total Residents"
          value={stats.total}
          color="#6366f1"
        />
        <StatCard
          icon={<FiClock />}
          title="Pending Approval"
          value={stats.pending}
          color="#f59e0b"
        />
        <StatCard
          icon={<FiUserCheck />}
          title="Approved"
          value={stats.approved}
          color="#10b981"
        />
        <StatCard
          icon={<FiUserX />}
          title="Rejected"
          value={stats.rejected}
          color="#ef4444"
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Residents", count: stats.total },
            { key: "pending", label: "Pending", count: stats.pending },
            { key: "approved", label: "Approved", count: stats.approved },
            { key: "rejected", label: "Rejected", count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`pill ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && <span className="badge">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Residents List */}
      <div className="card">
        <div className="section-header">
          <div className="section-left">
            <div className="section-icon">
              <FiUsers />
            </div>
            <h3>
              {activeTab === "all" && "All Residents"}
              {activeTab === "pending" && "Pending Approvals"}
              {activeTab === "approved" && "Approved Residents"}
              {activeTab === "rejected" && "Rejected Applications"}
            </h3>
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px" }}>
            {filteredResidents.length} resident
            {filteredResidents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {filteredResidents.length === 0 ? (
          <div
            className="empty"
            style={{ textAlign: "center", padding: "40px" }}
          >
            {activeTab === "all" && "No residents found."}
            {activeTab === "pending" && "No pending approvals."}
            {activeTab === "approved" && "No approved residents."}
            {activeTab === "rejected" && "No rejected applications."}
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
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
