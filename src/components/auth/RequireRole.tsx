import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';

export function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default RequireRole;
