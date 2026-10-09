import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  // Remember where they wanted to go (e.g. a shared document link) and send them back after login.
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
