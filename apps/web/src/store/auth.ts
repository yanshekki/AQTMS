// ── Auth Store (Jotai) ──

import { atom } from 'jotai';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  walletAddress: string | null;
  role: string;
  permissions: string[];
}

const DEFAULT_AUTH: AuthState = {
  isAuthenticated: false,
  token: null,
  userId: null,
  walletAddress: null,
  role: 'VIEWER',
  permissions: [],
};

// Load persisted state from localStorage
function loadPersistedAuth(): AuthState {
  try {
    // Check for structured auth state first
    const raw = localStorage.getItem('aqtms_auth');
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        return parsed;
      }
    }
    // Fallback: parse raw JWT token
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const base64 = token.split('.')[1];
        const decoded = JSON.parse(atob(base64));
        if (decoded.sub) {
          const state: AuthState = {
            isAuthenticated: true,
            token,
            userId: decoded.sub || '',
            walletAddress: decoded.walletAddress || '',
            role: decoded.role || 'VIEWER',
            permissions: decoded.permissions || [],
          };
          persistAuth(state);
          return state;
        }
      } catch { /* ignore corrupt token */ }
    }
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULT_AUTH };
}

// Persist to localStorage on every write
function persistAuth(state: AuthState) {
  try {
    localStorage.setItem('aqtms_auth', JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

// Atom with localStorage persistence
const baseAtom = atom<AuthState>(loadPersistedAuth());

export const authAtom = atom(
  (get) => get(baseAtom),
  (_get, set, newValue: AuthState) => {
    set(baseAtom, newValue);
    persistAuth(newValue);
  },
);

export const tokenAtom = atom((get) => get(authAtom).token);
export const isAuthenticatedAtom = atom((get) => get(authAtom).isAuthenticated);
