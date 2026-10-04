import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Withdrawals } from './pages/Withdrawals';
import { GamesConfig } from './pages/GamesConfig';
import { AdsConfig } from './pages/AdsConfig';
import { TasksConfig } from './pages/TasksConfig';
import { BotConfig } from './pages/BotConfig';
import { Analytics } from './pages/Analytics';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './context/AuthContext';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="games" element={<GamesConfig />} />
        <Route path="ads" element={<AdsConfig />} />
        <Route path="tasks" element={<TasksConfig />} />
        <Route path="bot" element={<BotConfig />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;