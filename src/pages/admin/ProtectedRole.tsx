import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }: { children: ReactNode; role: string }) => {
    const token = localStorage.getItem("adminToken");
    const userRole = localStorage.getItem("adminRole");
  
    if (!token) return <Navigate to="/admin/login" replace />;
    if (role && userRole !== role) return <Navigate to="/" replace />;
  
    return <>{children}</>;
  };
  