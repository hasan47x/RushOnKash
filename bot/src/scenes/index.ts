import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../index';
import { config } from '../config';
import { logger } from '../utils/logger';
import { supabase } from '../index';

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value && typeof value === 'object') return value as T;
  return fallback;
}

export const adminScene = new Scenes.WizardScene<BotContext>(
  'admin',
  async (ctx) => {
    if (!config.adminIds.includes(ctx.from!.id.toString())) {
      await ctx.reply('❌ Admin only');
      return ctx.scene.leave();
    }

    const [{ count: users }, { count: pendingWithdrawals }, { data: totalBalance }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('balance'),
    ]);

    const totalBal = totalBalance?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;

    await ctx.reply(
      `🛡 <b>Admin Panel</b>\n\n` +
      `👥 Users: ${users || 0}\n` +
      `💰 Total Balance: ${totalBal.toFixed(2)} ${config.currencySymbol}\n` +
      `⏳ Pending Withdrawals: ${pendingWithdrawals || 0}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('👥 Users', 'admin_users'), Markup.button.callback('💸 Withdrawals', 'admin_withdrawals')],
        [Markup.button.callback('🎮 Game Config', 'admin_games'), Markup.button.callback('📺 Ad Config', 'admin_ads')],
        [Markup.button.callback('📋 Task Config', 'admin_tasks'), Markup.button.callback('⚙️ Bot Config', 'admin_bot')],
        [Markup.button.callback('📊 Stats', 'admin_stats'), Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
        [Markup.button.callback('🚪 Exit', 'admin_exit')],
      ])}
    );
    return ctx.wizard.next();
  },
  async (ctx, next) => {
    if (!ctx.callbackQuery) {
      return next();
    }

    const action = (ctx.callbackQuery as { data?: string }).data;
    await ctx.answerCbQuery();
    if (!action) return;

    switch (action) {
      case 'admin_users':
        await showUsers(ctx);
        break;
      case 'admin_withdrawals':
        await showWithdrawals(ctx);
        break;
      case 'admin_games':
        await showGameConfig(ctx);
        break;
      case 'admin_ads':
        await showAdConfig(ctx);
        break;
      case 'admin_tasks':
        await showTaskConfig(ctx);
        break;
      case 'admin_bot':
        await showBotConfig(ctx);
        break;
      case 'admin_stats':
        await showStats(ctx);
        break;
      case 'admin_broadcast':
        ctx.session.adminState = { action: 'broadcast' };
        await ctx.reply('📢 Enter broadcast message (HTML supported):');
        break;
      case 'admin_exit':
        delete ctx.session.adminState;
        await ctx.reply('👋 Admin panel closed');
        return ctx.scene.leave();
    }
  }
);

async function showUsers(ctx: BotContext) {
  const { data: users } = await supabase
    .from('users')
    .select('telegram_id, first_name, username, balance, referral_count, is_banned, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  let text = `👥 <b>Recent Users</b>\n\n`;
  users?.forEach((u, i) => {
    text += `${i + 1}. ${u.first_name} (@${u.username || 'N/A'})\n`;
    text += `   ID: <code>${u.telegram_id}</code> | 💰 ${u.balance.toFixed(2)} | 👥 ${u.referral_count} ${u.is_banned ? '🚫' : ''}\n\n`;
  });

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showWithdrawals(ctx: BotContext) {
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*, users!inner(first_name, username, telegram_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  let text = `💸 <b>Pending Withdrawals</b>\n\n`;
  withdrawals?.forEach((w, i) => {
    text += `${i + 1}. ${w.users.first_name} (@${w.users.username || 'N/A'})\n`;
    text += `   💰 ${w.amount.toFixed(2)} ${config.currencySymbol} | ${w.method.toUpperCase()}\n`;
    text += `   📱 <code>${w.account_number}</code> | ID: <code>${w.id.slice(0, 8)}</code>\n\n`;
  });

  if (!withdrawals?.length) text += 'No pending withdrawals.';

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showGameConfig(ctx: BotContext) {
  const { data: configData } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['coinflip_config', 'spin_config']);

  const coinflipVal = configData?.find(c => c.key === 'coinflip_config')?.value;
  const coinflip = parseJson<{ winReward: number; lossReward: number; dailyLimit: number }>(
    coinflipVal,
    { winReward: 0.05, lossReward: 0, dailyLimit: 20 }
  );
  const spinVal = configData?.find(c => c.key === 'spin_config')?.value;
  const spin = parseJson<{ dailyLimit: number; segments?: unknown[] }>(
    spinVal,
    { dailyLimit: 10, segments: [] }
  );

  let text = `🎮 <b>Game Configuration</b>\n\n`;
  text += `🎲 <b>CoinFlip</b>\n`;
  text += `   Win: ${coinflip.winReward} | Loss: ${coinflip.lossReward} | Daily: ${coinflip.dailyLimit}\n\n`;
  text += `🎡 <b>Spin Wheel</b>\n`;
  text += `   Daily Limit: ${spin.dailyLimit}\n`;
  text += `   Segments: ${spin.segments?.length || 0}\n`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Edit CoinFlip', 'admin_edit_coinflip'), Markup.button.callback('✏️ Edit Spin', 'admin_edit_spin')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showAdConfig(ctx: BotContext) {
  const { data: configData } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['ad_config']);

  const adVal = configData?.[0]?.value;
  const ad = parseJson<{ enabled: boolean; rewardPerAd: number; dailyAdLimit: number; watchSeconds?: number }>(
    adVal,
    { enabled: true, rewardPerAd: 0.05, dailyAdLimit: 10 }
  );

  let text = `📺 <b>Ad Configuration</b>\n\n`;
  text += `Status: ${ad.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
  text += `Reward per Ad: ${ad.rewardPerAd} ${config.currencySymbol}\n`;
  text += `Daily Limit: ${ad.dailyAdLimit}\n`;
  text += `Watch Time: ${ad.watchSeconds}s\n`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Edit Ads', 'admin_edit_ads')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showTaskConfig(ctx: BotContext) {
  const { data: configData } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['task_config']);

  const taskVal = configData?.[0]?.value;
  const task = parseJson<{
    channelJoinReward: number;
    youtubeSubReward: number;
    facebookFollowReward: number;
    dailyLoginReward: number;
  }>(taskVal, { channelJoinReward: 1, youtubeSubReward: 2, facebookFollowReward: 1, dailyLoginReward: 0.5 });

  let text = `📋 <b>Task Configuration</b>\n\n`;
  text += `📢 Channel Join: ${task.channelJoinReward} ${config.currencySymbol}\n`;
  text += `▶️ YouTube Sub: ${task.youtubeSubReward} ${config.currencySymbol}\n`;
  text += `👍 Facebook Follow: ${task.facebookFollowReward} ${config.currencySymbol}\n`;
  text += `📅 Daily Login: ${task.dailyLoginReward} ${config.currencySymbol}\n`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Edit Tasks', 'admin_edit_tasks')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showBotConfig(ctx: BotContext) {
  let text = `⚙️ <b>Bot Configuration</b>\n\n`;
  text += `Bot Username: @${config.botUsername}\n`;
  text += `Admin Count: ${config.adminIds.length}\n`;
  text += `Maintenance: ${config.maintenanceMode ? '🔴 On' : '🟢 Off'}\n`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

async function showStats(ctx: BotContext) {
  const [{ count: users }, { count: totalWithdrawals }, { data: games }, { data: ads }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('withdrawals').select('*', { count: 'exact', head: true }),
    supabase.from('games_log').select('game_type, result'),
    supabase.from('ads_log').select('provider, reward'),
  ]);

  const coinflipGames = games?.filter(g => g.game_type === 'coinflip').length || 0;
  const spinGames = games?.filter(g => g.game_type === 'spin').length || 0;
  const adRevenue = ads?.reduce((sum, a) => sum + (a.reward || 0), 0) || 0;

  let text = `📊 <b>Detailed Statistics</b>\n\n`;
  text += `👥 Users: ${users || 0}\n`;
  text += `🎮 CoinFlip Games: ${coinflipGames}\n`;
  text += `🎡 Spin Games: ${spinGames}\n`;
  text += `📺 Ads Watched: ${ads?.length || 0}\n`;
  text += `💰 Ad Revenue: ${adRevenue.toFixed(2)} ${config.currencySymbol}\n`;
  text += `💸 Total Withdrawals: ${totalWithdrawals || 0}\n`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ])});
}

export const withdrawScene = new Scenes.WizardScene<BotContext>(
  'withdraw',
  async (ctx) => {
    if (!ctx.user) return ctx.scene.leave();
    
    if (ctx.user.balance < 100) {
      await ctx.reply(`❌ Minimum balance for withdrawal is 100 ${config.currencySymbol}. Your balance: ${ctx.user.balance.toFixed(2)}`);
      return ctx.scene.leave();
    }

    await ctx.reply(
      `💸 <b>Withdraw Funds</b>\n\n` +
      `Available: ${ctx.user.balance.toFixed(2)} ${config.currencySymbol}\n` +
      `Minimum: 100 ${config.currencySymbol}\n\n` +
      `Select payment method:`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('💚 bKash', 'withdraw_bkash'), Markup.button.callback('🟠 Nagad', 'withdraw_nagad')],
        [Markup.button.callback('🔵 Rocket', 'withdraw_rocket'), Markup.button.callback('🟡 Binance', 'withdraw_binance')],
        [Markup.button.callback('❌ Cancel', 'withdraw_cancel')],
      ])}
    );
    return ctx.wizard.next();
  },
  async (ctx, next) => {
    if (!ctx.callbackQuery) {
      return next();
    }

    const action = (ctx.callbackQuery as { data?: string }).data;
    await ctx.answerCbQuery();
    if (!action) return;

    if (action === 'withdraw_cancel') {
      await ctx.editMessageText('❌ Withdrawal cancelled');
      return ctx.scene.leave();
    }

    const method = action.replace('withdraw_', '');
    ctx.session.withdrawState = { method, step: 'amount' };

    await ctx.editMessageText(
      `💸 <b>Withdraw via ${method.toUpperCase()}</b>\n\n` +
      `Enter amount (minimum 100 ${config.currencySymbol}):`,
      { parse_mode: 'HTML' }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const msg = ctx.message;
    if (!msg || !('text' in msg)) return;

    const amount = parseFloat(msg.text);
    if (isNaN(amount) || amount < 100) {
      return ctx.reply(`❌ Invalid amount. Minimum 100 ${config.currencySymbol}`);
    }

    if (!ctx.user || amount > ctx.user.balance) {
      return ctx.reply(`❌ Insufficient balance. You have ${ctx.user?.balance.toFixed(2) || 0} ${config.currencySymbol}`);
    }

    const st = ctx.session.withdrawState;
    if (!st) return ctx.scene.leave();
    ctx.session.withdrawState = { ...st, amount, step: 'account' };
    await ctx.reply(`📱 Enter your ${st.method.toUpperCase()} account number:`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const msg = ctx.message;
    if (!msg || !('text' in msg)) return;

    const accountNumber = msg.text.trim();
    if (!accountNumber) return ctx.reply('❌ Please enter a valid account number.');

    const st = ctx.session.withdrawState;
    if (!ctx.user || !st || st.amount === undefined) return ctx.scene.leave();
    const amount = st.amount;
    const method = st.method;

    const { data: result } = await supabase.rpc('process_withdrawal', {
      user_id: ctx.user.id,
      amount,
      method,
      account_number: accountNumber,
    });

    if (!result?.success) {
      logger.error('Withdrawal failed', { error: result?.error ?? result?.message });
      return ctx.reply(`❌ Failed to submit withdrawal: ${result?.error ?? 'unknown_error'}`);
    }

    delete ctx.session.withdrawState;

    await ctx.reply(
      `✅ <b>Withdrawal Request Submitted</b>\n\n` +
      `💰 Amount: ${amount.toFixed(2)} ${config.currencySymbol}\n` +
      `🏦 Method: ${method.toUpperCase()}\n` +
      `📱 Account: ${accountNumber}\n` +
      `📋 Request ID: <code>${String(result.order_id).slice(0, 8)}</code>\n\n` +
      `Status: ⏳ Pending`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Main Menu', 'main_menu')],
      ])}
    );

    return ctx.scene.leave();
  }
);