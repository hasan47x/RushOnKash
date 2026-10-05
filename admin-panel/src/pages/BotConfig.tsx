import { useState, useEffect } from 'react';
import { Save, Bot, RotateCcw, Loader2, Users, Shield, AlertTriangle, Trash2, MailPlus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { cn } from '../utils/cn';
import { parseConfig } from '../utils/config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface BotConfig {
  botUsername: string;
  adminIds: string[];
  adminEmails: string[];
  withdrawGroupId: string;
  maintenanceMode: boolean;
}

export function BotConfig() {
  const [config, setConfig] = useState<BotConfig>({
    botUsername: '',
    adminIds: [],
    adminEmails: [],
    withdrawGroupId: '',
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .eq('key', 'bot_config')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) {
        setConfig(prev => ({ ...prev, ...parseConfig<Partial<BotConfig>>(data.value, {}) }));
      }
    } catch (err) {
      console.error('Config fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'bot_config', value: config, updated_at: new Date().toISOString() });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Bot configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = () => {
    if (newAdminId.trim() && !config.adminIds.includes(newAdminId.trim())) {
      setConfig(prev => ({ ...prev, adminIds: [...prev.adminIds, newAdminId.trim()] }));
      setNewAdminId('');
    }
  };

  const removeAdmin = (adminId: string) => {
    setConfig(prev => ({ ...prev, adminIds: prev.adminIds.filter(id => id !== adminId) }));
  };

  const addAdminEmail = () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (email && email.includes('@') && !config.adminEmails.includes(email)) {
      setConfig(prev => ({ ...prev, adminEmails: [...(prev.adminEmails ?? []), email] }));
      setNewAdminEmail('');
    }
  };

  const removeAdminEmail = (email: string) => {
    setConfig(prev => ({ ...prev, adminEmails: (prev.adminEmails ?? []).filter(e => e !== email) }));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bot Configuration</h1>
        <p className="text-dark-400">Configure bot settings and admin access</p>
      </header>

      {message && (
        <div className={cn('p-4 rounded-lg mb-6', message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500')}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          Bot Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bot Username (without @)</label>
            <input
              type="text"
              value={config.botUsername}
              onChange={e => setConfig(prev => ({ ...prev, botUsername: e.target.value }))}
              className="input"
              placeholder="yourbotname"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Withdrawal Notification Group ID</label>
            <input
              type="text"
              value={config.withdrawGroupId}
              onChange={e => setConfig(prev => ({ ...prev, withdrawGroupId: e.target.value }))}
              className="input"
              placeholder="-1001234567890"
            />
            <p className="text-xs text-dark-500 mt-1">Telegram group ID for withdrawal notifications (negative number)</p>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.maintenanceMode}
              onChange={e => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
              className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
            />
            <span className="font-medium">Maintenance Mode</span>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Admin Users
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAdminId}
              onChange={e => setNewAdminId(e.target.value)}
              placeholder="Telegram User ID"
              className="input flex-1"
            />
            <button onClick={addAdmin} disabled={!newAdminId.trim() || config.adminIds.includes(newAdminId)} className="btn-secondary">
              Add Admin
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {config.adminIds.length === 0 ? (
            <p className="text-dark-400 text-center py-4">No admins configured. Add admin user IDs above.</p>
          ) : (
            config.adminIds.map((adminId, index) => (
              <div key={adminId} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{adminId}</p>
                    <p className="text-xs text-dark-500">Admin</p>
                  </div>
                </div>
                <button onClick={() => removeAdmin(adminId)} className="text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )))}
          </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Admin Panel Access (Email)
          </h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAdminEmail()}
              placeholder="admin@example.com"
              className="input flex-1"
            />
            <button onClick={addAdminEmail} disabled={!newAdminEmail.trim() || (config.adminEmails ?? []).includes(newAdminEmail.trim().toLowerCase())} className="btn-secondary">
              <MailPlus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
        <p className="text-xs text-dark-500 mb-3">
          Emails listed here can log in to this admin panel and see all data. The email must match a Supabase Auth user
          (create it under Authentication → Users).
        </p>
        <div className="space-y-2">
          {(config.adminEmails ?? []).length === 0 ? (
            <p className="text-dark-400 text-center py-4">No admin emails configured. You will not be able to log in until you add one.</p>
          ) : (
            (config.adminEmails ?? []).map((email, index) => (
              <div key={email} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{email}</p>
                    <p className="text-xs text-dark-500">Panel admin</p>
                  </div>
                </div>
                <button onClick={() => removeAdminEmail(email)} className="text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <div>
            <p className="font-semibold text-yellow-500">Important</p>
            <p className="text-sm text-yellow-400">
              After changing bot configuration, restart the bot service on Railway for changes to take effect.
              The webhook URL should be: <code className="px-2 py-1 bg-dark-900 rounded text-xs">https://your-railway-domain/api/webhook</code>
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={fetchConfig} disabled={loading} className="btn-secondary">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button onClick={saveConfig} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Configuration
        </button>
      </div>
    </div>
  );
}
