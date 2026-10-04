import type { User, GameLog, Withdrawal, Task, Referral, AdLog, AppConfig } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured');
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY || '',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY || ''}`,
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  users: {
    get: (id: string) => request<User>(`users?id=eq.${id}&select=*`),
    getByTelegramId: (telegramId: string) => request<User[]>(`users?telegram_id=eq.${telegramId}&select=*`),
    create: (user: Partial<User>) => request<User>('users', { method: 'POST', body: JSON.stringify(user) }),
    update: (id: string, data: Partial<User>) => request<User>(`users?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    incrementBalance: (id: string, amount: number) => request<User>(`users?id=eq.${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ balance: amount }) 
    }),
  },
  
  games: {
    log: (log: Omit<GameLog, 'id' | 'created_at'>) => request<GameLog>('games_log', { 
      method: 'POST', 
      body: JSON.stringify(log) 
    }),
    getHistory: (userId: string, limit = 50) => request<GameLog[]>(`games_log?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`),
    getStats: (userId: string) => request<GameLog[]>(`games_log?user_id=eq.${userId}&select=game_type,result,reward`),
  },
  
  withdrawals: {
    create: (withdrawal: Omit<Withdrawal, 'id' | 'created_at' | 'status'>) => request<Withdrawal>('withdrawals', { 
      method: 'POST', 
      body: JSON.stringify({ ...withdrawal, status: 'pending' }) 
    }),
    getUserHistory: (userId: string) => request<Withdrawal[]>(`withdrawals?user_id=eq.${userId}&order=created_at.desc`),
    getPending: () => request<Withdrawal[]>(`withdrawals?status=eq.pending&order=created_at.asc`),
    updateStatus: (id: string, status: Withdrawal['status'], adminNote?: string) => request<Withdrawal>(`withdrawals?id=eq.${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ status, admin_note: adminNote, processed_at: new Date().toISOString() }) 
    }),
  },
  
  tasks: {
    getUserTasks: (userId: string) => request<Task[]>(`tasks?user_id=eq.${userId}&order=created_at.desc`),
    create: (task: Omit<Task, 'id' | 'created_at'>) => request<Task>('tasks', { method: 'POST', body: JSON.stringify(task) }),
    updateStatus: (id: string, status: Task['status']) => request<Task>(`tasks?id=eq.${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ status, claimed_at: status === 'claimed' ? new Date().toISOString() : null }) 
    }),
  },
  
  referrals: {
    create: (referral: Omit<Referral, 'id' | 'created_at' | 'bonus_paid'>) => request<Referral>('referrals', { 
      method: 'POST', 
      body: JSON.stringify({ ...referral, bonus_paid: false }) 
    }),
    getByReferred: (referredId: string) => request<Referral[]>(`referrals?referred_id=eq.${referredId}`),
    getReferrerCount: (referrerId: string) => request<Referral[]>(`referrals?referrer_id=eq.${referrerId}&bonus_paid=eq.false`),
    markBonusPaid: (id: string) => request<Referral>(`referrals?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ bonus_paid: true }) }),
  },
  
  ads: {
    log: (log: Omit<AdLog, 'id' | 'created_at'>) => request<AdLog>('ads_log', { method: 'POST', body: JSON.stringify(log) }),
    getUserAds: (userId: string, date?: string) => {
      let query = `ads_log?user_id=eq.${userId}&order=created_at.desc`;
      if (date) query += `&created_at=gte.${date}`;
      return request<AdLog[]>(query);
    },
  },
  
  config: {
    getAll: () => request<AppConfig[]>('app_config?select=*'),
    get: (key: string) => request<AppConfig[]>(`app_config?key=eq.${key}&select=*`),
    update: (key: string, value: string) => request<AppConfig>(`app_config?key=eq.${key}`, { method: 'PATCH', body: JSON.stringify({ value, updated_at: new Date().toISOString() }) }),
    upsert: (config: Omit<AppConfig, 'updated_at'>) => request<AppConfig>('app_config', { method: 'POST', body: JSON.stringify({ ...config, updated_at: new Date().toISOString() }) }),
  },
};

export const rpc = {
  claimAdReward: (userId: string, provider: string, reward: number) => 
    request<{ success: boolean; new_balance: number }>('rpc/claim_ad_reward', { method: 'POST', body: JSON.stringify({ user_id: userId, provider, reward }) }),
  
  claimGameReward: (userId: string, gameType: string, result: string, reward: number) => 
    request<{ success: boolean; new_balance: number }>('rpc/claim_game_reward', { method: 'POST', body: JSON.stringify({ user_id: userId, game_type: gameType, result, reward }) }),
  
  processWithdrawal: (userId: string, amount: number, method: string, accountNumber: string) => 
    request<{ success: boolean; withdrawal_id: string }>('rpc/process_withdrawal', { method: 'POST', body: JSON.stringify({ user_id: userId, amount, method, account_number: accountNumber }) }),
  
  claimTaskReward: (userId: string, taskType: string, reward: number) => 
    request<{ success: boolean; new_balance: number }>('rpc/claim_task_reward', { method: 'POST', body: JSON.stringify({ user_id: userId, task_type: taskType, reward }) }),
  
  claimReferralBonus: (referrerId: string, referredId: string, bonus: number) => 
    request<{ success: boolean }>('rpc/claim_referral_bonus', { method: 'POST', body: JSON.stringify({ referrer_id: referrerId, referred_id: referredId, bonus }) }),
};