// ── usePermissions Hook ──
// Reads user permissions from auth Jotai store.

import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { authAtom } from '@/store/auth';

export function usePermissions() {
  const auth = useAtomValue(authAtom);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return auth.permissions.includes(permission);
    },
    [auth.permissions],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      return permissions.every((p) => auth.permissions.includes(p));
    },
    [auth.permissions],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      return permissions.some((p) => auth.permissions.includes(p));
    },
    [auth.permissions],
  );

  return useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      userId: auth.userId,
      walletAddress: auth.walletAddress,
      role: auth.role,
      permissions: auth.permissions,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
    }),
    [auth, hasPermission, hasAllPermissions, hasAnyPermission],
  );
}
