import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Music
} from "lucide-react";
import { arcApi } from "@/services/api";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrlPreview) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(audioUrlPreview);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
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
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Music Recognition</h1>
            <p className="text-muted-foreground text-lg">
              Upload an audio file or record music to identify the song
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Identify Music</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">

              {/* Upload */}
              <div className="space-y-2">
                <Label htmlFor="audio-file">Upload Audio File</Label>
                <div className="flex items-center gap-4">
                  <Input id="audio-file" type="file" accept="audio/*" onChange={handleFileUpload} />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Record */}
              <div className="space-y-4">
                <Label>Record Audio</Label>
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <Button onClick={startRecording} variant="outline">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}

                  {audioUrlPreview && (
                    <div className="flex items-center gap-2">
                      {!isPlaying ? (
                        <Button onClick={playAudio} variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button onClick={pauseAudio} variant="outline" size="sm">
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {isRecording ? "Recording..." : "Preview"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="audio-url">Or enter audio URL</Label>
                <Input
                  id="audio-url"
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                />
              </div>

              {/* Action */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRecognize}
                  disabled={isLoading || isCheckingLimit || !audioUrl}
                  className="flex-1 bg-primary text-primary-foreground"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recognizing...
                    </>
                  ) : (
                    <>
                      Recognize Music
                      {!canUse && <span className="ml-2 text-xs opacity-75">(Limit reached)</span>}
                    </>
                  )}
                </Button>

              </div>

              {audioUrlPreview && <audio ref={audioRef} src={audioUrlPreview} controls className="w-full" />}

            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="mt-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <p>1. Upload or record audio</p>
              <p>2. Preview before submitting</p>
              <p>3. Click “Recognize Music”</p>
              <p>4. View song details</p>
            </CardContent>
          </Card>
        </div>
      </div>

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
