import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { CoinFlipConfig, SpinConfig, WithdrawConfig, AdConfig, TaskConfig, BotConfig, AppConfig } from '@shared/types';

interface ConfigState {
  coinflip: CoinFlipConfig;
  spin: SpinConfig;
  withdraw: WithdrawConfig;
  ads: AdConfig;
  tasks: TaskConfig;
  bot: BotConfig;
  loading: boolean;
}

interface ConfigContextType extends ConfigState {
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const defaultConfig: ConfigState = {
  coinflip: { winReward: 0.05, lossReward: 0, dailyLimit: 20 },
  spin: { dailyLimit: 10, segments: [] },
  withdraw: { minAmount: 100, maxAmount: 10000, requiredReferrals: 5, cooldownHours: 24, methods: [] },
  ads: { enabled: true, monetagEnabled: true, gigapubEnabled: true, adsgramEnabled: true, adsgramBlockId: '', monetagZoneId: '', gigapubScripts: [], rewardPerAd: 0.05, dailyAdLimit: 10, enforceWatchSeconds: true, watchSeconds: 10 },
  tasks: { channelJoinReward: 1, youtubeSubReward: 2, facebookFollowReward: 1, dailyLoginReward: 0.5, channelUsername: '', youtubeChannelUrl: '', facebookPageUrl: '' },
  bot: { botUsername: '', adminIds: [], withdrawGroupId: '', maintenanceMode: false },
  loading: true,
};

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(defaultConfig);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');

      if (error) throw error;

      const configMap = new Map(data?.map(d => [d.key, d.value]) || []);

      setConfig(prev => ({
        ...prev,
        coinflip: configMap.has('coinflip_config') ? JSON.parse(configMap.get('coinflip_config')!) : prev.coinflip,
        spin: configMap.has('spin_config') ? JSON.parse(configMap.get('spin_config')!) : prev.spin,
        withdraw: configMap.has('withdraw_config') ? JSON.parse(configMap.get('withdraw_config')!) : prev.withdraw,
        ads: configMap.has('ad_config') ? JSON.parse(configMap.get('ad_config')!) : prev.ads,
        tasks: configMap.has('task_config') ? JSON.parse(configMap.get('task_config')!) : prev.tasks,
        bot: configMap.has('bot_config') ? JSON.parse(configMap.get('bot_config')!) : prev.bot,
        loading: false,
      }));
    } catch (err) {
      console.error('Config fetch error:', err);
      setConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshConfig = async () => {
    await fetchConfig();
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ ...config, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}