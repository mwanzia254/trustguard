import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'contributor';
}

export const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  // Wait for session restore before making any redirect decision
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
