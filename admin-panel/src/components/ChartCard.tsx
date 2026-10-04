import { cn } from '../../shared/utils/cn';

interface ChartCardProps {
  title: string;
  type: 'users' | 'revenue' | 'games';
}

export function ChartCard({ title, type }: ChartCardProps) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center">
        <div className="text-center text-dark-500">
          <p className="font-medium mb-2">Chart: {title}</p>
          <p className="text-sm text-dark-500">Recharts integration pending</p>
          <div className="mt-4 h-32 bg-gradient-to-r from-primary-500/10 to-emerald-500/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}