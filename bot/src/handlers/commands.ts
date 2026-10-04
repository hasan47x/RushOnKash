import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../index';
import { config } from '../config';
import { logger } from '../utils/logger';
import { supabase } from '../index';

export function setupCommands(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    const payload = ctx.startPayload;
    let referrerId: string | null = null;
    
    if (payload) {
      if (payload.startsWith('ref_')) {
        referrerId = payload.replace('ref_', '');
      } else if (/^\d+$/.test(payload)) {
        referrerId = payload;
      }
    }

    const userId = ctx.from!.id.toString();
    
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (!user) {
      const referralCode = generateReferralCode();
      
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: userId,
          username: ctx.from?.username,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name,
          photo_url: ctx.from?.photo_url,
          balance: 0,
          total_earned: 0,
          referral_code: referralCode,
          referred_by: referrerId,
          referral_count: 0,
          daily_ads_watched: 0,
          daily_ads_limit: 10,
          last_ad_date: new Date().toISOString().split('T')[0],
          coinflip_played: 0,
          coinflip_won: 0,
          spin_played: 0,
          spin_won: 0,
          is_banned: false,
          is_bot_verified: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('User creation failed', { error: error.message, userId });
        return ctx.reply('❌ Failed to create account. Please try again.');
      }

      user = newUser;

      if (referrerId && referrerId !== userId) {
        await supabase
          .from('referrals')
          .insert({ referrer_id: referrerId, referred_id: user.id });
      }

      await ctx.reply(
        `🎉 Welcome to RushOnCash!\n\n` +
        `Your referral code: <code>${referralCode}</code>\n` +
        `Share it with friends and earn ${config.referralBonus || 1} ${config.currencySymbol || '৳'} per referral!`,
        { parse_mode: 'HTML', ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 Open Mini App', config.miniAppUrl!)],
        ])}
      );
    } else {
      await ctx.reply(
        `👋 Welcome back, ${user.first_name}!\n\n` +
        `💰 Balance: ${user.balance.toFixed(2)} ${config.currencySymbol || '৳'}\n` +
        `👥 Referrals: ${user.referral_count}\n` +
        `🔗 Your code: <code>${user.referral_code}</code>`,
        { parse_mode: 'HTML', ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 Open Mini App', config.miniAppUrl!)],
        ])}
      );
    }
  });

  bot.command('balance', async (ctx) => {
    if (!ctx.user) return ctx.reply('Please /start first');
    
    await ctx.reply(
      `💰 <b>Your Balance</b>\n\n` +
      `Available: <b>${ctx.user.balance.toFixed(2)}</b> ${config.currencySymbol || '৳'}\n\n` +
      `📊 <b>Stats</b>\n` +
      `• CoinFlip: ${ctx.user.coinflip_won}/${ctx.user.coinflip_played} wins\n` +
      `• Spin: ${ctx.user.spin_won}/${ctx.user.spin_played} wins\n` +
      `• Referrals: ${ctx.user.referral_count}`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('referral', async (ctx) => {
    if (!ctx.user) return ctx.reply('Please /start first');
    
    const botUsername = config.botUsername || 'yourbot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${ctx.user.referral_code}`;
    
    await ctx.reply(
      `🔗 <b>Your Referral Link</b>\n\n` +
      `<code>${referralLink}</code>\n\n` +
      `Share this link with friends.\n` +
      `You earn <b>${config.referralBonus || 1} ${config.currencySymbol || '৳'}</b> per referral!`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.url('📤 Share on Telegram', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join RushOnCash and earn money!')}`)],
      ])}
    );
  });

  bot.command('withdraw', async (ctx) => {
    if (!ctx.user) return ctx.reply('Please /start first');
    await ctx.scene.enter('withdraw');
  });

  bot.command('games', async (ctx) => {
    if (!ctx.user) return ctx.reply('Please /start first');
    await ctx.reply(
      `🎮 <b>Available Games</b>\n\n` +
      `🎲 <b>CoinFlip</b> - Flip a coin, win if you guess right!\n` +
      `🎡 <b>Spin Wheel</b> - Spin the wheel for rewards!\n\n` +
      `Open Mini App to play:`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Play Games', config.miniAppUrl!)],
      ])}
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📖 <b>Help & Commands</b>\n\n` +
      `/start - Register / Open Mini App\n` +
      `/balance - Check your balance\n` +
      `/referral - Get referral link\n` +
      `/withdraw - Withdraw funds\n` +
      `/games - View available games\n` +
      `/help - Show this help\n\n` +
      `Need support? Contact @support`,
      { parse_mode: 'HTML' }
    );
  });

  if (config.adminIds.includes(ctx.from!.id.toString())) {
    bot.command('admin', async (ctx) => {
      await ctx.scene.enter('admin');
    });

    bot.command('stats', async (ctx) => {
      const [{ count: users }, { count: withdrawals }, { data: totalBalance }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('users').select('balance'),
      ]);

      const totalBal = totalBalance?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;

      await ctx.reply(
        `📊 <b>Bot Statistics</b>\n\n` +
        `👥 Total Users: ${users || 0}\n` +
        `💰 Total Balance: ${totalBal.toFixed(2)} ${config.currencySymbol || '৳'}\n` +
        `⏳ Pending Withdrawals: ${withdrawals || 0}`,
        { parse_mode: 'HTML' }
      );
    });

    bot.command('broadcast', async (ctx) => {
      const message = ctx.message.text.replace('/broadcast', '').trim();
      if (!message) return ctx.reply('Usage: /broadcast <message>');

      const { data: users } = await supabase.from('users').select('telegram_id').eq('is_banned', false);
      let sent = 0, failed = 0;

      for (const user of users || []) {
        try {
          await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'HTML' });
          sent++;
        } catch {
          failed++;
        }
      }

      await ctx.reply(`Broadcast sent: ${sent} success, ${failed} failed`);
    });
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}