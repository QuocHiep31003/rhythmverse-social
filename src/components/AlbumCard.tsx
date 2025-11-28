import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Heart, Music, Clock } from "lucide-react";
import { createSlug } from "@/utils/playlistUtils";
import { useFavoriteAlbum } from "@/hooks/useFavorites";
import { useMemo, useState, useEffect } from "react";
import ShareButton from "@/components/ShareButton";
import { favoritesApi } from "@/services/api/favoritesApi";
import { toSeconds, formatTotal } from "@/utils/playlistUtils";

interface ControlledFavoriteState {
  isFavorite: boolean;
  pending?: boolean;
  onToggle?: () => Promise<unknown> | unknown;
}

interface AlbumCardProps {
  album: {
    id: number | string;
    name?: string;
    title?: string;
    artist?: { id?: number; name?: string } | string;
    artistName?: string;
    coverUrl?: string;
    cover?: string;
    releaseDate?: string;
    releaseYear?: string | number;
    songs?: any[];
    songCount?: number;
    totalDuration?: string;
    likes?: number;
  };
  onPlay?: () => void;
  formatNumber?: (num: number) => string;
  favoriteState?: ControlledFavoriteState;
}

export const AlbumCard = ({ album, onPlay, formatNumber, favoriteState }: AlbumCardProps) => {
  const albumName = album.name || album.title || "Unknown Album";
  const artistName = 
    typeof album.artist === "string" 
      ? album.artist 
      : album.artist?.name || album.artistName || "Unknown Artist";
  const cover = album.coverUrl || album.cover || "";
  const songCount = album.songCount ?? album.songs?.length ?? 0;
  const songLabel = songCount === 1 ? 'song' : 'songs';
  const durationLabel = useMemo(() => {
    const seconds = toSeconds(album.totalDuration);
    if (seconds > 0) return formatTotal(seconds);
    if (typeof album.totalDuration === "string" && album.totalDuration.trim().length > 0) {
      return album.totalDuration;
    }
    return "--";
  }, [album.totalDuration]);
  const likes = album.likes ?? 0;
  
  const albumNumericId = useMemo(() => {
    if (typeof album.id === "number" && Number.isFinite(album.id)) return album.id;
    if (typeof album.id === "string") {
      const parsed = Number(album.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }, [album.id]);
  
  const shouldUseInternalFavorite = !favoriteState;
  const favoriteHook = useFavoriteAlbum(
    shouldUseInternalFavorite ? albumNumericId : undefined,
    { disableToast: false }
  );
  const isFavorite = favoriteState ? favoriteState.isFavorite : favoriteHook.isFavorite;
  const favoritePending = favoriteState ? Boolean(favoriteState.pending) : favoriteHook.pending;
  const toggleFavorite = favoriteState?.onToggle ?? favoriteHook.toggleFavorite;
  const [likeCount, setLikeCount] = useState<number | null>(null);
  
  useEffect(() => {
    if (albumNumericId) {
      favoritesApi.getAlbumLikeCount(albumNumericId)
        .then(res => setLikeCount(res.count))
        .catch(() => setLikeCount(null));
    }
  }, [albumNumericId]);
  
  const albumSlug = createSlug(albumName, album.id);
  const albumUrl = `/album/${albumSlug}`;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) {
      onPlay();
    }
  };

  return (
    <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="relative aspect-square">
          <Link to={albumUrl}>
            {cover ? (
              <img
                src={cover}
                alt={albumName}
                className="w-full h-full object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center rounded-t-lg">
                <Music className="w-16 h-16 text-white/80" />
              </div>
            )}
          </Link>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
              onClick={handlePlay}
            >
              <Play className="w-8 h-8" />
            </Button>
          </div>
        </div>

        <div className="p-4 min-w-0">
          <Link to={albumUrl} className="block min-w-0">
            <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors line-clamp-2 break-words overflow-hidden min-w-0">
              {albumName}
            </h3>
          </Link>
          
          <p className="text-sm text-muted-foreground mb-3 truncate">
            {artistName}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              {songCount} {songLabel}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {durationLabel}
            </div>
            {likeCount !== null && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {formatNumber ? formatNumber(likeCount) : likeCount.toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {album.releaseDate && (
              <p className="text-xs text-muted-foreground">
                {typeof album.releaseYear === "number" || typeof album.releaseYear === "string"
                  ? `Released: ${album.releaseYear}`
                  : new Date(album.releaseDate).getFullYear()}
              </p>
            )}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await toggleFavorite?.();
                }}
                disabled={favoritePending || (!albumNumericId && !favoriteState)}
                className={`h-8 w-8 ${isFavorite ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <ShareButton 
                title={albumName} 
                type="album" 
                albumId={albumNumericId} 
                url={`${window.location.origin}/album/${albumSlug}`} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

