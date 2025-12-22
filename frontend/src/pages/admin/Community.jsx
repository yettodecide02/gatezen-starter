import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiHome,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiPlus,
  FiMinus,
  FiDollarSign,
  FiSave,
  FiMapPin,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const FACILITY_TYPES = [
  { id: "swimming_pool", name: "Swimming Pool", icon: "🏊" },
  { id: "gymnasium", name: "Gymnasium", icon: "🏋️" },
  { id: "tennis_court", name: "Tennis Court", icon: "🎾" },
  { id: "basketball_court", name: "Basketball Court", icon: "🏀" },
  { id: "playground", name: "Playground", icon: "🛝" },
  { id: "clubhouse", name: "Clubhouse", icon: "🏛️" },
  { id: "party_hall", name: "Party Hall", icon: "🎉" },
  { id: "conference_room", name: "Conference Room", icon: "🏢" },
  { id: "library", name: "Library", icon: "📚" },
  { id: "garden", name: "Garden", icon: "🌳" },
  { id: "jogging_track", name: "Jogging Track", icon: "🏃" },
];

const PRICE_TYPES = [
  { id: "per_hour", name: "Per Hour" },
  { id: "per_day", name: "Per Day" },
  { id: "per_week", name: "Per Week" },
  { id: "per_month", name: "Per Month" },
  { id: "one_time", name: "One Time" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const getAuthHeaders = () => {
  const token = getToken() || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export default function Community() {
  const [communityData, setCommunityData] = useState({
    name: "",
    description: "",
    address: "",
  });

  const [facilities, setFacilities] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const initialFacilities = {};
    FACILITY_TYPES.forEach((type) => {
      initialFacilities[type.id] = {
        enabled: false,
        quantity: 1,
        maxCapacity: 10,
        isPaid: false,
        price: 0,
        priceType: "per_hour",
        operatingHours: "09:00-21:00",
        rules: "",
      };
    });
    setFacilities(initialFacilities);
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/community`, {
        headers: getAuthHeaders(),
        params: { communityId: getUser().communityId },
      });

      if (response.data.success && response.data.data) {
        const community = response.data.data;

        setCommunityData({
          name: community.name || "",
          description: community.description || "",
          address: community.address || "",
        });

        if (community.facilities && community.facilities.length > 0) {
          const facilitiesMap = {};

          FACILITY_TYPES.forEach((type) => {
            facilitiesMap[type.id] = {
              enabled: false,
              quantity: 1,
              maxCapacity: 10,
              isPaid: false,
              price: 0,
              priceType: "per_hour",
              operatingHours: "09:00-21:00",
              rules: "",
            };
          });

          community.facilities.forEach((facility) => {
            facilitiesMap[facility.facilityType] = {
              enabled: facility.enabled,
              quantity: facility.quantity,
              maxCapacity: facility.maxCapacity,
              isPaid: facility.isPaid,
              price: facility.price || 0,
              priceType: facility.priceType || "per_hour",
              operatingHours: facility.operatingHours || "09:00-21:00",
              rules: facility.rules || "",
            };
          });

          setFacilities(facilitiesMap);
        }
      }
    } catch (error) {
      console.error("Error loading community data:", error);
    }
  };

  const updateCommunityData = (field, value) => {
    setCommunityData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacility = (facilityId, field, value) => {
    setFacilities((prev) => ({
      ...prev,
      [facilityId]: {
        ...prev[facilityId],
        [field]: value,
      },
    }));
  };

  const adjustQuantity = (facilityId, delta) => {
    const currentQuantity = facilities[facilityId]?.quantity || 1;
    const newQuantity = Math.max(1, Math.min(50, currentQuantity + delta));
    updateFacility(facilityId, "quantity", newQuantity);
  };

  const adjustCapacity = (facilityId, delta) => {
    const currentCapacity = facilities[facilityId]?.maxCapacity || 1;
    const newCapacity = Math.max(1, Math.min(1000, currentCapacity + delta));
    updateFacility(facilityId, "maxCapacity", newCapacity);
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const enabledFacilities = Object.entries(facilities)
        .filter(([_, config]) => config.enabled)
        .map(([facilityId, config]) => ({
          facilityType: facilityId,
          ...config,
        }));

      const payload = {
        ...communityData,
        facilities: enabledFacilities,
        communityId: getUser().communityId,
      };

      const response = await axios.post(`${API_URL}/admin/community`, payload, {
        headers: getAuthHeaders(),
      });

      if (response.data.success) {
        addToast(
          "success",
          "Configuration Saved",
          response.data.message || "Community configuration saved successfully!"
        );
        await loadCommunityData();
      } else {
        addToast(
          "error",
          "Save Failed",
          response.data.message || "Failed to save community configuration"
        );
      }
    } catch (err) {
      addToast(
        "error",
        "Save Error",
        err.response?.data?.message ||
          err.message ||
          "Failed to save community configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const enabledCount = Object.values(facilities).filter(
    (f) => f.enabled
  ).length;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg">
            <FiHome size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Community Configuration
            </h2>
            <p className="text-sm text-gray-600">
              Configure your community details and facilities
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !communityData.name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiSave />
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      {/* Community Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <FiMapPin size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Community Details
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={communityData.name}
              onChange={(e) => updateCommunityData("name", e.target.value)}
              placeholder="Enter community name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              value={communityData.description}
              onChange={(e) =>
                updateCommunityData("description", e.target.value)
              }
              placeholder="Brief description of your community"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              value={communityData.address}
              onChange={(e) => updateCommunityData("address", e.target.value)}
              placeholder="Community address"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Facilities Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
              <FiSettings size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Facilities & Amenities
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Click on a facility to view or configure its settings •{" "}
            {enabledCount} enabled
          </p>
        </div>

        {/* Facility Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {FACILITY_TYPES.map((facilityType) => {
            const config = facilities[facilityType.id] || {};
            const isEnabled = config.enabled;

            return (
              <button
                key={facilityType.id}
                onClick={() => setSelectedFacility(facilityType)}
                className={`relative rounded-xl border-2 transition-all p-4 flex flex-col items-center text-center hover:shadow-lg ${
                  isEnabled
                    ? "bg-emerald-50 border-emerald-400 shadow-sm"
                    : "bg-gray-50 border-gray-300 hover:border-gray-400"
                }`}
              >
                {isEnabled && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <FiCheckCircle size={14} className="text-white" />
                  </div>
                )}
                <span className="text-4xl mb-2">{facilityType.icon}</span>
                <h4 className="text-sm font-semibold text-gray-900">
                  {facilityType.name}
                </h4>
                <span
                  className={`text-xs mt-1 font-medium ${
                    isEnabled ? "text-emerald-600" : "text-gray-500"
                  }`}
                >
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Facility Configuration Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedFacility.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedFacility.name}
                  </h3>
                  <button
                    className={`mt-1 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      facilities[selectedFacility.id]?.enabled
                        ? "text-emerald-600 hover:text-emerald-700"
                        : "text-red-600 hover:text-red-700"
                    }`}
                    onClick={() =>
                      updateFacility(
                        selectedFacility.id,
                        "enabled",
                        !facilities[selectedFacility.id]?.enabled
                      )
                    }
                  >
                    {facilities[selectedFacility.id]?.enabled ? (
                      <>
                        <FiToggleRight size={20} /> Enabled
                      </>
                    ) : (
                      <>
                        <FiToggleLeft size={20} /> Disabled
                      </>
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              {(() => {
                const config = facilities[selectedFacility.id] || {};

                return (
                  <>
                    {/* Quantity & Capacity */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Quantity
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adjustQuantity(selectedFacility.id, -1)
                            }
                          >
                            <FiMinus size={18} />
                          </button>
                          <span className="w-12 text-center text-lg font-semibold text-gray-900">
                            {config.quantity}
                          </span>
                          <button
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adjustQuantity(selectedFacility.id, 1)
                            }
                          >
                            <FiPlus size={18} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Max Capacity
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adjustCapacity(selectedFacility.id, -1)
                            }
                          >
                            <FiMinus size={18} />
                          </button>
                          <span className="w-12 text-center text-lg font-semibold text-gray-900">
                            {config.maxCapacity}
                          </span>
                          <button
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                            onClick={() =>
                              adjustCapacity(selectedFacility.id, 1)
                            }
                          >
                            <FiPlus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Payment Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Payment Type
                      </label>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                          config.isPaid
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                        onClick={() =>
                          updateFacility(
                            selectedFacility.id,
                            "isPaid",
                            !config.isPaid
                          )
                        }
                      >
                        {config.isPaid ? (
                          <span className="flex items-center gap-1.5">
                            <FiDollarSign size={18} /> Paid
                          </span>
                        ) : (
                          "Free"
                        )}
                      </button>
                    </div>

                    {/* Price Configuration */}
                    {config.isPaid && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price
                          </label>
                          <input
                            type="number"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={config.price}
                            onChange={(e) =>
                              updateFacility(
                                selectedFacility.id,
                                "price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price Type
                          </label>
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                            value={config.priceType}
                            onChange={(e) =>
                              updateFacility(
                                selectedFacility.id,
                                "priceType",
                                e.target.value
                              )
                            }
                          >
                            {PRICE_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Operating Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                          value={config.operatingHours.split("-")[0] || "09:00"}
                          onChange={(e) => {
                            const end =
                              config.operatingHours.split("-")[1] || "21:00";
                            updateFacility(
                              selectedFacility.id,
                              "operatingHours",
                              `${e.target.value}-${end}`
                            );
                          }}
                        >
                          <option value="06:00">06:00 AM</option>
                          <option value="08:00">08:00 AM</option>
                          <option value="09:00">09:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                          value={config.operatingHours.split("-")[1] || "21:00"}
                          onChange={(e) => {
                            const start =
                              config.operatingHours.split("-")[0] || "09:00";
                            updateFacility(
                              selectedFacility.id,
                              "operatingHours",
                              `${start}-${e.target.value}`
                            );
                          }}
                        >
                          <option value="17:00">05:00 PM</option>
                          <option value="18:00">06:00 PM</option>
                          <option value="19:00">07:00 PM</option>
                          <option value="20:00">08:00 PM</option>
                          <option value="21:00">09:00 PM</option>
                        </select>
                      </div>
                    </div>

                    {/* Rules */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rules & Guidelines
                      </label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Specific rules for this facility..."
                        value={config.rules}
                        onChange={(e) =>
                          updateFacility(
                            selectedFacility.id,
                            "rules",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
