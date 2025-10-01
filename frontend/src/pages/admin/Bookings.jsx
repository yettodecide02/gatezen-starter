import React, { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiMail,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiMoreVertical,
} from "react-icons/fi";
import axios from "axios";
import { getUser } from "../../lib/auth";

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Toast Components
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

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFacility, setFilterFacility] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  const [deleteLoading, setDeleteLoading] = useState({});
  const [toasts, setToasts] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const token = localStorage.getItem("token");

  // Add toast notification
  const addToast = (type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  // Remove toast notification
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Fetch bookings from API
  const fetchBookings = async () => {
    const user = getUser();
    if (!user || !user.communityId) {
      setError("User not authenticated or missing community information");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${url}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: user.communityId },
      });

      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData);

      // Extract unique facilities for filter
      const uniqueFacilities = [
        ...new Set(
          bookingsData.map((booking) => booking.facility?.name).filter(Boolean)
        ),
      ];
      setFacilities(uniqueFacilities);

      setError("");
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
      addToast("error", "Error", "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  // Delete booking
  const handleDeleteBooking = async (bookingId) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [bookingId]: true }));

    try {
      await axios.delete(`${url}/admin/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove booking from the list
      setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
      addToast("success", "Success", "Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      addToast("error", "Error", "Failed to delete booking");
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  // Filter and sort bookings
  const getFilteredAndSortedBookings = () => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.user?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.facility?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Facility filter
    if (filterFacility !== "ALL") {
      filtered = filtered.filter(
        (booking) => booking.facility?.name === filterFacility
      );
    }

    // Status filter (based on booking date)
    if (filterStatus !== "ALL") {
      const now = new Date();
      filtered = filtered.filter((booking) => {
        const startDate = new Date(booking.startsAt);
        const endDate = new Date(booking.endsAt);

        switch (filterStatus) {
          case "UPCOMING":
            return startDate > now;
          case "ACTIVE":
            return startDate <= now && endDate >= now;
          case "COMPLETED":
            return endDate < now;
          default:
            return true;
        }
      });
    }

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.startsAt) - new Date(a.startsAt);
        case "date_asc":
          return new Date(a.startsAt) - new Date(b.startsAt);
        case "facility":
          return (a.facility?.name || "").localeCompare(b.facility?.name || "");
        case "user":
          return (a.user?.name || "").localeCompare(b.user?.name || "");
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Get booking status based on dates
  const getBookingStatus = (booking) => {
    const now = new Date();
    const startDate = new Date(booking.startsAt);
    const endDate = new Date(booking.endsAt);

    if (endDate < now) {
      return {
        status: "COMPLETED",
        color: "#10b981",
        bg: "#d1fae5",
        icon: FiCheckCircle,
      };
    } else if (startDate <= now && endDate >= now) {
      return {
        status: "ACTIVE",
        color: "#f59e0b",
        bg: "#fef3c7",
        icon: FiClock,
      };
    } else {
      return {
        status: "UPCOMING",
        color: "#3b82f6",
        bg: "#dbeafe",
        icon: FiCalendar,
      };
    }
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Get status counts for filter pills
  const getStatusCounts = () => {
    const now = new Date();
    return {
      ALL: bookings.length,
      UPCOMING: bookings.filter((b) => new Date(b.startsAt) > now).length,
      ACTIVE: bookings.filter((b) => {
        const start = new Date(b.startsAt);
        const end = new Date(b.endsAt);
        return start <= now && end >= now;
      }).length,
      COMPLETED: bookings.filter((b) => new Date(b.endsAt) < now).length,
    };
  };

  const filteredBookings = getFilteredAndSortedBookings();
  const statusCounts = getStatusCounts();

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="modern-content">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon">
            <FiCalendar />
          </div>
          <div>
            <h2>Facility Bookings</h2>
            <p className="muted">Manage community facility reservations</p>
          </div>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="btn ghost"
          style={{ marginLeft: "auto" }}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="auth-error maintenance-spacing">{error}</div>}

      {/* Filters and Search */}
      <div className="modern-card maintenance-spacing">
        {/* Status Filter Pills */}
        <div className="filter-pills" style={{ marginBottom: "16px" }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`filter-pill ${
                filterStatus === status ? "active" : ""
              }`}
            >
              {status !== "ALL" &&
                {
                  UPCOMING: <FiCalendar size={14} />,
                  ACTIVE: <FiClock size={14} />,
                  COMPLETED: <FiCheckCircle size={14} />,
                }[status]}
              <span>
                {status === "ALL"
                  ? "All"
                  : status === "UPCOMING"
                  ? "Upcoming"
                  : status === "ACTIVE"
                  ? "Active"
                  : "Completed"}
              </span>
              <span className="badge">{count}</span>
            </button>
          ))}
        </div>

        {/* Search and Filters Row */}
        <div className="row" style={{ gap: "12px", alignItems: "center" }}>
          {/* Search */}
          <div className="field" style={{ flex: 1, maxWidth: "300px" }}>
            <div className="field-icon">
              <FiSearch />
            </div>
            <input
              type="text"
              placeholder="Search by user, facility, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Facility Filter */}
          <div className="field" style={{ minWidth: "150px" }}>
            <div className="field-icon">
              <FiFilter />
            </div>
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
            >
              <option value="ALL">All Facilities</option>
              {facilities.map((facility) => (
                <option key={facility} value={facility}>
                  {facility}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="field" style={{ minWidth: "150px" }}>
            <div className="field-icon">
              <FiMoreVertical />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_desc">Latest First</option>
              <option value="date_asc">Earliest First</option>
              <option value="facility">By Facility</option>
              <option value="user">By User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="modern-card">
          <div className="loading-center">
            <p>Loading bookings...</p>
          </div>
        </div>
      ) : (
        /* Bookings List */
        <div className="modern-card">
          <div className="card-header">
            <h3>
              {filteredBookings.length === 0
                ? "No bookings found"
                : `${filteredBookings.length} booking${
                    filteredBookings.length === 1 ? "" : "s"
                  }`}
            </h3>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty empty-center">
              <FiCalendar size={48} className="empty-icon" />
              <p>
                {searchTerm ||
                filterFacility !== "ALL" ||
                filterStatus !== "ALL"
                  ? "No bookings match your filters"
                  : "No bookings found"}
              </p>
              <p className="empty-subtitle">
                Facility bookings will appear here when residents make
                reservations
              </p>
            </div>
          ) : (
            <div className="stack">
              {filteredBookings.map((booking) => {
                const statusInfo = getBookingStatus(booking);
                const startDateTime = formatDateTime(booking.startsAt);
                const endDateTime = formatDateTime(booking.endsAt);

                return (
                  <div key={booking.id} className="item">
                    <div className="item-header">
                      <div className="item-content">
                        <div className="item-title item-title-spacing">
                          {booking.facility?.name || "Unknown Facility"}
                        </div>

                        <div className="item-meta">
                          <div className="item-sub">
                            <FiUser size={12} className="item-meta-icon" />
                            {booking.user?.name || "Unknown User"}
                          </div>
                          <div className="item-sub">
                            <FiMail size={12} className="item-meta-icon" />
                            {booking.user?.email || "No email"}
                          </div>
                          <div className="item-sub">
                            <FiCalendar size={12} className="item-meta-icon" />
                            {startDateTime.date} - {endDateTime.date}
                          </div>
                          <div className="item-sub">
                            <FiClock size={12} className="item-meta-icon" />
                            {startDateTime.time} - {endDateTime.time}
                          </div>
                        </div>

                        <div className="item-badges">
                          {/* Status Badge */}
                          <div
                            className="status-badge"
                            style={{
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color,
                              border: `1px solid ${statusInfo.color}`,
                            }}
                          >
                            {React.createElement(statusInfo.icon, { size: 12 })}
                            {statusInfo.status}
                          </div>

                          {/* Price Badge if available */}
                          {booking.totalPrice && (
                            <div className="priority-badge">
                              💰 ${booking.totalPrice}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="status-buttons">
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          disabled={deleteLoading[booking.id]}
                          className="btn ghost status-btn"
                          style={{
                            color: "#ef4444",
                            borderColor: "#fee2e2",
                          }}
                          title="Delete booking"
                        >
                          <FiTrash2 size={12} />
                          {deleteLoading[booking.id] ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {/* Additional Details */}
                    {(booking.notes || booking.purpose) && (
                      <div className="item-body item-description">
                        {booking.notes ||
                          booking.purpose ||
                          "No additional details"}
                      </div>
                    )}

                    {/* Booking Details */}
                    <div className="item-details">
                      {booking.id && <span>🆔 ID: {booking.id}</span>}
                      {booking.createdAt && (
                        <span>
                          📅 Booked: {formatDateTime(booking.createdAt).date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
