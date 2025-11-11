import axios from "axios";
import { useEffect, useState } from "react";
import { getToken, getUser } from "../../lib/auth";
import {
  FiPackage,
  FiRefreshCw,
  FiUser,
  FiHome,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiX,
  FiPlus,
  FiUpload,
} from "react-icons/fi";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPackage, setNewPackage] = useState({
    userId: "",
    image: "",
    name: "",
  });
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    loadPackages();
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const res = await axios.get(
        import.meta.env.VITE_API_URL + "/gatekeeper/residents",
        {
          headers: {
            Authorization: `Bearer ${getToken()}` || "",
          },
          params: {
            communityId: getUser().communityId,
          },
        }
      );
      setResidents(res.data || []);
    } catch (err) {
      console.error("Error loading residents:", err);
    }
  };

  const loadPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        import.meta.env.VITE_API_URL + "/gatekeeper/packages",
        {
          headers: {
            Authorization: `Bearer ${getToken()}` || "",
          },
          params: {
            communityId: getUser().communityId,
          },
        }
      );
      setPackages(res.data || []);
    } catch (err) {
      console.error("Error loading packages:", err);
      setError("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      e.target.value = "";
      return;
    }

    setImageFileName(file.name);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPackage({ ...newPackage, image: reader.result });
    };
    reader.onerror = () => {
      alert("Failed to read file");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const createPackage = async () => {
    if (!newPackage.userId) return alert("Please select a user");
    if (!newPackage.image) return alert("Please upload an image");
    if (!newPackage.name) return alert("Please enter an name of the package");

    try {
      setLoading(true);
      await axios.post(
        import.meta.env.VITE_API_URL + "/gatekeeper/packages",
        {
          userId: newPackage.userId,
          communityId: getUser().communityId,
          image: newPackage.image,
          name: newPackage.name,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      setShowCreateModal(false);
      setNewPackage({ userId: "", image: "" });
      setImageFileName("");
      await loadPackages();
    } catch (err) {
      console.error(err);
      setError("Failed to create package");
    } finally {
      setLoading(false);
    }
  };

  const updatePackageStatus = async (pkgId, newStatus) => {
    try {
      await axios.put(
        import.meta.env.VITE_API_URL + `/gatekeeper/packages/${pkgId}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      await loadPackages();
    } catch (err) {
      console.error("Error updating package:", err);
      setError("Failed to update package status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg">
              <FiPackage size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Package Management
              </h2>
              <p className="text-sm text-gray-600">
                Track and manage resident packages
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadPackages}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiPlus size={16} /> New Package
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Packages List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Packages ({packages.length})
          </h3>
        </div>

        {loading && packages.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FiPackage size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              No pending packages
            </p>
            <p className="text-sm text-gray-600">
              Packages will appear here when they arrive
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                      <FiUser className="text-indigo-600" size={22} />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {pkg.user?.name || "Unknown User"}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiHome size={14} />
                        <span>
                          {pkg.user?.unit?.block?.name
                            ? `Block ${pkg.user.unit.block.name}`
                            : "No Block"}{" "}
                          •{" "}
                          {pkg.user?.unit?.number
                            ? `Unit ${pkg.user.unit.number}`
                            : "No Unit"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border
        ${
          pkg.status === "PENDING"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : pkg.status === "PICKED"
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-gray-50 text-gray-700 border-gray-200"
        }`}
                  >
                    {pkg.status === "PENDING" ? (
                      <FiClock size={14} />
                    ) : (
                      <FiCheckCircle size={14} />
                    )}
                    {pkg.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {pkg.image && (
                    <button
                      onClick={() => setSelectedImage(pkg.image)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                    >
                      <FiImage size={14} />
                      View Image
                    </button>
                  )}

                  {pkg.status === "PENDING" && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, "PICKED")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      <FiCheckCircle size={14} /> Mark Collected
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 bg-opacity-75"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              >
                <FiX size={20} className="text-gray-700" />
              </button>
            </div>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 bg-opacity-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Package
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Resident <span className="text-red-500">*</span>
                </label>
                <select
                  value={newPackage.userId}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, userId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a resident...</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.name} - Block{" "}
                      {resident.unit?.block?.name || "N/A"}, Unit{" "}
                      {resident.unit?.number || "N/A"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Name of Package <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, name: e.target.value })
                  }
                  placeholder="Enter package name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Image <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiUpload size={18} />
                      <span>
                        {imageFileName
                          ? imageFileName
                          : "Click to upload image (Max 5MB)"}
                      </span>
                    </div>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                {newPackage.image && (
                  <div className="mt-2">
                    <img
                      src={newPackage.image}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPackage({ userId: "", image: "" });
                    setImageFileName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={createPackage}
                  disabled={loading || !newPackage.userId || !newPackage.image}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Package"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
