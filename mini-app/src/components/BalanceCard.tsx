import { Wallet, Users, TrendingUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '../utils/cn';

interface BalanceCardProps {
  balance: number;
  referralCount: number;
}

export function BalanceCard({ balance, referralCount }: BalanceCardProps) {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tl from-primary-500/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-dark-400 text-sm font-medium mb-1">Available Balance</p>
          <p className="text-3xl font-bold gradient-text">{formatCurrency(balance)}</p>
        </div>
        <Link to="/withdraw" className="btn-primary px-4 py-2">
          <Wallet className="w-4 h-4" />
          Withdraw
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-dark-800">
        <div className="text-center">
          <p className="text-2xl font-bold">{referralCount}</p>
          <p className="text-dark-400 text-xs">Referrals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{0}</p>
          <p className="text-dark-400 text-xs">Total Earned</p>
        </div>
        <div className="text-center">
          <Link to="/referral" className="flex flex-col items-center gap-1 text-primary-500 hover:text-primary-400 transition-colors">
            <ExternalLink className="w-5 h-5" />
            <span className="text-xs font-medium">Share</span>
          </Link>
        </div>
      </div>
    </div>
  );
}