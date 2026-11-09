'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import type { JwtPayload } from '@/types';
import { syncUser } from '@/lib/backendApi';

interface AuthContextValue {
  user: JwtPayload | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount — read token from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ctf_token');
    if (stored) {
      try {
        const decoded = jwtDecode<JwtPayload>(stored);
        if (!isTokenExpired(decoded)) {
          setToken(stored);
          setUser(decoded);
        } else {
          localStorage.removeItem('ctf_token');
        }
      } catch {
        localStorage.removeItem('ctf_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    (newToken: string) => {
      try {
        const decoded = jwtDecode<JwtPayload>(newToken);
        localStorage.setItem('ctf_token', newToken);
        setToken(newToken);
        setUser(decoded);

        // Fire-and-forget: sync user profile to backend
        syncUser({
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          displayName: decoded.displayName,
          role: decoded.role,
        }).catch(() => {
          // Non-fatal: sync failure won't block login
        });
      } catch {
        console.error('Failed to decode JWT during login');
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('ctf_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
