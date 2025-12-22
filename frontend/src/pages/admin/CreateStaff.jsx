import { useState, useEffect } from "react";
import { ToastContainer, useToast } from "../../components/Toast";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import {
  FiEye,
  FiEyeOff,
  FiShield,
  FiRefreshCcw,
  FiPlus,
  FiX,
  FiTrash2,
  FiUser,
  FiMail,
  FiUserCheck,
} from "react-icons/fi";

const CreateStaff = () => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [gatekeepers, setGatekeepers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    fetchGatekeepers();
  }, []);

  const fetchGatekeepers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/gatekeepers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        params: { communityId: getUser().communityId },
      });
      setGatekeepers(response.data);
    } catch (error) {
      addToast("error", "Error", "Failed to fetch gatekeepers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this gatekeeper?")) {
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [id]: true }));

    try {
      await axios.delete(`${API_URL}/admin/gatekeepers/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      addToast("success", "Success", "Gatekeeper removed successfully");
      fetchGatekeepers();
    } catch (error) {
      addToast(
        "error",
        "Error",
        error.response?.data?.error || "Failed to remove gatekeeper"
      );
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      addToast("error", "Error", "All fields are required");
      return;
    }

    if (!getUser()?.communityId) {
      addToast("error", "Error", "Community ID is required");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API_URL}/admin/gatekeeper-signup`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          communityId: getUser().communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      setFormData({ name: "", email: "", password: "" });
      setIsOpen(false);
      await fetchGatekeepers();
      addToast("success", "Success", "Gatekeeper created successfully");
    } catch (error) {
      addToast(
        "error",
        "Error",
        error.response?.data?.error || "Failed to create gatekeeper"
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: gatekeepers.length,
    active: gatekeepers.filter(
      (g) => g.status === "APPROVED" || g.status === "ACTIVE"
    ).length,
    inactive: gatekeepers.filter(
      (g) => g.status !== "APPROVED" && g.status !== "ACTIVE"
    ).length,
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg">
            <FiShield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Staff Management
            </h2>
            <p className="text-sm text-gray-600">
              Manage gatekeepers and security staff
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FiShield size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">Total Staff</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <FiUserCheck size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">Active</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
              <FiUser size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">Inactive</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={fetchGatekeepers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCcw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiPlus />
          Add Gatekeeper
        </button>
      </div>

      {/* Create Gatekeeper Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Gatekeeper
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiUser size={18} />
                  </div>
                  <input
                    id="name"
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiMail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </span>
                  ) : (
                    "Create Gatekeeper"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gatekeepers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Gatekeepers ({gatekeepers.length})
          </h3>
        </div>

        {loading && gatekeepers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading gatekeepers...</p>
          </div>
        ) : gatekeepers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FiShield size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              No gatekeepers found
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Add your first gatekeeper to get started
            </p>
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiPlus />
              Add Gatekeeper
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gatekeepers.map((gatekeeper) => (
                  <tr
                    key={gatekeeper.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-indigo-600" size={18} />
                        </div>
                        <div className="font-medium text-gray-900">
                          {gatekeeper.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {gatekeeper.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {gatekeeper.role || "GATEKEEPER"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          gatekeeper.status === "APPROVED" ||
                          gatekeeper.status === "ACTIVE"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {gatekeeper.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDelete(gatekeeper.id)}
                        disabled={deleteLoading[gatekeeper.id]}
                      >
                        <FiTrash2 size={14} />
                        {deleteLoading[gatekeeper.id] ? "..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStaff;
