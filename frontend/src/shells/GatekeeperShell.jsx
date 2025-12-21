import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import supabase from "../lib/supabase";
import { clearUser, getUser } from "../lib/auth";
import PageNotAvalible from "../pages/auth/PageNotAvalible";
import {
  FiHome,
  FiUser,
  FiCamera,
  FiLogOut,
  FiBox,
  FiMenu,
  FiX,
} from "react-icons/fi";

function GatekeeperShell({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    clearUser();
    navigate("/");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (user === null) return null;

  if (user.role !== "GATEKEEPER") {
    return <PageNotAvalible />;
  }

  const GateItem = ({ to, icon, label, end = false }) => (
    <NavLink
      to={to}
      end={end}
      onClick={closeSidebar}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 w-72 bg-white border-r border-gray-200 flex flex-col`}
      >
        <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
              GZ
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">GateZen</div>
              <div className="text-xs text-gray-500">Gatekeeper</div>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <FiLogOut className="text-xl" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <FiMenu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              Gatekeeper Portal
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="font-medium text-gray-900">
                Gatekeeper
              </div>
              <div className="text-sm text-gray-500">Access Control</div>
            </div>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              G
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default GatekeeperShell;
