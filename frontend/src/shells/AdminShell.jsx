import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import supabase from "../lib/supabase";
import { clearUser, getUser } from "../lib/auth";
import PageNotAvalible from "../pages/auth/PageNotAvalible";
import { FiHome, FiUser, FiLogOut, FiUsers, FiSettings, FiShield, FiDollarSign, FiCalendar, FiTool, FiBell } from "react-icons/fi";


function AdminShell({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    clearUser();
    navigate("/");
  };

  if (user === null) return null;

  if (user.role !== "ADMIN") {
    return <PageNotAvalible />;
  }

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
              <div className="brand-sub">Gatekeeper</div>
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
              to="/admin/visitors-log"
              icon={<FiUser />}
              label="Visitors Log"
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
              to="/admin/blocks"
              icon={<FiHome />}
              label="Blocks & Units"
            />
            <AdminItem
              to="/admin/create-staff"
              icon={<FiShield />}
              label="Staff Management"
            />
            <AdminItem
              to="/admin/community"
              icon={<FiSettings />}
              label="Community"
            />
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

export default AdminShell;
