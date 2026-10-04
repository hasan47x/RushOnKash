import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  name: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAdmin({
          id: session.user.id,
          email: session.user.email!,
          role: 'admin',
          name: session.user.user_metadata?.full_name || session.user.email!,
        });
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      setAdmin({
        id: data.user.id,
        email: data.user.email!,
        role: 'admin',
        name: data.user.user_metadata?.full_name || data.user.email!,
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
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