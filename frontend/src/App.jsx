// frontend/src/App.jsx
import React from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  FiHome, FiDollarSign, FiTool, FiCalendar, FiUsers,
  FiFileText, FiUser, FiShield, FiLogOut, FiHelpCircle
} from "react-icons/fi";

import ProtectedRoute from "./ProtectedRoute";
import { clearUser, isAdmin } from "./lib/auth";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Payments from "./pages/Payments.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import Bookings from "./pages/Bookings.jsx";
import Visitors from "./pages/Visitors.jsx";
import Documents from "./pages/Documents.jsx";
import Profile from "./pages/Profile.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import Users from "./pages/admin/Users.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import Help from "./pages/Help.jsx"; // if you created the Help screen earlier

function Shell({ children }) {
  const navigate = useNavigate();
  const logout = () => {
    clearUser();
    navigate("/", { replace: true });
  };

  const Item = ({ to, icon, label }) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </NavLink>
  );

  const showAdmin = isAdmin();

  return (
    <div className="app-shell">
      <aside className="sidebar-modern" style={{ maxHeight: "100vh", overflowY: "auto" }}>
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
          {showAdmin && (
            <>
              <div className="nav-divider" />
              <Item to="/admin" icon={<FiShield />} label="Admin" />
              <Item to="/admin/users" icon={<FiUsers />} label="Users" />
            </>
          )}
        </nav>
        <button className="logout-btn" onClick={logout}>
          <FiLogOut /> <span>Logout</span>
        </button>
      </aside>

      <main className="main-area">
        <header className="header-modern">
          <div className="header-title">Apartment Community App</div>
          <div className="user-chip">
            <div className="avatar">A</div>
            <div className="meta">
              <div className="name">Signed In</div>
              <div className="role">{showAdmin ? "Administrator" : "Resident"}</div>
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
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/help" element={<Shell><Help /></Shell>} />

      {/* Protected (any authenticated user) */}
      <Route path="/dashboard" element={<ProtectedRoute><Shell><Dashboard/></Shell></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Shell><Payments/></Shell></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><Shell><Maintenance/></Shell></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><Shell><Bookings/></Shell></ProtectedRoute>} />
      <Route path="/visitors" element={<ProtectedRoute><Shell><Visitors/></Shell></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Shell><Documents/></Shell></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Shell><Profile/></Shell></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><Shell><Users/></Shell></ProtectedRoute>} />


      {/* Admin-only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Shell><AdminDashboard/></Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Shell><Users/></Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
