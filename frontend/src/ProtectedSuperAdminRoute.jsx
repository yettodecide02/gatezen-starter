import { Navigate } from "react-router-dom";
import { isSAAuthed } from "./lib/superAdminAuth";

export default function ProtectedSuperAdminRoute({ children }) {
  if (!isSAAuthed()) {
    return <Navigate to="/superadmin/login" replace />;
  }
  return children;
}
