import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Edit, Trash2, Ban, Shield, Mail, Phone, Calendar, MoreHorizontal, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency, formatNumber, cn } from '../utils/cn';
import { StatCard } from '../components/StatCard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  balance: number;
  total_earned: number;
  referral_count: number;
  daily_ads_watched: number;
  coinflip_played: number;
  spin_played: number;
  is_banned: boolean;
  is_bot_verified: boolean;
  created_at: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'banned' | 'verified' | 'unverified'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [page, search, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_banned', filter === 'banned' ? true : false)
        .order('created_at', { ascending: false })
        .range((page - 1) * 25, page * 25 - 1);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,username.ilike.%${search}%,telegram_id.ilike.%${search}%`);
      }

      if (filter === 'verified') query = query.eq('is_bot_verified', true);
      if (filter === 'unverified') query = query.eq('is_bot_verified', false);

      const { data, count, error } = await query;
      if (error) throw error;

      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / 25));
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceEdit = async (user: User) => {
    setSelectedUser(user);
    setEditingBalance(user.balance.toString());
    setShowModal(true);
  };

  const saveBalance = async () => {
    if (!selectedUser) return;
    const newBalance = parseFloat(editingBalance);
    if (isNaN(newBalance)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id);
      if (error) throw error;
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Balance update error:', err);
    }
  };

  const toggleBan = async (user: User) => {
    try {
      await supabase
        .from('users')
        .update({ is_banned: !user.is_banned })
        .eq('id', user.id);
      fetchUsers();
    } catch (err) {
      console.error('Ban toggle error:', err);
    }
  };

  const toggleVerified = async (user: User) => {
    try {
      await supabase
        .from('users')
        .update({ is_bot_verified: !user.is_bot_verified })
        .eq('id', user.id);
      fetchUsers();
    } catch (err) {
      console.error('Verified toggle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-dark-400">Manage platform users</p>
        </div>
      </header>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, username, ID..."
              className="input pl-10"
            />
          </div>
          <select value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1); }} className="input w-48">
            <option value="all">All Users</option>
            <option value="banned">Banned</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Balance</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Referrals</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Games</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-dark-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.first_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.first_name} {user.last_name || ''}</p>
                          <p className="text-xs text-dark-500 truncate">@{user.username || 'N/A'} • ID: {user.telegram_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(user.balance)}</td>
                    <td className="py-3 px-4 text-center text-dark-400">{user.referral_count}</td>
                    <td className="py-3 px-4 text-center text-dark-400">
                      {(user.coinflip_played || 0) + (user.spin_played || 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn('badge text-xs', user.is_banned ? 'badge-danger' : 'badge-success')}>
                          {user.is_banned ? 'Banned' : 'Active'}
                        </span>
                        <span className={cn('badge text-xs', user.is_bot_verified ? 'badge-success' : 'badge-warning')}>
                          {user.is_bot_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleBalanceEdit(user)} className="btn-ghost p-2" title="Edit Balance">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleBan(user)} className={cn('btn-ghost p-2', user.is_banned ? 'text-green-500' : 'text-red-500')} title={user.is_banned ? 'Unban' : 'Ban'}>
                          <Ban className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleVerified(user)} className={cn('btn-ghost p-2', user.is_bot_verified ? 'text-green-500' : 'text-yellow-500')} title={user.is_bot_verified ? 'Unverify' : 'Verify'}>
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12 text-dark-400">No users found</div>
          )}

          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-dark-400">Page {page} of {totalPages || 1}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3">Next</button>
            </div>
          </div>
        </>
      )}

      {/* Edit Balance Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold mb-4">Edit Balance for {selectedUser.first_name}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Balance</label>
              <input
                type="number"
                step="0.01"
                value={editingBalance}
                onChange={e => setEditingBalance(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveBalance} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}