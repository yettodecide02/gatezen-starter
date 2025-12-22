import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiMessageSquare,
  FiBell,
  FiX,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

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
  const [deleteLoading, setDeleteLoading] = useState({});

  const { toasts, addToast, removeToast } = useToast();
  const token = getToken();

  // Fetch all announcements
  const fetchAnnouncements = async () => {
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
      const response = await axios.get(`${url}/admin/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: user.communityId },
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      addToast("error", "Load Failed", "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  // Create new announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      addToast("error", "Validation Error", "Title and content are required");
      return;
    }

    const user = getUser();
    if (!user || !user.communityId) {
      addToast(
        "error",
        "Authentication Error",
        "User not authenticated or missing community information"
      );
      return;
    }

    try {
      setCreateLoading(true);

      const response = await axios.post(
        `${url}/admin/create-announcement`,
        {
          title: newAnnouncement.title.trim(),
          content: newAnnouncement.content.trim(),
          communityId: user.communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAnnouncements((prev) => [response.data.announcement, ...prev]);
      setNewAnnouncement({ title: "", content: "" });
      setShowCreateModal(false);
      addToast("success", "Success", "Announcement created successfully!");
    } catch (error) {
      console.error("Error creating announcement:", error);
      addToast(
        "error",
        "Create Failed",
        error.response?.data?.error || "Failed to create announcement"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    const user = getUser();
    if (!user || !user.communityId) {
      addToast(
        "error",
        "Authentication Error",
        "User not authenticated or missing community information"
      );
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [id]: true }));

    try {
      await axios.delete(`${url}/admin/announcements/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: user.communityId },
      });

      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      addToast("success", "Deleted", "Announcement deleted successfully!");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      addToast(
        "error",
        "Delete Failed",
        error.response?.data?.error || "Failed to delete announcement"
      );
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [id]: false }));
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
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2  rounded-lg">
            <FiBell size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
            <p className="text-sm text-gray-600">
              Manage community announcements
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiPlus />
          Create Announcement
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Loading announcements...</p>
          </div>
        </div>
      ) : (
        /* Announcements List */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              All Announcements ({announcements.length})
            </h3>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiMessageSquare size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                No announcements found
              </p>
              <p className="text-sm text-gray-600">
                Create your first announcement to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {announcement.title}
                      </h4>
                      <div className="flex items-center text-sm text-gray-600 gap-1.5">
                        <FiCalendar size={14} className="flex-shrink-0" />
                        <span>{formatDate(announcement.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      disabled={deleteLoading[announcement.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Delete announcement"
                    >
                      <FiTrash2 size={14} />
                      {deleteLoading[announcement.id] ? "..." : "Delete"}
                    </button>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {announcement.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Create New Announcement
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAnnouncement({ title: "", content: "" });
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  <div className="text-xs text-gray-500 mt-1.5 text-right">
                    {newAnnouncement.title.length}/200 characters
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                  <div className="text-xs text-gray-500 mt-1.5 text-right">
                    {newAnnouncement.content.length}/1000 characters
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAnnouncement({ title: "", content: "" });
                  }}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    createLoading ||
                    !newAnnouncement.title.trim() ||
                    !newAnnouncement.content.trim()
                  }
                >
                  {createLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </span>
                  ) : (
                    "Create Announcement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
