import { Navigate, Outlet } from 'react-router';
import { UserRole } from '@shared/enums';
import { useAuth } from '../contexts/AuthContext';

export function AdminGuard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-300">Loading session...</div>;
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
