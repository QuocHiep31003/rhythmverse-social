import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Heart, MoreHorizontal, Clock, Share2, ListPlus, Download } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface MusicCardProps {
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  imageUrl?: string;
  isPlaying?: boolean;
  variant?: "default" | "compact" | "featured";
  songId?: string;
}

const MusicCard = ({ 
  title, 
  artist, 
  album, 
  duration = "3:24", 
  imageUrl, 
  isPlaying = false,
  variant = "default",
  songId
}: MusicCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    if (songId) {
      navigate(`/song/${songId}`);
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
    );
  }

  return (
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
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-neon-pink text-neon-pink' : ''}`} />
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); console.log('Add to playlist'); }}>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Add to Playlist
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

        {/* Duration */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{duration}</span>
          {variant === "featured" && (
            <span className="bg-gradient-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              Featured
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MusicCard;