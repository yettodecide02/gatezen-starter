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
import Toast from "../components/Toast";

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
    try {
      return (
        JSON.parse(localStorage.getItem("user")) || {
          id: "u1",
          role: "resident",
        }
      );
    } catch {
      return { id: "u1", role: "resident" };
    }
  }, []);

  const [list, setList] = useState([]);
  const [from, setFrom] = useState(isoNowLocalDate());
  const [to, setTo] = useState(isoNowLocalDate());

  // pre-auth form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("GUEST"); // Added visitor type field
  const [expectedDate, setExpectedDate] = useState(isoNowLocalDate());
  const [expectedTime, setExpectedTime] = useState(isoNowLocalTime());
  const [purpose, setPurpose] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  // Toast utility functions
  const showToast = (text) => {
    setToastText(text);
    setToastVisible(true);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  async function load() {
    if (!user.communityId || !user.id) {
      showToast("User information missing. Please log in again.");
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const visitors = Array.isArray(res.data) ? res.data : [];
      setList(visitors);
    } catch (error) {
      console.error("Error loading visitors:", error);
      showToast("Error loading visitors. Please try again.");
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
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function preAuthorize(e) {
    e.preventDefault();
    setMsg("");
    if (!name || !purpose) {
      showToast("Please fill name and purpose.");
      return;
    }
    if (type === "GUEST" && !email) {
      showToast("Email is required for GUEST visitor type.");
      return;
    }
    if (!user.communityId) {
      showToast("User community information missing. Please log in again.");
      return;
    }
    if (!user.id) {
      showToast("User ID missing. Please log in again.");
      return;
    }
    try {
      setSubmitting(true);
      // Create date in local timezone first, then convert to ISO
      const localDateTime = `${expectedDate}T${expectedTime}:00`;
      const expectedAt = new Date(localDateTime).toISOString();

      console.log("Date components:", {
        expectedDate,
        expectedTime,
        localDateTime,
        expectedAt,
      });

      const requestData = {
        name: name.trim(),
        email: email.trim(),
        type: type || "GUEST",
        expectedAt,
        purpose: purpose.trim(),
        vehicle: vehicle?.trim() || null,
        notes: notes?.trim() || null,
        communityId: user.communityId,
        residentId: user.id, // Explicitly include residentId
      };

      console.log("Creating visitor with data:", requestData);

      await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/visitor-creation`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setName("");
      setEmail("");
      setType("GUEST");
      setPurpose("");
      setVehicle("");
      setNotes("");
      showToast("Pre-authorization submitted successfully!");
      load();
    } catch (error) {
      console.error("Error creating visitor:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("User data:", user);
      console.error(
        "Token:",
        localStorage.getItem("token") ? "present" : "missing"
      );

      const errorMessage =
        error.response?.data?.error ||
        "Error creating visitor. Please try again.";
      showToast(errorMessage);
    } finally {
      setSubmitting(false);
    }
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

            <label className="label">Email</label>
            <div className="row" style={{ gap: 8 }}>
              <div
                className="input"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <FiMail />
                <input
                  className="input"
                  style={{ border: "none", boxShadow: "none", padding: 0 }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="visitor@example.com"
                  type="email"
                />
              </div>
            </div>

            <label className="label">Visitor Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
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
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
              <input
                type="time"
                className="input"
                value={expectedTime}
                onChange={(e) => setExpectedTime(e.target.value)}
              />
            </div>

            <label className="label">Purpose</label>
            <div className="row" style={{ gap: 8 }}>
              <div
                className="input"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <FiClipboard />
                <input
                  className="input"
                  style={{ border: "none", boxShadow: "none", padding: 0 }}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Delivery / Guest / Maintenance"
                />
              </div>
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
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="KA01 AB 1234"
                />
              </div>
            </div>

            <label className="label">Notes (optional)</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra instructions for security"
            />

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
                      {v.name} — <span className="sub">{v.email}</span>
                    </div>
                    <div className="sub">
                      <FiMapPin style={{ verticalAlign: "-2px" }} />{" "}
                      {new Date(v.expectedAt).toLocaleString()} • {v.purpose}
                      {v.vehicle ? ` • ${v.vehicle}` : ""}
                    </div>
                    <div className="sub">
                      Type:{" "}
                      {v.type
                        ?.replace("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase()) || "Guest"}
                    </div>
                    {v.notes && <div className="sub">{v.notes}</div>}
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

      {toastVisible && <Toast text={toastText} />}
    </div>
  );
}
