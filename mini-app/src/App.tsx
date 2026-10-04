import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { CoinFlip } from './pages/games/CoinFlip';
import { SpinWheel } from './pages/games/SpinWheel';
import { Tasks } from './pages/Tasks';
import { Withdraw } from './pages/Withdraw';
import { Profile } from './pages/Profile';
import { Referral } from './pages/Referral';
import { Leaderboard } from './pages/Leaderboard';
import { Layout } from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
        <Route path="games/coinflip" element={<ProtectedRoute><CoinFlip /></ProtectedRoute>} />
        <Route path="games/spin" element={<ProtectedRoute><SpinWheel /></ProtectedRoute>} />
        <Route path="tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
        <Route path="leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}