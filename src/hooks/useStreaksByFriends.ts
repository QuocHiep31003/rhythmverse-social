import { useCallback, useEffect, useMemo, useState } from 'react';
import { STREAK_STORAGE_EVENT } from '@/constants/streak';

export interface StreakData {
  streak: number;
  lastActiveDay: string;
  expireAt: number;
  isExpiringSoon?: boolean;
  hoursRemaining?: number;
}

/**
 * Hook để đọc streak data cho multiple friends từ localStorage
 * Returns a record of friendId -> StreakData
 */
export const useStreaksByFriends = (friendIds: string[]) => {
  const stableFriendIds = useMemo(() => {
    const unique = Array.from(new Set(friendIds.filter(Boolean)));
    unique.sort();
    return unique;
  }, [friendIds]);

  const readStreaks = useCallback(() => {
    const result: Record<string, StreakData> = {};

    stableFriendIds.forEach((friendId) => {
      if (!friendId) return;
      try {
        const stored = localStorage.getItem(`streak:${friendId}`);
        if (stored) {
          const data = JSON.parse(stored) as StreakData;
          result[friendId] = data;
        }
      } catch (error) {
        console.error(`[useStreaksByFriends] Failed to load streak for ${friendId}:`, error);
      }
    });

    return result;
  }, [stableFriendIds]);

  const [streaksByFriend, setStreaksByFriend] = useState<Record<string, StreakData>>(() => readStreaks());

  useEffect(() => {
    setStreaksByFriend(readStreaks());
  }, [readStreaks]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith('streak:')) return;
      const friendId = event.key.replace('streak:', '');
      if (!stableFriendIds.includes(friendId)) return;
      setStreaksByFriend(readStreaks());
    };

    const handleCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<{ friendId?: string }>;
      const friendId = custom.detail?.friendId;
      if (friendId && !stableFriendIds.includes(friendId)) {
        return;
      }
      setStreaksByFriend(readStreaks());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(STREAK_STORAGE_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STREAK_STORAGE_EVENT, handleCustomEvent as EventListener);
    };
  }, [readStreaks, stableFriendIds]);

  return streaksByFriend;
};
