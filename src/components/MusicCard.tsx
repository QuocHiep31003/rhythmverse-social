import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Heart, MoreHorizontal, Clock, Share2, ListPlus, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createSlug } from "@/utils/playlistUtils";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import { useFavoriteSong } from "@/hooks/useFavorites";

interface MusicCardProps {
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  imageUrl?: string;
  isPlaying?: boolean;
  variant?: "default" | "compact" | "featured";
  songId?: string | number;
  likes?: number;
}

const MusicCard = ({ 
  title, 
  artist, 
  album, 
  duration = "3:24", 
  imageUrl, 
  isPlaying = false,
  variant = "default",
  songId,
  likes = 0
}: MusicCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  
  const numericSongId = useMemo(() => {
    if (!songId) return undefined;
    if (typeof songId === "number" && Number.isFinite(songId)) return songId;
    if (typeof songId === "string") {
      const parsed = Number(songId);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }, [songId]);
  
  const favoriteHook = useFavoriteSong(numericSongId, { disableToast: false });

  const handleCardClick = () => {
    if (songId) {
      navigate(`/song/${createSlug(title || 'song', songId)}`);
    }
  };

  if (variant === "compact") {
    return (
      <Card 
        className="bg-card/50 border-border/40 hover:bg-card/80 transition-all duration-300 group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Play className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            {isHovered && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate">{title}</h4>
            <p className="text-sm text-muted-foreground truncate">{artist}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{duration}</span>
          </div>
        </CardContent>
      </Card>
      {songId && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={songId}
          songTitle={title}
          songCover={imageUrl}
        />
      )}
    </>
    );
  }

  return (
    <>
    <Card 
      className="bg-card/50 border-border/40 hover:bg-card/80 transition-all duration-300 group cursor-pointer hover:shadow-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Album Art */}
        <div className="relative mb-4 aspect-square">
          <div className="w-full h-full bg-gradient-primary rounded-lg flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Play className="h-12 w-12 text-primary-foreground" />
            )}
          </div>

          {/* Play Button Overlay */}
          <div className={`absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center transition-opacity duration-300 ${
            isHovered || isPlaying ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button variant="glass" size="icon" className="h-12 w-12 hover:scale-110">
              <Play className="h-5 w-5" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 space-y-2">
            <Button
              variant="glass"
              size="icon"
              className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
                favoriteHook.isFavorite ? 'text-red-500' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                favoriteHook.toggleFavorite();
              }}
              disabled={favoriteHook.pending || !numericSongId}
            >
              <Heart className={`h-4 w-4 ${favoriteHook.isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="glass"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAddToPlaylistOpen(true); }}>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Thêm vào playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); console.log('Share'); }}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); console.log('Download'); }}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Song Info */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          <p className="text-sm text-muted-foreground truncate">{artist}</p>
          {album && <p className="text-xs text-muted-foreground truncate">{album}</p>}
        </div>

        {/* Duration and Likes */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{duration}</span>
            </div>
            {likes > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{likes}</span>
              </div>
            )}
          </div>
          {variant === "featured" && (
            <span className="bg-gradient-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              Featured
            </span>
          )}
        </div>
      </CardContent>
    </Card>
    {songId && (
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        songId={songId}
        songTitle={title}
        songCover={imageUrl}
      />
    )}
    </>
  );
};

export default MusicCard;