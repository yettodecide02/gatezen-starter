import axios from "axios";
import { useState, useEffect } from "react";
import {
  FiUser,
  FiTruck,
  FiPhone,
  FiCalendar,
  FiSearch,
  FiRefreshCw,
  FiLogIn,
  FiLogOut,
  FiUsers,
  FiClock,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";

export default function VisitorsLog() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");

  useEffect(() => {
    fetchVisitors();
  }, [filters]);

  const fetchVisitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/visitor`,
        {
          headers: { Authorization: `Bearer ${getToken()}` || "" },
          params: {
            communityId: getUser().communityId,
            from: filters.from,
            to: filters.to,
          },
        }
      );
      setVisitors(res.data.visitors);
    } catch (err) {
      setError("Failed to load visitors");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getVisitorTypeConfig = (type) => {
    switch (type) {
      case "DELIVERY":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: FiTruck,
        };
      case "GUEST":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
          icon: FiUser,
        };
      case "SERVICE":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-200",
          icon: FiUser,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
          icon: FiUser,
        };
    }
  };

  const getStatusBadge = (checkIn, checkOut) => {
    if (!checkIn)
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
          <FiClock size={12} />
          Pending
        </span>
      );
    if (checkIn && !checkOut)
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200">
          <FiLogIn size={12} />
          Checked In
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
        <FiLogOut size={12} />
        Checked Out
      </span>
    );
  };

  // Extract unique unit numbers for dropdown
  const uniqueUnits = [
    ...new Set(
      visitors
        .map((v) => v.user?.unit?.number)
        .filter((num) => num !== undefined && num !== null)
    ),
  ];

  // Apply filters
  const filteredVisitors = visitors.filter((visitor) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      visitor.name.toLowerCase().includes(search) ||
      visitor.contact?.includes(search) ||
      visitor.vehicleNo?.toLowerCase().includes(search) ||
      visitor.user?.name.toLowerCase().includes(search) ||
      visitor.user?.unit?.number.toLowerCase().includes(search);

    const matchesType =
      typeFilter === "ALL" || visitor.visitorType === typeFilter;

    const matchesUnit =
      unitFilter === "ALL" || visitor.user?.unit?.number === unitFilter;

    return matchesSearch && matchesType && matchesUnit;
  });

  // Stats
  const stats = {
    total: filteredVisitors.length,
    checkedIn: filteredVisitors.filter((v) => v.checkInAt && !v.checkOutAt)
      .length,
    checkedOut: filteredVisitors.filter((v) => v.checkOutAt).length,
    pending: filteredVisitors.filter((v) => !v.checkInAt).length,
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg">
            <FiUsers size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Visitor Log</h2>
            <p className="text-sm text-gray-600">
              Track and manage all community visitors
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: FiUsers,
            color: "indigo",
          },
          {
            label: "Checked In",
            value: stats.checkedIn,
            icon: FiLogIn,
            color: "green",
          },
          {
            label: "Checked Out",
            value: stats.checkedOut,
            icon: FiLogOut,
            color: "gray",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: FiClock,
            color: "amber",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-2 bg-${item.color}-100 text-${item.color}-600 rounded-lg`}
              >
                <item.icon size={20} />
              </div>
              <div className="text-sm font-medium text-gray-600">
                {item.label}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Filters */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Visitor Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visitor Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value="GUEST">Guest</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>

          {/* Unit Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Units</option>
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  Unit {unit}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, contact, vehicle or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchVisitors}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FiRefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Visitors List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FiRefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading visitors...</p>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <FiUsers size={32} className="text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            No visitors found
          </p>
          <p className="text-sm text-gray-600">
            {searchTerm || filters.from !== filters.to
              ? "Try adjusting your filters or search criteria"
              : "Visitors will appear here when they check in"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisitors.map((visitor) => {
            const typeConfig = getVisitorTypeConfig(visitor.visitorType);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={visitor.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full ${typeConfig.bg} flex items-center justify-center`}
                    >
                      <TypeIcon className={`w-7 h-7 ${typeConfig.text}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {visitor.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}
                      >
                        {visitor.visitorType}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(visitor.checkInAt, visitor.checkOutAt)}
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">Visiting:</span>
                    <span className="font-semibold text-gray-900">
                      {visitor.user.name}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-700">
                      Unit{" "}
                      <span className="font-medium text-indigo-700">
                        {visitor.user.unit.number}
                      </span>
                      , Block{" "}
                      <span className="font-medium text-indigo-700">
                        {visitor.user.unit.block.name}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FiCalendar size={16} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Date</div>
                      <div className="font-medium text-gray-900">
                        {formatDate(visitor.visitDate)}
                      </div>
                    </div>
                  </div>

                  {visitor.contact && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FiPhone size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Contact
                        </div>
                        <div className="font-medium text-gray-900">
                          {visitor.contact}
                        </div>
                      </div>
                    </div>
                  )}

                  {visitor.vehicleNo && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FiTruck size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Vehicle
                        </div>
                        <div className="font-medium text-gray-900 font-mono">
                          {visitor.vehicleNo}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        visitor.checkInAt ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <FiLogIn
                        size={16}
                        className={
                          visitor.checkInAt ? "text-green-600" : "text-gray-400"
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">
                        Check In
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          visitor.checkInAt ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {visitor.checkInAt
                          ? formatTime(visitor.checkInAt)
                          : "Not yet"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <FiLogOut
                        size={16}
                        className={
                          visitor.checkOutAt ? "text-gray-600" : "text-gray-400"
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">
                        Check Out
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          visitor.checkOutAt ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {visitor.checkOutAt
                          ? formatTime(visitor.checkOutAt)
                          : "Not yet"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
