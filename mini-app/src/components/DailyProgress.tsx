import { cn } from '../utils/cn';

interface DailyProgressProps {
  completed: number;
  total: number;
  label: string;
  icon: string;
}

export function DailyProgress({ completed, total, label, icon }: DailyProgressProps) {
  const percentage = Math.min((completed / total) * 100, 100);
  const remaining = Math.max(total - completed, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-semibold">{label}</p>
            <p className="text-sm text-dark-400">{completed} / {total} completed</p>
          </div>
        </div>
        <span className="font-bold text-primary-500">{percentage.toFixed(0)}%</span>
      </div>
      
      <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {remaining > 0 && (
        <p className="text-sm text-dark-400 mt-3 text-center">
          {remaining} more to complete today's goal
        </p>
      )}
    </div>
  );
}