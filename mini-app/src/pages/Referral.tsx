import { Link } from 'react-router-dom';
import { Share2, Copy, Users, Gift, ArrowLeft, CheckCircle, ExternalLink, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTelegram } from '../context/TelegramContext';
import { cn, formatCurrency, formatNumber } from '../utils/cn';
import { useState } from 'react';

export function Referral() {
  const { user } = useAuth();
  const { config } = useConfig();
  const { webApp, openTelegramLink, shareMessage } = useTelegram();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!user) return null;

  const botUsername = config.bot.botUsername || 'yourbot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.referral_code}`;
  const shareText = `Join RushOnCash and earn money! 💰\n\nUse my referral code: ${user.referral_code}\n\n${referralLink}`;
  const referralBonus = config.bot.referralBonus || 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      webApp?.HapticFeedback.notificationOccurred('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleShare = () => {
    if (shareMessage) {
      shareMessage(shareText, referralLink);
    } else if (openTelegramLink) {
      openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
    } else if (navigator.share) {
      navigator.share({ title: 'RushOnCash', text: shareText, url: referralLink });
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/profile" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Refer & Earn</h1>
        <Link to="/profile" className="w-10" />
      </header>

      <div className="card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tl from-yellow-500/20 to-transparent rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Referral Program</h2>
              <p className="text-dark-400">Share your code, earn rewards</p>
            </div>
          </div>
          
          <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-dark-400 text-sm">Your Referral Code</span>
              {copied && <span className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Copied!</span>}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xl font-mono font-bold tracking-widest bg-dark-900 px-3 py-2 rounded-lg text-center">{user.referral_code}</code>
              <button onClick={handleCopy} className="btn-secondary p-2" aria-label="Copy code">
                {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleCopy} className="btn-secondary flex-1">
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button onClick={handleShare} className="btn-primary flex-1">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-sm text-dark-400">Total Referrals</p>
          <p className="text-2xl font-bold text-yellow-500">{user.referral_count}</p>
        </div>
        <div className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
            <Gift className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm text-dark-400">Per Referral</p>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(config.tasks?.channelJoinReward || 1)}</p>
        </div>
        <div className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
            <Star className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-sm text-dark-400">Total Earned</p>
          <p className="text-2xl font-bold text-purple-500">{formatCurrency(user.referral_count * (config.tasks?.channelJoinReward || 1))}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-500" />
          How It Works
        </h3>
        <div className="space-y-3 text-sm text-dark-400">
          <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">1</span>
            <p>Share your referral code or link with friends</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">2</span>
            <p>Friends join using your code/link</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">3</span>
            <p>You earn <strong>{formatCurrency(config.tasks?.channelJoinReward || 1)}</strong> per successful referral</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
            <span className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">4</span>
            <p>Withdraw earnings once you reach minimum</p>
          </div>
        </div>
      </div>

      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary-500" />
          <div>
            <p className="font-semibold">Pro Tip</p>
            <p className="text-sm text-dark-400">Share on social media, Telegram groups, and with friends directly for maximum referrals!</p>
          </div>
        </div>
      </div>
    </div>
  );
}