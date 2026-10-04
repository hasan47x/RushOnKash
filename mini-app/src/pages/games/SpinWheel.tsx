import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowLeft, Trophy, CheckCircle, Zap, Settings, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useTelegram } from '../../context/TelegramContext';
import { cn, formatCurrency } from '../../utils/cn';
import type { SpinSegment } from '@shared/types';

export function SpinWheel() {
  const { user, updateBalance, refreshUser } = useAuth();
  const { config } = useConfig();
  const { webApp, hapticFeedback } = useTelegram();

  const segments: SpinSegment[] = config.spin.segments?.length > 0 
    ? config.spin.segments 
    : [
        { reward: 0.10, probability: 10, label: '৳0.10', color: '#22c55e' },
        { reward: 0.05, probability: 20, label: '৳0.05', color: '#3b82f6' },
        { reward: 0.02, probability: 30, label: '৳0.02', color: '#f59e0b' },
        { reward: 0, probability: 40, label: 'Try Again', color: '#6b7280' },
      ];

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dailyPlayed, setDailyPlayed] = useState(user?.spin_played || 0);
  const [dailyLimit] = useState(config.spin.dailyLimit);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [history, setHistory] = useState<Array<{ segment: SpinSegment; reward: number; time: Date }>>([]);
  const wheelRef = useRef<HTMLDivElement>(null);

  const canPlay = dailyPlayed < dailyLimit;
  const remaining = dailyLimit - dailyPlayed;

  const totalProbability = segments.reduce((sum, s) => sum + s.probability, 0);
  const segmentAngles = segments.map((s, i) => {
    const prev = segments.slice(0, i).reduce((sum, seg) => sum + seg.probability, 0);
    return (prev / totalProbability) * 360;
  });

  const spinWheel = () => {
    if (!canPlay || spinning) return;
    
    setSpinning(true);
    hapticFeedback?.impactOccurred?.('medium');
    
    // Weighted random selection
    const random = Math.random() * totalProbability;
    let cumulative = 0;
    let selectedIndex = segments.length - 1;
    
    for (let i = 0; i < segments.length; i++) {
      cumulative += segments[i].probability;
      if (random <= cumulative) {
        selectedIndex = i;
        break;
      }
    }
    
    const selectedSegment = segments[selectedIndex];
    const segmentCenterAngle = segmentAngles[selectedIndex] + (segments[selectedIndex].probability / totalProbability) * 360 / 2;
    const targetRotation = 360 * 5 + (360 - segmentCenterAngle) + 90; // 5 full spins + land on segment
    
    setRotation(prev => prev + targetRotation);
    
    // Wait for animation
    setTimeout(() => {
      setResult(selectedSegment);
      setShowResult(true);
      setSpinning(false);
      
      const reward = selectedSegment.reward;
      const newBalance = balance + reward;
      setBalance(newBalance);
      updateBalance(reward);
      setDailyPlayed(prev => prev + 1);
      
      setHistory(prev => [{
        segment: selectedSegment,
        reward,
        time: new Date(),
      }, ...prev].slice(0, 10));
      
      if (reward > 0) {
        hapticFeedback?.notificationOccurred?.('success');
      } else {
        hapticFeedback?.notificationOccurred?.('warning');
      }
      
      refreshUser().catch(console.error);
    }, 4000);
  };

  const playAgain = () => {
    setResult(null);
    setShowResult(false);
  };

  const segmentColors = segments.map(s => s.color);
  const conicGradient = `conic-gradient(${segments.map((s, i) => {
    const start = i === 0 ? 0 : segments.slice(0, i).reduce((sum, seg) => sum + seg.probability, 0) / totalProbability * 100;
    const end = segments.slice(0, i + 1).reduce((sum, seg) => sum + seg.probability, 0) / totalProbability * 100;
    return `${s.color} ${start}% ${end}%`;
  }).join(', ')})`;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/games" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Spin Wheel</h1>
        <Link to="/games" className="w-10" />
      </header>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-500" />
            <span className="font-semibold">Daily Spins</span>
          </div>
          <span className="font-bold text-primary-500">{remaining}/{dailyLimit}</span>
        </div>
        <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${((dailyPlayed / dailyLimit) * 100)}%` }} />
        </div>
      </div>

      <div className="relative" style={{ width: '280px', height: '280px', margin: '0 auto' }}>
        <div
          ref={wheelRef}
          className="w-full h-full rounded-full border-4 border-dark-700 relative"
          style={{
            background: conicGradient,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-dark-900 border-2 border-dark-700 flex items-center justify-center z-10">
            <RotateCcw className="w-8 h-8 text-purple-500" />
          </div>
          
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-8 border-transparent border-b-8 border-white z-20" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {segments.map((segment, i) => (
          <div key={i} className="card-hover p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: segment.color }}>
              {segment.reward > 0 ? (
                <span className="text-white text-xs font-bold">{segment.label}</span>
              ) : (
                <RotateCcw className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{segment.label}</p>
              <p className="text-xs text-dark-400">{segment.probability}% chance</p>
            </div>
          </div>
        ))}
      </div>

      {!canPlay && (
        <div className="card bg-yellow-500/10 border-yellow-500/30 text-center">
          <Clock className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
          <p className="text-yellow-500">Daily limit reached. Come back tomorrow!</p>
        </div>
      )}

      {canPlay && !spinning && !showResult && (
        <button onClick={spinWheel} disabled={spinning} className="btn-primary w-full py-4 text-lg">
          <Zap className="w-5 h-5" />
          Spin Wheel
        </button>
      )}

      {spinning && (
        <div className="card text-center py-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 animate-spin">
            <RotateCcw className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-semibold">Spinning...</p>
        </div>
      )}

      {showResult && result && (
        <div className="card text-center animate-bounce-subtle">
          <div className={cn('w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4',
            result.reward > 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'
          )} style={{ backgroundColor: result.reward > 0 ? '#16a34a20' : '#f59e0b20' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: result.color }}>
              {result.reward > 0 ? (
                <Trophy className="w-10 h-10 text-white" />
              ) : (
                <RotateCcw className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
          
          <h2 className={cn('text-2xl font-bold mb-2', result.reward > 0 ? 'text-green-500' : 'text-yellow-500')}>
            {result.reward > 0 ? 'YOU WON!' : 'TRY AGAIN'}
          </h2>
          
          <p className="text-lg mb-4" style={{ color: result.color }}>
            Landed on {result.label}
          </p>
          
          <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold',
            result.reward > 0 ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
          )}>
            {result.reward > 0 ? (
              <>
                <Trophy className="w-5 h-5" />
                +{formatCurrency(result.reward)}
              </>
            ) : (
              <>
                <RotateCcw className="w-5 h-5" />
                Better luck next time!
              </>
            )}
          </div>
          
          <div className="mt-6 flex gap-3">
            <button onClick={playAgain} className="btn-secondary flex-1">
              Spin Again
            </button>
            <Link to="/games" className="btn-ghost flex-1">Back to Games</Link>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent Spins
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: h.segment.color }}>
                    {h.segment.reward > 0 ? (
                      <span className="text-white text-xs font-bold">{h.segment.label}</span>
                    ) : (
                      <RotateCcw className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.segment.label}</p>
                    <p className="text-xs text-dark-400">{h.time.toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('font-semibold', h.reward > 0 ? 'text-green-500' : 'text-yellow-500')}>
                    {h.reward > 0 ? '+' : ''}{formatCurrency(h.reward)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';