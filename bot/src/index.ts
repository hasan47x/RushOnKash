import 'dotenv/config';
import http from 'node:http';
import { Telegraf, session, Scenes, Context, MemorySessionStore } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import { config, AdminState, WithdrawState } from './config';
import { logger } from './utils/logger';
import { setupCommands } from './handlers/commands';
import { setupCallbacks } from './handlers/callbacks';
import { setupMessages } from './handlers/messages';
import { adminScene, withdrawScene } from './scenes';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

let httpServer: http.Server | undefined;

export interface DbUser {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  balance: number;
  total_earned: number;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  daily_ads_watched: number;
  daily_ads_limit: number;
  last_ad_date: string | null;
  coinflip_played: number;
  coinflip_won: number;
  spin_played: number;
  spin_won: number;
  is_banned: boolean;
  is_bot_verified: boolean;
}

export interface SessionData {
  __scenes?: Scenes.WizardSessionData;
  adminState?: AdminState;
  withdrawState?: WithdrawState;
  user?: DbUser;
}

export interface BotContext extends Context {
  session: SessionData;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  user?: DbUser;
}

const bot = new Telegraf<BotContext>(config.botToken);

// 24h TTL so inactive sessions don't grow memory forever (256MB hosts)
bot.use(session({ store: new MemorySessionStore<SessionData>(24 * 60 * 60 * 1000) }));

bot.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (error) {
    logger.error('Middleware error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow request', { duration, updateType: ctx.updateType });
    }
  }
});

async function attachUser(ctx: BotContext, next: () => Promise<void>) {
  if (ctx.from) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', ctx.from.id.toString())
      .maybeSingle();

    if (user) {
      ctx.user = user;
      if (ctx.session) {
        ctx.session.user = user;
      }
    }
  }
  await next();
}

bot.use(attachUser);

const stage = new Scenes.Stage<BotContext, Scenes.WizardSessionData>([adminScene, withdrawScene]);
bot.use(stage.middleware());

setupCommands(bot);
setupCallbacks(bot);
setupMessages(bot);

bot.catch((err, ctx) => {
  logger.error('Bot error', {
    error: err instanceof Error ? err.message : String(err),
    updateType: ctx.updateType,
    userId: ctx.from?.id,
  });
});

async function loadAppConfig(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'bot_config')
      .maybeSingle();
    if (error || !data?.value) {
      logger.warn('app_config bot_config not loaded', { error: error?.message });
      return;
    }
    const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    if (!v || typeof v !== 'object') return;
    if (typeof v.botUsername === 'string' && v.botUsername) config.botUsername = v.botUsername;
    if (Array.isArray(v.adminIds)) {
      config.adminIds = Array.from(new Set([...config.adminIds, ...v.adminIds.map(String)]));
    }
    if (typeof v.withdrawGroupId === 'string') config.withdrawGroupId = v.withdrawGroupId;
    if (typeof v.maintenanceMode === 'boolean') config.maintenanceMode = v.maintenanceMode;
    if (typeof v.referralBonus === 'number') config.referralBonus = v.referralBonus;
    logger.info('Loaded bot_config from app_config');
  } catch (error) {
    logger.warn('Failed to load app_config', { error: error instanceof Error ? error.message : String(error) });
  }
}

async function main(): Promise<void> {
  await loadAppConfig();

  const me = await bot.telegram.getMe();
  config.botUsername = me.username;

  const webhookPath = '/telegram/webhook';
  const webhookHandler = config.webhookUrl
    ? bot.webhookCallback(webhookPath, { secretToken: config.webhookSecret })
    : null;

  const server = http.createServer((req, res) => {
    const url = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && (url === '/health' || url === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      return;
    }

    if (webhookHandler && req.method === 'POST' && url === webhookPath) {
      webhookHandler(req, res).catch((error) => {
        logger.error('Webhook handler error', { error: error instanceof Error ? error.message : String(error) });
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  httpServer = server;
  await new Promise<void>((resolve) => server.listen(config.port, resolve));
  logger.info('HTTP server listening', { port: config.port });

  if (config.webhookUrl) {
    const webhookUrl = config.webhookUrl.replace(/\/$/, '') + webhookPath;
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.webhookSecret,
      allowed_updates: ['message', 'callback_query', 'inline_query', 'chosen_inline_result'],
    });
    logger.info('Webhook set', { url: webhookUrl });
  } else {
    logger.info('Bot starting in polling mode');
    void bot.launch().catch((error) => {
      logger.error('Polling failed', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    });
  }
}

main().catch((error) => {
  logger.error('Fatal error', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

process.once('SIGINT', () => {
  bot.stop('SIGINT');
  httpServer?.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  httpServer?.close();
});

export { bot };
