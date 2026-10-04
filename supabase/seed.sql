-- RushOnCash - Seed Data
-- Run after migrations

-- Insert default app configs if not exists
INSERT INTO app_config (key, value, description) VALUES
('coinflip_config', '{"winReward": 0.05, "lossReward": 0, "dailyLimit": 20}', 'CoinFlip game configuration'),
('spin_config', '{"dailyLimit": 10, "segments": [{"reward": 0.10, "probability": 10, "label": "৳0.10", "color": "#22c55e"}, {"reward": 0.05, "probability": 20, "label": "৳0.05", "color": "#3b82f6"}, {"reward": 0.02, "probability": 30, "label": "৳0.02", "color": "#f59e0b"}, {"reward": 0, "probability": 40, "label": "Try Again", "color": "#6b7280"}]}', 'Spin Wheel configuration'),
('withdraw_config', '{"minAmount": 100, "maxAmount": 10000, "requiredReferrals": 5, "cooldownHours": 24, "methods": [{"name": "bkash", "minAmount": 100, "enabled": true}, {"name": "nagad", "minAmount": 100, "enabled": true}, {"name": "rocket", "minAmount": 100, "enabled": true}, {"name": "binance", "minAmount": 5, "enabled": true}]}', 'Withdrawal configuration'),
('ad_config', '{"enabled": true, "monetagEnabled": true, "gigapubEnabled": true, "adsgramEnabled": true, "adsgramBlockId": "", "monetagZoneId": "", "gigapubScripts": [], "rewardPerAd": 0.05, "dailyAdLimit": 10, "enforceWatchSeconds": true, "watchSeconds": 10}', 'Advertisement configuration'),
('task_config', '{"channelJoinReward": 1, "youtubeSubReward": 2, "facebookFollowReward": 1, "dailyLoginReward": 0.5, "channelUsername": "", "youtubeChannelUrl": "", "facebookPageUrl": ""}', 'Task rewards configuration'),
('bot_config', '{"botUsername": "", "adminIds": [], "withdrawGroupId": "", "maintenanceMode": false}', 'Bot configuration')
ON CONFLICT (key) DO NOTHING;

-- Create admin user (replace with actual admin telegram_id)
-- INSERT INTO users (telegram_id, username, first_name, last_name, balance, total_earned, referral_code, is_bot_verified)
-- VALUES ('YOUR_ADMIN_TELEGRAM_ID', 'admin', 'Admin', 'User', 0, 0, 'ADMIN001', true)
-- ON CONFLICT (telegram_id) DO NOTHING;