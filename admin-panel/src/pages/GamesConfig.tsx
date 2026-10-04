import { useState, useEffect } from 'react';
import { Save, RotateCcw, Coin, Gamepad2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency, cn } from '../../shared/utils/cn';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!);

interface CoinFlipConfig {
  winReward: number;
  lossReward: number;
  dailyLimit: number;
}

interface SpinConfig {
  segments: Array<{ reward: number; probability: number; label: string; color: string }>;
  dailyLimit: number;
}

export function GamesConfig() {
  const [coinflip, setCoinflip] = useState<CoinFlipConfig>({ winReward: 0.05, lossReward: 0, dailyLimit: 20 });
  const [spin, setSpin] = useState<SpinConfig>({ 
    dailyLimit: 10, 
    segments: [
      { reward: 0.10, probability: 10, label: '৳0.10', color: '#22c55e' },
      { reward: 0.05, probability: 20, label: '৳0.05', color: '#3b82f6' },
      { reward: 0.02, probability: 30, label: '৳0.02', color: '#f59e0b' },
      { reward: 0, probability: 40, label: 'Try Again', color: '#6b7280' },
    ]
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
        .in('key', ['coinflip_config', 'spin_config']);
      if (error) throw error;

      const configMap = new Map(data?.map(d => [d.key, d.value]) || []);
      
      if (configMap.has('coinflip_config')) {
        setCoinflip(JSON.parse(configMap.get('coinflip_config')!));
      }
      if (configMap.has('spin_config')) {
        setSpin(JSON.parse(configMap.get('spin_config')!));
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
      const updates = [
        { key: 'coinflip_config', value: JSON.stringify(coinflip) },
        { key: 'spin_config', value: JSON.stringify(spin) },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_config')
          .upsert({ ...update, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const addSpinSegment = () => {
    setSpin(prev => ({
      ...prev,
      segments: [...prev.segments, { reward: 0, probability: 0, label: '', color: '#6b7280' }]
    }));
  };

  const removeSpinSegment = (index: number) => {
    setSpin(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  const totalProbability = spin.segments.reduce((sum, s) => sum + s.probability, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Games Configuration</h1>
        <p className="text-dark-400">Configure game rewards, limits, and probabilities</p>
      </header>

      {message && (
        <div className={cn('p-4 rounded-lg mb-6', message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500')}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CoinFlip Config */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Coin className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold">CoinFlip Configuration</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Win Reward</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={coinflip.winReward}
                  onChange={e => setCoinflip(prev => ({ ...prev, winReward: parseFloat(e.target.value) || 0 }))}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Loss Reward</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={coinflip.lossReward}
                  onChange={e => setCoinflip(prev => ({ ...prev, lossReward: parseFloat(e.target.value) || 0 }))}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Daily Play Limit</label>
              <input
                type="number"
                min="1"
                max="100"
                value={coinflip.dailyLimit}
                onChange={e => setCoinflip(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 1 }))}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Spin Wheel Config */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold">Spin Wheel Configuration</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Daily Spin Limit</label>
              <input
                type="number"
                min="1"
                max="50"
                value={spin.dailyLimit}
                onChange={e => setSpin(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 1 }))}
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium">Wheel Segments (Total Probability: {spin.segments.reduce((s, seg) => s + seg.probability, 0)}%)</label>
                <button onClick={addSpinSegment} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4" /> Add Segment
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {spin.segments.map((segment, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-dark-800/50 rounded-lg">
                    <div className="col-span-3">
                      <label className="block text-xs text-dark-500 mb-1">Reward</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-400">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={segment.reward}
                          onChange={e => {
                            const newSegments = [...spin.segments];
                            newSegments[index] = { ...segment, reward: parseFloat(e.target.value) || 0 };
                            setSpin({ ...spin, segments: newSegments });
                          }}
                          className="input pl-8"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-dark-500 mb-1">Probability %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={segment.probability}
                        onChange={e => {
                          const newSegments = [...spin.segments];
                          newSegments[index] = { ...segment, probability: parseInt(e.target.value) || 0 };
                          setSpin({ ...spin, segments: newSegments });
                        }}
                        className="input"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-dark-500 mb-1">Label</label>
                      <input
                        type="text"
                        value={segment.label}
                        onChange={e => {
                          const newSegments = [...spin.segments];
                          newSegments[index] = { ...segment, label: e.target.value };
                          setSpin({ ...spin, segments: newSegments });
                        }}
                        className="input"
                        placeholder="e.g., ৳0.10"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-dark-500 mb-1">Color</label>
                      <input
                        type="color"
                        value={segment.color}
                        onChange={e => {
                          const newSegments = [...spin.segments];
                          newSegments[index] = { ...segment, color: e.target.value };
                          setSpin({ ...spin, segments: newSegments });
                        }}
                        className="w-full h-10 rounded-lg cursor-pointer border border-dark-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-dark-500 mb-1">Action</label>
                      <button onClick={() => removeSpinSegment(index)} className="btn-danger w-full text-sm">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalProbability !== 100 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-1" /> Total probability is {totalProbability}%. Should equal 100%.
                </div>
              )}
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