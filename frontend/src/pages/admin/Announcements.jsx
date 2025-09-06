import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiUser,
  FiMessageSquare,
} from "react-icons/fi";
import axios from "axios";

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  // Fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url}/admin/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setError("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  // Create new announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setCreateLoading(true);
      setError("");

      const response = await axios.post(
        `${url}/admin/create-announcement`,
        {
          title: newAnnouncement.title.trim(),
          content: newAnnouncement.content.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Add the new announcement to the list
      setAnnouncements((prev) => [response.data.announcement, ...prev]);
      setNewAnnouncement({ title: "", content: "" });
      setShowCreateModal(false);
      setSuccess("Announcement created successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error creating announcement:", error);
      setError(error.response?.data?.error || "Failed to create announcement");
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      await axios.delete(`${url}/admin/announcements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove the announcement from the list
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      setSuccess("Announcement deleted successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      setError(error.response?.data?.error || "Failed to delete announcement");
    }
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
    fetchAnnouncements();
  }, []);

  return (
    <div className="modern-content">
      {/* Header */}
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon">
            <FiMessageSquare />
          </div>
          <div>
            <h2>Announcements</h2>
            <p className="muted">Manage community announcements</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn primary"
        >
          <FiPlus />
          Create Announcement
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="auth-error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {success && (
        <div
          className="auth-error"
          style={{
            marginBottom: "16px",
            background: "#d1fae5",
            color: "#065f46",
            borderColor: "#a7f3d0",
          }}
        >
          {success}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="modern-card">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>Loading announcements...</p>
          </div>
        </div>
      ) : (
        /* Announcements List */
        <div className="modern-card">
          <div className="card-header">
            <h3>All Announcements ({announcements.length})</h3>
          </div>

          {announcements.length === 0 ? (
            <div
              className="empty"
              style={{ textAlign: "center", padding: "40px" }}
            >
              <FiMessageSquare
                size={48}
                style={{ opacity: 0.3, marginBottom: "16px" }}
              />
              <p>No announcements found</p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Create your first announcement to get started
              </p>
            </div>
          ) : (
            <div className="stack">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="item">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="item-title">{announcement.title}</div>
                      <div className="item-sub">
                        <FiCalendar size={12} style={{ marginRight: "4px" }} />
                        {formatDate(announcement.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="btn ghost"
                      style={{
                        color: "#ef4444",
                        borderColor: "#fee2e2",
                        padding: "6px 8px",
                      }}
                      title="Delete announcement"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <div className="item-body">{announcement.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Create New Announcement</h3>
            </div>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="modal-body">
                {error && (
                  <div className="auth-error" style={{ marginBottom: "12px" }}>
                    {error}
                  </div>
                )}
                <div>
                  <label
                    className="label"
                    style={{ marginBottom: "6px", display: "block" }}
                  >
                    Title *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newAnnouncement.title}
                    onChange={(e) =>
                      setNewAnnouncement((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter announcement title"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label
                    className="label"
                    style={{ marginBottom: "6px", display: "block" }}
                  >
                    Content *
                  </label>
                  <textarea
                    className="textarea"
                    value={newAnnouncement.content}
                    onChange={(e) =>
                      setNewAnnouncement((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Enter announcement content"
                    required
                    rows={6}
                    maxLength={1000}
                  />
                  <div
                    className="muted"
                    style={{ textAlign: "right", marginTop: "4px" }}
                  >
                    {newAnnouncement.content.length}/1000 characters
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAnnouncement({ title: "", content: "" });
                    setError("");
                  }}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    createLoading ||
                    !newAnnouncement.title.trim() ||
                    !newAnnouncement.content.trim()
                  }
                >
                  {createLoading ? "Creating..." : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
