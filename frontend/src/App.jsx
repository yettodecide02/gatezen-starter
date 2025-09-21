import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiDollarSign,
  FiTool,
  FiCalendar,
  FiUsers,
  FiFileText,
  FiUser,
  FiShield,
  FiLogOut,
  FiHelpCircle,
  FiBell,
  FiSettings,
} from "react-icons/fi";

import ProtectedRoute from "./ProtectedRoute";
import { clearUser, isAdmin } from "./lib/auth";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import Bookings from "./pages/Bookings.jsx";
import Visitors from "./pages/Visitors.jsx";
import Documents from "./pages/Documents.jsx";
import Profile from "./pages/Profile.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminSignup from "./pages/admin/AdminSignup.jsx";
import Residents from "./pages/admin/Residents.jsx";
import Help from "./pages/Help.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import PendingApproval from "./pages/PendingApproval.jsx";
import supabase from "./lib/supabase.js";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Announcements from "./pages/admin/Announcements.jsx";
import Community from "./pages/admin/Community.jsx";

function Shell({ children }) {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    clearUser();
    navigate("/");
  };

  const Item = ({ to, icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </NavLink>
  );

  const showAdmin = isAdmin();

  return (
    <div className="app-shell">
      <aside
        className="sidebar-modern"
        style={{ maxHeight: "100vh", overflowY: "auto" }}
      >
        <div className="sidebar-main">
          <div className="brand-row">
            <div className="brand-mark">GZ</div>
            <div className="brand-text">
              <div className="brand-title">GateZen</div>
              <div className="brand-sub">Community Portal</div>
            </div>
          </div>
          <nav className="nav-list">
            <Item to="/dashboard" icon={<FiHome />} label="Dashboard" />
            <Item to="/payments" icon={<FiDollarSign />} label="Payments" />
            <Item to="/maintenance" icon={<FiTool />} label="Maintenance" />
            <Item to="/bookings" icon={<FiCalendar />} label="Bookings" />
            <Item to="/visitors" icon={<FiUsers />} label="Visitors" />
            <Item to="/documents" icon={<FiFileText />} label="Documents" />
            <Item to="/profile" icon={<FiUser />} label="Profile" />
            <Item to="/help" icon={<FiHelpCircle />} label="Help" />
          </nav>
          <button className="logout-btn" onClick={logout}>
            <FiLogOut /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="header-modern">
          <div className="header-title">Apartment Community App</div>
          <div className="user-chip">
            <div className="avatar">A</div>
            <div className="meta">
              <div className="name">Signed In</div>
              <div className="role">
                {showAdmin ? "Administrator" : "Resident"}
              </div>
            </div>
          </div>
        </header>
        <div className="content modern-content">{children}</div>
      </main>
    </div>
  );
}

function AdminShell({ children }) {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    clearUser();
    navigate("/");
  };

  const AdminItem = ({ to, icon, label, end = false }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </NavLink>
  );

  return (
    <div className="app-shell">
      <aside
        className="sidebar-modern"
        style={{ maxHeight: "100vh", overflowY: "auto" }}
      >
        <div className="sidebar-main">
          <div className="brand-row">
            <div className="brand-mark">GZ</div>
            <div className="brand-text">
              <div className="brand-title">GateZen</div>
              <div className="brand-sub">Admin Portal</div>
            </div>
          </div>
          <nav className="nav-list">
            <AdminItem
              to="/admin"
              icon={<FiHome />}
              label="Dashboard"
              end={true}
            />
            <AdminItem
              to="/admin/residents"
              icon={<FiUsers />}
              label="Residents"
            />
            <AdminItem
              to="/admin/announcements"
              icon={<FiBell />}
              label="Announcements"
            />
            <AdminItem
              to="/admin/maintenance"
              icon={<FiTool />}
              label="Maintenance"
            />
            <AdminItem
              to="/admin/bookings"
              icon={<FiCalendar />}
              label="Bookings"
            />
            <AdminItem
              to="/admin/payments"
              icon={<FiDollarSign />}
              label="Payments"
            />
            <AdminItem
              to="/admin/community"
              icon={<FiUsers />}
              label="Community"
            />
            <div className="nav-divider" />
          </nav>
          <button className="logout-btn" onClick={logout}>
            <FiLogOut /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="header-modern">
          <div className="header-title">Admin Dashboard</div>
          <div className="user-chip">
            <div className="avatar">A</div>
            <div className="meta">
              <div className="name">Administrator</div>
              <div className="role">Admin Portal</div>
            </div>
          </div>
        </header>
        <div className="content modern-content">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-signup" element={<AdminSignup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/pending" element={<PendingApproval />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/help"
        element={
          <Shell>
            <Help />
          </Shell>
        }
      />

      {/* Protected (any authenticated user) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Shell>
              <Payments />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Shell>
              <Maintenance />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <Shell>
              <Bookings />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/visitors"
        element={
          <ProtectedRoute>
            <Shell>
              <Visitors />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <Shell>
              <Documents />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Shell>
              <Profile />
            </Shell>
          </ProtectedRoute>
        }
      />

      {/* Admin-only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminShell>
              <AdminDashboard />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/residents"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Residents />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Announcements />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/community"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Community />
            </AdminShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
