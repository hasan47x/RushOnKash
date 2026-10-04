import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, MoreHorizontal, CreditCard, Download, Eye } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency, formatNumber, cn } from '../../shared/utils/cn';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  account_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name?: string;
    username?: string;
    telegram_id: string;
  };
}

export function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchWithdrawals();
  }, [page, search, statusFilter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          user:users!inner(first_name, last_name, username, telegram_id)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * 25, page * 25 - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`user.first_name.ilike.%${search}%,user.username.ilike.%${search}%,account_number.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setWithdrawals(data || []);
      setTotalPages(Math.ceil((count || 0) / 25));
    } catch (err) {
      console.error('Withdrawals fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (withdrawal: any, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: newStatus, processed_at: new Date().toISOString() })
        .eq('id', withdrawal.id);
      if (error) throw error;
      fetchWithdrawals();
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'User', 'Amount', 'Method', 'Account', 'Status', 'Date'];
    const rows = withdrawals.map(w => [
      w.id.slice(0, 8),
      `${w.user?.first_name} @${w.user?.username}`,
      w.amount,
      w.method,
      w.account_number,
      w.status,
      new Date(w.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals</h1>
          <p className="text-dark-400">Manage withdrawal requests</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </header>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by user, account, ID..."
              className="input pl-10"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }} className="input w-48">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Request</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">User</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Amount</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Method</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {withdrawals.map(withdrawal => (
                  <tr key={withdrawal.id} className="hover:bg-dark-800/50">
                    <td className="py-3 px-4 font-mono text-sm">{withdrawal.id.slice(0, 12)}...</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{withdrawal.user?.first_name} {withdrawal.user?.last_name || ''}</p>
                        <p className="text-xs text-dark-500">@{withdrawal.user?.username || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(withdrawal.amount)}</td>
                    <td className="py-3 px-4 text-center capitalize">{withdrawal.method}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn('badge text-xs', 
                        withdrawal.status === 'pending' && 'badge-warning',
                        withdrawal.status === 'approved' && 'badge-success',
                        withdrawal.status === 'rejected' && 'badge-danger',
                        withdrawal.status === 'cancelled' && 'badge-danger'
                      )}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark-400 text-sm">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {withdrawal.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleStatusChange(withdrawal, 'approved')} 
                            className="btn-secondary px-3 py-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button 
                            onClick={() => handleStatusChange(withdrawal, 'rejected')} 
                            className="btn-secondary px-3 py-1 text-xs"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                      {withdrawal.status !== 'pending' && (
                        <span className="text-xs text-dark-500">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withdrawals.length === 0 && (
            <div className="text-center py-12 text-dark-400">No withdrawals found</div>
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
    </div>
  );
}