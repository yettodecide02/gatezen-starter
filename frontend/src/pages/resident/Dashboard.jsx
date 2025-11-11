import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiBell,
  FiCalendar,
  FiCreditCard,
  FiTool,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { getToken, getUser } from "../../lib/auth";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#8b5cf6",
];

// StatCard Component
const StatCard = ({ icon, title, value, hint, accent, loading }) => {
  const accentColors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${accentColors[accent]}`}>
              {React.cloneElement(icon, { className: "w-5 h-5" })}
            </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          )}
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
      </div>
    </div>
  );
};

// SectionHeader Component
const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
      {React.cloneElement(icon, { className: "w-5 h-5" })}
    </div>
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
  </div>
);

export default function Dashboard() {
  const [ann, setAnn] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = getToken();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (
          ann.length !== 0 &&
          payments.length !== 0 &&
          maintenance.length !== 0 &&
          bookings.length !== 0
        )
          return;
        if (!token) return;
        const res = await axios.get(
          import.meta.env.VITE_API_URL + "/resident/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              userId: getUser().id,
              communityId: getUser().communityId,
            },
          }
        );
        if (!mounted) return;
        setAnn(res.data.announcements || []);
        setPayments(res.data.payments || []);
        setMaintenance(res.data.maintenance || []);
        setBookings(res.data.bookings || []);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [token]);

  const totalDue = useMemo(
    () =>
      payments
        .filter((p) => p.status === "pending")
        .reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [payments]
  );
  const totalPaid = useMemo(
    () =>
      payments
        .filter((p) => p.status === "completed")
        .reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [payments]
  );

  const maintCounts = useMemo(() => {
    const by = { submitted: 0, in_progress: 0, resolved: 0, other: 0 };
    maintenance.forEach((t) => {
      const s = (t.status || "").toUpperCase();
      if (s === "SUBMITTED" || s === "PENDING") by.submitted++;
      else if (
        s === "IN_PROGRESS" ||
        s === "IN-PROGRESS" ||
        s === "IN PROGRESS"
      )
        by.in_progress++;
      else if (
        s === "RESOLVED" ||
        s === "CLOSED" ||
        s === "DONE" ||
        s === "COMPLETED"
      )
        by.resolved++;
      else by.other++;
    });
    return by;
  }, [maintenance]);

  const recentAnnouncements = useMemo(
    () =>
      [...ann]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4),
    [ann]
  );

  const upcomingEvents = useMemo(() => {
    return [...bookings]
      .filter((b) => {
        const status = (b.status || "").toUpperCase();
        return ["PENDING", "APPROVED", "CONFIRMED"].includes(status);
      })
      .sort((a, b) => {
        const dateA = new Date(a.startsAt);
        const dateB = new Date(b.startsAt);
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [bookings]);

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

  const paymentsDonut = useMemo(
    () => [
      { name: "Paid", value: totalPaid },
      { name: "Due", value: totalDue },
    ],
    [totalPaid, totalDue]
  );

  const maintenanceBar = useMemo(
    () => [
      { status: "Submitted", count: maintCounts.submitted },
      { status: "In Progress", count: maintCounts.in_progress },
      { status: "Resolved", count: maintCounts.resolved },
    ],
    [maintCounts]
  );

  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Community Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiBell />} title="Community Announcements" />
            {recentAnnouncements.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No announcements yet.
              </div>
            )}
            <ul className="space-y-4">
              {recentAnnouncements.map((a) => (
                <li
                  key={a.id}
                  className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                >
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {a.title}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700">{a.content || a.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiAlertTriangle />} title="Notifications" />
            {notifications.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                You're all caught up.
              </div>
            )}
            <ul className="space-y-3">
              {notifications.map((n, i) => {
                const bgColors = {
                  warning: "bg-amber-50 border-amber-200",
                  info: "bg-blue-50 border-blue-200",
                  announcement: "bg-indigo-50 border-indigo-200",
                };
                const iconColors = {
                  warning: "text-amber-600",
                  info: "text-blue-600",
                  announcement: "text-indigo-600",
                };
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      bgColors[n.type]
                    }`}
                  >
                    <div className={`mt-0.5 ${iconColors[n.type]}`}>
                      {React.cloneElement(n.icon, { className: "w-5 h-5" })}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-0.5">
                        {n.title}
                      </h4>
                      <p className="text-sm text-gray-700">{n.message}</p>
                    </div>
                    {n.type !== "warning" && (
                      <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Payments Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiCreditCard />} title="Payments Summary" />
            <div className="flex flex-col items-center">
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-4 space-y-2">
                {paymentsDonut.map((d, i) => (
                  <div
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    key={i}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ₹ {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <SectionHeader icon={<FiTool />} title="Maintenance Status" />
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={maintenanceBar} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
              <div className="w-full mt-4 space-y-2">
                {maintenanceBar.map((d, i) => (
                  <div
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    key={i}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{d.status}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <SectionHeader icon={<FiCalendar />} title="Upcoming Events" />
            {upcomingEvents.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No upcoming events.
              </div>
            )}
            <ul className="space-y-4">
              {upcomingEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {e.facility?.name || "Booking"}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {new Date(e.startsAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                    {e.status || "PENDING"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
