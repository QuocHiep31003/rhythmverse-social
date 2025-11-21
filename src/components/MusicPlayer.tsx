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
  X,
  Menu,
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
import { authApi } from "@/services/api/authApi";
import { getAuthToken } from "@/services/api";
import { mapToPlayerSong } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import Hls from "hls.js";

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
  const [hasReportedListen, setHasReportedListen] = useState(false);
  const [hasIncrementedPlayCount, setHasIncrementedPlayCount] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState<typeof queue>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [autoPlaySuggestions, setAutoPlaySuggestions] = useState(true);
  const loadedSuggestionsForSongId = useRef<string | number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const cleanupCallbacks = useRef<(() => void)[]>([]);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const hasTriggeredEndedRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load current user ID from token
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const user = await authApi.me();
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.warn("Failed to load user ID for listening history:", error);
        setCurrentUserId(null);
      }
    };
    loadUserId();
  }, []);

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
    setAutoPlaySuggestions(checked);
    toast({
      title: checked ? "Đã bật gợi ý tự động" : "Đã tắt gợi ý tự động",
      description: checked
        ? "Khi hết danh sách phát sẽ phát tiếp các gợi ý"
        : "Khi hết danh sách phát sẽ dừng lại",
      duration: 2500,
    });
  };

  const startSuggestionsPlayback = () => {
    if (!autoPlaySuggestions) {
      console.warn("Auto suggestions disabled");
      return false;
    }
    if (suggestedSongs.length === 0) {
      console.warn("No suggested songs available");
      return false;
    }
    // Thêm bài đầu tiên từ danh sách gợi ý vào queue và phát
    const nextSong = suggestedSongs[0];
    console.log("🎧 Adding suggested song to queue:", nextSong.songName || nextSong.name);
    addToQueue(nextSong);
    playSong(nextSong);
    return true;
  };

  const hasNextQueueSong = () => {
    if (queue.length === 0 || !currentSong) {
      return queue.length > 0;
    }
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    return currentIndex >= 0 && currentIndex < queue.length - 1;
  };

  const handleNextClick = () => {
    if (!hasNextQueueSong()) {
      if (!startSuggestionsPlayback()) {
        console.warn("No more songs to play");
      }
      return;
    }
    playNext();
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
    setHasIncrementedPlayCount(false);
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
        // Gọi BE lấy CloudFront HLS URL (không ký, không proxy)
        const { streamUrl, uuid } = await songsApi.getStreamUrl(currentSong.id);
        let finalStreamUrl = streamUrl;
        
        if (!finalStreamUrl) {
          throw new Error("No stream URL available");
        }

        // QUAN TRỌNG: Load bitrate playlist (_128kbps.m3u8) thay vì master playlist (.m3u8)
        // Master playlist sẽ khiến HLS player auto-fallback và retry → load thêm segment
        // Backend trả về URL dạng: /api/songs/{songId}/stream-proxy/
        // Cần append filename vào cuối URL
        let useBitratePlaylist = false;
        if (uuid && !finalStreamUrl.includes('_128kbps.m3u8')) {
          // Nếu URL kết thúc bằng / hoặc không có filename, append bitrate playlist
          if (finalStreamUrl.endsWith('/') || !finalStreamUrl.endsWith('.m3u8')) {
            // Append filename vào cuối URL
            finalStreamUrl = finalStreamUrl.replace(/\/$/, '') + '/' + uuid + '_128kbps.m3u8';
            useBitratePlaylist = true;
          } else if (finalStreamUrl.endsWith('.m3u8') && !finalStreamUrl.includes('_128kbps')) {
            // Nếu đã có .m3u8 nhưng không phải bitrate playlist, thay thế filename
            finalStreamUrl = finalStreamUrl.replace(/[^/]+\.m3u8$/, `${uuid}_128kbps.m3u8`);
            useBitratePlaylist = true;
          }
          console.log("🔄 Converted to bitrate playlist:", finalStreamUrl);
        }

        const finalStreamUrlAbsolute = finalStreamUrl.startsWith("http")
          ? finalStreamUrl
          : `${window.location.origin}${finalStreamUrl}`;

        console.log("Using backend proxy HLS URL (bitrate playlist):", finalStreamUrlAbsolute);

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
            maxMaxLoadingDelay: 4, // Giảm max loading delay
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
            xhrSetup: (xhr) => {
              xhr.withCredentials = true;
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
            
            // QUAN TRỌNG: Nếu lỗi 404 (file không tồn tại), có thể là bitrate playlist chưa có
            // Fallback về master playlist nếu đang dùng bitrate playlist
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && 
                (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                 data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR)) {
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
          audio.src = finalStreamUrl;
          audio.load();
        } else {
          setIsLoading(false);
          toast({
            title: "Playback error",
            description: "Your browser does not support HLS streaming",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to start proxy stream:", error);
        setIsLoading(false);
        toast({
          title: "Playback error",
          description: "Failed to get stream URL. Please try again.",
          variant: "destructive",
        });
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

    const interval = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 500); // Update every 500ms for better accuracy

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
        // Repeat current song
        hasTriggeredEndedRef.current = false; // Reset để có thể repeat
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
        // Play next song (works for both "all" and "off" modes)
        console.log("Playing next song");
        if (hasNextQueueSong()) {
        playNext();
        } else if (!startSuggestionsPlayback()) {
          console.warn("No songs left in queue or suggestions");
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
            hasTriggeredEndedRef.current = false; // Reset để có thể repeat
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
            if (hasNextQueueSong()) {
            playNext();
            } else if (!startSuggestionsPlayback()) {
              console.warn("No songs left to auto-play");
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
            if (hasNextQueueSong()) {
            playNext();
            } else if (!startSuggestionsPlayback()) {
              console.warn("No songs left to auto-play");
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
  }, [repeatMode, playNext, queue.length, currentSong]);

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

  // Record listening history when user has listened for at least 30 seconds AND reached the end of the song
  // This ensures we only count 1 play per song when user listens to the full duration
  useEffect(() => {
    if (!currentSong || hasReportedListen || !audioRef.current || !currentUserId) return;

    const duration = audioRef.current.duration;
    const isEnded = audioRef.current.ended || (duration && currentTime >= duration - 1); // Allow 1 second tolerance

    // Record if: user has listened at least 30 seconds AND reached the end of the song
    if (duration && !isNaN(duration) && currentTime >= 30 && isEnded) {
      const songIdForApi = isNaN(Number(currentSong.id)) ? currentSong.id : Number(currentSong.id);
      console.log(`🎵 Recording listen: ${currentSong.songName || currentSong.name || "Unknown Song"} (ID: ${currentSong.id}, UserID: ${currentUserId}, Coerced: ${songIdForApi}) (${Math.round(currentTime)}s / ${Math.round(duration)}s - Full play)`);

      // Record listening history via backend API (backend will extract userId from token)
      songsApi
        .recordPlayback(songIdForApi, currentUserId)
        .then(() => {
          console.log("✅ Listening history recorded successfully");
          setHasReportedListen(true);
        })
        .catch(err => {
          console.error("❌ Failed to record listen:", err);
        });

      // Increment play count
      if (!hasIncrementedPlayCount) {
        console.log(`🎵 Incrementing play count for song ID: ${currentSong.id} (Coerced: ${songIdForApi}, Type: ${typeof songIdForApi})`);
        songsApi
          .incrementPlayCount(String(songIdForApi))
          .then(() => {
            console.log("✅ Play count incremented successfully");
            setHasIncrementedPlayCount(true);
          })
          .catch(err => {
            console.error("❌ Failed to increment play count:", err);
            // Không throw error, chỉ log để không ảnh hưởng đến listening history
          });
      }
    }
  }, [currentTime, currentSong, hasReportedListen, hasIncrementedPlayCount]);

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
        toast({
          title: "Share with friends",
          description: `Sharing "${currentSong.songName || currentSong.name || "Unknown Song"}" with your friends`,
        });
        break;
      case "playlist":
        toast({
          title: "Add to playlist",
          description: `Adding "${currentSong.songName || currentSong.name || "Unknown Song"}" to your playlist`,
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
      setSuggestedSongs([]);
    }
  }, [currentSong]);

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
            className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/98 to-background backdrop-blur-md"
            onClick={() => setShowLyrics(false)}
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
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
            onClick={() => setShowPlaylist(false)}
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
                  queue.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => {
                        playSong(song);
                        // Không đóng panel khi click bài hát
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
                          {song.artist || "Unknown Artist"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(song.duration || 0)}
                      </div>
                    </div>
                  ))
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
                  />
                </div>

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
    </>
  );
};

export default MusicPlayer;
