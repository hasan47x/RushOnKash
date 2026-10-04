import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function QuickAction({ icon, title, desc, to, onClick, disabled }: QuickActionProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) onClick();
  };

  const content = (
    <div className={cn('card-hover text-center p-5 h-full', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mx-auto mb-3 text-primary-500">
        {icon}
      </div>
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-dark-400">{desc}</p>
    </div>
  );

  if (to) {
    return <Link to={to} onClick={handleClick}>{content}</Link>;
  }
  return <div onClick={handleClick}>{content}</div>;
}