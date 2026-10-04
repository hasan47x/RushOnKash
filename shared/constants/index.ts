export const GAME_TYPES = {
  COINFLIP: 'coinflip',
  SPIN: 'spin',
} as const;

export const GAME_RESULT = {
  WIN: 'win',
  LOSS: 'loss',
} as const;

export const WITHDRAW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const WITHDRAW_METHODS = {
  BKASH: 'bkash',
  NAGAD: 'nagad',
  ROCKET: 'rocket',
  BINANCE: 'binance',
} as const;

export const TASK_TYPES = {
  CHANNEL_JOIN: 'channel_join',
  YOUTUBE_SUB: 'youtube_sub',
  FACEBOOK_FOLLOW: 'facebook_follow',
  DAILY_LOGIN: 'daily_login',
} as const;

export const AD_PROVIDERS = {
  MONETAG: 'monetag',
  GIGAPUB: 'gigapub',
  ADSGRAM: 'adsgram',
} as const;

export const AD_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CLAIMED: 'claimed',
} as const;

export const DEFAULT_COINFLIP_CONFIG: CoinFlipConfig = {
  winReward: 0.05,
  lossReward: 0,
  dailyLimit: 20,
};

export const DEFAULT_SPIN_CONFIG: SpinConfig = {
  dailyLimit: 10,
  segments: [
    { reward: 0.10, probability: 10, label: '৳0.10', color: '#22c55e' },
    { reward: 0.05, probability: 20, label: '৳0.05', color: '#3b82f6' },
    { reward: 0.02, probability: 30, label: '৳0.02', color: '#f59e0b' },
    { reward: 0, probability: 40, label: 'Try Again', color: '#6b7280' },
  ],
};

export const DEFAULT_WITHDRAW_CONFIG: WithdrawConfig = {
  minAmount: 100,
  maxAmount: 10000,
  requiredReferrals: 5,
  cooldownHours: 24,
  methods: [
    { name: 'bkash', minAmount: 100, enabled: true },
    { name: 'nagad', minAmount: 100, enabled: true },
    { name: 'rocket', minAmount: 100, enabled: true },
    { name: 'binance', minAmount: 5, enabled: true },
  ],
};

export const DEFAULT_AD_CONFIG: AdConfig = {
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
};

export const DEFAULT_TASK_CONFIG: TaskConfig = {
  channelJoinReward: 1,
  youtubeSubReward: 2,
  facebookFollowReward: 1,
  dailyLoginReward: 0.5,
  channelUsername: '',
  youtubeChannelUrl: '',
  facebookPageUrl: '',
};

export const DEFAULT_BOT_CONFIG: BotConfig = {
  botUsername: '',
  adminIds: [],
  withdrawGroupId: '',
  maintenanceMode: false,
};

export const CURRENCY = 'BDT';
export const CURRENCY_SYMBOL = '৳';
export const REFERRAL_BONUS = 1;
export const REFERRAL_CODE_LENGTH = 8;

export const SPIN_SEGMENTS_COUNT = 8;
export const COINFLIP_SIDES = ['heads', 'tails'] as const;