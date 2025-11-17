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
import { cn, handleImageError, DEFAULT_AVATAR_URL } from "@/lib/utils";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { lyricsApi } from "@/services/api/lyricsApi";
import { songsApi } from "@/services/api/songApi";
import { getAuthToken } from "@/services/api";
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistTab, setPlaylistTab] = useState<"queue" | "suggested">("queue");
  const isPlayingRef = useRef(isPlaying);
  const cleanupCallbacks = useRef<(() => void)[]>([]);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const hasTriggeredEndedRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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
        const { streamUrl } = await songsApi.getStreamUrl(currentSong.id);
        const finalStreamUrl = streamUrl;
        
        if (!finalStreamUrl) {
          throw new Error("No stream URL available");
        }

        const finalStreamUrlAbsolute = finalStreamUrl.startsWith("http")
          ? finalStreamUrl
          : `${window.location.origin}${finalStreamUrl}`;

        console.log("Using backend proxy HLS URL:", finalStreamUrlAbsolute);

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
            xhrSetup: (xhr) => {
              xhr.withCredentials = true;
            },
          });
          
          hlsInstanceRef.current = hls; // Lưu reference để có thể stop khi cần

          hls.loadSource(finalStreamUrlAbsolute);
          hls.attachMedia(audio);
          
          // Lưu duration ban đầu để detect khi HLS loop
          let initialDuration = 0;
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
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
          
          // Listen for when HLS reaches end of stream và dừng load
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
                  setTimeout(() => playNext(), 1000);
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
            playNext();
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
        // Kiểm tra queue trước khi chuyển bài
        if (queue.length === 0) {
          console.warn("Queue is empty, cannot play next song");
          return;
        }
        playNext();
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
            if (queue.length === 0) {
              console.warn("Queue is empty, cannot auto-play next");
              return;
            }
            playNext();
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
            if (queue.length === 0) {
              console.warn("Queue is empty, cannot auto-play next");
              return;
            }
            playNext();
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
            setTimeout(() => playNext(), 1000);
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

  // Record listening history and increment play count when 30 seconds have been played
  useEffect(() => {
    if (!currentSong || hasReportedListen || !audioRef.current) return;

    const duration = audioRef.current.duration;

    // Only record if we have valid duration and currentTime has reached 30 seconds
    if (duration && !isNaN(duration) && currentTime >= 30 && currentTime > 0) {
      const songIdForApi = isNaN(Number(currentSong.id)) ? currentSong.id : Number(currentSong.id);
      console.log(`🎵 Recording listen: ${currentSong.songName || currentSong.name || "Unknown Song"} (ID: ${currentSong.id}, Coerced: ${songIdForApi}, Type: ${typeof songIdForApi}) (${Math.round(currentTime)}s / ${Math.round(duration)}s)`);

      // Record listening history
      listeningHistoryApi
        .recordListen({
          userId: 1, // TODO: Get from auth context
          songId: songIdForApi,
        })
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
    }
  }, [currentSong]);

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
                  onClick={() => {
                    console.log("Next clicked, queue length:", queue.length, "currentSong:", currentSong?.id);
                    console.log("Queue songs:", queue.map(s => ({ id: s.id, name: s.songName || s.name })));
                    playNext();
                  }}
                  disabled={queue.length === 0}
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

            {/* Tabs */}
            <div className="flex border-b border-border/40 bg-background/50">
              <button
                onClick={() => setPlaylistTab("queue")}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  playlistTab === "queue"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Đẩy vào ({queue.length})
              </button>
              <button
                onClick={() => setPlaylistTab("suggested")}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  playlistTab === "suggested"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Gợi ý
              </button>
            </div>

            {/* Playlist Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {playlistTab === "queue" ? (
                queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Music className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Danh sách phát trống</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Phát nhạc từ các trang như Trending để thêm vào danh sách
                    </p>
                  </div>
                ) : (
                  queue.map((song, index) => (
                    <div
                      key={song.id}
                      onClick={() => {
                        playSong(song);
                        setShowPlaylist(false);
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
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Music className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Chức năng gợi ý đang phát triển</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sẽ có các bài hát gợi ý dựa trên bài hát hiện tại
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;
