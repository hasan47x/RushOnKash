import { Link } from 'react-router-dom';
import { ChevronRight, Play, CheckCircle, Clock } from 'lucide-react';
import { cn, formatCurrency } from '../utils/cn';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    reward: string;
    color: string;
    stats: { played: number; won: number };
  };
}

export function GameCard({ game }: GameCardProps) {
  const winRate = game.stats.played > 0 ? ((game.stats.won / game.stats.played) * 100).toFixed(1) : 0;

  return (
    <Link to={`/games/${game.id}`} className="card-hover group">
      <div className="flex items-center gap-4">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-white', `bg-gradient-to-br ${game.color}`)}>
          {game.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg group-hover:text-primary-500 transition-colors">{game.name}</h3>
          <p className="text-sm text-dark-400 truncate">{game.description}</p>
          
          <div className="mt-3 flex items-center gap-4 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {game.stats.played} played
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {game.stats.won} won ({winRate}%)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={cn('px-3 py-1 rounded-full text-xs font-semibold', 'bg-gradient-to-r', game.color.replace('from-', 'from-').replace('to-', 'to-'), 'text-white')}>
            <Zap className="w-3 h-3 inline mr-1" />
            {game.reward}
          </div>
          <ChevronRight className="w-5 h-5 text-dark-400 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}