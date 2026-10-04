import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { config } from '../config';
import { logger } from '../utils/logger';

export function setupMessages(bot: Telegraf<BotContext>) {
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text.startsWith('/')) return;

    if (ctx.session.withdrawState?.step === 'amount') {
      return handleWithdrawAmount(ctx, text);
    }
    
    if (ctx.session.withdrawState?.step === 'account') {
      return handleWithdrawAccount(ctx, text);
    }

    if (ctx.session.adminState?.action === 'broadcast') {
      return handleBroadcastMessage(ctx, text);
    }
  });

  async function handleWithdrawAmount(ctx: BotContext, text: string) {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please enter a valid number.');
    }
    
    if (!ctx.user) return ctx.reply('Please /start first');
    if (amount > ctx.user.balance) {
      return ctx.reply(`❌ Insufficient balance. You have ${ctx.user.balance.toFixed(2)} ${config.currencySymbol}`);
    }

    const minAmount = 100; // from config
    if (amount < minAmount) {
      return ctx.reply(`❌ Minimum withdrawal is ${minAmount} ${config.currencySymbol}`);
    }

    ctx.session.withdrawState = { ...ctx.session.withdrawState, amount, step: 'account' };
    await ctx.reply(`💳 Enter your account number (${ctx.session.withdrawState.method}):`);
  }

  async function handleWithdrawAccount(ctx: BotContext, text: string) {
    const accountNumber = text.trim();
    if (!accountNumber) return ctx.reply('❌ Please enter a valid account number.');

    const { amount, method } = ctx.session.withdrawState!;
    if (!ctx.user) return ctx.reply('Please /start first');

    const { data: withdrawal, error } = await ctx.telegram.botInfo?.supabase
      .from('withdrawals')
      .insert({
        user_id: ctx.user.id,
        amount,
        method,
        account_number: accountNumber,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('Withdrawal creation failed', { error: error.message, userId: ctx.user.id });
      return ctx.reply('❌ Failed to create withdrawal request.');
    }

    delete ctx.session.withdrawState;
    
    await ctx.reply(
      `✅ <b>Withdrawal Request Submitted</b>\n\n` +
      `💰 Amount: ${amount.toFixed(2)} ${config.currencySymbol}\n` +
      `🏦 Method: ${method.toUpperCase()}\n` +
      `📱 Account: ${accountNumber}\n` +
      `📋 Request ID: <code>${withdrawal.id.slice(0, 8)}</code>\n\n` +
      `Status: ⏳ Pending\n` +
      `You'll be notified once processed.`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Main Menu', 'main_menu')],
      ])}
    );

    if (config.withdrawGroupId) {
      await ctx.telegram.sendMessage(
        config.withdrawGroupId,
        `🚨 <b>New Withdrawal Request</b>\n\n` +
        `👤 User: ${ctx.user.first_name} (@${ctx.user.username || 'N/A'})\n` +
        `🆔 ID: <code>${ctx.user.telegram_id}</code>\n` +
        `💰 Amount: ${amount.toFixed(2)} ${config.currencySymbol}\n` +
        `🏦 Method: ${method.toUpperCase()}\n` +
        `📱 Account: <code>${accountNumber}</code>\n` +
        `📋 Request ID: <code>${withdrawal.id}</code>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }
  }

  async function handleBroadcastMessage(ctx: BotContext, text: string) {
    if (!config.adminIds.includes(ctx.from!.id.toString())) return;
    
    delete ctx.session.adminState;
    
    const { data: users } = await ctx.telegram.botInfo?.supabase
      .from('users')
      .select('telegram_id')
      .eq('is_banned', false);

    let sent = 0, failed = 0;
    for (const user of users || []) {
      try {
        await ctx.telegram.sendMessage(user.telegram_id, text, { parse_mode: 'HTML' });
        sent++;
        await new Promise(r => setTimeout(r, 50)); // Rate limit
      } catch {
        failed++;
      }
    }
    
    await ctx.reply(`📢 Broadcast complete: ${sent} sent, ${failed} failed`);
  }
}