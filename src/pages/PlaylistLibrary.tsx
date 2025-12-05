import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music,
  Plus,
  Search,
  Heart,
  Play,
  Users,
  Clock,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { playlistsApi, PlaylistDTO, playlistCollabInvitesApi, PlaylistLibraryItemDTO, PlaylistPermissionError } from "@/services/api/playlistApi";
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
import { HorizontalScrollableCards } from "@/components/HorizontalScrollableCards";
import { watchNotifications, type NotificationDTO } from "@/services/firebase/notifications";
import { Skeleton } from "@/components/ui/skeleton";

const FavoriteAlbumCardInline = ({
  album,
  onRemove,
}: {
  album: FavoriteAlbumDTO;
  onRemove: () => void;
}) => {
  const navigate = useNavigate();
  const albumNumericId = useMemo(() => {
    if (typeof album.id === "number" && Number.isFinite(album.id)) return album.id;
    if (typeof album.id === "string") {
      const parsed = Number(album.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }, [album.id]);
  
  const favoriteHook = useFavoriteAlbum(albumNumericId, { disableToast: false });
  const [shareOpen, setShareOpen] = useState(false);
  
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
  
  const cover =
    album.coverUrl && album.coverUrl.trim().length > 0
      ? album.coverUrl
      : (album as { cover?: string }).cover && (album as { cover?: string }).cover!.trim().length > 0
      ? (album as { cover?: string }).cover!
      : null;

  const artistName =
    typeof album.artist === "string"
      ? album.artist
      : album.artist?.name || album.artistName || "Unknown Artist";

  // Gradient giống playlist card để đồng bộ style
  const gradientIndex = ((albumNumericId ?? 0) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
  const gradientClass = [
    "from-[#4b5563] via-[#6b7280] to-[#111827]",
    "from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
    "from-[#fb7185] via-[#f97316] to-[#b91c1c]",
    "from-[#a855f7] via-[#8b5cf6] to-[#4c1d95]",
    "from-[#22c55e] via-[#16a34a] to-[#14532d]",
    "from-[#f97316] via-[#ef4444] to-[#7c2d12]",
  ][gradientIndex];

  const albumSlug = createSlug(album.name || "album", album.id);
  const albumUrl = `/album/${albumSlug}`;

  return (
    <Link to={albumUrl} className="block h-full">
      <Card className="bg-transparent border-none transition-all duration-300 group h-full flex flex-col hover:scale-[1.01]">
        <CardContent className="p-0 flex flex-col flex-1">
          <div className="relative aspect-square rounded-2xl overflow-hidden">
            {/* Ảnh cover nếu có, nếu không dùng gradient giống playlist */}
            {cover ? (
              <img
                src={cover}
                alt={album.name || "Album"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

            <div className="relative z-10 h-full p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                Album
              </p>
              <h3 className="text-2xl font-semibold text-white leading-tight line-clamp-3">
                {album.name}
              </h3>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="truncate">
                {typeof album.songCount === "number"
                  ? `${album.songCount} bài hát`
                  : "Album"}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleToggleFavorite();
                  }}
                  disabled={favoriteHook.pending}
                  className={`h-6 w-6 p-0 bg-black/40 hover:bg-black/60 rounded-full ${
                    favoriteHook.isFavorite ? "text-red-400" : "text-white"
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      favoriteHook.isFavorite ? "fill-current" : ""
                    }`}
                  />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 bg-black/40 hover:bg-black/60 rounded-full text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShareOpen(true);
                      }}
                      className="flex items-center gap-2 px-2"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Chia sẻ với bạn bè</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Nút Play ở giữa card khi hover */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                className="pointer-events-auto w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 shadow-xl"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(albumUrl);
                }}
              >
                <Play className="w-6 h-6" />
              </Button>
            </div>
            </div>
          </div>

          <div className="px-1 pt-2 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {artistName}
            </p>
          </div>

          {/* Share dialog cho album, chỉ mở khi chọn trong menu ba chấm */}
          <ShareButton
            open={shareOpen}
            onOpenChange={setShareOpen}
            title={album.name || "Album"}
            type="album"
            albumId={albumNumericId}
            url={`${window.location.origin}${albumUrl}`}
          />
        </CardContent>
      </Card>
    </Link>
  );
};

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
    isWarned: dto.isWarned,
    isBanned: dto.isBanned,
    warningCount: dto.warningCount,
    warningReason: dto.warningReason,
  };
};

type PlaylistCardLayout = "grid" | "carousel";

// Skeleton component cho playlist/album cards
const PlaylistSkeleton = () => (
  <Card className="bg-transparent border-none h-full flex flex-col">
    <CardContent className="p-0 flex flex-col flex-1">
      <div className="relative aspect-square rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="px-1 pt-2 min-w-0">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </CardContent>
  </Card>
);

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
  isUnavailable = false,
  unavailableReason,
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
  isUnavailable?: boolean;
  unavailableReason?: string;
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
        isUnavailable={isUnavailable}
        unavailableReason={unavailableReason}
      />
    </div>
  );
};


const PlaylistLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [likedPlaylists, setLikedPlaylists] = useState<string[]>([]);
  const [unavailablePlaylists, setUnavailablePlaylists] = useState<Record<string, { reason?: string }>>({});
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

  // Phạm vi hiển thị: tất cả / chỉ playlist / chỉ album
  const [scope, setScope] = useState<"all" | "playlists" | "albums">("all");
  // Bộ lọc chi tiết cho playlist (kéo xuống dropdown sort)
  const [playlistFilter, setPlaylistFilter] = useState<
    "all" | "owned" | "collab" | "favorites" | "public" | "private" | "friends_only"
  >("all");
  
  const markUnavailable = useCallback((id: string | number, reason?: string) => {
    setUnavailablePlaylists((prev) => {
      const key = String(id);
      if (prev[key]?.reason === reason) {
        return prev;
      }
      return { ...prev, [key]: { reason } };
    });
  }, []);

  const clearUnavailable = useCallback((id: string | number) => {
    setUnavailablePlaylists((prev) => {
      const key = String(id);
      if (!(key in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  
  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Lắng nghe notification ban để tự động ẩn playlist
  useEffect(() => {
    const meId = (() => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : undefined;
      } catch {
        return undefined;
      }
    })();

    if (!meId) return;

    const unsubscribe = watchNotifications(meId, (notifications) => {
      // Tìm notification ban mới nhất
      const banNotifications = notifications
        .filter(n => n.type === 'PLAYLIST_BANNED' && n.read !== true)
        .sort((a, b) => {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
          return timeB - timeA;
        });

      if (banNotifications.length > 0) {
        // Lấy playlistId từ notification
        const bannedPlaylistIds = banNotifications
          .map(n => n.metadata?.playlistId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));

        if (bannedPlaylistIds.length > 0) {
          // Tự động remove playlist bị ban khỏi state
          setPlaylists(prev => prev.filter(p => {
            const playlistId = Number(p.id);
            return !bannedPlaylistIds.includes(playlistId);
          }));

          // Cũng remove khỏi favorite playlists nếu có
          setFavoritePlaylists(prev => prev.filter(p => {
            const playlistId = typeof p.id === 'number' ? p.id : Number(p.id);
            return !bannedPlaylistIds.includes(playlistId);
          }));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
            // Chỉ truyền search/visibility params khi có search query hoặc filter khác "all"
            const hasSearchOrFilter = debouncedSearchQuery.trim() || playlistFilter !== "all";
            
            // Map playlistFilter to visibility param
            const visibilityParam = playlistFilter === "public" 
              ? "PUBLIC" 
              : playlistFilter === "private" 
              ? "PRIVATE"
              : playlistFilter === "friends_only"
              ? "FRIENDS_ONLY"
              : undefined;

            // Map sortBy to API sort param
            let sortParam: string | undefined;
            if (sortBy === "name") {
              sortParam = "name,asc";
            } else if (sortBy === "songs") {
              sortParam = "songCount,desc";
            } else if (sortBy === "likes") {
              sortParam = "likes,desc";
            } else {
              sortParam = "dateUpdate,desc"; // recent
            }

            libraryItems = await playlistsApi.library(
              hasSearchOrFilter || sortParam
                ? {
                    search: debouncedSearchQuery || undefined,
                    visibility: visibilityParam,
                    sort: sortParam,
                  }
                : undefined
            );
          } catch (e) {
            console.warn('Library endpoint failed, falling back to getByUser:', e);
            // Map sortBy to API sort param
            let sortParam = "dateUpdate,desc";
            if (sortBy === "name") {
              sortParam = "name,asc";
            } else if (sortBy === "songs") {
              sortParam = "songCount,desc";
            } else if (sortBy === "likes") {
              sortParam = "likes,desc";
            }
            
            const page = await playlistsApi.getByUser(me as number, {
              page: 0,
              size: 1000, // Load tất cả để không cần phân trang
              sort: sortParam,
              search: debouncedSearchQuery || undefined,
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
                isBanned: p.isBanned,
                isWarned: p.isWarned,
                warningCount: p.warningCount,
                warningReason: p.warningReason,
                createdAt: (p as { createdAt?: string }).createdAt ?? undefined,
                updatedAt: p.dateUpdate ?? (p as { updatedAt?: string }).updatedAt ?? undefined,
              };
            });
          }
        } else {
          // Map sortBy to API sort param
          let sortParam = "dateUpdate,desc";
          if (sortBy === "name") {
            sortParam = "name,asc";
          } else if (sortBy === "songs") {
            sortParam = "songCount,desc";
          } else if (sortBy === "likes") {
            sortParam = "likes,desc";
          }
          
          const page = await playlistsApi.getAll({ page: 0, size: 1000, sort: sortParam, search: debouncedSearchQuery || undefined });
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
            isBanned: p.isBanned,
            isWarned: p.isWarned,
            warningCount: p.warningCount,
            warningReason: p.warningReason,
          }));
        }

        // BE đã sort rồi, chỉ cần map data
        const filtered = libraryItems;

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
            isWarned: p.isWarned,
            isBanned: p.isBanned,
            warningCount: p.warningCount,
            warningReason: p.warningReason,
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
  }, [debouncedSearchQuery, sortBy, playlistFilter]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const ids = playlists.map(p => p.id);
        const res = await Promise.all(ids.map(async (id) => {
          try {
            const detail = await playlistsApi.getById(id);
            clearUnavailable(id);
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
          } catch (error) {
            if (error instanceof PlaylistPermissionError) {
              markUnavailable(id, "Playlist không còn khả dụng");
            }
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
  }, [playlists, markUnavailable, clearUnavailable]);

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
      // Luôn truyền search query cho albums (có thể là empty string)
      const searchParam = debouncedSearchQuery.trim() || undefined;
      
      const [songsRes, playlistsRes, albumsRes] = await Promise.all([
        favoritesApi.listSongs({ page: 0, size: 6, sort: "createdAt,desc" }).catch(() => ({
          content: [],
          totalElements: 0,
        })),
        favoritesApi.listPlaylists({ page: 0, size: 12, sort: "createdAt,desc" }).catch(() => ({
          content: [],
        })),
        favoritesApi.listAlbums({
          page: 0,
          size: 1000,
          sort: "createdAt,desc",
          search: searchParam,
        }).catch(() => ({
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
      const albums = albumsRes.content ?? [];
      setFavoriteAlbums(albums);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách yêu thích";
      setFavoritesError(message);
    } finally {
      setFavoritesLoading(false);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const normalizedSearch = debouncedSearchQuery.trim().toLowerCase();

  // Helper function để sort items chung (playlist + album)
  const sortItems = useCallback((
    items: (PlaylistItem | FavoriteAlbumDTO)[],
    sortBy: string
  ): (PlaylistItem | FavoriteAlbumDTO)[] => {
    const sorted = [...items];
    if (sortBy === "name") {
      sorted.sort((a, b) => {
        const nameA = ('title' in a ? a.title : (a as FavoriteAlbumDTO).name) || "";
        const nameB = ('title' in b ? b.title : (b as FavoriteAlbumDTO).name) || "";
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === "songs") {
      sorted.sort((a, b) => {
        const countA = ('songCount' in a ? a.songCount : (a as FavoriteAlbumDTO).songCount) || 0;
        const countB = ('songCount' in b ? b.songCount : (b as FavoriteAlbumDTO).songCount) || 0;
        return countB - countA;
      });
    } else if (sortBy === "likes") {
      sorted.sort((a, b) => {
        const likesA = ('likes' in a ? a.likes : 0) || 0;
        const likesB = ('likes' in b ? b.likes : 0) || 0;
        return likesB - likesA;
      });
    } else {
      // recent: sort by updatedAt, createdAt, hoặc id (mới nhất trước)
      sorted.sort((a, b) => {
        let dateA: Date | null = null;
        let dateB: Date | null = null;
        
        if ('updatedAt' in a || 'createdAt' in a) {
          const playlist = a as PlaylistItem;
          dateA = parseDateSafe(playlist.updatedAt || playlist.createdAt);
        }
        
        if ('updatedAt' in b || 'createdAt' in b) {
          const playlist = b as PlaylistItem;
          dateB = parseDateSafe(playlist.updatedAt || playlist.createdAt);
        }
        
        if (dateA && dateB) {
          return dateB.getTime() - dateA.getTime();
        }
        if (!dateA && !dateB) {
          // Cả hai đều là album hoặc không có date, dùng id
          const getId = (item: PlaylistItem | FavoriteAlbumDTO): number => {
            if ('id' in item) {
              const id = item.id;
              if (typeof id === "number") return id;
              if (typeof id === "string") {
                const num = Number(id);
                return Number.isFinite(num) ? num : 0;
              }
            }
            return 0;
          };
          const idA = getId(a);
          const idB = getId(b);
          return idB - idA;
        }
        if (!dateA) return 1;
        if (!dateB) return -1;
        return 0;
      });
    }
    return sorted;
  }, []);

  const favoritePlaylistItems = useMemo(
    () => favoritePlaylists.map((playlist) => toPlaylistItemFromFavorite(playlist)),
    [favoritePlaylists]
  );

  const favoritePlaylistIdSet = useMemo(
    () => new Set(favoritePlaylistItems.map((p) => String(p.id))),
    [favoritePlaylistItems]
  );

  const libraryPlaylistIdSet = useMemo(
    () => new Set(playlists.map((p) => String(p.id))),
    [playlists]
  );

  const filteredFavoritePlaylistItems = useMemo(() => {
    let base = favoritePlaylistItems;
    
    // Áp dụng search filter
    if (normalizedSearch) {
      base = base.filter((playlist) => {
        return (
          playlist.title.toLowerCase().includes(normalizedSearch) ||
          (playlist.description || "").toLowerCase().includes(normalizedSearch) ||
          (playlist.ownerName || "").toLowerCase().includes(normalizedSearch)
        );
      });
    }

    // Không sort ở đây, sẽ sort chung với albums sau
    return base;
  }, [favoritePlaylistItems, normalizedSearch]);

  const resolveUnavailableReason = useCallback(
    (playlist: PlaylistItem): string => {
      const metaVisibility =
        playlistMeta[String(playlist.id)]?.visibility ?? playlist.visibility ?? "";
      const normalized =
        typeof metaVisibility === "string"
          ? metaVisibility.toString().toUpperCase()
          : "";
      if (normalized === PlaylistVisibility.PRIVATE) {
        return "Playlist đã chuyển sang Private";
      }
      if (normalized === PlaylistVisibility.FRIENDS_ONLY) {
        return "Playlist chỉ hiển thị với bạn bè";
      }
      return "Playlist không còn khả dụng";
    },
    [playlistMeta]
  );

  const getUnavailableState = useCallback(
    (playlist: PlaylistItem) => {
      const entry = unavailablePlaylists[String(playlist.id)];
      if (!entry) {
        return { isUnavailable: false, reason: undefined as string | undefined };
      }
      return {
        isUnavailable: true,
        reason: entry.reason || resolveUnavailableReason(playlist),
      };
    },
    [unavailablePlaylists, resolveUnavailableReason]
  );

  const filteredExtraFavoritePlaylists = useMemo(() => {
    let base = favoritePlaylistItems.filter(
      (p) => !libraryPlaylistIdSet.has(String(p.id))
    );
    
    // Áp dụng search filter
    if (normalizedSearch) {
      base = base.filter((playlist) => {
        return (
          playlist.title.toLowerCase().includes(normalizedSearch) ||
          (playlist.description || "").toLowerCase().includes(normalizedSearch) ||
          (playlist.ownerName || "").toLowerCase().includes(normalizedSearch)
        );
      });
    }

    // Không sort ở đây, sẽ sort chung với albums sau
    return base;
  }, [favoritePlaylistItems, libraryPlaylistIdSet, normalizedSearch]);

  const filteredPlaylists = useMemo(() => {
    let base = playlists;

    // Áp dụng filter chi tiết chỉ cho playlist
    if (playlistFilter === "owned") {
      base = base.filter((p) => p.isOwner);
    } else if (playlistFilter === "collab") {
      base = base.filter((p) => p.isCollaborator);
    } else if (playlistFilter === "favorites") {
      base = base.filter((p) => favoritePlaylistIdSet.has(String(p.id)));
    } else if (playlistFilter === "public") {
      base = base.filter(
        (p) => p.isPublic === true || p.visibility === PlaylistVisibility.PUBLIC
      );
    } else if (playlistFilter === "private") {
      base = base.filter(
        (p) => p.isPublic === false || p.visibility === PlaylistVisibility.PRIVATE
      );
    } else if (playlistFilter === "friends_only") {
      base = base.filter(
        (p) => p.visibility === PlaylistVisibility.FRIENDS_ONLY
      );
    }

    // Áp dụng search filter
    if (normalizedSearch) {
      base = base.filter((playlist) => {
        return (
          playlist.title.toLowerCase().includes(normalizedSearch) ||
          (playlist.description || "").toLowerCase().includes(normalizedSearch) ||
          (playlist.ownerName || "").toLowerCase().includes(normalizedSearch)
        );
      });
    }

    // Không sort ở đây, sẽ sort chung với albums sau
    return base;
  }, [playlists, normalizedSearch, playlistFilter, favoritePlaylistIdSet]);

  const filteredFavoriteAlbums = useMemo(() => {
    let base = favoriteAlbums;
    
    // Áp dụng search filter
    if (normalizedSearch) {
      const query = normalizedSearch;
      base = base.filter((album) => {
        const name = (album.name || "").toLowerCase();
        const artist =
          (typeof album.artist === "string"
            ? album.artist
            : album.artist?.name || album.artistName || "")?.toLowerCase() || "";
        return name.includes(query) || artist.includes(query);
      });
    }

    // Không sort ở đây, sẽ sort chung với playlists sau
    return base;
  }, [favoriteAlbums, normalizedSearch]);

  const libraryItemCount = useMemo(() => {
    // Album-only scope
    if (scope === "albums") {
      return filteredFavoriteAlbums.length;
    }

    // Favorites filter: hiển thị khác nhau tùy scope
    if (playlistFilter === "favorites") {
      if (scope === "all") {
        // Scope "all" + filter "favorites": đếm cả favorite playlists và favorite albums
        return filteredFavoritePlaylistItems.length + filteredFavoriteAlbums.length;
      } else {
        // Scope "playlists" + filter "favorites": chỉ đếm favorite playlists
        return filteredFavoritePlaylistItems.length;
      }
    }

    // All scope: playlist + extra playlist + album (khi không phải filter favorites)
    if (scope === "all") {
      return (
        filteredPlaylists.length +
        filteredExtraFavoritePlaylists.length +
        filteredFavoriteAlbums.length
      );
    }

    // Scope playlists: bao gồm cả favorite playlists (khi không phải filter favorites)
    if (scope === "playlists") {
      return filteredPlaylists.length + filteredExtraFavoritePlaylists.length;
    }

    // Fallback: chỉ playlist thường
    return filteredPlaylists.length;
  }, [
    scope,
    playlistFilter,
    filteredPlaylists.length,
    filteredExtraFavoritePlaylists.length,
    filteredFavoriteAlbums.length,
    filteredFavoritePlaylistItems.length,
  ]);

  // Tính duration cho các playlist yêu thích (dùng /api/playlists/{id})
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const ids = favoritePlaylistItems.map((p) => p.id);
        if (!ids.length) return;
        const responses = await Promise.all(
          ids.map(async (id) => {
            try {
              const detail = await playlistsApi.getById(id);
              clearUnavailable(id);
              const secs = Array.isArray(detail.songs)
                ? detail.songs.reduce((acc: number, s: SongDTO) => acc + toSeconds(s.duration), 0)
                : 0;
              return { id, duration: formatTotal(secs) };
            } catch (error) {
              if (error instanceof PlaylistPermissionError) {
                markUnavailable(id, "Playlist không còn khả dụng");
              }
              return { id, duration: "--" };
            }
          })
        );
        if (cancelled) return;
        const durationMap: Record<string, string> = {};
        responses.forEach(({ id, duration }) => {
          durationMap[String(id)] = duration;
        });
        setDurations((prev) => ({ ...prev, ...durationMap }));
      } catch {
        // ignore
      }
    };
    if (favoritePlaylistItems.length) {
      run();
    }
    return () => {
      cancelled = true;
    };
  }, [favoritePlaylistItems, markUnavailable, clearUnavailable]);

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
    const slug = createSlug(playlist.title, playlist.id);
    navigate(`/playlist/${slug}`);
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Your Library</h1>
            
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in your playlists"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card border border-border text-sm placeholder:text-muted-foreground"
                />
              </div>
              
              <Link to="/create-playlist">
                <Button
                  size="icon"
                  className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg"
                  title="Create playlist"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Library</span>
                  <span className="rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground/80 border border-border/40">
                    {libraryItemCount} {libraryItemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "playlists", label: "Playlists" },
                    { id: "albums", label: "Albums" },
                  ].map((item) => {
                    return (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={scope === item.id ? "secondary" : "ghost"}
                        className={`h-8 px-4 rounded-full border border-transparent text-[11px] font-medium ${
                          scope === item.id
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-card hover:bg-muted text-muted-foreground"
                        }`}
                      onClick={() =>
                        setScope(item.id as "all" | "playlists" | "albums")
                      }
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(value: string) => {
                  setSortBy(value as typeof sortBy);
                }}
              >
                <SelectTrigger
                  className="w-[140px] bg-card border border-border h-8 text-[11px] justify-between text-muted-foreground rounded-full px-3"
                  title="Sort by"
                >
                  <SelectValue
                    placeholder="Sort by"
                    aria-label="Sort"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="songs">Songs</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={playlistFilter}
                onValueChange={(value: string) => {
                  setPlaylistFilter(value as typeof playlistFilter);
                }}
              >
                <SelectTrigger
                  className="w-[160px] bg-card border border-border h-8 text-[11px] justify-between text-muted-foreground rounded-full px-3"
                  title="Filter playlists"
                >
                  <SelectValue
                    placeholder="All Library"
                    aria-label="Filter"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="owned">Your playlists</SelectItem>
                  <SelectItem value="collab">Collaborations</SelectItem>
                  <SelectItem value="favorites">Favorites</SelectItem>
                  <SelectItem value="public">Public only</SelectItem>
                  <SelectItem value="private">Private only</SelectItem>
                  <SelectItem value="friends_only">Friend only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <section className="space-y-4">
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
              {/* Loading skeleton */}
              {(loading || favoritesLoading) ? (
                <>
                  {scope !== "albums" && (
                    <Card className="cursor-pointer border-0 bg-transparent group">
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex flex-col justify-between p-4">
                          <div>
                            <p className="text-xs font-medium text-white/80 mb-1">Playlist</p>
                            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                              Liked Songs
                            </h3>
                            <p className="text-xs text-white/80 line-clamp-2">
                              Loading...
                            </p>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <div className="bg-black/40 rounded-full p-2 shadow-lg">
                              <Heart className="w-7 h-7 text-white" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <PlaylistSkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              ) : (
                <>
              {/* Liked Songs card: chỉ hiện trong scope all/playlists */}
              {scope !== "albums" && (
                <Card
                  className="cursor-pointer border-0 bg-transparent group"
                  onClick={() => navigate("/favorites/songs")}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex flex-col justify-between p-4">
                      <div>
                        <p className="text-xs font-medium text-white/80 mb-1">Playlist</p>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                          Liked Songs
                        </h3>
                        <p className="text-xs text-white/80 line-clamp-2">
                          {favoriteSongsTotal
                            ? `${favoriteSongsTotal} liked songs`
                            : "Songs you like will appear here."}
                        </p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="bg-black/40 rounded-full p-2 shadow-lg">
                          <Heart className="w-7 h-7 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scope chỉ album: bỏ toàn bộ playlist, chỉ show album yêu thích */}
              {scope === "albums" ? (
                filteredFavoriteAlbums.length === 0 ? (
                  <Card className="bg-card border-none flex flex-col items-start justify-center p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Chưa có album yêu thích</p>
                    <p className="text-xs text-muted-foreground">
                      Hãy thêm album vào yêu thích để xuất hiện tại đây.
                    </p>
                  </Card>
                ) : (
                  sortItems(filteredFavoriteAlbums, sortBy).map((album) => {
                    const albumItem = album as FavoriteAlbumDTO;
                    return (
                      <FavoriteAlbumCardInline
                        key={`albums-scope-${albumItem.id}`}
                        album={albumItem}
                        onRemove={() => {
                          const idKey = String(albumItem.id);
                          setFavoriteAlbums((prev) =>
                            prev.filter((a) => String(a.id) !== idKey)
                          );
                        }}
                      />
                    );
                  })
                )
              ) : playlistFilter === "favorites" ? (
                // Filter "favorites": hiển thị khác nhau tùy scope
                scope === "all" ? (
                  // Scope "all" + filter "favorites": hiển thị cả favorite playlists và favorite albums
                  filteredFavoritePlaylistItems.length === 0 && filteredFavoriteAlbums.length === 0 ? (
                    <Card className="bg-card border-none flex flex-col items-start justify-center p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Chưa có nội dung yêu thích</p>
                      <p className="text-xs text-muted-foreground">
                        Hãy thêm playlist hoặc album vào yêu thích để xuất hiện tại đây.
                      </p>
                    </Card>
                  ) : (
                    <>
                      <>
                        {(() => {
                          // Gộp playlists và albums, sau đó sort chung
                          const allItems: (PlaylistItem | FavoriteAlbumDTO)[] = [
                            ...filteredFavoritePlaylistItems,
                            ...filteredFavoriteAlbums
                          ];
                          const sortedItems = sortItems(allItems, sortBy);
                          
                          return sortedItems.map((item) => {
                              // Kiểm tra xem là playlist hay album
                              if ('title' in item) {
                                // Là PlaylistItem
                              const playlist = item as PlaylistItem;
                              const { isUnavailable, reason: unavailableReason } = getUnavailableState(playlist);
                                return (
                                  <PlaylistCardWithFavoriteInLibrary
                                    key={`fav-pl-${playlist.id}`}
                                    playlist={playlist}
                                    playlistMeta={playlistMeta[playlist.id]}
                                    duration={durations[String(playlist.id)]}
                                    onPlay={() => playPlaylist(playlist)}
                                    getCollaboratorBadgeText={getCollaboratorBadgeText}
                                    formatNumber={formatNumber}
                                    layout="grid"
                                    isUnavailable={isUnavailable}
                                    unavailableReason={unavailableReason}
                                  />
                                );
                              } else {
                                // Là FavoriteAlbumDTO
                                const album = item as FavoriteAlbumDTO;
                                return (
                                  <FavoriteAlbumCardInline
                                    key={`fav-al-scope-${album.id}`}
                                    album={album}
                                    onRemove={() => {
                                      const idKey = String(album.id);
                                      setFavoriteAlbums((prev) =>
                                        prev.filter((a) => String(a.id) !== idKey)
                                      );
                                    }}
                                  />
                                );
                              }
                            });
                        })()}
                      </>
                    </>
                  )
                ) : (
                  // Scope "playlists" + filter "favorites": chỉ hiển thị favorite playlists
                  filteredFavoritePlaylistItems.length === 0 ? (
                    <Card className="bg-card border-none flex flex-col items-start justify-center p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Chưa có playlist yêu thích</p>
                      <p className="text-xs text-muted-foreground">
                        Hãy thêm playlist vào yêu thích để xuất hiện tại đây.
                      </p>
                    </Card>
                  ) : (
                    sortItems(filteredFavoritePlaylistItems, sortBy).map((item) => {
                      const playlist = item as PlaylistItem;
                      const { isUnavailable, reason: unavailableReason } = getUnavailableState(playlist);
                      return (
                      <PlaylistCardWithFavoriteInLibrary
                        key={`fav-pl-${playlist.id}`}
                        playlist={playlist}
                        playlistMeta={playlistMeta[playlist.id]}
                        duration={durations[String(playlist.id)]}
                        onPlay={() => playPlaylist(playlist)}
                        getCollaboratorBadgeText={getCollaboratorBadgeText}
                        formatNumber={formatNumber}
                        layout="grid"
                        isUnavailable={isUnavailable}
                        unavailableReason={unavailableReason}
                      />
                    );
                    })
                  )
                )
              ) : (
                // Các filter khác (owned, collab, public, private, all)
                playlistFilter === "all" ? (
                  // Filter "all": hiển thị tất cả (playlists + favorite playlists + favorite albums)
                  <>
                    {filteredPlaylists.length === 0 && filteredExtraFavoritePlaylists.length === 0 && (scope !== "all" || filteredFavoriteAlbums.length === 0) ? (
                      <Card className="bg-card border-none flex flex-col items-start justify-center p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Không có nội dung nào</p>
                        <p className="text-xs text-muted-foreground">
                          Tạo playlist mới hoặc tham gia playlist của bạn bè để hiển thị tại đây.
                        </p>
                      </Card>
                    ) : (
                      <>
                        {(() => {
                          // Gộp tất cả items, sau đó sort chung
                          const allItems: (PlaylistItem | FavoriteAlbumDTO)[] = [
                            ...filteredPlaylists,
                            ...(scope === "playlists" || scope === "all" ? filteredExtraFavoritePlaylists : []),
                            ...(scope === "all" ? filteredFavoriteAlbums : [])
                          ];
                          const sortedItems = sortItems(allItems, sortBy);
                          
                          return sortedItems.map((item) => {
                                // Kiểm tra xem là playlist hay album
                                if ('title' in item) {
                                  // Là PlaylistItem
                                  const playlist = item as PlaylistItem;
                                  const isExtra = filteredExtraFavoritePlaylists.some(p => p.id === playlist.id);
                                  const { isUnavailable, reason: unavailableReason } = getUnavailableState(playlist);
                                  return (
                                    <PlaylistCardWithFavoriteInLibrary
                                      key={isExtra ? `extra-fav-${playlist.id}` : playlist.id}
                                      playlist={playlist}
                                      playlistMeta={playlistMeta[playlist.id]}
                                      duration={durations[playlist.id] || durations[String(playlist.id)]}
                                      onPlay={() => playPlaylist(playlist)}
                                      onDelete={playlist.isOwner ? () => openDelete(playlist) : undefined}
                                      getCollaboratorBadgeText={getCollaboratorBadgeText}
                                      formatNumber={formatNumber}
                                      layout="grid"
                                      isUnavailable={isUnavailable}
                                      unavailableReason={unavailableReason}
                                    />
                                  );
                                } else {
                                  // Là FavoriteAlbumDTO
                                  const album = item as FavoriteAlbumDTO;
                                  return (
                                    <FavoriteAlbumCardInline
                                      key={`fav-al-${album.id}`}
                                      album={album}
                                      onRemove={() => {
                                        const idKey = String(album.id);
                                        setFavoriteAlbums((prev) =>
                                          prev.filter((a) => String(a.id) !== idKey)
                                        );
                                      }}
                                    />
                                  );
                                }
                              });
                        })()}
                      </>
                    )}
                  </>
                ) : (
                  // Các filter khác (owned, collab, public, private): chỉ hiển thị filteredPlaylists
                  filteredPlaylists.length === 0 ? (
                    <Card className="bg-card border-none flex flex-col items-start justify-center p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Không có playlist nào</p>
                      <p className="text-xs text-muted-foreground">
                        Tạo playlist mới hoặc tham gia playlist của bạn bè để hiển thị tại đây.
                      </p>
                    </Card>
                  ) : (
                    <>
                      {sortItems(filteredPlaylists, sortBy).map((item) => {
                        const playlist = item as PlaylistItem;
                        const { isUnavailable, reason: unavailableReason } = getUnavailableState(playlist);
                        return (
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
                            isUnavailable={isUnavailable}
                            unavailableReason={unavailableReason}
                          />
                        );
                      })}
                    </>
                  )
                )
              )}
                </>
              )}
            </div>
          </section>

          <section className="space-y-8">
            <div className="space-y-8">
              {/* Các section chi tiết playlist/album yêu thích đã được gom vào bộ lọc "Favorites" phía trên */}
            </div>
          </section>
        </div>
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
