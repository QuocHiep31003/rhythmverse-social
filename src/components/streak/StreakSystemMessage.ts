import { Clock } from 'lucide-react';
import { Message } from '@/types/social';

interface StreakWarningMessageProps {
  friendName: string;
  hoursRemaining: number;
}

export const StreakWarningMessage = ({
  friendName,
  hoursRemaining,
}: StreakWarningMessageProps) => {
  const pluralHours = hoursRemaining > 1 ? 'hours' : 'hour';

  return {
    id: `streak-warning-${Date.now()}`,
    sender: 'system',
    content: `⏳ Your streak with ${friendName} is about to expire. Just send a message to keep your connection active 💬`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    sentAt: Date.now(),
    type: 'text',
    reactions: [],
  } as Message;
};

export const StreakExpiredMessage = (friendName: string) => {
  return {
    id: `streak-expired-${Date.now()}`,
    sender: 'system',
    content: `Your streak with ${friendName} has ended. Start messaging to build a new one! 🔄`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    sentAt: Date.now(),
    type: 'text',
    reactions: [],
  } as Message;
};

export const StreakStartedMessage = (friendName: string, currentStreak: number) => {
  return {
    id: `streak-started-${Date.now()}`,
    sender: 'system',
    content: `🔥 New streak started with ${friendName}! ${currentStreak === 1 ? "Let's keep it going!" : `You're on day ${currentStreak} now!`}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    sentAt: Date.now(),
    type: 'text',
    reactions: [],
  } as Message;
};

interface SystemMessageProps {
  type: 'warning' | 'expired' | 'started';
  friendName: string;
  currentStreak?: number;
  hoursRemaining?: number;
}

export const createStreakSystemMessage = ({
  type,
  friendName,
  currentStreak = 0,
  hoursRemaining = 0,
}: SystemMessageProps): Message => {
  switch (type) {
    case 'warning':
      return StreakWarningMessage({ friendName, hoursRemaining });
    case 'expired':
      return StreakExpiredMessage(friendName);
    case 'started':
      return StreakStartedMessage(friendName, currentStreak);
    default:
      return StreakWarningMessage({ friendName, hoursRemaining });
  }
};
