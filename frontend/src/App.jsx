import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

// Resident Pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import Dashboard from "./pages/resident/Dashboard.jsx";
import Payments from "./pages/resident/Payments.jsx";
import Maintenance from "./pages/resident/Maintenance.jsx";
import Bookings from "./pages/resident/Bookings.jsx";
import Visitors from "./pages/resident/Visitors.jsx";
import Documents from "./pages/resident/Documents.jsx";
import Profile from "./pages/resident/Profile.jsx";
import Help from "./pages/resident/Help.jsx";
import AuthCallback from "./pages/auth/AuthCallback.jsx";
import PendingApproval from "./pages/auth/PendingApproval.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResidentDetailsForm from "./pages/auth/ResidentDetailsForm.jsx";
import MyPackages from "./pages/resident/MyPackages.jsx";


// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminSignup from "./pages/admin/AdminSignup.jsx";
import Residents from "./pages/admin/Residents.jsx";
import Announcements from "./pages/admin/Announcements.jsx";
import Community from "./pages/admin/Community.jsx";
import Blocks from "./pages/admin/Blocks.jsx";
import MaintenanceAdmin from "./pages/admin/Maintenance.jsx";
import BookingsAdmin from "./pages/admin/Bookings.jsx";
import PaymentsAdmin from "./pages/admin/Payments.jsx";
import CreateStaff from "./pages/admin/CreateStaff.jsx";
import VisitorsLog from "./pages/admin/VisitorsLog.jsx";

// Gatekeeper Pages
import GateDashboard from "./pages/gatekeeper/GateDashboard.jsx";
import QRScanner from "./pages/gatekeeper/QRScanner.jsx";
import GateProfile from "./pages/gatekeeper/GateProfile.jsx";
import Packages from "./pages/gatekeeper/Packages.jsx";

import PageNotAvalible from "./pages/auth/PageNotAvalible.jsx";

import Shell from "./shells/Shell.jsx";
import AdminShell from "./shells/AdminShell.jsx";
import GatekeeperShell from "./shells/GatekeeperShell.jsx";

/* ----------------------------- MAIN APP ROUTES ----------------------------- */

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/resident-from" element={<ResidentDetailsForm />} />
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
        path="/packages"
        element={
          <ProtectedRoute>
            <Shell>
              <MyPackages />
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
        path="/admin/maintenance"
        element={
          <ProtectedRoute>
            <AdminShell>
              <MaintenanceAdmin />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute>
            <AdminShell>
              <BookingsAdmin />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visitors-log"
        element={
          <ProtectedRoute>
            <AdminShell>
              <VisitorsLog />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute>
            <AdminShell>
              <PaymentsAdmin />
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
      <Route
        path="/admin/blocks"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Blocks />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/create-staff"
        element={
          <ProtectedRoute>
            <AdminShell>
              <CreateStaff />
            </AdminShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/gatekeeper"
        element={
          <ProtectedRoute>
            <GatekeeperShell>
              <GateDashboard />
            </GatekeeperShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gatekeeper/qrscanner"
        element={
          <ProtectedRoute>
            <GatekeeperShell>
              <QRScanner />
            </GatekeeperShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gatekeeper/profile"
        element={
          <ProtectedRoute>
            <GatekeeperShell>
              <GateProfile />
            </GatekeeperShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gatekeeper/packages"
        element={
          <ProtectedRoute>
            <GatekeeperShell>
              <Packages />
            </GatekeeperShell>
          </ProtectedRoute>
        }
      />

      <Route path="/*" element={<PageNotAvalible />} />
    </Routes>
  );
}
