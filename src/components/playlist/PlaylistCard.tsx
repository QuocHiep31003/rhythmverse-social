import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Heart, MoreHorizontal, Music, Clock, Users } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import type { PlaylistItem } from "@/types/playlistLibrary";
import { PlaylistVisibility } from "@/types/playlist";
import { parseDateSafe, createSlug } from "@/utils/playlistUtils";
import { API_BASE_URL } from "@/services/api";

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
  onPlay,
  onDelete,
  getCollaboratorBadgeText,
  formatNumber,
}: PlaylistCardProps) => {
  const computedSongCount =
    typeof playlistMeta?.songCount === 'number' && Number.isFinite(playlistMeta.songCount) && playlistMeta.songCount >= 0
      ? playlistMeta.songCount
      : typeof playlist.songCount === 'number' && Number.isFinite(playlist.songCount)
      ? playlist.songCount
      : 0;
  const songLabel = computedSongCount === 1 ? 'song' : 'songs';
  const durationLabel = duration || playlist.totalDuration || '--';
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

  return (
    <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="relative aspect-square">
          {playlist.cover ? (
            <img
              src={playlist.cover}
              alt={playlist.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center rounded-t-lg">
              <Music className="w-16 h-16 text-white/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
              onClick={onPlay}
            >
              <Play className="w-8 h-8" />
            </Button>
          </div>
          
          <div className="absolute top-3 right-3 flex gap-2 flex-wrap">
            {playlist.isOwner && (
              <Badge variant="default" className="bg-blue-500/20 text-blue-200 border-blue-400/30 font-semibold">
                Owner
              </Badge>
            )}
            {playlist.isCollaborator && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-400/30 font-semibold">
                {getCollaboratorBadgeText ? getCollaboratorBadgeText(playlist.role) : "Collaborator"}
              </Badge>
            )}
            {(() => {
              if (isFriendsOnlyVisibility) {
                return (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/30 font-semibold">
                    Friends Only
                  </Badge>
                );
              }
              if (isPrivateVisibility) {
                return (
                  <Badge variant="secondary" className="bg-gray-500/20 text-gray-200 border-gray-400/30 font-semibold">
                    Private
                  </Badge>
                );
              }
              if (isPublicVisibility) {
                return (
                  <Badge variant="default" className="bg-green-500/20 text-green-200 border-green-400/30 font-semibold">
                    Public
                  </Badge>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="p-4 min-w-0">
          <Link to={`/playlist/${createSlug(playlist.title || playlist.name, playlist.id)}`} className="block min-w-0">
            <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors line-clamp-2 break-words overflow-hidden min-w-0">
              {playlist.title}
            </h3>
          </Link>
          
          {playlist.isCollaborator && playlist.ownerName && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              {playlist.ownerAvatar ? (
                <img 
                  src={
                    playlist.ownerAvatar.startsWith('http://') || playlist.ownerAvatar.startsWith('https://') || playlist.ownerAvatar.startsWith('/')
                      ? playlist.ownerAvatar
                      : `${API_BASE_URL}${playlist.ownerAvatar.startsWith('/') ? '' : '/'}${playlist.ownerAvatar}`
                  } 
                  alt={playlist.ownerName}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to Users icon if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <span className="truncate">by {playlist.ownerName}</span>
            </div>
          )}
          
          {playlist.description ? (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 break-words overflow-hidden min-w-0">
              {playlist.description}
            </p>
          ) : null}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              {computedSongCount} {songLabel}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {durationLabel}
            </div>
            {isPublicVisibility && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {formatNumber ? formatNumber(playlist.likes) : playlist.likes}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {updatedDate ? (
              <p className="text-xs text-muted-foreground">
                Updated {updatedDate.toLocaleDateString()}
              </p>
            ) : null}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onLike}
                className={`h-8 w-8 ${isLiked ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <ShareButton title={playlist.title} type="playlist" playlistId={Number(playlist.id)} url={`${window.location.origin}/playlist/${createSlug(playlist.title || playlist.name, playlist.id)}`} isPrivate={isPrivateVisibility} />
              {playlist.isOwner && onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100 transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

