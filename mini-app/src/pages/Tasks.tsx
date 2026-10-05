import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ExternalLink, MessageCircle, Youtube, Facebook, Gift, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTelegram } from '../context/TelegramContext';
import { cn, formatCurrency } from '../utils/cn';

const TASKS = [
  {
    id: 'channel',
    name: 'Join Telegram Channel',
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    rewardKey: 'channelJoinReward',
    completed: false,
    action: 'open_channel',
  },
  {
    id: 'youtube',
    name: 'Subscribe YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    rewardKey: 'youtubeSubReward',
    completed: false,
    action: 'open_youtube',
  },
  {
    id: 'facebook',
    name: 'Follow Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/20',
    rewardKey: 'facebookFollowReward',
    completed: false,
    action: 'open_facebook',
  },
  {
    id: 'daily',
    name: 'Daily Login',
    icon: Gift,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    rewardKey: 'dailyLoginReward',
    completed: false,
    action: 'claim_daily',
  },
];

export function Tasks() {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const { webApp, openTelegramLink, openLink } = useTelegram();
  const [taskStatus, setTaskStatus] = useState<Record<string, { completed: boolean; claimed: boolean }>>({});

  useEffect(() => {
    if (user) {
      const status: Record<string, { completed: boolean; claimed: boolean }> = {};
      TASKS.forEach(task => {
        if (task.id === 'channel') {
          status[task.id] = { completed: user.telegramBonus === 1, claimed: user.telegramBonus === 1 };
        } else if (task.id === 'youtube') {
          status[task.id] = { completed: user.youtubeBonus === 1, claimed: user.youtubeBonus === 1 };
        } else if (task.id === 'facebook') {
          status[task.id] = { completed: user.facebookBonus === 1, claimed: user.facebookBonus === 1 };
        } else if (task.id === 'daily') {
          // Check if daily login already claimed today
          const lastLogin = localStorage.getItem(`daily_login_${user.id}`);
          const today = new Date().toISOString().split('T')[0];
          status[task.id] = { completed: lastLogin === today, claimed: lastLogin === today };
        }
      });
      setTaskStatus(status);
    }
  }, [user]);

  const handleTaskAction = async (task: typeof TASKS[0]) => {
    if (!user) return;
    
    try {
      if (task.id === 'channel') {
        const channelUrl = config.tasks.channelUsername 
          ? `https://t.me/${config.tasks.channelUsername.replace('@', '')}`
          : 'https://t.me/yourchannel';
        if (openTelegramLink) {
          openTelegramLink(channelUrl);
        } else {
          window.open(channelUrl, '_blank');
        }
      } else if (task.id === 'youtube') {
        const ytUrl = config.tasks.youtubeChannelUrl || 'https://youtube.com';
        if (openLink) {
          openLink(ytUrl);
        } else {
          window.open(ytUrl, '_blank');
        }
      } else if (task.id === 'facebook') {
        const fbUrl = config.tasks.facebookPageUrl || 'https://facebook.com';
        if (openLink) {
          openLink(fbUrl);
        } else {
          window.open(fbUrl, '_blank');
        }
      } else if (task.id === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`daily_login_${user.id}`, today);
        setTaskStatus(prev => ({ ...prev, daily: { completed: true, claimed: true } }));
        
        // Claim reward via API
        const reward = config.tasks.dailyLoginReward;
        // await api.claimTaskReward(user.id, 'daily_login', reward);
      }
    } catch (err) {
      console.error('Task action failed:', err);
    }
  };

  const handleClaim = async (task: typeof TASKS[0]) => {
    if (!user) return;
    
    const rewardKey = task.rewardKey as keyof typeof config.tasks;
    const reward = config.tasks[rewardKey];
    
    try {
      // await api.claimTaskReward(user.id, task.id, reward);
      setTaskStatus(prev => ({ ...prev, [task.id]: { completed: true, claimed: true } }));
      if (task.id === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`daily_login_${user.id}`, today);
      }
      await refreshUser();
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Tasks</h1>
        <Link to="/" className="w-10" />
      </header>

      <div className="card">
        <p className="text-dark-400 text-sm mb-4">
          Complete tasks to earn bonus rewards. Each task can be completed once.
        </p>
      </div>

      <div className="space-y-4">
        {TASKS.map(task => {
          const status = taskStatus[task.id] || { completed: false, claimed: false };
          const rewardKey = task.rewardKey as keyof typeof config.tasks;
          const reward = config.tasks[rewardKey];
          
          return (
            <div key={task.id} className="card-hover">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', task.bgColor)}>
                  <task.icon className={cn('w-6 h-6', task.color)} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{task.name}</p>
                  <p className="text-sm text-dark-400">
                    Earn {formatCurrency(Number(reward))} for completing this task
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {status.claimed ? (
                    <span className="badge-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Claimed
                    </span>
                  ) : status.completed ? (
                    <button onClick={() => handleClaim(task)} className="btn-primary text-sm px-3 py-1">
                      Claim {formatCurrency(Number(reward))}
                    </button>
                  ) : (
                    <button onClick={() => handleTaskAction(task)} className="btn-secondary text-sm px-3 py-1">
                      <ExternalLink className="w-3 h-3" />
                      Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-primary-500" />
          <div>
            <p className="font-semibold">Daily Login Bonus</p>
            <p className="text-sm text-dark-400">Come back every day to claim your bonus!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';