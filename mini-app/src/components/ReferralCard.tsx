import { Copy, Share2, ExternalLink, Check } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useConfig } from '../context/ConfigContext';
import { cn, formatCurrency } from '../utils/cn';
import { useState } from 'react';

interface ReferralCardProps {
  code: string;
  count: number;
  bonus: number;
}

export function ReferralCard({ code, count, bonus }: ReferralCardProps) {
  const { webApp, openTelegramLink, shareMessage } = useTelegram();
  const { config } = useConfig();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const botUsername = config.bot.botUsername || 'yourbot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${code}`;
  const shareText = `Join RushOnCash and earn money! 💰\n\nUse my referral code: ${code}\n\n${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      webApp?.hapticFeedback?.notificationOccurred?.('success');
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
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tl from-yellow-500/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">Refer & Earn</p>
            <p className="text-sm text-dark-400">Share your code, earn rewards</p>
          </div>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">Your Code</span>
            {copied && <span className="text-green-500 text-sm flex items-center gap-1"><Check className="w-3 h-3" /> Copied!</span>}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xl font-mono font-bold tracking-widest bg-dark-900 px-3 py-2 rounded-lg text-center">{code}</code>
            <button onClick={handleCopy} className="btn-secondary p-2" aria-label="Copy code">
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-center p-3 bg-dark-800/50 rounded-xl">
            <p className="text-2xl font-bold gradient-text">{count}</p>
            <p className="text-xs text-dark-400">Total Referrals</p>
          </div>
          <div className="flex-1 text-center p-3 bg-dark-800/50 rounded-xl">
            <p className="text-2xl font-bold text-yellow-500">{formatCurrency(bonus)}</p>
            <p className="text-xs text-dark-400">Per Referral</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
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
  );
}

import { Gift } from 'lucide-react';