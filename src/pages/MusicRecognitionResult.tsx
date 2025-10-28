import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft,
  Play,
  Music,
  User,
  Calendar,
  ExternalLink,
  Apple,
  AlertCircle,
  CheckCircle,
  Clock,
  Headphones
} from "lucide-react";
import { songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";

interface AuddResult {
  artist?: string;
  title?: string;
  album?: string;
  release_date?: string;
  label?: string;
  timecode?: string;
  song_link?: string;
  albumart?: string;
  spotify?: { 
    url?: string;
    external_urls?: { spotify?: string };
    album?: Record<string, unknown>;
  };
  deezer?: string;
  apple_music?: {
    url?: string;
    previews?: Array<{ url?: string }>;
  };
}

interface AuddResponse {
  status: string;
  result: AuddResult;
}

const MusicRecognitionResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [result, setResult] = useState<AuddResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [echoverseSong, setEchoverseSong] = useState<unknown>(null);
  const [isSearchingEchoverse, setIsSearchingEchoverse] = useState(false);

  useEffect(() => {
    if (location.state?.result) {
      setResult(location.state.result);
      setAudioUrl(location.state.audioUrl);
    }
    setIsLoading(false);
  }, [location.state]);

  // Search for song in echoverse database when recognition is successful
  useEffect(() => {
    const searchEchoverseDatabase = async () => {
      const recognitionResult = result?.result; // AUDD trả về object, không phải array
      console.log("Recognition result for echoverse search:", recognitionResult);
      
      if (recognitionResult && recognitionResult.title && recognitionResult.artist) {
        setIsSearchingEchoverse(true);
        try {
          console.log("Searching echoverse for:", recognitionResult.title, "by", recognitionResult.artist);
          const songs = await songsApi.findByTitleAndArtist(
            recognitionResult.title,
            recognitionResult.artist
          );
          console.log("Found echoverse songs:", songs);
          if (songs && songs.length > 0) {
            setEchoverseSong(songs[0]);
            console.log("Set echoverse song:", songs[0]);
          }
        } catch (error) {
          console.error("Error searching echoverse database:", error);
        } finally {
          setIsSearchingEchoverse(false);
        }
      }
    };

    if (result && !isLoading) {
      searchEchoverseDatabase();
    }
  }, [result, isLoading]);

  const handleBackToRecognition = () => {
    navigate('/music-recognition');
  };

  const formatTimecode = (timecode: string) => {
    const seconds = parseInt(timecode);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePlayOnEchoverse = () => {
    if (!echoverseSong) return;
    
    const song = echoverseSong as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedSong: any = {
      id: song.id,
      title: song.name,
      artist: (song.artists as Array<{ name: string }>)?.map((a) => a.name).join(", ") || "Unknown",
      album: typeof song.album === 'object' && song.album ? (song.album as { name: string }).name : "Unknown",
      duration: song.duration || 0,
      cover: song.urlImageAlbum || "",
      genre: (song.genres as Array<{ name: string }>)?.[0]?.name || "Unknown",
      plays: song.playCount || 0,
      audio: song.audioUrl,
      audioUrl: song.audioUrl,
    };

    setQueue([formattedSong]);
    playSong(formattedSong);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No recognition results found. Please try again.
              </AlertDescription>
            </Alert>
            <Button onClick={handleBackToRecognition} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Music Recognition
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const recognitionResult = result.result; // AUDD trả về object, không phải array
  const hasResult = recognitionResult && Object.keys(recognitionResult).length > 0;

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              onClick={handleBackToRecognition}
              variant="outline"
              className="bg-muted border-border hover:bg-muted/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Recognition Results
            </h1>
          </div>

          {/* Status */}
          <div className="mb-6">
            {result.status === "success" && hasResult ? (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Music successfully recognized!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {hasResult ? `Recognition failed. Status: ${result.status}` : "No song was recognized. Please try again with a different audio file."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Results */}
          {hasResult ? (
            <div className="space-y-6">
              {/* Main Result Card */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                    <Music className="w-6 h-6" />
                    Song Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Song Details */}
                  <div className="flex gap-6">
                    {/* Album Art */}
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {recognitionResult.albumart ? (
                          <img
                            src={recognitionResult.albumart}
                            alt="Album Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {recognitionResult.title || "Unknown Title"}
                        </h2>
                        <p className="text-lg text-muted-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {recognitionResult.artist || "Unknown Artist"}
                        </p>
                      </div>

                      {recognitionResult.album && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            Album: {recognitionResult.album}
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {recognitionResult.release_date && (
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {recognitionResult.release_date}
                          </Badge>
                        )}
                        
                        {recognitionResult.timecode && (
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimecode(recognitionResult.timecode)}
                          </Badge>
                        )}

                        {recognitionResult.label && (
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                            Label: {recognitionResult.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Streaming Links */}
          <div className="space-y-4">
  <h3 className="text-lg font-semibold text-foreground">Listen on:</h3>
  <div className="flex flex-wrap gap-3">

    {recognitionResult.spotify?.external_urls?.spotify && (
      <Button
        onClick={() => openExternalLink(recognitionResult.spotify.external_urls.spotify!)}
        className="bg-[#1DB954] hover:bg-[#1ed760] text-white border-0 flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0C5.373 0 0 5.372 0 12c0 6.627 5.373 12 12 12s12-5.373 
          12-12C24 5.372 18.627 0 12 0zM17.59 17.74a.747.747 0 0 
          1-1.03.24c-2.82-1.73-6.37-2.12-10.56-1.17a.75.75 0 1 
          1-.33-1.46c4.47-1.03 8.34-.59 11.42 1.27.36.22.47.69.24 
          1.02z" />
        </svg>
        Spotify
      </Button>
    )}

    {recognitionResult.apple_music?.url && (
      <Button
        onClick={() => openExternalLink(recognitionResult.apple_music.url!)}
        variant="outline"
        className="bg-[#FA243C] hover:bg-[#ff3b4f] text-white border-0 flex items-center gap-2"
      >
        <Apple className="w-4 h-4" />
        Apple Music
      </Button>
    )}

    {recognitionResult.deezer && (
      <Button
        onClick={() => openExternalLink(recognitionResult.deezer!)}
        variant="outline"
        className="bg-[#EF5466] hover:bg-[#ff6b80] text-white border-0 flex items-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Deezer
      </Button>
    )}

    {recognitionResult.song_link && (
      <Button
        onClick={() => openExternalLink(recognitionResult.song_link!)}
        variant="outline"
        className="bg-muted border-border hover:bg-muted/80 flex items-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        More Info
      </Button>
    )}

    {/* Echoverse Play Button - Highlighted */}
    {echoverseSong && (
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Headphones className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Có sẵn trên Echoverse!</p>
              <p className="text-sm text-muted-foreground">Nghe ngay trên nền tảng của chúng tôi</p>
            </div>
          </div>
          <Button
            onClick={handlePlayOnEchoverse}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6 py-2 font-semibold"
          >
            <Play className="w-5 h-5" />
            Play Now
          </Button>
        </div>
      </div>
    )}
  </div>
  
  {/* Search status indicator */}
  {isSearchingEchoverse && (
    <Alert className="bg-muted border-border">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-muted-foreground">
        Đang tìm kiếm bài hát trên nền tảng Echoverse...
      </AlertDescription>
    </Alert>
  )}
</div>

                  {/* Audio Preview */}
                  {audioUrl && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">Original Audio:</h3>
                      <audio controls className="w-full">
                        <source src={audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Try Again */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Want to identify another song?
                    </h3>
                    <Button onClick={handleBackToRecognition} className="bg-primary hover:bg-primary/90">
                      <Play className="w-4 h-4 mr-2" />
                      Recognize Another Song
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-6">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Không nhận diện được bài hát
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Chúng tôi không tìm thấy bài hát khớp với audio bạn cung cấp. Vui lòng thử lại với file audio rõ ràng hơn hoặc bài hát khác.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={handleBackToRecognition} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Thử lại
                    </Button>
                    <Button 
                      onClick={() => navigate('/discover')} 
                      variant="outline"
                      className="bg-muted border-border hover:bg-muted/80"
                    >
                      Khám phá nhạc mới
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicRecognitionResult;

