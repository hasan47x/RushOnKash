import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coins, RotateCcw, CheckCircle, XCircle, Zap, ArrowLeft, Trophy, Settings, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useTelegram } from '../../context/TelegramContext';
import { cn, formatCurrency } from '../../utils/cn';

const COIN_SIDES = ['heads', 'tails'] as const;
type CoinSide = 'heads' | 'tails';

export function CoinFlip() {
  const navigate = useNavigate();
  const { user, updateBalance, refreshUser } = useAuth();
  const { config } = useConfig();
  const { webApp, hapticFeedback } = useTelegram();

  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [dailyPlayed, setDailyPlayed] = useState(user?.coinflip_played || 0);
  const [dailyLimit] = useState(config.coinflip.dailyLimit);
  const [winReward] = useState(config.coinflip.winReward);
  const [lossReward] = useState(config.coinflip.lossReward);
  const [history, setHistory] = useState<Array<{ side: CoinSide; result: 'win' | 'loss'; reward: number; time: Date }>>([]);
  const [balance, setBalance] = useState(user?.balance || 0);

  const canPlay = dailyPlayed < dailyLimit;
  const remaining = dailyLimit - dailyPlayed;

  const flipCoin = async () => {
    if (!selectedSide || flipping || !canPlay) return;
    
    setFlipping(true);
    hapticFeedback?.impactOccurred?.('medium');
    
    // Simulate flip animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Server-side would determine this, here we simulate
    const outcome = getRandomItem(COIN_SIDES);
    const isWin = outcome === selectedSide;
    const reward = isWin ? winReward : lossReward;
    
    setResult(outcome);
    setShowResult(true);
    setFlipping(false);
    
    if (isWin) {
      hapticFeedback?.notificationOccurred?.('success');
    } else {
      hapticFeedback?.notificationOccurred?.('error');
    }

    // Update local state immediately
    const newBalance = balance + reward;
    setBalance(newBalance);
    updateBalance(reward);
    setDailyPlayed(prev => prev + 1);
    
    setHistory(prev => [{
      side: outcome,
      result: (isWin ? 'win' : 'loss') as 'win' | 'loss',
      reward,
      time: new Date(),
    }, ...prev].slice(0, 10));

    // Sync with server
    try {
      await refreshUser();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  const playAgain = () => {
    setSelectedSide(null);
    setResult(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/games" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">CoinFlip</h1>
        <Link to="/games" className="w-10" />
      </header>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            <span className="font-semibold">Daily Limit</span>
          </div>
          <span className="font-bold text-primary-500">{remaining}/{dailyLimit}</span>
        </div>
        <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${((dailyPlayed / dailyLimit) * 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {COIN_SIDES.map(side => (
          <button
            key={side}
            onClick={() => !flipping && !showResult && setSelectedSide(side)}
            disabled={flipping || showResult || selectedSide !== null && selectedSide !== side || !canPlay}
            className={cn(
              'card-hover relative p-6 flex flex-col items-center gap-4 transition-all duration-300',
              selectedSide === side && 'ring-2 ring-primary-500 bg-primary-500/10',
              !canPlay && 'opacity-50'
            )}
          >
            <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto', 
              selectedSide === side ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-dark-800'
            )}>
              <Coins className={cn('w-10 h-10', selectedSide === side ? 'text-white' : 'text-dark-400')} />
            </div>
            <span className={cn('font-semibold text-lg', selectedSide === side ? 'text-primary-500' : 'text-white')}>
              {side.charAt(0).toUpperCase() + side.slice(1)}
            </span>
            {selectedSide === side && <CheckCircle className="w-5 h-5 text-primary-500" />}
          </button>
        ))}
      </div>

      {!selectedSide && !canPlay && (
        <div className="card bg-yellow-500/10 border-yellow-500/30 text-center">
          <Clock className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
          <p className="text-yellow-500">Daily limit reached. Come back tomorrow!</p>
        </div>
      )}

      {selectedSide && !showResult && !flipping && (
        <button onClick={flipCoin} disabled={flipping || !canPlay} className="btn-primary w-full py-4 text-lg">
          <Zap className="w-5 h-5" />
          Flip Coin
        </button>
      )}

      {flipping && (
        <div className="card text-center py-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 animate-spin">
            <Coins className="w-12 h-12 text-white" />
          </div>
          <p className="text-lg font-semibold">Flipping...</p>
          <p className="text-dark-400">Your choice: {selectedSide}</p>
        </div>
      )}

      {showResult && result && (
        <div className="card text-center animate-bounce-subtle">
          <div className={cn('w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4',
            result === selectedSide ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-orange-500'
          )}>
            <Coins className="w-14 h-14 text-white" />
          </div>
          
          <h2 className={cn('text-2xl font-bold mb-2', result === selectedSide ? 'text-green-500' : 'text-red-500')}>
            {result === selectedSide ? 'YOU WON!' : 'YOU LOST'}
          </h2>
          
          <p className="text-lg mb-4">
            Coin landed on <span className="font-semibold capitalize">{result}</span>
          </p>
          
          <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold',
            result === selectedSide ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          )}>
            {result === selectedSide ? (
              <>
                <Trophy className="w-5 h-5" />
                +{formatCurrency(winReward)}
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                {formatCurrency(lossReward)}
              </>
            )}
          </div>
          
          <div className="mt-6 flex gap-3">
            <button onClick={playAgain} className="btn-secondary flex-1">
              Play Again
            </button>
            <Link to="/games" className="btn-ghost flex-1">Back to Games</Link>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent History
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center',
                    h.result === 'win' ? 'bg-green-500/20' : 'bg-red-500/20'
                  )}>
                    <Coins className={cn('w-4 h-4', h.result === 'win' ? 'text-green-500' : 'text-red-500')} />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{h.side}</p>
                    <p className="text-xs text-dark-400">{h.time.toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('font-semibold', h.result === 'win' ? 'text-green-500' : 'text-red-500')}>
                    {h.result === 'win' ? '+' : ''}{formatCurrency(h.reward)}
                  </p>
                  <p className="text-xs text-dark-400">{h.result === 'win' ? 'Win' : 'Loss'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getRandomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}