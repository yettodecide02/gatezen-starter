// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { FiDollarSign, FiTool, FiCalendar, FiUsers, FiBell } from "react-icons/fi";

function Stat({ icon, title, value, hint, className = "" }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api("/payments").then(setPayments).catch(()=>{});
    api("/maintenance").then(setMaintenance).catch(()=>{});
    api("/bookings").then(setBookings).catch(()=>{});
    api("/users").then(setUsers).catch(()=>{});
    api("/announcements").then(setAnnouncements).catch(()=>{});
  }, []);

  const kpis = useMemo(() => {
    const totalDue = payments.filter(p => p.status === "due").reduce((a, b) => a + (b.amount || 0), 0);
    const openMaint = maintenance.filter(m => m.status !== "resolved").length;
    const pendingBookings = bookings.filter(b => b.status !== "approved").length;
    return { totalDue, openMaint, pendingBookings };
  }, [payments, maintenance, bookings]);

  return (
    <div className="modern-content">
      <h2 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <FiBell /> Admin Dashboard
      </h2>

      <div className="dash-grid" style={{ marginBottom: 16 }}>
        <Stat
          className="accent-indigo"
          icon={<FiDollarSign />}
          title="Outstanding Dues"
          value={`₹ ${kpis.totalDue}`}
          hint="Across all users"
        />
        <Stat
          className="accent-amber"
          icon={<FiTool />}
          title="Open Maintenance"
          value={kpis.openMaint}
          hint="Awaiting action"
        />
        <Stat
          className="accent-cyan"
          icon={<FiCalendar />}
          title="Pending Bookings"
          value={kpis.pendingBookings}
          hint="To review/approve"
        />
        <Stat
          className="accent-emerald"
          icon={<FiUsers />}
          title="Total Users"
          value={users.length}
          hint="Residents & Admins"
        />
      </div>

      <div className="dash-grid">
        <div className="card span-2">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiBell /></div>
              <h3>Latest Announcements</h3>
            </div>
          </div>
          <ul className="list">
            {announcements.length === 0 && <li className="empty">No announcements yet.</li>}
            {announcements.map(a => (
              <li key={a.id}>
                <div className="list-title">{a.title}</div>
                <div className="list-sub">{new Date(a.createdAt).toLocaleString()}</div>
                <div className="list-body">{a.body}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiTool /></div>
              <h3>Maintenance (Open)</h3>
            </div>
          </div>
          <ul className="list">
            {maintenance.filter(m => m.status !== "resolved").slice(0, 6).map(m => (
              <li key={m.id} className="list-row">
                <div>
                  <div className="list-title">{m.title || 'Ticket'}</div>
                  <div className="list-sub">{m.category || 'General'} • {new Date(m.createdAt).toLocaleString()}</div>
                </div>
                <div><span className="badge">{m.status}</span></div>
              </li>
            ))}
            {maintenance.filter(m => m.status !== "resolved").length === 0 && <li className="empty">All clear.</li>}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiCalendar /></div>
              <h3>Bookings (Pending)</h3>
            </div>
          </div>
          <ul className="list">
            {bookings.filter(b => b.status !== "approved").slice(0, 6).map(b => (
              <li key={b.id} className="list-row">
                <div>
                  <div className="list-title">{b.amenity || 'Amenity'}</div>
                  <div className="list-sub">{new Date(b.createdAt).toLocaleString()}</div>
                </div>
                <div><span className="badge">{b.status}</span></div>
              </li>
            ))}
            {bookings.filter(b => b.status !== "approved").length === 0 && <li className="empty">No pending requests.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
