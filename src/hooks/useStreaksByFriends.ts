import { useCallback, useEffect, useMemo, useState } from "react";
import { STREAK_STORAGE_EVENT, StreakStorageEventDetail } from "@/constants/streak";
import { chatStreakApi } from "@/services/api/chatStreakApi";
import { mapDtoToStreakState, StreakState } from "@/hooks/useStreakManager";

interface FriendStreakSummary {
  streak: number;
  expireAt: number | null;
}

const getCurrentUserId = () => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Hook đọc trạng thái streak cho danh sách friends từ backend
 */
export const useStreaksByFriends = (friendIds: string[]) => {
  const stableFriendIds = useMemo(() => {
    const unique = Array.from(new Set(friendIds.filter(Boolean)));
    unique.sort();
    return unique;
  }, [friendIds]);

  const [streaksByFriend, setStreaksByFriend] = useState<Record<string, FriendStreakSummary>>({});

  const syncFromServer = useCallback(async () => {
    if (!stableFriendIds.length) {
      setStreaksByFriend({});
      return;
    }
    try {
      const selfId = getCurrentUserId();
      const dtos = await chatStreakApi.getActive();
      const next: Record<string, FriendStreakSummary> = {};
      dtos.forEach((dto) => {
        const otherId =
          selfId && dto.user1Id === selfId
            ? dto.user2Id
            : dto.user2Id === selfId
              ? dto.user1Id
              : null;
        if (!otherId) {
          // fallback: if selfId unavailable, assume user2Id is friend
          const fallbackId = dto.user2Id !== dto.user1Id ? dto.user2Id : dto.user1Id;
          const key = String(fallbackId);
          if (stableFriendIds.includes(key)) {
            const mapped = mapDtoToStreakState(dto);
            next[key] = { streak: mapped.streak, expireAt: mapped.expireAt };
          }
          return;
        }
        const key = String(otherId);
        if (!stableFriendIds.includes(key)) return;
        const mapped = mapDtoToStreakState(dto);
        next[key] = { streak: mapped.streak, expireAt: mapped.expireAt };
      });
      setStreaksByFriend((prev) => {
        // preserve entries for friends not returned by backend (set to zero)
        const merged: Record<string, FriendStreakSummary> = {};
        stableFriendIds.forEach((id) => {
          merged[id] = next[id] ?? { streak: 0, expireAt: null };
        });
        return merged;
      });
    } catch (error) {
      console.error("[useStreaksByFriends] Failed to sync streaks:", error);
    }
  }, [stableFriendIds]);

  useEffect(() => {
    syncFromServer();
  }, [syncFromServer]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakStorageEventDetail>).detail;
      if (!detail?.friendId || !stableFriendIds.includes(detail.friendId)) return;
      if (detail.type === "invalidate") {
        void syncFromServer();
        return;
      }
      if (detail.type === "updated" && detail.payload) {
        setStreaksByFriend((prev) => ({
          ...prev,
          [detail.friendId!]: {
            streak: detail.payload!.streak,
            expireAt: detail.payload!.expireAt ?? null,
          },
        }));
      }
    };

    window.addEventListener(STREAK_STORAGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(STREAK_STORAGE_EVENT, handler as EventListener);
  }, [stableFriendIds, syncFromServer]);

  return streaksByFriend;
};
