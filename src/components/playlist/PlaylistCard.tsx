import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Heart, MoreHorizontal, Music, Share2 } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import type { PlaylistItem } from "@/types/playlistLibrary";
import { PlaylistVisibility } from "@/types/playlist";
import { parseDateSafe, createSlug } from "@/utils/playlistUtils";
import { API_BASE_URL } from "@/services/api";
import { favoritesApi } from "@/services/api/favoritesApi";
import { useState, useEffect, useMemo } from "react";
import { toSeconds, formatTotal } from "@/utils/playlistUtils";

interface PlaylistCardProps {
  playlist: PlaylistItem;
  playlistMeta?: {
    songCount?: number;
    updatedAt?: string | null;
    visibility?: PlaylistVisibility | string | null;
  };
  duration?: string;
  isLiked: boolean;
  onLike: () => void;
  likePending?: boolean;
  onPlay: () => void;
  onDelete?: () => void;
  getCollaboratorBadgeText?: (role?: import("@/types/playlist").CollaboratorRole) => string;
  formatNumber?: (num: number) => string;
}

export const PlaylistCard = ({
  playlist,
  playlistMeta,
  duration,
  isLiked,
  onLike,
  likePending,
  onPlay,
  onDelete,
  getCollaboratorBadgeText,
  formatNumber,
}: PlaylistCardProps) => {
  const computedSongCount =
    typeof playlistMeta?.songCount === "number" &&
    Number.isFinite(playlistMeta.songCount) &&
    playlistMeta.songCount >= 0
      ? playlistMeta.songCount
      : typeof playlist.songCount === "number" &&
        Number.isFinite(playlist.songCount)
      ? playlist.songCount
      : 0;
  const songLabel = computedSongCount === 1 ? 'song' : 'songs';
  const durationLabel = useMemo(() => {
    const raw = duration ?? playlist.totalDuration;
    const seconds = toSeconds(raw);
    if (seconds > 0) {
      return formatTotal(seconds);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw;
    }
    return "--";
  }, [duration, playlist.totalDuration]);
  const rawVisibility =
    playlistMeta?.visibility ??
    playlist.visibility ??
    (playlist.isPublic === true
      ? PlaylistVisibility.PUBLIC
      : playlist.isPublic === false
      ? PlaylistVisibility.PRIVATE
      : null);
  const normalizedVisibility = (rawVisibility ?? '').toString().toUpperCase();
  const isPublicVisibility =
    normalizedVisibility === PlaylistVisibility.PUBLIC ||
    (normalizedVisibility === '' && playlist.isPublic === true);
  const isFriendsOnlyVisibility = normalizedVisibility === PlaylistVisibility.FRIENDS_ONLY;
  const isPrivateVisibility =
    normalizedVisibility === PlaylistVisibility.PRIVATE ||
    (!isPublicVisibility && !isFriendsOnlyVisibility && playlist.isPublic === false);
  const updatedSource = playlistMeta?.updatedAt ?? playlist.updatedAt ?? playlist.createdAt ?? null;
  const updatedDate = parseDateSafe(updatedSource);
  
  const playlistNumericId = useMemo(() => {
    const num = Number(playlist.id);
    return Number.isFinite(num) ? num : undefined;
  }, [playlist.id]);
  
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  
  useEffect(() => {
    if (playlistNumericId && isPublicVisibility) {
      favoritesApi
        .getPlaylistLikeCount(playlistNumericId)
        .then((res) => setLikeCount(res.count))
        .catch(() => setLikeCount(null));
    }
  }, [playlistNumericId, isPublicVisibility]);

  // Chọn gradient background kiểu Apple Music dựa theo id playlist (dùng khi không có cover)
  const gradientIndex = ((playlistNumericId ?? 0) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
  const gradientClass = [
    "from-[#4b5563] via-[#6b7280] to-[#111827]",
    "from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
    "from-[#fb7185] via-[#f97316] to-[#b91c1c]",
    "from-[#a855f7] via-[#8b5cf6] to-[#4c1d95]",
    "from-[#22c55e] via-[#16a34a] to-[#14532d]",
    "from-[#f97316] via-[#ef4444] to-[#7c2d12]",
  ][gradientIndex];

  const coverImage = playlist.cover && playlist.cover.trim().length > 0 ? playlist.cover : null;

  return (
    <Card className="bg-transparent border-none transition-all duration-300 group h-full flex flex-col hover:scale-[1.01]">
      <CardContent className="p-0 flex flex-col flex-1">
        <Link
          to={`/playlist/${createSlug(playlist.title, playlist.id)}`}
          className="block"
        >
          <div className="relative aspect-square rounded-2xl overflow-hidden">
            {/* Ảnh cover nếu có, nếu không fallback gradient */}
            {coverImage ? (
              <img
                src={coverImage}
                alt={playlist.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
              />
            )}
            {/* Lớp overlay làm tối ảnh để text rõ hơn */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

            <div className="relative z-10 h-full p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                Playlist
              </p>
              <h3 className="text-2xl font-semibold text-white leading-tight line-clamp-3">
                {playlist.title}
              </h3>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="truncate">
                {computedSongCount} {songLabel}
                {durationLabel !== "--" && ` • ${durationLabel}`}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLike();
                  }}
                  disabled={likePending}
                  className={`h-7 w-7 p-0 bg-black/40 hover:bg-black/60 rounded-full ${
                    isLiked ? "text-red-400" : "text-white"
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      isLiked ? "fill-current" : ""
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
                    {playlist.isOwner && onDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete();
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Nút Play ở giữa card, chỉ hiện khi hover */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                className="pointer-events-auto w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 shadow-xl"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPlay();
                }}
              >
                <Play className="w-6 h-6" />
              </Button>
            </div>
            </div>
          </div>
        </Link>

        <div className="px-1 pt-2 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {playlist.ownerName || "Playlist"}
          </p>
        </div>

        {/* Share dialog controlled bằng state, không hiện icon riêng */}
        <ShareButton
          open={shareOpen}
          onOpenChange={setShareOpen}
          title={playlist.title}
          type="playlist"
          playlistId={playlistNumericId}
          url={`${window.location.origin}/playlist/${createSlug(
            playlist.title,
            playlist.id
          )}`}
          isPrivate={isPrivateVisibility}
        />
      </CardContent>
    </Card>
  );
};

