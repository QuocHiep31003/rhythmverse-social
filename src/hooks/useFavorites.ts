import { useCallback, useEffect, useMemo, useState } from "react";
import { favoritesApi, FavoriteError } from "@/services/api/favoritesApi";
import { toast } from "@/hooks/use-toast";
import { getAuthToken } from "@/services/api/config";

type ResourceKey = "song" | "playlist" | "album";

const resourceLabels: Record<ResourceKey, string> = {
  song: "bài hát",
  playlist: "playlist",
  album: "album",
};

const caches: Record<ResourceKey, Map<number, boolean>> = {
  song: new Map(),
  playlist: new Map(),
  album: new Map(),
};

const apiByResource = {
  song: {
    status: favoritesApi.getSongStatus,
    add: favoritesApi.addSong,
    remove: favoritesApi.removeSong,
  },
  playlist: {
    status: favoritesApi.getPlaylistStatus,
    add: favoritesApi.savePlaylist,
    remove: favoritesApi.removePlaylist,
  },
  album: {
    status: favoritesApi.getAlbumStatus,
    add: favoritesApi.saveAlbum,
    remove: favoritesApi.removeAlbum,
  },
};

export interface FavoriteHookOptions {
  resourceLabel?: string;
  disableToast?: boolean;
}

export interface FavoriteHookResult {
  isFavorite: boolean;
  loading: boolean;
  pending: boolean;
  error: string | null;
  toggleFavorite: () => Promise<boolean>;
  refreshStatus: () => Promise<boolean>;
  setFavoriteLocally: (value: boolean) => void;
}

const parseNumericId = (value?: number | string | null) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const useFavorite = (
  resource: ResourceKey,
  rawId?: number | string | null,
  options?: FavoriteHookOptions
): FavoriteHookResult => {
  const resolvedId = useMemo(() => parseNumericId(rawId), [rawId]);
  const label = options?.resourceLabel ?? resourceLabels[resource];
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState<boolean>(Boolean(resolvedId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedId) {
      setIsFavorite(false);
      setLoading(false);
      return;
    }
    
    // ✅ Nếu chưa đăng nhập, set isFavorite = false và không gọi API, không hiển thị lỗi
    const token = getAuthToken();
    if (!token) {
      setIsFavorite(false);
      setLoading(false);
      setError(null);
      // Không set vào cache để khi đăng nhập có thể check lại
      return;
    }
    
    const cacheValue = caches[resource].get(resolvedId);
    if (cacheValue !== undefined) {
      setIsFavorite(cacheValue);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiByResource[resource]
      .status(resolvedId)
      .then((value) => {
        if (cancelled) return;
        caches[resource].set(resolvedId, value);
        setIsFavorite(value);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        // Lỗi 400 hoặc 404 có nghĩa là không phải favorite (trạng thái hợp lệ)
        const isNotFound = err instanceof FavoriteError && (err.status === 400 || err.status === 404);
        if (isNotFound) {
          caches[resource].set(resolvedId, false);
          setIsFavorite(false);
          setError(null);
          return;
        }
        // ✅ Lỗi 401 (Unauthorized) - chưa đăng nhập, không hiển thị toast
        const isUnauthorized = err instanceof FavoriteError && err.status === 401;
        if (isUnauthorized) {
          caches[resource].set(resolvedId, false);
          setIsFavorite(false);
          setError(null);
          // Không hiển thị toast cho lỗi 401
          return;
        }
        const message =
          err instanceof FavoriteError
            ? err.message || "Không thể tải trạng thái yêu thích"
            : (err as Error)?.message ?? "Không thể tải trạng thái yêu thích";
        setError(message);
        if (!options?.disableToast) {
          showToast("Không thể tải trạng thái yêu thích", message, "destructive");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resource, resolvedId]);

  const showToast = useCallback(
    (title: string, description?: string, variant?: "destructive") => {
      if (options?.disableToast) return;
      toast({
        title,
        description,
        variant,
      });
    },
    [options?.disableToast]
  );

  const toggleFavorite = useCallback(async () => {
    if (!resolvedId || pending) return false;
    
    // ✅ Nếu chưa đăng nhập, không làm gì cả (nút chỉ để hiển thị cho vui)
    const token = getAuthToken();
    if (!token) {
      // Không hiển thị toast, chỉ return false
      return false;
    }
    
    const next = !isFavorite;
    setIsFavorite(next);
    caches[resource].set(resolvedId, next);
    setPending(true);
    try {
      if (next) {
        await apiByResource[resource].add(resolvedId);
        showToast("Đã lưu vào thư viện", `Đã thêm ${label} này vào favorites`);
      } else {
        await apiByResource[resource].remove(resolvedId);
        showToast("Đã gỡ khỏi thư viện", `Đã gỡ ${label} khỏi favorites`);
      }
      setError(null);
      // Invalidate cache để các component khác cũng update
      caches[resource].set(resolvedId, next);
      setIsFavorite(next);
      return true;
    } catch (err) {
      const status = err instanceof FavoriteError ? err.status : undefined;
      // ✅ Lỗi 401 (Unauthorized) - chưa đăng nhập, revert state và không hiển thị toast
      if (status === 401) {
        setIsFavorite(!next);
        caches[resource].set(resolvedId, !next);
        setError(null);
        // Không hiển thị toast cho lỗi 401
        return false;
      }
      if (!next && status === 400) {
        // Treat 400 removal errors as already removed / inaccessible
        caches[resource].set(resolvedId, false);
        setIsFavorite(false);
        setError(null);
        showToast(
          "Đã gỡ khỏi thư viện",
          `${label.charAt(0).toUpperCase() + label.slice(1)} này đã được gỡ hoặc bạn không còn quyền truy cập.`,
        );
        return true;
      }

      const message =
        err instanceof FavoriteError
          ? err.message ||
            (next
              ? `Không thể lưu ${label} này`
              : `Không thể gỡ ${label} khỏi favorites`)
          : (err as Error)?.message ??
            (next
              ? `Không thể lưu ${label} này`
              : `Không thể gỡ ${label} khỏi favorites`);

      setIsFavorite(!next);
      caches[resource].set(resolvedId, !next);
      showToast(
        next ? "Không thể lưu nội dung này" : "Không thể gỡ nội dung này",
        message,
        "destructive"
      );
      setError(message);
      return false;
    } finally {
      setPending(false);
    }
  }, [isFavorite, label, pending, resolvedId, resource, showToast]);

  const refreshStatus = useCallback(async () => {
    if (!resolvedId) return false;
    
    // ✅ Nếu chưa đăng nhập, set isFavorite = false và không gọi API
    const token = getAuthToken();
    if (!token) {
      setIsFavorite(false);
      setError(null);
      // Không set vào cache để khi đăng nhập có thể check lại
      return false;
    }
    
    setLoading(true);
    try {
      const value = await apiByResource[resource].status(resolvedId);
      caches[resource].set(resolvedId, value);
      setIsFavorite(value);
      setError(null);
      return value;
    } catch (err) {
      // Lỗi 400 có thể là do item không còn là favorite (trạng thái hợp lệ)
      const isNotFound = err instanceof FavoriteError && err.status === 400;
      if (isNotFound) {
        // Set favorite state thành false và không hiển thị toast
        caches[resource].set(resolvedId, false);
        setIsFavorite(false);
        setError(null);
        return false;
      }
      // ✅ Lỗi 401 (Unauthorized) - chưa đăng nhập, không hiển thị toast
      const isUnauthorized = err instanceof FavoriteError && err.status === 401;
      if (isUnauthorized) {
        caches[resource].set(resolvedId, false);
        setIsFavorite(false);
        setError(null);
        // Không hiển thị toast cho lỗi 401
        return false;
      }
      const message =
        err instanceof FavoriteError
          ? err.message || "Không thể tải trạng thái yêu thích"
          : (err as Error)?.message ?? "Không thể tải trạng thái yêu thích";
      setError(message);
      // Chỉ hiển thị toast nếu không phải lỗi 400 (not found) hoặc 401 (unauthorized)
      if (!options?.disableToast) {
        showToast("Không thể tải trạng thái yêu thích", message, "destructive");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [resolvedId, resource, showToast, options]);

  const setFavoriteLocally = useCallback(
    (value: boolean) => {
      if (!resolvedId) return;
      caches[resource].set(resolvedId, value);
      setIsFavorite(value);
    },
    [resolvedId, resource]
  );

  return {
    isFavorite,
    loading,
    pending,
    error,
    toggleFavorite,
    refreshStatus,
    setFavoriteLocally,
  };
};

export const useFavoriteSong = (
  songId?: number | string | null,
  options?: FavoriteHookOptions
) => useFavorite("song", songId, options);

export const useFavoritePlaylist = (
  playlistId?: number | string | null,
  options?: FavoriteHookOptions
) => useFavorite("playlist", playlistId, options);

export const useFavoriteAlbum = (
  albumId?: number | string | null,
  options?: FavoriteHookOptions
) => useFavorite("album", albumId, options);



