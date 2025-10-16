import { useState, useEffect } from "react";
import { ToastContainer, useToast } from "../../components/Toast";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FiRefreshCcw } from "react-icons/fi";

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
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    fetchGatekeepers();
  }, []);

  const fetchGatekeepers = async () => {
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
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this gatekeeper?")) {
      return;
    }

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    if (!formData.name || !formData.email || !formData.password) {
      addToast("error", "Error", "All fields are required");
      return;
    }

    if (!getUser()?.communityId) {
      addToast("error", "Error", "Community ID is required");
      return;
    }

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
    }
  };

  return (
    <div className="container mx-auto py-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <div className="flex gap-3">
          <button
            onClick={fetchGatekeepers}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiRefreshCcw />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Gatekeeper
          </button>
        </div>

        {isOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create New Gatekeeper</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FiEyeOff size={20} />
                      ) : (
                        <FiEye size={20} />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Gatekeeper
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-5 gap-4 p-4 font-semibold border-b">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {gatekeepers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No gatekeepers found
          </div>
        ) : (
          gatekeepers.map((gatekeeper) => (
            <div
              key={gatekeeper.id}
              className="grid grid-cols-5 gap-4 p-4 border-b hover:bg-gray-50"
            >
              <div>{gatekeeper.name}</div>
              <div>{gatekeeper.email}</div>
              <div>
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {gatekeeper.role || "GATEKEEPER"}
                </span>
              </div>
              <div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    gatekeeper.status === "APPROVED" ||
                    gatekeeper.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {gatekeeper.status}
                </span>
              </div>
              <div>
                <button
                  className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50 transition-colors"
                  onClick={() => handleDelete(gatekeeper.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CreateStaff;
