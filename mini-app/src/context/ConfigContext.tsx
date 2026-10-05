import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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

interface ConfigGroup {
  coinflip: CoinFlipConfig;
  spin: SpinConfig;
  withdraw: WithdrawConfig;
  ads: AdConfig;
  tasks: TaskConfig;
  bot: BotConfig;
}

interface ConfigContextType extends ConfigState {
  config: ConfigGroup;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

function asObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const defaultConfig: ConfigState = {
  coinflip: { winReward: 0.05, lossReward: 0, dailyLimit: 20 },
  spin: { dailyLimit: 10, segments: [] },
  withdraw: { minAmount: 100, maxAmount: 10000, requiredReferrals: 5, cooldownHours: 24, methods: [] },
  ads: { enabled: true, monetagEnabled: true, gigapubEnabled: true, adsgramEnabled: true, adsgramBlockId: '', monetagZoneId: '', gigapubScripts: [], rewardPerAd: 0.05, dailyAdLimit: 10, enforceWatchSeconds: true, watchSeconds: 10 },
  tasks: { channelJoinReward: 1, youtubeSubReward: 2, facebookFollowReward: 1, dailyLoginReward: 0.5, channelUsername: '', youtubeChannelUrl: '', facebookPageUrl: '' },
  bot: { botUsername: '', adminIds: [], adminEmails: [], withdrawGroupId: '', maintenanceMode: false, referralBonus: 1 },
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
        coinflip: asObject(configMap.get('coinflip_config'), prev.coinflip),
        spin: asObject(configMap.get('spin_config'), prev.spin),
        withdraw: asObject(configMap.get('withdraw_config'), prev.withdraw),
        ads: asObject(configMap.get('ad_config'), prev.ads),
        tasks: asObject(configMap.get('task_config'), prev.tasks),
        bot: asObject(configMap.get('bot_config'), prev.bot),
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
    <ConfigContext.Provider value={{
      ...config,
      config: {
        coinflip: config.coinflip,
        spin: config.spin,
        withdraw: config.withdraw,
        ads: config.ads,
        tasks: config.tasks,
        bot: config.bot,
      },
      refreshConfig,
    }}>
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