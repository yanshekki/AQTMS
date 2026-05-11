import { useState, useEffect, useCallback, useMemo } from 'react';

interface AuthUser {
  id: string;
  userId: string;
  walletAddress: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function parseJwt(token: string): AuthUser | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = JSON.parse(atob(base64));
    return {
      id: decoded.sub || '',
      userId: decoded.sub || '',
      walletAddress: decoded.walletAddress || '',
      role: decoded.role || '',
      permissions: decoded.permissions || [],
    };
  } catch {
    return null;
  }
}

export function useAuth(): AuthState & { login: (token: string) => void; logout: () => void } {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const user = parseJwt(token);
      setState({
        user,
        token,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback((token: string) => {
    localStorage.setItem('accessToken', token);
    const user = parseJwt(token);
    setState({
      user,
      token,
      isAuthenticated: !!user,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
}
