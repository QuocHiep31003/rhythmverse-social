import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, MoreHorizontal, SkipForward, SkipBack, Repeat, Repeat1, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMusic, type Song } from "@/contexts/MusicContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// QueueItem component
const QueueItem = memo(({ 
  song, 
  index, 
  isCurrent, 
  onPlay, 
  onRemove 
}: { 
  song: { id: string | number; title?: string; name?: string; songName?: string; artist?: string; cover?: string }; 
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
      <div className={cn(
        "text-xs font-medium w-6 text-center",
        isCurrent ? "text-primary" : "text-muted-foreground"
      )}>
        {index + 1}
      </div>

      {song.cover && (
        <img
          src={song.cover}
          alt={song.title || song.name || "Song"}
          className="w-10 h-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-medium truncate text-sm",
          isCurrent && "text-primary"
        )}>
          {song.title || song.name || song.songName || 'Unknown Song'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {song.artist || 'Unknown Artist'}
        </div>
      </div>

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
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

QueueItem.displayName = 'QueueItem';

// SongInfo component
const SongInfo = memo(({ song }: { song: { title?: string; name?: string; songName?: string; artist?: string; cover?: string } }) => {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {song.cover && (
        <img
          src={song.cover}
          alt={song.title || song.name || "Song"}
          className="w-14 h-14 rounded object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate text-sm">
          {song.title || song.name || song.songName || "Unknown Song"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {song.artist || "Unknown Artist"}
        </div>
      </div>
    </div>
  );
});

SongInfo.displayName = 'SongInfo';

// Controls component - GIỐNG HỆT MusicPlayer
const Controls = memo(({
  isPlaying,
  isLoading = false,
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
  isLoading?: boolean;
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
  currentSongId,
  showQueue,
  onOpenChange,
  onPlaySong,
  onRemoveFromQueue,
}: {
  queue: Array<{ id: string | number; title?: string; name?: string; songName?: string; artist?: string; cover?: string }>;
  currentSongId: string | number | null;
  showQueue: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaySong: (songId: string | number) => void;
  onRemoveFromQueue: (songId: string | number) => void;
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
                  isCurrent={String(currentSongId) === String(song.id)}
                  onPlay={() => {
                    if (String(currentSongId) !== String(song.id)) {
                      onPlaySong(song.id);
                    }
                  }}
                  onRemove={() => {
                    onRemoveFromQueue(song.id);
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

interface PlayerState {
  songId: string | number | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  songTitle?: string;
  songArtist?: string;
  songCover?: string;
  queue?: Array<{ id: string | number; title?: string; name?: string; songName?: string; artist?: string; cover?: string }>;
  repeatMode?: "off" | "one" | "all";
  isShuffled?: boolean;
  volume?: number;
  isMuted?: boolean;
}

const ControlMusicPlayer = () => {
  const location = useLocation();
  const { currentSong, playSong, setQueue, updatePosition } = useMusic();

  const [localState, setLocalState] = useState<PlayerState>({
    songId: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    repeatMode: "off",
    isShuffled: false,
    volume: 1,
    isMuted: false,
  });

  const [showQueue, setShowQueue] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [isMainTab, setIsMainTab] = useState(false);
  const [hasReceivedStateFromOtherTab, setHasReceivedStateFromOtherTab] = useState(false);
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
  // Ref để track songId mà không gây re-run useEffect
  const songIdRef = useRef<string | number | null>(null);

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const formattedCurrentTime = formatTime(localState.currentTime);
  const formattedDuration = formatTime(localState.duration);

  // Setup BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      return;
    }

    const channel = new BroadcastChannel("player");
    channelRef.current = channel;

    // Lắng nghe messages từ tab đang phát
    channel.onmessage = (event) => {
      const data = event.data;
      
      if (data.type === "PLAYER_STATE_UPDATE") {
        // QUAN TRỌNG: Bỏ qua message từ chính tab này
        if (data.tabId === tabIdRef.current) {
          return;
        }
        
        // QUAN TRỌNG: Nếu nhận được state update từ tab khác (có tabId khác) → đây là tab khác
        if (data.tabId && data.tabId !== tabIdRef.current) {
          // Không log để tránh spam console
          setIsMainTab(false);
          // Chỉ set hasReceivedStateFromOtherTab = true nếu chưa có songId (lần đầu nhận state)
          if (!hasReceivedStateFromOtherTab && !localState.songId) {
            setHasReceivedStateFromOtherTab(true);
            // Không cần gửi REQUEST_STATE vì đã nhận được PLAYER_STATE_UPDATE
          }
        }
        
        // Cập nhật state từ tab đang phát
        // QUAN TRỌNG: Giữ nguyên các field không được cập nhật (repeatMode, isShuffled, volume, isMuted)
        // Chỉ cập nhật các field được gửi từ PLAYER_STATE_UPDATE
        setLocalState(prev => {
          // Cập nhật ref khi nhận được songId
          if (data.songId) {
            songIdRef.current = data.songId;
          }
          return {
            ...prev, // Giữ nguyên tất cả các field hiện có
            songId: data.songId || prev.songId,
            currentTime: (data.currentTime !== undefined && data.currentTime !== null && data.currentTime >= 0) 
              ? data.currentTime 
              : prev.currentTime,
            duration: (data.duration !== undefined && data.duration !== null && data.duration > 0)
              ? data.duration
              : prev.duration,
            isPlaying: data.isPlaying !== undefined ? data.isPlaying : prev.isPlaying,
            songTitle: data.songTitle || prev.songTitle,
            songArtist: data.songArtist || prev.songArtist,
            songCover: data.songCover || prev.songCover,
            queue: data.queue || prev.queue,
            // Giữ nguyên repeatMode, isShuffled, volume, isMuted (chỉ được cập nhật từ PLAYER_STATE_UPDATE_FULL)
          };
        });
      } else if (data.type === "QUEUE_UPDATE") {
        // Nhận queue update từ tab đang phát
        if (data.queue && data.queue.length > 0) {
          setLocalState(prev => ({
            ...prev,
            queue: data.queue,
          }));
        }
      } else if (data.type === "PLAYER_STATE_UPDATE_FULL") {
        // Nhận full state update (bao gồm repeatMode, isShuffled, volume, isMuted)
        // QUAN TRỌNG: Chỉ cập nhật nếu nhận được từ tab khác (tab đang phát)
        // VÀ chỉ cập nhật nếu có tabId (để tránh cập nhật từ chính nó)
        if (data.tabId && data.tabId !== tabIdRef.current) {
          console.log('[ControlMusicPlayer] Nhận được PLAYER_STATE_UPDATE_FULL từ tab đang phát:', {
            tabId: data.tabId,
            repeatMode: data.repeatMode,
            isShuffled: data.isShuffled,
            volume: data.volume,
            isMuted: data.isMuted,
          });
          // Cập nhật state ngay lập tức, ghi đè optimistic update nếu có
          setLocalState(prev => ({
            ...prev,
            repeatMode: data.repeatMode !== undefined ? data.repeatMode : prev.repeatMode,
            isShuffled: data.isShuffled !== undefined ? data.isShuffled : prev.isShuffled,
            volume: data.volume !== undefined ? data.volume : prev.volume,
            isMuted: data.isMuted !== undefined ? data.isMuted : prev.isMuted,
          }));
        } else if (!data.tabId) {
          // Nếu không có tabId, vẫn cập nhật (tương thích với code cũ)
          console.log('[ControlMusicPlayer] Nhận được PLAYER_STATE_UPDATE_FULL không có tabId, vẫn cập nhật');
          setLocalState(prev => ({
            ...prev,
            repeatMode: data.repeatMode !== undefined ? data.repeatMode : prev.repeatMode,
            isShuffled: data.isShuffled !== undefined ? data.isShuffled : prev.isShuffled,
            volume: data.volume !== undefined ? data.volume : prev.volume,
            isMuted: data.isMuted !== undefined ? data.isMuted : prev.isMuted,
          }));
        }
      } else if (data.type === "PLAYER_CONTROL") {
        // Nhận command từ tab đang phát (ví dụ: pause khi tab đang phát tắt)
        if (data.action === "pause") {
          setLocalState(prev => ({
            ...prev,
            isPlaying: false,
          }));
        }
      } else if (data.type === "MAIN_TAB_CLOSED") {
        // Tab chính đã đóng → set flag "no main tab"
        console.log('[ControlMusicPlayer] Nhận được MAIN_TAB_CLOSED, không còn tab đang phát');
        noMainTabRef.current = true;
        setLocalState(prev => ({
          ...prev,
          isPlaying: false,
        }));
      } else if (data.type === "MAIN_TAB_ACTIVE") {
        // Tab chính mới đã bắt đầu phát nhạc → set flag
        console.log('[ControlMusicPlayer] Nhận được MAIN_TAB_ACTIVE, đã có tab đang phát mới');
        noMainTabRef.current = false;
        setHasReceivedStateFromOtherTab(true);
        // Gửi REQUEST_STATE để lấy state đầy đủ từ tab đang phát
        if (channelRef.current && !localState.songId) {
          console.log('[ControlMusicPlayer] Gửi REQUEST_STATE sau khi nhận MAIN_TAB_ACTIVE');
          channelRef.current.postMessage({
            type: "REQUEST_STATE",
            tabId: tabIdRef.current,
          });
        }
      }
    };

    // Yêu cầu state ban đầu từ tab đang phát khi mount
    // QUAN TRỌNG: Chỉ gửi request nếu có dấu hiệu có tab đang phát đang phát nhạc
    // (nhận được MAIN_TAB_ACTIVE hoặc đã có state từ tab khác)
    const requestInitialState = () => {
      if (channelRef.current) {
        console.log('[ControlMusicPlayer] Yêu cầu state ban đầu từ tab đang phát');
        channelRef.current.postMessage({
          type: "REQUEST_STATE",
          tabId: tabIdRef.current,
        });
      }
    };
    
    // QUAN TRỌNG: Không gửi request ngay khi mount
    // Chỉ gửi request khi:
    // 1. Đã nhận được MAIN_TAB_ACTIVE (có tab đang phát mới)
    // 2. Hoặc đã nhận được state từ tab khác (hasReceivedStateFromOtherTab = true)
    // 3. Hoặc đợi một chút để xem có tab đang phát nào không
    
    // Đợi 1 giây để xem có tab đang phát nào gửi state không
    const initialDelay = setTimeout(() => {
      // Chỉ gửi request nếu chưa nhận được state và có dấu hiệu có tab đang phát
      if (!localState.songId && !hasReceivedStateFromOtherTab) {
        // Kiểm tra xem có tab đang phát nào đang phát không
        const checkMainTab = () => {
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
              checkChannel.postMessage({
                type: "MAIN_TAB_CHECK",
              });
            });
            
            checkPromise.then((hasMain) => {
              // Chỉ gửi REQUEST_STATE nếu có tab đang phát đang phát
              if (hasMain && !localState.songId) {
                requestInitialState();
              }
            });
          }
        };
        
        checkMainTab();
      }
    }, 1000);
    
    // Gửi request định kỳ mỗi 2 giây nếu chưa nhận được state (trong 10 giây đầu)
    // NHƯNG chỉ khi đã có dấu hiệu có tab đang phát (hasReceivedStateFromOtherTab = true)
    let requestCount = 0;
    const maxRequests = 5; // Gửi tối đa 5 lần trong 10 giây
    const requestInterval = setInterval(() => {
      // Chỉ gửi request nếu đã có dấu hiệu có tab đang phát hoặc đã nhận được state từ tab khác
      if (requestCount < maxRequests && !localState.songId && hasReceivedStateFromOtherTab) {
        requestInitialState();
        requestCount++;
      } else {
        clearInterval(requestInterval);
      }
    }, 2000);

    // Kiểm tra xem tab này có phải là tab đang phát không
    // QUAN TRỌNG: Tab điều khiển KHÔNG BAO GIỜ trở thành tab đang phát
    // Chỉ set isMainTab = false để đảm bảo ControlMusicPlayer luôn hiển thị
    const checkMainTabInterval = setInterval(() => {
      // Nếu đã nhận được state từ tab khác → chắc chắn là tab khác
      if (hasReceivedStateFromOtherTab) {
        setIsMainTab(false);
      }
      // Nếu có localState.songId (đã nhận được state từ tab đang phát) → chắc chắn là tab khác
      else if (localState.songId) {
        setIsMainTab(false);
      }
      // Nếu không có currentSong trong context → chắc chắn là tab khác
      else if (!currentSong) {
        setIsMainTab(false);
      }
      // Nếu có currentSong nhưng chưa nhận được state từ tab khác → có thể là tab đang phát
      // NHƯNG: ControlMusicPlayer không nên hiển thị khi là tab đang phát, nên vẫn set false
      // (MusicPlayer sẽ hiển thị thay vì ControlMusicPlayer)
      else {
        // Có currentSong nhưng chưa nhận state từ tab khác
        // Đợi thêm một chút để xem có nhận được state từ tab khác không
        // Nếu sau 2 giây vẫn chưa nhận được → có thể là tab đang phát
        // Nhưng để an toàn, vẫn set false để ControlMusicPlayer hiển thị
        setIsMainTab(false);
      }
    }, 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(checkMainTabInterval);
      clearInterval(requestInterval);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
    // QUAN TRỌNG: Không thêm localState.songId vào dependencies vì nó sẽ gây re-run useEffect
    // và reset channel.onmessage handler, làm mất state
  }, [location.pathname, currentSong, hasReceivedStateFromOtherTab]);

  // Gửi commands qua BroadcastChannel
  const sendCommand = useCallback((action: string, payload?: Record<string, unknown>) => {
    if (!channelRef.current) {
      console.warn('[ControlMusicPlayer] channelRef.current là null, không thể gửi command');
      return;
    }
    channelRef.current.postMessage({
      type: "PLAYER_CONTROL",
      action,
      ...payload,
    });
  }, []);

  // Handle controls
  const handleTogglePlay = useCallback(async () => {
    // Nếu không có tab đang phát và có thông tin bài hát trong localState, thì tab này sẽ trở thành tab đang phát
    if (noMainTabRef.current && localState.songId) {
      console.log('[ControlMusicPlayer] Không có tab đang phát, lấy stream URL và set currentSong trước khi phát');
      
      try {
        // 1. Tạo song object từ localState
        const songToPlay = {
          id: localState.songId,
          title: localState.songTitle || "Unknown Song",
          name: localState.songTitle || "Unknown Song",
          songName: localState.songTitle || "Unknown Song",
          artist: localState.songArtist || "Unknown Artist",
          cover: localState.songCover || "",
          album: "",
          duration: localState.duration || 0,
        };
        
        // 2. Gọi playSongWithStreamUrl để lấy stream URL và set currentSong vào context
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        
        // 3. Cập nhật position ngay lập tức để UI không bị reset về 0s
        if (localState.currentTime > 0 && updatePosition) {
          console.log('[ControlMusicPlayer] Cập nhật position ngay lập tức:', localState.currentTime * 1000, 'ms');
          await updatePosition(localState.currentTime * 1000); // Convert to milliseconds
        }
        
        // 4. Chuẩn bị queue songs từ localState.queue
        let queueSongs: any[] = [];
        if (localState.queue && localState.queue.length > 0) {
          queueSongs = localState.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
            id: String(q.id),
            name: q.title || q.name || "Unknown Song",
            songName: q.title || q.name || "Unknown Song",
            title: q.title || q.name || "Unknown Song",
            artist: q.artist || "Unknown Artist",
            album: "",
            duration: 0,
            cover: q.cover || "",
          }));
          console.log('[ControlMusicPlayer] Chuẩn bị queue từ localState, queue length:', queueSongs.length);
        }
        
        // 5. Đồng bộ queue trước (nếu có) - QUAN TRỌNG: Set queue trước để playSong không reset
        if (queueSongs.length > 0 && setQueue) {
          console.log('[ControlMusicPlayer] Set queue trước khi gọi playSongWithStreamUrl, queue length:', queueSongs.length);
          await setQueue(queueSongs);
          // Đợi đủ lâu để queue được cập nhật trong context (tránh race condition)
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // 6. Gọi playSongWithStreamUrl để lấy stream URL và set currentSong
        // QUAN TRỌNG: 
        // - Truyền queue vào để playSongWithStreamUrl không reset queue
        // - Vì không có tab đang phát (noMainTabRef.current = true), nó sẽ phát nhạc ở tab này
        // - playSongWithStreamUrl sẽ gọi playSong với skipApiCall=true, và playSong sẽ kiểm tra queue.length
        // - Nếu queue.length > 1, playSong sẽ không reset queue
        console.log('[ControlMusicPlayer] Gọi playSongWithStreamUrl với queue length:', queueSongs.length);
        await playSongWithStreamUrl(songToPlay, playSong, setQueue, queueSongs, null);
        
        console.log('[ControlMusicPlayer] Đã gọi playSongWithStreamUrl, gửi command để đồng bộ và phát từ vị trí cũ');
        
        // 6. Đợi một chút để playSong hoàn thành
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 7. Gửi command với toàn bộ thông tin để MusicPlayer đồng bộ và phát từ vị trí cũ
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "BECOME_MAIN_TAB_AND_PLAY",
            tabId: tabIdRef.current,
            song: songToPlay,
            queue: localState.queue || [],
            currentTime: localState.currentTime,
            duration: localState.duration,
            isPlaying: !localState.isPlaying, // Toggle state
            repeatMode: localState.repeatMode || "off",
            isShuffled: localState.isShuffled || false,
            volume: localState.volume || 1,
            isMuted: localState.isMuted || false,
          });
        }
      } catch (error) {
        console.error('[ControlMusicPlayer] Lỗi khi lấy stream URL:', error);
      }
    } else {
      // Gửi command qua BroadcastChannel như bình thường
      sendCommand("togglePlay");
    }
  }, [sendCommand, localState, playSong, setQueue, updatePosition]);

  const handleNext = useCallback(async () => {
    // Nếu không có tab đang phát và có queue, tìm bài tiếp theo và phát
    if (noMainTabRef.current && localState.queue && localState.queue.length > 0 && localState.songId) {
      console.log('[ControlMusicPlayer] Không có tab đang phát, tìm bài tiếp theo trong queue');
      
      try {
        // Tìm index của bài hiện tại
        const currentIndex = localState.queue.findIndex((q: { id: string | number }) => 
          String(q.id) === String(localState.songId)
        );
        
        if (currentIndex >= 0) {
          // Tìm bài tiếp theo
          let nextIndex = currentIndex + 1;
          
          // Xử lý repeat mode
          if (nextIndex >= localState.queue.length) {
            if (localState.repeatMode === "all") {
              nextIndex = 0; // Quay về đầu
            } else {
              console.log('[ControlMusicPlayer] Không có bài tiếp theo');
              return;
            }
          }
          
          const nextSong = localState.queue[nextIndex];
          if (!nextSong) {
            console.log('[ControlMusicPlayer] Không tìm thấy bài tiếp theo');
            return;
          }
          
          // Tạo song object
          const songToPlay = {
            id: nextSong.id,
            title: nextSong.title || nextSong.name || nextSong.songName || "Unknown Song",
            name: nextSong.title || nextSong.name || nextSong.songName || "Unknown Song",
            songName: nextSong.title || nextSong.name || nextSong.songName || "Unknown Song",
            artist: nextSong.artist || "Unknown Artist",
            cover: nextSong.cover || "",
            album: "",
            duration: 0,
          };
          
          // Cập nhật position về 0 (bài mới)
          if (updatePosition) {
            await updatePosition(0);
          }
          
          // Đồng bộ queue
          if (setQueue) {
            const queueSongs = localState.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
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
          }
          
          // Gọi playSongWithStreamUrl để lấy stream URL và set currentSong
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songToPlay, playSong, setQueue, localState.queue || [], null);
          
          // Đợi một chút để playSong hoàn thành
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Gửi command với toàn bộ thông tin
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: "BECOME_MAIN_TAB_AND_PLAY",
              tabId: tabIdRef.current,
              song: songToPlay,
              queue: localState.queue || [],
              currentTime: 0, // Bài mới, bắt đầu từ đầu
              duration: 0,
              isPlaying: true, // Phát ngay
              repeatMode: localState.repeatMode || "off",
              isShuffled: localState.isShuffled || false,
              volume: localState.volume || 1,
              isMuted: localState.isMuted || false,
            });
          }
        }
      } catch (error) {
        console.error('[ControlMusicPlayer] Lỗi khi phát bài tiếp theo:', error);
      }
    } else {
      // Gửi command qua BroadcastChannel như bình thường
      sendCommand("next");
    }
  }, [sendCommand, localState, playSong, setQueue, updatePosition]);

  const handlePrevious = useCallback(async () => {
    // Nếu không có tab đang phát và có queue, tìm bài trước và phát
    if (noMainTabRef.current && localState.queue && localState.queue.length > 0 && localState.songId) {
      console.log('[ControlMusicPlayer] Không có tab đang phát, tìm bài trước trong queue');
      
      try {
        // Tìm index của bài hiện tại
        const currentIndex = localState.queue.findIndex((q: { id: string | number }) => 
          String(q.id) === String(localState.songId)
        );
        
        if (currentIndex >= 0) {
          // Tìm bài trước
          let prevIndex = currentIndex - 1;
          
          // Xử lý repeat mode
          if (prevIndex < 0) {
            if (localState.repeatMode === "all") {
              prevIndex = localState.queue.length - 1; // Quay về cuối
            } else {
              console.log('[ControlMusicPlayer] Không có bài trước');
              return;
            }
          }
          
          const prevSong = localState.queue[prevIndex];
          if (!prevSong) {
            console.log('[ControlMusicPlayer] Không tìm thấy bài trước');
            return;
          }
          
          // Tạo song object
          const songToPlay = {
            id: prevSong.id,
            title: prevSong.title || prevSong.name || prevSong.songName || "Unknown Song",
            name: prevSong.title || prevSong.name || prevSong.songName || "Unknown Song",
            songName: prevSong.title || prevSong.name || prevSong.songName || "Unknown Song",
            artist: prevSong.artist || "Unknown Artist",
            cover: prevSong.cover || "",
            album: "",
            duration: 0,
          };
          
          // Cập nhật position về 0 (bài mới)
          if (updatePosition) {
            await updatePosition(0);
          }
          
          // Đồng bộ queue
          if (setQueue) {
            const queueSongs = localState.queue.map((q: { id: string | number; title?: string; name?: string; artist?: string; cover?: string }) => ({
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
          }
          
          // Gọi playSongWithStreamUrl để lấy stream URL và set currentSong
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songToPlay, playSong, setQueue, localState.queue || [], null);
          
          // Đợi một chút để playSong hoàn thành
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Gửi command với toàn bộ thông tin
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: "BECOME_MAIN_TAB_AND_PLAY",
              tabId: tabIdRef.current,
              song: songToPlay,
              queue: localState.queue || [],
              currentTime: 0, // Bài mới, bắt đầu từ đầu
              duration: 0,
              isPlaying: true, // Phát ngay
              repeatMode: localState.repeatMode || "off",
              isShuffled: localState.isShuffled || false,
              volume: localState.volume || 1,
              isMuted: localState.isMuted || false,
            });
          }
        }
      } catch (error) {
        console.error('[ControlMusicPlayer] Lỗi khi phát bài trước:', error);
      }
    } else {
      // Gửi command qua BroadcastChannel như bình thường
      sendCommand("previous");
    }
  }, [sendCommand, localState, playSong, setQueue, updatePosition]);

  const handleToggleShuffle = useCallback(() => {
    // Optimistic update: cập nhật UI ngay lập tức
    setLocalState(prev => ({
      ...prev,
      isShuffled: !prev.isShuffled,
    }));
    sendCommand("toggleShuffle");
  }, [sendCommand]);

  const handleCycleRepeatMode = useCallback(() => {
    // Optimistic update: cập nhật UI ngay lập tức
    setLocalState(prev => {
      let nextMode: "off" | "one" | "all";
      if (prev.repeatMode === "off") {
        nextMode = "all";
      } else if (prev.repeatMode === "all") {
        nextMode = "one";
      } else {
        nextMode = "off";
      }
      return {
        ...prev,
        repeatMode: nextMode,
      };
    });
    sendCommand("cycleRepeatMode");
  }, [sendCommand]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    // Cập nhật local state ngay lập tức để UI responsive
    setLocalState(prev => ({
      ...prev,
      currentTime: newTime,
    }));
    sendCommand("seek", { position: newTime * 1000 });
  }, [sendCommand]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100;
    setLocalState(prev => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
    sendCommand("setVolume", { volume: newVolume });
  }, [sendCommand]);

  const handleToggleMute = useCallback(() => {
    const newMuted = !localState.isMuted;
    setLocalState(prev => ({
      ...prev,
      isMuted: newMuted,
    }));
    sendCommand("toggleMute");
  }, [sendCommand, localState.isMuted]);

  const handlePlaySong = useCallback((songId: string | number) => {
    sendCommand("playSong", { songId });
  }, [sendCommand]);

  const handleRemoveFromQueue = useCallback((songId: string | number) => {
    sendCommand("removeFromQueue", { songId });
  }, [sendCommand]);

  // Tính toán canGoPrevious
  const canGoPrevious = useMemo(() => {
    if (!localState.queue || localState.queue.length === 0) return false;
    if (localState.repeatMode === "all") return true;
    if (!localState.songId) return false;
    const currentIndex = localState.queue.findIndex(q => String(q.id) === String(localState.songId));
    return currentIndex > 0;
  }, [localState.queue, localState.songId, localState.repeatMode]);

  // Ẩn trên trang login hoặc khi là tab đang phát
  // QUAN TRỌNG: Chỉ hiển thị ControlMusicPlayer khi:
  // 1. Không phải trang login
  // 2. Không phải tab đang phát (isMainTab = false)
  // 3. Có songId trong localState (đã nhận được state từ tab đang phát) HOẶC đang chờ nhận state
  // 4. Có bài hát trong queue (queue không rỗng)
  if (location.pathname === "/login" || isMainTab) {
    return null;
  }
  
  // Ẩn khi không có bài hát (không có songId hoặc queue rỗng)
  const hasSongs = localState.songId !== null || (localState.queue && localState.queue.length > 0);
  if (!hasSongs) {
    return null;
  }
  
  // Hiển thị ControlMusicPlayer khi:
  // - Không phải tab đang phát (isMainTab = false)
  // - Có songId trong localState (đã nhận được state từ tab đang phát)
  // - Có bài hát trong queue
  // Nếu chưa có songId, vẫn hiển thị nhưng với state mặc định (đang chờ nhận state từ tab đang phát)
  // Không cần kiểm tra hasReceivedStateFromOtherTab vì có thể đang chờ nhận state

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[55] w-full" data-control-music-player="true">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Song Info - Bên trái */}
          <div className="flex-shrink-0">
            <SongInfo song={{
              title: localState.songTitle,
              name: localState.songTitle,
              songName: localState.songTitle,
              artist: localState.songArtist,
              cover: localState.songCover,
            }} />
          </div>

          {/* Controls - Ở giữa */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl mx-auto">
            <Controls
              isPlaying={localState.isPlaying}
              isLoading={false}
              onTogglePlay={handleTogglePlay}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToggleShuffle={handleToggleShuffle}
              onCycleRepeatMode={handleCycleRepeatMode}
              isShuffled={localState.isShuffled || false}
              repeatMode={localState.repeatMode || "off"}
              canGoPrevious={canGoPrevious}
            />

            {/* Progress Bar */}
            <ProgressBar
              currentTime={localState.currentTime}
              duration={localState.duration}
              formattedCurrentTime={formattedCurrentTime}
              formattedDuration={formattedDuration}
              onSeek={handleSeek}
            />
          </div>

          {/* Volume và Queue - Bên phải */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <VolumeControl
              volume={localState.volume || 1}
              isMuted={localState.isMuted || false}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />

            <QueueMenu
              queue={localState.queue || []}
              currentSongId={localState.songId}
              showQueue={showQueue}
              onOpenChange={setShowQueue}
              onPlaySong={handlePlaySong}
              onRemoveFromQueue={handleRemoveFromQueue}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ControlMusicPlayer);

