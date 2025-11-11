
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed, getUser } from "./lib/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!isAuthed()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  const user = getUser();

  if (
    (user && user.status === "PENDING") ||
    (user && user.status === "REJECTED")
  ) {
    return <Navigate to="/pending" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
