import { FiHome, FiUser, FiCamera, FiLogOut, FiBox } from "react-icons/fi";

import { useNavigate, NavLink } from "react-router-dom";
import supabase from "../lib/supabase";
import { clearUser, getUser } from "../lib/auth";
import { useEffect, useState } from "react";
import PageNotAvalible from "../pages/auth/PageNotAvalible";

function GatekeeperShell({ children }) {
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

  if (user.role !== "GATEKEEPER") {
    return <PageNotAvalible />;
  }


  const GateItem = ({ to, icon, label, end = false }) => (
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
            <GateItem
              to="/gatekeeper"
              icon={<FiHome />}
              label="Dashboard"
              end={true}
            />
            <GateItem
              to="/gatekeeper/qrscanner"
              icon={<FiCamera />}
              label="QR Scanner"
            />
            <GateItem
              to="/gatekeeper/packages"
              icon={<FiBox />}
              label="Packages"
            />
            <GateItem
              to="/gatekeeper/profile"
              icon={<FiUser />}
              label="Profile"
            />
          </nav>
          <button className="logout-btn" onClick={logout}>
            <FiLogOut /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="header-modern">
          <div className="header-title">Gatekeeper Portal</div>
          <div className="user-chip">
            <div className="avatar">G</div>
            <div className="meta">
              <div className="name">Gatekeeper</div>
              <div className="role">Access Control</div>
            </div>
          </div>
        </header>
        <div className="content modern-content">{children}</div>
      </main>
    </div>
  );
}

export default GatekeeperShell;
