import { useState, useEffect, useRef, useCallback } from "react";
import type { DragEvent, MouseEvent } from "react";
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
  X,
  Menu,
  MoreHorizontal,
  GripVertical,
  Trash2,
  ChevronsDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, handleImageError } from "@/lib/utils";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { lyricsApi } from "@/services/api/lyricsApi";
import { songsApi } from "@/services/api/songApi";
import { getAuthToken } from "@/services/api";
import { mapToPlayerSong } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import Hls from "hls.js";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import ShareButton from "@/components/ShareButton";

interface LyricLine {
  time: number;
  text: string;
}

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
    setRepeatMode,
    queue,
    playSong,
    setQueue,
    addToQueue,
    removeFromQueue,
    moveQueueItem,
    resetPlayer,
  } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const currentLyricRef = useRef<HTMLParagraphElement>(null);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([0]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState<typeof queue>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [autoPlaySuggestions, setAutoPlaySuggestions] = useState(true);
  const showQueueScrollHint = queue.length > 4;
  const loadedSuggestionsForSongId = useRef<string | number | null>(null);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [shareSong, setShareSong] = useState<{ id: string | number; title: string; url: string } | null>(null);
  const [playlistTab, setPlaylistTab] = useState<"queue" | "suggested">("queue");
  const [draggingSongId, setDraggingSongId] = useState<string | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const currentSongRef = useRef<typeof currentSong>(null);
  const cleanupCallbacks = useRef<(() => void)[]>([]);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const hasTriggeredEndedRef = useRef(false);
  const listenedSecondsRef = useRef(0);
  const hasReportedSessionRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (repeatMode !== "off" && autoPlaySuggestions) {
      setAutoPlaySuggestions(false);
      toast({
        title: "Đã tắt gợi ý tự động",
        description: "Gợi ý chỉ hoạt động khi chế độ lặp đang tắt.",
        variant: "warning",
      });
    }
  }, [repeatMode, autoPlaySuggestions]);

  const resetListeningSessionTracking = useCallback(() => {
    listenedSecondsRef.current = 0;
    hasReportedSessionRef.current = false;
  }, []);

  const finalizeListeningSession = useCallback((reason: string) => {
    const song = currentSongRef.current;
    if (!song) {
      resetListeningSessionTracking();
      return;
    }

    if (hasReportedSessionRef.current) {
      resetListeningSessionTracking();
      return;
    }

    const userId = 0;
    const songIdForApi = isNaN(Number(song.id)) ? song.id : Number(song.id);
    const accumulatedSeconds = Math.floor(listenedSecondsRef.current);
    if (accumulatedSeconds <= 0) {
      resetListeningSessionTracking();
      return;
    }

    const audio = audioRef.current;
    const audioDurationSeconds =
      audio && !isNaN(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null;
    const normalizedSongDuration = audioDurationSeconds ?? Math.max(1, accumulatedSeconds);
    const effectiveDuration = Math.min(Math.max(1, accumulatedSeconds), normalizedSongDuration);

    console.log(
      `Finalizing listening session (${reason}) → userId=${userId}, songId=${songIdForApi}, duration=${effectiveDuration}s/${normalizedSongDuration}s`,
    );
    hasReportedSessionRef.current = true;

    listeningHistoryApi
      .recordListen({
        userId,
        songId: songIdForApi,
        listenedDuration: effectiveDuration,
        songDuration: normalizedSongDuration,
      })
      .then(() => {
        console.log('Listening session recorded successfully');
      })
      .catch((error) => {
        console.error('Failed to record listening session:', error);
        hasReportedSessionRef.current = false;
      })
      .finally(() => {
        resetListeningSessionTracking();
      });
  }, [resetListeningSessionTracking]);

  useEffect(() => {
    if (location.pathname === "/login") {
      finalizeListeningSession("login-navigation");
      resetListeningSessionTracking();
      resetPlayer();
    }
  }, [location.pathname, finalizeListeningSession, resetListeningSessionTracking, resetPlayer]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentTime = () => {
    if (!audioRef.current) return 0;
    return audioRef.current.currentTime;
  };

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics([]);
      setCurrentLyricIndex(0);
      return;
    }

    const loadLyrics = async () => {
      try {
        const loadedLyrics = await lyricsApi.getLyrics(currentSong.id);
        setLyrics(loadedLyrics);
        setCurrentLyricIndex(0);
      } catch (error) {
        console.error("Failed to load lyrics:", error);
        setLyrics([{ time: 0, text: "♪ No lyrics available..." }]);
      }
    };

    loadLyrics();
  }, [currentSong]);

  // Update current lyric based on playback time
  useEffect(() => {
    if (lyrics.length === 0) return;

    const interval = setInterval(() => {
      const currentTime = getCurrentTime();
      let newIndex = 0;

      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== currentLyricIndex) {
        setCurrentLyricIndex(newIndex);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lyrics, currentLyricIndex]);

  // Auto-scroll to current lyric
  useEffect(() => {
    if (currentLyricRef.current && lyricsRef.current) {
      currentLyricRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLyricIndex]);

  // Handle clicking on a lyric to jump to that time
  const handleLyricClick = (time: number) => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = time;
      setProgress([(time / audioRef.current.duration) * 100]);
    }
  };

  const handleToggleAutoSuggestions = (checked: boolean) => {
    if (checked && repeatMode !== "off") {
      toast({
        title: "Không thể bật gợi ý",
        description: "Tắt chế độ lặp để sử dụng gợi ý tự động.",
        variant: "warning",
      });
      return;
    }
    setAutoPlaySuggestions(checked);
    toast({
      title: checked ? "Đã bật gợi ý tự động" : "Đã tắt gợi ý tự động",
      description: checked
        ? "Khi hết danh sách phát sẽ phát tiếp các gợi ý"
        : "Khi hết danh sách phát sẽ dừng lại",
      duration: 2500,
      variant: checked ? "success" : "info",
    });
  };

  const startSuggestionsPlayback = useCallback(() => {
    if (repeatMode !== "off") {
      console.warn("Auto suggestions require repeat off");
      return false;
    }
    if (!autoPlaySuggestions) {
      console.warn("Auto suggestions disabled");
      return false;
    }
    if (suggestedSongs.length === 0) {
      console.warn("No suggested songs available");
      return false;
    }
    const nextSong = suggestedSongs[0];
    console.log("🎧 Adding suggested song to queue:", nextSong.songName || nextSong.name);
    addToQueue(nextSong);
    playSong(nextSong);
    return true;
  }, [addToQueue, autoPlaySuggestions, playSong, repeatMode, suggestedSongs]);

  const hasNextQueueSong = useCallback(() => {
    if (queue.length === 0) {
      return false;
    }
    if (!currentSong) {
      return queue.length > 0;
    }
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) {
      return queue.length > 0;
    }
    if (currentIndex < queue.length - 1) {
      return true;
    }
    return repeatMode === "all" && queue.length > 0;
  }, [currentSong, queue, repeatMode]);

  const finalizeQueueAfterPlayback = useCallback(
    (finishedSongId?: string | number) => {
      if (!finishedSongId) return;
      if (repeatMode === "off") {
        removeFromQueue(finishedSongId);
      } else if (repeatMode === "all") {
        const idx = queue.findIndex((s) => String(s.id) === String(finishedSongId));
        if (idx !== -1) {
          moveQueueItem(idx, queue.length - 1);
        }
      }
    },
    [moveQueueItem, queue, removeFromQueue, repeatMode],
  );

  const handleNextClick = () => {
    if (!hasNextQueueSong()) {
      const finishedId = currentSong?.id;
      finalizeQueueAfterPlayback(finishedId);
      if (!startSuggestionsPlayback()) {
        console.warn("No more songs to play");
      }
      return;
    }
    const finishedId = currentSong?.id;
    playNext();
    finalizeQueueAfterPlayback(finishedId);
  };

  const handleRemoveSong = (event: MouseEvent<HTMLButtonElement>, songId: string | number) => {
    event.stopPropagation();
    removeFromQueue(songId);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, songId: string | number) => {
    event.stopPropagation();
    setDraggingSongId(String(songId));
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(songId));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, songId: string | number) => {
    if (!draggingSongId) return;
    event.preventDefault();
    event.stopPropagation();
    if (draggingSongId === String(songId)) return;
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, songId: string | number) => {
    if (!draggingSongId) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceIndex = queue.findIndex((s) => String(s.id) === draggingSongId);
    const targetIndex = queue.findIndex((s) => String(s.id) === String(songId));
    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      moveQueueItem(sourceIndex, targetIndex);
    }
    setDraggingSongId(null);
  };

  const handleDropToEnd = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingSongId) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceIndex = queue.findIndex((s) => String(s.id) === draggingSongId);
    if (sourceIndex !== -1 && sourceIndex !== queue.length - 1) {
      moveQueueItem(sourceIndex, queue.length - 1);
    }
    setDraggingSongId(null);
  };

  const handleDragEnd = () => setDraggingSongId(null);

  // Load new song - professional handling with proper state management
  useEffect(() => {
    finalizeListeningSession("song-change");
    resetListeningSessionTracking();

    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;

    // Immediately pause and reset current playback
    audio.pause();
    audio.currentTime = 0;
    setIsLoading(true);

    // Reset all tracking states for new song
    setCurrentTime(0);
    setProgress([0]);
    setCurrentLyricIndex(0);
    setDuration(0);

    cleanupCallbacks.current = [];
    
    // Reset flag khi load bài mới
    hasTriggeredEndedRef.current = false;
    hlsInstanceRef.current = null;

    let hls: Hls | null = null;
    let safariMetadataListener: (() => void) | null = null;
    let loadErrorTimeout: ReturnType<typeof setTimeout> | null = null;

    const loadStreamUrl = async () => {
      try {
        // Dùng UUID trực tiếp từ currentSong; nếu chưa có thì fetch lại từ BE
        let songUuid = currentSong?.uuid;
        if (!songUuid) {
          console.warn("[MusicPlayer] Song missing uuid, fetching detail from backend", currentSong.id);
          const backendSong = await songsApi.getById(currentSong.id);
          songUuid = backendSong?.uuid;
          if (!songUuid) {
            throw new Error("UUID not available from backend");
          }
          const enrichedSong = { ...currentSong, uuid: songUuid };
          const updatedQueue = queue.map((song) =>
            song.id === enrichedSong.id ? { ...song, uuid: songUuid } : song
          );
          setQueue(updatedQueue);
          playSong(enrichedSong);
          return;
        }

        // Dùng proxy endpoint thay vì CloudFront signed URL trực tiếp
        // Proxy sẽ tự generate signed URL cho manifest và tất cả segments
        // HLS.js sẽ tự động resolve relative segment URLs relative to playlist URL
        const proxyBaseUrl = `/api/songs/${currentSong.id}/stream-proxy`;
        // Request variant playlist trực tiếp (HLS.js sẽ tự load segments từ đây)
        const finalStreamUrlAbsolute = `${window.location.origin}${proxyBaseUrl}/${songUuid}_128kbps.m3u8`;

        console.log("Using proxy endpoint for HLS streaming:", finalStreamUrlAbsolute);
        console.log("HLS.js will automatically resolve segment URLs relative to this playlist");

        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30, // Giảm back buffer
            debug: false,
            // Đảm bảo không loop playlist và không load quá nhiều
            maxBufferLength: 20, // Giảm buffer để tránh load quá nhiều
            maxMaxBufferLength: 30,
            maxBufferSize: 30 * 1000 * 1000, // 30MB max buffer
            // QUAN TRỌNG: Không set liveSyncDurationCount/liveMaxLatencyDurationCount cho VOD
            // Vì đây là VOD playlist (có #EXT-X-ENDLIST), không phải live stream
            // Hls.js sẽ tự động detect VOD và không reload playlist
            // Giảm số lần retry để tránh load thêm khi hết segment
            maxLoadingDelay: 2, // Giảm loading delay
            manifestLoadingTimeOut: 10000, // 10s timeout cho manifest
            manifestLoadingMaxRetry: 2, // Chỉ retry 2 lần cho manifest
            manifestLoadingRetryDelay: 1000, // Delay 1s giữa các retry
            levelLoadingTimeOut: 10000, // 10s timeout cho level
            levelLoadingMaxRetry: 2, // Chỉ retry 2 lần cho level
            levelLoadingRetryDelay: 1000, // Delay 1s giữa các retry
            fragLoadingTimeOut: 20000, // 20s timeout cho fragment
            fragLoadingMaxRetry: 3, // Retry 3 lần cho fragment (ít hơn mặc định)
            fragLoadingRetryDelay: 1000, // Delay 1s giữa các retry
            xhrSetup: (xhr, url) => {
              xhr.withCredentials = true;
              // QUAN TRỌNG: Thêm Authorization header vào tất cả HLS requests để bảo mật
              // Lấy token mới nhất mỗi lần gửi request để luôn dùng access token hiện tại
              const latestToken = getAuthToken();
              if (latestToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${latestToken}`);
              }
            },
          });
          
          hlsInstanceRef.current = hls; // Lưu reference để có thể stop khi cần

          hls.loadSource(finalStreamUrlAbsolute);
          hls.attachMedia(audio);
          
          // Lưu duration ban đầu để detect khi HLS loop
          let initialDuration = 0;
          
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            setIsLoading(false);
            
            // QUAN TRỌNG: Kiểm tra nếu playlist có #EXT-X-ENDLIST (VOD - không loop)
            // Nếu có, đảm bảo không reload playlist
            if (data && data.levels && data.levels.length > 0) {
              const level = data.levels[0];
              if (level.details && level.details.live === false) {
                console.log("✅ VOD playlist detected (has #EXT-X-ENDLIST), will not reload");
                // VOD playlist không cần reload, stop load khi hết segment
              }
            }
            
            // Lưu duration ban đầu
            setTimeout(() => {
              if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                initialDuration = audio.duration;
                setDuration(initialDuration);
                console.log("Initial duration set:", initialDuration, "seconds");
              }
            }, 1000);
            if (isPlayingRef.current) {
              audio.play().catch((err) => {
                console.error("Auto-play failed:", err);
              });
            }
          });
          
          // QUAN TRỌNG: Listen khi HLS đã load hết tất cả fragments (VOD)
          hls.on(Hls.Events.BUFFER_APPENDED, () => {
            // Kiểm tra nếu đã load hết và gần hết bài (trong vòng 2 giây)
            if (initialDuration > 0 && audio.currentTime >= initialDuration - 2) {
              console.log("Near end of song, stopping HLS load. Current:", audio.currentTime, "Duration:", initialDuration);
              try {
                hlsInstanceRef.current?.stopLoad();
                console.log("HLS load stopped successfully");
              } catch (e) {
                console.warn("Failed to stop HLS near end:", e);
              }
            }
            // Nếu duration tăng quá nhiều so với ban đầu (HLS đang loop), dừng ngay
            if (initialDuration > 0 && audio.duration > initialDuration * 1.1) {
              console.warn("HLS loop detected! Duration:", audio.duration, "Initial:", initialDuration, "Stopping load");
              try {
                hlsInstanceRef.current?.stopLoad();
                // Force set duration về giá trị ban đầu
                setDuration(initialDuration);
              } catch (e) {
                console.warn("Failed to stop HLS loop:", e);
              }
            }
          });
          
          // QUAN TRỌNG: Listen khi HLS đã load hết tất cả fragments (VOD playlist)
          // Khi hết fragments, stop load ngay để tránh retry/reload
          hls.on(Hls.Events.BUFFER_EOS, () => {
            console.log("✅ End of stream (EOS) detected, stopping HLS load");
            try {
              hlsInstanceRef.current?.stopLoad();
              console.log("HLS load stopped at end of stream");
            } catch (e) {
              console.warn("Failed to stop HLS at EOS:", e);
            }
          });

          hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
            console.log("HLS level loaded", data);
            // Update duration when level is loaded - chỉ update 1 lần
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
              const currentDuration = duration || 0;
              // Chỉ update nếu duration tăng (không phải do HLS loop)
              if (audio.duration > currentDuration) {
                setDuration(audio.duration);
                console.log("Duration updated from level loaded:", audio.duration, "seconds");
              }
            }
          });
          
          // KHÔNG listen LEVEL_UPDATED vì nó trigger liên tục khi HLS loop
          // Chỉ dùng LEVEL_LOADED để lấy duration ban đầu

          hls.on(Hls.Events.ERROR, (_event, data) => {
            // Chỉ log non-fatal errors, không báo lỗi
            if (!data.fatal) {
              console.warn("HLS non-fatal error (ignored):", data.type, data.details);
              return;
            }
            
            console.error("HLS fatal error:", data);
            let shouldShowError = true;
            let shouldRecover = false;
            
            // QUAN TRỌNG: Nếu lỗi 404 (file không tồn tại), có thể là file đã bị xóa trên S3
            // Check response code để xác định
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && 
                (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                 data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR ||
                 data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR)) {
              const response = data.response;
              // Nếu là 404 hoặc 403 (signed URL hết hạn hoặc file không tồn tại), file đã bị xóa
              if (response && (response.code === 404 || response.status === 404 || 
                               response.code === 403 || response.status === 403)) {
                console.error("⚠️ Audio file not found (404/403), likely deleted from S3 or CloudFront cache expired");
                setIsLoading(false);
                toast({
                  title: "Bài hát không khả dụng",
                  description: "File audio đã bị xóa hoặc không còn khả dụng. Đang chuyển sang bài tiếp theo...",
                  variant: "destructive",
                  duration: 3000,
                });
                // Auto skip to next song
                setTimeout(() => {
                  handleNextClick();
                }, 1000);
                return; // Không thử recover nữa
              }
              
              // Nếu là bitrate playlist chưa có, fallback về master playlist
              const currentUrl = hls?.url || '';
              if (currentUrl.includes('_128kbps.m3u8')) {
                console.warn("⚠️ Bitrate playlist not found, falling back to master playlist");
                // Fallback về master playlist
                const masterUrl = currentUrl.replace('_128kbps.m3u8', '.m3u8');
                try {
                  if (hls) {
                    hls.loadSource(masterUrl);
                    shouldRecover = true;
                    shouldShowError = false;
                    console.log("🔄 Fallback to master playlist:", masterUrl);
                    return;
                  }
                } catch (e) {
                  console.error("Failed to fallback to master playlist:", e);
                }
              }
            }
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Thử recover trước
                try {
                  hls?.startLoad();
                  shouldRecover = true;
                  shouldShowError = false; // Không báo lỗi ngay, đợi xem recover có thành công không
                  console.log("Attempting to recover from network error...");
                } catch (e) {
                  console.error("Failed to recover from network error:", e);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Thử recover trước
                try {
                  hls?.recoverMediaError();
                  shouldRecover = true;
                  shouldShowError = false; // Không báo lỗi ngay, đợi xem recover có thành công không
                  console.log("Attempting to recover from media error...");
                } catch (e) {
                  console.error("Failed to recover from media error:", e);
                }
                break;
              default:
                // Các lỗi khác không recover được
                break;
            }

            // Chỉ hiển thị error sau khi đã thử recover và đợi một chút
            // để xem có recover được không
            if (shouldShowError) {
              setIsLoading(false);
              let errorMsg = `HLS stream error: ${data.type || "unknown"}`;
              if (data.details) {
                errorMsg += ` - ${data.details}`;
              }
              if (data.response) {
                errorMsg += ` (Response: ${data.response.code || "N/A"})`;
              }
              toast({
                title: "Playback error",
                description: errorMsg,
                variant: "destructive",
              });
            } else if (shouldRecover) {
              // Đợi 3 giây, nếu vẫn không play được thì mới báo lỗi
              setTimeout(() => {
                if (audio.paused || audio.readyState < 2) {
                  console.error("Recovery failed, audio still not playing");
                  setIsLoading(false);
                  toast({
                    title: "Playback error",
                    description: "Failed to recover from stream error. Trying next song...",
                    variant: "destructive",
                  });
                  setTimeout(() => handleNextClick(), 1000);
                } else {
                  console.log("Recovery successful, audio is playing");
                }
              }, 3000);
            }
          });
        } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          safariMetadataListener = () => {
            setIsLoading(false);
            if (isPlayingRef.current) {
              audio.play().catch((err) => {
                console.error("Auto-play failed:", err);
              });
            }
            if (safariMetadataListener) {
              audio.removeEventListener("loadedmetadata", safariMetadataListener);
              safariMetadataListener = null;
            }
          };

          audio.addEventListener("loadedmetadata", safariMetadataListener);
          audio.src = finalStreamUrlAbsolute; // Dùng absolute URL cho Safari
          audio.load();
        } else {
          setIsLoading(false);
          toast({
            title: "Playback error",
            description: "Your browser does not support HLS streaming",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Failed to start proxy stream:", error);
        setIsLoading(false);
        
        // Check if error is due to audio file not found on S3
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "";
        const isAudioNotFound = error?.response?.status === 404 || 
                                errorMessage.includes("AUDIO_NOT_FOUND") ||
                                errorMessage.includes("not found on S3") ||
                                errorMessage.includes("may have been deleted");
        
        if (isAudioNotFound) {
          toast({
            title: "Bài hát không khả dụng",
            description: "File audio đã bị xóa. Đang chuyển sang bài tiếp theo...",
            variant: "destructive",
            duration: 3000,
          });
          // Auto skip to next song after 1 second
          setTimeout(() => {
            handleNextClick();
          }, 1000);
        } else {
          toast({
            title: "Playback error",
            description: "Failed to get stream URL. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    loadStreamUrl();

    const handleCanPlay = () => {
      setIsLoading(false);
      if (!isPlayingRef.current) return;

      audio.play().catch((err) => {
        console.error("Auto-play failed:", err);
        toast({
          title: "Playback paused",
          description: "Click play to continue",
        });
      });
    };

    // Chỉ add error listener cho Safari native HLS, không add cho Hls.js
    // Vì Hls.js sẽ tự xử lý errors qua HLS.Events.ERROR
    if (!Hls.isSupported() && audio.canPlayType("application/vnd.apple.mpegurl")) {
      const handleLoadError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        console.error("Audio load error:", e);
        setIsLoading(false);
        // Chỉ báo lỗi nếu thực sự không load được (không phải recoverable)
        if (target.error && target.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          toast({
            title: "Load error",
            description: "Failed to load audio. Skipping to next song...",
            variant: "destructive",
          });
          loadErrorTimeout = setTimeout(() => {
            handleNextClick();
          }, 2000);
        }
      };
      audio.addEventListener("error", handleLoadError);
      cleanupCallbacks.current.push(() => {
        audio.removeEventListener("error", handleLoadError);
      });
    }
    
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      if (safariMetadataListener) {
        audio.removeEventListener("loadedmetadata", safariMetadataListener);
        safariMetadataListener = null;
      }
      if (loadErrorTimeout) {
        clearTimeout(loadErrorTimeout);
      }
      cleanupCallbacks.current.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.warn("Cleanup callback failed", err);
        }
      });
      cleanupCallbacks.current = [];
      // Cleanup HLS instance
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.stopLoad();
          hlsInstanceRef.current.destroy();
          console.log("HLS instance destroyed (cleanup)");
        } catch (e) {
          console.warn("Error destroying HLS instance:", e);
        }
        hlsInstanceRef.current = null;
      }
      if (hls) {
        try {
          hls.stopLoad();
          hls.destroy();
        } catch (e) {
          console.warn("Error destroying HLS:", e);
        }
        hls = null;
      }
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [currentSong]); // Only reload when song changes, not isPlaying/playNext

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
  // Track current playback time
  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      setCurrentTime(audio.currentTime);

      if (audio.paused) {
        lastTick = Date.now();
        return;
      }

      const now = Date.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;

      if (deltaSeconds > 0) {
        listenedSecondsRef.current += deltaSeconds;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update progress and handle song end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        setProgress([progressPercent]);
        setCurrentTime(audio.currentTime); // Also update currentTime here for consistency
      }
    };

    // Lưu duration ban đầu để tránh update khi HLS loop
    let initialDurationForCheck = 0;
    
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        // Lần đầu tiên, lưu duration ban đầu
        if (initialDurationForCheck === 0) {
          initialDurationForCheck = audio.duration;
          setDuration(audio.duration);
          console.log("Initial duration set in updateDuration:", audio.duration);
        } else if (audio.duration <= initialDurationForCheck * 1.05) {
          // Chỉ update nếu duration không tăng quá 5% (cho phép sai số nhỏ)
          setDuration(audio.duration);
        } else {
          // Duration tăng quá nhiều, có thể HLS đang loop - không update
          console.warn("Duration increased too much, possible HLS loop. Ignoring update. Current:", audio.duration, "Initial:", initialDurationForCheck);
        }
      }
    };

    // Reset flag khi song thay đổi
    hasTriggeredEndedRef.current = false;
    
    const handleEnded = () => {
      if (hasTriggeredEndedRef.current) return; // Tránh trigger nhiều lần
      hasTriggeredEndedRef.current = true;
      
      console.log("Song ended event triggered, repeat mode:", repeatMode);
      console.log("Final duration:", audio.duration, "Final time:", audio.currentTime);
      
      // Dừng HLS load khi bài hát kết thúc
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.stopLoad();
          console.log("HLS load stopped (ended event)");
        } catch (e) {
          console.warn("Failed to stop HLS load:", e);
        }
      }

      if (repeatMode === "one") {
        hasTriggeredEndedRef.current = false;
        audio.currentTime = 0;
        if (hlsInstanceRef.current) {
          try {
            hlsInstanceRef.current.startLoad();
          } catch (e) {
            console.warn("Failed to restart HLS load:", e);
          }
        }
        audio.play().catch(err => console.error("Repeat play error:", err));
      } else {
        const finishedId = currentSong?.id;
        const hasNext = hasNextQueueSong();
        if (hasNext) {
          playNext();
          finalizeQueueAfterPlayback(finishedId);
        } else {
          finalizeQueueAfterPlayback(finishedId);
          if (!startSuggestionsPlayback()) {
            console.warn("No songs left in queue or suggestions");
          }
        }
      }
    };

    // Fallback: Check if song should end based on duration and currentTime
    // HLS có thể không trigger ended event đúng cách, đặc biệt khi playlist loop
    const checkSongEnd = () => {
      if (hasTriggeredEndedRef.current) return; // Đã trigger rồi, không check nữa
      
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        // Nếu currentTime >= duration (hoặc gần bằng trong vòng 0.3 giây) và đang play
        // thì force stop và chuyển bài ngay (không để HLS load thêm segment)
        const timeRemaining = audio.duration - audio.currentTime;
        if (timeRemaining <= 0.3 && !audio.paused && audio.readyState >= 2) {
          console.log("Song should end (fallback check), forcing stop and switching. Duration:", audio.duration, "Current:", audio.currentTime);
          // Dừng HLS load ngay để tránh load thêm segment
          if (hlsInstanceRef.current) {
            try {
              hlsInstanceRef.current.stopLoad();
              console.log("HLS load stopped");
            } catch (e) {
              console.warn("Failed to stop HLS load:", e);
            }
          }
          // Force stop audio ngay
          audio.pause();
          hasTriggeredEndedRef.current = true; // Đánh dấu đã trigger để tránh trigger lại
          // Chuyển bài ngay lập tức
          if (repeatMode === "one") {
            hasTriggeredEndedRef.current = false;
            audio.currentTime = 0;
            if (hlsInstanceRef.current) {
              try {
                hlsInstanceRef.current.startLoad();
              } catch (e) {
                console.warn("Failed to restart HLS load:", e);
              }
            }
            audio.play().catch(err => console.error("Repeat play error:", err));
          } else {
            console.log("Auto-playing next song");
            const finishedId = currentSong?.id;
            if (hasNextQueueSong()) {
              playNext();
              finalizeQueueAfterPlayback(finishedId);
            } else {
              finalizeQueueAfterPlayback(finishedId);
              if (!startSuggestionsPlayback()) {
                console.warn("No songs left to auto-play");
              }
            }
          }
          return;
        }
        // Nếu currentTime vượt quá duration (do HLS loop), force stop và chuyển bài ngay
        if (audio.currentTime > audio.duration && audio.duration > 0) {
          console.warn("CurrentTime exceeds duration (HLS loop detected), forcing stop and switching. Duration:", audio.duration, "Current:", audio.currentTime);
          // Dừng HLS load
          if (hlsInstanceRef.current) {
            try {
              hlsInstanceRef.current.stopLoad();
              console.log("HLS load stopped (loop detected)");
            } catch (e) {
              console.warn("Failed to stop HLS load:", e);
            }
          }
          audio.pause();
          hasTriggeredEndedRef.current = true;
          if (repeatMode === "one") {
            hasTriggeredEndedRef.current = false;
            audio.currentTime = 0;
            if (hlsInstanceRef.current) {
              try {
                hlsInstanceRef.current.startLoad();
              } catch (e) {
                console.warn("Failed to restart HLS load:", e);
              }
            }
            audio.play().catch(err => console.error("Repeat play error:", err));
          } else {
            console.log("Auto-playing next song (loop detected), queue length:", queue.length);
            const finishedId = currentSong?.id;
            if (hasNextQueueSong()) {
              playNext();
              finalizeQueueAfterPlayback(finishedId);
            } else {
              finalizeQueueAfterPlayback(finishedId);
              if (!startSuggestionsPlayback()) {
                console.warn("No songs left to auto-play");
              }
            }
          }
        }
      }
    };

    // Chỉ add error listener cho Safari native HLS, KHÔNG add cho Hls.js
    // Vì Hls.js sẽ tự xử lý tất cả errors qua HLS.Events.ERROR
    // Nếu add error listener cho audio element khi dùng Hls.js, nó sẽ trigger
    // ngay cả khi HLS đang recover, gây ra toast lỗi không cần thiết
    let handleError: ((e: Event) => void) | null = null;
    if (!Hls.isSupported() && audio.canPlayType("application/vnd.apple.mpegurl")) {
      handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        // Chỉ xử lý lỗi thực sự fatal, không phải recoverable errors
        if (target.error) {
          const errorCode = target.error.code;
          // MEDIA_ERR_ABORTED (1) và MEDIA_ERR_NETWORK (2) có thể recover
          // Chỉ xử lý MEDIA_ERR_DECODE (3) và MEDIA_ERR_SRC_NOT_SUPPORTED (4)
          if (errorCode === MediaError.MEDIA_ERR_DECODE || 
              errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            console.error("Fatal audio error:", e, "Code:", errorCode);
            toast({
              title: "Playback error",
              description: "Failed to play audio. Trying next song...",
              variant: "destructive",
            });
            // Try next song on fatal error
            setTimeout(() => handleNextClick(), 1000);
          } else {
            console.warn("Recoverable audio error (ignored):", errorCode);
          }
        }
      };
      audio.addEventListener("error", handleError);
      cleanupCallbacks.current.push(() => {
        if (handleError) {
          audio.removeEventListener("error", handleError);
        }
      });
    }

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration); // Thêm listener cho duration change
    audio.addEventListener("ended", handleEnded);
    // KHÔNG add error listener cho audio element khi dùng Hls.js

    // Fallback check cho ended event (mỗi giây)
    const endCheckInterval = setInterval(checkSongEnd, 1000);

    return () => {
      // Dừng HLS trước khi cleanup
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.stopLoad();
        } catch (e) {
          console.warn("Failed to stop HLS in cleanup:", e);
        }
      }
      
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      if (handleError) {
        audio.removeEventListener("error", handleError);
      }
      clearInterval(endCheckInterval);
    };
  }, [repeatMode, playNext, hasNextQueueSong, startSuggestionsPlayback, finalizeQueueAfterPlayback, currentSong?.id]);

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


  const toggleMute = () => setIsMuted(!isMuted);

  const handleShuffleToggle = () => {
    const newShuffleState = !isShuffled;
    toggleShuffle();
    // Auto tắt gợi ý khi bật shuffle
    if (newShuffleState && autoPlaySuggestions) {
      setAutoPlaySuggestions(false);
    toast({
        title: "Shuffle on",
        description: "Gợi ý tự động đã tắt khi bật shuffle",
        duration: 2000,
      });
      return;
    }
    toast({
      title: newShuffleState ? "Shuffle on" : "Shuffle off",
      description: newShuffleState
        ? "Playing songs in random order"
        : "Playing songs in order",
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
        setShareSong({
          id: currentSong.id,
          title: currentSong.songName || currentSong.name || "Unknown Song",
          url: `${window.location.origin}/song/${currentSong.id}`,
        });
        break;
      case "playlist":
        setAddToPlaylistOpen(true);
        break;
      case "copy": {
        const songUrl = `${window.location.origin}/song/${currentSong.id}`;
        navigator.clipboard.writeText(songUrl);
        toast({
          title: "Link copied!",
          description: "Song link copied to clipboard",
        });
        break;
      }
    }
  };

  const cycleRepeat = () => {
    const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"];
    const modeNames = ["Repeat off", "Repeat one", "Repeat all"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    const nextModeName = modeNames[(currentIndex + 1) % modes.length];

    setRepeatMode(nextMode);
    // Auto tắt gợi ý khi bật repeat (one hoặc all)
    if (nextMode !== "off" && autoPlaySuggestions) {
      setAutoPlaySuggestions(false);
    }
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
  // Also reset showLyrics and isExpanded when no song
  useEffect(() => {
    if (!currentSong) {
      setShowLyrics(false);
      setIsExpanded(false);
      setShowPlaylist(false);
      setSuggestedSongs([]);
    }
  }, [currentSong]);

  // Close all overlays on Escape key (global handler)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
          e.preventDefault();
          e.stopPropagation();
        } else if (showLyrics) {
          setShowLyrics(false);
          e.preventDefault();
          e.stopPropagation();
        } else if (showPlaylist) {
          setShowPlaylist(false);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // Only add listener if any overlay is open
    if (isExpanded || showLyrics || showPlaylist) {
      window.addEventListener('keydown', handleEscape, true);
      return () => window.removeEventListener('keydown', handleEscape, true);
    }
  }, [isExpanded, showLyrics, showPlaylist]);

  // Safety: Force close all overlays if they're stuck open without currentSong
  useEffect(() => {
    if (!currentSong) {
      // Small delay to ensure state updates
      const timer = setTimeout(() => {
        if (isExpanded || showLyrics || showPlaylist) {
          console.warn("[MusicPlayer] Force closing stuck overlays - no current song");
          setIsExpanded(false);
          setShowLyrics(false);
          setShowPlaylist(false);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentSong, isExpanded, showLyrics, showPlaylist]);

  // Load suggested songs (50 max) whenever current song changes
  useEffect(() => {
    if (!currentSong) {
      setSuggestedSongs([]);
      loadedSuggestionsForSongId.current = null;
      return;
    }

    const currentSongId = currentSong.id;
    if (loadedSuggestionsForSongId.current === currentSongId) {
      return;
    }

    let isMounted = true;
    const loadSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const songId = typeof currentSongId === "string" ? Number(currentSongId) : currentSongId;
        const recommendations = await songsApi.getRecommendations(songId, 50);
        const formattedSongs = recommendations.map((s) => mapToPlayerSong(s));
        if (isMounted) {
          setSuggestedSongs(formattedSongs);
          loadedSuggestionsForSongId.current = currentSongId;
        }
      } catch (error) {
        console.error("Error loading suggestions:", error);
        if (isMounted) {
          setSuggestedSongs([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuggestions(false);
        }
      }
    };

    loadSuggestions();
    return () => {
      isMounted = false;
    };
  }, [currentSong?.id]);

  if (location.pathname === "/login" || !currentSong) {
    return null;
  }

  return (
    <>
      {/* Audio Element */}
      <audio ref={audioRef} />

      {/* Mini Player */}
      <div className="fixed bottom-0 left-0 right-0 z-[55] bg-background/95 backdrop-blur-lg border-t border-border/40">
        <div className="container mx-auto px-2 sm:px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Song Info */}
            {/* Song Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0 order-1 sm:order-none">
              <div
                className="relative group cursor-pointer"
                onClick={() => setShowLyrics(!showLyrics)}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow">
                  {currentSong.cover ? (
                    <img
                      src={currentSong.cover}
                      alt={currentSong.songName || currentSong.name || "Unknown Song"}
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
                  {currentSong.songName || currentSong.name || "Unknown Song"}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {currentSong.artist || "Unknown Artist"}
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
                  onClick={() => {
                    console.log("Previous clicked, queue length:", queue.length, "currentSong:", currentSong?.id);
                    playPrevious();
                  }}
                  disabled={queue.length === 0}
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
                  onClick={handleNextClick}
                  disabled={!hasNextQueueSong() && (!autoPlaySuggestions || suggestedSongs.length === 0)}
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
              {/* Playlist Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPlaylist(!showPlaylist)}
              >
                <Menu className="w-4 h-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleShare("playlist")}>
                    <ListPlus className="w-4 h-4 mr-2" />
                    Thêm vào playlist
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleShare("friends")}>
                    <Users className="w-4 h-4 mr-2" />
                    Chia sẻ với bạn bè
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
        <div 
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-lg flex flex-col"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsExpanded(false);
          }}
        >
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
                  alt={currentSong.songName || currentSong.name || "Unknown Song"}
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
              <h2 className="text-2xl font-bold">{currentSong.songName || currentSong.name || "Unknown Song"}</h2>
              <p className="text-muted-foreground">{currentSong.artist || "Unknown Artist"}</p>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextClick}
                  disabled={!hasNextQueueSong() && (!autoPlaySuggestions || suggestedSongs.length === 0)}
                >
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

            {/* Lyrics in Expanded Player */}
            {showLyrics && lyrics.length > 0 && (
              <div className="w-full max-w-lg text-center mt-6 max-h-96 overflow-y-auto space-y-2">
                {lyrics.map((line, i) => (
                  <p
                    key={i}
                    className={cn(
                      "text-sm transition-colors cursor-pointer hover:text-primary",
                      i === currentLyricIndex
                        ? "text-primary font-medium text-lg"
                        : "text-muted-foreground"
                    )}
                    onClick={() => handleLyricClick(line.time)}
                    ref={i === currentLyricIndex ? currentLyricRef : null}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lyrics Panel */}
      {showLyrics && currentSong && (
        <div className="fixed inset-0 z-[52]">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/98 to-background backdrop-blur-md cursor-pointer"
            onClick={() => setShowLyrics(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowLyrics(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Close lyrics"
          />

          {/* Content panel */}
          <div className="relative h-full flex flex-col max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-border/40 bg-background/90 backdrop-blur-sm">
              <div>
                <h3 className="text-lg font-semibold">Lyrics</h3>
                <p className="text-sm text-muted-foreground">
                  {currentSong?.songName || currentSong?.name || "Unknown Song"} • {currentSong?.artist}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowLyrics(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Lyrics Content - Hidden scrollbar */}
            <div
              ref={lyricsRef}
              className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 space-y-2 sm:space-y-3 scrollbar-hide"
              style={{
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE and Edge */
              }}
            >
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none; /* Chrome, Safari, Opera */
                }
              `}</style>
              {lyrics.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-base sm:text-lg transition-all duration-300 cursor-pointer px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-center select-none",
                    i === currentLyricIndex
                      ? "text-primary font-bold text-lg sm:text-2xl bg-primary/10 scale-105 shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  )}
                  onClick={() => handleLyricClick(line.time)}
                  ref={i === currentLyricIndex ? currentLyricRef : null}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playlist Panel */}
      {showPlaylist && (
        <div className="fixed inset-0 z-[52]">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-background/95 backdrop-blur-md cursor-pointer"
            onClick={() => setShowPlaylist(false)}
            role="button"
            tabIndex={0}
            aria-label="Close playlist"
          />

          {/* Content panel */}
          <div className="relative h-full flex flex-col max-w-2xl mx-auto bg-background border-x border-border/40">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-border/40 bg-background/90 backdrop-blur-sm">
              <h3 className="text-lg font-semibold">Danh sách phát</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPlaylist(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Playlist Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Các bài đang ở trong hàng chờ</p>
                    <h4 className="text-lg font-semibold text-foreground">Hàng chờ hiện tại ({queue.length})</h4>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      Giữ biểu tượng <GripVertical className="inline h-3 w-3" /> để sắp xếp. Kéo lên/xuống để xem thêm bài hát.
                    </p>
                  </div>
                </div>
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <Music className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Danh sách phát trống</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Thêm bài hát hoặc bật gợi ý tự động để tiếp tục nghe nhạc
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((song) => (
                      <div
                        key={song.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, song.id)}
                        onDragOver={(event) => handleDragOver(event, song.id)}
                        onDrop={(event) => handleDrop(event, song.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => playSong(song)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border border-transparent bg-background/40 p-3 transition hover:border-primary/20 hover:bg-primary/5",
                          currentSong?.id === song.id && "border-primary/40 bg-primary/10",
                          draggingSongId === String(song.id) && "ring-2 ring-primary/50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="hidden cursor-grab rounded-md p-2 text-muted-foreground transition group-hover:flex group-active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>

                        <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 shadow-inner">
                          {song.cover ? (
                            <img
                              src={song.cover}
                              alt={song.songName || song.name || "Unknown Song"}
                              onError={handleImageError}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                              <Music className="w-6 h-6 text-white" />
                            </div>
                          )}
                          {currentSong?.id === song.id && isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate",
                              currentSong?.id === song.id && "text-primary",
                            )}
                          >
                            {song.songName || song.name || "Unknown Song"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {song.artist || "Unknown Artist"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                          <span>{formatTime(song.duration || 0)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="invisible text-muted-foreground transition group-hover:visible hover:text-destructive"
                            onClick={(event) => handleRemoveSong(event, song.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {draggingSongId && (
                      <div
                        onDragOver={(event) => {
                          if (!draggingSongId) return;
                          event.preventDefault();
                        }}
                        onDrop={handleDropToEnd}
                        className="flex h-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 text-xs text-muted-foreground"
                      >
                        Thả vào đây để đưa bài xuống cuối danh sách
                      </div>
                    )}
                  </div>
                )}

                {showQueueScrollHint && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ChevronsDown className="h-4 w-4 animate-bounce" />
                    Cuộn để xem thêm bài hát
                  </div>
                )}
            </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      Tự động phát
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Danh sách bài hát gợi ý
                    </p>
                  </div>
                  <Switch
                    id="auto-suggestions-switch"
                    checked={autoPlaySuggestions}
                    onCheckedChange={handleToggleAutoSuggestions}
                    disabled={repeatMode !== "off"}
                  />
                </div>
                {repeatMode !== "off" && (
                  <p className="text-xs text-muted-foreground -mt-2 mb-3">
                    Tắt chế độ lặp để sử dụng gợi ý tự động.
                  </p>
                )}

                {!autoPlaySuggestions ? null : isLoadingSuggestions ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-muted-foreground">Đang tải gợi ý...</p>
                  </div>
                ) : suggestedSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <Music className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Không có gợi ý phù hợp</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Thử chọn bài hát khác để hệ thống phân tích lại
                    </p>
                  </div>
                ) : (
                  suggestedSongs
                    .filter(song => !queue.some(q => q.id === song.id))
                    .slice(0, 50)
                    .map((song) => (
                    <div
                      key={song.id}
                      onClick={() => {
                        // Khi click vào bài gợi ý, thêm vào queue và phát (không đóng panel)
                        addToQueue(song);
                        playSong(song);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent",
                        currentSong?.id === song.id && "bg-primary/10 border border-primary/20"
                      )}
                    >
                      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={song.songName || song.name || "Unknown Song"}
                            onError={handleImageError}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                            <Music className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {currentSong?.id === song.id && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            currentSong?.id === song.id && "text-primary"
                          )}
                        >
                          {song.songName || song.name || "Unknown Song"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {typeof song.artist === "string" ? song.artist : song.artist || "Unknown Artist"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(song.duration || 0)}
                      </div>
                    </div>
                  ))
                )}
                </div>
            </div>
          </div>
        </div>
      )}
      
      {currentSong && (
        <>
          <AddToPlaylistDialog
            open={addToPlaylistOpen}
            onOpenChange={setAddToPlaylistOpen}
            songId={currentSong.id}
            songTitle={currentSong.songName || currentSong.name || "Unknown Song"}
            songCover={currentSong.cover}
          />
          {shareSong && (
            <ShareButton
              key={`share-${shareSong.id}`}
              title={shareSong.title}
              type="song"
              url={shareSong.url}
              open={!!shareSong}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setShareSong(null);
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
};

export default MusicPlayer;
