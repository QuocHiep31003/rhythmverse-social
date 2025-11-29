import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/config";
import { getAuthToken } from "@/services/api";
import Hls from "hls.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MusicPlayer = () => {
  const location = useLocation();
  const { currentSong, queue, playNext, removeFromQueue } = useMusic();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load and play stream from songID
  useEffect(() => {
    if (!currentSong) {
      // Cleanup when no song
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const loadAndPlayStream = async () => {
      try {
        setIsLoading(true);
        
        const songId = typeof currentSong.id === 'string' ? parseInt(currentSong.id, 10) : currentSong.id;
        if (isNaN(songId)) {
          toast({
            title: "Lỗi",
            description: "ID bài hát không hợp lệ.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Gọi /play-now để lấy stream URL
        const response = await apiClient.post(`/songs/${songId}/play-now`, {});
        
        if (response.data?.success === false || !response.data?.song?.uuid) {
          toast({
            title: "Lỗi",
            description: "Không thể lấy stream URL.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const songUuid = response.data.song.uuid;
        const streamUrl = `${window.location.origin}/api/songs/${songId}/stream-proxy/${songUuid}_128kbps.m3u8`;
        
        // Cleanup previous HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        // Create audio element if not exists
        if (!audioRef.current) {
          const audio = document.createElement('audio');
          audio.crossOrigin = 'anonymous';
          audioRef.current = audio;
        }

        const audio = audioRef.current;
        
        // Reset audio
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);

        // Load HLS
        if (Hls.isSupported()) {
          const token = getAuthToken();
          const hls = new Hls({
            enableWorker: true,
            xhrSetup: (xhr) => {
              if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
            },
          });
          
          hls.loadSource(streamUrl);
          hls.attachMedia(audio);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
              setDuration(audio.duration);
            }
            // Auto play from beginning
            audio.currentTime = 0;
            audio.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.error('Play failed:', err);
            });
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setIsLoading(false);
              toast({
                title: "Lỗi phát nhạc",
                description: "Không thể load stream.",
                variant: "destructive",
              });
            }
          });

          hlsRef.current = hls;
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          audio.src = streamUrl;
          audio.load();
          audio.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            setDuration(audio.duration);
            audio.currentTime = 0;
            audio.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.error('Play failed:', err);
            });
          });
        } else {
          setIsLoading(false);
          toast({
            title: "Lỗi",
            description: "Trình duyệt không hỗ trợ HLS.",
            variant: "destructive",
          });
        }

        // Setup audio event listeners
        const handleLoadedMetadata = () => {
          setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        const handlePlay = () => {
          setIsPlaying(true);
        };

        const handlePause = () => {
          setIsPlaying(false);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.volume = volume;

        // Return cleanup function
        return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
        };
      } catch (error) {
        console.error("Failed to load stream:", error);
        setIsLoading(false);
        toast({
          title: "Lỗi",
          description: "Không thể load stream.",
          variant: "destructive",
        });
      }
    };

    let audioCleanup: (() => void) | null = null;

    loadAndPlayStream().then((cleanup) => {
      if (cleanup) {
        audioCleanup = cleanup;
      }
    });

    // Cleanup on unmount or song change
    return () => {
      if (audioCleanup) {
        audioCleanup();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSong, volume]);

  // Toggle play/pause
  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume control
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Hide player on login page or if no song
  if (location.pathname === "/login" || !currentSong) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {currentSong.cover && (
              <img
                src={currentSong.cover}
                alt={currentSong.title || currentSong.name}
                className="w-14 h-14 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-music.png';
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{currentSong.title || currentSong.name || 'Unknown Song'}</div>
              <div className="text-sm text-muted-foreground truncate">
                {currentSong.artist || 'Unknown Artist'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePlay}
                disabled={isLoading}
                className="rounded-full"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 0}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleMute}
              className="h-9 w-9"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
