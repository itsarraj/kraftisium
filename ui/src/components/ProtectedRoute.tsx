import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  /** If true, only unauthenticated users can access. Redirects to / when logged in. */
  guestOnly?: boolean;
  /** If provided, user must have one of these roles. Redirects to /unauthorized otherwise. */
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo,
  guestOnly = false,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    const loginPath = redirectTo || '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && (!user || user.role !== 'admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Guest-only: redirect authenticated users to home or recruiter dashboard
  if (guestOnly && isAuthenticated) {
    const defaultPath = user?.role === 'recruiter' || user?.role === 'admin' ? '/recruiter' : '/';
    return <Navigate to={defaultPath} replace />;
  }

  // If user is authenticated but trying to access auth pages, redirect to dashboard
  if (!requireAuth && isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    const defaultPath = user?.role === 'recruiter' || user?.role === 'admin' ? '/recruiter' : '/';
    return <Navigate to={defaultPath} replace />;
  }

  // Role check: user must have one of the allowed roles
  if (allowedRoles && allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;