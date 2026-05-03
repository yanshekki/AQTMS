// ── Protected Route (Enhanced: permissions + roles) ──

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/shared/lib/usePermissions';
import { type Role, type Permission } from '@/shared/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: Role[];
}

export function ProtectedRoute({ children, requiredPermissions = [], requiredRoles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, role, hasPermission } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((r) => r === role);
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasAllPerms = requiredPermissions.every((p) => hasPermission(p));
    if (!hasAllPerms) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
