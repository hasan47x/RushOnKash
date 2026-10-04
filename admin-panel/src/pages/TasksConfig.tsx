import { useState, useEffect } from 'react';
import { Save, ListChecks, RotateCcw, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { cn } from '../../shared/utils/cn';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface TaskConfig {
  channelJoinReward: number;
  youtubeSubReward: number;
  facebookFollowReward: number;
  dailyLoginReward: number;
  channelUsername: string;
  youtubeChannelUrl: string;
  facebookPageUrl: string;
}

export function TasksConfig() {
  const [config, setConfig] = useState<TaskConfig>({
    channelJoinReward: 1,
    youtubeSubReward: 2,
    facebookFollowReward: 1,
    dailyLoginReward: 0.5,
    channelUsername: '',
    youtubeChannelUrl: '',
    facebookPageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .eq('key', 'task_config')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) {
        setConfig(JSON.parse(data.value));
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
        .upsert({ key: 'task_config', value: JSON.stringify(config), updated_at: new Date().toISOString() });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Task configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Tasks Configuration</h1>
        <p className="text-dark-400">Configure task rewards and social links</p>
      </header>

      {message && (
        <div className={cn('p-4 rounded-lg mb-6', message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500')}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-green-500" />
          Task Rewards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Telegram Channel Join Reward</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.channelJoinReward}
                onChange={e => setConfig(prev => ({ ...prev, channelJoinReward: parseFloat(e.target.value) || 0 }))}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">YouTube Subscribe Reward</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.youtubeSubReward}
                onChange={e => setConfig(prev => ({ ...prev, youtubeSubReward: parseFloat(e.target.value) || 0 }))}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Facebook Follow Reward</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.facebookFollowReward}
                onChange={e => setConfig(prev => ({ ...prev, facebookFollowReward: parseFloat(e.target.value) || 0 }))}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Daily Login Reward</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.dailyLoginReward}
                onChange={e => setConfig(prev => ({ ...prev, dailyLoginReward: parseFloat(e.target.value) || 0 }))}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-blue-500" />
          Social Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Telegram Channel Username</label>
            <input
              type="text"
              value={config.channelUsername}
              onChange={e => setConfig(prev => ({ ...prev, channelUsername: e.target.value }))}
              className="input"
              placeholder="@yourchannel or https://t.me/yourchannel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">YouTube Channel URL</label>
            <input
              type="url"
              value={config.youtubeChannelUrl}
              onChange={e => setConfig(prev => ({ ...prev, youtubeChannelUrl: e.target.value }))}
              className="input"
              placeholder="https://youtube.com/@yourchannel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Facebook Page URL</label>
            <input
              type="url"
              value={config.facebookPageUrl}
              onChange={e => setConfig(prev => ({ ...prev, facebookPageUrl: e.target.value }))}
              className="input"
              placeholder="https://facebook.com/yourpage"
            />
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