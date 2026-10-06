/*
 * Local self-test for nxbot.js — runs the NxCreate bot file under Node
 * with mocked platform globals (bot, Markup, axios, broadcast).
 * Usage: node bot/nx/selftest.js
 */
'use strict';

// ── env before loading the bot file ──
process.env.SUPABASE_URL = 'https://scpgzdfegmqkczvxziis.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.ADMIN_IDS = '7530477593';
process.env.WITHDRAW_GROUP_ID = '-1002667143825';
process.env.MINI_APP_URL = 'https://mini.example.com';
process.env.BOT_USERNAME = 'Income_KoroBot';

const CALLS = { axios: [], replies: [], edits: [], group: [], broadcasts: [] };

// ── mock axios (Supabase REST) ──
const USER_111 = {
  id: 'u111', telegram_id: '111', username: 'tester', first_name: 'Tester', last_name: null,
  balance: 500, total_earned: 10, referral_code: 'TESTCODE1', referred_by: null,
  referral_count: 2, daily_ads_watched: 0, daily_ads_limit: 10, last_ad_date: '2026-10-05',
  coinflip_played: 5, coinflip_won: 3, spin_played: 2, spin_won: 1,
  is_banned: false, is_bot_verified: true,
};

function urlPath(u) { return u.split('?')[0]; }

const CREATED = {};
let createdSeq = 0;

const axiosMock = {
  async get(url) {
    CALLS.axios.push(['GET', url]);
    if (urlPath(url).endsWith('/app_config')) {
      return { data: [{ key: 'bot_config', value: {
        botUsername: 'Income_KoroBot', adminIds: ['7530477593'],
        withdrawGroupId: '-1002667143825', maintenanceMode: false, referralBonus: 1,
      } }] };
    }
    if (urlPath(url).endsWith('/users')) {
      const mId = url.match(/telegram_id=eq\.([^&]+)/);
      if (mId) {
        const tid = decodeURIComponent(mId[1]);
        if (CREATED[tid]) return { data: [CREATED[tid]] };
        if (tid === '111') return { data: [USER_111] };
        return { data: [] };
      }
      if (url.includes('select=id&')) return { data: Array.from({ length: 150 }, (v, i) => ({ id: 'u' + i })) };
      if (url.includes('select=balance')) return { data: [{ balance: 500 }, { balance: 100 }] };
      return { data: [{ ...USER_111, first_name: 'Alice' }] };
    }
    if (urlPath(url).endsWith('/withdrawals')) {
      if (url.includes('select=id&')) {
        const n = url.includes('status=eq.pending') ? 3 : 10;
        return { data: Array.from({ length: n }, (v, i) => ({ id: 'w' + i })) };
      }
      return { data: [] };
    }
    if (urlPath(url).endsWith('/games_log')) return { data: [{ game_type: 'coinflip' }, { game_type: 'spin' }] };
    if (urlPath(url).endsWith('/ads_log')) return { data: [{ provider: 'x', reward: 0.05 }] };
    if (urlPath(url).endsWith('/referrals')) return { data: [] };
    return { data: [] };
  },
  async post(url, body) {
    CALLS.axios.push(['POST', url, body]);
    if (url.includes('/rest/v1/rpc/claim_referral_bonus')) return { data: { success: true } };
    if (url.includes('/rest/v1/rpc/process_withdrawal')) return { data: { success: true, order_id: 'abcd1234efgh5678' } };
    if (urlPath(url).endsWith('/users')) {
      createdSeq++;
      const row = { id: 'new' + createdSeq, ...body };
      if (body && body.telegram_id) CREATED[body.telegram_id] = row;
      return { data: [row] };
    }
    if (urlPath(url).endsWith('/referrals')) return { data: [{}] };
    return { data: {} };
  },
  async patch(url, body) {
    CALLS.axios.push(['PATCH', url, body]);
    return { data: [] };
  },
  async head(url) {
    CALLS.axios.push(['HEAD', url]);
    if (url.includes('withdrawals') && url.includes('status=eq.pending')) return { headers: { 'content-range': '0-2/3' } };
    if (url.includes('withdrawals')) return { headers: { 'content-range': '0-9/10' } };
    return { headers: { 'content-range': '0-149/150' } };
  },
};

// ── mock bot (telegraf subset) ──
const handlers = { commands: [], actions: [], events: [] };

function triggerMatches(trigger, value) {
  if (typeof trigger === 'string') return trigger === value;
  if (trigger instanceof RegExp) return trigger.test(value);
  if (Array.isArray(trigger)) return trigger.some((t) => triggerMatches(t, value));
  return false;
}

const botMock = {
  command(name, fn) { handlers.commands.push({ trigger: name, fn }); return this; },
  action(trigger, fn) { handlers.actions.push({ trigger, fn }); return this; },
  on(event, fn) { handlers.events.push({ event, fn }); return this; },
  hears() { return this; },
  catch(fn) { handlers.catch = fn; return this; },
  telegram: {
    async getMe() { return { username: 'Income_KoroBot' }; },
    async sendMessage(chatId, text, opts) { CALLS.group.push({ chatId, text, opts }); return {}; },
  },
};

const MarkupMock = {
  inlineKeyboard(keyboard) { return { reply_markup: { inline_keyboard: keyboard } }; },
  button: {
    webApp(text, url) { return { text, web_app: { url } }; },
    callback(text, data) { return { text, callback_data: data }; },
    url(text, u) { return { text, url: u }; },
  },
};

async function broadcastMock(payload) { CALLS.broadcasts.push(payload); return { ok: true, jobId: 'job-42' }; }

globalThis.bot = botMock;
globalThis.Markup = MarkupMock;
globalThis.axios = axiosMock;
globalThis.broadcast = broadcastMock;

// ── load the bot file ──
require('./nxbot.js');

// ── test helpers ──
let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ✅ ' + name);
  else { failures++; console.log('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
}
function mkCtx(opts) {
  opts = opts || {};
  const from = opts.from || { id: 111, username: 'tester', first_name: 'Tester' };
  return {
    from,
    message: opts.message,
    callbackQuery: opts.callbackQuery,
    chat: { id: from.id },
    async reply(text, kb) { CALLS.replies.push(text); if (kb) CALLS.lastKb = kb; return {}; },
    async editMessageText(text, kb) { CALLS.edits.push(text); if (kb) CALLS.lastKb = kb; return {}; },
    async answerCbQuery() { return {}; },
  };
}
function last(arr) { return arr[arr.length - 1]; }
function findCmd(name) { return handlers.commands.find((h) => h.trigger === name); }
function findAction(data) { return handlers.actions.find((h) => triggerMatches(h.trigger, data)); }
const textHandler = () => handlers.events.find((e) => e.event === 'text').fn;
function reset() { CALLS.replies.length = 0; CALLS.edits.length = 0; CALLS.group.length = 0; CALLS.broadcasts.length = 0; }

(async function run() {
  await new Promise((r) => setTimeout(r, 100)); // let ensureConfig settle

  console.log('\n[1] /start (new user 333, referral payload)');
  reset();
  await findCmd('start').fn(mkCtx({ from: { id: 333, username: 'newbie', first_name: 'New' }, message: { text: '/start' } }));
  const r1 = last(CALLS.replies) || '';
  check('welcome reply', r1.includes('Welcome to RushOnCash'), r1.slice(0, 60));
  check('referral code shown', r1.includes('referral code'));
  check('user inserted', CALLS.axios.some((c) => c[0] === 'POST' && c[1].includes('/rest/v1/users')));

  console.log('\n[2] /start (returning user 111)');
  reset();
  await findCmd('start').fn(mkCtx({ message: { text: '/start' } }));
  const r2 = last(CALLS.replies) || '';
  check('welcome back', r2.includes('Welcome back, Tester'), r2.slice(0, 60));
  check('balance shown', r2.includes('500.00'));

  console.log('\n[3] /balance');
  reset();
  await findCmd('balance').fn(mkCtx({ message: { text: '/balance' } }));
  const r3 = last(CALLS.replies) || '';
  check('balance reply', r3.includes('Your Balance') && r3.includes('3/5'), r3.slice(0, 80));

  console.log('\n[4] withdraw flow: command → method → amount → account');
  reset();
  await findCmd('withdraw').fn(mkCtx({ message: { text: '/withdraw' } }));
  const r4a = last(CALLS.replies) || '';
  check('method prompt', r4a.includes('Select payment method'), r4a.slice(0, 60));
  const bkash = findAction('withdraw_bkash');
  await bkash.fn(mkCtx({ callbackQuery: { data: 'withdraw_bkash' } }));
  const r4b = last(CALLS.edits) || '';
  check('amount prompt via edit', r4b.includes('Enter amount'), r4b.slice(0, 60));
  reset();
  await textHandler()(mkCtx({ message: { text: '150' } }));
  const r4c = last(CALLS.replies) || '';
  check('account prompt', r4c.includes('account number'), r4c.slice(0, 60));
  reset();
  await textHandler()(mkCtx({ message: { text: '01712345678' } }));
  const r4d = last(CALLS.replies) || '';
  check('submitted reply', r4d.includes('Withdrawal Request Submitted'), r4d.slice(0, 60));
  check('order id shown', r4d.includes('abcd1234'));
  check('group notified', CALLS.group.length === 1 && String(CALLS.group[0].chatId) === '-1002667143825');
  check('process_withdrawal rpc called', CALLS.axios.some((c) => c[0] === 'POST' && c[1].includes('/rpc/process_withdrawal')));
  reset();
  await textHandler()(mkCtx({ message: { text: '01799999999' } }));
  check('flow cleared (no reply after done)', CALLS.replies.length === 0);

  console.log('\n[5] withdraw validation: min amount');
  reset();
  await findCmd('withdraw').fn(mkCtx({ message: { text: '/withdraw' } }));
  await findAction('withdraw_nagad').fn(mkCtx({ callbackQuery: { data: 'withdraw_nagad' } }));
  reset();
  await textHandler()(mkCtx({ message: { text: '50' } }));
  const r5 = last(CALLS.replies) || '';
  check('min amount error', r5.includes('Minimum 100'), r5.slice(0, 60));

  console.log('\n[6] admin: /admin (admin id) → panel');
  reset();
  await findCmd('admin').fn(mkCtx({ from: { id: 7530477593, first_name: 'Boss' }, message: { text: '/admin' } }));
  const r6 = last(CALLS.replies) || last(CALLS.edits) || '';
  check('admin panel', r6.includes('Admin Panel'), r6.slice(0, 60));
  check('panel has broadcast button', CALLS.lastKb && JSON.stringify(CALLS.lastKb).includes('admin_broadcast'));

  console.log('\n[7] admin: non-admin blocked');
  reset();
  await findCmd('admin').fn(mkCtx({ from: { id: 999, first_name: 'Nope' }, message: { text: '/admin' } }));
  check('no reply for non-admin', CALLS.replies.length === 0 && CALLS.edits.length === 0);

  console.log('\n[8] admin broadcast: button → text → platform broadcast()');
  reset();
  const adminCtxFrom = { id: 7530477593, first_name: 'Boss' };
  await findAction('admin_broadcast').fn(mkCtx({ from: adminCtxFrom, callbackQuery: { data: 'admin_broadcast' } }));
  const r8a = last(CALLS.replies) || '';
  check('prompt for message', r8a.includes('Enter broadcast message'), r8a.slice(0, 60));
  reset();
  await textHandler()(mkCtx({ from: adminCtxFrom, message: { text: '<b>Hello</b> all' } }));
  const r8b = last(CALLS.replies) || '';
  check('queued reply', r8b.includes('Broadcast queued'), r8b.slice(0, 60));
  check('broadcast() called with HTML', CALLS.broadcasts.length === 1 && CALLS.broadcasts[0].parseMode === 'HTML' && CALLS.broadcasts[0].text === '<b>Hello</b> all');

  console.log('\n[9] /broadcast command');
  reset();
  await findCmd('broadcast').fn(mkCtx({ from: adminCtxFrom, message: { text: '/broadcast direct msg' } }));
  check('direct broadcast queued', CALLS.broadcasts.length === 1 && CALLS.broadcasts[0].text === 'direct msg');

  console.log('\n[10] /stats + admin_stats + admin_users + admin_withdrawals');
  reset();
  await findCmd('stats').fn(mkCtx({ from: adminCtxFrom, message: { text: '/stats' } }));
  const r10a = last(CALLS.replies) || '';
  check('stats reply', r10a.includes('Total Users: 150') && r10a.includes('Pending Withdrawals: 3'), r10a.slice(0, 120));
  await findAction('admin_users').fn(mkCtx({ from: adminCtxFrom, callbackQuery: { data: 'admin_users' } }));
  check('admin_users list', (last(CALLS.edits) || '').includes('Recent Users'));
  reset();
  await findAction('admin_withdrawals').fn(mkCtx({ from: adminCtxFrom, callbackQuery: { data: 'admin_withdrawals' } }));
  check('withdrawals empty msg', (last(CALLS.edits) || '').includes('No pending withdrawals'));

  console.log('\n[11] menu callbacks');
  reset();
  await findAction('main_menu').fn(mkCtx({ callbackQuery: { data: 'main_menu' } }));
  check('main_menu edit', (last(CALLS.edits) || '').includes('Main Menu'));
  reset();
  await findAction('check_balance').fn(mkCtx({ callbackQuery: { data: 'check_balance' } }));
  check('check_balance edit', (last(CALLS.edits) || '').includes('Your Balance'));
  reset();
  await findAction('referral_info').fn(mkCtx({ callbackQuery: { data: 'referral_info' } }));
  const r11 = last(CALLS.edits) || '';
  check('referral link with real bot username', r11.includes('t.me/Income_KoroBot?start=ref_TESTCODE1'), r11.slice(0, 120));

  console.log('\n[12] plain text with no flow → ignored');
  reset();
  await textHandler()(mkCtx({ from: { id: 999, first_name: 'Nope' }, message: { text: 'hello bot' } }));
  check('no reply', CALLS.replies.length === 0);

  console.log('\n[13] platform safety: no Prefer / no manual Content-Type headers');
  check('no Prefer header anywhere', !CALLS.axios.some((c) => JSON.stringify(c[2] || {}).includes('Prefer') && c[2] && c[2].headers && c[2].headers.Prefer));
  check('no Prefer in any axios config', !CALLS.axios.some((c) => JSON.stringify(c).includes("'Prefer'") || JSON.stringify(c).includes('"Prefer"')));
  check('no manual Content-Type', !CALLS.axios.some((c) => c[2] && c[2].headers && c[2].headers['Content-Type']));
  check('no Markup used', !require('fs').readFileSync(require('path').join(__dirname, 'nxbot.js'), 'utf8').includes('Markup.'));
  const badUrls = CALLS.axios.filter((c) => (c[1].split('?').length - 1) > 1);
  check('all axios URLs have single ?', badUrls.length === 0, JSON.stringify(badUrls).slice(0, 140));

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : '\n💥 FAILURES: ' + failures);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
