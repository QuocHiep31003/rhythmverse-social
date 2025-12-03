import { useStreakNotifications } from '@/contexts/StreakContext';
import { StreakWarningDisplay, StreakExpiredDisplay, StreakStartedDisplay } from '@/components/streak/StreakWarningDisplay';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const StreakNotificationCenter = () => {
  const { notifications, removeNotification } = useStreakNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 max-w-sm space-y-2 z-50 pointer-events-auto">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="relative animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="relative">
            {notification.type === 'warning' && (
              <StreakWarningDisplay
                friendName={notification.friendName}
                hoursRemaining={notification.hoursRemaining || 0}
              />
            )}
            {notification.type === 'expired' && (
              <StreakExpiredDisplay friendName={notification.friendName} />
            )}
            {notification.type === 'started' && (
              <StreakStartedDisplay
                friendName={notification.friendName}
                currentStreak={notification.currentStreak || 1}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => removeNotification(notification.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
