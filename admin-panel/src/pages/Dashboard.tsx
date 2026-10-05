import { useEffect, useState } from 'react';
import { Users, CreditCard, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Minus, Gamepad2, Signal } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency, formatNumber, cn } from '../utils/cn';
import { StatCard } from '../components/StatCard';
import type { StatCardProps } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { RecentActivity } from '../components/RecentActivity';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface Stats {
  totalUsers: number;
  totalBalance: number;
  pendingWithdrawals: number;
  todayRevenue: number;
  usersChange: number;
  balanceChange: number;
  withdrawalsChange: number;
  revenueChange: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBalance: 0,
    pendingWithdrawals: 0,
    todayRevenue: 0,
    usersChange: 0,
    balanceChange: 0,
    withdrawalsChange: 0,
    revenueChange: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { count: totalUsers },
        { data: balanceData },
        { count: pendingWithdrawals },
        { data: todayAds },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', false),
        supabase.from('users').select('balance').eq('is_banned', false),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('ads_log').select('reward').gte('created_at', today),
      ]);

      const totalBalance = balanceData?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
      const todayRevenue = todayAds?.reduce((sum, a) => sum + (a.reward || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalBalance,
        pendingWithdrawals: pendingWithdrawals || 0,
        todayRevenue,
        usersChange: 12,
        balanceChange: 8.5,
        withdrawalsChange: -5,
        revenueChange: 15.2,
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCardProps[] = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      change: stats.usersChange,
      trend: 'up',
      color: 'primary',
    },
    {
      label: 'Total Balance',
      value: stats.totalBalance,
      icon: CreditCard,
      formatter: formatCurrency,
      change: stats.balanceChange,
      trend: 'up',
      color: 'success',
    },
    {
      label: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      icon: CreditCard,
      change: stats.withdrawalsChange,
      trend: stats.withdrawalsChange >= 0 ? 'up' : 'down',
      color: 'warning',
    },
    {
      label: 'Today\'s Revenue',
      value: stats.todayRevenue,
      icon: TrendingUp,
      formatter: formatCurrency,
      change: stats.revenueChange,
      trend: 'up',
      color: 'primary',
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-dark-400">Overview of your RushOnCash platform</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Users Growth" type="users" />
        <ChartCard title="Revenue Overview" type="revenue" />
        <ChartCard title="Game Activity" type="games" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <div className="card">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/users" className="card-hover text-center p-4">
              <Users className="w-8 h-8 mx-auto text-primary-500 mb-2" />
              <p className="font-medium">Manage Users</p>
            </a>
            <a href="/withdrawals" className="card-hover text-center p-4">
              <CreditCard className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
              <p className="font-medium">Review Withdrawals</p>
            </a>
            <a href="/games" className="card-hover text-center p-4">
              <Gamepad2 className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <p className="font-medium">Configure Games</p>
            </a>
            <a href="/ads" className="card-hover text-center p-4">
              <Signal className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="font-medium">Ad Settings</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}