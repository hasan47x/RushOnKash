/*
 * RushOnCash — NxCreate edition
 * Paste this whole file into the NxCreate Code Editor and Save.
 *
 * Env (Env Editor, one per line):
 *   SUPABASE_URL=https://scpgzdfegmqkczvxziis.supabase.co
 *   SUPABASE_SERVICE_KEY=<service role key>
 *   ADMIN_IDS=7530477593
 *   WITHDRAW_GROUP_ID=-1002667143825
 *   MINI_APP_URL=https://your-mini-app.vercel.app
 *   BOT_USERNAME=Income_KoroBot
 * BOT_TOKEN is injected by the platform — do not set it.
 */

// ═══════════ [SECTION 1] Config & helpers ═══════════

const CFG = {
  currency: '৳',
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
  miniAppUrl: (process.env.MINI_APP_URL || '').replace(/\/+$/, ''),
  adminIdsEnv: (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  adminIds: [],
  withdrawGroupId: process.env.WITHDRAW_GROUP_ID || '',
  botUsername: process.env.BOT_USERNAME || '',
  maintenanceMode: false,
  referralBonus: 1,
};
CFG.adminIds = CFG.adminIdsEnv.slice();

function log(tag, extra) {
  try {
    console.log('[RushOnCash]', tag, extra === undefined ? '' : JSON.stringify(extra));
  } catch (e) {}
}

function parseJson(value, fallback) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return fallback; }
  }
  if (value && typeof value === 'object') return value;
  return fallback;
}

function isAdmin(ctx) {
  return Boolean(ctx.from) && CFG.adminIds.indexOf(String(ctx.from.id)) !== -1;
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// webApp button only when MINI_APP_URL is configured, else a safe callback
function miniBtn(label, query) {
  if (CFG.miniAppUrl) return Markup.button.webApp(label, CFG.miniAppUrl + (query || ''));
  return Markup.button.callback(label, 'mini_app_pending');
}

// In-memory per-user flow state (withdraw wizard / admin broadcast).
// Survives for FLOW_TTL; cleared automatically. Reset on bot re-save is OK.
const FLOW = new Map();
const FLOW_TTL = 15 * 60 * 1000;

function setFlow(uid, data) {
  data.t = Date.now();
  FLOW.set(String(uid), data);
}
function getFlow(uid) {
  const f = FLOW.get(String(uid));
  if (!f) return null;
  if (Date.now() - f.t > FLOW_TTL) { FLOW.delete(String(uid)); return null; }
  return f;
}
function delFlow(uid) { FLOW.delete(String(uid)); }

// ═══════════ [SECTION 2] Supabase REST client (axios) ═══════════

function sh(extra) {
  return Object.assign({ apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey }, extra || {});
}
function errMsg(e) {
  if (e && e.response && e.response.data) {
    const d = e.response.data;
    return (d && (d.message || d.error_description || d.error)) || JSON.stringify(d);
  }
  return (e && e.message) || String(e);
}
function qs(filters, order, limit) {
  const p = [];
  if (filters) {
    const keys = Object.keys(filters);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = filters[k];
      if (v && typeof v === 'object' && v.in) {
        p.push(k + '=in.(' + v.in.map((x) => encodeURIComponent(x)).join(',') + ')');
      } else {
        p.push(k + '=eq.' + encodeURIComponent(v));
      }
    }
  }
  if (order) p.push('order=' + order.col + '.' + (order.asc ? 'asc' : 'desc'));
  if (limit) p.push('limit=' + limit);
  return p.length ? '?' + p.join('&') : '';
}
async function rpc(name, body) {
  try {
    const r = await axios.post(
      CFG.supabaseUrl + '/rest/v1/rpc/' + name,
      body === undefined ? {} : body,
      { headers: sh({ 'Content-Type': 'application/json' }) }
    );
    return { data: r.data, error: null };
  } catch (e) {
    return { data: null, error: { message: errMsg(e) } };
  }
}
async function selectMany(table, filters, opts) {
  opts = opts || {};
  try {
    const url =
      CFG.supabaseUrl + '/rest/v1/' + table +
      '?select=' + encodeURIComponent(opts.cols || '*') +
      qs(filters, opts.order, opts.limit);
    const r = await axios.get(url, { headers: sh() });
    return { data: r.data, error: null };
  } catch (e) {
    return { data: null, error: { message: errMsg(e) } };
  }
}
async function selectOne(table, filters, opts) {
  const res = await selectMany(table, filters, opts);
  if (res.error) return { data: null, error: res.error };
  return { data: res.data && res.data.length ? res.data[0] : null, error: null };
}
async function insertRow(table, row) {
  try {
    const r = await axios.post(CFG.supabaseUrl + '/rest/v1/' + table, row, {
      headers: sh({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    });
    return { data: r.data && r.data[0], error: null };
  } catch (e) {
    return { data: null, error: { message: errMsg(e) } };
  }
}
async function updateRows(table, filters, patch) {
  try {
    const r = await axios.patch(
      CFG.supabaseUrl + '/rest/v1/' + table + qs(filters),
      patch,
      { headers: sh({ 'Content-Type': 'application/json', Prefer: 'return=representation' }) }
    );
    return { data: r.data, error: null };
  } catch (e) {
    return { data: null, error: { message: errMsg(e) } };
  }
}
async function countRows(table, filters) {
  try {
    const r = await axios.head(
      CFG.supabaseUrl + '/rest/v1/' + table + '?select=*' + qs(filters),
      { headers: sh({ Prefer: 'count=exact' }) }
    );
    const cr = r.headers && (r.headers['content-range'] || (r.headers.get && r.headers.get('content-range')));
    const m = cr && cr.match(/\/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
  } catch (e) {
    return 0;
  }
}

// ═══════════ [SECTION 3] App config & user lookup ═══════════

let _ready = null;
function ensureConfig() {
  if (!_ready) {
    _ready = (async function () {
      try {
        const { data } = await selectOne('app_config', { key: 'bot_config' });
        const v = parseJson(data && data.value, null);
        if (v && typeof v === 'object') {
          if (typeof v.botUsername === 'string' && v.botUsername) CFG.botUsername = v.botUsername;
          if (Array.isArray(v.adminIds)) {
            CFG.adminIds = Array.from(new Set(CFG.adminIdsEnv.concat(v.adminIds.map(String))));
          }
          if (typeof v.withdrawGroupId === 'string') CFG.withdrawGroupId = v.withdrawGroupId;
          if (typeof v.maintenanceMode === 'boolean') CFG.maintenanceMode = v.maintenanceMode;
          if (typeof v.referralBonus === 'number') CFG.referralBonus = v.referralBonus;
        }
        if (!CFG.botUsername) {
          try {
            const me = await bot.telegram.getMe();
            CFG.botUsername = me.username;
          } catch (e) {}
        }
        log('app_config loaded', { admins: CFG.adminIds.length, bot: CFG.botUsername });
      } catch (e) {
        log('app_config load failed', { error: (e && e.message) || String(e) });
      }
      return true;
    })();
  }
  return _ready;
}

async function getUser(ctx) {
  await ensureConfig();
  const { data } = await selectOne('users', { telegram_id: String(ctx.from.id) });
  return data;
}

// ═══════════ [SECTION 4] Commands ═══════════

bot.command('start', async (ctx) => {
  await ensureConfig();
  const parts = (ctx.message && ctx.message.text ? ctx.message.text : '').split(' ');
  const payload = parts.length > 1 ? parts[1].trim() : '';
  let referrerUser = null;

  if (payload) {
    if (payload.indexOf('ref_') === 0) {
      const code = payload.slice(4).toUpperCase();
      const { data } = await selectOne('users', { referral_code: code });
      referrerUser = data;
    } else if (/^\d+$/.test(payload)) {
      const { data } = await selectOne('users', { telegram_id: payload });
      referrerUser = data;
    }
  }

  const userId = String(ctx.from.id);
  const { data: user } = await selectOne('users', { telegram_id: userId });

  if (!user) {
    const referralCode = generateReferralCode();
    const { data: newUser, error } = await insertRow('users', {
      telegram_id: userId,
      username: (ctx.from && ctx.from.username) || null,
      first_name: (ctx.from && (ctx.from.first_name || ctx.from.username)) || 'User',
      last_name: (ctx.from && ctx.from.last_name) || null,
      balance: 0,
      total_earned: 0,
      referral_code: referralCode,
      referred_by: referrerUser ? referrerUser.id : null,
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
    });

    if (error) {
      log('user creation failed', { error: error.message, userId });
      return ctx.reply('❌ Failed to create account. Please try again.');
    }

    if (referrerUser && referrerUser.id !== newUser.id) {
      const { error: refErr } = await insertRow('referrals', {
        referrer_id: referrerUser.id,
        referred_id: newUser.id,
      });
      if (!refErr) {
        const { data: claim } = await rpc('claim_referral_bonus', {
          referrer_id: referrerUser.id,
          referred_id: newUser.id,
          bonus: CFG.referralBonus,
        });
        if (claim && claim.success) {
          await updateRows('users', { id: referrerUser.id }, {
            referral_count: referrerUser.referral_count + 1,
          });
        }
      }
    }

    return ctx.reply(
      '🎉 Welcome to RushOnCash!\n\n' +
      'Your referral code: <code>' + referralCode + '</code>\n' +
      'Share it with friends and earn ' + (CFG.referralBonus || 1) + ' ' + CFG.currency + ' per referral!',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[miniBtn('🎮 Open Mini App')]]) }
    );
  }

  return ctx.reply(
    '👋 Welcome back, ' + user.first_name + '!\n\n' +
    '💰 Balance: ' + Number(user.balance).toFixed(2) + ' ' + CFG.currency + '\n' +
    '👥 Referrals: ' + user.referral_count + '\n' +
    '🔗 Your code: <code>' + user.referral_code + '</code>',
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[miniBtn('🎮 Open Mini App')]]) }
  );
});

bot.command('balance', async (ctx) => {
  const user = await getUser(ctx);
  if (!user) return ctx.reply('Please /start first');
  return ctx.reply(
    '💰 <b>Your Balance</b>\n\n' +
    'Available: <b>' + Number(user.balance).toFixed(2) + '</b> ' + CFG.currency + '\n\n' +
    '📊 <b>Stats</b>\n' +
    '• CoinFlip: ' + user.coinflip_won + '/' + user.coinflip_played + ' wins\n' +
    '• Spin: ' + user.spin_won + '/' + user.spin_played + ' wins\n' +
    '• Referrals: ' + user.referral_count,
    { parse_mode: 'HTML' }
  );
});

bot.command('referral', async (ctx) => {
  const user = await getUser(ctx);
  if (!user) return ctx.reply('Please /start first');
  await ensureConfig();
  const link = 'https://t.me/' + (CFG.botUsername || 'Income_KoroBot') + '?start=ref_' + user.referral_code;
  return ctx.reply(
    '🔗 <b>Your Referral Link</b>\n\n' +
    '<code>' + link + '</code>\n\n' +
    'Share this link with friends.\n' +
    'You earn <b>' + (CFG.referralBonus || 1) + ' ' + CFG.currency + '</b> per referral!',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📤 Share on Telegram', 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('Join RushOnCash and earn money!'))],
      ]),
    }
  );
});

bot.command('withdraw', async (ctx) => {
  return startWithdrawFlow(ctx, false);
});

bot.command('games', async (ctx) => {
  return ctx.reply(
    '🎮 <b>Available Games</b>\n\n' +
    '🎲 <b>CoinFlip</b> - Flip a coin, win if you guess right!\n' +
    '🎡 <b>Spin Wheel</b> - Spin the wheel for rewards!\n\n' +
    'Open Mini App to play:',
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[miniBtn('🎮 Play Games')]]) }
  );
});

bot.command('help', async (ctx) => {
  return ctx.reply(
    '📖 <b>Help & Commands</b>\n\n' +
    '/start - Register / Open Mini App\n' +
    '/balance - Check your balance\n' +
    '/referral - Get referral link\n' +
    '/withdraw - Withdraw funds\n' +
    '/games - View available games\n' +
    '/help - Show this help\n\n' +
    'Need support? Contact @support',
    { parse_mode: 'HTML' }
  );
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showAdminPanel(ctx);
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ensureConfig();
  const results = await Promise.all([
    countRows('users'),
    countRows('withdrawals', { status: 'pending' }),
    selectMany('users', null, { cols: 'balance' }),
  ]);
  const users = results[0];
  const withdrawals = results[1];
  const totalBal = (results[2].data || []).reduce((sum, u) => sum + (u.balance || 0), 0);
  return ctx.reply(
    '📊 <b>Bot Statistics</b>\n\n' +
    '👥 Total Users: ' + users + '\n' +
    '💰 Total Balance: ' + totalBal.toFixed(2) + ' ' + CFG.currency + '\n' +
    '⏳ Pending Withdrawals: ' + withdrawals,
    { parse_mode: 'HTML' }
  );
});

bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const message = (ctx.message.text || '').replace('/broadcast', '').trim();
  if (!message) return ctx.reply('Usage: /broadcast <message>');
  return queueBroadcast(ctx, message);
});

// ═══════════ [SECTION 5] Callback buttons (menu) ═══════════

bot.action('mini_app_pending', async (ctx) => {
  await ctx.answerCbQuery('Mini App link not set yet — add MINI_APP_URL env', { show_alert: true });
});

bot.action('open_mini_app', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply('Opening Mini App...', Markup.inlineKeyboard([[miniBtn('🎮 Open RushOnCash')]]));
});

bot.action('check_balance', async (ctx) => {
  await ctx.answerCbQuery();
  const user = await getUser(ctx);
  if (!user) return ctx.reply('Please /start first');
  return ctx.editMessageText(
    '💰 <b>Your Balance</b>\n\nAvailable: <b>' + Number(user.balance).toFixed(2) + '</b> ' + CFG.currency,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'check_balance')],
        [Markup.button.callback('💸 Withdraw', 'withdraw_menu')],
      ]),
    }
  );
});

bot.action('withdraw_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return startWithdrawFlow(ctx, true);
});

bot.action('referral_info', async (ctx) => {
  await ctx.answerCbQuery();
  const user = await getUser(ctx);
  if (!user) return ctx.reply('Please /start first');
  await ensureConfig();
  const link = 'https://t.me/' + (CFG.botUsername || 'Income_KoroBot') + '?start=ref_' + user.referral_code;
  return ctx.editMessageText(
    '🔗 <b>Referral Program</b>\n\n' +
    'Your code: <code>' + user.referral_code + '</code>\n' +
    'Referrals: ' + user.referral_count + '\n' +
    'Earn: ' + (CFG.referralBonus || 1) + ' ' + CFG.currency + ' per referral\n\n' +
    'Link: ' + link,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📤 Share', 'https://t.me/share/url?url=' + encodeURIComponent(link))],
        [Markup.button.callback('🔙 Back', 'main_menu')],
      ]),
    }
  );
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  const user = await getUser(ctx);
  if (!user) return ctx.reply('Please /start first');
  return ctx.editMessageText(
    '🏠 <b>Main Menu</b>\n\n' +
    '💰 Balance: ' + Number(user.balance).toFixed(2) + ' ' + CFG.currency + '\n' +
    '👥 Referrals: ' + user.referral_count,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💰 Balance', 'check_balance')],
        [Markup.button.callback('🎮 Games', 'games_menu')],
        [Markup.button.callback('🔗 Referral', 'referral_info')],
        [Markup.button.callback('💸 Withdraw', 'withdraw_menu')],
        [miniBtn('🌐 Open Mini App')],
      ]),
    }
  );
});

bot.action('games_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.editMessageText(
    '🎮 <b>Games</b>\n\n' +
    '🎲 <b>CoinFlip</b> - 50/50 chance\n' +
    '🎡 <b>Spin Wheel</b> - Multiple rewards\n\n' +
    'Play in Mini App:',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [miniBtn('🎮 Play CoinFlip', '?game=coinflip')],
        [miniBtn('🎮 Play Spin', '?game=spin')],
        [Markup.button.callback('🔙 Back', 'main_menu')],
      ]),
    }
  );
});

// ── Withdraw flow: method → amount → account ──

async function startWithdrawFlow(ctx, isCallback) {
  const user = await getUser(ctx);
  if (!user) {
    if (isCallback) await ctx.answerCbQuery();
    return ctx.reply('Please /start first');
  }
  if (user.balance < 100) {
    if (isCallback) await ctx.answerCbQuery();
    return ctx.reply(
      '❌ Minimum balance for withdrawal is 100 ' + CFG.currency +
      '. Your balance: ' + Number(user.balance).toFixed(2)
    );
  }
  if (isCallback) await ctx.answerCbQuery();
  setFlow(ctx.from.id, { step: 'w_method' });
  return ctx.reply(
    '💸 <b>Withdraw Funds</b>\n\n' +
    'Available: ' + Number(user.balance).toFixed(2) + ' ' + CFG.currency + '\n' +
    'Minimum: 100 ' + CFG.currency + '\n\n' +
    'Select payment method:',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💚 bKash', 'withdraw_bkash'), Markup.button.callback('🟠 Nagad', 'withdraw_nagad')],
        [Markup.button.callback('🔵 Rocket', 'withdraw_rocket'), Markup.button.callback('🟡 Binance', 'withdraw_binance')],
        [Markup.button.callback('❌ Cancel', 'withdraw_cancel')],
      ]),
    }
  );
}

bot.action(/^withdraw_(bkash|nagad|rocket|binance)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const method = ctx.callbackQuery.data.replace('withdraw_', '');
  setFlow(ctx.from.id, { step: 'w_amount', method: method });
  await ctx.editMessageText(
    '💸 <b>Withdraw via ' + method.toUpperCase() + '</b>\n\n' +
    'Enter amount (minimum 100 ' + CFG.currency + '):',
    { parse_mode: 'HTML' }
  );
});

bot.action('withdraw_cancel', async (ctx) => {
  await ctx.answerCbQuery();
  delFlow(ctx.from.id);
  try {
    await ctx.editMessageText('❌ Withdrawal cancelled');
  } catch (e) {
    await ctx.reply('❌ Withdrawal cancelled');
  }
});

// ── Admin panel ──

async function showAdminPanel(ctx) {
  await ensureConfig();
  const results = await Promise.all([
    countRows('users'),
    countRows('withdrawals', { status: 'pending' }),
    selectMany('users', null, { cols: 'balance' }),
  ]);
  const totalBal = (results[2].data || []).reduce((sum, u) => sum + (u.balance || 0), 0);
  const text =
    '🛡 <b>Admin Panel</b>\n\n' +
    '👥 Users: ' + results[0] + '\n' +
    '💰 Total Balance: ' + totalBal.toFixed(2) + ' ' + CFG.currency + '\n' +
    '⏳ Pending Withdrawals: ' + results[1];
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('👥 Users', 'admin_users'), Markup.button.callback('💸 Withdrawals', 'admin_withdrawals')],
    [Markup.button.callback('🎮 Game Config', 'admin_games'), Markup.button.callback('📺 Ad Config', 'admin_ads')],
    [Markup.button.callback('📋 Task Config', 'admin_tasks'), Markup.button.callback('⚙️ Bot Config', 'admin_bot')],
    [Markup.button.callback('📊 Stats', 'admin_stats'), Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
    [Markup.button.callback('🚪 Exit', 'admin_exit')],
  ]);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

function adminGuard(ctx) {
  if (isAdmin(ctx)) return true;
  ctx.answerCbQuery('❌ Admin only', { show_alert: true });
  return false;
}

bot.action('admin_users', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const { data: users } = await selectMany('users', null, {
    cols: 'telegram_id, first_name, username, balance, referral_count, is_banned, created_at',
    order: { col: 'created_at', asc: false },
    limit: 20,
  });
  let text = '👥 <b>Recent Users</b>\n\n';
  (users || []).forEach((u, i) => {
    text += (i + 1) + '. ' + u.first_name + ' (@' + (u.username || 'N/A') + ')\n';
    text += '   ID: <code>' + u.telegram_id + '</code> | 💰 ' + Number(u.balance).toFixed(2) +
      ' | 👥 ' + u.referral_count + (u.is_banned ? ' 🚫' : '') + '\n\n';
  });
  if (!users || !users.length) text += 'No users yet.';
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'admin_back')]]),
  });
});

bot.action('admin_withdrawals', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const { data: withdrawals } = await selectMany('withdrawals', { status: 'pending' }, {
    cols: '*, users!inner(first_name, username, telegram_id)',
    order: { col: 'created_at', asc: true },
    limit: 20,
  });
  let text = '💸 <b>Pending Withdrawals</b>\n\n';
  (withdrawals || []).forEach((w, i) => {
    const u = w.users || {};
    text += (i + 1) + '. ' + (u.first_name || '?') + ' (@' + (u.username || 'N/A') + ')\n';
    text += '   💰 ' + Number(w.amount).toFixed(2) + ' ' + CFG.currency + ' | ' + String(w.method || '').toUpperCase() + '\n';
    text += '   📱 <code>' + w.account_number + '</code> | ID: <code>' + String(w.id).slice(0, 8) + '</code>\n\n';
  });
  if (!withdrawals || !withdrawals.length) text += 'No pending withdrawals.';
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'admin_back')]]),
  });
});

bot.action('admin_games', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const { data: rows } = await selectMany('app_config', { key: { in: ['coinflip_config', 'spin_config'] } }, { cols: 'key, value' });
  const coinflip = parseJson((rows || []).find((r) => r.key === 'coinflip_config') && (rows || []).find((r) => r.key === 'coinflip_config').value,
    { winReward: 0.05, lossReward: 0, dailyLimit: 20 });
  const spin = parseJson((rows || []).find((r) => r.key === 'spin_config') && (rows || []).find((r) => r.key === 'spin_config').value,
    { dailyLimit: 10, segments: [] });
  const text =
    '🎮 <b>Game Configuration</b>\n\n' +
    '🎲 <b>CoinFlip</b>\n   Win: ' + coinflip.winReward + ' | Loss: ' + coinflip.lossReward + ' | Daily: ' + coinflip.dailyLimit + '\n\n' +
    '🎡 <b>Spin Wheel</b>\n   Daily Limit: ' + spin.dailyLimit + '\n   Segments: ' + ((spin.segments && spin.segments.length) || 0);
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Edit CoinFlip', 'admin_edit_coinflip'), Markup.button.callback('✏️ Edit Spin', 'admin_edit_spin')],
      [Markup.button.callback('🔙 Back', 'admin_back')],
    ]),
  });
});

bot.action('admin_ads', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const { data: rows } = await selectMany('app_config', { key: 'ad_config' }, { cols: 'key, value' });
  const ad = parseJson(rows && rows[0] && rows[0].value, { enabled: true, rewardPerAd: 0.05, dailyAdLimit: 10 });
  const text =
    '📺 <b>Ad Configuration</b>\n\n' +
    'Status: ' + (ad.enabled ? '✅ Enabled' : '❌ Disabled') + '\n' +
    'Reward per Ad: ' + ad.rewardPerAd + ' ' + CFG.currency + '\n' +
    'Daily Limit: ' + ad.dailyAdLimit + '\n' +
    'Watch Time: ' + (ad.watchSeconds || 0) + 's';
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Edit Ads', 'admin_edit_ads')],
      [Markup.button.callback('🔙 Back', 'admin_back')],
    ]),
  });
});

bot.action('admin_tasks', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const { data: rows } = await selectMany('app_config', { key: 'task_config' }, { cols: 'key, value' });
  const task = parseJson(rows && rows[0] && rows[0].value, {
    channelJoinReward: 1, youtubeSubReward: 2, facebookFollowReward: 1, dailyLoginReward: 0.5,
  });
  const text =
    '📋 <b>Task Configuration</b>\n\n' +
    '📢 Channel Join: ' + task.channelJoinReward + ' ' + CFG.currency + '\n' +
    '▶️ YouTube Sub: ' + task.youtubeSubReward + ' ' + CFG.currency + '\n' +
    '👍 Facebook Follow: ' + task.facebookFollowReward + ' ' + CFG.currency + '\n' +
    '📅 Daily Login: ' + task.dailyLoginReward + ' ' + CFG.currency;
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Edit Tasks', 'admin_edit_tasks')],
      [Markup.button.callback('🔙 Back', 'admin_back')],
    ]),
  });
});

bot.action('admin_bot', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  await ensureConfig();
  const text =
    '⚙️ <b>Bot Configuration</b>\n\n' +
    'Bot Username: @' + CFG.botUsername + '\n' +
    'Admin Count: ' + CFG.adminIds.length + '\n' +
    'Maintenance: ' + (CFG.maintenanceMode ? '🔴 On' : '🟢 Off');
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'admin_back')]]),
  });
});

bot.action('admin_stats', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  const results = await Promise.all([
    countRows('users'),
    countRows('withdrawals'),
    selectMany('games_log', null, { cols: 'game_type, result' }),
    selectMany('ads_log', null, { cols: 'provider, reward' }),
  ]);
  const games = results[2].data || [];
  const ads = results[3].data || [];
  const coinflipGames = games.filter((g) => g.game_type === 'coinflip').length;
  const spinGames = games.filter((g) => g.game_type === 'spin').length;
  const adRevenue = ads.reduce((sum, a) => sum + (a.reward || 0), 0);
  const text =
    '📊 <b>Detailed Statistics</b>\n\n' +
    '👥 Users: ' + results[0] + '\n' +
    '🎮 CoinFlip Games: ' + coinflipGames + '\n' +
    '🎡 Spin Games: ' + spinGames + '\n' +
    '📺 Ads Watched: ' + ads.length + '\n' +
    '💰 Ad Revenue: ' + adRevenue.toFixed(2) + ' ' + CFG.currency + '\n' +
    '💸 Total Withdrawals: ' + results[1];
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'admin_back')]]),
  });
});

bot.action('admin_broadcast', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  setFlow(ctx.from.id, { step: 'admin_broadcast' });
  return ctx.reply('📢 Enter broadcast message (HTML supported):');
});

bot.action('admin_back', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  await showAdminPanel(ctx);
});

bot.action('admin_exit', async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery();
  delFlow(ctx.from.id);
  return ctx.reply('👋 Admin panel closed');
});

bot.action(/^admin_edit_/, async (ctx) => {
  if (!adminGuard(ctx)) return;
  await ctx.answerCbQuery('Use the Admin Panel web app to edit configs', { show_alert: true });
});

async function queueBroadcast(ctx, text) {
  try {
    const result = await broadcast({ type: 'text', text: text, parseMode: 'HTML' });
    return ctx.reply(
      '📢 Broadcast queued.\n' +
      'Job: <code>' + (result && result.jobId ? result.jobId : 'unknown') + '</code>',
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    log('broadcast failed', { error: (e && e.message) || String(e) });
    return ctx.reply('❌ Failed to queue broadcast. Check logs.');
  }
}

// ═══════════ [SECTION 6] Text input (flows) ═══════════
// Registered LAST so all commands/buttons above consume first.

bot.on('text', async (ctx) => {
  const text = (ctx.message && ctx.message.text) || '';
  if (!text || text.charAt(0) === '/') return;
  const uid = ctx.from.id;
  const flow = getFlow(uid);
  if (!flow) return;

  if (flow.step === 'w_method') {
    // user typed instead of pressing a button — ignore, buttons are shown
    return;
  }

  if (flow.step === 'w_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 100) {
      return ctx.reply('❌ Invalid amount. Minimum 100 ' + CFG.currency);
    }
    const user = await getUser(ctx);
    if (!user || amount > Number(user.balance)) {
      return ctx.reply(
        '❌ Insufficient balance. You have ' +
        (user ? Number(user.balance).toFixed(2) : '0') + ' ' + CFG.currency
      );
    }
    setFlow(uid, { step: 'w_account', method: flow.method, amount: amount });
    return ctx.reply('📱 Enter your ' + String(flow.method).toUpperCase() + ' account number:');
  }

  if (flow.step === 'w_account') {
    const accountNumber = text.trim();
    if (!accountNumber) return ctx.reply('❌ Please enter a valid account number.');
    const user = await getUser(ctx);
    if (!user || flow.amount === undefined) {
      delFlow(uid);
      return ctx.reply('❌ Withdrawal session expired. Send /withdraw to start again.');
    }
    delFlow(uid);

    const { data: result, error } = await rpc('process_withdrawal', {
      user_id: user.id,
      amount: flow.amount,
      method: flow.method,
      account_number: accountNumber,
    });

    if (error || !result || !result.success) {
      log('withdrawal failed', { error: (result && (result.error || result.message)) || (error && error.message) });
      return ctx.reply('❌ Failed to submit withdrawal: ' + ((result && (result.error || result.message)) || (error && error.message) || 'unknown_error'));
    }

    await ctx.reply(
      '✅ <b>Withdrawal Request Submitted</b>\n\n' +
      '💰 Amount: ' + Number(flow.amount).toFixed(2) + ' ' + CFG.currency + '\n' +
      '🏦 Method: ' + String(flow.method).toUpperCase() + '\n' +
      '📱 Account: ' + accountNumber + '\n' +
      '📋 Request ID: <code>' + String(result.order_id).slice(0, 8) + '</code>\n\n' +
      'Status: ⏳ Pending\n' +
      "You'll be notified once processed.",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Main Menu', 'main_menu')]]) }
    );

    if (CFG.withdrawGroupId) {
      try {
        await bot.telegram.sendMessage(
          CFG.withdrawGroupId,
          '🚨 <b>New Withdrawal Request</b>\n\n' +
          '👤 User: ' + user.first_name + ' (@' + (user.username || 'N/A') + ')\n' +
          '🆔 ID: <code>' + user.telegram_id + '</code>\n' +
          '💰 Amount: ' + Number(flow.amount).toFixed(2) + ' ' + CFG.currency + '\n' +
          '🏦 Method: ' + String(flow.method).toUpperCase() + '\n' +
          '📱 Account: <code>' + accountNumber + '</code>\n' +
          '📋 Request ID: <code>' + String(result.order_id) + '</code>',
          { parse_mode: 'HTML' }
        );
      } catch (e) {}
    }
    return;
  }

  if (flow.step === 'admin_broadcast') {
    delFlow(uid);
    if (!isAdmin(ctx)) return;
    return queueBroadcast(ctx, text);
  }
});

ensureConfig().then(function () {
  log('bot handlers registered', { bot: CFG.botUsername });
});
