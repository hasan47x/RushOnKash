import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useTelegram } from './TelegramContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: tgUser, initData } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBotVerified, setBotVerified] = useState(false);

  const authenticate = useCallback(async () => {
    if (!tgUser || !initData) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${supabaseUrl}/functions/v1/auth-telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      setUser(data.user);
      setBotVerified(data.user.is_bot_verified);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [tgUser?.id, initData]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setUser(data);
      setBotVerified(data.is_bot_verified);
    }
  }, []);

  const updateBalance = (amount: number) => {
    setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : prev);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // existing session: refresh profile in background, still re-auth if initData present
        refreshUser();
      }
      if (tgUser && initData) {
        await authenticate();
      } else if (!session) {
        setLoading(false);
      }
    };
    init();
  }, [tgUser?.id, initData]);

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
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
