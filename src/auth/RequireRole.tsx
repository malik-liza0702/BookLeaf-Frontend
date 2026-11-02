import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuth } from './AuthContext';
import { homePathFor } from './homePath';

export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageSpinner label="Restoring your session…" />;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}
