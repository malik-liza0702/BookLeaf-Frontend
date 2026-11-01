import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { isApiError, setUnauthenticatedHandler } from '@/api/client';
import type { Role, User } from '@/api/types';
import { useToast } from '@/components/toast/useToast';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';
import { tokenStorage } from './tokenStorage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStorage.get() ? 'loading' : 'anonymous',
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    // Drop every cached query so the next user never sees the previous one's data.
    queryClient.clear();
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string, role: Role) => {
      const { token, user: loggedIn } = await authApi.login({ email, password });
      // Don't keep a session for an account that doesn't match the chosen role.
      if (loggedIn.role !== role) {
        throw new Error(`This account can't sign in as ${role === 'admin' ? 'an admin' : 'an author'}.`);
      }
      tokenStorage.set(token);
      queryClient.clear();
      setUser(loggedIn);
      setStatus('authenticated');
      return loggedIn;
    },
    [queryClient],
  );

  // Any 401 from an authenticated request (expired/invalid JWT) logs out.
  // Route guards then redirect to /login. A ref avoids toasting more than once
  // when several polling queries fail with 401 at the same moment.
  const expiredNotified = useRef(false);
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      if (!tokenStorage.get()) return;
      logout();
      if (!expiredNotified.current) {
        expiredNotified.current = true;
        toast.error('Your session has expired. Please sign in again.');
      }
    });
    return () => setUnauthenticatedHandler(null);
  }, [logout, toast]);

  // On first load with a stored token, confirm it is still valid.
  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // 401 is handled by the global handler; anything else (backend down)
        // also leaves us signed out so the login page can show the problem.
        if (!isApiError(error) || error.status !== 401) tokenStorage.clear();
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') expiredNotified.current = false;
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
