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
  FiUsers,
  FiSave,
  FiMapPin,
} from "react-icons/fi";
import { getUser } from "../../lib/auth";

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

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || "";
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
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Initialize facilities object and load existing community data
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

    // Load existing community data
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

        // Set community basic data
        setCommunityData({
          name: community.name || "",
          description: community.description || "",
          address: community.address || "",
        });

        // Convert facilities back to frontend format
        if (community.facilities && community.facilities.length > 0) {
          const facilitiesMap = {};

          // Initialize with defaults first
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

          // Override with actual data
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
      // Don't show error to user for initial load, just log it
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

  const toggleFacility = (facilityId) => {
    updateFacility(facilityId, "enabled", !facilities[facilityId]?.enabled);
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
    setError("");
    setSuccess("");

    try {
      // Prepare data for API
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

      console.log("Community configuration:", payload);

      // Make API call to save community configuration
      const response = await axios.post(`${API_URL}/admin/community`, payload, {
        headers: getAuthHeaders(),
      });

      if (response.data.success) {
        setSuccess(
          response.data.message || "Community configuration saved successfully!"
        );
        setTimeout(() => setSuccess(""), 3000);

        // Reload the community data to reflect any server-side changes
        await loadCommunityData();
      } else {
        setError(
          response.data.message || "Failed to save community configuration"
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save community configuration"
      );
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-content" style={{ padding: "32px" }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: "32px" }}>
        <div className="section-left">
          <div className="section-icon">
            <FiHome />
          </div>
          <div>
            <h2>Community Configuration</h2>
            <p className="muted">
              Configure your community details and facilities
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !communityData.name.trim()}
          className="btn primary"
        >
          <FiSave />
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="auth-error" style={{ marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {success && (
        <div
          className="auth-error"
          style={{
            marginBottom: "24px",
            background: "#d1fae5",
            color: "#065f46",
            borderColor: "#a7f3d0",
          }}
        >
          {success}
        </div>
      )}

      {/* Community Details */}
      <div className="modern-card" style={{ marginBottom: "32px" }}>
        <div className="card-header" style={{ marginBottom: "24px" }}>
          <h3 style={{ display: "flex", alignItems: "center", margin: 0 }}>
            <FiMapPin style={{ marginRight: "8px" }} />
            Community Details
          </h3>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div>
            <label
              className="label"
              style={{ marginBottom: "8px", display: "block" }}
            >
              Community Name *
            </label>
            <input
              type="text"
              className="input"
              value={communityData.name}
              onChange={(e) => updateCommunityData("name", e.target.value)}
              placeholder="Enter community name"
              required
            />
          </div>

          <div>
            <label
              className="label"
              style={{ marginBottom: "8px", display: "block" }}
            >
              Description
            </label>
            <textarea
              className="textarea"
              value={communityData.description}
              onChange={(e) =>
                updateCommunityData("description", e.target.value)
              }
              placeholder="Brief description of your community"
              rows={3}
            />
          </div>

          <div>
            <label
              className="label"
              style={{ marginBottom: "8px", display: "block" }}
            >
              Address
            </label>
            <textarea
              className="textarea"
              value={communityData.address}
              onChange={(e) => updateCommunityData("address", e.target.value)}
              placeholder="Community address"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Facilities Configuration */}
      <div className="modern-card">
        <div className="card-header" style={{ marginBottom: "24px" }}>
          <div>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                margin: "0 0 8px 0",
              }}
            >
              <FiSettings style={{ marginRight: "8px" }} />
              Facilities & Amenities
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Toggle facilities and configure their settings
            </p>
          </div>
        </div>

        <div className="stack" style={{ gap: "16px" }}>
          {FACILITY_TYPES.map((facilityType) => {
            const config = facilities[facilityType.id] || {};
            const isEnabled = config.enabled;

            return (
              <div key={facilityType.id} className="facility-card">
                {/* Facility Header */}
                <div className="facility-header">
                  <div className="facility-info">
                    <span className="facility-icon">{facilityType.icon}</span>
                    <div>
                      <h4 className="facility-name">{facilityType.name}</h4>
                      <span className="facility-status">
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="toggle-btn"
                    onClick={() => toggleFacility(facilityType.id)}
                  >
                    {isEnabled ? (
                      <FiToggleRight size={24} color="#10b981" />
                    ) : (
                      <FiToggleLeft size={24} color="#6b7280" />
                    )}
                  </button>
                </div>

                {/* Facility Configuration */}
                {isEnabled && (
                  <div
                    className="facility-config"
                    style={{ marginTop: "20px", paddingTop: "20px" }}
                  >
                    <div
                      className="config-row"
                      style={{ gap: "16px", marginBottom: "16px" }}
                    >
                      {/* Quantity */}
                      <div className="config-item">
                        <label
                          className="label"
                          style={{ marginBottom: "6px", display: "block" }}
                        >
                          Quantity
                        </label>
                        <div className="counter">
                          <button
                            className="counter-btn"
                            onClick={() => adjustQuantity(facilityType.id, -1)}
                          >
                            <FiMinus />
                          </button>
                          <span className="counter-value">
                            {config.quantity}
                          </span>
                          <button
                            className="counter-btn"
                            onClick={() => adjustQuantity(facilityType.id, 1)}
                          >
                            <FiPlus />
                          </button>
                        </div>
                      </div>

                      {/* Max Capacity */}
                      <div className="config-item">
                        <label
                          className="label"
                          style={{ marginBottom: "6px", display: "block" }}
                        >
                          Max Capacity
                        </label>
                        <div className="counter">
                          <button
                            className="counter-btn"
                            onClick={() => adjustCapacity(facilityType.id, -1)}
                          >
                            <FiMinus />
                          </button>
                          <span className="counter-value">
                            {config.maxCapacity}
                          </span>
                          <button
                            className="counter-btn"
                            onClick={() => adjustCapacity(facilityType.id, 1)}
                          >
                            <FiPlus />
                          </button>
                        </div>
                      </div>

                      {/* Payment Toggle */}
                      <div className="config-item">
                        <label
                          className="label"
                          style={{ marginBottom: "8px", display: "block" }}
                        >
                          Payment
                        </label>
                        <button
                          className="payment-toggle"
                          onClick={() =>
                            updateFacility(
                              facilityType.id,
                              "isPaid",
                              !config.isPaid
                            )
                          }
                        >
                          <span
                            className={`payment-status ${
                              config.isPaid ? "paid" : "free"
                            }`}
                          >
                            {config.isPaid ? (
                              <>
                                <FiDollarSign size={14} />
                                Paid
                              </>
                            ) : (
                              "Free"
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Price Configuration (if paid) */}
                    {config.isPaid && (
                      <div
                        className="config-row"
                        style={{ marginTop: "16px", gap: "16px" }}
                      >
                        <div className="config-item">
                          <label
                            className="label"
                            style={{ marginBottom: "8px", display: "block" }}
                          >
                            Price
                          </label>
                          <input
                            type="number"
                            className="input"
                            value={config.price}
                            onChange={(e) =>
                              updateFacility(
                                facilityType.id,
                                "price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="config-item">
                          <label
                            className="label"
                            style={{ marginBottom: "8px", display: "block" }}
                          >
                            Price Type
                          </label>
                          <select
                            className="select"
                            value={config.priceType}
                            onChange={(e) =>
                              updateFacility(
                                facilityType.id,
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
                    <div className="config-row" style={{ marginTop: "16px" }}>
                      <div className="config-item">
                        <label
                          className="label"
                          style={{ marginBottom: "8px", display: "block" }}
                        >
                          Start Time
                        </label>
                        <select
                          className="select"
                          value={config.operatingHours.split("-")[0] || "09:00"}
                          onChange={(e) => {
                            const endTime =
                              config.operatingHours.split("-")[1] || "21:00";
                            updateFacility(
                              facilityType.id,
                              "operatingHours",
                              `${e.target.value}-${endTime}`
                            );
                          }}
                        >
                          <option value="06:00">06:00 AM</option>
                          <option value="07:00">07:00 AM</option>
                          <option value="08:00">08:00 AM</option>
                          <option value="09:00">09:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="12:00">12:00 PM</option>
                        </select>
                      </div>
                      <div className="config-item">
                        <label
                          className="label"
                          style={{ marginBottom: "8px", display: "block" }}
                        >
                          End Time
                        </label>
                        <select
                          className="select"
                          value={config.operatingHours.split("-")[1] || "21:00"}
                          onChange={(e) => {
                            const startTime =
                              config.operatingHours.split("-")[0] || "09:00";
                            updateFacility(
                              facilityType.id,
                              "operatingHours",
                              `${startTime}-${e.target.value}`
                            );
                          }}
                        >
                          <option value="13:00">01:00 PM</option>
                          <option value="14:00">02:00 PM</option>
                          <option value="15:00">03:00 PM</option>
                          <option value="16:00">04:00 PM</option>
                          <option value="17:00">05:00 PM</option>
                          <option value="18:00">06:00 PM</option>
                          <option value="19:00">07:00 PM</option>
                          <option value="20:00">08:00 PM</option>
                          <option value="21:00">09:00 PM</option>
                          <option value="22:00">10:00 PM</option>
                          <option value="23:00">11:00 PM</option>
                        </select>
                      </div>
                    </div>

                    {/* Rules */}
                    <div className="config-row" style={{ marginTop: "16px" }}>
                      <div className="config-item full-width">
                        <label
                          className="label"
                          style={{ marginBottom: "8px", display: "block" }}
                        >
                          Rules & Guidelines (Optional)
                        </label>
                        <textarea
                          className="textarea"
                          value={config.rules}
                          onChange={(e) =>
                            updateFacility(
                              facilityType.id,
                              "rules",
                              e.target.value
                            )
                          }
                          placeholder="Specific rules for this facility..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
