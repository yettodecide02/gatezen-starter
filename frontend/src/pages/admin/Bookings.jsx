import React, { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiUser,
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
  FiDollarSign,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFacility, setFilterFacility] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  const [deleteLoading, setDeleteLoading] = useState({});
  const [facilities, setFacilities] = useState([]);
  const { toasts, addToast, removeToast } = useToast();

  const token = getToken();

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
        classes: "bg-green-100 text-green-700 border-green-200",
        icon: FiCheckCircle,
      };
    } else if (startDate <= now && endDate >= now) {
      return {
        status: "ACTIVE",
        classes: "bg-amber-100 text-amber-700 border-amber-200",
        icon: FiClock,
      };
    } else {
      return {
        status: "UPCOMING",
        classes: "bg-blue-100 text-blue-700 border-blue-200",
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
    <div className="max-w-7xl mx-auto p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg">
            <FiCalendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Facility Bookings
            </h2>
            <p className="text-sm text-gray-600">
              Manage community facility reservations
            </p>
          </div>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <FiXCircle className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        {/* Status Filter Pills */}
        <div className="flex gap-3 flex-wrap mb-4">
          {Object.entries(statusCounts).map(([status, count]) => {
            const icons = {
              UPCOMING: FiCalendar,
              ACTIVE: FiClock,
              COMPLETED: FiCheckCircle,
            };
            const StatusIcon = icons[status];

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
                    : status.charAt(0) + status.slice(1).toLowerCase()}
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

        {/* Search and Filters Row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FiSearch size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by user, facility, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Facility Filter */}
          <div className="min-w-[180px] relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <FiFilter size={18} />
            </div>
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
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
          <div className="min-w-[180px] relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <FiMoreVertical size={18} />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
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
        <div className="bg-white rounded-xl border border-gray-200 p-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        </div>
      ) : (
        /* Bookings List */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {filteredBookings.length === 0
                ? "No bookings found"
                : `${filteredBookings.length} booking${
                    filteredBookings.length === 1 ? "" : "s"
                  }`}
            </h3>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiCalendar size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {searchTerm ||
                filterFacility !== "ALL" ||
                filterStatus !== "ALL"
                  ? "No bookings match your filters"
                  : "No bookings found"}
              </p>
              <p className="text-sm text-gray-600">
                Facility bookings will appear here when residents make
                reservations
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => {
                const statusInfo = getBookingStatus(booking);
                const startDateTime = formatDateTime(booking.startsAt);
                const endDateTime = formatDateTime(booking.endsAt);

                return (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                          {booking.facility?.name || "Unknown Facility"}
                        </h4>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <FiUser size={14} className="flex-shrink-0" />
                            <span>{booking.user?.name || "Unknown User"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiMail size={14} className="flex-shrink-0" />
                            <span className="truncate">
                              {booking.user?.email || "No email"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiCalendar size={14} className="flex-shrink-0" />
                            <span>
                              {startDateTime.date} - {endDateTime.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FiClock size={14} className="flex-shrink-0" />
                            <span>
                              {startDateTime.time} - {endDateTime.time}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.classes}`}
                          >
                            {React.createElement(statusInfo.icon, { size: 14 })}
                            {statusInfo.status}
                          </span>

                          {/* Price Badge if available */}
                          {booking.totalPrice && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <FiDollarSign size={14} />
                              {booking.totalPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          disabled={deleteLoading[booking.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete booking"
                        >
                          <FiTrash2 size={14} />
                          {deleteLoading[booking.id] ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {/* Additional Details */}
                    {(booking.notes || booking.purpose) && (
                      <div className="mb-3 text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                        {booking.notes ||
                          booking.purpose ||
                          "No additional details"}
                      </div>
                    )}

                    {/* Booking Details */}
                    {(booking.id || booking.createdAt) && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {booking.id && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">ID:</span>{" "}
                            {booking.id}
                          </span>
                        )}
                        {booking.createdAt && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Booked:</span>{" "}
                            {formatDateTime(booking.createdAt).date}
                          </span>
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
    </div>
  );
}
