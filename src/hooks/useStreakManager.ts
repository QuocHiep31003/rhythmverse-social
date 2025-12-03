import { useCallback, useEffect, useRef, useState } from 'react';
import { STREAK_STORAGE_EVENT } from '@/constants/streak';

export interface StreakData {
  streak: number;
  lastActiveDay: string;
  expireAt: number;
  isExpiringSoon?: boolean;
  hoursRemaining?: number;
}

interface UseStreakManagerOptions {
  friendName?: string;
  onStreakWarning?: (friendName: string, hoursRemaining: number) => void;
  onStreakExpired?: (friendName: string) => void;
  onStreakStarted?: (friendName: string, currentStreak: number) => void;
}

/**
 * Hook để quản lý Streak data cho một cuộc trò chuyện với bạn
 * Handles streak logic, expiration checks, và notifications
 *
 * Social Feature (NOT Game):
 * - Streak = indicator of daily two-way interaction
 * - Starts when both users message each other on same day (≥1 message each)
 * - Increments daily when bidirectional interaction confirmed
 * - Resets at 00:00 if interaction isn't bidirectional
 * - Warning at 20:00 if only one-sided interaction
 */
export const useStreakManager = (
  friendId: string | null,
  options?: UseStreakManagerOptions,
) => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const warningKeyRef = useRef<string | null>(null);
  const hasExpiredRef = useRef(false);

  const {
    friendName,
    onStreakWarning,
    onStreakExpired,
    onStreakStarted,
  } = options || {};

  const friendLabel = friendName || friendId || 'bạn';

  const emitStreakEvent = useCallback(
    (detail: { data: StreakData | null }) => {
      if (typeof window === 'undefined' || !friendId) return;
      window.dispatchEvent(
        new CustomEvent(STREAK_STORAGE_EVENT, {
          detail: {
            friendId,
            ...detail,
          },
        }),
      );
    },
    [friendId],
  );

  // Load streak data từ localStorage hoặc API
  const loadStreakData = useCallback(async () => {
    if (!friendId) return;

    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`streak:${friendId}`);
      if (stored) {
        const data = JSON.parse(stored) as StreakData;
        setStreakData(data);
        checkStreakExpiration(data);
      }
    } catch (error) {
      console.error('[useStreakManager] Failed to load streak data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [friendId]);

  // Check if streak is expiring soon (20:00 rule)
  const checkStreakExpiration = useCallback((data: StreakData) => {
    const now = Date.now();
    const expiresIn = data.expireAt - now;
    const hoursRemaining = Math.ceil(expiresIn / (1000 * 60 * 60));

    if (expiresIn <= 0) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        if (onStreakExpired) {
          onStreakExpired(friendLabel);
        }
      }
      setStreakData(null);
      emitStreakEvent({ data: null });
      if (friendId) {
        localStorage.removeItem(`streak:${friendId}`);
      }
      warningKeyRef.current = null;
      return;
    }

    hasExpiredRef.current = false;

    // Mark as expiring if less than 4 hours remain
    if (hoursRemaining <= 4 && hoursRemaining > 0) {
      setStreakData((prev) =>
        prev
          ? {
              ...prev,
              isExpiringSoon: true,
              hoursRemaining,
            }
          : prev,
      );

      if (onStreakWarning) {
        const warningKey = `${friendId ?? 'friend'}:${data.lastActiveDay}`;
        if (warningKeyRef.current !== warningKey) {
          warningKeyRef.current = warningKey;
          onStreakWarning(friendLabel, hoursRemaining);
        }
      }
    } else {
      warningKeyRef.current = null;
    }
  }, [emitStreakEvent, friendId, friendLabel, onStreakExpired, onStreakWarning]);

  // Check expiration periodically
  useEffect(() => {
    if (!streakData) return;

    const interval = setInterval(() => {
      checkStreakExpiration(streakData);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [streakData, checkStreakExpiration]);

  // Initialize on mount
  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  const updateStreak = useCallback((newData: StreakData) => {
    setStreakData(newData);
    if (friendId) {
      localStorage.setItem(`streak:${friendId}`, JSON.stringify(newData));
    }
    emitStreakEvent({ data: newData });
    hasExpiredRef.current = false;
  }, [emitStreakEvent, friendId]);

  /**
   * Increment streak when bidirectional message received
   * Called when both users have sent messages today
   */
  const increaseStreak = useCallback(() => {
    if (!streakData) {
      // First time: start new streak
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const newData: StreakData = {
        streak: 1,
        lastActiveDay: today,
        expireAt: new Date(`${tomorrow}T00:00:00Z`).getTime(),
      };
      updateStreak(newData);
      if (onStreakStarted) {
        onStreakStarted(friendLabel, newData.streak);
      }
      return 1;
    }

    const today = new Date().toISOString().split('T')[0];
    const lastDay = streakData.lastActiveDay;

    // Check if already increased today
    if (lastDay === today) {
      return streakData.streak;
    }

    // Check if streak should continue
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const shouldContinue = lastDay === yesterday;

    const updatedData: StreakData = {
      streak: shouldContinue ? streakData.streak + 1 : 1,
      lastActiveDay: today,
      expireAt: new Date(Date.now() + 86400000).getTime(), // Reset to 24 hours from now
      isExpiringSoon: false,
    };

    updateStreak(updatedData);
    if (onStreakStarted) {
      onStreakStarted(friendLabel, updatedData.streak);
    }
    return updatedData.streak;
  }, [friendLabel, onStreakStarted, streakData, updateStreak]);

  const resetStreak = useCallback(() => {
    setStreakData(null);
    if (friendId) {
      localStorage.removeItem(`streak:${friendId}`);
    }
    emitStreakEvent({ data: null });
    hasExpiredRef.current = false;
    warningKeyRef.current = null;
  }, [emitStreakEvent, friendId]);

  return {
    streakData,
    isLoading,
    updateStreak,
    increaseStreak,
    resetStreak,
    loadStreakData,
  };
};
