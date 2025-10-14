import { useState, useEffect, useRef } from "react";
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
  Music,
  Users,
  ListPlus,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, handleImageError, DEFAULT_AVATAR_URL } from "@/lib/utils";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";

const lyricsMock = [
  { time: 0, text: "♪ Instrumental intro..." },
  { time: 12, text: "In the cosmic dreams we fly..." },
  { time: 24, text: "Lost in stars, just you and I..." },
  { time: 36, text: "Echoes fading through the night..." },
  { time: 48, text: "Guided by the endless light..." },
];

const MusicPlayer = () => {
  const location = useLocation();
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrevious,
    isShuffled,
    repeatMode,
    toggleShuffle,
    setRepeatMode 
  } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([0]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLyric, setCurrentLyric] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasReportedListen, setHasReportedListen] = useState(false);
  const [listenTime, setListenTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentTime = () => {
    if (!audioRef.current) return 0;
    return Math.floor(audioRef.current.currentTime);
  };

  // Load new song - professional handling with proper state management
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    
    const audio = audioRef.current;
    
    // Immediately pause and reset current playback
    audio.pause();
    audio.currentTime = 0;
    setIsLoading(true);
    
    // Reset all tracking states for new song
    setHasReportedListen(false);
    setListenTime(0);
    setProgress([0]);
    setCurrentLyric(0);
    setDuration(0);
    
    // Set new audio source
    const audioUrl = currentSong.audioUrl || currentSong.audio || "";
    
    // Only update src if it's different to avoid unnecessary reloads
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
    }
    
    // Handler for when audio is ready to play
    const handleCanPlay = () => {
      setIsLoading(false);
      
      // Only auto-play if player was in playing state
      if (isPlaying) {
        audio.play().catch(err => {
          console.error("Auto-play failed:", err);
          toast({
            title: "Playback paused",
            description: "Click play to continue",
          });
        });
      }
    };
    
    // Handler for load errors
    const handleLoadError = (e: Event) => {
      console.error("Audio load error:", e);
      setIsLoading(false);
      toast({
        title: "Load error",
        description: "Failed to load audio. Skipping to next song...",
        variant: "destructive",
      });
      
      // Auto-skip to next song after 2 seconds
      setTimeout(() => {
        playNext();
      }, 2000);
    };
    
    // Attach event listeners
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleLoadError);
    
    // Start loading the audio
    audio.load();
    
    // Cleanup
    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleLoadError);
    };
  }, [currentSong]); // Only depend on currentSong change

  // Handle play/pause toggle separately
  useEffect(() => {
    if (!audioRef.current || isLoading) return;
    
    const audio = audioRef.current;
    
    if (isPlaying && audio.paused && audio.readyState >= 2) {
      // readyState >= 2 means enough data to play
      audio.play().catch(err => {
        console.error("Play error:", err);
        toast({
          title: "Playback error",
          description: "Unable to play audio",
          variant: "destructive",
        });
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, isLoading]);
  // Track listen time
  useEffect(() => {
    if (!audioRef.current || !isPlaying || hasReportedListen) return;

    const interval = setInterval(() => {
      setListenTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, hasReportedListen]);

  // Update progress and handle song end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        setProgress([progressPercent]);
      }
    };

    const updateDuration = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      console.log("Song ended, repeat mode:", repeatMode);
      
      if (repeatMode === "one") {
        // Repeat current song
        audio.currentTime = 0;
        audio.play().catch(err => console.error("Repeat play error:", err));
      } else {
        // Play next song (works for both "all" and "off" modes)
        console.log("Playing next song");
        playNext();
      }
    };

    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      toast({
        title: "Playback error",
        description: "Failed to play audio. Trying next song...",
        variant: "destructive",
      });
      // Try next song on error
      setTimeout(() => playNext(), 1000);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [repeatMode, playNext, toast]);

  // Handle volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
  }, [volume, isMuted]);

  // Handle progress seek
  const handleProgressChange = (value: number[]) => {
    if (!audioRef.current || isNaN(audioRef.current.duration)) return;
    
    setProgress(value);
    const newTime = (value[0] / 100) * audioRef.current.duration;
    
    if (!isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Auto update lyrics highlight
  useEffect(() => {
    const currentTime = getCurrentTime();
    const index = lyricsMock.findIndex(
      (line, i) =>
        currentTime >= line.time &&
        (i === lyricsMock.length - 1 || currentTime < lyricsMock[i + 1].time)
    );
    if (index !== -1) setCurrentLyric(index);
  }, [progress]);

  // Record listening history when 50% of song is played
  useEffect(() => {
    if (!currentSong || hasReportedListen || !audioRef.current) return;

    const duration = audioRef.current.duration;
    if (duration && listenTime >= duration / 2) {
      listeningHistoryApi
        .recordListen({
          userId: 1, // TODO: Get from auth context
          songId: currentSong.id,
        })
        .then(() => setHasReportedListen(true))
        .catch(err => console.error("Failed to record listen:", err));
    }
  }, [listenTime, currentSong, hasReportedListen]);

  const toggleMute = () => setIsMuted(!isMuted);
  
  const handleShuffleToggle = () => {
    toggleShuffle();
    toast({
      title: isShuffled ? "Shuffle off" : "Shuffle on",
      description: isShuffled 
        ? "Playing songs in order" 
        : "Playing songs in random order",
      duration: 2000,
    });
  };
  
  const toggleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from favorites" : "Added to favorites",
      duration: 2000,
    });
  };

  const handleShare = (type: string) => {
    if (!currentSong) return;
    
    switch (type) {
      case "friends":
        toast({
          title: "Share with friends",
          description: `Sharing "${currentSong.title}" with your friends`,
        });
        break;
      case "playlist":
        toast({
          title: "Add to playlist",
          description: `Adding "${currentSong.title}" to your playlist`,
        });
        break;
      case "copy":
        navigator.clipboard.writeText(`${window.location.origin}/song/${currentSong.id}`);
        toast({
          title: "Link copied!",
          description: "Song link copied to clipboard",
        });
        break;
    }
  };

  const cycleRepeat = () => {
    const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"];
    const modeNames = ["Repeat off", "Repeat one", "Repeat all"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    const nextModeName = modeNames[(currentIndex + 1) % modes.length];
    
    setRepeatMode(nextMode);
    toast({
      title: nextModeName,
      description: 
        nextMode === "one" ? "Current song will repeat" :
        nextMode === "all" ? "All songs will repeat" :
        "Songs will play once",
      duration: 2000,
    });
  };

  // Hide player on login page or if no song is playing
  if (location.pathname === "/login" || !currentSong) {
    return null;
  }

  return (
    <>
      {/* Audio Element */}
      <audio ref={audioRef} />
      
      {/* Mini Player */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40">
        <div className="container mx-auto px-2 sm:px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Song Info */}
           {/* Song Info */}
<div className="flex items-center space-x-3 flex-1 min-w-0 order-1 sm:order-none">
  <div
    className="relative group cursor-pointer"
    onClick={() => setIsExpanded(true)}
  >
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow">
      {currentSong.cover ? (
        <img
          src={currentSong.cover}
          alt={currentSong.title}
          onError={handleImageError}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            isPlaying && "spin-reverse-slower"
          )}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center bg-gradient-primary transition-transform duration-300",
            isPlaying && "spin-reverse-slower"
          )}
        >
          <Music className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  </div>

  <div className="min-w-0 flex-1">
    <h4 className="text-sm sm:text-base font-medium text-foreground truncate">
      {currentSong.title || currentSong.name }
    </h4>
    <p className="text-xs sm:text-sm text-muted-foreground truncate">
     {currentSong.artist
  ? currentSong.artist
  : currentSong.artists && currentSong.artists.length > 0
    ? currentSong.artists.map((a) => a.name).join(", ")
    : "Unknown Artist"}

    </p>
  </div>

  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
    onClick={toggleLike}
  >
    <Heart
      className={cn(
        "w-4 h-4",
        isLiked && "fill-red-500 text-red-500"
      )}
    />
  </Button>
</div>


            {/* Player Controls */}
            <div className="flex flex-col items-center space-y-2 flex-1 max-w-md order-3 sm:order-none w-full sm:w-auto">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShuffleToggle}
                >
                  <Shuffle
                    className={cn("w-4 h-4", isShuffled && "text-primary")}
                  />
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={playPrevious}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="hero"
                  size="icon"
                  className="h-10 w-10 sm:h-12 sm:w-12"
                  onClick={togglePlay}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={playNext}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={cycleRepeat}
                >
                  <Repeat
                    className={cn(
                      "w-4 h-4",
                      repeatMode !== "off" && "text-primary"
                    )}
                  />
                  {repeatMode === "one" && (
                    <span className="absolute text-xs font-bold text-primary">
                      1
                    </span>
                  )}
                </Button>
              </div>

              {/* Progress */}
              <div className="flex items-center space-x-2 w-full px-2 sm:px-0">
                <span className="text-xs text-muted-foreground w-8 text-right hidden sm:block">
                  {formatTime(getCurrentTime())}
                </span>
                <Slider
                  value={progress}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8 hidden sm:block">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume & Actions */}
            <div className="flex items-center space-x-2 flex-1 justify-end order-2 sm:order-none">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleShare("friends")}>
                    <Users className="w-4 h-4 mr-2" />
                    Share with friends
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare("playlist")}>
                    <ListPlus className="w-4 h-4 mr-2" />
                    Add to playlist
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleShare("copy")}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden sm:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted || volume[0] === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
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

      {/* Expanded Player */}
      {isExpanded && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-lg flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border/40">
            <h3 className="text-lg font-semibold">Now Playing</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
              ✕
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-4 overflow-y-auto">
            {/* Cover */}
            <div className="w-64 h-64 rounded-full overflow-hidden shadow-lg">
              {currentSong.cover ? (
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  onError={handleImageError}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-300",
                    isPlaying && "spin-reverse-slower"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-full h-full flex items-center justify-center bg-gradient-primary transition-transform duration-300",
                  isPlaying && "spin-reverse-slower"
                )}>
                  <Music className="w-20 h-20 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold">{currentSong.title}</h2>
              <p className="text-muted-foreground">{currentSong.artist}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center space-y-4 w-full max-w-lg">
              <div className="flex items-center space-x-2 w-full px-4">
                <span className="text-xs text-muted-foreground">
                  {formatTime(getCurrentTime())}
                </span>
                <Slider
                  value={progress}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <Button variant="ghost" size="icon" onClick={toggleShuffle}>
                  <Shuffle
                    className={cn("w-6 h-6", isShuffled && "text-primary")}
                  />
                </Button>
                <Button variant="ghost" size="icon" onClick={playPrevious}>
                  <SkipBack className="w-6 h-6" />
                </Button>
                <Button
                  variant="hero"
                  size="icon"
                  className="h-14 w-14"
                  onClick={togglePlay}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={playNext}>
                  <SkipForward className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cycleRepeat}>
                  <Repeat
                    className={cn(
                      "w-6 h-6",
                      repeatMode !== "off" && "text-primary"
                    )}
                  />
                  {repeatMode === "one" && (
                    <span className="absolute text-xs font-bold text-primary">
                      1
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Lyrics */}
            <div className="w-full max-w-lg text-center mt-6 space-y-2">
              {lyricsMock.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-sm transition-colors",
                    i === currentLyric
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;
