import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, MoreHorizontal, X, SkipForward, SkipBack, Repeat, Repeat1, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusic, type Song } from "@/contexts/MusicContext";
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

// QueueItem component tách riêng để tránh re-render
const QueueItem = memo(({ 
  song, 
  index, 
  isCurrent, 
  onPlay, 
  onRemove 
}: { 
  song: Song; 
  index: number; 
  isCurrent: boolean; 
  onPlay: () => void; 
  onRemove: () => void;
}) => {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2 hover:bg-accent cursor-pointer transition-colors",
        isCurrent && "bg-accent/50"
      )}
      onClick={onPlay}
    >
      {/* Number */}
      <div className={cn(
        "text-xs font-medium w-6 text-center",
        isCurrent ? "text-primary" : "text-muted-foreground"
      )}>
        {index + 1}
      </div>

      {/* Cover Image */}
      {song.cover && (
        <img
          src={song.cover}
          alt={song.title || song.name}
          className="w-10 h-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-medium truncate text-sm",
          isCurrent && "text-primary"
        )}>
          {song.title || song.name || 'Unknown Song'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {song.artist || 'Unknown Artist'}
        </div>
      </div>

      {/* Status/Actions */}
      {isCurrent ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Đang phát</span>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

QueueItem.displayName = 'QueueItem';

// SongInfo component - chỉ re-render khi currentSong thay đổi
const SongInfo = memo(({ song }: { song: Song }) => {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {song.cover && (
        <img
          src={song.cover}
          alt={song.title || song.name}
          className="w-14 h-14 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{song.title || song.name || 'Unknown Song'}</div>
        <div className="text-sm text-muted-foreground truncate">
          {song.artist || 'Unknown Artist'}
        </div>
      </div>
    </div>
  );
});
SongInfo.displayName = 'SongInfo';

// Controls component
const Controls = memo(({
  isPlaying,
  isLoading,
  onTogglePlay,
  onPrevious,
  onNext,
  onToggleShuffle,
  onCycleRepeatMode,
  isShuffled,
  repeatMode,
  canGoPrevious,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
  isShuffled: boolean;
  repeatMode: "off" | "one" | "all";
  canGoPrevious: boolean;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleShuffle}
        disabled={isLoading}
        className={cn(
          "rounded-full h-9 w-9 transition-all",
          isShuffled 
            ? "text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30" 
            : "hover:bg-accent"
        )}
        title={isShuffled ? "Tắt phát ngẫu nhiên" : "Bật phát ngẫu nhiên"}
      >
        <Shuffle className={cn(
          "w-5 h-5 transition-all",
          isShuffled && "fill-current scale-110"
        )} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={isLoading || !canGoPrevious}
        className={cn("rounded-full", !canGoPrevious && "opacity-50 cursor-not-allowed")}
        title={!canGoPrevious ? "Chế độ lặp đang tắt" : "Bài trước"}
      >
        <SkipBack className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePlay}
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

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={isLoading}
        className="rounded-full"
        title="Bài tiếp theo"
      >
        <SkipForward className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onCycleRepeatMode}
        disabled={isLoading}
        className={cn(
          "rounded-full h-9 w-9 transition-all",
          repeatMode !== "off"
            ? "text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30"
            : "hover:bg-accent"
        )}
        title={
          repeatMode === "off"
            ? "Bật lặp lại"
            : repeatMode === "all"
            ? "Lặp lại tất cả"
            : "Lặp lại một bài"
        }
      >
        {repeatMode === "one" ? (
          <Repeat1 className={cn(
            "w-5 h-5 transition-all",
            repeatMode === "one" && "fill-current scale-110"
          )} />
        ) : (
          <Repeat className={cn(
            "w-5 h-5 transition-all",
            repeatMode === "all" && "fill-current scale-110"
          )} />
        )}
      </Button>
    </div>
  );
});
Controls.displayName = 'Controls';

// ProgressBar component
const ProgressBar = memo(({
  currentTime,
  duration,
  formattedCurrentTime,
  formattedDuration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  formattedCurrentTime: string;
  formattedDuration: string;
  onSeek: (value: number[]) => void;
}) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-muted-foreground min-w-[40px] text-right">
        {formattedCurrentTime}
      </span>
      <Slider
        value={[currentTime]}
        max={duration || 0}
        step={0.1}
        onValueChange={onSeek}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground min-w-[40px]">
        {formattedDuration}
      </span>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// VolumeControl component
const VolumeControl = memo(({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
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
        onValueChange={onVolumeChange}
        className="flex-1"
      />
    </div>
  );
});
VolumeControl.displayName = 'VolumeControl';

// QueueMenu component
const QueueMenu = memo(({
  queue,
  currentSong,
  showQueue,
  onOpenChange,
  onPlaySong,
  onRemoveFromQueue,
}: {
  queue: Song[];
  currentSong: Song | null;
  showQueue: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (songId: string | number) => Promise<void>;
}) => {
  return (
    <DropdownMenu open={showQueue} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
        >
          <MoreHorizontal className="w-5 h-5" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="text-sm font-semibold">Danh sách chờ</div>
          <div className="text-xs text-muted-foreground mt-1">
            {queue.length} {queue.length === 1 ? 'bài hát' : 'bài hát'}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Danh sách chờ trống
            </div>
          ) : (
            <div className="py-2">
              {queue.map((song, index) => (
                <QueueItem
                  key={song.id}
                  song={song}
                  index={index}
                  isCurrent={currentSong?.id === song.id}
                  onPlay={async () => {
                    if (currentSong?.id !== song.id) {
                      // Khi click vào bài trong queue, dùng playSongWithStreamUrl để giữ nguyên queue
                      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
                      await playSongWithStreamUrl(song, onPlaySong);
                    }
                  }}
                  onRemove={async () => {
                    await onRemoveFromQueue(song.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
QueueMenu.displayName = 'QueueMenu';

const MusicPlayer = () => {
  const location = useLocation();
  const { currentSong, queue, playNext, playPrevious, removeFromQueue, playSong, repeatMode, isShuffled, toggleShuffle, setRepeatMode, togglePlay, updatePosition } = useMusic();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Detect tab visibility (khi chuyển tab browser)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsTabActive(!document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Setup BroadcastChannel để nhận commands từ MiniPlayer và gửi state updates
  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      return;
    }

    // Chỉ setup khi là tab chính (có thể phát nhạc)
    const isMainTab = location.pathname !== "/login";
    if (!isMainTab || !currentSong) {
      return;
    }

    const channel = new BroadcastChannel("player");
    channelRef.current = channel;

    // Lắng nghe commands từ MiniPlayer
    channel.onmessage = async (event) => {
      const data = event.data;
      console.log('[MusicPlayer] Nhận được message từ BroadcastChannel:', data);
      
      if (data.type === "PLAYER_CONTROL") {
        console.log('[MusicPlayer] Xử lý command:', data.action);
        try {
          switch (data.action) {
            case "togglePlay":
              console.log('[MusicPlayer] Gọi togglePlay');
              await togglePlay();
              break;
            case "next":
              console.log('[MusicPlayer] Gọi playNext');
              await playNext();
              break;
            case "previous":
              console.log('[MusicPlayer] Gọi playPrevious');
              await playPrevious();
              break;
            case "seek":
              console.log('[MusicPlayer] Gọi seek:', data.position);
              if (data.position !== undefined && audioRef.current) {
                // Seek trực tiếp trên audio element
                audioRef.current.currentTime = data.position / 1000; // Convert từ milliseconds sang seconds
                setCurrentTime(data.position / 1000);
                // Cập nhật position trong context
                await updatePosition(data.position);
              }
              break;
          }
        } catch (error) {
          console.error('[MusicPlayer] Lỗi khi xử lý command:', error);
        }
      }
    };

    // Gửi state updates định kỳ (ngay cả khi tab không active)
    const sendStateUpdate = () => {
      if (currentSong && currentTime >= 0 && duration > 0) {
        channel.postMessage({
          type: "PLAYER_STATE_UPDATE",
          songId: currentSong.id,
          currentTime: currentTime, // Đã là seconds rồi
          duration: duration, // Đã là seconds rồi
          isPlaying: isPlaying,
          songTitle: currentSong.title || currentSong.name || currentSong.songName,
          songArtist: currentSong.artist,
          songCover: currentSong.cover,
        });
      }
    };

    // Gửi update ngay lập tức
    sendStateUpdate();

    // Gửi update định kỳ (mỗi giây)
    const interval = setInterval(sendStateUpdate, 1000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [togglePlay, playNext, playPrevious, location.pathname, currentSong, currentTime, duration, isPlaying]);

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
        let response;
        try {
          response = await apiClient.post(`/songs/${songId}/play-now`, {});
        } catch (error: unknown) {
          // Xử lý lỗi 404 - không có UUID trên S3
          const err = error as { 
            response?: { 
              status?: number; 
              data?: { 
                message?: string; 
                error?: string;
              } 
            }; 
            message?: string 
          };
          const errorMessage = err?.response?.data?.error 
            || err?.response?.data?.message 
            || err?.message 
            || '';
          
          // Kiểm tra các loại lỗi liên quan đến HLS/stream
          if (err?.response?.status === 404 || 
              errorMessage.includes('HLS master playlist not found') ||
              errorMessage.includes('missing uuid')) {
            const songName = currentSong.title || currentSong.name || 'bài hát này';
      toast({
              title: "Không thể phát bài hát",
              description: `Không thể phát ${songName} ngay lúc này. Đang chuyển sang bài tiếp theo...`,
              variant: "destructive",
            });
            setIsLoading(false);
            setIsPlaying(false);
            // Xóa bài hát khỏi queue và chuyển sang bài tiếp theo
            await removeFromQueue(currentSong.id);
            // Luôn cố gắng phát bài tiếp theo (playNext sẽ tự kiểm tra queue)
            await playNext();
      return;
    }
          
          // Lỗi khác - báo lỗi chi tiết
          const songName = currentSong.title || currentSong.name || 'bài hát này';
          const detailedError = errorMessage || 'Không thể phát bài hát';
    toast({
            title: "Lỗi phát nhạc",
            description: `Không thể phát ${songName}: ${detailedError}`,
            variant: "destructive",
          });
          setIsLoading(false);
          setIsPlaying(false);
          // Xóa bài hát khỏi queue và chuyển sang bài tiếp theo
          await removeFromQueue(currentSong.id);
          await playNext();
      return;
    }
        
        // Kiểm tra response có lỗi hoặc thiếu UUID
        if (response.data?.success === false || !response.data?.song?.uuid) {
          const errorMsg = response.data?.error || response.data?.message || '';
          const songName = currentSong.title || currentSong.name || 'bài hát này';
          
          // Kiểm tra nếu là lỗi HLS/stream
          if (errorMsg.includes('HLS master playlist not found') || 
              errorMsg.includes('missing uuid')) {
        toast({
              title: "Không thể phát bài hát",
              description: `Không thể phát ${songName} ngay lúc này. Đang chuyển sang bài tiếp theo...`,
          variant: "destructive",
        });
        setIsLoading(false);
            setIsPlaying(false);
            // Xóa bài hát khỏi queue và chuyển sang bài tiếp theo
            await removeFromQueue(currentSong.id);
            // Luôn cố gắng phát bài tiếp theo (playNext sẽ tự kiểm tra queue)
            await playNext();
            return;
          }
          
          // Lỗi khác
          toast({
            title: "Không thể phát bài hát",
            description: `Không thể phát ${songName} ngay lúc này.`,
            variant: "destructive",
          });
          setIsLoading(false);
          setIsPlaying(false);
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
          audio.volume = volume; // Set volume khi tạo mới
          audioRef.current = audio;
        }

        const audio = audioRef.current;
        
        // Reset audio nhưng giữ volume
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume; // Đảm bảo volume được giữ nguyên
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
            // Đảm bảo volume được set đúng
            audio.volume = volume;
            // Auto play from beginning
            audio.currentTime = 0;
            audio.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.error('Play failed:', err);
              setIsLoading(false);
              setIsPlaying(false);
                toast({
                title: "Lỗi phát nhạc",
                description: "Không thể phát bài hát. Vui lòng thử lại.",
                  variant: "destructive",
                });
            });
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
                setIsLoading(false);
              setIsPlaying(false);
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
          audio.volume = volume; // Đảm bảo volume được set đúng
          audio.load();
          audio.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            setDuration(audio.duration);
            // Đảm bảo volume được set đúng
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.error('Play failed:', err);
          setIsLoading(false);
              setIsPlaying(false);
          toast({
                title: "Lỗi phát nhạc",
                description: "Không thể phát bài hát. Vui lòng thử lại.",
            variant: "destructive",
          });
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

        const handleEnded = async () => {
          setIsPlaying(false);
          setCurrentTime(0);
          
          // Xử lý khi bài hát kết thúc dựa trên repeatMode và shuffle
          if (currentSong) {
            if (repeatMode === "one") {
              // Lặp lại bài hát hiện tại - không xóa khỏi queue
              audio.currentTime = 0;
              audio.play().then(() => {
                setIsPlaying(true);
              }).catch((err) => {
                console.error('Play failed:', err);
                setIsPlaying(false);
                toast({
                  title: "Lỗi phát nhạc",
                  description: "Không thể lặp lại bài hát. Vui lòng thử lại.",
                  variant: "destructive",
                });
              });
            } else if (repeatMode === "all") {
              // repeatMode === "all": Phát bài tiếp theo, quay lại bài đầu nếu hết queue
              await playNext();
            } else {
              // repeatMode === "off": Phát bài tiếp theo (nếu có) và xóa bài hiện tại
              const currentSongId = currentSong.id;
              
              console.log('[MusicPlayer] Song ended, repeatMode is off, playing next song and removing current:', currentSongId);
              
              // Gọi playNext() để phát bài tiếp theo (nếu có trong queue)
              // playNext() sẽ tự dừng nếu hết queue
              await playNext();
              
              // Xóa bài hiện tại khỏi queue sau khi đã chuyển sang bài tiếp theo
              // Sử dụng setTimeout để đảm bảo playNext() đã hoàn thành và currentSong đã được set mới
              setTimeout(async () => {
                // Chỉ xóa nếu bài hát vẫn còn trong queue (tránh xóa nhầm bài mới)
                // Kiểm tra xem currentSong đã thay đổi chưa
                if (currentSongId) {
                  console.log('[MusicPlayer] Removing previous song from queue:', currentSongId);
                  await removeFromQueue(currentSongId);
                }
              }, 300);
            }
          }
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
        setIsPlaying(false);
        
        // Lấy thông tin lỗi chi tiết
        const err = error as { 
          response?: { 
            status?: number; 
            data?: { 
              message?: string; 
              error?: string;
            } 
          }; 
          message?: string 
        };
        const errorMessage = err?.response?.data?.error 
          || err?.response?.data?.message 
          || err?.message 
          || 'Không thể load stream';
        
        const songName = currentSong?.title || currentSong?.name || 'bài hát này';
            toast({
          title: "Lỗi phát nhạc",
          description: `Không thể phát ${songName}: ${errorMessage}`,
              variant: "destructive",
            });
        
        // Nếu có currentSong, xóa khỏi queue và chuyển sang bài tiếp theo
        if (currentSong) {
          await removeFromQueue(currentSong.id);
          await playNext();
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Update volume separately to avoid reloading stream
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Toggle play/pause - useCallback để tránh re-render
  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  // Seek - useCallback để tránh re-render
  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Volume control - useCallback để tránh re-render
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // Toggle mute - useCallback để tránh re-render
  const handleToggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Toggle shuffle - useCallback để tránh re-render
  const handleToggleShuffle = useCallback(async () => {
    console.log('[MusicPlayer] Toggle shuffle clicked, current state:', isShuffled);
    await toggleShuffle();
    console.log('[MusicPlayer] Shuffle toggled, new state:', !isShuffled);
  }, [toggleShuffle, isShuffled]);

  // Cycle repeat mode - useCallback để tránh re-render
  const handleCycleRepeatMode = useCallback(async () => {
    console.log('[MusicPlayer] Cycle repeat mode clicked, current mode:', repeatMode);
    let newMode: "off" | "one" | "all";
    if (repeatMode === "off") {
      newMode = "all";
    } else if (repeatMode === "all") {
      newMode = "one";
    } else {
      newMode = "off";
    }
    console.log('[MusicPlayer] Setting repeat mode to:', newMode);
    await setRepeatMode(newMode);
    console.log('[MusicPlayer] Repeat mode set to:', newMode);
  }, [repeatMode, setRepeatMode]);

  // Format time - useMemo để cache kết quả
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Memoize formatted times để tránh re-render
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime, formatTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration, formatTime]);
  const canGoPrevious = useMemo(() => repeatMode !== "off", [repeatMode]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[MusicPlayer] State updated:', {
      isShuffled,
      repeatMode,
      isPlaying,
      currentSong: currentSong?.title || currentSong?.name
    });
  }, [isShuffled, repeatMode, isPlaying, currentSong]);

  // Hide player on login page, if no song, or if tab is not active (MiniPlayer will show instead)
  if (location.pathname === "/login" || !currentSong || !isTabActive) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 w-full">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Song Info - Bên trái */}
          <div className="flex-shrink-0">
            <SongInfo song={currentSong} />
          </div>

          {/* Controls - Ở giữa */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl mx-auto">
            <Controls
              isPlaying={isPlaying}
              isLoading={isLoading}
              onTogglePlay={handleTogglePlay}
              onPrevious={playPrevious}
              onNext={playNext}
              onToggleShuffle={handleToggleShuffle}
              onCycleRepeatMode={handleCycleRepeatMode}
              isShuffled={isShuffled}
              repeatMode={repeatMode}
              canGoPrevious={canGoPrevious}
            />

            {/* Progress Bar */}
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              formattedCurrentTime={formattedCurrentTime}
              formattedDuration={formattedDuration}
              onSeek={handleSeek}
            />
          </div>

          {/* Volume và Queue - Bên phải */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />

            <QueueMenu
              queue={queue}
              currentSong={currentSong}
              showQueue={showQueue}
              onOpenChange={setShowQueue}
              onPlaySong={playSong}
              onRemoveFromQueue={removeFromQueue}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MusicPlayer);