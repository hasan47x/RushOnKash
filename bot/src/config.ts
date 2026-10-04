import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_TOKEN: z.string().min(1),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  MINI_APP_URL: z.string().url().optional(),
  ADMIN_PANEL_URL: z.string().url().optional(),
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
} as const;

export type Config = typeof config;