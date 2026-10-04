import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTelegram } from './TelegramContext';
import type { User } from '@shared/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateBalance: (amount: number) => void;
  isBotVerified: boolean;
  setBotVerified: (verified: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: tgUser } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBotVerified, setBotVerified] = useState(false);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const fetchUser = async () => {
    if (!tgUser) return;
    
    try {
      setLoading(true);
      setError(null);

      const telegramId = tgUser.id.toString();
      
      let { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingUser) {
        const referralCode = generateReferralCode();
        const startParam = new URLSearchParams(window.location.search).get('startapp') || 
                          new URLSearchParams(window.location.search).get('start');
        
        let referredBy: string | null = null;
        if (startParam) {
          if (startParam.startsWith('ref_')) {
            referredBy = startParam.replace('ref_', '');
          } else if (/^\d+$/.test(startParam)) {
            referredBy = startParam;
          }
        }

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramId,
            username: tgUser.username,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            photo_url: tgUser.photo_url,
            balance: 0,
            total_earned: 0,
            referral_code: referralCode,
            referred_by: referredBy,
            referral_count: 0,
            daily_ads_watched: 0,
            daily_ads_limit: 10,
            last_ad_date: new Date().toISOString().split('T')[0],
            coinflip_played: 0,
            coinflip_won: 0,
            spin_played: 0,
            spin_won: 0,
            is_banned: false,
            is_bot_verified: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        existingUser = newUser;

        if (referredBy && referredBy !== telegramId) {
          await supabase
            .from('referrals')
            .insert({ referrer_id: referredBy, referred_id: existingUser.id });
        }
      }

      setUser(existingUser);
      setBotVerified(existingUser.is_bot_verified);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUser(data);
      setBotVerified(data.is_bot_verified);
    }
  };

  const updateBalance = (amount: number) => {
    setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
  };

  useEffect(() => {
    fetchUser();
  }, [tgUser?.id]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      refreshUser,
      updateBalance,
      isBotVerified,
      setBotVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}