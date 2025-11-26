import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Protects admin routes by checking if user is authenticated and has admin role
 * Redirects to home page if not admin
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <div className="mt-4 text-gray-700 font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // User is authenticated and is admin, render the children
  return <>{children}</>;
};

export default AdminRoute;

