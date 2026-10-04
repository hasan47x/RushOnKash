import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, User, Star, TrendingUp, Medal, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../context/TelegramContext';
import { createClient } from '@supabase/supabase-js';
import { cn, formatCurrency, formatNumber, getInitials } from '../utils/cn';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LeaderboardEntry {
  id: string;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  balance: number;
  referral_count: number;
  coinflip_won: number;
  spin_won: number;
  total_earned: number;
}

export function Leaderboard() {
  const { user } = useAuth();
  const { webApp } = useTelegram();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earnings' | 'wins' | 'referrals'>('earnings');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let orderColumn = 'total_earned';
      if (activeTab === 'wins') orderColumn = 'coinflip_won';
      if (activeTab === 'referrals') orderColumn = 'referral_count';

      const { data, error } = await supabase
        .from('users')
        .select('id, telegram_id, first_name, last_name, username, photo_url, balance, referral_count, coinflip_won, spin_won, total_earned')
        .eq('is_banned', false)
        .order(orderColumn, { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setLeaderboard(data || []);
      
      if (user) {
        const rank = data?.findIndex(u => u.id === user.id);
        setCurrentUserRank(rank !== -1 ? rank + 1 : null);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTabValue = (entry: LeaderboardEntry) => {
    if (activeTab === 'earnings') return entry.total_earned;
    if (activeTab === 'wins') return entry.coinflip_won + entry.spin_won;
    return entry.referral_count;
  };

  const formatTabValue = (value: number) => {
    if (activeTab === 'earnings') return formatCurrency(value);
    return formatNumber(value);
  };

  const tabs = [
    { id: 'earnings', label: 'Top Earners', icon: Trophy },
    { id: 'wins', label: 'Most Wins', icon: Star },
    { id: 'referrals', label: 'Top Referrers', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <Link to="/" className="w-10" />
      </header>

      {currentUserRank && (
        <div className="card bg-primary-500/10 border-primary-500/30">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary-500" />
            <div>
              <p className="font-semibold">Your Rank</p>
              <p className="text-sm text-dark-400">#{currentUserRank} in {activeTab === 'earnings' ? 'Earnings' : activeTab === 'wins' ? 'Wins' : 'Referrals'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-500'
                : 'bg-dark-800/50 text-dark-400 hover:bg-dark-800'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card text-center py-8">
          <Trophy className="w-12 h-12 mx-auto text-dark-500 mb-4" />
          <p className="text-dark-400">No players yet. Be the first!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Player</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">
                    {activeTab === 'earnings' ? 'Earnings' : activeTab === 'wins' ? 'Wins' : 'Referrals'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {leaderboard.slice(0, 50).map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = user?.id === entry.id;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                  
                  return (
                    <tr key={entry.id} className={cn(
                      'hover:bg-dark-800/50 transition-colors',
                      isCurrentUser && 'bg-primary-500/10'
                    )}>
                      <td className="py-3 px-4">
                        <span className={cn('font-bold', rank <= 3 && 'text-yellow-500')}>
                          {medal} {rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold', 
                            entry.photo_url ? '' : 'bg-gradient-to-br from-primary-500 to-emerald-500'
                          )}>
                            {entry.photo_url ? (
                              <img src={entry.photo_url} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <span className="text-white">{getInitials(entry.first_name)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('font-medium truncate', isCurrentUser && 'text-primary-500')}>
                              {entry.first_name} {entry.last_name || ''}
                            </p>
                            <p className="text-xs text-dark-500 truncate">@{entry.username || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatTabValue(getTabValue(entry))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {leaderboard.length > 50 && (
            <div className="pt-4 text-center text-sm text-dark-500">
              Showing top 50 of {leaderboard.length} players
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { formatCurrency, formatNumber } from '../utils/cn';