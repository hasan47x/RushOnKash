import { cn } from '../utils/cn';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export function StatCard({ icon, label, value, subtitle, color = 'primary' }: StatCardProps) {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-500',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    danger: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="card-hover text-center">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3', colors[color as keyof typeof colors] || colors.primary)}>
        {icon}
      </div>
      <p className="text-sm text-dark-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-dark-500 mt-1">{subtitle}</p>}
    </div>
  );
}