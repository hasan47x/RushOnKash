export interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  balance: number;
  total_earned: number;
  referral_code: string;
  referred_by?: string;
  referral_count: number;
  daily_ads_watched: number;
  daily_ads_limit: number;
  last_ad_date: string;
  coinflip_played: number;
  coinflip_won: number;
  spin_played: number;
  spin_won: number;
  is_banned: boolean;
  is_bot_verified: boolean;
  telegramBonus?: number | null;
  youtubeBonus?: number | null;
  facebookBonus?: number | null;
  created_at: string;
  updated_at: string;
}

export interface GameLog {
  id: string;
  user_id: string;
  game_type: 'coinflip' | 'spin';
  bet_amount: number;
  result: 'win' | 'loss';
  reward: number;
  server_seed: string;
  client_seed: string;
  nonce: number;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: 'bkash' | 'nagad' | 'rocket' | 'binance';
  account_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  task_type: 'channel_join' | 'youtube_sub' | 'facebook_follow' | 'daily_login';
  status: 'pending' | 'completed' | 'claimed';
  reward: number;
  completed_at?: string;
  claimed_at?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_paid: boolean;
  created_at: string;
}

export interface AdLog {
  id: string;
  user_id: string;
  provider: 'monetag' | 'gigapub' | 'adsgram';
  reward: number;
  status: 'completed' | 'failed';
  created_at: string;
}

export interface AppConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CoinFlipConfig {
  winReward: number;
  lossReward: number;
  dailyLimit: number;
}

export interface SpinConfig {
  segments: SpinSegment[];
  dailyLimit: number;
}

export interface SpinSegment {
  reward: number;
  probability: number;
  label: string;
  color: string;
}

export interface WithdrawConfig {
  minAmount: number;
  maxAmount: number;
  requiredReferrals: number;
  cooldownHours: number;
  methods: WithdrawMethod[];
}

export interface WithdrawMethod {
  name: 'bkash' | 'nagad' | 'rocket' | 'binance';
  minAmount: number;
  maxAmount?: number;
  enabled: boolean;
}

export interface AdConfig {
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

export interface TaskConfig {
  channelJoinReward: number;
  youtubeSubReward: number;
  facebookFollowReward: number;
  dailyLoginReward: number;
  channelUsername: string;
  youtubeChannelUrl: string;
  facebookPageUrl: string;
}

export interface BotConfig {
  botUsername: string;
  adminIds: string[];
  adminEmails?: string[];
  withdrawGroupId?: string;
  maintenanceMode: boolean;
  referralBonus?: number;
}