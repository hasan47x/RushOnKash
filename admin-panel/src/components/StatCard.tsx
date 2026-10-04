import { cn } from '../../shared/utils/cn';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  formatter?: (value: number) => string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const colors = {
  primary: 'bg-primary-500/20 text-primary-500',
  success: 'bg-green-500/20 text-green-500',
  warning: 'bg-yellow-500/20 text-yellow-500',
  danger: 'bg-red-500/20 text-red-500',
};

export function StatCard({ label, value, icon: Icon, formatter, change, trend = 'neutral', color = 'primary' }: StatCardProps) {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();
  const changeAbs = Math.abs(change || 0);

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-400 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color as keyof typeof colors] || colors.primary)}>
          {({ className }) => <Icon className={cn('w-5 h-5', className)} />}
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          ) : (
            <span className="w-4 h-4" />
          )}
          <span className={cn('font-medium', trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-dark-400')}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="text-dark-500">vs last period</span>
        </div>
      )}
    </div>
  );
}