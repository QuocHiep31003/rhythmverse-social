import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  Share2,
  Shuffle,
  Repeat,
  Music
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover?: string;
}

const MusicPlayer = () => {
  const location = useLocation();
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([30]);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentSong: Song = {
    id: "1",
    title: "Cosmic Dreams",
    artist: "EchoVerse Artists",
    album: "Space Vibes",
    duration: 240
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentTime = () => {
    return Math.floor((progress[0] / 100) * currentSong.duration);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleShuffle = () => setIsShuffled(!isShuffled);
  const toggleLike = () => setIsLiked(!isLiked);
  
  const cycleRepeat = () => {
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  // Hide player on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Main Player Bar */}
<div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40">
  <div className="container mx-auto px-2 sm:px-4 py-3">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Song Info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0 order-1 sm:order-none">
        <div 
          className="relative group cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-medium text-foreground truncate">
            {currentSong.title}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {currentSong.artist}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
          onClick={toggleLike}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-red-500 text-red-500")} />
        </Button>
      </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center space-y-2 flex-1 max-w-md order-3 sm:order-none w-full sm:w-auto">
        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleShuffle}>
            <Shuffle className={cn("w-4 h-4", isShuffled && "text-primary")} />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button variant="hero" size="icon" className="h-10 w-10 sm:h-12 sm:w-12" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SkipForward className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleRepeat}>
            <Repeat className={cn("w-4 h-4", repeatMode !== 'off' && "text-primary")} />
            {repeatMode === 'one' && <span className="absolute text-xs font-bold text-primary">1</span>}
          </Button>
        </div>

        {/* Progress */}
        <div className="flex items-center space-x-2 w-full px-2 sm:px-0">
          <span className="text-xs text-muted-foreground w-8 text-right hidden sm:block">
            {formatTime(getCurrentTime())}
          </span>
          <Slider value={progress} onValueChange={setProgress} max={100} step={1} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8 hidden sm:block">
            {formatTime(currentSong.duration)}
          </span>
        </div>
      </div>

      {/* Volume & Actions */}
      <div className="flex items-center space-x-2 flex-1 justify-end order-2 sm:order-none">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
        
        {/* Ẩn volume trên mobile, hiện từ sm: */}
        <div className="hidden sm:flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
            {isMuted || volume[0] === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={isMuted ? [0] : volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      </div>
    </div>
  </div>
</div>

    </>
  );
};

export default MusicPlayer;