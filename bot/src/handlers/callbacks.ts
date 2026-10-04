import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { config } from '../config';
import { logger } from '../utils/logger';
import { supabase } from '../index';

export function setupCallbacks(bot: Telegraf<BotContext>) {
  bot.action('open_mini_app', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Opening Mini App...', Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Open RushOnCash', config.miniAppUrl!)],
    ]));
  });

  bot.action('check_balance', async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.user) return ctx.reply('Please /start first');
    
    await ctx.editMessageText(
      `💰 <b>Your Balance</b>\n\n` +
      `Available: <b>${ctx.user.balance.toFixed(2)}</b> ${config.currencySymbol || '৳'}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'check_balance')],
        [Markup.button.callback('💸 Withdraw', 'withdraw_menu')],
      ])}
    );
  });

  bot.action('withdraw_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.user) return ctx.reply('Please /start first');
    await ctx.scene.enter('withdraw');
  });

  bot.action('referral_info', async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.user) return ctx.reply('Please /start first');
    
    const botUsername = config.botUsername || 'yourbot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${ctx.user.referral_code}`;
    
    await ctx.editMessageText(
      `🔗 <b>Referral Program</b>\n\n` +
      `Your code: <code>${ctx.user.referral_code}</code>\n` +
      `Referrals: ${ctx.user.referral_count}\n` +
      `Earn: ${config.referralBonus || 1} ${config.currencySymbol || '৳'} per referral\n\n` +
      `Link: ${referralLink}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.url('📤 Share', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`)],
        [Markup.button.callback('🔙 Back', 'main_menu')],
      ])}
    );
  });

  bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.user) return ctx.reply('Please /start first');
    
    await ctx.editMessageText(
      `🏠 <b>Main Menu</b>\n\n` +
      `💰 Balance: ${ctx.user.balance.toFixed(2)} ${config.currencySymbol || '৳'}\n` +
      `👥 Referrals: ${ctx.user.referral_count}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('💰 Balance', 'check_balance')],
        [Markup.button.callback('🎮 Games', 'games_menu')],
        [Markup.button.callback('🔗 Referral', 'referral_info')],
        [Markup.button.callback('💸 Withdraw', 'withdraw_menu')],
        [Markup.button.webApp('🌐 Open Mini App', config.miniAppUrl!)],
      ])}
    );
  });

  bot.action('games_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `🎮 <b>Games</b>\n\n` +
      `🎲 <b>CoinFlip</b> - 50/50 chance\n` +
      `🎡 <b>Spin Wheel</b> - Multiple rewards\n\n` +
      `Play in Mini App:`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Play CoinFlip', `${config.miniAppUrl}?game=coinflip`)],
        [Markup.button.webApp('🎮 Play Spin', `${config.miniAppUrl}?game=spin`)],
        [Markup.button.callback('🔙 Back', 'main_menu')],
      ])}
    );
  });

  bot.action(/^admin_/, async (ctx) => {
    if (!config.adminIds.includes(ctx.from!.id.toString())) {
      return ctx.answerCbQuery('❌ Admin only', { show_alert: true });
    }
    await ctx.answerCbQuery();
  });
}