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
  FiXCircle,
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

  const [tab, setTab] = useState("resident");
  const [list, setList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState(isoNowLocalDate());
  const [to, setTo] = useState(isoNowLocalDate());

  // pre-auth form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expectedDate, setExpectedDate] = useState(isoNowLocalDate());
  const [expectedTime, setExpectedTime] = useState(isoNowLocalTime());
  const [purpose, setPurpose] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [toastText, setToastText] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  // Toast utility functions
  const showToast = (text) => {
    setToastText(text);
    setToastVisible(true);

    // Clear existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Auto-hide after 3 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  async function load() {
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      // Add communityId to the query
      qs.set("communityId", user.communityId);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/resident/visitors?${qs.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Ensure the response is an array
      const visitors = Array.isArray(res.data) ? res.data : [];
      setList(visitors);
    } catch (error) {
      console.error("Error loading visitors:", error);
      setList([]); // Set empty array on error
    }
  }
  useEffect(() => {
    load();
  }, [statusFilter, from, to]);

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
      // Cleanup toast timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function preAuthorize(e) {
    e.preventDefault();
    setMsg("");
    if (!name || !email || !purpose) {
      showToast("Please fill name, email and purpose.");
      return;
    }
    try {
      const expectedAt = new Date(
        `${expectedDate}T${expectedTime}:00`
      ).toISOString();
      await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/visitor-creation`,
        {
          name,
          email,
          expectedAt,
          purpose,
          vehicle,
          notes,
          communityId: user.communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setName("");
      setEmail("");
      setPurpose("");
      setVehicle("");
      setNotes("");
      showToast("Pre-authorization submitted successfully!");
      load(); // Refresh the list
    } catch (error) {
      console.error("Error creating visitor:", error);
      showToast("Error creating visitor. Please try again.");
    }
  }

  async function setStatus(id, status, note = "") {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/resident/visitors/${id}/status`,
        {
          status,
          note,
          communityId: user.communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      await load();
    } catch (error) {
      console.error("Error updating visitor status:", error);
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
        <div className="row" style={{ gap: 8 }}>
          <button
            className={`pill ${tab === "resident" ? "active" : ""}`}
            onClick={() => setTab("resident")}
          >
            Resident
          </button>
          <button
            className={`pill ${tab === "staff" ? "active" : ""}`}
            onClick={() => setTab("staff")}
          >
            Gate Staff
          </button>
        </div>
      </div>

      {tab === "resident" ? (
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
                  {/* purely decorative */}
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

              <button className="btn primary" type="submit">
                <FiCheckCircle /> Submit
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
            <div className="stack">
              {(!Array.isArray(list) || list.length === 0) && (
                <div className="empty">No visitors in range.</div>
              )}
              {Array.isArray(list) &&
                list
                  .filter((v) => v.residentId === user.id)
                  .map((v) => (
                    <div key={v.id} className="list-item">
                      <div className="grow">
                        <div className="title">
                          {v.name} — <span className="sub">{v.email}</span>
                        </div>
                        <div className="sub">
                          <FiMapPin style={{ verticalAlign: "-2px" }} />{" "}
                          {new Date(v.expectedAt).toLocaleString()} •{" "}
                          {v.purpose}
                          {v.vehicle ? ` • ${v.vehicle}` : ""}
                        </div>
                        {v.notes && <div className="sub">{v.notes}</div>}
                      </div>
                      <div className="chip">
                        <FiActivity />
                        {v.status.replace("_", " ")}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      ) : (
        // Gate Staff view
        <div className="modern-card" style={{ display: "grid", gap: 12 }}>
          <div className="section-head">
            <h2
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FiActivity /> Gate Console
            </h2>
            <div className="row" style={{ gap: 8 }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pre-authorized">Pre-authorized</option>
                <option value="arrived">Arrived</option>
                <option value="checked_in">Checked-in</option>
                <option value="checked_out">Checked-out</option>
                <option value="denied">Denied</option>
              </select>
              <input
                type="date"
                className="input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="list"></div>
        </div>
      )}

      {/* Toast Notification */}
      {toastVisible && <Toast text={toastText} />}
    </div>
  );
}
