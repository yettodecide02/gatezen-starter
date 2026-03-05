import { NavLink, useNavigate } from "react-router-dom";
import { clearSA, getSAUser } from "../lib/superAdminAuth";
import { FiLogOut, FiLayers, FiGlobe, FiShield } from "react-icons/fi";

export default function SuperAdminShell({ children }) {
  const navigate = useNavigate();
  const user = getSAUser();

  const logout = () => {
    clearSA();
    navigate("/superadmin/login");
  };

  const Item = ({ to, icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
          isActive
            ? "bg-violet-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
            <FiShield className="text-white text-lg" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">GateZen</div>
            <div className="text-xs text-violet-600 font-semibold">
              Super Admin
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <Item to="/superadmin/plans" icon={<FiLayers />} label="Plans" />
          <Item
            to="/superadmin/communities"
            icon={<FiGlobe />}
            label="Communities"
          />
        </nav>

        {/* Profile + Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {user?.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiLogOut />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
