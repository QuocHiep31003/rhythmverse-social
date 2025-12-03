const CACHE_PREFIX = 'streak:';

export interface StreakCacheEntry {
  expireAt: number | null;
  lastFetchedAt: number;
}

const getCacheKey = (friendId: string) => `${CACHE_PREFIX}${friendId}`;

export const readStreakCache = (friendId?: string | null): StreakCacheEntry | null => {
  if (!friendId) return null;
  try {
    const raw = localStorage.getItem(getCacheKey(friendId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StreakCacheEntry>;
    if (!parsed || typeof parsed.lastFetchedAt !== 'number') return null;
    return {
      expireAt: typeof parsed.expireAt === 'number' ? parsed.expireAt : null,
      lastFetchedAt: parsed.lastFetchedAt,
    };
  } catch {
    return null;
  }
};

export const writeStreakCache = (friendId?: string | null, expireAt: number | null = null) => {
  if (!friendId) return;
  const payload: StreakCacheEntry = {
    expireAt,
    lastFetchedAt: Date.now(),
  };
  try {
    localStorage.setItem(getCacheKey(friendId), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
};

export const clearStreakCache = (friendId?: string | null) => {
  if (!friendId) return;
  try {
    localStorage.removeItem(getCacheKey(friendId));
  } catch {
    // ignore
  }
};

export const isCacheStale = (entry: StreakCacheEntry | null, ttlMs: number) => {
  if (!entry) return true;
  return Date.now() - entry.lastFetchedAt > ttlMs;
};

