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
import { songsApi, arcApi } from "@/services/api";
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
    album?: {
      images?: Array<{ url?: string; width?: number; height?: number }>;
    };
  };
  deezer?: string;
  apple_music?: {
    url?: string;
    previews?: Array<{ url?: string }>;
    artwork?: {
      url?: string;
      width?: number;
      height?: number;
    };
  };
}

interface AuddResponse {
  status: string;
  result: AuddResult;
}

interface HummingResult {
  acrid: string;
  title?: string;
  score?: number;
  artists?: Array<{ name?: string }>;
  album?: string;
  releaseDate?: string;
  durationMs?: number;
  playOffsetMs?: number;
  matchedInSystem?: boolean;
  song?: {
    id: number;
    name: string;
    [key: string]: unknown;
  };
  youtubeVideoId?: string; // YouTube video ID để embed
}

interface AcrResponse {
  matched: boolean;
  song?: {
    id: number;
    name: string;
    audioUrl: string;
    artists?: Array<{ id: number; name: string }>;
    genres?: Array<{ id: number; name: string }>;
    duration?: string;
    playCount?: number;
    releaseYear?: number;
    urlImageAlbum?: string;
  };
  score?: number;
  acrid?: string;
  customFile?: Record<string, unknown>;
  musicMetadata?: Record<string, unknown>;
  hummingResults?: HummingResult[]; // Kết quả từ humming nếu không có custom_file
}

type RecognitionResult = AuddResponse | AcrResponse;

type RecognizeItem = {
  source: string;
  acrId?: string;
  title?: string;
  artist?: string;
  internal?: boolean;
  song?: any;
  youtubeVideoId?: string;
};

const MusicRecognitionResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [echoverseSong, setEchoverseSong] = useState<unknown>(null);
  const [isSearchingEchoverse, setIsSearchingEchoverse] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [hummingResultsWithYoutube, setHummingResultsWithYoutube] = useState<HummingResult[]>([]);
  const [isSearchingYouTube, setIsSearchingYouTube] = useState(false);
  const [listResults, setListResults] = useState<RecognizeItem[] | null>(null);

  // Detect if result is array from /songs/recognize
  const isListResponse = (val: unknown): val is RecognizeItem[] => Array.isArray(val);

  // Helper to check if result is ACR response
  const isAcrResponse = (res: RecognitionResult | null): res is AcrResponse => {
    return res !== null && 'matched' in res;
  };

  // Helper to check if result is AUDD response
  const isAuddResponse = (res: RecognitionResult | null): res is AuddResponse => {
    return res !== null && 'status' in res && 'result' in res;
  };

  useEffect(() => {
    if (location.state?.result) {
      const res = location.state.result;
      console.log("[MusicRecognitionResult] Received result:", res);
      if (isListResponse(res)) {
        console.log("[MusicRecognitionResult] Detected list response, length:", res.length);
        setListResults(res);
        setResult(null as any);
      } else {
        console.log("[MusicRecognitionResult] Detected single result response");
        setResult(res);
        setAudioUrl(location.state.audioUrl);
      }
      setEchoverseSong(null);
      setIsSearchingEchoverse(false);
      setAudioError(false);
    }
    setIsLoading(false);
  }, [location.state]);

  // Handle ACR response - if matched, use song from response directly
  // Handle AUDD response - search echoverse database
  useEffect(() => {
    const handleRecognitionResult = async () => {
      if (result && !isLoading) {
        if (isAcrResponse(result)) {
          // ACR response - if matched, song is already in response
          if (result.matched && result.song) {
            setEchoverseSong(result.song);
            setIsSearchingEchoverse(false);
          } else {
            // Not matched in DB, clear echoverse song
            setEchoverseSong(null);
            setIsSearchingEchoverse(false);
          }
        } else if (isAuddResponse(result)) {
          // AUDD response - search echoverse database
          const recognitionResult = result.result;
          console.log("Recognition result for echoverse search:", recognitionResult);
          
          if (recognitionResult && recognitionResult.title && recognitionResult.artist) {
            setEchoverseSong(null);
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
        }
      }
    };

    handleRecognitionResult();
  }, [result, isLoading]);

  // Search YouTube videos cho humming results
  useEffect(() => {
    const searchYouTubeForHummingResults = async () => {
      if (isAcrResponse(result) && result.hummingResults && result.hummingResults.length > 0) {
        setIsSearchingYouTube(true);
        const resultsWithYoutube = await Promise.all(
          result.hummingResults.map(async (item) => {
            // Nếu đã có youtubeVideoId, giữ nguyên
            if (item.youtubeVideoId) {
              return item;
            }

            // Tìm kiếm YouTube video
            const title = item.title || '';
            const artists = item.artists?.map(a => a.name).join(' ') || '';
            
            if (title) {
              try {
                const videoId = await arcApi.searchYouTubeVideo(title, artists);
                return {
                  ...item,
                  youtubeVideoId: videoId || undefined,
                };
              } catch (error) {
                console.error('[YouTube] Error searching for:', title, error);
                return item;
              }
            }
            
            return item;
          })
        );
        
        setHummingResultsWithYoutube(resultsWithYoutube);
        setIsSearchingYouTube(false);
      } else {
        setHummingResultsWithYoutube([]);
      }
    };

    if (result && !isLoading) {
      searchYouTubeForHummingResults();
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
      name: song.name,
      songName: song.name,
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

  if (!result && !listResults) {
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

  // Get recognition result based on response type
  const recognitionResult = isAuddResponse(result) ? result.result : null;
  const acrResult = isAcrResponse(result) ? result : null;
  
  const hasResult = (() => {
    if (isAuddResponse(result)) {
      return recognitionResult && Object.keys(recognitionResult).length > 0;
    }
    if (isAcrResponse(result)) {
      // Có kết quả nếu có song match HOẶC có humming results
      return (result.matched && result.song !== undefined) || 
             (result.hummingResults && result.hummingResults.length > 0);
    }
    return false;
  })();
  
  // Prefer provided albumart, then Apple Music artwork, then Spotify album images (for AUDD)
  // For ACR, use urlImageAlbum from song
  const artworkUrl = (() => {
    if (isAcrResponse(result) && result.song?.urlImageAlbum) {
      return result.song.urlImageAlbum;
    }
    if (!hasResult || !recognitionResult) return "";
    if (recognitionResult.albumart) return recognitionResult.albumart;
    const appleArtworkTemplate = recognitionResult.apple_music?.artwork?.url;
    if (appleArtworkTemplate) {
      return appleArtworkTemplate.replace("{w}", "512").replace("{h}", "512");
    }
    const spotifyImages = recognitionResult.spotify?.album?.images;
    if (spotifyImages && spotifyImages.length > 0) {
      const preferred = spotifyImages.find(img => img?.width === 300) || spotifyImages[0];
      return preferred?.url || "";
    }
    return "";
  })();

  // Render list results (internal/external)
  const renderListResults = () => {
    console.log("[MusicRecognitionResult] renderListResults called, listResults:", listResults);
    if (!listResults || listResults.length === 0) {
      console.log("[MusicRecognitionResult] No listResults to render");
      return null;
    }
    
    // Separate results by source
    const hummingResults = listResults.filter(item => item.source === 'humming');
    const musicResults = listResults.filter(item => item.source === 'music');
    const customFilesResults = listResults.filter(item => item.source === 'custom_files');
    const otherResults = listResults.filter(item => !['humming', 'music', 'custom_files'].includes(item.source || ''));
    
    // Determine title based on results
    const getResultsTitle = () => {
      if (customFilesResults.length > 0) {
        return `Recognition Results (${customFilesResults.length} found in system)`;
      }
      if (hummingResults.length > 0 && musicResults.length > 0) {
        return `Recognition Suggestions (${hummingResults.length} humming + ${musicResults.length} music)`;
      }
      if (hummingResults.length > 0) {
        return `Humming Recognition Results (${hummingResults.length} suggestions)`;
      }
      if (musicResults.length > 0) {
        return `Music Recognition Results (${musicResults.length} suggestions)`;
      }
      return `Recognition Suggestions (${listResults.length} results)`;
    };
    
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            {getResultsTitle()}
          </CardTitle>
          {hummingResults.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Không tìm thấy trong hệ thống. Dưới đây là các gợi ý từ Humming Recognition để bạn tham khảo.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {listResults.map((item, index) => {
              const isInternal = !!item.internal && !!item.song;
              const isHumming = item.source === 'humming';
              const isMusic = item.source === 'music';
              const isCustomFiles = item.source === 'custom_files';
              
              const title = isInternal ? item.song?.name : (item.title || '(No title)');
              const artists = isInternal
                ? (item.song?.artists || []).map((a: any) => a.name).join(', ')
                : (item.artist || 'Unknown Artist');
              return (
                <div key={item.acrId || index} className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-lg">{title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" />
                        {artists}
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {isInternal && (
                          <Badge variant="secondary" className="bg-green-600/15 text-green-600">
                            ✅ In System
                          </Badge>
                        )}
                        {isHumming && (
                          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/50">
                            🎵 Humming
                          </Badge>
                        )}
                        {isMusic && (
                          <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/50">
                            🎶 Music DB
                          </Badge>
                        )}
                        {isCustomFiles && (
                          <Badge variant="outline" className="bg-purple-500/15 text-purple-600 border-purple-500/50">
                            📁 Custom Files
                          </Badge>
                        )}
                        {!isInternal && (
                          <Badge variant="outline" className="text-xs">
                            External
                          </Badge>
                        )}
                        {item.acrId && (
                          <Badge variant="outline" className="text-xs">
                            ACR: {item.acrId.slice(0, 8)}…
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInternal ? (
                        <Button
                          onClick={() => {
                            const song = item.song;
                            const formatted: any = {
                              id: song.id,
                              name: song.name,
                              songName: song.name,
                              artist: (song.artists || []).map((a: any) => a.name).join(', '),
                              album: typeof song.album === 'object' && song.album ? (song.album as { name: string }).name : 'Unknown',
                              duration: song.duration || 0,
                              cover: song.urlImageAlbum || '',
                              genre: (song.genres || [])[0]?.name || 'Unknown',
                              plays: song.playCount || 0,
                              audio: song.audioUrl,
                              audioUrl: song.audioUrl,
                            };
                            setQueue([formatted]);
                            playSong(formatted);
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Play className="w-4 h-4 mr-2" /> Play
                        </Button>
                      ) : item.youtubeVideoId ? (
                        <Button
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${item.youtubeVideoId}`, '_blank', 'noopener,noreferrer')}
                          variant="outline"
                          className="bg-[#FF0000] hover:bg-[#ff3333] text-white border-0"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Open YouTube
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {/* YouTube Embed if available */}
                  {item.youtubeVideoId && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-red-600"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        YouTube Music Video
                      </h5>
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          src={`https://www.youtube.com/embed/${item.youtubeVideoId}?rel=0`}
                          title={`${title} - ${artists} - YouTube`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isLoading && listResults && listResults.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <h1 className="text-3xl font-bold text-foreground">Recognition Results</h1>
            </div>
            {renderListResults()}
            <div className="mt-6">
              <Button onClick={() => navigate('/music-recognition')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Music Recognition
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Recognition Results
            </h1>
          </div>

          {/* Status */}
          <div className="mb-6">
            {(() => {
              if (isAcrResponse(result)) {
                if (result.matched && result.song) {
                  return (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200 flex items-center justify-between">
                        <span>Kết quả từ Audio Fingerprint - Music successfully recognized!</span>
                        {result.score !== undefined && (
                          <Badge variant="secondary" className="ml-2">
                            Score: {result.score}/100
                          </Badge>
                        )}
                      </AlertDescription>
                    </Alert>
                  );
                } else if (result.hummingResults && result.hummingResults.length > 0) {
                  return (
                    <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        Không tìm thấy trong hệ thống. Hiển thị {result.hummingResults.length} kết quả từ Humming để tham khảo.
                      </AlertDescription>
                    </Alert>
                  );
                } else {
                  return (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Song not found in database. {result.score !== undefined && `Match score: ${result.score}/100`}
                      </AlertDescription>
                    </Alert>
                  );
                }
              } else if (isAuddResponse(result)) {
                if (result.status === "success" && hasResult) {
                  return (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Music successfully recognized!
                      </AlertDescription>
                    </Alert>
                  );
                } else {
                  return (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {hasResult ? `Recognition failed. Status: ${result.status}` : "No song was recognized. Please try again with a different audio file."}
                      </AlertDescription>
                    </Alert>
                  );
                }
              }
              return null;
            })()}
          </div>

          {/* Results */}
          {hasResult ? (
            <div className="space-y-6">
              {/* Main Result Card - chỉ hiển thị nếu có song match (custom_file) hoặc AUDD result */}
              {(() => {
                if (isAcrResponse(result) && !result.song && result.hummingResults) {
                  // Chỉ có humming results, không hiển thị main card
                  return null;
                }
                return (
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
                        {artworkUrl ? (
                          <img
                            src={artworkUrl}
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
                          {(() => {
                            if (isAcrResponse(result) && result.song) {
                              return result.song.name || "Unknown Title";
                            }
                            return recognitionResult?.title || "Unknown Title";
                          })()}
                        </h2>
                        <p className="text-lg text-muted-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {(() => {
                            if (isAcrResponse(result) && result.song?.artists) {
                              return result.song.artists.map(a => a.name).join(", ") || "Unknown Artist";
                            }
                            return recognitionResult?.artist || "Unknown Artist";
                          })()}
                        </p>
                      </div>

                      {(() => {
                        if (isAcrResponse(result) && result.song) {
                          // ACR song info
                          return (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {result.song.releaseYear && (
                                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {result.song.releaseYear}
                                  </Badge>
                                )}
                                {result.song.duration && (
                                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {result.song.duration}
                                  </Badge>
                                )}
                                {result.song.genres && result.song.genres.length > 0 && (
                                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                    {result.song.genres.map(g => g.name).join(", ")}
                                  </Badge>
                                )}
                                {result.score !== undefined && (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    Score: {result.score}/100
                                  </Badge>
                                )}
                              </div>
                            </>
                          );
                        }
                        // AUDD song info
                        return (
                          <>
                            {recognitionResult?.album && (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                  Album: {recognitionResult.album}
                                </Badge>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {recognitionResult?.release_date && (
                                <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {recognitionResult.release_date}
                                </Badge>
                              )}
                              {recognitionResult?.timecode && (
                                <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTimecode(recognitionResult.timecode)}
                                </Badge>
                              )}
                              {recognitionResult?.label && (
                                <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                  Label: {recognitionResult.label}
                                </Badge>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Streaming Links */}
          <div className="space-y-4">
  <h3 className="text-lg font-semibold text-foreground">Listen on:</h3>
  <div className="flex flex-wrap gap-3">
    {(() => {
      // Handle AUDD response
      if (isAuddResponse(result) && recognitionResult) {
        return (
          <>
            {recognitionResult.spotify?.external_urls?.spotify && (
              <Button
                onClick={() => openExternalLink(recognitionResult.spotify!.external_urls!.spotify!)}
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
                onClick={() => openExternalLink(recognitionResult.apple_music!.url!)}
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
          </>
        );
      }
      
      // Handle ACR response - extract from musicMetadata.external_metadata
      if (isAcrResponse(result) && result.musicMetadata) {
        const metadata = result.musicMetadata as Record<string, any>;
        const externalMetadata = metadata.external_metadata as Record<string, any> | undefined;
        
        return (
          <>
            {externalMetadata?.spotify?.track?.id && (
              <Button
                onClick={() => openExternalLink(`https://open.spotify.com/track/${externalMetadata.spotify.track.id}`)}
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

            {externalMetadata?.deezer?.track?.id && (
              <Button
                onClick={() => openExternalLink(`https://www.deezer.com/track/${externalMetadata.deezer.track.id}`)}
                variant="outline"
                className="bg-[#EF5466] hover:bg-[#ff6b80] text-white border-0 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Deezer
              </Button>
            )}

            {externalMetadata?.youtube?.vid && (
              <Button
                onClick={() => openExternalLink(`https://www.youtube.com/watch?v=${externalMetadata.youtube.vid}`)}
                variant="outline"
                className="bg-[#FF0000] hover:bg-[#ff3333] text-white border-0 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                YouTube
              </Button>
            )}
          </>
        );
      }
      
      return null;
    })()}

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

                  {/* Audio Preview - chỉ hiển thị nếu có song match (custom_file) */}
                  {isAcrResponse(result) && result.song && audioUrl && !audioError && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">Original Audio:</h3>
                      <audio
                        controls
                        className="w-full"
                        src={audioUrl}
                        onError={() => setAudioError(true)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                  {audioUrl && audioError && (
                    <Alert className="bg-muted border-border">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-muted-foreground">
                        Không phát được "Original Audio" từ file bạn tải lên. Vui lòng thử lại.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
                );
              })()}

              {/* Hiển thị Humming Results nếu không có song match */}
              {isAcrResponse(result) && !result.song && result.hummingResults && result.hummingResults.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground flex items-center gap-2">
                      <Headphones className="w-5 h-5" />
                      Kết quả từ Humming ({result.hummingResults.length} kết quả)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Không tìm thấy bài hát trong hệ thống. Dưới đây là các gợi ý để bạn tham khảo và tự tìm kiếm:
                    </p>
                    {isSearchingYouTube && (
                      <Alert className="bg-muted border-border mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-muted-foreground">
                          Đang tìm kiếm YouTube videos...
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-4">
                      {(hummingResultsWithYoutube.length > 0 ? hummingResultsWithYoutube : result.hummingResults).map((item, index) => {
                        const formatDuration = (ms?: number): string => {
                          if (!ms) return 'N/A';
                          const seconds = Math.floor(ms / 1000);
                          const minutes = Math.floor(seconds / 60);
                          const remainingSeconds = seconds % 60;
                          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                        };

                        const formatScore = (score?: number): string => {
                          if (score === undefined || score === null) return 'N/A';
                          return (score * 100).toFixed(1) + '%';
                        };

                        return (
                          <div
                            key={item.acrid || index}
                            className="p-4 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground text-lg mb-1">
                                  {item.title || '(No title)'}
                                </h4>
                                {item.artists && item.artists.length > 0 && (
                                  <p className="text-muted-foreground text-sm mb-1">
                                    <strong>Artists:</strong> {item.artists.map(a => a.name).filter(Boolean).join(', ') || 'Unknown'}
                                  </p>
                                )}
                                {item.album && (
                                  <p className="text-muted-foreground text-sm">
                                    <strong>Album:</strong> {item.album}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <div className={`text-xl font-bold ${item.score && item.score > 0.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {formatScore(item.score)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Score: {item.score?.toFixed(3) || 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                              {item.durationMs && (
                                <div>
                                  <strong>Duration:</strong> {formatDuration(item.durationMs)}
                                </div>
                              )}
                              {item.playOffsetMs && (
                                <div>
                                  <strong>Play Offset:</strong> {formatDuration(item.playOffsetMs)}
                                </div>
                              )}
                              {item.releaseDate && (
                                <div>
                                  <strong>Release Date:</strong> {item.releaseDate}
                                </div>
                              )}
                            </div>
                            {item.matchedInSystem && item.song && (
                              <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                <strong className="text-green-800 dark:text-green-200">✅ Có trong hệ thống:</strong>
                                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                                  Song ID: {item.song.id} - {item.song.name}
                                </div>
                              </div>
                            )}
                            
                            {/* YouTube Video Embed */}
                            {item.youtubeVideoId && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <h5 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 text-red-600"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                  YouTube Music Video
                                </h5>
                                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                  <iframe
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                    src={`https://www.youtube.com/embed/${item.youtubeVideoId}?rel=0`}
                                    title={`${item.title || 'Music Video'} - YouTube`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
              
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

