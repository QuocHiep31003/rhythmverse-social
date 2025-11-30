import { useState, useEffect, useRef, useCallback } from "react";
import { useMusic } from "@/contexts/MusicContext";
import { Play, Pause, SkipForward, SkipBack, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

interface PlayerState {
  songId: string | number | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  songTitle?: string;
  songArtist?: string;
  songCover?: string;
}

const MiniPlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    togglePlay,
    position,
    duration,
    updatePosition,
  } = useMusic();

  const [localState, setLocalState] = useState<PlayerState>({
    songId: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  });

  const [isVisible, setIsVisible] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isMainPlayerRef = useRef<boolean>(false);

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

  // Xác định tab chính: tab có MusicPlayer đang hiển thị (không phải login và có currentSong)
  useEffect(() => {
    const isMainTab = location.pathname !== "/login" && !!currentSong;
    isMainPlayerRef.current = isMainTab;
  }, [location.pathname, currentSong]);

  // Setup BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) {
      return;
    }

    const channel = new BroadcastChannel("player");
    channelRef.current = channel;

    // Lắng nghe messages từ tab khác hoặc từ chính tab này khi không active
    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === "PLAYER_STATE_UPDATE") {
        const isMainTab = location.pathname !== "/login" && currentSong;
        
        // Cập nhật state nếu:
        // 1. Không phải tab chính (tab khác của web), HOẶC
        // 2. Là tab chính nhưng tab không active (chuyển sang tab browser khác)
        if (!isMainTab || (isMainTab && !isTabActive)) {
          console.log('[MiniPlayer] Nhận được state update:', { isMainTab, isTabActive, data });
          // Chỉ cập nhật currentTime nếu có giá trị hợp lệ (tránh reset về 0)
          setLocalState(prev => ({
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
          }));
        }
      }
    };

    // Nếu là tab chính, gửi state updates
    const isMainTab = location.pathname !== "/login" && currentSong;
    if (isMainTab && currentSong) {
      const sendStateUpdate = () => {
        // Chỉ gửi khi có giá trị hợp lệ (tránh gửi currentTime = 0 khi mới load)
        const currentTimeSeconds = position / 1000;
        const durationSeconds = duration / 1000;
        
        if (currentTimeSeconds >= 0 && durationSeconds > 0) {
          channel.postMessage({
            type: "PLAYER_STATE_UPDATE",
            songId: currentSong.id,
            currentTime: currentTimeSeconds,
            duration: durationSeconds,
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
        channel.close();
      };
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [currentSong, isPlaying, position, duration, location.pathname, isTabActive]);

  // Cập nhật localState từ currentSong khi tab active (cho tab chính)
  // Chỉ cập nhật khi có giá trị hợp lệ để tránh reset về 0
  useEffect(() => {
    const isMainTab = location.pathname !== "/login" && !!currentSong;
    if (isMainTab && isTabActive && currentSong) {
      setLocalState(prev => ({
        songId: currentSong.id,
        currentTime: (position > 0) ? position / 1000 : prev.currentTime,
        duration: (duration > 0) ? duration / 1000 : prev.duration,
        isPlaying: isPlaying,
        songTitle: currentSong.title || currentSong.name || currentSong.songName,
        songArtist: currentSong.artist,
        songCover: currentSong.cover,
      }));
    }
  }, [currentSong, isPlaying, position, duration, isTabActive, location.pathname]);

  // Hiển thị mini player khi:
  // 1. Có bài hát đang phát (localState.songId)
  // 2. Không phải trang login
  // 3. VÀ (không phải tab chính HOẶC tab không active - chuyển sang tab browser khác)
  useEffect(() => {
    const isMainTab = location.pathname !== "/login" && !!currentSong;
    const shouldShow = 
      localState.songId !== null && 
      location.pathname !== "/login" &&
      (!isMainTab || (isMainTab && !isTabActive));
    
    setIsVisible(shouldShow);
  }, [currentSong, localState.songId, location.pathname, isTabActive]);

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Handle controls
  const handleTogglePlay = useCallback(async () => {
    const isMainTab = location.pathname !== "/login" && currentSong;
    
    if (isMainTab && isTabActive) {
      // Tab chính và đang active: gọi trực tiếp
      console.log('[MiniPlayer] Tab chính active - gọi togglePlay trực tiếp');
      await togglePlay();
    } else {
      // Tab khác hoặc tab chính nhưng không active: gửi command qua BroadcastChannel
      console.log('[MiniPlayer] Gửi togglePlay command qua BroadcastChannel', { isMainTab, isTabActive });
      channelRef.current?.postMessage({
        type: "PLAYER_CONTROL",
        action: "togglePlay",
      });
    }
  }, [togglePlay, location.pathname, currentSong, isTabActive]);

  const handleNext = useCallback(async () => {
    const isMainTab = location.pathname !== "/login" && currentSong;
    
    if (isMainTab && isTabActive) {
      console.log('[MiniPlayer] Tab chính active - gọi playNext trực tiếp');
      await playNext();
    } else {
      console.log('[MiniPlayer] Gửi next command qua BroadcastChannel', { isMainTab, isTabActive });
      channelRef.current?.postMessage({
        type: "PLAYER_CONTROL",
        action: "next",
      });
    }
  }, [playNext, location.pathname, currentSong, isTabActive]);

  const handlePrevious = useCallback(async () => {
    const isMainTab = location.pathname !== "/login" && currentSong;
    
    if (isMainTab && isTabActive) {
      console.log('[MiniPlayer] Tab chính active - gọi playPrevious trực tiếp');
      await playPrevious();
    } else {
      console.log('[MiniPlayer] Gửi previous command qua BroadcastChannel', { isMainTab, isTabActive });
      channelRef.current?.postMessage({
        type: "PLAYER_CONTROL",
        action: "previous",
      });
    }
  }, [playPrevious, location.pathname, currentSong, isTabActive]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMaximize = useCallback(() => {
    // Navigate đến trang chính hoặc mở player full
    navigate("/");
  }, [navigate]);

  // Handle seek
  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    const isMainTab = location.pathname !== "/login" && currentSong;
    
    // Cập nhật local state ngay lập tức để UI responsive
    setLocalState(prev => ({
      ...prev,
      currentTime: newTime,
    }));
    
    if (isMainTab && isTabActive) {
      // Tab chính và active: gọi trực tiếp
      console.log('[MiniPlayer] Tab chính active - seek trực tiếp:', newTime);
      updatePosition(newTime * 1000);
    } else {
      // Tab khác hoặc tab không active: gửi command qua BroadcastChannel
      console.log('[MiniPlayer] Gửi seek command qua BroadcastChannel:', newTime);
      channelRef.current?.postMessage({
        type: "PLAYER_CONTROL",
        action: "seek",
        position: newTime * 1000, // Convert sang milliseconds
      });
    }
  }, [updatePosition, location.pathname, currentSong, isTabActive]);

  // Ẩn trên trang login
  if (location.pathname === "/login" || !isVisible || !localState.songId) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {localState.songCover && (
              <img
                src={localState.songCover}
                alt={localState.songTitle || "Song"}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-music.png";
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">
                {localState.songTitle || "Unknown Song"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {localState.songArtist || "Unknown Artist"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleMaximize}
              title="Mở player đầy đủ"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <Slider
            value={[localState.currentTime]}
            max={localState.duration || 1}
            step={0.1}
            className="w-full"
            onValueChange={handleSeek}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(localState.currentTime)}</span>
            <span>{formatTime(localState.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevious}
            title="Bài trước"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleTogglePlay}
            title={localState.isPlaying ? "Tạm dừng" : "Phát"}
          >
            {localState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            title="Bài tiếp theo"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;

