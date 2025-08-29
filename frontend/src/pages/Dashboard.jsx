import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  FiBell, FiCalendar, FiCreditCard, FiTool, FiAlertTriangle, FiCheckCircle,
} from "react-icons/fi";
import StatCard from "../components/StatCard";
import SectionHeader from "../components/SectionHeader";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6"];

export default function Dashboard() {
  const [ann, setAnn] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [a, p, m, b] = await Promise.all([
          api("/announcements"),
          api("/payments"),
          api("/maintenance"),
          api("/bookings"),
        ]);
        if (!mounted) return;
        setAnn(a || []);
        setPayments(p || []);
        setMaintenance(m || []);
        setBookings(b || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // --- Computed metrics ---
  const totalDue = useMemo(
    () => payments.filter(p => p.status === "due").reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [payments]
  );
  const totalPaid = useMemo(
    () => payments.filter(p => p.status === "paid").reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [payments]
  );

  const maintCounts = useMemo(() => {
    const by = { submitted: 0, in_progress: 0, resolved: 0, other: 0 };
    maintenance.forEach(t => {
      const s = (t.status || "").toLowerCase();
      if (s === "submitted") by.submitted++;
      else if (s === "in_progress" || s === "in-progress") by.in_progress++;
      else if (s === "resolved" || s === "closed" || s === "done") by.resolved++;
      else by.other++;
    });
    return by;
  }, [maintenance]);

  const recentAnnouncements = useMemo(() =>
    [...ann].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4)
  , [ann]);

  // Treat bookings as events (if your booking has `date` use it; otherwise fallback to createdAt)
  const upcomingEvents = useMemo(() => {
    const normalizeDate = (x) => new Date(x.date || x.createdAt || Date.now());
    return [...bookings]
      .filter(b => ["pending", "approved"].includes((b.status || "").toLowerCase()))
      .sort((a, b) => normalizeDate(a) - normalizeDate(b))
      .slice(0, 4);
  }, [bookings]);

  // Simple notification rules
  const notifications = useMemo(() => {
    const notes = [];
    if (totalDue > 0) {
      notes.push({
        type: "warning",
        icon: <FiCreditCard />,
        title: "Payment Due",
        message: `You have ₹${totalDue} pending.`,
      });
    }
    if (maintCounts.submitted > 0) {
      notes.push({
        type: "info",
        icon: <FiTool />,
        title: "Maintenance Requests",
        message: `${maintCounts.submitted} request(s) waiting to be processed.`,
      });
    }
    if (recentAnnouncements[0]) {
      notes.push({
        type: "announcement",
        icon: <FiBell />,
        title: "New Announcement",
        message: `${recentAnnouncements[0].title}`,
      });
    }
    return notes;
  }, [totalDue, maintCounts, recentAnnouncements]);

  // Chart data
  const paymentsDonut = useMemo(() => ([
    { name: "Paid", value: totalPaid },
    { name: "Due", value: totalDue },
  ]), [totalPaid, totalDue]);

  const maintenanceBar = useMemo(() => ([
    { status: "Submitted", count: maintCounts.submitted },
    { status: "In Progress", count: maintCounts.in_progress },
    { status: "Resolved", count: maintCounts.resolved },
    { status: "Other", count: maintCounts.other },
  ]), [maintCounts]);

  return (
    <div className="dash-grid">
      {/* KPI Row */}
      <StatCard
        icon={<FiBell />}
        title="Announcements"
        value={ann.length}
        hint="New community updates"
        accent="indigo"
        loading={loading}
      />
      <StatCard
        icon={<FiCreditCard />}
        title="Payments Due"
        value={`₹ ${totalDue}`}
        hint={totalDue > 0 ? "Action needed" : "All clear"}
        accent={totalDue > 0 ? "amber" : "emerald"}
        loading={loading}
      />
      <StatCard
        icon={<FiTool />}
        title="Open Tickets"
        value={maintCounts.submitted + maintCounts.in_progress}
        hint={`${maintCounts.in_progress} in progress`}
        accent="violet"
        loading={loading}
      />
      <StatCard
        icon={<FiCalendar />}
        title="Upcoming Events"
        value={upcomingEvents.length}
        hint="Bookings & activities"
        accent="cyan"
        loading={loading}
      />

      {/* Left Column */}
      <div className="card span-2">
        <SectionHeader icon={<FiBell />} title="Community Announcements" />
        {recentAnnouncements.length === 0 && !loading && (
          <div className="empty">No announcements yet.</div>
        )}
        <ul className="list">
          {recentAnnouncements.map(a => (
            <li key={a.id} className="list-row">
              <div className="list-title">{a.title}</div>
              <div className="list-sub">{new Date(a.createdAt).toLocaleString()}</div>
              <div className="list-body">{a.body}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Column: Notifications */}
      <div className="card">
        <SectionHeader icon={<FiAlertTriangle />} title="Notifications" />
        {notifications.length === 0 && !loading && (
          <div className="empty">You’re all caught up.</div>
        )}
        <ul className="notif-list">
          {notifications.map((n, i) => (
            <li key={i} className={`notif ${n.type}`}>
              <span className="notif-icon">{n.icon}</span>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
              </div>
              {n.type !== "warning" && <FiCheckCircle className="ok" />}
            </li>
          ))}
        </ul>
      </div>

      {/* Charts */}
      <div className="card">
        <SectionHeader icon={<FiCreditCard />} title="Payments Summary" />
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Tooltip />
              <Pie
                data={paymentsDonut}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {paymentsDonut.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {paymentsDonut.map((d, i) => (
              <div className="legend-row" key={i}>
                <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
                <b>₹ {d.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader icon={<FiTool />} title="Maintenance Status" />
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={maintenanceBar} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
          <div className="legend">
            {maintenanceBar.map((d, i) => (
              <div className="legend-row" key={i}>
                <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{d.status}</span>
                <b>{d.count}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card span-2">
        <SectionHeader icon={<FiCalendar />} title="Upcoming Events" />
        {upcomingEvents.length === 0 && !loading && (
          <div className="empty">No upcoming events.</div>
        )}
        <ul className="list">
          {upcomingEvents.map(e => (
            <li key={e.id} className="list-row">
              <div className="list-title">{e.title || e.amenity || "Event/Booking"}</div>
              <div className="list-sub">
                {(e.date && new Date(e.date).toLocaleString()) ||
                 (e.createdAt && new Date(e.createdAt).toLocaleString())}
              </div>
              <div className="badge">{(e.status || "pending").replace("_", " ")}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
