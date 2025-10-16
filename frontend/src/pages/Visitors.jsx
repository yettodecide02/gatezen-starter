import axios from "axios";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiMail,
  FiCalendar,
  FiMapPin,
  FiClipboard,
  FiTruck,
  FiCheckCircle,
  FiActivity,
} from "react-icons/fi";
import Toast, { ToastContainer, useToast } from "../components/Toast";
import { getToken, getUser } from "../lib/auth";

function isoNowLocalDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoNowLocalTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Visitors() {
  const user = useMemo(() => {
    return getUser() || null;
  }, []);

  const [list, setList] = useState([]);
  const [from, setFrom] = useState(isoNowLocalDate());
  const [to, setTo] = useState(isoNowLocalDate());

  // pre-auth form
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [visitorType, setVisitorType] = useState("GUEST"); // Match backend field name
  const [visitDate, setVisitDate] = useState(isoNowLocalDate());
  const [visitTime, setVisitTime] = useState(isoNowLocalTime());
  const [vehicleNo, setVehicleNo] = useState(""); // Match backend field name
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = getToken();

  // Toast management using custom hook
  const { toasts, addToast, removeToast } = useToast();

  // Check authentication
  useEffect(() => {

    if (!user || !token) {
      addToast(
        "error",
        "Authentication Required",
        "Please log in to access visitor management."
      );
      return;
    }
    if (!user.communityId || !user.id) {
      addToast(
        "error",
        "Profile Incomplete",
        "User profile incomplete. Please contact administrator."
      );
      return;
    }
  }, [user, token, addToast]);

  async function load() {
    if (!user || !user.communityId || !user.id) {
      addToast(
        "error",
        "Authentication Error",
        "User information missing. Please log in again."
      );
      return;
    }

    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      qs.set("communityId", user.communityId);
      qs.set("userId", user.id); // Add userId to filter by resident's own visitors

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/resident/visitors?${qs.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Backend returns visitors directly, not wrapped in data property
      const visitors = Array.isArray(res.data) ? res.data : [];
      setList(visitors);
    } catch (error) {
      console.error("Error loading visitors:", error);
      addToast(
        "error",
        "Loading Failed",
        "Error loading visitors. Please try again."
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [from, to]);

  // live updates via SSE
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${API_URL}/events`);
    const refresh = () => load();
    es.addEventListener("visitor", refresh);
    es.onerror = () => {};
    return () => {
      es.removeEventListener("visitor", refresh);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function preAuthorize(e) {
    e.preventDefault();
    setMsg("");
    if (!name) {
      addToast("error", "Validation Error", "Please fill visitor name.");
      return;
    }
    if (visitorType === "GUEST" && !contact) {
      addToast(
        "error",
        "Validation Error",
        "Email is required for GUEST visitor type."
      );
      return;
    }
    if (!user || !user.communityId) {
      addToast(
        "error",
        "Authentication Error",
        "User community information missing. Please log in again."
      );
      return;
    }
    if (!user.id) {
      addToast(
        "error",
        "Authentication Error",
        "User ID missing. Please log in again."
      );
      return;
    }
    try {
      setSubmitting(true);
      // Create date in local timezone first, then convert to ISO
      const localDateTime = `${visitDate}T${visitTime}:00`;
      const visitDateTime = new Date(localDateTime).toISOString();


      const requestData = {
        name: name.trim(),
        contact: contact.trim(),
        visitorType: visitorType || "GUEST",
        visitDate: visitDateTime,
        vehicleNo: vehicleNo?.trim() || null,
        communityId: user.communityId,
        userId: user.id, // Match backend expectation
      };


      await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/visitor-creation`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setName("");
      setContact("");
      setVisitorType("GUEST");
      setVehicleNo("");
      addToast(
        "success",
        "Success",
        "Pre-authorization submitted successfully!"
      );
      load();
    } catch (error) {
      console.error("Error creating visitor:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("User data:", user);
      console.error("Token:", token ? "present" : "missing");

      const errorMessage =
        error.response?.data?.error ||
        "Error creating visitor. Please try again.";
      addToast("error", "Creation Failed", errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  // Show loading/error state if user is not available
  if (!user || !token) {
    return (
      <div className="modern-content">
        <div className="section-header">
          <div className="section-left">
            <div className="section-icon">
              <FiUsers />
            </div>
            <h3 style={{ margin: 0 }}>Visitor & Access Management</h3>
          </div>
        </div>
        <div className="modern-card">
          <div className="empty">
            <p>Please log in to access visitor management.</p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    );
  }

  if (!user.communityId || !user.id) {
    return (
      <div className="modern-content">
        <div className="section-header">
          <div className="section-left">
            <div className="section-icon">
              <FiUsers />
            </div>
            <h3 style={{ margin: 0 }}>Visitor & Access Management</h3>
          </div>
        </div>
        <div className="modern-card">
          <div className="empty">
            <p>User profile incomplete. Please contact administrator.</p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    );
  }

  return (
    <div className="modern-content">
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon">
            <FiUsers />
          </div>
          <h3 style={{ margin: 0 }}>Visitor & Access Management</h3>
        </div>
      </div>

      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "minmax(320px, 420px) 1fr" }}
      >
        {/* Pre-authorization form */}
        <div className="modern-card" style={{ display: "grid", gap: 12 }}>
          <div className="card-header">
            <h3>
              <FiUserPlus style={{ verticalAlign: "-2px", marginRight: 8 }} />{" "}
              Pre-Authorize Guest
            </h3>
          </div>

          <form className="stack" onSubmit={preAuthorize}>
            <label className="label">Visitor Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
            />

            <label className="label">Email/Contact</label>
            <div className="row" style={{ gap: 8 }}>
              <div
                className="input"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <FiMail />
                <input
                  className="input"
                  style={{ border: "none", boxShadow: "none", padding: 0 }}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="visitor@example.com or +91-9876543210"
                  type="text"
                />
              </div>
            </div>

            <label className="label">Visitor Type</label>
            <select
              className="input"
              value={visitorType}
              onChange={(e) => setVisitorType(e.target.value)}
            >
              <option value="GUEST">Guest</option>
              <option value="DELIVERY">Delivery</option>
              <option value="CAB_AUTO">Cab/Auto</option>
            </select>

            <label className="label">Expected Date & Time</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="date"
                className="input"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <input
                type="time"
                className="input"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </div>

            <label className="label">Vehicle (optional)</label>
            <div className="row" style={{ gap: 8 }}>
              <div
                className="input"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <FiTruck />
                <input
                  className="input"
                  style={{ border: "none", boxShadow: "none", padding: 0 }}
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="KA01 AB 1234"
                />
              </div>
            </div>

            <button className="btn primary" type="submit" disabled={submitting}>
              <FiCheckCircle /> {submitting ? "Submitting..." : "Submit"}
            </button>
            {msg && (
              <div className="auth-error" style={{ marginTop: 6 }}>
                {msg}
              </div>
            )}
          </form>
        </div>

        {/* My upcoming visitors */}
        <div className="modern-card">
          <div className="card-header">
            <h3>
              <FiCalendar style={{ verticalAlign: "-2px", marginRight: 8 }} />{" "}
              Upcoming / Recent
            </h3>
          </div>

          {/* Date range filter */}
          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label" style={{ fontSize: "12px" }}>
                From
              </label>
              <input
                type="date"
                className="input"
                style={{ fontSize: "14px" }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label" style={{ fontSize: "12px" }}>
                To
              </label>
              <input
                type="date"
                className="input"
                style={{ fontSize: "14px" }}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="stack">
            {loading && <div className="empty">Loading visitors...</div>}
            {!loading && (!Array.isArray(list) || list.length === 0) && (
              <div className="empty">No visitors in range.</div>
            )}
            {!loading &&
              Array.isArray(list) &&
              list.map((v) => (
                <div key={v.id} className="list-item">
                  <div className="grow">
                    <div className="title">
                      {v.name} — <span className="sub">{v.contact}</span>
                    </div>
                    <div className="sub">
                      <FiMapPin style={{ verticalAlign: "-2px" }} />{" "}
                      {new Date(v.visitDate).toLocaleString()}
                      {v.vehicleNo ? ` • Vehicle: ${v.vehicleNo}` : ""}
                    </div>
                    <div className="sub">
                      Type:{" "}
                      {v.visitorType
                        ?.replace("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase()) || "Guest"}
                    </div>
                  </div>
                  <div className="chip">
                    <FiActivity />
                    {(() => {
                      const statusMap = {
                        pending: "Pending",
                        cancelled: "Cancelled",
                        checked_in: "Checked In",
                        checked_out: "Checked Out",
                      };
                      return statusMap[v.status] || v.status;
                    })()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
