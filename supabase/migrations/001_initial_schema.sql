-- RushOnCash - Supabase Schema (v2: hardened RPC + RLS)
-- Mirrors the live database state. Run in Supabase SQL Editor (idempotent).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    photo_url TEXT,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    total_earned NUMERIC(12, 2) DEFAULT 0.00,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES users(id),
    referral_count INTEGER DEFAULT 0,
    daily_ads_watched INTEGER DEFAULT 0,
    daily_ads_limit INTEGER DEFAULT 10,
    last_ad_date DATE DEFAULT CURRENT_DATE,
    coinflip_played INTEGER DEFAULT 0,
    coinflip_won INTEGER DEFAULT 0,
    spin_played INTEGER DEFAULT 0,
    spin_won INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    is_bot_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================
-- GAMES LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS games_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL CHECK (game_type IN ('coinflip', 'spin')),
    bet_amount NUMERIC(12, 2) DEFAULT 0,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    reward NUMERIC(12, 2) DEFAULT 0,
    server_seed TEXT,
    client_seed TEXT,
    nonce INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_log_user_id ON games_log(user_id);
CREATE INDEX IF NOT EXISTS idx_games_log_created_at ON games_log(created_at);
CREATE INDEX IF NOT EXISTS idx_games_log_game_type ON games_log(game_type);

-- ============================================
-- WITHDRAWALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('bkash', 'nagad', 'rocket', 'binance')),
    account_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_note TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('channel_join', 'youtube_sub', 'facebook_follow', 'daily_login')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'claimed')),
    reward NUMERIC(12, 2) DEFAULT 0,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique ON referrals(referrer_id, referred_id);

-- ============================================
-- ADS LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ads_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('monetag', 'gigapub', 'adsgram')),
    reward NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_log_user_id ON ads_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_log_provider ON ads_log(provider);
CREATE INDEX IF NOT EXISTS idx_ads_log_created_at ON ads_log(created_at);

-- ============================================
-- APP CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
('coinflip_config', '{"winReward": 0.05, "lossReward": 0, "dailyLimit": 20}', 'CoinFlip game configuration'),
('spin_config', '{"dailyLimit": 10, "segments": [{"reward": 0.10, "probability": 10, "label": "৳0.10", "color": "#22c55e"}, {"reward": 0.05, "probability": 20, "label": "৳0.05", "color": "#3b82f6"}, {"reward": 0.02, "probability": 30, "label": "৳0.02", "color": "#f59e0b"}, {"reward": 0, "probability": 40, "label": "Try Again", "color": "#6b7280"}]}', 'Spin Wheel configuration'),
('withdraw_config', '{"minAmount": 100, "maxAmount": 10000, "requiredReferrals": 5, "cooldownHours": 24, "methods": [{"name": "bkash", "minAmount": 100, "enabled": true}, {"name": "nagad", "minAmount": 100, "enabled": true}, {"name": "rocket", "minAmount": 100, "enabled": true}, {"name": "binance", "minAmount": 5, "enabled": true}]}', 'Withdrawal configuration'),
('ad_config', '{"enabled": true, "monetagEnabled": true, "gigapubEnabled": true, "adsgramEnabled": true, "adsgramBlockId": "", "monetagZoneId": "", "gigapubScripts": [], "rewardPerAd": 0.05, "dailyAdLimit": 10, "enforceWatchSeconds": true, "watchSeconds": 10}', 'Advertisement configuration'),
('task_config', '{"channelJoinReward": 1, "youtubeSubReward": 2, "facebookFollowReward": 1, "dailyLoginReward": 0.5, "channelUsername": "", "youtubeChannelUrl": "", "facebookPageUrl": ""}', 'Task rewards configuration'),
('bot_config', '{"botUsername": "", "adminIds": [], "adminEmails": [], "withdrawGroupId": "", "maintenanceMode": false, "referralBonus": 1}', 'Bot configuration')
ON CONFLICT (key) DO NOTHING;

-- Merge new bot_config fields into rows created by older versions
UPDATE app_config SET value = value || '{"adminEmails": []}'::jsonb
WHERE key = 'bot_config' AND NOT (value ? 'adminEmails');
UPDATE app_config SET value = value || '{"referralBonus": 1}'::jsonb
WHERE key = 'bot_config' AND NOT (value ? 'referralBonus');

-- is_admin: jwt email must be listed in bot_config.adminEmails
-- SECURITY INVOKER: RLS policies call it for anon too; invoker reads the
-- publicly-readable app_config, so no definer warning and no extra grants.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_config
    WHERE key = 'bot_config'
      AND (value->'adminEmails') ? (auth.jwt()->>'email')
  )
$$;

-- ============================================
-- ADMIN LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY POLICIES (v2)
-- users.id IS the Supabase Auth uid (enforced by sync_telegram_user).
-- Clients have NO direct write policies: all writes go through
-- SECURITY DEFINER RPCs (service/authenticated execute) or admin policies.
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Drop all old/variant policies (idempotent rerun)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own balance" ON users;
DROP POLICY IF EXISTS "Users can view own games" ON games_log;
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view own ads" ON ads_log;
DROP POLICY IF EXISTS "Public can read config" ON app_config;
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_admin_all ON users;
DROP POLICY IF EXISTS games_select_own ON games_log;
DROP POLICY IF EXISTS games_insert_own ON games_log;
DROP POLICY IF EXISTS games_admin_all ON games_log;
DROP POLICY IF EXISTS withdrawals_select_own ON withdrawals;
DROP POLICY IF EXISTS withdrawals_insert_own ON withdrawals;
DROP POLICY IF EXISTS withdrawals_admin_all ON withdrawals;
DROP POLICY IF EXISTS tasks_select_own ON tasks;
DROP POLICY IF EXISTS tasks_insert_own ON tasks;
DROP POLICY IF EXISTS tasks_update_own ON tasks;
DROP POLICY IF EXISTS tasks_admin_all ON tasks;
DROP POLICY IF EXISTS referrals_select_own ON referrals;
DROP POLICY IF EXISTS referrals_insert_own ON referrals;
DROP POLICY IF EXISTS referrals_admin_all ON referrals;
DROP POLICY IF EXISTS ads_select_own ON ads_log;
DROP POLICY IF EXISTS ads_insert_own ON ads_log;
DROP POLICY IF EXISTS ads_admin_all ON ads_log;
DROP POLICY IF EXISTS config_public_read ON app_config;
DROP POLICY IF EXISTS config_admin_write ON app_config;
DROP POLICY IF EXISTS adminlogs_admin_all ON admin_logs;

-- Users: own-row read only (no client UPDATE: balance integrity)
CREATE POLICY users_select_own ON users
    FOR SELECT USING (id = auth.uid());
CREATE POLICY users_admin_all ON users
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Games log: own-row read; writes only via RPC/admin
CREATE POLICY games_select_own ON games_log
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY games_admin_all ON games_log
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Withdrawals: own-row read; request via process_withdrawal RPC only
CREATE POLICY withdrawals_select_own ON withdrawals
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY withdrawals_admin_all ON withdrawals
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Tasks: own-row read; completion/claim via server only
CREATE POLICY tasks_select_own ON tasks
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tasks_admin_all ON tasks
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Referrals: own visibility (either side); rows created by sync RPC
CREATE POLICY referrals_select_own ON referrals
    FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY referrals_admin_all ON referrals
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Ads log: own-row read; rows created by claim_ad_reward RPC
CREATE POLICY ads_select_own ON ads_log
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ads_admin_all ON ads_log
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- App config: public read, admin write (is_admin = adminEmails contains jwt email)
CREATE POLICY config_public_read ON app_config
    FOR SELECT USING (true);
CREATE POLICY config_admin_write ON app_config
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Admin logs: admin only
CREATE POLICY adminlogs_admin_all ON admin_logs
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- HELPER FUNCTIONS (hardened)
-- Ownership: when a JWT is present, user_id must equal auth.uid();
-- service_role (auth.uid() IS NULL) is trusted.
-- Rewards/limits are ALWAYS derived from app_config (client params ignored).
-- ============================================

-- Claim ad reward
CREATE OR REPLACE FUNCTION claim_ad_reward(user_id UUID, provider TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB;
    v_reward NUMERIC;
    v_limit INTEGER;
    v_banned BOOLEAN;
    new_balance NUMERIC;
    new_ads_watched INTEGER;
    new_daily_limit INTEGER;
BEGIN
    IF user_id IS NULL OR (auth.uid() IS NOT NULL AND user_id <> auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;

    SELECT is_banned INTO v_banned FROM users WHERE id = user_id;
    IF v_banned IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;
    IF v_banned THEN
        RETURN jsonb_build_object('success', false, 'error', 'account_banned');
    END IF;

    SELECT value INTO v_cfg FROM app_config WHERE key = 'ad_config';
    IF NOT COALESCE((v_cfg->>'enabled')::BOOLEAN, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ads_disabled');
    END IF;
    v_reward := COALESCE((v_cfg->>'rewardPerAd')::NUMERIC, 0.05);
    v_limit := COALESCE((v_cfg->>'dailyAdLimit')::INTEGER, 10);

    UPDATE users
    SET daily_ads_watched = CASE WHEN last_ad_date = CURRENT_DATE THEN daily_ads_watched + 1 ELSE 1 END,
        daily_ads_limit = v_limit,
        last_ad_date = CURRENT_DATE,
        balance = balance + v_reward,
        total_earned = total_earned + v_reward,
        updated_at = NOW()
    WHERE id = user_id
      AND (last_ad_date IS DISTINCT FROM CURRENT_DATE OR daily_ads_watched < v_limit)
    RETURNING balance, daily_ads_watched, daily_ads_limit
    INTO new_balance, new_ads_watched, new_daily_limit;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached', 'dailyAdLimit', v_limit);
    END IF;

    INSERT INTO ads_log (user_id, provider, reward, status)
    VALUES (user_id, provider, v_reward, 'completed');

    RETURN jsonb_build_object(
        'success', true,
        'balance', new_balance,
        'adsWatched', new_ads_watched,
        'dailyAdLimit', new_daily_limit,
        'reward', v_reward
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Claim game reward (coinflip reward from config; spin reward must match a
-- configured segment; daily limits counted from games_log)
CREATE OR REPLACE FUNCTION claim_game_reward(user_id UUID, game_type TEXT, result TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB;
    v_daily INTEGER;
    v_reward NUMERIC := 0;
    v_banned BOOLEAN;
    v_today INTEGER;
    new_balance NUMERIC;
    new_won INTEGER;
    new_played INTEGER;
BEGIN
    IF user_id IS NULL OR (auth.uid() IS NOT NULL AND user_id <> auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;
    IF game_type NOT IN ('coinflip', 'spin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_game');
    END IF;
    IF result NOT IN ('win', 'loss') THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_result');
    END IF;

    SELECT is_banned INTO v_banned FROM users WHERE id = user_id;
    IF v_banned IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;
    IF v_banned THEN
        RETURN jsonb_build_object('success', false, 'error', 'account_banned');
    END IF;

    IF game_type = 'coinflip' THEN
        SELECT value INTO v_cfg FROM app_config WHERE key = 'coinflip_config';
        v_daily := COALESCE((v_cfg->>'dailyLimit')::INTEGER, 20);
        v_reward := CASE
            WHEN result = 'win' THEN COALESCE((v_cfg->>'winReward')::NUMERIC, 0.05)
            ELSE COALESCE((v_cfg->>'lossReward')::NUMERIC, 0)
        END;
    ELSE
        SELECT value INTO v_cfg FROM app_config WHERE key = 'spin_config';
        v_daily := COALESCE((v_cfg->>'dailyLimit')::INTEGER, 10);
        v_reward := CASE WHEN result = 'win' THEN COALESCE(reward, 0) ELSE 0 END;
        IF result = 'win' AND v_reward > 0
           AND NOT EXISTS (
               SELECT 1 FROM jsonb_array_elements(COALESCE(v_cfg->'segments', '[]'::jsonb)) s
               WHERE ABS((s->>'reward')::NUMERIC - v_reward) < 0.0001
           ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'invalid_reward');
        END IF;
    END IF;

    SELECT count(*) INTO v_today
    FROM games_log
    WHERE games_log.user_id = claim_game_reward.user_id
      AND games_log.game_type = claim_game_reward.game_type
      AND games_log.created_at >= CURRENT_DATE;
    IF v_today >= v_daily THEN
        RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached', 'dailyLimit', v_daily);
    END IF;

    IF game_type = 'coinflip' THEN
        IF result = 'win' THEN
            UPDATE users SET balance = balance + v_reward, total_earned = total_earned + v_reward,
                coinflip_won = coinflip_won + 1, coinflip_played = coinflip_played + 1, updated_at = NOW()
            WHERE id = user_id RETURNING balance, coinflip_won, coinflip_played
            INTO new_balance, new_won, new_played;
        ELSE
            UPDATE users SET coinflip_played = coinflip_played + 1, updated_at = NOW()
            WHERE id = user_id RETURNING balance, coinflip_won, coinflip_played
            INTO new_balance, new_won, new_played;
        END IF;
    ELSE
        IF result = 'win' THEN
            UPDATE users SET balance = balance + v_reward, total_earned = total_earned + v_reward,
                spin_won = spin_won + 1, spin_played = spin_played + 1, updated_at = NOW()
            WHERE id = user_id RETURNING balance, spin_won, spin_played
            INTO new_balance, new_won, new_played;
        ELSE
            UPDATE users SET spin_played = spin_played + 1, updated_at = NOW()
            WHERE id = user_id RETURNING balance, spin_won, spin_played
            INTO new_balance, new_won, new_played;
        END IF;
    END IF;

    INSERT INTO games_log (user_id, game_type, bet_amount, result, reward)
    VALUES (user_id, game_type, 0, result, v_reward);

    RETURN jsonb_build_object('success', true, 'balance', new_balance, 'reward', v_reward);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Process withdrawal (config-driven, atomic balance deduction, cooldown)
CREATE OR REPLACE FUNCTION process_withdrawal(user_id UUID, amount NUMERIC, method TEXT, account_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB;
    v_min NUMERIC;
    v_max NUMERIC;
    v_req INTEGER;
    v_cooldown INTEGER;
    v_method_min NUMERIC := 0;
    v_method_enabled BOOLEAN := false;
    v_banned BOOLEAN;
    v_balance NUMERIC;
    v_refs INTEGER;
    v_last TIMESTAMPTZ;
    withdrawal_id UUID;
    m JSONB;
BEGIN
    IF user_id IS NULL OR (auth.uid() IS NOT NULL AND user_id <> auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;
    IF amount IS NULL OR amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
    END IF;
    IF account_number IS NULL OR length(trim(account_number)) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_account');
    END IF;

    SELECT balance, referral_count, is_banned
    INTO v_balance, v_refs, v_banned
    FROM users WHERE id = user_id;
    IF v_banned IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;
    IF v_banned THEN
        RETURN jsonb_build_object('success', false, 'error', 'account_banned');
    END IF;

    SELECT value INTO v_cfg FROM app_config WHERE key = 'withdraw_config';
    v_min := COALESCE((v_cfg->>'minAmount')::NUMERIC, 100);
    v_max := COALESCE((v_cfg->>'maxAmount')::NUMERIC, 10000);
    v_req := COALESCE((v_cfg->>'requiredReferrals')::INTEGER, 5);
    v_cooldown := COALESCE((v_cfg->>'cooldownHours')::INTEGER, 24);

    SELECT elem INTO m FROM jsonb_array_elements(COALESCE(v_cfg->'methods', '[]'::jsonb)) elem
    WHERE elem->>'name' = method;
    IF m IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_method');
    END IF;
    v_method_enabled := COALESCE((m->>'enabled')::BOOLEAN, false);
    v_method_min := COALESCE((m->>'minAmount')::NUMERIC, 0);
    IF NOT v_method_enabled THEN
        RETURN jsonb_build_object('success', false, 'error', 'method_disabled');
    END IF;

    IF amount < v_min THEN
        RETURN jsonb_build_object('success', false, 'error', 'min_amount', 'min', v_min);
    END IF;
    IF amount > v_max THEN
        RETURN jsonb_build_object('success', false, 'error', 'max_amount', 'max', v_max);
    END IF;
    IF amount < v_method_min THEN
        RETURN jsonb_build_object('success', false, 'error', 'method_min_amount', 'min', v_method_min);
    END IF;
    IF v_balance < amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
    END IF;
    IF v_refs < v_req THEN
        RETURN jsonb_build_object('success', false, 'error', 'referrals_required', 'required', v_req, 'current', v_refs);
    END IF;

    SELECT max(created_at) INTO v_last
    FROM withdrawals
    WHERE withdrawals.user_id = process_withdrawal.user_id
      AND status IN ('pending', 'approved');
    IF v_last IS NOT NULL AND v_last > NOW() - make_interval(hours => v_cooldown) THEN
        RETURN jsonb_build_object('success', false, 'error', 'cooldown_active',
            'retry_at', v_last + make_interval(hours => v_cooldown));
    END IF;

    -- Atomic: deduct first, only if balance still covers the amount
    UPDATE users SET balance = balance - amount, updated_at = NOW()
    WHERE id = user_id AND balance >= amount;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
    END IF;

    INSERT INTO withdrawals (user_id, amount, method, account_number, status)
    VALUES (user_id, amount, method, account_number, 'pending')
    RETURNING id INTO withdrawal_id;

    RETURN jsonb_build_object('success', true, 'order_id', withdrawal_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Claim task reward (reward from task_config by canonical task_type;
-- requires a 'completed' row; marks exactly that row claimed)
CREATE OR REPLACE FUNCTION claim_task_reward(user_id UUID, task_type TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB;
    v_key TEXT;
    v_reward NUMERIC;
    v_banned BOOLEAN;
    v_row UUID;
    new_balance NUMERIC;
BEGIN
    IF user_id IS NULL OR (auth.uid() IS NOT NULL AND user_id <> auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;

    v_key := CASE claim_task_reward.task_type
        WHEN 'channel_join' THEN 'channelJoinReward'
        WHEN 'youtube_sub' THEN 'youtubeSubReward'
        WHEN 'facebook_follow' THEN 'facebookFollowReward'
        WHEN 'daily_login' THEN 'dailyLoginReward'
        ELSE NULL
    END;
    IF v_key IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_task');
    END IF;

    SELECT is_banned INTO v_banned FROM users WHERE id = user_id;
    IF v_banned IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;
    IF v_banned THEN
        RETURN jsonb_build_object('success', false, 'error', 'account_banned');
    END IF;

    SELECT value INTO v_cfg FROM app_config WHERE key = 'task_config';
    v_reward := COALESCE((v_cfg->>v_key)::NUMERIC, 0);

    -- Atomically transition exactly this user's completed row of this type
    UPDATE tasks SET status = 'claimed', claimed_at = NOW()
    WHERE tasks.user_id = claim_task_reward.user_id
      AND tasks.task_type = claim_task_reward.task_type
      AND tasks.status = 'completed'
    RETURNING tasks.id INTO v_row;
    IF v_row IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'task_not_completed');
    END IF;

    UPDATE users SET balance = balance + v_reward, total_earned = total_earned + v_reward, updated_at = NOW()
    WHERE id = user_id RETURNING balance INTO new_balance;

    RETURN jsonb_build_object('success', true, 'balance', new_balance, 'reward', v_reward);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Claim referral bonus (once per referral; amount from bot_config.referralBonus)
CREATE OR REPLACE FUNCTION claim_referral_bonus(referrer_id UUID, referred_id UUID, bonus NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB;
    v_bonus NUMERIC;
    v_row UUID;
    new_balance NUMERIC;
BEGIN
    IF referrer_id IS NULL OR referred_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_referral');
    END IF;
    IF auth.uid() IS NOT NULL AND referrer_id <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;
    IF referrer_id = referred_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'self_referral');
    END IF;

    SELECT value INTO v_cfg FROM app_config WHERE key = 'bot_config';
    v_bonus := COALESCE((v_cfg->>'referralBonus')::NUMERIC, 1);

    -- Only unpaid referral rows; column refs qualified to avoid param shadowing
    UPDATE referrals SET bonus_paid = TRUE
    WHERE referrals.referrer_id = claim_referral_bonus.referrer_id
      AND referrals.referred_id = claim_referral_bonus.referred_id
      AND referrals.bonus_paid = FALSE
    RETURNING referrals.id INTO v_row;
    IF v_row IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_paid_or_not_found');
    END IF;

    UPDATE users SET balance = balance + v_bonus, total_earned = total_earned + v_bonus, updated_at = NOW()
    WHERE id = referrer_id RETURNING balance INTO new_balance;

    RETURN jsonb_build_object('success', true, 'balance', new_balance, 'bonus', v_bonus);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- sync_telegram_user: service_role-only. Aligns users.id with Supabase Auth
-- uid, creates the row on first login, links referral + pays referral bonus.
CREATE OR REPLACE FUNCTION sync_telegram_user(
    p_telegram_id TEXT,
    p_auth_id UUID,
    p_username TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_photo_url TEXT,
    p_referrer_auth_id UUID DEFAULT NULL
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r users;
  v_code TEXT;
  v_attempt INT := 0;
  v_bonus NUMERIC := 1;
BEGIN
  SELECT * INTO r FROM users WHERE telegram_id = p_telegram_id FOR UPDATE;

  IF FOUND THEN
    IF r.id <> p_auth_id THEN
      UPDATE users SET referred_by = p_auth_id WHERE referred_by = r.id;
      UPDATE referrals SET referrer_id = p_auth_id WHERE referrer_id = r.id;
      UPDATE referrals SET referred_id = p_auth_id WHERE referred_id = r.id;
      UPDATE games_log SET user_id = p_auth_id WHERE user_id = r.id;
      UPDATE withdrawals SET user_id = p_auth_id WHERE user_id = r.id;
      UPDATE tasks SET user_id = p_auth_id WHERE user_id = r.id;
      UPDATE ads_log SET user_id = p_auth_id WHERE user_id = r.id;
      UPDATE admin_logs SET admin_id = p_auth_id WHERE admin_id = r.id;
      UPDATE users SET id = p_auth_id WHERE id = r.id;
      SELECT * INTO r FROM users WHERE id = p_auth_id;
    END IF;
    UPDATE users
    SET username = p_username, first_name = p_first_name,
        last_name = p_last_name, photo_url = p_photo_url
    WHERE id = r.id
    RETURNING * INTO r;
  ELSE
    LOOP
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_code);
      v_attempt := v_attempt + 1;
      IF v_attempt > 10 THEN
        RAISE EXCEPTION 'referral_code generation failed';
      END IF;
    END LOOP;

    SELECT COALESCE((value->>'referralBonus')::NUMERIC, 1) INTO v_bonus
    FROM app_config WHERE key = 'bot_config';

    INSERT INTO users (id, telegram_id, username, first_name, last_name, photo_url,
                       referral_code, referred_by)
    VALUES (p_auth_id, p_telegram_id, p_username, p_first_name, p_last_name, p_photo_url,
            v_code, CASE WHEN p_referrer_auth_id IS DISTINCT FROM p_auth_id THEN p_referrer_auth_id END)
    RETURNING * INTO r;

    IF p_referrer_auth_id IS NOT NULL AND p_referrer_auth_id <> p_auth_id THEN
      INSERT INTO referrals (referrer_id, referred_id, bonus_paid)
      VALUES (p_referrer_auth_id, p_auth_id, TRUE)
      ON CONFLICT DO NOTHING;
      UPDATE users
      SET referral_count = referral_count + 1,
          balance = balance + v_bonus,
          total_earned = total_earned + v_bonus,
          updated_at = NOW()
      WHERE id = p_referrer_auth_id;
    END IF;
  END IF;

  RETURN r;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Event trigger: enable RLS automatically on new public tables
CREATE OR REPLACE FUNCTION rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL AND cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed on %: %', cmd.object_identity, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION rls_auto_enable();

-- ============================================
-- PUBLIC LEADERBOARD VIEW
-- NOTE: intentionally owner-executed (non security_invoker) so anonymous
-- visitors can read the curated columns; underlying users table stays
-- locked down by its own policies/grants. Accepted linter finding 0010.
-- ============================================
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT id, first_name, last_name, username, photo_url,
       referral_count, coinflip_won, spin_won, total_earned
FROM users
WHERE is_banned = false;

-- ============================================
-- TABLE PRIVILEGES
-- anon: read-only (RLS limits rows). authenticated: read + row-gated
-- writes for the admin panel. service_role: full data access (bypasses RLS).
-- No client-facing write policies exist; RPCs run as owner.
-- ============================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
REVOKE TRUNCATE, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON leaderboard_view TO anon, authenticated, service_role;

-- Future tables: same shape (no TRUNCATE/REFERENCES for API roles)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES ON TABLES FROM anon, authenticated;

-- ============================================
-- FUNCTION EXECUTE PRIVILEGES
-- ============================================
REVOKE EXECUTE ON FUNCTION claim_ad_reward(UUID, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_game_reward(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_withdrawal(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_task_reward(UUID, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_referral_bonus(UUID, UUID, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sync_telegram_user(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION claim_ad_reward(UUID, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION claim_game_reward(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_withdrawal(UUID, NUMERIC, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION claim_task_reward(UUID, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION claim_referral_bonus(UUID, UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_telegram_user(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
-- is_admin is SECURITY INVOKER and referenced by RLS policies evaluated for
-- every role (including anon), so it must stay executable by everyone.
GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;
