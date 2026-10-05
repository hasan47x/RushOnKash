import { Link } from 'react-router-dom';
import { Coins, RotateCcw, Target, Zap, Shield, Star, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { cn, formatCurrency } from '../utils/cn';
import { GameCard } from '../components/GameCard';

export function Games() {
  const { user } = useAuth();
  const { config } = useConfig();

  const games = [
    {
      id: 'coinflip',
      name: 'CoinFlip',
      icon: <Coins className="w-8 h-8" />,
      description: 'Classic 50/50 coin toss',
      reward: formatCurrency(config.coinflip.winReward),
      color: 'from-amber-500 to-orange-500',
      stats: {
        played: user?.coinflip_played || 0,
        won: user?.coinflip_won || 0,
      },
    },
    {
      id: 'spin',
      name: 'Spin Wheel',
      icon: <RotateCcw className="w-8 h-8" />,
      description: 'Spin for multiple rewards',
      reward: 'Up to ' + formatCurrency(Math.max(...(config.spin.segments?.map(s => s.reward) || [0.1]))),
      color: 'from-purple-500 to-pink-500',
      stats: {
        played: user?.spin_played || 0,
        won: user?.spin_won || 0,
      },
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Games</h1>
          <p className="text-dark-400">Play and win rewards</p>
        </div>
        <div className="flex items-center gap-2 bg-dark-800/50 px-3 py-2 rounded-xl">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">{formatCurrency(user?.balance || 0)}</span>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Available Games</h2>
        <div className="grid grid-cols-1 gap-4">
          {games.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Your Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="card-hover text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-primary-500" />
            <p className="text-sm text-dark-400">CoinFlip</p>
            <p className="font-bold">{user?.coinflip_won || 0} / {user?.coinflip_played || 0}</p>
            <p className="text-xs text-dark-400">Wins / Games</p>
          </div>
          <div className="card-hover text-center">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-dark-400">Spin Wheel</p>
            <p className="font-bold">{user?.spin_won || 0} / {user?.spin_played || 0}</p>
            <p className="text-xs text-dark-400">Wins / Spins</p>
          </div>
          <div className="card-hover text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-dark-400">Win Rate</p>
            <p className="font-bold">
              {(user && (user.coinflip_played + user.spin_played) > 0)
                ? (((user.coinflip_won + user.spin_won) / (user.coinflip_played + user.spin_played)) * 100).toFixed(1) + '%'
                : '0%'}
            </p>
            <p className="text-xs text-dark-400">Overall</p>
          </div>
        </div>
      </section>

      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary-500" />
          <div>
            <p className="font-semibold">Fair Play Guaranteed</p>
            <p className="text-sm text-dark-400">All games use provably fair algorithm with server/client seeds</p>
          </div>
        </div>
      </div>
    </div>
  );
}