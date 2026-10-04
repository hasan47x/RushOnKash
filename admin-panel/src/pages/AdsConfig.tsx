import { useState, useEffect } from 'react';
import { Save, Signal, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { cn } from '../../shared/utils/cn';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface AdConfig {
  enabled: boolean;
  monetagEnabled: boolean;
  gigapubEnabled: boolean;
  adsgramEnabled: boolean;
  adsgramBlockId: string;
  monetagZoneId: string;
  gigapubScripts: string[];
  rewardPerAd: number;
  dailyAdLimit: number;
  enforceWatchSeconds: boolean;
  watchSeconds: number;
}

export function AdsConfig() {
  const [config, setConfig] = useState<AdConfig>({
    enabled: true,
    monetagEnabled: true,
    gigapubEnabled: true,
    adsgramEnabled: true,
    adsgramBlockId: '',
    monetagZoneId: '',
    gigapubScripts: [],
    rewardPerAd: 0.05,
    dailyAdLimit: 10,
    enforceWatchSeconds: true,
    watchSeconds: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newScript, setNewScript] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .eq('key', 'ad_config')
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
        .upsert({ key: 'ad_config', value: JSON.stringify(config), updated_at: new Date().toISOString() });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Ad configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const addScript = () => {
    if (newScript.trim()) {
      setConfig(prev => ({
        ...prev,
        gigapubScripts: [...prev.gigapubScripts, newScript.trim()]
      }));
      setNewScript('');
    }
  };

  const removeScript = (index: number) => {
    setConfig(prev => ({
      ...prev,
      gigapubScripts: prev.gigapubScripts.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Advertisement Configuration</h1>
        <p className="text-dark-400">Configure ad networks, rewards, and limits</p>
      </header>

      {message && (
        <div className={cn('p-4 rounded-lg mb-6', message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500')}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <Signal className="w-5 h-5 text-blue-500" />
          Master Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-medium">Enable Ads</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.enforceWatchSeconds}
                onChange={e => setConfig(prev => ({ ...prev, enforceWatchSeconds: e.target.checked }))}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-medium">Enforce Watch Time</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reward per Ad</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.rewardPerAd}
                  onChange={e => setConfig(prev => ({ ...prev, rewardPerAd: parseFloat(e.target.value) || 0 }))}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Daily Ad Limit</label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.dailyAdLimit}
                onChange={e => setConfig(prev => ({ ...prev, dailyAdLimit: parseInt(e.target.value) || 1 }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Watch Time (seconds)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.watchSeconds}
                onChange={e => setConfig(prev => ({ ...prev, watchSeconds: parseInt(e.target.value) || 1 }))}
                className="input"
                disabled={!config.enforceWatchSeconds}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <Signal className="w-5 h-5 text-purple-500" />
          Ad Networks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={config.monetagEnabled}
                onChange={e => setConfig(prev => ({ ...prev, monetagEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-semibold">Monetag</span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Zone ID</label>
                <input
                  type="text"
                  value={config.monetagZoneId}
                  onChange={e => setConfig(prev => ({ ...prev, monetagZoneId: e.target.value }))}
                  className="input"
                  placeholder="9707941"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={config.gigapubEnabled}
                onChange={e => setConfig(prev => ({ ...prev, gigapubEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-semibold">GigaPub</span>
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newScript}
                  onChange={e => setNewScript(e.target.value)}
                  placeholder="https://ad.gigapub.tech/script?id=..."
                  className="input flex-1"
                />
                <button onClick={addScript} className="btn-secondary">Add</button>
              </div>
              <div className="space-y-2">
                {config.gigapubScripts.map((script, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-dark-900 rounded-lg">
                    <span className="text-xs text-dark-400 flex-1 truncate">{script}</span>
                    <button onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        gigapubScripts: prev.gigapubScripts.filter((_, i) => i !== index)
                      }));
                    }} className="text-red-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={config.adsgramEnabled}
                onChange={e => setConfig(prev => ({ ...prev, adsgramEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-semibold">Adsgram</span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Block ID</label>
                <input
                  type="text"
                  value={config.adsgramBlockId}
                  onChange={e => setConfig(prev => ({ ...prev, adsgramBlockId: e.target.value }))}
                  className="input"
                  placeholder="int-27948"
                />
              </div>
            </div>
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