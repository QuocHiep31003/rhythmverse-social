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
    sm: 'text-[11px] gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  };

  return (
    <div
      className={cn(
        // Không border / background, chỉ icon + số
        'inline-flex items-center',
        sizeClasses[size],
        className,
      )}
      title={`${streak} day streak with this friend`}
    >
      <Flame className={cn(
        'flex-shrink-0 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]',
        'animate-pulse motion-safe:animate-pulse transition-transform duration-200',
        size === 'sm' && 'w-3.5 h-3.5',
        size === 'md' && 'w-5 h-5',
        size === 'lg' && 'w-6 h-6',
      )} />
      <span className="ml-1 text-orange-200 font-semibold drop-shadow-[0_0_6px_rgba(0,0,0,0.6)] leading-none">
        {streak}
      </span>
      {showLabel && (
        <span className="ml-0.5 text-orange-300 text-[11px] leading-none">
          day{streak !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
