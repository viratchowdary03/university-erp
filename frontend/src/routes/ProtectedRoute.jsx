import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { can } from "../config/permissions";

// <ProtectedRoute />                          -> must be signed in
// <ProtectedRoute permission={PERM.FEES} />   -> must also have that permission
export default function ProtectedRoute({ permission }) {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (permission && !can(user.role, permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
