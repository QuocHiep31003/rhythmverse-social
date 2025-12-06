 
import { useCallback, useEffect, useRef, useState } from "react";
import { STREAK_STORAGE_EVENT, StreakStorageEventDetail } from "@/constants/streak";
import { chatStreakApi, ChatStreakDTO } from "@/services/api/chatStreakApi";
import {
  clearStreakCache,
  isCacheStale,
  readStreakCache,
  writeStreakCache,
} from "@/utils/streakCache";

const CACHE_TTL_MS = 30_000;
const EXPIRING_THRESHOLD_MS = 4 * 60 * 60 * 1000;

interface UseStreakManagerOptions {
  friendName?: string;
  onStreakWarning?: (friendName: string, hoursRemaining: number) => void;
  onStreakExpired?: (friendName: string) => void;
  onStreakStarted?: (friendName: string, currentStreak: number) => void;
}

export interface StreakState {
  streak: number;
  expireAt: number | null;
  lastInteraction: string | null;
  isActive: boolean;
}

type StreakEventDetail = StreakStorageEventDetail;

export const emptyStreakState: StreakState = {
  streak: 0,
  expireAt: null,
  lastInteraction: null,
  isActive: false,
};

export const mapDtoToStreakState = (dto: ChatStreakDTO | null): StreakState => {
  if (!dto) return { ...emptyStreakState };
  const streak = dto.streak ?? dto.currentStreakCount ?? 0;
  const expireAt = dto.expireAt ?? null;
  const lastInteraction = dto.lastInteraction ?? dto.lastInteractionDate ?? null;
  return { streak, expireAt, lastInteraction, isActive: dto.isActive };
};

const emitEvent = (detail: StreakEventDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STREAK_STORAGE_EVENT, { detail }));
};

export const useStreakManager = (
  friendId: string | null,
  options?: UseStreakManagerOptions,
) => {
  const [state, setState] = useState<StreakState>(emptyStreakState);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedExpireAt, setCachedExpireAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const previousStateRef = useRef<StreakState>(emptyStreakState);
  const warningKeyRef = useRef<string | null>(null);
  const expiredRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const friendLabel = options?.friendName || friendId || "bạn";

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const applyState = useCallback(
    (next: StreakState, source: "fetch" | "increment" = "fetch") => {
      const prev = previousStateRef.current;
      
      // Nếu đây là lần đầu load (prev chưa được khởi tạo), chỉ cập nhật state, không trigger events
      const isInitialLoad = prev.streak === 0 && prev.expireAt === null && prev.lastInteraction === null && !prev.isActive;
      
      previousStateRef.current = next;
      setState(next);

      // Bỏ qua tất cả events nếu đây là lần đầu load (tránh hiển thị messages không mong muốn)
      if (isInitialLoad && source === "fetch") {
        // Chỉ cập nhật refs để track state, không trigger callbacks
        if (next.streak > 0 && next.isActive) {
          expiredRef.current = false;
          const expireAt = next.expireAt;
          if (expireAt) {
            const now = Date.now();
            const hoursRemaining = Math.ceil((expireAt - now) / (1000 * 60 * 60));
            if (hoursRemaining > 0 && hoursRemaining <= 4) {
              const key = `${friendId ?? "friend"}:${next.lastInteraction ?? "none"}:${expireAt}`;
              warningKeyRef.current = key;
            } else {
              warningKeyRef.current = null;
            }
          }
        }
        return;
      }

      const expireAt = next.expireAt;
      const now = Date.now();
      
      // Kiểm tra expired trước (khi expireAt <= now hoặc streak về 0)
      if (expireAt !== null && expireAt <= now) {
        if (!expiredRef.current && prev.streak > 0) {
          expiredRef.current = true;
          options?.onStreakExpired?.(friendLabel);
        }
        warningKeyRef.current = null;
        return;
      }

      // Kiểm tra streak về 0 hoặc isActive = false (chỉ khi trước đó có streak)
      // KHÔNG trigger nếu đây là lần đầu load và streak = 0 (có thể do chưa có streak hoặc đã unfriend)
      if (
        options?.onStreakExpired &&
        !expiredRef.current &&
        prev.streak > 0 &&
        (next.streak === 0 || !next.isActive) &&
        !isInitialLoad // Không trigger expired khi load lần đầu
      ) {
        expiredRef.current = true;
        options.onStreakExpired(friendLabel);
        warningKeyRef.current = null;
        return;
      }

      // Reset expired flag nếu streak đang active và chưa hết hạn
      if (next.streak > 0 && next.isActive && (expireAt === null || expireAt > now)) {
        expiredRef.current = false;
      }

      // Kiểm tra streak started: chỉ khi từ 0 -> >0 và không phải lần đầu load
      const streakIncreased = next.streak > prev.streak;
      if (options?.onStreakStarted && streakIncreased && prev.streak === 0 && next.streak > 0 && !isInitialLoad) {
        options.onStreakStarted(friendLabel, next.streak);
      }

      // Kiểm tra warning: chỉ khi streak > 0, isActive = true, và còn <= 4 giờ
      // Chỉ trigger warning khi có thay đổi về expireAt hoặc lastInteraction
      if (next.streak > 0 && next.isActive && expireAt && expireAt > now) {
        const hoursRemaining = Math.ceil((expireAt - now) / (1000 * 60 * 60));
        if (hoursRemaining > 0 && hoursRemaining <= 4) {
          const key = `${friendId ?? "friend"}:${next.lastInteraction ?? "none"}:${expireAt}`;
          // Chỉ trigger warning nếu key thay đổi (tránh trigger lại khi refresh)
          if (warningKeyRef.current !== key) {
            warningKeyRef.current = key;
            // Chỉ trigger warning nếu không phải lần đầu load hoặc có thay đổi thực sự
            if (!isInitialLoad || prev.expireAt !== expireAt) {
              options?.onStreakWarning?.(friendLabel, hoursRemaining);
            }
          }
        } else {
          warningKeyRef.current = null;
        }
      } else {
        warningKeyRef.current = null;
      }
    },
    [friendId, friendLabel, options],
  );

  const saveCache = useCallback(
    (expireAt: number | null) => {
      if (!friendId) return;
      writeStreakCache(friendId, expireAt);
      setCachedExpireAt(expireAt);
    },
    [friendId],
  );

  const refreshFromServer = useCallback(
    async (silent = false) => {
      if (!friendId) return;
      // Validate friendId is a valid number (not a playlist room like "pl_123")
      const friendIdNum = Number(friendId);
      if (!Number.isFinite(friendIdNum)) {
        // Invalid friendId (e.g., playlist room), skip API call
        return;
      }
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      if (!silent) setIsLoading(true);
      try {
        const dto = await chatStreakApi.getBetween(friendIdNum);
        const next = mapDtoToStreakState(dto);
        applyState(next);
        saveCache(next.expireAt);
        emitEvent({ friendId, type: "updated", payload: next });
      } catch (error) {
        // Don't log error if it's a 404 (no streak exists yet) - this is normal
        // Also don't log "Invalid friend id" errors as they're expected for playlist rooms
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("404") &&
          !errorMessage.includes("Not Found") &&
          !errorMessage.includes("Invalid friend id")
        ) {
          console.error("[useStreakManager] Failed to refresh streak:", error);
        }
        const fallback = { ...emptyStreakState };
        applyState(fallback);
        clearStreakCache(friendId);
        emitEvent({ friendId, type: "updated", payload: fallback });
      } finally {
        isRefreshingRef.current = false;
        if (!silent) setIsLoading(false);
      }
    },
    [applyState, friendId, saveCache],
  );

  const notifyInteraction = useCallback(async () => {
    if (!friendId) return;
    // Validate friendId is a valid number (not a playlist room like "pl_123")
    const friendIdNum = Number(friendId);
    if (!Number.isFinite(friendIdNum)) {
      // Invalid friendId (e.g., playlist room), skip API call
      return;
    }
    try {
      const dto = await chatStreakApi.increment(friendIdNum);
      const next = mapDtoToStreakState(dto);
      applyState(next, "increment");
      saveCache(next.expireAt);
      emitEvent({ friendId, type: "updated", payload: next });
    } catch (error) {
      console.error("[useStreakManager] Failed to increment streak:", error);
      throw error;
    }
  }, [applyState, friendId, saveCache]);

  const forceRefresh = useCallback(async () => {
    if (!friendId) return;
    clearStreakCache(friendId);
    setCachedExpireAt(null);
    await refreshFromServer();
  }, [friendId, refreshFromServer]);

  useEffect(() => {
    if (!friendId) {
      setState({ ...emptyStreakState });
      setCachedExpireAt(null);
      return;
    }

    // Validate friendId is a valid number (not a playlist room like "pl_123")
    const friendIdNum = Number(friendId);
    if (!Number.isFinite(friendIdNum)) {
      // Invalid friendId (e.g., playlist room), reset state and skip API call
      setState({ ...emptyStreakState });
      setCachedExpireAt(null);
      return;
    }

    const cache = readStreakCache(friendId);
    setCachedExpireAt(cache?.expireAt ?? null);
    if (isCacheStale(cache, CACHE_TTL_MS)) {
      refreshFromServer(true);
    }
  }, [friendId, refreshFromServer]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<StreakEventDetail>;
      if (!custom.detail) return;
      
      // Debug log to check if event is received
      if (custom.detail.friendId === friendId) {
        console.log("[useStreakManager] Received streak event for friendId:", friendId, "type:", custom.detail.type);
      }
      
      if (custom.detail.friendId !== friendId) return;
      if (custom.detail.type === "invalidate") {
        refreshFromServer(true);
        return;
      }
      if (custom.detail.type === "updated" && custom.detail.payload) {
        console.log("[useStreakManager] Updating streak state:", custom.detail.payload.streak);
        applyState(custom.detail.payload);
        saveCache(custom.detail.payload.expireAt ?? null);
      }
    };
    window.addEventListener(STREAK_STORAGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(STREAK_STORAGE_EVENT, handler as EventListener);
  }, [applyState, friendId, refreshFromServer, saveCache]);

  const effectiveExpireAt = state.expireAt ?? cachedExpireAt ?? null;
  const millisUntilExpire = effectiveExpireAt ? effectiveExpireAt - nowTick : null;
  const isExpired = millisUntilExpire !== null && millisUntilExpire <= 0;
  const isExpiringSoon =
    millisUntilExpire !== null &&
    millisUntilExpire > 0 &&
    millisUntilExpire <= EXPIRING_THRESHOLD_MS;
  const hoursRemaining =
    millisUntilExpire !== null ? Math.max(0, Math.ceil(millisUntilExpire / (1000 * 60 * 60))) : null;

  return {
    streak: state.streak,
    expireAt: effectiveExpireAt,
    lastInteraction: state.lastInteraction,
    isActive: state.isActive,
    isExpired,
    isExpiringSoon,
    hoursRemaining,
    isLoading,
    refreshFromServer,
    forceRefresh,
    notifyInteraction,
  };
};
