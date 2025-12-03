import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const StreakBadge = ({
  streak,
  size = 'md',
  showLabel = false,
  className,
}: StreakBadgeProps) => {
  if (!streak || streak < 1) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-3 h-3 text-xs gap-0.5 px-1.5 py-0.5',
    md: 'w-4 h-4 text-xs gap-1 px-2 py-1',
    lg: 'w-5 h-5 text-sm gap-1.5 px-2.5 py-1.5',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-orange-500/10 rounded-full',
        sizeClasses[size],
        className
      )}
      title={`${streak} day streak with this friend`}
    >
      <Flame className={cn(
        'text-orange-500 flex-shrink-0',
        size === 'sm' && 'w-2.5 h-2.5',
        size === 'md' && 'w-3 h-3',
        size === 'lg' && 'w-4 h-4',
      )} />
      <span className="text-orange-500 font-semibold">{streak}</span>
      {showLabel && <span className="text-orange-500">day{streak !== 1 ? 's' : ''}</span>}
    </div>
  );
};
