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

  // Feature limit hook for AI Search
  const {
    canUse,
    remaining,
    limit,
    limitType,
    useFeature,
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
        
        // Stop all tracks
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

  // Check feature limit - dùng canUse từ backend (backend đã xử lý tất cả logic)
  if (!canUse) {
    setShowLimitModal(true);
    return;
  }

  setIsLoading(true);
  setError("");

  try {
    const success = await useFeature();
    if (!success) {
      setShowLimitModal(true);
      setIsLoading(false);
      return;
    }

    const result = await arcApi.recognizeMusic(audioBlob);

    // Check if result is valid and has actual data
    if (!result || !result.result || result.result.length === 0) {
      // Navigate to result page with no-result flag
      navigate("/music-recognition-result", {
        state: { 
          result: { 
            status: "success", 
            result: [] 
          }, 
          audioUrl: audioUrlPreview 
        },
      });
      return;
    }

    navigate("/music-recognition-result", {
      state: { result, audioUrl: audioUrlPreview },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to recognize music. Please try again.";
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Music Recognition
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload an audio file or record music to identify the song
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Identify Music</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="audio-file" className="text-foreground">
                  Upload Audio File
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="audio-file"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="bg-muted border-border text-foreground"
                  />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Recording Section */}
              <div className="space-y-4">
                <Label className="text-foreground">Record Audio</Label>
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      variant="outline"
                      className="bg-muted border-border hover:bg-muted/80"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  
                  {audioUrlPreview && (
                    <div className="flex items-center gap-2">
                      {!isPlaying ? (
                        <Button
                          onClick={playAudio}
                          variant="outline"
                          size="sm"
                          className="bg-muted border-border hover:bg-muted/80"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseAudio}
                          variant="outline"
                          size="sm"
                          className="bg-muted border-border hover:bg-muted/80"
                        >
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

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* URL Input (Alternative method) */}
              <div className="space-y-2">
                <Label htmlFor="audio-url" className="text-foreground">
                  Or enter audio URL
                </Label>
                <Input
                  id="audio-url"
                  type="url"
                  placeholder="https://example.com/audio.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRecognize}
                  disabled={isLoading || isCheckingLimit || !audioUrl}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recognizing...
                    </>
                  ) : isCheckingLimit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Recognize Music
                      {!canUse && (
                        <span className="ml-2 text-xs opacity-75">(Limit reached)</span>
                      )}
                    </>
                  )}
                </Button>
                
                {/* Demo Spotify Button */}
                <Button
                  onClick={() => window.open('https://open.spotify.com', '_blank')}
                  variant="outline"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  size="lg"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Spotify
                </Button>
              </div>

              {/* Audio Element for Preview */}
              {audioUrlPreview && (
                <audio
                  ref={audioRef}
                  src={audioUrlPreview}
                  controls
                  className="w-full"
                />
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="mt-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <p>1. Upload an audio file (MP3, WAV, etc.) or record audio directly</p>
              <p>2. Preview the audio to make sure it's clear</p>
              <p>3. Click "Recognize Music" to identify the song</p>
              <p>4. View the results with song details and streaming links</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.AI_SEARCH}
        featureDisplayName="AI Search"
        remaining={remaining}
        limit={typeof limit === "number" ? limit : undefined}
        isPremium={limitType === FeatureLimitType.UNLIMITED}
      />
    </div>
  );
};

export default MusicRecognition;
