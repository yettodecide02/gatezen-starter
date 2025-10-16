import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiDollarSign,
  FiTool,
  FiCalendar,
  FiBell,
  FiUserPlus,
  FiCheck,
  FiX,
  FiPlus,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";

// Toast Component
function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <FiCheckCircle />;
      case "error":
        return <FiXCircle />;
      case "info":
        return <FiInfo />;
      default:
        return <FiInfo />;
    }
  };

  return (
    <div className={`toast ${toast.type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={() => onClose(toast.id)}>
        <FiX />
      </button>
    </div>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function Stat({ icon, title, value, hint, className = "" }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
const token = getToken() || "";

function AnnouncementModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      onClose();
    } catch (error) {
      console.error("Error creating announcement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-head">
          <h3>Create New Announcement</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
                required
              />
            </div>
            <div>
              <label className="label">Content</label>
              <textarea
                className="textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter announcement content"
                required
                rows={4}
              />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now();
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const res = await axios.get(url + "/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      params: {communityId: getUser().communityId}
      });
      const data = res.data;
      setPayments(data.payments || []);
      setMaintenance(data.maintenance || []);
      setBookings(data.bookings || []);
      setUsers(data.users || []);
      setAnnouncements(data.announcements || []);
      setPendingRequests(data.pendingRequests || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
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
        { userId },
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

      fetchAdminData();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);

      // Show error toast
      addToast(
        "error",
        "Action Failed",
        `Failed to ${action} resident. Please try again.`
      );
    }
  };

  const handleCreateAnnouncement = async (announcementData) => {
    try {
      await axios.post(url + "/admin/create-announcement", {
        ...announcementData,
        communityId: getUser().communityId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      addToast(
        "success",
        "Announcement Created",
        "New announcement has been successfully created and published."
      );
      fetchAdminData();
    } catch (error) {
      console.error("Error creating announcement:", error);
      addToast(
        "error",
        "Creation Failed",
        "Failed to create announcement. Please try again."
      );
      throw error;
    }
  };

  const kpis = useMemo(() => {
    const totalDue = payments
      .filter((p) => p.status === "due")
      .reduce((a, b) => a + (b.amount || 0), 0);
    const openMaint = maintenance.filter((m) => m.status !== "RESOLVED").length;
    const pendingBookings = bookings.filter(
      (b) => b.status !== "CONFIRMED"
    ).length;
    return { totalDue, openMaint, pendingBookings };
  }, [payments, maintenance, bookings]);

  return (
    <div className="modern-content">
      <h2
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <FiBell /> Admin Dashboard
      </h2>

      <div className="dash-grid" style={{ marginBottom: 16 }}>
        <Stat
          className="accent-indigo"
          icon={<FiDollarSign />}
          title="Outstanding Dues"
          value={`₹ ${kpis.totalDue}`}
          hint="Across all users"
        />
        <Stat
          className="accent-amber"
          icon={<FiTool />}
          title="Open Maintenance"
          value={kpis.openMaint}
          hint="Awaiting action"
        />
        <Stat
          className="accent-cyan"
          icon={<FiCalendar />}
          title="Pending Bookings"
          value={kpis.pendingBookings}
          hint="To review/approve"
        />
        <Stat
          className="accent-violet"
          icon={<FiUserPlus />}
          title="Pending Requests"
          value={pendingRequests.length}
          hint="New resident requests"
        />
      </div>

      <div className="dash-grid">
        <div className="card span-2">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon">
                <FiBell />
              </div>
              <h3>Latest Announcements</h3>
            </div>
            <button
              className="btn primary"
              onClick={() => setShowAnnouncementModal(true)}
            >
              <FiPlus /> Create Announcement
            </button>
          </div>
          <ul className="list">
            {announcements.length === 0 && (
              <li className="empty">No announcements yet.</li>
            )}
            {announcements.map((a) => (
              <li key={a.id}>
                <div className="list-title">{a.title}</div>
                <div className="list-sub">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
                <div className="list-body">{a.content}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon">
                <FiUserPlus />
              </div>
              <h3>Resident Requests</h3>
            </div>
          </div>
          <ul className="list">
            {pendingRequests.length === 0 && (
              <li className="empty">No pending requests.</li>
            )}
            {pendingRequests.slice(0, 6).map((request) => (
              <li key={request.id} className="list-row">
                <div>
                  <div className="list-title">{request.name}</div>
                  <div className="list-sub">
                    {request.email} •{" "}
                    {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn ghost"
                    onClick={() => handleResidentAction(request.id, "approve")}
                    style={{ color: "#22c55e", padding: "4px 8px" }}
                  >
                    <FiCheck />
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => handleResidentAction(request.id, "reject")}
                    style={{ color: "#ef4444", padding: "4px 8px" }}
                  >
                    <FiX />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon">
                <FiTool />
              </div>
              <h3>Maintenance (Open)</h3>
            </div>
          </div>
          <ul className="list">
            {maintenance
              .filter((m) => m.status !== "RESOLVED")
              .slice(0, 6)
              .map((m) => (
                <li key={m.id} className="list-row">
                  <div>
                    <div className="list-title">{m.title || "Ticket"}</div>
                    <div className="list-sub">
                      {m.category || "General"} •{" "}
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="badge">{m.status}</span>
                  </div>
                </li>
              ))}
            {maintenance.filter((m) => m.status !== "RESOLVED").length ===
              0 && <li className="empty">All clear.</li>}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon">
                <FiCalendar />
              </div>
              <h3>Recent Bookings</h3>
            </div>
          </div>
          <ul className="list">
            {bookings.slice(0, 6).map((b) => (
              <li key={b.id} className="list-row">
                <div>
                  <div className="list-title">
                    {b.facility?.name || "Amenity"}
                  </div>
                  <div className="list-sub">
                    {b.user?.name} • {new Date(b.startsAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="badge">{b.status}</span>
                </div>
              </li>
            ))}
            {bookings.length === 0 && (
              <li className="empty">No bookings yet.</li>
            )}
          </ul>
        </div>
      </div>

      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSubmit={handleCreateAnnouncement}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
