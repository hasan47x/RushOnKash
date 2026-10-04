import 'dotenv/config';
import { Telegraf, Markup, session, Scenes } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { config } from './config';
import { logger } from './utils/logger';
import { setupCommands } from './handlers/commands';
import { setupCallbacks } from './handlers/callbacks';
import { setupMessages } from './handlers/messages';
import { adminScene } from './scenes/admin';
import { withdrawScene } from './scenes/withdraw';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

export interface BotContext extends Telegraf.Context {
  session: {
    adminState?: Record<string, unknown>;
    withdrawState?: Record<string, unknown>;
    user?: {
      id: string;
      telegramId: string;
      balance: number;
      referralCode: string;
    };
  };
  user?: {
    id: string;
    telegramId: string;
    balance: number;
    referralCode: string;
  };
}

const bot = new Telegraf<BotContext>(config.botToken);

bot.use(session());

const stage = new Scenes.Stage<BotContext>([adminScene, withdrawScene]);
bot.use(stage.middleware());

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
      .select('id, telegram_id, balance, referral_code')
      .eq('telegram_id', ctx.from.id.toString())
      .single();
    
    if (user) {
      ctx.user = user;
      ctx.session.user = user;
    }
  }
  await next();
}

bot.use(attachUser);

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

if (config.webhookUrl) {
  await bot.telegram.setWebhook(config.webhookUrl, {
    secret_token: config.webhookSecret,
    allowed_updates: ['message', 'callback_query', 'inline_query', 'chosen_inline_result'],
  });
  logger.info('Webhook set', { url: config.webhookUrl });
} else {
  bot.launch().then(() => logger.info('Bot started in polling mode'));
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };