import { Link } from 'react-router-dom';
import { Wallet, Gamepad2, ListChecks, Gift, Star, TrendingUp, ExternalLink, ArrowRight, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTelegram } from '../context/TelegramContext';
import { cn, formatCurrency } from '../utils/cn';
import { BalanceCard } from '../components/BalanceCard';
import { StatCard } from '../components/StatCard';
import { QuickAction } from '../components/QuickAction';
import { DailyProgress } from '../components/DailyProgress';
import { ReferralCard } from '../components/ReferralCard';

export function Home() {
  const { user, updateBalance, isBotVerified } = useAuth();
  const { config } = useConfig();
  const { webApp, hapticFeedback } = useTelegram();

  const balance = user?.balance || 0;
  const referralCount = user?.referral_count || 0;
  const dailyAdsWatched = user?.daily_ads_watched || 0;
  const dailyAdsLimit = user?.daily_ads_limit || config.ads.dailyAdLimit;
  const referralBonus = config.tasks?.channelJoinReward || 1;

  return (
    <div className="space-y-6">
      <BalanceCard balance={balance} referralCount={referralCount} />
      
      <DailyProgress 
        completed={dailyAdsWatched} 
        total={dailyAdsLimit}
        label="Daily Ads"
        icon="📺"
      />

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<Gamepad2 className="w-5 h-5" />}
            title="Play Games"
            desc="CoinFlip & Spin Wheel"
            onClick={() => webApp?.openLink?.('/games')}
          />
          <QuickAction
            icon={<ListChecks className="w-5 h-5" />}
            title="Complete Tasks"
            desc="Earn bonus rewards"
            to="/tasks"
          />
          <QuickAction
            icon={<Wallet className="w-5 h-5" />}
            title="Withdraw"
            desc={balance >= (config.withdraw.minAmount || 100) ? 'Available' : `Min ${formatCurrency(config.withdraw.minAmount || 100)}`}
            to="/withdraw"
            disabled={balance < (config.withdraw.minAmount || 100)}
          />
          <QuickAction
            icon={<Gift className="w-5 h-5" />}
            title="Refer & Earn"
            desc={`${formatCurrency(referralBonus)} per referral`}
            to="/referral"
          />
        </div>
      </section>

      <ReferralCard 
        code={user?.referral_code || ''}
        count={referralCount}
        bonus={referralBonus}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Leaderboard
        </h2>
        <Link to="/leaderboard" className="card-hover flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="font-semibold">View Top Players</p>
              <p className="text-sm text-dark-400">Compete for the top spot</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-dark-400" />
        </Link>
      </section>

      {config.bot.maintenanceMode && (
        <div className="card bg-yellow-500/10 border-yellow-500/30">
          <p className="text-yellow-400 text-center">
            ⚠️ Maintenance mode active. Some features may be unavailable.
          </p>
        </div>
      )}
    </div>
  );
}