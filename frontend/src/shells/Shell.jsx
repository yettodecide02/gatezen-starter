import {
  FiHome,
  FiUser,
  FiLogOut,
  FiDollarSign,
  FiTool,
  FiCalendar,
  FiUsers,
  FiFileText,
  FiHelpCircle,
  FiBox,
} from "react-icons/fi";

import { useNavigate, NavLink } from "react-router-dom";
import supabase from "../lib/supabase";
import { clearUser, getUser } from "../lib/auth";
import { useEffect, useState } from "react";
import PageNotAvalible from "../pages/auth/PageNotAvalible";

function Shell({ children }) {
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

  if (user.role !== "RESIDENT") {
    return <PageNotAvalible />;
  }


  const Item = ({ to, icon, label }) => (
    <NavLink
      to={to}
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
              <div className="brand-sub">Community Portal</div>
            </div>
          </div>
          <nav className="nav-list">
            <Item to="/dashboard" icon={<FiHome />} label="Dashboard" />
            <Item to="/payments" icon={<FiDollarSign />} label="Payments" />
            <Item to="/maintenance" icon={<FiTool />} label="Maintenance" />
            <Item to="/bookings" icon={<FiCalendar />} label="Bookings" />
            <Item to="/visitors" icon={<FiUsers />} label="Visitors" />
            <Item to="/packages" icon={<FiBox />} label="My Packages" />
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
              <div className="role">Resident</div>
            </div>
          </div>
        </header>
        <div className="content modern-content">{children}</div>
      </main>
    </div>
  );
}

export default Shell;
