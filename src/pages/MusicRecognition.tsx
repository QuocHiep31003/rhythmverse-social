import { useState, useRef, useEffect } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Loader2,
  AlertCircle,
  Music,
  Search
} from "lucide-react";
import { arcApi } from "@/services/api";
import FeaturedMusic from "@/components/FeaturedMusic";
import Footer from "@/components/Footer";
import { useMusic } from "@/contexts/MusicContext";

/* --- Feature Limit Hook (KEEP THIS) --- */
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureLimitType, FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";

const MusicRecognition = () => {
  const navigate = useNavigate();
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrlPreview, setAudioUrlPreview] = useState<string>("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTimes, setAudioTimes] = useState({ current: "00:00", duration: "00:00" });
  const [wasGlobalPlayingBeforePreview, setWasGlobalPlayingBeforePreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { isPlaying: isGlobalPlaying, togglePlay: toggleGlobalPlay } = useMusic();

  /* --- Feature Limit Logic --- */
  const {
    canUse,
    remaining,
    limit,
    limitType,
    checkUsage,
    isLoading: isCheckingLimit,
  } = useFeatureLimit({
    featureName: FeatureName.AI_SEARCH,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioUrlPreview(url);
      setAudioBlob(file);
      setError("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioUrlPreview(url);
        setError("");
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return "00:00";
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      if (!audioElement.duration) return;
      setAudioProgress((audioElement.currentTime / audioElement.duration) * 100);
      setAudioTimes((prev) => ({
        ...prev,
        current: formatTime(audioElement.currentTime),
      }));
    };

    const handleLoadedMetadata = () => {
      setAudioProgress(0);
      setAudioTimes({
        current: "00:00",
        duration: formatTime(audioElement.duration),
      });
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
      setAudioTimes((prev) => ({
        ...prev,
        current: "00:00",
      }));

      // Khi preview kết thúc, nếu trước đó music player đang phát thì phát lại
      if (wasGlobalPlayingBeforePreview) {
        // Không cần await trong event listener
        toggleGlobalPlay().catch(() => {});
        setWasGlobalPlayingBeforePreview(false);
      }
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioElement.addEventListener("ended", handleEnded);

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("ended", handleEnded);
    };
  }, [audioUrlPreview, toggleGlobalPlay, wasGlobalPlayingBeforePreview]);

  useEffect(() => {
    if (!audioUrlPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (audioUrlPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioProgress(0);
      setAudioTimes({ current: "00:00", duration: "00:00" });
      setIsPlaying(false);
    }
  }, [audioUrlPreview]);

  useEffect(() => {
    if (isRecording && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isRecording]);

  const pauseGlobalIfNeeded = async () => {
    if (isGlobalPlaying) {
      try {
        await toggleGlobalPlay();
        setWasGlobalPlayingBeforePreview(true);
      } catch (err) {
        console.error("Unable to pause global music player", err);
      }
    }
  };

  const resumeGlobalIfNeeded = async () => {
    if (wasGlobalPlayingBeforePreview) {
      try {
        await toggleGlobalPlay();
      } catch (err) {
        console.error("Unable to resume global music player", err);
      } finally {
        setWasGlobalPlayingBeforePreview(false);
      }
    }
  };

  const playAudio = async () => {
    const player = audioRef.current;
    if (!player) return;
    try {
      // Tạm dừng global music player nếu đang phát
      await pauseGlobalIfNeeded();
      await player.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Unable to play audio preview", err);
    }
  };

  const pauseAudio = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    // Khi dừng preview, phát lại nhạc nếu trước đó đang phát
    await resumeGlobalIfNeeded();
  };

  const stopAudioPlayback = async () => {
    const player = audioRef.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioTimes((prev) => ({
      ...prev,
      current: "00:00",
    }));

    // Khi stop preview, phát lại nhạc nếu trước đó đang phát
    await resumeGlobalIfNeeded();
  };

  const handleSeekOnPreview = (event: MouseEvent<HTMLDivElement>) => {
    const player = audioRef.current;
    if (!player || !player.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    player.currentTime = ratio * player.duration;
    setAudioProgress(ratio * 100);
  };

  const handleRecognize = async () => {
    if (!audioBlob) {
      setError("Please record or upload an audio file first.");
      return;
    }

    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await arcApi.recognizeMusic(audioBlob);
      await checkUsage();

      const normalizeAcrResponse = (data: unknown) => {
        if (Array.isArray(data) || !data || typeof data !== "object") return data;
        if ("matched" in (data as Record<string, unknown>) || "result" in (data as Record<string, unknown>)) {
          return data;
        }

        const metadata = (data as any).metadata;
        const musicList = metadata?.music;

        if (Array.isArray(musicList) && musicList.length > 0) {
          const first = musicList[0];
          return {
            matched: false,
            score: typeof first.score === "number" ? Math.round(first.score) : undefined,
            acrid: first.acrid,
            musicMetadata: first,
          };
        }
        return data;
      };

      const normalizedResult = normalizeAcrResponse(result);

      navigate("/music-recognition-result", {
        state: { result: normalizedResult, audioUrl: audioUrlPreview },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || err?.message?.toLowerCase?.().includes("limit")) {
        setShowLimitModal(true);
        await checkUsage();
      } else {
        setError(err instanceof Error ? err.message : "Failed to recognize music.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Space Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                            radial-gradient(2px 2px at 60% 70%, rgba(255,255,255,0.8), transparent),
                            radial-gradient(1px 1px at 50% 50%, white, transparent),
                            radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.6), transparent),
                            radial-gradient(2px 2px at 90% 40%, rgba(255,255,255,0.4), transparent),
                            radial-gradient(1px 1px at 33% 60%, white, transparent),
                            radial-gradient(1px 1px at 55% 80%, rgba(255,255,255,0.6), transparent)`,
          backgroundSize: '200% 200%',
          animation: 'twinkle 20s linear infinite',
        }} />
        {/* Space Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-pink-900/20" />
        {/* Nebula Effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Title with space theme - At the top */}
      <div className="container mx-auto px-6 pt-12 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
            EchoVerse Recognition
          </h1>
          <p className="text-xl text-muted-foreground/80">
            Discover music across the universe of sound
          </p>
        </div>
      </div>

      {/* 3 Feature Cards - At the top */}
      <FeaturedMusic showOnlyFeatures compact />

      {/* Recognition Form - In the middle - Integrated with page */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Upload - Space themed drag & drop area */}
                <div className="space-y-3">
                  <Label htmlFor="audio-file" className="text-foreground/90 text-lg font-semibold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Upload Audio File
                  </Label>
                  <div 
                    className="relative group h-full"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('audio/')) {
                        const url = URL.createObjectURL(file);
                        setAudioUrl(url);
                        setAudioUrlPreview(url);
                        setAudioBlob(file);
                        setError("");
                      }
                    }}
                  >
                    <div className="relative border-2 border-dashed border-primary/30 rounded-2xl p-8 h-full bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 backdrop-blur-sm hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/10 hover:via-purple-500/10 hover:to-pink-500/10 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                      <div className="flex flex-col items-center justify-center gap-4 h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                        <div>
                        <p className="text-foreground font-medium mb-1">Drag & drop or browse for an audio file</p>
                        <p className="text-sm text-muted-foreground">Supports MP3, WAV, M4A and more</p>
                        </div>
                        <Input 
                          id="audio-file" 
                          type="file" 
                          accept="audio/*" 
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Record - Space themed */}
                <div className="space-y-3">
                  <Label className="text-foreground/90 text-lg font-semibold flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary" />
                    Record Audio
                  </Label>
                  <div
                    className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 p-8 h-full"
                    // Cho phép tap vào toàn bộ khu vực để dừng khi đang ghi
                    onClick={isRecording ? () => stopRecording() : undefined}
                  >
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      {isRecording && (
                        <>
                          <span className="absolute inset-0 rounded-full border border-red-400/60 animate-ping" />
                          <span className="absolute inset-0 rounded-full border border-red-500/40 animate-[ping_2s_linear_infinite] delay-200" />
                        </>
                      )}
                      <Button
                        onClick={(e) => {
                          // Tránh việc onClick của container phía ngoài cũng được gọi
                          e.stopPropagation();
                          if (isRecording) {
                            stopRecording();
                          } else {
                            startRecording();
                          }
                        }}
                        size="icon"
                        variant={isRecording ? "destructive" : "ghost"}
                        className={`h-28 w-28 rounded-full text-white text-sm font-semibold shadow-xl transition-all duration-300 ${isRecording
                          ? "bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 shadow-red-500/40"
                          : "bg-gradient-to-br from-primary via-purple-600 to-pink-600 hover:scale-105 hover:shadow-primary/40 border border-white/10"
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-8 h-8" />
                        ) : (
                          <Mic className="w-8 h-8" />
                        )}
                      </Button>
                    </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {isRecording ? "Recording in progress... tap to stop" : "Tap to start recording the melody you remember"}
                      </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {audioUrlPreview ? (
                <div className="rounded-2xl bg-gradient-to-r from-primary/15 via-purple-500/15 to-pink-500/15 p-6 border border-primary/30 backdrop-blur shadow-lg shadow-primary/10">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground/80">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Audio Preview
                    </span>
                    <span>
                      {audioTimes.current} / {audioTimes.duration}
                    </span>
                  </div>

                  <div
                    className="relative h-2 mt-4 rounded-full bg-white/15 overflow-hidden cursor-pointer group"
                    onClick={handleSeekOnPreview}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-primary/50 transition-transform duration-200 group-hover:scale-125"
                      style={{ left: `calc(${audioProgress}% - 6px)` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <Button
                      onClick={isPlaying ? pauseAudio : playAudio}
                      variant="secondary"
                      size="sm"
                      className="gap-2 bg-white/15 border border-white/30 text-white hover:bg-white/25"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? "Pause" : "Play preview"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-dashed border-white/40 text-white/80 hover:text-white hover:border-white/70"
                      onClick={() => {
                        setAudioUrlPreview("");
                        setAudioBlob(null);
                        setAudioUrl("");
                        setAudioProgress(0);
                        setAudioTimes({ current: "00:00", duration: "00:00" });
                      }}
                    >
                      <MicOff className="w-4 h-4" />
                      Record again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-white/80 hover:text-white hover:bg-white/10"
                      onClick={stopAudioPlayback}
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </div>

                  <audio ref={audioRef} src={audioUrlPreview} preload="metadata" className="hidden" />
                </div>
              ) : (
                 <div className="rounded-2xl border border-dashed border-primary/30 bg-background/60 p-6 text-center text-muted-foreground/80">
                   <p className="text-sm font-medium mb-1">No preview yet</p>
                   <p className="text-xs">Upload a file or record audio to see the preview player</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action */}
              <div className="flex justify-center">
                <Button
                  onClick={handleRecognize}
                  disabled={isLoading || isCheckingLimit || !audioBlob}
                  className="w-full max-w-md bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning Universe...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Recognize Music
                      {!canUse && <span className="ml-2 text-xs opacity-75">(Limit reached)</span>}
                    </>
                  )}
                </Button>
              </div>

          </div>
        </div>
      </div>

      {/* Stats - At the bottom */}
      <FeaturedMusic showOnlyStats={true} />

      {/* Footer */}
      <Footer />

      {/* Limit Modal */}
      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.AI_SEARCH}
        featureDisplayName="AI Search"
        remaining={remaining}
        limit={typeof limit === "number" ? limit : undefined}
        limitType={limitType}
        isPremium={limitType === FeatureLimitType.UNLIMITED}
        canUse={canUse}
        onRefresh={checkUsage}
      />
    </div>
  );
};

export default MusicRecognition;
