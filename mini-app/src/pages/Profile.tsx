import { Link } from 'react-router-dom';
import { Wallet, Users, Trophy, Settings, ArrowLeft, Edit, Copy, Share2, Clock, Calendar, Gamepad2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTelegram } from '../context/TelegramContext';
import { cn, formatCurrency, formatNumber, getInitials } from '../utils/cn';

export function Profile() {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const { webApp, openTelegramLink } = useTelegram();

  if (!user) return null;

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Profile</h1>
        <Link to="/" className="w-10" />
      </header>

      <div className="card text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 text-white font-bold text-3xl">
            {getInitials(user.first_name || 'User')}
          </div>
          {user.is_bot_verified && (
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-dark-950">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold mb-1">{user.first_name} {user.last_name || ''}</h2>
        <p className="text-dark-400 text-sm mb-2">@{user.username || 'N/A'}</p>
        <p className="text-xs text-dark-500">Member since {joinDate}</p>
        
        {user.referral_code && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <code className="bg-dark-800 px-3 py-1 rounded-lg font-mono font-bold tracking-wider text-sm">{user.referral_code}</code>
            <button className="btn-ghost p-2" aria-label="Copy referral code">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/withdraw" className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mx-auto mb-2">
            <Wallet className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-sm text-dark-400">Balance</p>
          <p className="text-2xl font-bold gradient-text">{formatCurrency(user.balance)}</p>
        </Link>
        <Link to="/referral" className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-sm text-dark-400">Referrals</p>
          <p className="text-2xl font-bold text-yellow-500">{user.referral_count}</p>
        </Link>
        <Link to="/games" className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
            <Gamepad2 className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-sm text-dark-400">Games Played</p>
          <p className="text-2xl font-bold text-purple-500">
            {(user.coinflip_played || 0) + (user.spin_played || 0)}
          </p>
        </Link>
        <Link to="/leaderboard" className="card-hover text-center">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-sm text-dark-400">Total Wins</p>
          <p className="text-2xl font-bold text-yellow-500">
            {(user.coinflip_won || 0) + (user.spin_won || 0)}
          </p>
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary-500" />
            Game Statistics
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-800/50 rounded-xl p-4 text-center">
            <Coin className="w-6 h-6 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-dark-400">CoinFlip</p>
            <p className="font-bold text-lg">{user.coinflip_won || 0} / {user.coinflip_played || 0}</p>
            <p className="text-xs text-dark-500">Wins / Games</p>
          </div>
          <div className="bg-dark-800/50 rounded-xl p-4 text-center">
            <RotateCcw className="w-6 h-6 mx-auto text-purple-500 mb-2" />
            <p className="text-sm text-dark-400">Spin Wheel</p>
            <p className="font-bold text-lg">{user.spin_won || 0} / {user.spin_played || 0}</p>
            <p className="text-xs text-dark-500">Wins / Spins</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" />
          Account Settings
        </h3>
        <div className="space-y-3">
          <Link to="/referral" className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium">Referral Program</p>
                <p className="text-sm text-dark-400">Share your code, earn rewards</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </Link>
          
          <button className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors w-full text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Bot Verification</p>
                <p className="text-sm text-dark-400">Verify your account for full access</p>
              </div>
            </div>
            {user.is_bot_verified ? (
              <span className="badge-success">Verified</span>
            ) : (
              <span className="badge-warning">Not Verified</span>
            )}
          </button>
        </div>
      </div>

      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary-500" />
          <div>
            <p className="font-semibold">Compete on Leaderboard</p>
            <p className="text-sm text-dark-400">Check your rank among top players</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Coin } from 'lucide-react';