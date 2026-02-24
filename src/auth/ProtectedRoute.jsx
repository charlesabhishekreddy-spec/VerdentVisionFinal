import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import AuthLoader from "./AuthLoader";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, restoring } = useAuth();

  if (restoring) return <AuthLoader />;

  return isAuthenticated ? children : <Navigate to="/login" />;
}