-- RushOnCash - Supabase Schema
-- Run these migrations in order via Supabase Dashboard > SQL Editor

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

-- Indexes for users
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

-- Insert default configs
INSERT INTO app_config (key, value, description) VALUES
('coinflip_config', '{"winReward": 0.05, "lossReward": 0, "dailyLimit": 20}', 'CoinFlip game configuration'),
('spin_config', '{"dailyLimit": 10, "segments": [{"reward": 0.10, "probability": 10, "label": "৳0.10", "color": "#22c55e"}, {"reward": 0.05, "probability": 20, "label": "৳0.05", "color": "#3b82f6"}, {"reward": 0.02, "probability": 30, "label": "৳0.02", "color": "#f59e0b"}, {"reward": 0, "probability": 40, "label": "Try Again", "color": "#6b7280"}]}', 'Spin Wheel configuration'),
('withdraw_config', '{"minAmount": 100, "maxAmount": 10000, "requiredReferrals": 5, "cooldownHours": 24, "methods": [{"name": "bkash", "minAmount": 100, "enabled": true}, {"name": "nagad", "minAmount": 100, "enabled": true}, {"name": "rocket", "minAmount": 100, "enabled": true}, {"name": "binance", "minAmount": 5, "enabled": true}]}', 'Withdrawal configuration'),
('ad_config', '{"enabled": true, "monetagEnabled": true, "gigapubEnabled": true, "adsgramEnabled": true, "adsgramBlockId": "", "monetagZoneId": "", "gigapubScripts": [], "rewardPerAd": 0.05, "dailyAdLimit": 10, "enforceWatchSeconds": true, "watchSeconds": 10}', 'Advertisement configuration'),
('task_config', '{"channelJoinReward": 1, "youtubeSubReward": 2, "facebookFollowReward": 1, "dailyLoginReward": 0.5, "channelUsername": "", "youtubeChannelUrl": "", "facebookPageUrl": ""}', 'Task rewards configuration'),
('bot_config', '{"botUsername": "", "adminIds": [], "withdrawGroupId": "", "maintenanceMode": false}', 'Bot configuration')
ON CONFLICT (key) DO NOTHING;

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
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = telegram_id);

-- Users can update their own balance (via RPC)
CREATE POLICY "Users can update own balance" ON users
    FOR UPDATE USING (auth.uid()::text = telegram_id);

-- Games log - users can view their own
CREATE POLICY "Users can view own games" ON games_log
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text));

-- Withdrawals - users can view their own
CREATE POLICY "Users can view own withdrawals" ON withdrawals
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text));

-- Tasks - users can view their own
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text));

-- Referrals - users can view their own
CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (referrer_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text) 
                     OR referred_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text));

-- Ads log - users can view their own
CREATE POLICY "Users can view own ads" ON ads_log
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text));

-- App config - public read
CREATE POLICY "Public can read config" ON app_config
    FOR SELECT USING (true);

-- Admin logs - only admins can view
CREATE POLICY "Admins can view logs" ON admin_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE telegram_id = auth.uid()::text AND id IN (SELECT jsonb_array_elements_text(value::jsonb) FROM app_config WHERE key = 'bot_config'))
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to claim ad reward
CREATE OR REPLACE FUNCTION claim_ad_reward(user_id UUID, provider TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance NUMERIC;
    new_ads_watched INTEGER;
    new_daily_limit INTEGER;
BEGIN
    UPDATE users
    SET balance = balance + reward,
        total_earned = total_earned + reward,
        ads_watched = ads_watched + 1,
        daily_ads_watched = daily_ads_watched + 1,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING balance, daily_ads_watched, daily_ads_limit INTO new_balance, new_ads_watched, new_daily_limit;

    INSERT INTO ads_log (user_id, provider, reward, status)
    VALUES (user_id, provider, reward, 'completed');

    RETURN jsonb_build_object(
        'success', true,
        'balance', new_balance,
        'adsWatched', new_ads_watched,
        'dailyAdLimit', new_daily_limit
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function to claim game reward
CREATE OR REPLACE FUNCTION claim_game_reward(user_id UUID, game_type TEXT, result TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance NUMERIC;
    new_won INTEGER;
    new_played INTEGER;
BEGIN
    IF result = 'win' THEN
        IF game_type = 'coinflip' THEN
            UPDATE users SET balance = balance + reward, total_earned = total_earned + reward, coinflip_won = coinflip_won + 1, coinflip_played = coinflip_played + 1, updated_at = NOW() WHERE id = user_id RETURNING balance, coinflip_won, coinflip_played INTO new_balance, new_won, new_played;
        ELSE
            UPDATE users SET balance = balance + reward, total_earned = total_earned + reward, spin_won = spin_won + 1, spin_played = spin_played + 1, updated_at = NOW() WHERE id = user_id RETURNING balance, spin_won, spin_played INTO new_balance, new_won, new_played;
        END IF;
    ELSE
        IF game_type = 'coinflip' THEN
            UPDATE users SET coinflip_played = coinflip_played + 1, updated_at = NOW() WHERE id = user_id RETURNING balance, coinflip_won, coinflip_played INTO new_balance, new_won, new_played;
        ELSE
            UPDATE users SET spin_played = spin_played + 1, updated_at = NOW() WHERE id = user_id RETURNING balance, spin_won, spin_played INTO new_balance, new_won, new_played;
        END IF;
    END IF;

    INSERT INTO games_log (user_id, game_type, result, reward)
    VALUES (user_id, game_type, result, reward);

    RETURN jsonb_build_object('success', true, 'balance', new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function to process withdrawal
CREATE OR REPLACE FUNCTION process_withdrawal(user_id UUID, amount NUMERIC, method TEXT, account_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_balance NUMERIC;
    user_referrals INTEGER;
    required_referrals INTEGER := 5;
    min_amount NUMERIC := 100;
    withdrawal_id UUID;
BEGIN
    SELECT balance, referral_count INTO user_balance, user_referrals FROM users WHERE id = user_id;
    
    IF user_balance < amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
    END IF;
    
    IF user_referrals < required_referrals THEN
        RETURN jsonb_build_object('success', false, 'error', 'referrals_required', 'required', required_referrals, 'current', user_referrals);
    END IF;
    
    IF amount < min_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'min_amount', 'min', min_amount);
    END IF;

    INSERT INTO withdrawals (user_id, amount, method, account_number, status)
    VALUES (user_id, amount, method, account_number, 'pending')
    RETURNING id INTO withdrawal_id;

    UPDATE users SET balance = balance - amount, updated_at = NOW() WHERE id = user_id;

    RETURN jsonb_build_object('success', true, 'order_id', withdrawal_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function to claim task reward
CREATE OR REPLACE FUNCTION claim_task_reward(user_id UUID, task_type TEXT, reward NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    UPDATE users SET balance = balance + reward, total_earned = total_earned + reward, updated_at = NOW() WHERE id = user_id RETURNING balance INTO new_balance;

    UPDATE tasks SET status = 'claimed', claimed_at = NOW() WHERE user_id = user_id AND task_type = task_type AND status = 'completed';

    RETURN jsonb_build_object('success', true, 'balance', new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function to claim referral bonus
CREATE OR REPLACE FUNCTION claim_referral_bonus(referrer_id UUID, referred_id UUID, bonus NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    UPDATE users SET balance = balance + bonus, total_earned = total_earned + bonus, updated_at = NOW() WHERE id = referrer_id RETURNING balance INTO new_balance;

    UPDATE referrals SET bonus_paid = TRUE WHERE referrer_id = referrer_id AND referred_id = referred_id;

    RETURN jsonb_build_object('success', true, 'balance', new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();