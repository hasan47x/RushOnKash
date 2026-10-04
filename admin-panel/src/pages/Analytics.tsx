import { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, Users, CreditCard, Gamepad2, RotateCcw, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency, formatNumber, cn } from '../../shared/utils/cn';
import { ChartCard } from '../components/ChartCard';
import { StatCard } from '../components/StatCard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    totalRevenue: 0,
    adRevenue: 0,
    gameRevenue: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    avgSessionTime: 0,
  });
  const [charts, setCharts] = useState({
    usersOverTime: [] as Array<{ date: string; count: number }>,
    revenueOverTime: [] as Array<{ date: string; amount: number }>,
    gamesOverTime: [] as Array<{ date: string; coinflip: number; spin: number }>,
    topReferrers: [] as Array<{ user: any; count: number }>,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const from = dateRange.from?.toISOString().split('T')[0];
      const to = dateRange.to?.toISOString().split('T')[0];

      const [
        { count: totalUsers },
        { count: newUsers },
        { data: balanceData },
        { data: adsData },
        { data: gamesData },
        { count: totalWithdrawals },
        { count: pendingWithdrawals },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', false),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', dateRange.from?.toISOString() || '')
          .lte('created_at', dateRange.to?.toISOString() || ''),
        supabase.from('users').select('balance, total_earned').eq('is_banned', false),
        supabase.from('ads_log').select('reward, created_at').gte('created_at', dateRange.from?.toISOString() || '').lte('created_at', dateRange.to?.toISOString() || ''),
        supabase.from('games_log').select('game_type, created_at').gte('created_at', dateRange.from?.toISOString() || '').lte('created_at', dateRange.to?.toISOString() || ''),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const totalBalance = balanceData?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
      const totalEarned = balanceData?.reduce((sum, u) => sum + (u.total_earned || 0), 0) || 0;
      const adRevenue = adsData?.reduce((sum, a) => sum + (a.reward || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        totalRevenue: totalEarned,
        adRevenue,
        gameRevenue: totalEarned - adRevenue,
        totalWithdrawals: totalWithdrawals || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        avgSessionTime: 0,
      });

      // Generate mock time series data for charts
      const days = 30;
      const usersOverTime = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10,
      }));

      const revenueOverTime = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.random() * 1000 + 100,
      }));

      const gamesOverTime = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        coinflip: Math.floor(Math.random() * 100) + 20,
        spin: Math.floor(Math.random() * 80) + 10,
      }));

      const topReferrers = [];

      setCharts({ usersOverTime, revenueOverTime, gamesOverTime, topReferrers });
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const data = [
      ['Metric', 'Value'],
      ['Total Users', stats.totalUsers],
      ['New Users (Period)', stats.newUsers],
      ['Total Revenue', stats.totalRevenue],
      ['Ad Revenue', stats.adRevenue],
      ['Game Revenue', stats.gameRevenue],
      ['Total Withdrawals', stats.totalWithdrawals],
      ['Pending Withdrawals', stats.pendingWithdrawals],
    ].map(r => r.join(',')).join('\n');
    
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, change: 12, trend: 'up' as const, color: 'primary' as const },
    { label: 'Total Revenue', value: stats.totalRevenue, icon: CreditCard, formatter: formatCurrency, change: 8.5, trend: 'up' as const, color: 'success' as const },
    { label: 'Ad Revenue', value: stats.adRevenue, icon: TrendingUp, formatter: formatCurrency, change: 15.2, trend: 'up' as const, color: 'primary' as const },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: Clock, change: -5, trend: 'down' as const, color: 'warning' as const },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-dark-400">Platform performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Users Growth" type="users" />
        <ChartCard title="Revenue Overview" type="revenue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Game Activity" type="games" />
        <div className="card">
          <h3 className="font-semibold mb-4">Key Metrics Summary</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-dark-400">Ad Revenue Share</p>
                <p className="font-bold text-2xl text-blue-500">
                  {stats.totalRevenue > 0 ? ((stats.adRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-dark-400">Game Revenue Share</p>
                <p className="font-bold text-2xl text-purple-500">
                  {stats.totalRevenue > 0 ? ((stats.gameRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-dark-400">Avg Revenue per User</p>
                <p className="font-bold text-2xl text-green-500">
                  {stats.totalUsers > 0 ? (stats.totalRevenue / stats.totalUsers).toFixed(2) : 0}
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-dark-400">Withdrawal Rate</p>
                <p className="font-bold text-2xl text-yellow-500">
                  {stats.totalUsers > 0 ? ((stats.pendingWithdrawals / stats.totalUsers) * 100).toFixed(2) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Period: {dateRange.from?.toLocaleDateString()} - {dateRange.to?.toLocaleDateString()}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-400">Total Users</p>
            <p className="font-bold text-2xl">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-400">New Users (Period)</p>
            <p className="font-bold text-2xl text-green-500">+{stats.newUsers}</p>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-400">Total Revenue</p>
            <p className="font-bold text-2xl gradient-text">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}