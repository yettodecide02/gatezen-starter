import { useEffect, useState } from "react";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import {
  FiPackage,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiX,
  FiCalendar,
  FiTruck,
} from "react-icons/fi";

export default function MyPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        import.meta.env.VITE_API_URL + "/resident/packages",
        {
          headers: {
            Authorization: `Bearer ${getToken()}` || "",
          },
          params: {
            communityId: getUser().communityId,
            userId: getUser().id,
            from: dateRange.from,
            to: dateRange.to,
          },
        }
      );
      setPackages(res.data || []);
    } catch (err) {
      console.error("Error loading packages:", err);
      setError(err.response?.data?.error || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilter = () => {
    load();
  };

  const stats = {
    total: packages.length,
    pending: packages.filter((p) => p.status === "PENDING").length,
    collected: packages.filter(
      (p) => p.status === "PICKED" || p.status === "COLLECTED"
    ).length,
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FiPackage className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Packages</h1>
              <p className="text-sm text-gray-600">
                View your package delivery history
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={applyFilter}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCalendar className="w-4 h-4" />
              Apply Filter
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Packages List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Package History ({packages.length})
            </h2>
          </div>

          {loading && packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiPackage className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No packages found
              </h3>
              <p className="text-sm text-gray-600">
                No packages were delivered in the selected date range
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        pkg.status === "PENDING"
                          ? "bg-amber-100"
                          : "bg-green-100"
                      }`}
                    >
                      {pkg.status === "PENDING" ? (
                        <FiClock className="w-6 h-6 text-amber-600" />
                      ) : (
                        <FiCheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {pkg.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {pkg.status === "PENDING"
                              ? "Waiting for pickup"
                              : "Collected"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                            pkg.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {pkg.status === "PENDING" ? (
                            <FiClock className="w-3 h-3" />
                          ) : (
                            <FiCheckCircle className="w-3 h-3" />
                          )}
                          {pkg.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {pkg.receivedAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiTruck className="w-4 h-4" />
                            <span>
                              Received:{" "}
                              {new Date(pkg.receivedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {pkg.image && (
                          <button
                            onClick={() => setSelectedImage(pkg.image)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
                          >
                            <FiImage className="w-4 h-4" />
                            View Image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 bg-opacity-75"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-700" />
            </button>
            <div className="p-4">
              <img
                src={selectedImage}
                alt="Package"
                className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
