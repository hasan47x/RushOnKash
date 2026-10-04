import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!admin) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}