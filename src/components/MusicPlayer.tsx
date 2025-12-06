import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, MoreHorizontal, X, SkipForward, SkipBack, Repeat, Repeat1, Shuffle, GripVertical, List, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusic, type Song } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/config";
import { getAuthToken, decodeToken } from "@/services/api";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import Hls from "hls.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSongDisplay } from "@/lib/songDisplay";
import QueueSidebar from "@/components/QueueSidebar";

// QueueItem component tách riêng để tránh re-render
const QueueItem = memo(({ 
  song, 
  index, 
  isCurrent, 
  onPlay, 
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dragOverIndex
}: { 
  song: Song; 
  index: number; 
  isCurrent: boolean; 
  onPlay: () => void; 
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}) => {
  return (
    <div
      draggable={!isCurrent}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-3 px-4 py-2 hover:bg-accent cursor-pointer transition-colors",
        isCurrent && "bg-accent/50",
        isDragging && "opacity-50",
        dragOverIndex === index && !isCurrent && "border-t-2 border-primary"
      )}
      onClick={onPlay}
    >
      {/* Drag Handle - chỉ hiển thị khi không phải bài đang phát */}
      {!isCurrent ? (
        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-4 h-4" />
      )}

      {/* Number */}
      <div className={cn(
        "text-xs font-medium w-6 text-center",
        isCurrent ? "text-primary" : "text-muted-foreground"
      )}>
        {index + 1}
      </div>

      {/* Cover Image */}
      {getSongDisplay(song).cover && (
        <img
          src={getSongDisplay(song).cover!}
          alt={getSongDisplay(song).title}
          className="w-10 h-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        {(() => {
          const { title, artist } = getSongDisplay(song);
          return (
            <>
              <div
                className={cn(
                  "font-medium truncate text-sm",
                  isCurrent && "text-primary"
                )}
              >
                {title}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {artist}
              </div>
            </>
          );
        })()}
      </div>

      {/* Status/Actions */}
      {isCurrent ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Playing</span>
        </div>
      ) : (
        // Menu 3 chấm cho từng bài trong queue
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Thêm vào danh sách yêu thích (tuỳ logic bạn đã có)
                // ví dụ: favoritesApi.addSongToFavorites(song.id)
              }}
            >
              Add to Favorites
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove from queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

QueueItem.displayName = 'QueueItem';

// SongInfo component - chỉ re-render khi currentSong thay đổi
const SongInfo = memo(({ song }: { song: Song }) => {
  const { title, artist, cover } = getSongDisplay(song);
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {cover && (
        <img
          src={cover}
          alt={title}
          className="w-14 h-14 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {artist}
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
        title={isShuffled ? "Disable shuffle" : "Enable shuffle"}
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
        title={!canGoPrevious ? "Repeat is off" : "Previous"}
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
        title="Next"
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
            ? "Enable repeat"
            : repeatMode === "all"
            ? "Repeat all"
            : "Repeat one"
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
  setQueue,
  moveQueueItem,
}: {
  queue: Song[];
  currentSong: Song | null;
  showQueue: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaySong: (song: Song, skipApiCall?: boolean) => Promise<void>;
  onRemoveFromQueue: (songId: string | number) => Promise<void>;
  setQueue: (songs: Song[]) => Promise<void>;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"queue" | null>("queue");

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveQueueItem(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <DropdownMenu open={showQueue} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="Queue"
        >
          <List className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] max-h-[700px] overflow-hidden flex flex-col">
        {/* Nội dung queue */}
        <div className="overflow-y-auto flex-1 py-2">
          {queue.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Queue is empty
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
                      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
                      await playSongWithStreamUrl(song as Song & { [key: string]: unknown }, onPlaySong, setQueue, queue, currentSong);
                    }
                  }}
                  onRemove={async () => {
                    await onRemoveFromQueue(song.id);
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedIndex === index}
                  dragOverIndex={dragOverIndex}
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
  const { currentSong, queue, playNext, playPrevious, removeFromQueue, playSong, repeatMode, isShuffled, toggleShuffle, setRepeatMode, togglePlay, updatePosition, setQueue, addToQueue, moveQueueItem, resetPlayer } = useMusic();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Sử dụng state local cho isPlaying, đồng bộ qua BroadcastChannel
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isMainTab, setIsMainTab] = useState(false); // Track if this tab is the main tab
  const channelRef = useRef<BroadcastChannel | null>(null);
  // Tracking listening history
  const listeningHistoryIdRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const lastUpdateTimeRef = useRef<number>(0);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const songStartTimeRef = useRef<number | null>(null); // Track when song started playing for accurate duration
  const isUpdatingOnEndRef = useRef<boolean>(false); // Flag to prevent duplicate updates when song ends
  const lastRecordedDurationRef = useRef<number>(0); // Track last recorded duration to avoid unnecessary updates
  // Lấy hoặc tạo tabId chung cho tab này (dùng sessionStorage để đảm bảo cùng tabId cho cả ControlMusicPlayer và MusicPlayer)
  const getOrCreateTabId = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let tabId = sessionStorage.getItem('tabId');
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        sessionStorage.setItem('tabId', tabId);
      }
      return tabId;
    }
    return `tab_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };
  const tabIdRef = useRef<string>(getOrCreateTabId());
  const noMainTabRef = useRef<boolean>(false);
  // Ref để track queue và tránh re-run useEffect
  const queueRef = useRef<Song[]>(queue);
  // Ref để lưu currentTime cần set khi audio load (từ BECOME_MAIN_TAB_AND_PLAY)
  const pendingCurrentTimeRef = useRef<number | null>(null);

  // Detect tab visibility (khi chuyển tab browser) - chỉ cập nhật state, không pause
  // Chỉ pause khi tab bị đóng, không pause khi chuyển tab
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

  // Xử lý logout event - dừng audio, cleanup và reload page
  useEffect(() => {
    const handleLogout = () => {
      console.log('[MusicPlayer] 🔔 Logout event received, stopping player and reloading page...');
      
      // Dừng audio ngay lập tức
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(false);
      
      // Reload page để đảm bảo mọi thứ được reset hoàn toàn (chỉ khi không ở trang login)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        console.log('[MusicPlayer] Reloading page after logout...');
        // Đợi một chút để đảm bảo các cleanup khác đã hoàn thành
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    // Lắng nghe logout event từ cùng tab
    window.addEventListener('logout', handleLogout);
    
    // Lắng nghe logout event từ BroadcastChannel (từ tab khác)
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const logoutChannel = new BroadcastChannel('auth_channel');
      logoutChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
          handleLogout();
        }
      };
      
      return () => {
        window.removeEventListener('logout', handleLogout);
        logoutChannel.close();
      };
    }
    
    return () => {
      window.removeEventListener('logout', handleLogout);
    };
  }, []);

  // Detect khi tab bị đóng - pause audio và gửi message "MAIN_TAB_CLOSED"
  useEffect(() => {
    const handleBeforeUnload = () => {
      // QUAN TRỌNG: Gửi MAIN_TAB_CLOSED ngay cả khi đang pause, miễn là có currentSong
      // Để tab phụ biết tab chính đã đóng và có thể tiếp tục phát nhạc
      if (currentSong && channelRef.current) {
        console.log('[MusicPlayer] Tab bị đóng, gửi message MAIN_TAB_CLOSED với thông tin bài hát');
        
        // Pause audio element nếu đang phát
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Gửi message "MAIN_TAB_CLOSED" với thông tin đầy đủ để tab phụ có thể tiếp tục
        channelRef.current.postMessage({
          type: "MAIN_TAB_CLOSED",
          tabId: tabIdRef.current,
          song: {
            id: currentSong.id,
            title: currentSong.title || currentSong.name || currentSong.songName,
            name: currentSong.name || currentSong.songName,
            songName: currentSong.songName,
            artist: currentSong.artist,
            cover: currentSong.cover,
          },
          currentTime: currentTime,
          duration: duration,
          isPlaying: isPlaying,
          queue: queueRef.current.map(s => ({ 
            id: s.id, 
            title: s.title || s.name || s.songName, 
            name: s.name || s.songName,
            artist: s.artist, 
            cover: s.cover 
          })),
        });
      }
    };

    const handleUnload = () => {
      // QUAN TRỌNG: Gửi MAIN_TAB_CLOSED ngay cả khi đang pause, miễn là có currentSong
      // Để tab phụ biết tab chính đã đóng và có thể tiếp tục phát nhạc
      if (currentSong && channelRef.current) {
        console.log('[MusicPlayer] Tab bị đóng (unload), gửi message MAIN_TAB_CLOSED với thông tin bài hát');
        
        // Pause audio element nếu đang phát
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Gửi message "MAIN_TAB_CLOSED" với thông tin đầy đủ để tab phụ có thể tiếp tục
        channelRef.current.postMessage({
          type: "MAIN_TAB_CLOSED",
          tabId: tabIdRef.current,
          song: {
            id: currentSong.id,
            title: currentSong.title || currentSong.name || currentSong.songName,
            name: currentSong.name || currentSong.songName,
            songName: currentSong.songName,
            artist: currentSong.artist,
            cover: currentSong.cover,
          },
          currentTime: currentTime,
          duration: duration,
          isPlaying: isPlaying,
          queue: queueRef.current.map(s => ({ 
            id: s.id, 
            title: s.title || s.name || s.songName, 
            name: s.name || s.songName,
            artist: s.artist, 
            cover: s.cover 
          })),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [currentSong, isPlaying]);

  // Setup BroadcastChannel để nhận commands từ MiniPlayer và gửi state updates
  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      return;
    }

    // Chỉ setup khi là tab đang phát (có thể phát nhạc)
    const isMainTab = location.pathname !== "/login";
    if (!isMainTab) {
      return;
    }

    // Setup channel ngay cả khi chưa có currentSong để nhận commands từ MiniPlayer
    const channel = new BroadcastChannel("player");
    channelRef.current = channel;

    // Gửi state updates định kỳ (ngay cả khi tab không active)
    // QUAN TRỌNG: Sử dụng queueRef để tránh closure stale
    const sendStateUpdate = () => {
      // Chỉ gửi khi có currentSong và giá trị hợp lệ
      // CHỈ tab đang phát (tab đang phát nhạc) mới gửi state update
      if (currentSong && currentTime >= 0 && duration > 0) {
        channel.postMessage({
          type: "PLAYER_STATE_UPDATE",
          tabId: tabIdRef.current, // Gửi tab ID để biết tab nào đang phát
          songId: currentSong.id,
          currentTime: currentTime, // Đã là seconds rồi
          duration: duration, // Đã là seconds rồi
          isPlaying: isPlaying,
          songTitle: currentSong.title || currentSong.name || currentSong.songName,
          songArtist: currentSong.artist,
          songCover: currentSong.cover,
          queue: queueRef.current.map(s => ({ 
            id: s.id, 
            title: s.title || s.name || s.songName, 
            name: s.name || s.songName,
            artist: s.artist, 
            cover: s.cover 
          })),
        });
        // Đánh dấu đây là tab đang phát nếu đang phát nhạc
        if (isPlaying && audioRef.current && !audioRef.current.paused) {
          setIsMainTab(true);
          channel.postMessage({
            type: "MAIN_TAB_ACTIVE",
            tabId: tabIdRef.current,
          });
          noMainTabRef.current = false;
        }
      }
    };

    // Gửi full state update (bao gồm repeatMode, isShuffled, volume, isMuted)
    const sendFullStateUpdate = () => {
      if (currentSong) {
        channel.postMessage({
          type: "PLAYER_STATE_UPDATE_FULL",
          tabId: tabIdRef.current,
          repeatMode: repeatMode,
          isShuffled: isShuffled,
          volume: volume,
          isMuted: isMuted,
        });
      }
    };

    // Gửi queue update
    // QUAN TRỌNG: Sử dụng queueRef để tránh closure stale và đảm bảo queue không bị mất
    const sendQueueUpdate = () => {
      channel.postMessage({
        type: "QUEUE_UPDATE",
        tabId: tabIdRef.current,
        queue: queueRef.current.map(s => ({ 
          id: s.id, 
          title: s.title || s.name || s.songName, 
          name: s.name || s.songName,
          artist: s.artist, 
          cover: s.cover 
        })),
      });
    };

    // Lắng nghe commands từ MiniPlayer
    channel.onmessage = async (event) => {
      const data = event.data;
      // Chỉ log các message quan trọng, không log PLAYER_STATE_UPDATE để tránh spam
      if (data.type !== "PLAYER_STATE_UPDATE") {
        console.log('[MusicPlayer] Nhận được message từ BroadcastChannel:', data);
      }
      
      // Xử lý REQUEST_STATE từ tab điều khiển
      if (data.type === "REQUEST_STATE") {
        console.log('[MusicPlayer] Nhận được REQUEST_STATE từ tab điều khiển, gửi lại state hiện tại');
        if (currentSong && channelRef.current) {
          // Gửi PLAYER_STATE_UPDATE
          sendStateUpdate();
          // Gửi PLAYER_STATE_UPDATE_FULL
          sendFullStateUpdate();
          // Gửi QUEUE_UPDATE
          sendQueueUpdate();
        }
        return;
      }
      
      // Xử lý BECOME_MAIN_TAB_AND_PLAY từ tab điều khiển
      if (data.type === "BECOME_MAIN_TAB_AND_PLAY") {
        console.log('[MusicPlayer] Nhận được BECOME_MAIN_TAB_AND_PLAY, data.tabId:', data.tabId, 'tabIdRef.current:', tabIdRef.current);
        // Chỉ xử lý nếu tabId khớp với tab này
        if (data.tabId !== tabIdRef.current) {
          console.log('[MusicPlayer] TabId không khớp, bỏ qua command');
          return;
        }
        
        console.log('[MusicPlayer] Nhận được BECOME_MAIN_TAB_AND_PLAY, đồng bộ toàn bộ thông tin và trở thành tab đang phát');
        
        try {
          // 1. Trở thành tab đang phát
          setIsMainTab(true);
          noMainTabRef.current = false;
          
          // 2. Đồng bộ queue - QUAN TRỌNG: Set queue trước để playSong không reset
          if (data.queue && data.queue.length > 0) {
            const queueSongs: Song[] = data.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
              id: String(q.id),
              name: q.title || q.name || "Unknown Song",
              songName: q.title || q.name || "Unknown Song",
              title: q.title || q.name || "Unknown Song",
              artist: q.artist || "Unknown Artist",
              album: "",
              duration: 0,
              cover: q.cover || "",
            }));
            console.log('[MusicPlayer] Đồng bộ queue từ tab điều khiển, queue length:', queueSongs.length);
            await setQueue(queueSongs);
            // Đợi một chút để queue được cập nhật trong context (tránh race condition)
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // Nếu không có queue trong data, kiểm tra xem queue trong context đã có chưa
            // Nếu queue đã có nhiều bài, giữ nguyên queue đó
            if (queue && queue.length > 1) {
              console.log('[MusicPlayer] Không có queue trong data nhưng queue trong context đã có', queue.length, 'bài, giữ nguyên queue');
            }
          }
          
          // 3. Đồng bộ repeatMode, isShuffled, volume, isMuted
          if (data.repeatMode !== undefined) {
            await setRepeatMode(data.repeatMode);
          }
          if (data.isShuffled !== undefined && data.isShuffled !== isShuffled) {
            // Chỉ toggle nếu state khác nhau
            await toggleShuffle();
          }
          if (data.volume !== undefined && audioRef.current) {
            audioRef.current.volume = data.volume;
          }
          if (data.isMuted !== undefined && audioRef.current) {
            audioRef.current.muted = data.isMuted;
          }
          
          // 4. Lưu currentTime vào ref để set sau khi audio load
          if (data.currentTime !== undefined && data.currentTime > 0) {
            console.log('[MusicPlayer] Lưu currentTime vào pendingCurrentTimeRef:', data.currentTime);
            pendingCurrentTimeRef.current = data.currentTime;
          }
          
          // 5. Phát bài hát từ vị trí đã lưu
          if (data.song && data.song.id) {
            const songToPlay = data.queue?.find((q: { id: string | number }) => String(q.id) === String(data.song.id)) || data.song;
            const song: Song = {
              id: String(songToPlay.id),
              name: songToPlay.title || songToPlay.name || songToPlay.songName || "Unknown Song",
              songName: songToPlay.title || songToPlay.name || songToPlay.songName || "Unknown Song",
              title: songToPlay.title || songToPlay.name || songToPlay.songName || "Unknown Song",
              artist: songToPlay.artist || "Unknown Artist",
              album: "",
              duration: data.duration || 0,
              cover: songToPlay.cover || "",
            };
            
            console.log('[MusicPlayer] Phát bài hát từ tab điều khiển:', song.title, 'tại vị trí:', data.currentTime, 'isPlaying:', data.isPlaying);
            
            // Kiểm tra xem bài hát đã có trong queue chưa
            // QUAN TRỌNG: Sử dụng queue từ data.queue hoặc queue trong context
            // Nếu queue đã được set từ data.queue, dùng queue đó
            const currentQueue = (data.queue && data.queue.length > 0) 
              ? data.queue.map((q: { id: string | number }) => ({ id: String(q.id) }))
              : queue;
            const songInQueue = currentQueue.find((q: { id: string }) => String(q.id) === String(song.id));
            // QUAN TRỌNG: Nếu queue có nhiều bài (> 1), luôn dùng skipApiCall = true để không reset queue
            const hasMultipleSongs = currentQueue.length > 1;
            const skipApiCall = songInQueue !== undefined || hasMultipleSongs;
            console.log('[MusicPlayer] Song in queue:', songInQueue !== undefined, 'hasMultipleSongs:', hasMultipleSongs, 'skipApiCall:', skipApiCall, 'queue length:', currentQueue.length);
            
            // Phát bài hát
            await playSong(song, skipApiCall);
            console.log('[MusicPlayer] Đã gọi playSong, currentSong:', currentSong?.id, 'audioRef.current:', audioRef.current);
            
            // Đợi một chút để playSong hoàn thành và audio element được cập nhật
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Đợi audio element sẵn sàng trước khi set currentTime
            const waitForAudio = () => {
              return new Promise<void>((resolve) => {
                if (audioRef.current) {
                  // Nếu audio đã có src và readyState >= 2, sẵn sàng
                  if (audioRef.current.src && audioRef.current.readyState >= 2) {
                    console.log('[MusicPlayer] Audio đã sẵn sàng, readyState:', audioRef.current.readyState, 'src:', audioRef.current.src);
                    resolve();
                    return;
                  }
                  
                  // Đợi audio load
                  const onCanPlay = () => {
                    console.log('[MusicPlayer] Audio đã load xong, readyState:', audioRef.current?.readyState);
                    audioRef.current?.removeEventListener('canplay', onCanPlay);
                    audioRef.current?.removeEventListener('loadedmetadata', onCanPlay);
                    resolve();
                  };
                  
                  audioRef.current.addEventListener('canplay', onCanPlay);
                  audioRef.current.addEventListener('loadedmetadata', onCanPlay);
                  
                  // Nếu audio đã có src, trigger load
                  if (audioRef.current.src) {
                    audioRef.current.load();
                  }
                  
                  // Timeout sau 5 giây
                  setTimeout(() => {
                    audioRef.current?.removeEventListener('canplay', onCanPlay);
                    audioRef.current?.removeEventListener('loadedmetadata', onCanPlay);
                    console.log('[MusicPlayer] Timeout đợi audio, tiếp tục...');
                    resolve();
                  }, 5000);
                } else {
                  console.error('[MusicPlayer] audioRef.current là null sau khi playSong');
                  resolve();
                }
              });
            };
            
            await waitForAudio();
            
            // Set vị trí phát - đợi metadata load xong trước
            if (data.currentTime !== undefined && data.currentTime > 0 && audioRef.current) {
              console.log('[MusicPlayer] Đợi metadata load để set currentTime:', data.currentTime);
              
              // Đợi metadata load xong (cần để seek chính xác)
              const waitForMetadata = () => {
                return new Promise<void>((resolve) => {
                  if (audioRef.current && audioRef.current.readyState >= 1) {
                    // Metadata đã load
                    console.log('[MusicPlayer] Metadata đã load, readyState:', audioRef.current.readyState);
                    resolve();
                  } else {
                    // Đợi metadata load
                    const onLoadedMetadata = () => {
                      console.log('[MusicPlayer] Metadata đã load xong');
                      audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                      resolve();
                    };
                    audioRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
                    
                    // Timeout sau 3 giây
                    setTimeout(() => {
                      audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                      console.log('[MusicPlayer] Timeout đợi metadata, tiếp tục...');
                      resolve();
                    }, 3000);
                  }
                });
              };
              
              await waitForMetadata();
              
              // Set currentTime
              if (audioRef.current) {
                console.log('[MusicPlayer] Set currentTime:', data.currentTime, 'duration:', audioRef.current.duration);
                try {
                  audioRef.current.currentTime = data.currentTime;
                  await updatePosition(data.currentTime * 1000); // Convert to milliseconds
                  console.log('[MusicPlayer] Đã set currentTime thành công, currentTime thực tế:', audioRef.current.currentTime);
                  
                  // Đợi một chút để đảm bảo seek đã hoàn thành
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (err) {
                  console.error('[MusicPlayer] Lỗi khi set currentTime:', err);
                }
              }
            }
            
            // Phát hoặc pause tùy theo isPlaying
            if (data.isPlaying) {
              console.log('[MusicPlayer] Bắt đầu phát nhạc từ vị trí:', audioRef.current?.currentTime || data.currentTime);
              setIsPlaying(true);
              if (audioRef.current) {
                console.log('[MusicPlayer] Gọi audio.play(), audio.src:', audioRef.current.src, 'currentTime:', audioRef.current.currentTime);
                audioRef.current.play().then(() => {
                  console.log('[MusicPlayer] Phát nhạc thành công tại vị trí:', audioRef.current?.currentTime);
                  
                  // Kiểm tra lại currentTime sau khi play (có thể bị reset)
                  if (data.currentTime !== undefined && data.currentTime > 0 && audioRef.current) {
                    const actualTime = audioRef.current.currentTime;
                    const expectedTime = data.currentTime;
                    const diff = Math.abs(actualTime - expectedTime);
                    
                    // Nếu sai số > 1s, set lại
                    if (diff > 1) {
                      console.log('[MusicPlayer] Sai số lớn, set lại currentTime. Expected:', expectedTime, 'Actual:', actualTime, 'Diff:', diff);
                      setTimeout(() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = expectedTime;
                          updatePosition(expectedTime * 1000);
                        }
                      }, 200);
                    }
                  }
                }).catch(err => {
                  console.error('[MusicPlayer] Play failed:', err);
                  setIsPlaying(false);
                });
              } else {
                console.error('[MusicPlayer] audioRef.current là null, không thể phát');
              }
            } else {
              console.log('[MusicPlayer] Pause nhạc');
              setIsPlaying(false);
              if (audioRef.current) {
                audioRef.current.pause();
              }
            }
          }
          
          // 5. Gửi MAIN_TAB_ACTIVE để các tab khác biết
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: "MAIN_TAB_ACTIVE",
              tabId: tabIdRef.current,
            });
          }
          
          // 6. Gửi state update
          setTimeout(() => {
            sendStateUpdate();
            sendFullStateUpdate();
          }, 500);
          
        } catch (error) {
          console.error('[MusicPlayer] Lỗi khi xử lý BECOME_MAIN_TAB_AND_PLAY:', error);
        }
        
        return;
      }
      
      if (data.type === "PLAYER_CONTROL") {
        console.log('[MusicPlayer] Xử lý command:', data.action);
        try {
          switch (data.action) {
            case "togglePlay": {
              console.log('[MusicPlayer] Gọi togglePlay, currentSong:', currentSong, 'isPlaying:', isPlaying, 'queue length:', queue.length, 'noMainTab:', data.noMainTab);
              // Chỉ toggle play/pause nếu đã có currentSong
              if (!currentSong) {
                console.warn('[MusicPlayer] Không có currentSong, không thể toggle play. Command từ MiniPlayer sẽ bị bỏ qua.');
                break;
              }
              
              // Nếu có flag noMainTab = true, tab này sẽ trở thành tab đang phát
              if (data.noMainTab && data.tabId === tabIdRef.current) {
                console.log('[MusicPlayer] Nhận được togglePlay với flag noMainTab, tab này sẽ trở thành tab đang phát');
                setIsMainTab(true);
                noMainTabRef.current = false;
              }
              
              // Toggle isPlaying state local ngay lập tức
              const newIsPlaying = !isPlaying;
              setIsPlaying(newIsPlaying);
              
              // Gọi togglePlay từ context (để cập nhật backend)
              await togglePlay();
              
              // Điều khiển audio element trực tiếp
              if (audioRef.current) {
                if (newIsPlaying) {
                  audioRef.current.play().catch(err => {
                    console.error('Play failed:', err);
                    setIsPlaying(false);
                  });
                } else {
                  audioRef.current.pause();
                }
              }
              
              // Nếu trở thành tab đang phát, gửi MAIN_TAB_ACTIVE
              if (data.noMainTab && data.tabId === tabIdRef.current && newIsPlaying) {
                if (channelRef.current) {
                  channelRef.current.postMessage({
                    type: "MAIN_TAB_ACTIVE",
                    tabId: tabIdRef.current,
                  });
                }
              }
              
              // Gửi state update ngay lập tức với giá trị mới
              setTimeout(() => {
                console.log('[MusicPlayer] Gửi state update sau toggle, isPlaying mới:', newIsPlaying);
                sendStateUpdate();
              }, 100);
              break;
            }
            case "next":
              console.log('[MusicPlayer] Gọi playNext');
              await playNext();
              // Gửi state update ngay sau khi chuyển bài
              setTimeout(() => sendStateUpdate(), 100);
              break;
            case "previous":
              console.log('[MusicPlayer] Gọi playPrevious');
              await playPrevious();
              // Gửi state update ngay sau khi chuyển bài
              setTimeout(() => sendStateUpdate(), 100);
              break;
            case "playSong":
              console.log('[MusicPlayer] Nhận được playSong command, songId:', data.songId, 'queue length:', queue.length);
              if (data.songId) {
                // Tìm bài hát trong queue
                const songToPlay = queue.find(s => String(s.id) === String(data.songId));
                if (songToPlay) {
                  // Kiểm tra xem bài hát này có phải là bài đang phát không
                  const isCurrentSong = currentSong && String(currentSong.id) === String(data.songId);
                  
                  if (isCurrentSong) {
                    // Bài hát này đang được phát → chỉ cần tiếp tục phát từ vị trí hiện tại
                    console.log('[MusicPlayer] Bài hát này đang được phát, tiếp tục phát từ vị trí hiện tại');
                    if (audioRef.current && audioRef.current.paused) {
                      // Nếu đang pause, play lại
                      audioRef.current.play().catch(err => {
                        console.error('Play failed:', err);
                        setIsPlaying(false);
                      });
                      setIsPlaying(true);
                      await togglePlay();
                    }
                    // Nếu đang play, không cần làm gì cả, chỉ cần gửi state update
                    setTimeout(() => sendStateUpdate(), 100);
                  } else {
                    // Bài hát này không phải bài đang phát → phát bài mới
                    console.log('[MusicPlayer] Tìm thấy bài hát trong queue, phát:', songToPlay.title || songToPlay.name);
                    await playSong(songToPlay, true); // skipApiCall = true vì chỉ cần phát bài từ queue
                    // Gửi state update ngay sau khi phát bài
                    setTimeout(() => sendStateUpdate(), 200);
                  }
                } else {
                  console.warn('[MusicPlayer] Không tìm thấy bài hát trong queue với songId:', data.songId);
                  // Nếu không tìm thấy trong queue, có thể là bài hát mới từ tab khác
                  // Trong trường hợp này, tab khác nên gửi thông tin bài hát đầy đủ qua command "playNewSong"
                }
              } else {
                console.warn('[MusicPlayer] Không có songId');
              }
              break;
            case "playNewSong": {
              // Yêu cầu phát bài hát mới (không có trong queue hiện tại)
              // QUAN TRỌNG: Nếu tab này đang phát nhạc (có currentSong) và nhận được command từ tab khác
              // → Tab này phải dừng nhạc và trở thành tab phụ, để tab khác trở thành tab chính mới
              const hasCurrentSong = currentSong !== null && currentSong !== undefined;
              
              if (hasCurrentSong) {
                // Tab này đang phát nhạc nhưng nhận được command từ tab khác
                // → Dừng nhạc và trở thành tab phụ
                console.log('[MusicPlayer] Nhận được playNewSong command từ tab khác, tab này đang phát nhạc → dừng nhạc và trở thành tab phụ');
                
                // Dừng nhạc đang phát
                if (audioRef.current && !audioRef.current.paused) {
                  audioRef.current.pause();
                }
                setIsPlaying(false);
                
                // Reset player để trở thành tab phụ
                // Gọi resetPlayer để clear currentSong và các state khác
                resetPlayer();
                
                // Đánh dấu đây không còn là tab chính
                setIsMainTab(false);
                
                // Cập nhật queue từ tab khác (nếu có)
                if (data.queue && data.queue.length > 0) {
                  const queueSongs: Song[] = data.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
                    id: String(q.id),
                    name: q.title || q.name || "Unknown Song",
                    songName: q.title || q.name || "Unknown Song",
                    title: q.title || q.name || "Unknown Song",
                    artist: q.artist || "Unknown Artist",
                    album: "",
                    duration: 0,
                    cover: q.cover || "",
                  }));
                  await setQueue(queueSongs);
                  console.log('[MusicPlayer] Tab phụ đã cập nhật queue từ tab chính mới, queue length:', queueSongs.length);
                }
                
                // Bỏ qua command này - không phát nhạc ở tab này
                console.log('[MusicPlayer] Tab này đã trở thành tab phụ, bỏ qua command phát nhạc');
                break;
              } else {
                // Tab này chưa có currentSong → kiểm tra xem có tab nào đang phát nhạc không
                // QUAN TRỌNG: Chỉ có 1 tab được phát nhạc tại một thời điểm
                console.log('[MusicPlayer] Nhận được playNewSong command nhưng tab này chưa có currentSong, kiểm tra xem có tab nào đang phát không...');
                
                // Nếu flag "no main tab" = true → tab này sẽ trở thành tab đang phát
                if (noMainTabRef.current) {
                  console.log('[MusicPlayer] Flag "no main tab" = true, tab này sẽ trở thành tab đang phát và phát nhạc');
                } else {
                  // Đợi một khoảng thời gian ngẫu nhiên nhỏ (0-100ms) để tránh race condition
                  const randomDelay = Math.random() * 100;
                  await new Promise(resolve => setTimeout(resolve, randomDelay));
                  
                  // Kiểm tra lại xem có currentSong chưa (có thể tab khác đã phát trong lúc đợi)
                  if (currentSong) {
                    console.log('[MusicPlayer] Tab này đã có currentSong trong lúc đợi, bỏ qua command này');
                    break;
                  }
                  
                  // Kiểm tra xem có tab nào đang phát nhạc không
                  let hasOtherTabPlaying = false;
                  const checkChannel = new BroadcastChannel('player');
                  
                  // Promise để đợi kết quả kiểm tra
                  const checkPromise = new Promise<boolean>((resolve) => {
                    const checkTimeout = setTimeout(() => {
                      checkChannel.close();
                      resolve(hasOtherTabPlaying);
                    }, 150);
                    
                    const checkHandler = (event: MessageEvent) => {
                      if (event.data.type === "MAIN_TAB_RESPONSE" && event.data.isPlaying) {
                        hasOtherTabPlaying = true;
                        clearTimeout(checkTimeout);
                        checkChannel.removeEventListener('message', checkHandler);
                        checkChannel.close();
                        resolve(true);
                      }
                    };
                    
                    checkChannel.addEventListener('message', checkHandler);
                    
                    // Gửi message kiểm tra tab đang phát
                    checkChannel.postMessage({
                      type: "MAIN_TAB_CHECK",
                    });
                  });
                  
                  // Đợi kết quả kiểm tra
                  hasOtherTabPlaying = await checkPromise;
                  
                  // Kiểm tra lại một lần nữa xem có currentSong chưa
                  if (currentSong) {
                    console.log('[MusicPlayer] Tab này đã có currentSong sau khi kiểm tra, bỏ qua command này');
                    break;
                  }
                  
                  if (hasOtherTabPlaying) {
                    console.log('[MusicPlayer] Có tab khác đang phát nhạc, bỏ qua command này');
                    break;
                  } else {
                    console.log('[MusicPlayer] Không có tab nào đang phát, tab này sẽ phát nhạc và trở thành tab đang phát');
                  }
                }
              }
              
              console.log('[MusicPlayer] Xử lý playNewSong command:', data.song, 'currentSong:', currentSong?.id, 'isPlaying:', isPlaying);
              if (data.song) {
                // Cập nhật queue: nếu có queue mới từ tab khác, dùng queue đó, nếu không thì set queue với bài hát này
                if (data.queue && data.queue.length > 0) {
                  // Chuyển đổi queue từ format BroadcastChannel sang format Song
                  const queueSongs: Song[] = data.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
                    id: String(q.id),
                    name: q.title || q.name || "Unknown Song",
                    songName: q.title || q.name || "Unknown Song",
                    title: q.title || q.name || "Unknown Song",
                    artist: q.artist || "Unknown Artist",
                    album: "",
                    duration: 0,
                    cover: q.cover || "",
                  }));
                  console.log('[MusicPlayer] Cập nhật queue từ tab khác, queue length:', queueSongs.length);
                  await setQueue(queueSongs);
                } else {
                  // Nếu không có queue, set queue với bài hát này
                  const newSong: Song = {
                    id: String(data.song.id),
                    name: data.song.title || data.song.name || "Unknown Song",
                    songName: data.song.title || data.song.name || "Unknown Song",
                    title: data.song.title || data.song.name || "Unknown Song",
                    artist: data.song.artist || "Unknown Artist",
                    album: "",
                    duration: 0,
                    cover: data.song.cover || "",
                  };
                  console.log('[MusicPlayer] Set queue mới với bài hát:', newSong.title);
                  await setQueue([newSong]);
                }
                
                // Phát bài hát
                const songToPlay: Song = {
                  id: String(data.song.id),
                  name: data.song.title || data.song.name || "Unknown Song",
                  songName: data.song.title || data.song.name || "Unknown Song",
                  title: data.song.title || data.song.name || "Unknown Song",
                  artist: data.song.artist || "Unknown Artist",
                  album: "",
                  duration: 0,
                  cover: data.song.cover || "",
                };
                console.log('[MusicPlayer] Phát bài hát mới từ tab khác:', songToPlay.title);
                await playSong(songToPlay, false); // skipApiCall = false vì đây là bài hát mới, cần gọi API
                // Đánh dấu đây là tab đang phát
                setIsMainTab(true);
                // Gửi state update ngay sau khi phát bài
                setTimeout(() => sendStateUpdate(), 300);
              } else {
                console.warn('[MusicPlayer] Không có thông tin bài hát trong playNewSong command');
              }
              break;
            }
            case "pause":
              console.log('[MusicPlayer] Nhận được command pause từ tab khác');
              if (currentSong && isPlaying && audioRef.current) {
                setIsPlaying(false);
                audioRef.current.pause();
                await togglePlay(); // Cập nhật backend
                // Gửi state update ngay sau khi pause
                setTimeout(() => sendStateUpdate(), 100);
              }
              break;
            case "addToQueue": {
              // Tab phụ yêu cầu thêm bài hát vào queue
              console.log('[MusicPlayer] Nhận được command addToQueue từ tab khác:', data.song);
              if (data.song) {
                const songToAdd: Song = {
                  id: String(data.song.id),
                  name: data.song.title || data.song.name || "Unknown Song",
                  songName: data.song.title || data.song.name || "Unknown Song",
                  title: data.song.title || data.song.name || "Unknown Song",
                  artist: data.song.artist || "Unknown Artist",
                  album: "",
                  duration: 0,
                  cover: data.song.cover || "",
                };
                console.log('[MusicPlayer] Thêm bài hát vào queue:', songToAdd.title);
                await addToQueue(songToAdd);
                // Queue update sẽ được gửi tự động qua useEffect khi queue thay đổi
              }
              break;
            }
            case "seek":
              console.log('[MusicPlayer] Gọi seek:', data.position);
              if (data.position !== undefined && audioRef.current) {
                // Seek trực tiếp trên audio element
                audioRef.current.currentTime = data.position / 1000; // Convert từ milliseconds sang seconds
                setCurrentTime(data.position / 1000);
                // Cập nhật position trong context
                await updatePosition(data.position);
                // Gửi state update ngay sau khi seek
                setTimeout(() => sendStateUpdate(), 100);
              }
              break;
            case "toggleShuffle": {
              console.log('[MusicPlayer] Gọi toggleShuffle từ tab điều khiển');
              await toggleShuffle();
              // Gửi full state update với giá trị mới ngay lập tức (không đợi state update từ context)
              const newShuffled = !isShuffled;
              if (channelRef.current && currentSong) {
                channelRef.current.postMessage({
                  type: "PLAYER_STATE_UPDATE_FULL",
                  tabId: tabIdRef.current,
                  repeatMode: repeatMode,
                  isShuffled: newShuffled,
                  volume: volume,
                  isMuted: isMuted,
                });
              }
              break;
            }
            case "cycleRepeatMode": {
              console.log('[MusicPlayer] Gọi cycleRepeatMode từ tab điều khiển');
              // Cycle repeat mode: off -> all -> one -> off
              const nextRepeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
              await setRepeatMode(nextRepeatMode);
              // Gửi full state update với giá trị mới ngay lập tức (không đợi state update từ context)
              if (channelRef.current && currentSong) {
                channelRef.current.postMessage({
                  type: "PLAYER_STATE_UPDATE_FULL",
                  tabId: tabIdRef.current,
                  repeatMode: nextRepeatMode,
                  isShuffled: isShuffled,
                  volume: volume,
                  isMuted: isMuted,
                });
              }
              break;
            }
            case "setVolume":
              console.log('[MusicPlayer] Gọi setVolume:', data.volume);
              if (data.volume !== undefined && audioRef.current) {
                const newVolume = Math.max(0, Math.min(1, data.volume));
                setVolume(newVolume);
                audioRef.current.volume = newVolume;
                setIsMuted(newVolume === 0);
                // Gửi full state update ngay lập tức để đồng bộ volume
                sendFullStateUpdate();
              }
              break;
            case "toggleMute":
              console.log('[MusicPlayer] Gọi toggleMute');
              if (audioRef.current) {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                if (newMuted) {
                  audioRef.current.volume = 0;
                } else {
                  audioRef.current.volume = volume;
                }
                // Gửi full state update ngay lập tức để đồng bộ mute state
                sendFullStateUpdate();
              }
              break;
            case "removeFromQueue":
              console.log('[MusicPlayer] Gọi removeFromQueue:', data.songId);
              if (data.songId) {
                await removeFromQueue(data.songId);
                // Gửi queue update ngay sau khi remove
                setTimeout(() => sendQueueUpdate(), 100);
              }
              break;
            case "moveQueueItem":
              console.log('[MusicPlayer] Gọi moveQueueItem:', data.fromIndex, '->', data.toIndex);
              if (data.fromIndex !== undefined && data.toIndex !== undefined) {
                moveQueueItem(data.fromIndex, data.toIndex);
                // Gửi queue update ngay sau khi move
                setTimeout(() => sendQueueUpdate(), 100);
              }
              break;
          }
        } catch (error) {
          console.error('[MusicPlayer] Lỗi khi xử lý command:', error);
        }
      } else if (data.type === "PLAYER_STATE_UPDATE") {
        // Nhận state update từ tab khác
        // QUAN TRỌNG: Tab chính KHÔNG BAO GIỜ nhận message từ chính nó
        // Nếu tabId trùng với tabIdRef.current → đây là message từ chính tab này, bỏ qua
        if (data.tabId === tabIdRef.current) {
          // Message từ chính tab này, bỏ qua (không cần xử lý)
          return;
        }
        
        // QUAN TRỌNG: Tab chính KHÔNG BAO GIỜ trở thành tab khác
        // Nếu tab này là tab đang phát (isMainTab = true), bỏ qua state update từ tab khác
        const isFromOtherTab = data.tabId && data.tabId !== tabIdRef.current;
        
        if (isFromOtherTab && isMainTab) {
          // Tab này là tab đang phát, nhận được state update từ tab khác
          // Không làm gì cả, tab đang phát vẫn là tab đang phát
          // Không log để tránh spam console
          return;
        } else if (isFromOtherTab && !isMainTab) {
          // Tab này là tab khác, nhận được state update từ tab đang phát
          // Chỉ cập nhật UI, không làm gì cả
          // Không log để tránh spam console
          return;
        }
      } else if (data.type === "FOCUS_REQUEST") {
        // MiniPlayer yêu cầu focus vào tab đang phát
        console.log('[MusicPlayer] Nhận được yêu cầu focus từ MiniPlayer');
        try {
          // Cố gắng focus window (chỉ hoạt động nếu tab đang mở)
          if (window.focus) {
            window.focus();
          }
          // Gửi response để MiniPlayer biết tab đang phát còn sống
          channel.postMessage({
            type: "FOCUS_RESPONSE",
          });
        } catch (error) {
          console.error('[MusicPlayer] Không thể focus window:', error);
        }
      } else if (data.type === "MAIN_TAB_CHECK") {
        // Tab khác đang kiểm tra xem có tab đang phát nào đang phát nhạc không
        // QUAN TRỌNG: Chỉ cần có currentSong là đủ để xác định đây là tab chính
        // Không cần isPlaying = true, vì tab chính có thể đang pause nhưng vẫn là tab chính
        if (currentSong) {
          console.log('[MusicPlayer] Nhận được MAIN_TAB_CHECK, tab này có currentSong (tab chính), gửi response, isPlaying:', isPlaying);
          channel.postMessage({
            type: "MAIN_TAB_RESPONSE",
            isPlaying: isPlaying, // Gửi trạng thái isPlaying để tab khác biết
          });
        }
      } else if (data.type === "ABOUT_TO_PLAY") {
        // Tab khác sắp phát nhạc
        // Nếu tab này đang phát nhạc (đã có currentSong và isPlaying), gửi response để tab khác biết
        if (currentSong && isPlaying) {
          console.log('[MusicPlayer] Nhận được ABOUT_TO_PLAY, tab này đang phát nhạc, gửi response');
          channel.postMessage({
            type: "ABOUT_TO_PLAY_RESPONSE",
            tabId: data.tabId,
          });
        }
      }
    };

    // Gửi update ngay lập tức (nếu có currentSong)
    if (currentSong) {
      sendStateUpdate();
      // Gửi full state update ngay lập tức để đồng bộ volume, repeatMode, isShuffled
      sendFullStateUpdate();
    }

    // Gửi update định kỳ (mỗi giây) - chỉ khi có currentSong
    const interval = setInterval(() => {
      if (currentSong) {
        sendStateUpdate();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, playNext, playPrevious, location.pathname, currentSong, currentTime, duration, isPlaying, addToQueue, isMuted, isShuffled, playSong, removeFromQueue, setQueue, setRepeatMode, toggleShuffle, updatePosition, volume, repeatMode]);
  // QUAN TRỌNG: Không thêm queue vào dependencies vì nó sẽ gây re-run useEffect
  // và reset channel.onmessage handler, làm mất state. Sử dụng queueRef thay thế.

  // Cập nhật queueRef khi queue thay đổi
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  
  // Gửi state update khi isPlaying hoặc queue thay đổi (để đồng bộ với MiniPlayer ngay lập tức)
  useEffect(() => {
    if (channelRef.current && currentSong && currentTime >= 0 && duration > 0) {
      // Gửi state update khi isPlaying hoặc queue thay đổi
      // Sử dụng queueRef.current để tránh dependency queue gây re-run
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE",
        songId: currentSong.id,
        currentTime: currentTime,
        duration: duration,
        isPlaying: isPlaying, // Sử dụng state local
        songTitle: currentSong.title || currentSong.name || currentSong.songName,
        songArtist: currentSong.artist,
        songCover: currentSong.cover,
        queue: queueRef.current.map(s => ({ 
          id: s.id, 
          title: s.title || s.name || s.songName, 
          name: s.name || s.songName,
          artist: s.artist, 
          cover: s.cover 
        })),
      });
    }
  }, [isPlaying, currentSong, currentTime, duration]);

  // Gửi queue update riêng khi queue thay đổi (ngay cả khi không có currentSong)
  useEffect(() => {
    if (channelRef.current && queue.length > 0) {
      console.log('[MusicPlayer] Queue thay đổi, gửi queue update lên BroadcastChannel, queue length:', queue.length);
      channelRef.current.postMessage({
        type: "QUEUE_UPDATE",
        queue: queue.map(s => ({ 
          id: s.id, 
          title: s.title || s.name || s.songName, 
          name: s.name || s.songName,
          artist: s.artist, 
          cover: s.cover 
        })),
      });
    }
  }, [queue]);

  // Gửi full state update khi repeatMode, isShuffled, volume, isMuted thay đổi
  useEffect(() => {
    if (channelRef.current && currentSong) {
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE_FULL",
        tabId: tabIdRef.current,
        repeatMode: repeatMode,
        isShuffled: isShuffled,
        volume: volume,
        isMuted: isMuted,
      });
    }
  }, [repeatMode, isShuffled, volume, isMuted, currentSong]);

  // QUAN TRỌNG: Set isMainTab = true ngay khi có currentSong và không có tab đang phát khác
  // Để tránh hiển thị ControlMusicPlayer khi lần đầu phát nhạc
  useEffect(() => {
    if (currentSong && !isMainTab && location.pathname !== "/login") {
      // Kiểm tra xem có tab đang phát nào khác đang phát không
      const checkMainTab = async () => {
        if (typeof window !== 'undefined' && window.BroadcastChannel) {
          let hasMainTab = false;
          const checkChannel = new BroadcastChannel('player');
          
          const checkPromise = new Promise<boolean>((resolve) => {
            const checkTimeout = setTimeout(() => {
              checkChannel.close();
              resolve(hasMainTab);
            }, 200);
            
            const checkHandler = (event: MessageEvent) => {
              if (event.data.type === "MAIN_TAB_RESPONSE" && event.data.isPlaying) {
                hasMainTab = true;
                clearTimeout(checkTimeout);
                checkChannel.removeEventListener('message', checkHandler);
                checkChannel.close();
                resolve(true);
              }
            };
            
            checkChannel.addEventListener('message', checkHandler);
            
            // Gửi message kiểm tra tab đang phát
            checkChannel.postMessage({
              type: "MAIN_TAB_CHECK",
            });
          });
          
          hasMainTab = await checkPromise;
          
          // Nếu không có tab đang phát nào, tab này sẽ trở thành tab đang phát
          if (!hasMainTab && !noMainTabRef.current) {
            console.log('[MusicPlayer] Không có tab đang phát nào, set isMainTab = true ngay khi có currentSong');
            setIsMainTab(true);
            noMainTabRef.current = false;
          }
        } else {
          // Không có BroadcastChannel, tab này là tab đang phát
          console.log('[MusicPlayer] Không có BroadcastChannel, set isMainTab = true');
          setIsMainTab(true);
          noMainTabRef.current = false;
        }
      };
      
      checkMainTab();
    }
  }, [currentSong, isMainTab, location.pathname]);

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

        // Nếu đã có uuid từ lần /play-now trước đó, dùng ngay để tránh gọi API lần 2
        const existingUuid = (currentSong as any)?.uuid;
        const existingStreamUrl = existingUuid
          ? `${window.location.origin}/api/songs/${songId}/stream-proxy/${existingUuid}_128kbps.m3u8`
          : null;

        let response;
        let streamUrl = existingStreamUrl;

        if (!streamUrl) {
          // Chưa có uuid/streamUrl → gọi /play-now
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
            } else {
              toast({
                title: "Lỗi phát nhạc",
                description: `Không thể phát ${songName}.`,
                variant: "destructive",
              });
            }

            setIsLoading(false);
            setIsPlaying(false);
            return;
          }

          const songUuid = response.data.song.uuid;
          streamUrl = `${window.location.origin}/api/songs/${songId}/stream-proxy/${songUuid}_128kbps.m3u8`;
        }
        
        // QUAN TRỌNG: Cập nhật currentSong với thông tin đầy đủ từ API response (nếu có)
        // Đảm bảo tên bài hát và avatar hiển thị đúng
        const songDataFromApi = response?.data?.song;
        const songDataForUpdate = songDataFromApi || currentSong;
        if (songDataFromApi) {
          const { mapToPlayerSong } = await import('@/lib/utils');
          const updatedSongData = mapToPlayerSong(songDataFromApi);
          // Convert PlayerSong sang Song format cho MusicContext
          const updatedSong: Song = {
            id: updatedSongData.id,
            name: updatedSongData.songName,
            title: updatedSongData.songName,
            songName: updatedSongData.songName,
            artist: updatedSongData.artist,
            cover: updatedSongData.cover,
            album: updatedSongData.album,
            duration: updatedSongData.duration,
            uuid: updatedSongData.uuid,
          };
          // Cập nhật currentSong trong context với thông tin đầy đủ
          // QUAN TRỌNG: Chỉ cập nhật nếu thông tin thực sự thay đổi, và KHÔNG reset queue
          if (updatedSong && (updatedSong.cover !== currentSong?.cover || 
              updatedSong.songName !== currentSong?.songName ||
              updatedSong.name !== currentSong?.name ||
              updatedSong.title !== currentSong?.title ||
              updatedSong.artist !== currentSong?.artist)) {
            console.log('[MusicPlayer] Cập nhật currentSong với thông tin đầy đủ từ API:', {
              cover: updatedSong.cover,
              title: updatedSong.title || updatedSong.name || updatedSong.songName,
              artist: updatedSong.artist,
              queueLength: queue.length
            });
            // QUAN TRỌNG: Chỉ cập nhật currentSong, KHÔNG gọi playSong vì nó có thể reset queue
            // Thay vào đó, chỉ cập nhật currentSong trực tiếp trong context nếu có thể
            // Hoặc đảm bảo playSong không reset queue khi skipApiCall = true và queue.length > 1
            // Logic trong MusicContext đã được sửa để không reset queue khi queue.length > 1
            playSong(updatedSong, true).catch(err => {
              console.error('[MusicPlayer] Lỗi khi cập nhật currentSong:', err);
            });
          }
        }
        
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
        // Chỉ reset currentTime nếu không có pendingCurrentTimeRef
        if (pendingCurrentTimeRef.current === null) {
          audio.currentTime = 0;
          setCurrentTime(0);
        }
        audio.volume = volume; // Đảm bảo volume được giữ nguyên
        // isPlaying được cập nhật tự động từ context qua Firebase

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
            // Set currentTime từ pendingCurrentTimeRef nếu có (từ BECOME_MAIN_TAB_AND_PLAY)
            if (pendingCurrentTimeRef.current !== null && pendingCurrentTimeRef.current > 0) {
              console.log('[MusicPlayer] Set currentTime từ pendingCurrentTimeRef:', pendingCurrentTimeRef.current);
              audio.currentTime = pendingCurrentTimeRef.current;
              setCurrentTime(pendingCurrentTimeRef.current);
              updatePosition(pendingCurrentTimeRef.current * 1000);
              pendingCurrentTimeRef.current = null; // Reset sau khi set
            } else {
              // Auto play from beginning
              audio.currentTime = 0;
            }
            audio.play().then(() => {
              setIsPlaying(true);
              // Đánh dấu đây là tab đang phát khi bắt đầu phát nhạc
              setIsMainTab(true);
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
            // Set currentTime từ pendingCurrentTimeRef nếu có (từ BECOME_MAIN_TAB_AND_PLAY)
            if (pendingCurrentTimeRef.current !== null && pendingCurrentTimeRef.current > 0) {
              console.log('[MusicPlayer] Set currentTime từ pendingCurrentTimeRef (Safari):', pendingCurrentTimeRef.current);
              audio.currentTime = pendingCurrentTimeRef.current;
              setCurrentTime(pendingCurrentTimeRef.current);
              updatePosition(pendingCurrentTimeRef.current * 1000);
              pendingCurrentTimeRef.current = null; // Reset sau khi set
            } else {
              audio.currentTime = 0;
            }
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
          
          // Update listening history khi bài hát kết thúc
          // QUAN TRỌNG: Chỉ update một lần, tránh duplicate records
          if (listeningHistoryIdRef.current && currentSong && !isUpdatingOnEndRef.current) {
            isUpdatingOnEndRef.current = true; // Set flag để tránh duplicate updates
            
            try {
              const token = getAuthToken();
              if (token) {
                const decoded = decodeToken(token);
                if (decoded && decoded.sub) {
                  const userId = parseInt(decoded.sub, 10);
                  if (!isNaN(userId)) {
                    // Tính duration chính xác từ start time (nếu có) hoặc dùng duration hiện tại
                    let listenedDuration: number;
                    if (songStartTimeRef.current) {
                      // Tính duration từ start time (chính xác hơn)
                      const actualDuration = Math.floor((Date.now() - songStartTimeRef.current) / 1000);
                      // Lấy giá trị nhỏ hơn giữa actualDuration và duration để tránh vượt quá
                      listenedDuration = Math.min(actualDuration, Math.floor(duration));
                    } else {
                      // Fallback: dùng duration hiện tại
                      listenedDuration = Math.floor(duration);
                    }
                    
                    const songDuration = duration > 0 ? Math.floor(duration) : undefined;
                    
                    // Chỉ update nếu duration khác với lần update cuối (tránh update không cần thiết)
                    if (Math.abs(listenedDuration - lastRecordedDurationRef.current) >= 3) {
                      await listeningHistoryApi.updateDuration(
                        listeningHistoryIdRef.current,
                        listenedDuration,
                        songDuration
                      );
                      lastRecordedDurationRef.current = listenedDuration;
                      console.log('[MusicPlayer] ✅ Updated listening history on song end:', listenedDuration, 's');
                    }
                  }
                }
              }
            } catch (error) {
              console.error('[MusicPlayer] ❌ Failed to update listening history on song end:', error);
            } finally {
              // Reset tracking và flag sau khi update xong
              listeningHistoryIdRef.current = null;
              songStartTimeRef.current = null;
              lastRecordedDurationRef.current = 0;
              sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              // Reset flag sau một chút để tránh race condition
              setTimeout(() => {
                isUpdatingOnEndRef.current = false;
              }, 1000);
            }
          }
          
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
          // Lưu start time khi bắt đầu phát (nếu chưa có)
          if (!songStartTimeRef.current) {
            songStartTimeRef.current = Date.now();
            // Nếu có currentTime > 0, tính ngược lại start time
            if (currentTime > 0) {
              songStartTimeRef.current = Date.now() - (currentTime * 1000);
            }
          }
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

  // Track listening history - tạo record khi bắt đầu phát và update định kỳ
  useEffect(() => {
    if (!currentSong || !isPlaying) {
      // Dừng tracking nếu không có bài hát hoặc đang pause
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      return;
    }

    const trackListeningHistory = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const decoded = decodeToken(token);
        if (!decoded || !decoded.sub) return;

        const userId = parseInt(decoded.sub, 10);
        if (isNaN(userId)) return;

        const songId = typeof currentSong.id === 'string' ? parseInt(currentSong.id, 10) : currentSong.id;
        if (isNaN(songId)) return;

        // Tính duration chính xác từ start time (nếu có) hoặc dùng currentTime
        let listenedDuration: number;
        if (songStartTimeRef.current) {
          // Tính duration từ start time (chính xác hơn, ~3s accuracy)
          const actualDuration = Math.floor((Date.now() - songStartTimeRef.current) / 1000);
          // Lấy giá trị nhỏ hơn giữa actualDuration và currentTime để tránh vượt quá
          listenedDuration = Math.min(actualDuration, Math.floor(currentTime));
        } else {
          // Fallback: dùng currentTime
          listenedDuration = Math.floor(currentTime);
        }
        
        const songDuration = duration > 0 ? Math.floor(duration) : undefined;

        // Nếu chưa có listening history ID, tạo record mới
        if (!listeningHistoryIdRef.current) {
          try {
            // Lấy sourceId và sourceType từ queue hoặc context nếu có
            // TODO: Có thể cải thiện để lấy từ context khi phát từ album/playlist
            const sourceId = undefined; // Có thể lấy từ queue hoặc context
            const sourceType = undefined; // Có thể lấy từ queue hoặc context

            const historyRecord = await listeningHistoryApi.recordListen({
              userId,
              songId,
              listenedDuration,
              songDuration,
              sessionId: sessionIdRef.current,
              sourceId,
              sourceType,
            });
            if (historyRecord?.id) {
              listeningHistoryIdRef.current = historyRecord.id;
              // Lưu start time khi tạo record mới (nếu chưa có)
              if (!songStartTimeRef.current) {
                songStartTimeRef.current = Date.now() - (listenedDuration * 1000); // Tính ngược lại start time
              }
              lastRecordedDurationRef.current = listenedDuration;
              console.log('[MusicPlayer] ✅ Created listening history record, ID:', historyRecord.id);
            }
          } catch (error) {
            console.error('[MusicPlayer] ❌ Failed to create listening history:', error);
          }
        } else {
          // Update record hiện có định kỳ (mỗi 15s) - chỉ update nếu duration thay đổi đáng kể (>= 3s)
          const now = Date.now();
          if (now - lastUpdateTimeRef.current >= 15000) { // Update mỗi 15 giây
            // Chỉ update nếu duration khác với lần update cuối ít nhất 3 giây
            if (Math.abs(listenedDuration - lastRecordedDurationRef.current) >= 3) {
              try {
                await listeningHistoryApi.updateDuration(
                  listeningHistoryIdRef.current,
                  listenedDuration,
                  songDuration
                );
                lastUpdateTimeRef.current = now;
                lastRecordedDurationRef.current = listenedDuration;
                console.log('[MusicPlayer] ✅ Updated listening history duration:', listenedDuration, 's');
              } catch (error) {
                console.error('[MusicPlayer] ❌ Failed to update listening history:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('[MusicPlayer] ❌ Error tracking listening history:', error);
      }
    };

    // Lưu start time khi bắt đầu phát bài hát mới
    if (isPlaying && !songStartTimeRef.current) {
      songStartTimeRef.current = Date.now();
    }
    
    // Track ngay lập tức khi bắt đầu phát
    trackListeningHistory();

    // Update định kỳ mỗi 15 giây
    trackingIntervalRef.current = setInterval(() => {
      trackListeningHistory();
    }, 15000);

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [currentSong, isPlaying, currentTime, duration]);

  // Update listening history khi pause (KHÔNG update khi song ends - đã xử lý trong handleEnded)
  useEffect(() => {
    if (!currentSong || !listeningHistoryIdRef.current) return;
    
    // QUAN TRỌNG: Bỏ qua nếu đang update khi song ends (tránh duplicate)
    if (isUpdatingOnEndRef.current) return;
    
    // QUAN TRỌNG: Bỏ qua nếu bài hát đã kết thúc (currentTime >= duration - 1)
    // Vì handleEnded đã xử lý rồi
    if (currentTime >= duration - 1) return;

    const updateOnPause = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const decoded = decodeToken(token);
        if (!decoded || !decoded.sub) return;

        // Tính duration chính xác từ start time (nếu có) hoặc dùng currentTime
        let listenedDuration: number;
        if (songStartTimeRef.current && isPlaying === false) {
          // Khi pause, tính duration từ start time đến bây giờ
          const actualDuration = Math.floor((Date.now() - songStartTimeRef.current) / 1000);
          // Lấy giá trị nhỏ hơn giữa actualDuration và currentTime để tránh vượt quá
          listenedDuration = Math.min(actualDuration, Math.floor(currentTime));
        } else {
          // Fallback: dùng currentTime
          listenedDuration = Math.floor(currentTime);
        }
        
        const songDuration = duration > 0 ? Math.floor(duration) : undefined;

        // Chỉ update khi pause (không phải khi đang play) và duration khác với lần update cuối
        if (!isPlaying && Math.abs(listenedDuration - lastRecordedDurationRef.current) >= 3) {
          try {
            await listeningHistoryApi.updateDuration(
              listeningHistoryIdRef.current,
              listenedDuration,
              songDuration
            );
            lastRecordedDurationRef.current = listenedDuration;
            console.log('[MusicPlayer] ✅ Updated listening history on pause:', listenedDuration, 's');
          } catch (error) {
            console.error('[MusicPlayer] ❌ Failed to update listening history on pause:', error);
          }
        }
      } catch (error) {
        console.error('[MusicPlayer] ❌ Error updating listening history on pause:', error);
      }
    };

    // Chỉ update khi pause (không phải khi đang play)
    if (!isPlaying) {
      updateOnPause();
    }
  }, [isPlaying, currentSong, currentTime, duration]);

  // Reset tracking khi chuyển bài hát
  useEffect(() => {
    listeningHistoryIdRef.current = null;
    lastUpdateTimeRef.current = 0;
    songStartTimeRef.current = null;
    lastRecordedDurationRef.current = 0;
    isUpdatingOnEndRef.current = false;
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }, [currentSong?.id]);

  // Update volume separately to avoid reloading stream
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Toggle play/pause - useCallback để tránh re-render
  const handleTogglePlay = useCallback(async () => {
    // Nếu không có currentSong nhưng có queue, phát bài đầu tiên trong queue
    if (!currentSong && queue && queue.length > 0) {
      console.log('[MusicPlayer] Không có currentSong, phát bài đầu tiên trong queue, queue length:', queue.length);
      // QUAN TRỌNG: Nếu queue có nhiều bài, dùng skipApiCall = true để không reset queue
      // Chỉ dùng skipApiCall = false nếu queue chỉ có 1 bài (yêu cầu mới)
      const skipApiCall = queue.length > 1;
      await playSong(queue[0], skipApiCall);
      return;
    }
    
    if (!audioRef.current || !currentSong) return;
    
    // Kiểm tra xem có tab đang phát nào đang phát nhạc không
    // Nếu đang play (sẽ chuyển sang pause), không cần kiểm tra
    // Nếu đang pause (sẽ chuyển sang play), cần kiểm tra xem có tab đang phát nào đang phát không
    if (!isPlaying && channelRef.current) {
      console.log('[MusicPlayer] Đang kiểm tra xem có tab đang phát nào đang phát nhạc không...');
      
      let hasMainTab = false;
      const checkTimeout = setTimeout(() => {
        if (!hasMainTab) {
          console.log('[MusicPlayer] Không có tab đang phát nào phản hồi, tab này sẽ trở thành tab đang phát');
          // Tab này sẽ trở thành tab đang phát, tiếp tục phát nhạc
        }
      }, 200);
      
      // Gửi message kiểm tra tab đang phát
      const checkChannel = new BroadcastChannel('player');
      const checkHandler = (event: MessageEvent) => {
        if (event.data.type === "MAIN_TAB_RESPONSE" && event.data.isPlaying) {
          hasMainTab = true;
          clearTimeout(checkTimeout);
          checkChannel.removeEventListener('message', checkHandler);
          checkChannel.close();
          console.log('[MusicPlayer] Có tab đang phát đang phát nhạc, gửi command play thay vì phát ở tab này');
          
          // Gửi command play đến tab đang phát
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: "PLAYER_CONTROL",
              action: "togglePlay",
            });
          }
        }
      };
      
      checkChannel.addEventListener('message', checkHandler);
      checkChannel.postMessage({
        type: "MAIN_TAB_CHECK",
      });
      
      // Đợi 200ms để nhận phản hồi
      setTimeout(async () => {
        clearTimeout(checkTimeout);
        checkChannel.removeEventListener('message', checkHandler);
        checkChannel.close();
        
        // Nếu không có tab đang phát nào phản hồi HOẶC flag "no main tab" = true, tab này sẽ trở thành tab đang phát
        if (!hasMainTab || noMainTabRef.current) {
          console.log('[MusicPlayer] Không có tab đang phát nào (hoặc flag noMainTab = true), tab này sẽ trở thành tab đang phát và phát nhạc');
          
          // Toggle isPlaying state local ngay lập tức
          const newIsPlaying = !isPlaying;
          setIsPlaying(newIsPlaying);
          
          // Gọi togglePlay từ context (để cập nhật backend)
          await togglePlay();
          
          // Điều khiển audio element trực tiếp
          if (audioRef.current && newIsPlaying) {
            audioRef.current.play().catch(err => {
              console.error('Play failed:', err);
              setIsPlaying(false);
            });
          } else if (audioRef.current) {
            audioRef.current.pause();
          }
          
          // Đánh dấu đây là tab đang phát
          setIsMainTab(true);
          
          // Gửi message "MAIN_TAB_ACTIVE" để các tab khác biết đã có tab đang phát mới
          if (channelRef.current && newIsPlaying) {
            channelRef.current.postMessage({
              type: "MAIN_TAB_ACTIVE",
              tabId: tabIdRef.current,
            });
            noMainTabRef.current = false;
          }
          
          // Gửi state update qua BroadcastChannel
          if (channelRef.current && currentSong && currentTime >= 0 && duration > 0) {
            setTimeout(() => {
              channelRef.current?.postMessage({
                type: "PLAYER_STATE_UPDATE",
                tabId: tabIdRef.current,
                songId: currentSong.id,
                currentTime: currentTime,
                duration: duration,
                isPlaying: newIsPlaying,
                songTitle: currentSong.title || currentSong.name || currentSong.songName,
                songArtist: currentSong.artist,
                songCover: currentSong.cover,
              });
            }, 100);
          }
        }
      }, 200);
      
      return;
    }
    
    // Nếu đang play (sẽ chuyển sang pause), hoặc không cần kiểm tra tab đang phát
    // Toggle isPlaying state local ngay lập tức
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    
    // Gọi togglePlay từ context (để cập nhật backend)
    await togglePlay();
    
    // Điều khiển audio element trực tiếp
    if (newIsPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Play failed:', err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
    
    // Gửi state update qua BroadcastChannel
    if (channelRef.current && currentSong && currentTime >= 0 && duration > 0) {
      setTimeout(() => {
        channelRef.current?.postMessage({
          type: "PLAYER_STATE_UPDATE",
          songId: currentSong.id,
          currentTime: currentTime,
          duration: duration,
          isPlaying: newIsPlaying,
          songTitle: currentSong.title || currentSong.name || currentSong.songName,
          songArtist: currentSong.artist,
          songCover: currentSong.cover,
        });
      }, 100);
    }
  }, [isPlaying, currentSong, togglePlay, queue, playSong, currentTime, duration]);

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
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    // Gửi full state update ngay lập tức để đồng bộ volume với tab điều khiển
    if (channelRef.current && currentSong) {
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE_FULL",
        tabId: tabIdRef.current,
        repeatMode: repeatMode,
        isShuffled: isShuffled,
        volume: newVolume,
        isMuted: newVolume === 0,
      });
    }
  }, [currentSong, repeatMode, isShuffled]);

  // Toggle mute - useCallback để tránh re-render
  const handleToggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = volume;
    }
    // Gửi full state update ngay lập tức để đồng bộ mute state với tab điều khiển
    if (channelRef.current && currentSong) {
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE_FULL",
        tabId: tabIdRef.current,
        repeatMode: repeatMode,
        isShuffled: isShuffled,
        volume: newMuted ? 0 : volume,
        isMuted: newMuted,
      });
    }
  }, [isMuted, volume, currentSong, repeatMode, isShuffled]);

  // Toggle shuffle - useCallback để tránh re-render
  const handleToggleShuffle = useCallback(async () => {
    console.log('[MusicPlayer] Toggle shuffle clicked, current state:', isShuffled);
    await toggleShuffle();
    const newShuffled = !isShuffled;
    console.log('[MusicPlayer] Shuffle toggled, new state:', newShuffled);
    
    // Gửi full state update ngay lập tức để đồng bộ với tab điều khiển
    if (channelRef.current && currentSong) {
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE_FULL",
        tabId: tabIdRef.current,
        repeatMode: repeatMode,
        isShuffled: newShuffled,
        volume: volume,
        isMuted: isMuted,
      });
    }
  }, [toggleShuffle, isShuffled, channelRef, currentSong, repeatMode, volume, isMuted]);

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
    
    // Gửi full state update ngay lập tức để đồng bộ với tab điều khiển
    if (channelRef.current && currentSong) {
      channelRef.current.postMessage({
        type: "PLAYER_STATE_UPDATE_FULL",
        tabId: tabIdRef.current,
        repeatMode: newMode,
        isShuffled: isShuffled,
        volume: volume,
        isMuted: isMuted,
      });
    }
  }, [repeatMode, setRepeatMode, channelRef, currentSong, isShuffled, volume, isMuted]);

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

  // Hide player on login page, if no song, or if tab is not active
  // QUAN TRỌNG: CHỈ CÓ 1 TAB ĐƯỢC PHÁT NHẠC TẠI MỘT THỜI ĐIỂM
  // Tab chính = tab đầu tiên bắt đầu phát nhạc (có audio element và đang play)
  // Tab chính → hiển thị MusicPlayer
  // Tab phụ → chỉ hiển thị ControlMusicPlayer, KHÔNG BAO GIỜ phát nhạc
  if (location.pathname === "/login" || !currentSong || !isTabActive) {
    return null;
  }
  
  // QUAN TRỌNG: Chỉ hiển thị MusicPlayer khi tab này là tab đang phát
  // Tab chính = tab có isMainTab = true (dù đang play hay pause)
  // Tab phụ = tab có currentSong nhưng isMainTab = false → ẩn MusicPlayer, hiển thị ControlMusicPlayer
  // Tab chính vẫn là tab đang phát dù đang pause, không cần kiểm tra isActuallyPlaying
  
  // Chỉ hiển thị MusicPlayer khi tab này là tab đang phát
  // Nếu không phải tab đang phát → ẩn MusicPlayer (ControlMusicPlayer sẽ hiển thị)
  if (!isMainTab) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[60] w-full" data-music-player="true">
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

          {/* Volume + Lyrics + Queue - Bên phải */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />

            {/* Lyrics Button */}
            {currentSong && (
              <DropdownMenu open={showLyrics} onOpenChange={setShowLyrics}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500/25 via-fuchsia-500/20 to-purple-500/25 border border-pink-400/50 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.7)] hover:bg-pink-500/35 hover:text-white transition-all"
                    title="Lyrics"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[420px] max-h-[500px] overflow-y-auto">
                  <div className="px-4 py-4 text-sm space-y-2">
                    {"lyrics" in currentSong && typeof currentSong.lyrics === "string" ? (
                      currentSong.lyrics.split("\n").map((line: string, idx: number) => (
                        <p key={idx} className="text-foreground/90 leading-relaxed">
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-6">
                        Lyrics not available for this song.
                      </p>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
        title="Queue"
            title="Queue"
              onClick={() => setShowQueue(!showQueue)}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Sidebar */}
      <QueueSidebar isOpen={showQueue} onClose={() => setShowQueue(false)} />
    </div>
  );
};

export default memo(MusicPlayer);