import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Music, 
  Plus, 
  Search, 
  Heart, 
  Play, 
  Users,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, PlaylistLibraryItemDTO } from "@/services/api/playlistApi";
import { authApi } from "@/services/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { PlaylistFormDialog } from "@/components/admin/PlaylistFormDialog";
import { friendsApi } from "@/services/api/friendsApi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CollaboratorRole, PlaylistVisibility } from "@/types/playlist";
import type { PlaylistItem, UserResponse, SongDTO, FriendDTO, PlaylistFormValues } from "@/types/playlistLibrary";
import { toSeconds, formatTotal, parseDateSafe, createSlug } from "@/utils/playlistUtils";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { favoritesApi, FavoriteSongDTO, FavoritePlaylistDTO, FavoriteAlbumDTO, FavoriteError } from "@/services/api/favoritesApi";
import { AlbumCard } from "@/components/AlbumCard";
import { useFavoriteAlbum, useFavoritePlaylist } from "@/hooks/useFavorites";

const toPlaylistItemFromFavorite = (dto: FavoritePlaylistDTO): PlaylistItem => {
  const cover =
    dto.coverUrl ||
    (dto as PlaylistDTO & { urlImagePlaylist?: string }).urlImagePlaylist ||
    "";
  const songCount = Array.isArray(dto.songIds)
    ? dto.songIds.length
    : (dto as { songCount?: number }).songCount ?? 0;
  const totalDuration = (dto as { totalDuration?: string }).totalDuration ?? "--";
  const updatedAt =
    (dto as { updatedAt?: string }).updatedAt ??
    dto.dateUpdate ??
    (dto as { createdAt?: string }).createdAt ??
    null;

  return {
    id: String(dto.id),
    title: dto.name ?? "Playlist",
    description: dto.description ?? "",
    cover,
    songCount,
    totalDuration,
    isPublic: dto.visibility === PlaylistVisibility.PUBLIC,
    visibility: dto.visibility ?? null,
    likes: (dto as { likes?: number }).likes ?? 0,
    createdAt: (dto as { createdAt?: string }).createdAt ?? null,
    updatedAt,
    ownerId: dto.ownerId,
    ownerName: dto.ownerName ?? dto.owner?.name,
    ownerAvatar: dto.ownerAvatar ?? (dto.owner as { avatar?: string | null })?.avatar ?? null,
    isOwner: false,
    isCollaborator: false,
  };
};

type PlaylistCardLayout = "grid" | "carousel";

const PlaylistCardWithFavoriteInLibrary = ({ 
  playlist, 
  onPlay,
  formatNumber,
  getCollaboratorBadgeText,
  playlistMeta,
  duration,
  onDelete,
  onRemove,
  layout = "carousel",
}: { 
  playlist: PlaylistItem;
  onPlay?: (playlist: PlaylistItem) => void;
  formatNumber?: (num: number) => string;
  getCollaboratorBadgeText?: (role?: import("@/types/playlist").CollaboratorRole) => string;
  playlistMeta?: { songCount?: number; updatedAt?: string | null; visibility?: import("@/types/playlist").PlaylistVisibility | string | null };
  duration?: string;
  onDelete?: () => void;
  onRemove?: () => void;
  layout?: PlaylistCardLayout;
}) => {
  const numericId = Number(playlist.id);
  const favoriteHook = useFavoritePlaylist(Number.isFinite(numericId) ? numericId : undefined, { disableToast: false });
  
  const defaultFormatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  const defaultGetCollaboratorBadgeText = (role?: import("@/types/playlist").CollaboratorRole) => {
    if (role === "EDITOR") return "Editor";
    if (role === "VIEWER") return "Viewer";
    return "Collaborator";
  };
  
  const handleToggle = async () => {
    const wasFavorite = favoriteHook.isFavorite;
    const success = await favoriteHook.toggleFavorite();
    // Nếu đang bỏ thích và có callback, gọi để remove khỏi danh sách
    if (wasFavorite && success && onRemove) {
      onRemove();
    }
  };
  
  const containerClass =
    layout === "grid"
      ? "snap-start w-full"
      : "snap-start min-w-[240px] max-w-[260px]";

  return (
    <div className={containerClass}>
      <PlaylistCard
        playlist={playlist}
        playlistMeta={playlistMeta}
        duration={duration || playlist.totalDuration}
        isLiked={favoriteHook.isFavorite}
        likePending={favoriteHook.pending}
        onLike={handleToggle}
        onPlay={onPlay ? () => onPlay(playlist) : undefined}
        onDelete={onDelete}
        getCollaboratorBadgeText={getCollaboratorBadgeText || defaultGetCollaboratorBadgeText}
        formatNumber={formatNumber || defaultFormatNumber}
      />
    </div>
  );
};

const FavoriteAlbumCard = ({
  album,
  onRemove,
}: {
  album: FavoriteAlbumDTO;
  onRemove: () => void;
}) => {
  const albumNumericId = useMemo(() => {
    if (typeof album.id === "number" && Number.isFinite(album.id)) return album.id;
    if (typeof album.id === "string") {
      const parsed = Number(album.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }, [album.id]);
  
  const favoriteHook = useFavoriteAlbum(albumNumericId, { disableToast: false });
  
  // Đảm bảo card hiển thị là đã thích ngay khi render danh sách
  useEffect(() => {
    if (albumNumericId) {
      favoriteHook.setFavoriteLocally(true);
    }
  }, [albumNumericId, favoriteHook]);
  
  const handleToggleFavorite = useCallback(async () => {
    if (!albumNumericId) return;
    const wasFavorite = favoriteHook.isFavorite;
    const success = await favoriteHook.toggleFavorite();
    if (wasFavorite && success) {
      onRemove();
    }
  }, [albumNumericId, favoriteHook, onRemove]);
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  return (
    <AlbumCard
      album={{
        id: album.id,
        name: album.name,
        artistName: album.artistName,
        coverUrl: album.coverUrl,
        songCount: album.songCount,
        totalDuration: album.totalDuration,
        likes: album.likes,
        releaseDate: album.releaseDate,
        releaseYear: album.releaseDate ? new Date(album.releaseDate).getFullYear() : undefined,
      }}
      formatNumber={formatNumber}
      favoriteState={{
        isFavorite: favoriteHook.isFavorite,
        pending: favoriteHook.pending,
        onToggle: handleToggleFavorite,
      }}
    />
  );
};

const PlaylistLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [likedPlaylists, setLikedPlaylists] = useState<string[]>([]);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [playlistMeta, setPlaylistMeta] = useState<Record<string, { songCount?: number; updatedAt?: string | null; visibility?: PlaylistVisibility | string | null }>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [selected, setSelected] = useState<PlaylistItem | null>(null);
  const [editDefaults, setEditDefaults] = useState<PlaylistFormValues | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: number; name: string; avatar?: string | null }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [favoriteSongsPreview, setFavoriteSongsPreview] = useState<FavoriteSongDTO[]>([]);
  const [favoriteSongsTotal, setFavoriteSongsTotal] = useState(0);
  const [favoritePlaylists, setFavoritePlaylists] = useState<FavoritePlaylistDTO[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<FavoriteAlbumDTO[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let me: number | undefined;
        try {
          const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
          me = rawUserId ? Number(rawUserId) : undefined;
          if (!Number.isFinite(me as number)) me = undefined;
          if (!me) {
            const meResp = await authApi.me().catch(() => undefined) as UserResponse | undefined;
            const uid = meResp && (meResp.id || meResp.userId);
            if (uid) {
              me = Number(uid);
              try { localStorage.setItem('userId', String(uid)); } catch { void 0; }
            }
          }
        } catch { me = undefined; }
        
        let libraryItems: PlaylistLibraryItemDTO[] = [];
        if (Number.isFinite(me as number)) {
          try {
            libraryItems = await playlistsApi.library();
          } catch (e) {
            console.warn('Library endpoint failed, falling back to getByUser:', e);
            const page = await playlistsApi.getByUser(me as number, {
              page: 0,
              size: 24,
              sort: "dateUpdate,desc",
              search: searchQuery || undefined,
            });
            const currentUserId = Number(me);
            libraryItems = (page.content || []).map((p: PlaylistDTO) => {
              const ownerId =
                typeof p.ownerId === "number"
                  ? p.ownerId
                  : typeof p.owner?.id === "number"
                  ? p.owner.id
                  : currentUserId;
              const songsCount = Array.isArray(p.songs)
                ? p.songs.length
                : Array.isArray(p.songIds)
                ? p.songIds.length
                : undefined;
              const rawRoleValue = (p as { role?: string | null }).role;
              const normalizedRoleValue =
                typeof rawRoleValue === "string"
                  ? (rawRoleValue.toUpperCase() as "OWNER" | "EDITOR" | "VIEWER")
                  : null;
              return {
                playlistId: p.id,
                name: p.name,
                coverUrl: p.coverUrl || null,
                ownerId,
                ownerName: p.ownerName ?? p.owner?.name,
                ownerAvatar: p.ownerAvatar ?? (p.owner as { avatar?: string | null })?.avatar ?? null,
                // Note: Nếu ownerAvatar vẫn null, có thể cần fetch từ user API (sẽ làm sau nếu cần)
                isOwner: ownerId === currentUserId,
                isCollaborator: ownerId !== currentUserId,
                role: normalizedRoleValue,
                description: p.description ?? null,
                visibility: p.visibility ?? null,
                songCount: songsCount,
                totalDuration: (p as { totalDuration?: string }).totalDuration,
                likes: (p as { likes?: number }).likes,
                createdAt: (p as { createdAt?: string }).createdAt ?? undefined,
                updatedAt: p.dateUpdate ?? (p as { updatedAt?: string }).updatedAt ?? undefined,
              };
            });
          }
        } else {
          const page = await playlistsApi.getAll({ page: 0, size: 24, sort: "dateUpdate,desc", search: searchQuery || undefined });
          libraryItems = (page.content || []).map((p: PlaylistDTO) => ({
            playlistId: p.id,
            name: p.name,
            coverUrl: p.coverUrl || null,
            ownerId: p.ownerId ?? p.owner?.id ?? 0,
            ownerName: p.ownerName ?? p.owner?.name,
            ownerAvatar: p.ownerAvatar ?? (p.owner as { avatar?: string | null })?.avatar ?? null,
            isOwner: false,
            isCollaborator: false,
            role: null,
            description: p.description ?? null,
            visibility: p.visibility ?? null,
            songCount: Array.isArray(p.songs) ? p.songs.length : undefined,
            totalDuration: (p as { totalDuration?: string }).totalDuration,
            likes: (p as { likes?: number }).likes,
            createdAt: (p as { createdAt?: string }).createdAt ?? undefined,
            updatedAt: p.dateUpdate ?? (p as { updatedAt?: string }).updatedAt ?? undefined,
          }));
        }

        let filtered = libraryItems;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
        }
        
        if (sortBy === 'name') {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else {
          filtered.sort((a, b) => b.playlistId - a.playlistId);
        }

        const currentUserId =
          typeof me === 'number' && Number.isFinite(me) ? Number(me) : undefined;

        const mapped = filtered.map((p: PlaylistLibraryItemDTO) => {
          const ownerIdRaw =
            typeof p.ownerId === 'number' && Number.isFinite(p.ownerId) ? p.ownerId : undefined;
          const rawRole = typeof p.role === 'string' ? p.role.toUpperCase() : undefined;
          const collaboratorRole =
            rawRole === CollaboratorRole.EDITOR || rawRole === CollaboratorRole.VIEWER
              ? (rawRole as CollaboratorRole)
              : undefined;
          const visibilityRaw =
            (p as { visibility?: PlaylistVisibility | string | null }).visibility ?? null;
          const normalizedVisibility =
            typeof visibilityRaw === 'string'
              ? (visibilityRaw.toUpperCase() as PlaylistVisibility)
              : undefined;

          const isOwnerByFlag = p.isOwner === true || rawRole === 'OWNER';
          const isOwnerById =
            !isOwnerByFlag &&
            currentUserId !== undefined &&
            ownerIdRaw !== undefined &&
            ownerIdRaw === currentUserId &&
            collaboratorRole == null;
          const isOwner = isOwnerByFlag || isOwnerById;

          let isCollaborator =
            p.isCollaborator === true ||
            rawRole === 'COLLABORATOR' ||
            collaboratorRole != null ||
            (currentUserId !== undefined &&
              ownerIdRaw !== undefined &&
              ownerIdRaw !== currentUserId);

          if (isOwner) {
            isCollaborator = false;
          }

          const resolvedOwnerId =
            ownerIdRaw ??
            (isOwner && currentUserId !== undefined ? currentUserId : undefined);

          const description =
            (p as { description?: string | null }).description?.trim() || '';
          const rawSongCount =
            (p as { songCount?: number | null; totalSongs?: number | null }).songCount ??
            (p as { songCount?: number | null; totalSongs?: number | null }).totalSongs ??
            null;
          const songCount =
            typeof rawSongCount === 'number' && Number.isFinite(rawSongCount) && rawSongCount >= 0
              ? rawSongCount
              : 0;
          const totalDuration =
            (p as { totalDuration?: string }).totalDuration ?? '--';
          const likes = (p as { likes?: number }).likes ?? 0;
          const createdAt = (p as { createdAt?: string | null }).createdAt ?? null;
          const updatedAt =
            (p as { updatedAt?: string | null }).updatedAt ??
            (p as { dateUpdate?: string | null }).dateUpdate ??
            null;
          const isPublicFlag =
            normalizedVisibility != null
              ? normalizedVisibility === PlaylistVisibility.PUBLIC
              : typeof (p as { isPublic?: boolean }).isPublic === 'boolean'
              ? (p as { isPublic?: boolean }).isPublic === true
              : null;

          return {
            id: String(p.playlistId),
            title: p.name,
            description,
            cover: p.coverUrl || '',
            songCount,
            totalDuration,
            isPublic: isPublicFlag,
            visibility: normalizedVisibility ?? (visibilityRaw ?? null),
            likes,
            createdAt,
            updatedAt,
            ownerId: resolvedOwnerId,
            ownerName: p.ownerName,
            isOwner,
            isCollaborator,
            role: collaboratorRole,
          } as PlaylistItem;
        });

        setPlaylists(mapped);
        
        const metaMap: Record<string, { songCount?: number; updatedAt?: string | null; visibility?: PlaylistVisibility | string | null }> = {};
        mapped.forEach((item) => {
          metaMap[item.id] = {
            songCount: item.songCount,
            updatedAt: item.updatedAt,
            visibility: item.visibility ?? null,
          };
        });
        setPlaylistMeta(metaMap);
      } catch (e) {
        console.error('Failed to load playlists:', e);
        setPlaylists([]);
        setPlaylistMeta({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchQuery, sortBy]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const ids = playlists.map(p => p.id);
        const res = await Promise.all(ids.map(async (id) => {
          try {
            const detail = await playlistsApi.getById(id);
            const secs = Array.isArray(detail.songs)
              ? detail.songs.reduce((acc: number, s: SongDTO) => acc + toSeconds(s.duration), 0)
              : 0;
            const songCount =
              Array.isArray(detail.songs)
                ? detail.songs.length
                : Array.isArray(detail.songIds)
                ? detail.songIds.length
                : undefined;
            const visibility =
              (detail as { visibility?: PlaylistVisibility | string | null }).visibility ?? null;
            const updatedAt =
              (detail as { updatedAt?: string | null }).updatedAt ??
              (detail as { dateUpdate?: string | null }).dateUpdate ??
              (detail as { createdAt?: string | null }).createdAt ??
              null;
            return {
              id,
              duration: formatTotal(secs),
              songCount,
              visibility,
              updatedAt,
            };
          } catch {
            return { id, duration: '--' };
          }
        }));
        if (!cancelled) {
          const durationMap: Record<string, string> = {};
          const metaMap: Record<
            string,
            { songCount?: number; updatedAt?: string | null; visibility?: PlaylistVisibility | string | null }
          > = {};
          res.forEach(({ id, duration, songCount, visibility, updatedAt }) => {
            durationMap[id] = duration;
            const nextMeta: { songCount?: number; updatedAt?: string | null; visibility?: PlaylistVisibility | string | null } = {};
            if (typeof songCount === 'number' && Number.isFinite(songCount)) {
              nextMeta.songCount = songCount;
            }
            if (typeof visibility === 'string' || visibility === null) {
              nextMeta.visibility = visibility;
            }
            if (typeof updatedAt === 'string' || updatedAt === null) {
              nextMeta.updatedAt = updatedAt;
            }
            if (Object.keys(nextMeta).length > 0) {
              metaMap[id] = nextMeta;
            }
          });
          setDurations(prev => ({ ...prev, ...durationMap }));
          if (Object.keys(metaMap).length > 0) {
            setPlaylistMeta(prev => {
              const next = { ...prev };
              Object.entries(metaMap).forEach(([id, meta]) => {
                next[id] = { ...(prev[id] ?? {}), ...meta };
              });
              return next;
            });
          }
        }
      } catch { void 0; }
    };
    if (playlists.length) run();
    return () => { cancelled = true; };
  }, [playlists]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const me = rawUserId ? Number(rawUserId) : undefined;
        if (!me) { setFriends([]); return; }
        const list = await friendsApi.getFriends(me);
        const mapped = Array.isArray(list)
          ? list.map((f: FriendDTO) => ({ 
              id: f.id ?? f.userId ?? f.friendId ?? 0, 
              name: f.name ?? f.username ?? f.email ?? `User ${f.id ?? f.userId ?? f.friendId ?? 0}`, 
              avatar: f.avatar || null 
            }))
          : [];
        const validFriends = mapped.filter(x => typeof x.id === 'number' && x.id > 0);
        setFriends(validFriends.map(x => ({ id: x.id, name: x.name, avatar: x.avatar ?? null })));
      } catch { setFriends([]); }
      finally { setLoadingFriends(false); }
    };
    if (collabOpen) fetchFriends();
  }, [collabOpen]);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const [songsRes, playlistsRes, albumsRes] = await Promise.all([
        favoritesApi.listSongs({ page: 0, size: 6, sort: "createdAt,desc" }).catch(() => ({
          content: [],
          totalElements: 0,
        })),
        favoritesApi.listPlaylists({ page: 0, size: 12, sort: "createdAt,desc" }).catch(() => ({
          content: [],
        })),
        favoritesApi.listAlbums({ page: 0, size: 12, sort: "createdAt,desc" }).catch(() => ({
          content: [],
        })),
      ]);
      setFavoriteSongsPreview(songsRes.content ?? []);
      setFavoriteSongsTotal(
        typeof songsRes.totalElements === "number"
          ? songsRes.totalElements
          : songsRes.content?.length ?? 0
      );
      setFavoritePlaylists(playlistsRes.content ?? []);
      setFavoriteAlbums(albumsRes.content ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách yêu thích";
      setFavoritesError(message);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const ownedPlaylists = useMemo(() => playlists.filter((playlist) => playlist.isOwner === true), [playlists]);
  const collabPlaylists = useMemo(() => playlists.filter((playlist) => playlist.isCollaborator === true), [playlists]);
  const favoritePlaylistItems = useMemo(
    () => favoritePlaylists.map((playlist) => toPlaylistItemFromFavorite(playlist)),
    [favoritePlaylists]
  );

  const filteredOwnedPlaylists = useMemo(() => {
    if (!normalizedSearch) return ownedPlaylists;
    return ownedPlaylists.filter((playlist) => {
      return (
        playlist.title.toLowerCase().includes(normalizedSearch) ||
        (playlist.description || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [ownedPlaylists, normalizedSearch]);

  const filteredCollabPlaylists = useMemo(() => {
    if (!normalizedSearch) return collabPlaylists;
    return collabPlaylists.filter((playlist) => {
      return (
        playlist.title.toLowerCase().includes(normalizedSearch) ||
        (playlist.description || '').toLowerCase().includes(normalizedSearch) ||
        (playlist.ownerName || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [collabPlaylists, normalizedSearch]);

  const toggleLike = (playlistId: string) => {
    setLikedPlaylists(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
    toast({
      title: likedPlaylists.includes(playlistId) ? "Removed from liked playlists" : "Added to liked playlists",
      duration: 2000,
    });
  };

  const playPlaylist = (playlist: PlaylistItem) => {
    toast({
      title: `Playing ${playlist.title}`,
      description: `${playlist.songCount} songs`,
      duration: 3000,
    });
  };

  const getCollaboratorBadgeText = (role?: CollaboratorRole) => {
    return "Collaborator";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const openEdit = async (pl: PlaylistItem) => {
    setSelected(pl);
    try {
      const detail = await playlistsApi.getById(pl.id);
      setEditDefaults({
        name: detail.name,
        description: detail.description || '',
        coverUrl: detail.coverUrl || (detail as PlaylistDTO & { urlImagePlaylist?: string }).urlImagePlaylist || '',
        isPublic: (detail.visibility || 'PUBLIC') === 'PUBLIC',
        songLimit: detail.songLimit ?? 500,
        songIds: Array.isArray(detail.songIds) ? detail.songIds : Array.isArray(detail.songs) ? detail.songs.map((s: { id?: number }) => s.id).filter((id): id is number => typeof id === 'number') : [],
      });
    } catch {
      setEditDefaults({
        name: pl.title,
        description: pl.description,
        coverUrl: pl.cover,
        isPublic: !!pl.isPublic,
        songLimit: 500,
        songIds: [],
      });
    } finally {
      setEditOpen(true);
    }
  };
  const openDelete = (pl: PlaylistItem) => { setSelected(pl); setDeleteOpen(true); };

  const handleSave = async (values: PlaylistFormValues) => {
    if (!selected) return;
    try {
      setIsSubmitting(true);
      await playlistsApi.update(selected.id, {
        name: values.name,
        description: values.description,
        coverUrl: values.coverUrl,
        visibility: values.isPublic ? "PUBLIC" : "PRIVATE",
        songLimit: values.songLimit,
        songIds: values.songIds || [],
      });
      toast({ title: "Updated", description: "Playlist saved" });
      setEditOpen(false);
      const rawUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const me = rawUserId ? Number(rawUserId) : NaN;
      const page = Number.isFinite(me)
        ? await playlistsApi.getByUser(me, { page: 0, size: 24 })
        : await playlistsApi.getAll({ page: 0, size: 24 });

      const currentUserId = Number.isFinite(me) ? Number(me) : undefined;
      const mapped = (page.content || []).map((p: PlaylistDTO) => {
        const ownerIdRaw =
          typeof p.ownerId === 'number'
            ? p.ownerId
            : typeof p.owner?.id === 'number'
            ? p.owner.id
            : undefined;
        const rawRole = (p as { role?: string | null }).role;
        const normalizedRole = typeof rawRole === 'string' ? rawRole.toUpperCase() : undefined;
        const collaboratorRole =
          normalizedRole === CollaboratorRole.EDITOR || normalizedRole === CollaboratorRole.VIEWER
            ? (normalizedRole as CollaboratorRole)
            : undefined;

        const isOwnerFlag =
          ownerIdRaw != null && currentUserId != null ? ownerIdRaw === currentUserId : false;
        const isOwner = isOwnerFlag || normalizedRole === 'OWNER';

        let isCollaborator =
          collaboratorRole != null ||
          (ownerIdRaw != null && currentUserId != null ? ownerIdRaw !== currentUserId : false);

        if (isOwner) {
          isCollaborator = false;
        }

        const resolvedOwnerId =
          ownerIdRaw ?? (isOwner && currentUserId != null ? currentUserId : undefined);

        const visibilityValue =
          p.visibility ??
          (p as { visibility?: PlaylistVisibility | string | null }).visibility ??
          null;
        const normalizedVisibility =
          typeof visibilityValue === 'string'
            ? (visibilityValue.toUpperCase() as PlaylistVisibility)
            : undefined;

        const songCount = Array.isArray(p.songs)
          ? p.songs.length
          : Array.isArray(p.songIds)
          ? p.songIds.length
          : 0;

        return {
          id: String(p.id),
          title: p.name,
          description: p.description || '',
          cover:
            p.coverUrl ||
            (p as PlaylistDTO & { urlImagePlaylist?: string }).urlImagePlaylist ||
            '',
          songCount,
          totalDuration: (p as { totalDuration?: string }).totalDuration ?? '--',
          isPublic:
            normalizedVisibility != null
              ? normalizedVisibility === PlaylistVisibility.PUBLIC
              : true,
          visibility: normalizedVisibility ?? null,
          likes: (p as { likes?: number }).likes ?? 0,
          createdAt: p.dateUpdate || (p as { createdAt?: string }).createdAt || '',
          updatedAt: p.dateUpdate || (p as { updatedAt?: string }).updatedAt || '',
          ownerId: resolvedOwnerId,
          ownerName: p.owner?.name,
          isOwner,
          isCollaborator,
          role: collaboratorRole,
        } as PlaylistItem;
      });

      const unique = new Map<string, PlaylistItem>();
      mapped.forEach((item) => {
        unique.set(item.id, item);
      });
      setPlaylists(Array.from(unique.values()));
    } catch (e) {
      toast({ title: "Error", description: "Failed to save playlist", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      setIsSubmitting(true);
      console.log("[PlaylistLibrary] Attempting to delete playlist:", selected.id);
      
      // Lấy thông tin playlist để xóa tất cả bài hát trước
      try {
        const playlistDetail = await playlistsApi.getById(selected.id);
        if (playlistDetail && playlistDetail.songs && playlistDetail.songs.length > 0) {
          // Xóa tất cả bài hát trong playlist trước
          console.log(`[PlaylistLibrary] Removing ${playlistDetail.songs.length} songs from playlist before deletion`);
          for (const song of playlistDetail.songs) {
            try {
              await playlistsApi.removeSong(selected.id, song.id);
            } catch (songError) {
              console.warn(`[PlaylistLibrary] Failed to remove song ${song.id}:`, songError);
            }
          }
        }
      } catch (detailError) {
        console.warn("[PlaylistLibrary] Could not fetch playlist details, proceeding with deletion:", detailError);
      }
      
      // Sau đó mới xóa playlist
      await playlistsApi.delete(selected.id);
      toast({ title: "Deleted", description: "Playlist removed" });
      setDeleteOpen(false);
      setPlaylists((prev) => prev.filter((p) => p.id !== selected.id));
      setSelected(null);
    } catch (error: unknown) {
      console.error("[PlaylistLibrary] Failed to delete playlist:", error);
      let errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Failed to delete playlist";
      
      // Cải thiện thông báo lỗi cho foreign key constraint
      if (errorMessage.includes("foreign key constraint") || errorMessage.includes("still referenced")) {
        errorMessage = "Không thể xóa playlist vì vẫn còn bài hát trong playlist. Vui lòng xóa tất cả bài hát trước.";
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const toggleSelectFriend = (id: number) => setSelectedFriendIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const sendInvites = async () => {
    if (!selected) return;
    try {
      setSendingInvites(true);
      for (const fid of selectedFriendIds) {
        await playlistCollabInvitesApi.send(Number(selected.id), fid, inviteRole);
      }
      toast({ title: "Invites sent", description: `${selectedFriendIds.length} friends invited` });
      setCollabOpen(false);
      setSelectedFriendIds([]);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : 'Failed to send invites', variant: 'destructive' });
    } finally { setSendingInvites(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Your Music Library
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your playlists and discover trending music
            </p>
          </div>
          
          <Link to="/create-playlist">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Plus className="w-5 h-5 mr-2" />
              Create Playlist
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
            <SelectTrigger className="w-[180px] bg-card/50 border-border/50" title="Sort playlists">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="songs">Song Count</SelectItem>
              <SelectItem value="likes">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="my-playlists" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="my-playlists">My Playlists</TabsTrigger>
            <TabsTrigger value="collab-playlists">Collaborations</TabsTrigger>
            <TabsTrigger value="favorites">Favorie</TabsTrigger>
          </TabsList>

          <TabsContent value="my-playlists">
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
              {filteredOwnedPlaylists.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-border/40 bg-card/40 py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-60" />
                  <p className="font-medium text-foreground">No playlists yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a playlist or collaborate with friends to see it here.
                  </p>
                </div>
              ) : (
                filteredOwnedPlaylists.map((playlist) => (
                  <PlaylistCardWithFavoriteInLibrary
                    key={playlist.id}
                    playlist={playlist}
                    playlistMeta={playlistMeta[playlist.id]}
                    duration={durations[playlist.id]}
                    onPlay={() => playPlaylist(playlist)}
                    onDelete={playlist.isOwner ? () => openDelete(playlist) : undefined}
                    getCollaboratorBadgeText={getCollaboratorBadgeText}
                    formatNumber={formatNumber}
                    layout="grid"
                  />
              ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="collab-playlists">
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
              {filteredCollabPlaylists.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-border/40 bg-card/40 py-12 text-center text-muted-foreground">
                  <Music className="h-10 w-10 mb-3 opacity-60" />
                  <p className="font-medium text-foreground">No collaborations yet</p>
                  <p className="text-sm text-muted-foreground">
                    When someone invites you to collaborate, the playlist will appear here.
                  </p>
                </div>
              ) : (
                filteredCollabPlaylists.map((playlist) => (
                  <PlaylistCardWithFavoriteInLibrary
                    key={playlist.id}
                    playlist={playlist}
                    playlistMeta={playlistMeta[playlist.id]}
                    duration={durations[playlist.id]}
                    onPlay={() => playPlaylist(playlist)}
                    getCollaboratorBadgeText={getCollaboratorBadgeText}
                    formatNumber={formatNumber}
                    layout="grid"
                  />
              ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites">
            <div className="space-y-8">
              <div className="relative flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent p-6 shadow-lg">
                <div className="flex-1 w-full">
                  <p className="text-xs uppercase tracking-[0.2em] text-pink-300/80">Pinned</p>
                  <h3 className="mt-1 text-3xl font-semibold text-foreground">Favorie hub</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {favoriteSongsTotal
                      ? `Bạn đang lưu ${favoriteSongsTotal} bài hát yêu thích.`
                      : "Hiện chưa có bài hát yêu thích nào. Hãy lưu một bài để bắt đầu!"}
                  </p>
                  {favoriteSongsPreview.length > 0 && (
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <div className="flex -space-x-2">
                        {favoriteSongsPreview.slice(0, 3).map((song) => (
                          <Avatar key={song.id} className="border-2 border-background">
                            <AvatarImage
                              src={song.coverUrl || song.urlImageAlbum || song.albumCoverImg || undefined}
                              alt={song.name || song.title || "Song"}
                            />
                            <AvatarFallback>{(song.name || song.title || "?").charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
                        onClick={() => navigate("/favorites/songs")}
                      >
                        Xem bài hát yêu thích
                      </Button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-pink-500/25 flex items-center justify-center shadow-[0_0_40px_rgba(244,114,182,0.45)]">
                    <Heart className="w-16 h-16 text-pink-400 fill-pink-500 drop-shadow-lg" />
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Playlist yêu thích</h3>
                    <p className="text-sm text-muted-foreground">
                      Giữ playlist từ bạn bè hoặc cộng đồng để nghe lại sau.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {favoritesError && favoritePlaylistItems.length === 0 && (
                      <span className="text-xs text-destructive">{favoritesError}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={loadFavorites} disabled={favoritesLoading}>
                      Refresh
                    </Button>
                  </div>
                </div>
                {favoritesLoading && favoritePlaylistItems.length === 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[0, 1, 2].map((skeleton) => (
                      <Card
                        key={`favorite-skel-${skeleton}`}
                        className="bg-card/40 border-border/30 h-48 min-w-[220px] animate-pulse"
                      />
                    ))}
                  </div>
                ) : favoritePlaylistItems.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Chưa có playlist yêu thích</p>
                    <p className="text-sm">Hãy lưu một playlist để xuất hiện tại đây.</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-custom snap-x snap-mandatory">
                    {favoritePlaylistItems.map((playlist) => {
                      const numericId = Number(playlist.id);
                      const playlistIdKey = String(playlist.id);
                      return (
                        <PlaylistCardWithFavoriteInLibrary
                          key={`favorite-playlist-${playlist.id}`}
                          playlist={playlist}
                          onPlay={playPlaylist}
                          formatNumber={formatNumber}
                          getCollaboratorBadgeText={getCollaboratorBadgeText}
                          onRemove={() => {
                            setFavoritePlaylists((prev) =>
                              prev.filter((p) => String(p.id) !== playlistIdKey)
                            );
                          }}
                          duration={
                            (durations[playlistIdKey] as string | undefined) ??
                            playlist.totalDuration
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Album yêu thích</h3>
                    <p className="text-sm text-muted-foreground">
                      Những album bạn đã ghim để nghe lại nhanh chóng.
                    </p>
                  </div>
                </div>
                {favoritesLoading && favoriteAlbums.length === 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {[0, 1, 2].map((skeleton) => (
                      <Card
                        key={`favorite-album-skel-${skeleton}`}
                        className="bg-card/40 border-border/30 h-40 min-w-[220px] animate-pulse"
                      />
                    ))}
                  </div>
                ) : favoriteAlbums.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Chưa có album yêu thích</p>
                    <p className="text-sm">Lưu album để chúng xuất hiện tại đây.</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-custom snap-x snap-mandatory">
                    {favoriteAlbums.map((album) => (
                  <div
                    key={album.id}
                    className="snap-start min-w-[240px] max-w-[260px]"
                  >
                        <FavoriteAlbumCard
                          album={album}
                          onRemove={() => {
                            const idKey = String(album.id);
                            setFavoriteAlbums((prev) =>
                              prev.filter((a) => String(a.id) !== idKey)
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>
      </Tabs>
    </div>
    <Footer />

    <PlaylistFormDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      onSubmit={handleSave}
      defaultValues={editDefaults || undefined}
      mode="edit"
      isLoading={isSubmitting}
    />

    <DeleteConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      onConfirm={handleDelete}
      title="Delete playlist?"
      description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
      isLoading={isSubmitting}
    />

    <Dialog open={collabOpen} onOpenChange={(v) => { setCollabOpen(v); if (!v) setSelectedFriendIds([]); }}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Invite collaborators</DialogTitle>
          <DialogDescription>Select friends to invite to this playlist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <select 
              value={inviteRole} 
              onChange={(e) => setInviteRole(e.target.value as "VIEWER" | "EDITOR")} 
              className="bg-background/50 border border-border rounded px-2 py-1 text-sm"
              title="Select collaboration role"
            >
              <option value="VIEWER">VIEWER</option>
              <option value="EDITOR">EDITOR</option>
            </select>
          </div>
          {loadingFriends ? (
            <p className="text-sm text-muted-foreground">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends found.</p>
          ) : (
            friends.map((f) => (
              <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-background/40">
                <input type="checkbox" checked={selectedFriendIds.includes(f.id)} onChange={() => toggleSelectFriend(f.id)} />
                <div className="flex items-center gap-2">
                  {f.avatar ? <img src={f.avatar} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
                  <span>{f.name}</span>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCollabOpen(false)} disabled={sendingInvites}>Cancel</Button>
          <Button onClick={sendInvites} disabled={sendingInvites || selectedFriendIds.length === 0}>{sendingInvites ? 'Sending...' : 'Send invites'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  );
};

export default PlaylistLibrary;
