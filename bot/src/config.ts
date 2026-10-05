import { z } from 'zod';

// Treat empty strings as "not provided" (dashboards often send "")
const optionalUrl = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_TOKEN: z.string().min(1),
  WEBHOOK_URL: optionalUrl,
  WEBHOOK_SECRET: z.string().optional(),
  // Panels (SillyDev/Pterodactyl) inject SERVER_PORT and it always wins
  PORT: z.preprocess(
    (v) => process.env.SERVER_PORT ?? v,
    z.coerce.number().default(3000)
  ),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  MINI_APP_URL: optionalUrl,
  ADMIN_PANEL_URL: optionalUrl,
  BOT_USERNAME: z.string().optional(),
  ADMIN_IDS: z.string().optional(),
  WITHDRAW_GROUP_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  botToken: parsed.data.BOT_TOKEN,
  webhookUrl: parsed.data.WEBHOOK_URL,
  webhookSecret: parsed.data.WEBHOOK_SECRET,
  port: parsed.data.PORT,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  supabaseServiceKey: parsed.data.SUPABASE_SERVICE_KEY,
  miniAppUrl: parsed.data.MINI_APP_URL,
  adminPanelUrl: parsed.data.ADMIN_PANEL_URL,
  isProduction: parsed.data.NODE_ENV === 'production',

  // Runtime app config — merged from app_config.bot_config at startup (see index.ts)
  currencySymbol: '৳',
  botUsername: parsed.data.BOT_USERNAME ?? '',
  adminIds: (parsed.data.ADMIN_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  withdrawGroupId: parsed.data.WITHDRAW_GROUP_ID ?? '',
  maintenanceMode: false,
  referralBonus: 1,
};

export type Config = typeof config;

export interface AdminState {
  action?: string;
}

export interface WithdrawState {
  method: string;
  step: 'amount' | 'account';
  amount?: number;
}
