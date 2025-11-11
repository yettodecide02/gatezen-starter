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
import { ToastContainer, useToast } from "../../components/Toast";

function Stat({ icon, title, value, hint, color = "indigo" }) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    amber: "bg-amber-100 text-amber-600",
    cyan: "bg-cyan-100 text-cyan-600",
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="text-sm font-medium text-gray-600 text-right">
          {title}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {hint && <div className="text-sm text-gray-500">{hint}</div>}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Create New Announcement
          </h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter announcement content"
                required
                rows={4}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const res = await axios.get(url + "/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: getUser().communityId },
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
      addToast(
        "error",
        "Action Failed",
        `Failed to ${action} resident. Please try again.`
      );
    }
  };

  const handleCreateAnnouncement = async (announcementData) => {
    try {
      await axios.post(
        url + "/admin/create-announcement",
        {
          ...announcementData,
          communityId: getUser().communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2.5">
        <FiBell /> Admin Dashboard
      </h2>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Stat
          color="indigo"
          icon={<FiDollarSign size={24} />}
          title="Outstanding Dues"
          value={`₹ ${kpis.totalDue}`}
          hint="Across all users"
        />
        <Stat
          color="amber"
          icon={<FiTool size={24} />}
          title="Open Maintenance"
          value={kpis.openMaint}
          hint="Awaiting action"
        />
        <Stat
          color="cyan"
          icon={<FiCalendar size={24} />}
          title="Pending Bookings"
          value={kpis.pendingBookings}
          hint="To review/approve"
        />
        <Stat
          color="violet"
          icon={<FiUserPlus size={24} />}
          title="Pending Requests"
          value={pendingRequests.length}
          hint="New resident requests"
        />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Announcements - Spans 2 columns on large screens */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <FiBell size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Latest Announcements
              </h3>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => setShowAnnouncementModal(true)}
            >
              <FiPlus /> Create Announcement
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {announcements.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                No announcements yet.
              </div>
            )}
            {announcements.map((a) => (
              <div
                key={a.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="font-semibold text-gray-900 mb-1">
                  {a.title}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {a.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resident Requests */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                <FiUserPlus size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Resident Requests
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingRequests.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                No pending requests.
              </div>
            )}
            {pendingRequests.slice(0, 6).map((request) => (
              <div
                key={request.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-1">
                      {request.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {request.email}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      onClick={() =>
                        handleResidentAction(request.id, "approve")
                      }
                      title="Approve"
                    >
                      <FiCheck size={18} />
                    </button>
                    <button
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => handleResidentAction(request.id, "reject")}
                      title="Reject"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance (Open) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <FiTool size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Maintenance (Open)
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {maintenance.filter((m) => m.status !== "RESOLVED").length ===
              0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                All clear.
              </div>
            )}
            {maintenance
              .filter((m) => m.status !== "RESOLVED")
              .slice(0, 6)
              .map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 mb-1">
                        {m.title || "Ticket"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {m.category || "General"} •{" "}
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                <FiCalendar size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Bookings
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {bookings.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                No bookings yet.
              </div>
            )}
            {bookings.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-1">
                      {b.facility?.name || "Amenity"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {b.user?.name} • {new Date(b.startsAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0">
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
