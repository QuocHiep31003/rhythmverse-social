import { Clock } from 'lucide-react';

interface StreakWarningDisplayProps {
  friendName: string;
  hoursRemaining: number;
}

export const StreakWarningDisplay = ({
  friendName,
  hoursRemaining,
}: StreakWarningDisplayProps) => {
  const pluralHours = hoursRemaining > 1 ? 'hours' : 'hour';

  return (
    <div className="mx-2.5 sm:mx-3 my-3 px-4 py-3 rounded-lg bg-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
            Your streak with {friendName} will expire in {hoursRemaining} {pluralHours}
          </p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
            Send a message to keep your connection active 💬
          </p>
        </div>
      </div>
    </div>
  );
};

export const StreakExpiredDisplay = ({ friendName }: { friendName: string }) => {
  return (
    <div className="mx-2.5 sm:mx-3 my-3 px-4 py-3 rounded-lg bg-muted/50 border border-border/50 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🔄</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">
            Your streak with {friendName} has ended
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start messaging to build a new one!
          </p>
        </div>
      </div>
    </div>
  );
};

export const StreakStartedDisplay = ({
  friendName,
  currentStreak,
}: {
  friendName: string;
  currentStreak: number;
}) => {
  return (
    <div className="mx-2.5 sm:mx-3 my-3 px-4 py-3 rounded-lg bg-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🔥</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
            {currentStreak === 1
              ? `New streak started with ${friendName}! Let's keep it going!`
              : `You're on day ${currentStreak} of your streak with ${friendName}! 🎉`}
          </p>
        </div>
      </div>
    </div>
  );
};
