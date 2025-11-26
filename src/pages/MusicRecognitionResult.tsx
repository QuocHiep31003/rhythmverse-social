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
import { searchYouTubeMusicVideoId } from "@/services/ytmusic";
import { useMusic } from "@/contexts/MusicContext";
import type { Song as PlayerSong } from "@/contexts/MusicContext";

interface AcrExternalMetadata {
  spotify?: {
    track?: {
      id?: string;
      url?: string;
      link?: string;
      href?: string;
      external_urls?: { spotify?: string };
    };
    album?: { images?: Array<{ url?: string }> };
  };
  deezer?: {
    track?: { id?: string; link?: string; share?: string; url?: string };
  };
  youtube?: {
    vid?: string;
    url?: string;
  };
  apple_music?: {
    url?: string;
    href?: string;
    preview_url?: string;
    [territory: string]: unknown;
  };
}

interface AcrMusicMetadata {
  title?: string;
  artist?: string;
  artists?: Array<{ name?: string }>;
  album?: { name?: string };
  release_date?: string;
  label?: string;
  song_link?: string;
  duration_ms?: number;
  play_offset_ms?: number;
  albumart?: string;
  external_metadata?: AcrExternalMetadata;
  external_ids?: {
    isrc?: string;
    upc?: string;
  };
  score?: number;
  apple_music?: {
    artwork?: {
      url?: string;
    };
  };
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
    artists?: Array<{ id: number; name: string }> | string;
    genres?: Array<{ id: number; name: string }>;
    duration?: string | number;
    playCount?: number;
    releaseYear?: number;
    urlImageAlbum?: string;
    album?: { name?: string } | string;
  };
  score?: number;
  acrid?: string;
  customFile?: Record<string, unknown>;
  musicMetadata?: AcrMusicMetadata | Record<string, unknown>;
  hummingResults?: HummingResult[]; // Kết quả từ humming nếu không có custom_file
  acrResult?: {
    metadata?: {
      music?: AcrMusicMetadata[];
    };
  };
}

type RecognitionResult = AcrResponse;

type StreamingService = "spotify" | "deezer" | "youtube" | "apple" | "more";

interface StreamingLink {
  service: StreamingService;
  label: string;
  url: string;
  className: string;
}

const firstValidUrl = (...urls: Array<string | null | undefined>) => {
  for (const url of urls) {
    if (typeof url === "string" && url.trim().length > 0) {
      return url;
    }
  }
  return undefined;
};

const extractAppleMusicUrl = (apple?: AcrExternalMetadata["apple_music"]) => {
  if (!apple || typeof apple !== "object") return undefined;
  if (typeof apple.url === "string" && apple.url.trim()) return apple.url;
  if (typeof apple.href === "string" && apple.href.trim()) return apple.href;
  if (typeof apple.preview_url === "string" && apple.preview_url.trim()) return apple.preview_url;

  for (const value of Object.values(apple)) {
    if (value && typeof value === "object") {
      const nested = value as { url?: string; href?: string };
      const nestedUrl = firstValidUrl(nested.url, nested.href);
      if (nestedUrl) return nestedUrl;
    }
  }

  return undefined;
};

const SpotifyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12C24 5.372 18.627 0 12 0zm5.59 17.74a.747.747 0 0 1-1.03.24c-2.82-1.73-6.37-2.12-10.56-1.17a.75.75 0 1 1-.33-1.46c4.47-1.03 8.34-.59 11.42 1.27.36.22.47.69.24 1.02zm1.35-3.08a.93.93 0 0 1-1.28.3c-3.23-1.98-8.16-2.55-11.98-1.41a.93.93 0 0 1-.52-1.78c4.35-1.27 9.75-.64 13.46 1.62.37.22.48.69.24 1.27zm.13-3.24c-3.74-2.22-9.91-2.43-13.45-1.32a1.12 1.12 0 0 1-.65-2.15c4.14-1.26 10.9-1 15.26 1.55a1.12 1.12 0 0 1-1.16 1.92z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const getStreamingLinks = (metadata?: AcrMusicMetadata | null): StreamingLink[] => {
  const links: StreamingLink[] = [];
  const externalMeta = metadata?.external_metadata ?? {};
  const seen = new Set<string>();

  const addLink = (service: StreamingService, label: string, url?: string | null, className?: string) => {
    if (!url) return;
    const key = `${service}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({
      service,
      label,
      url,
      className:
        className ||
        {
          spotify: "bg-[#1DB954] hover:bg-[#1ed760] text-white border-0",
          deezer: "bg-[#EF5466] hover:bg-[#ff6b80] text-white border-0",
          youtube: "bg-[#FF0000] hover:bg-[#ff3333] text-white border-0",
          apple: "bg-[#FA243C] hover:bg-[#ff3b4f] text-white border-0",
          more: "bg-muted border border-border hover:bg-muted/80 text-foreground",
        }[service],
    });
  };

  const spotifyTrack = externalMeta?.spotify?.track;
  const spotifyUrl = firstValidUrl(
    spotifyTrack?.external_urls?.spotify,
    spotifyTrack?.url,
    spotifyTrack?.link,
    spotifyTrack?.href,
    spotifyTrack?.id ? `https://open.spotify.com/track/${spotifyTrack.id}` : undefined
  );
  addLink("spotify", "Spotify", spotifyUrl);

  const appleUrl = extractAppleMusicUrl(externalMeta?.apple_music);
  addLink("apple", "Apple Music", appleUrl);

  const deezerTrack = externalMeta?.deezer?.track;
  const deezerUrl = firstValidUrl(
    deezerTrack?.link,
    deezerTrack?.url,
    deezerTrack?.share,
    deezerTrack?.id ? `https://www.deezer.com/track/${deezerTrack.id}` : undefined
  );
  addLink("deezer", "Deezer", deezerUrl);

  const youtubeUrl = firstValidUrl(
    externalMeta?.youtube?.url,
    externalMeta?.youtube?.vid ? `https://www.youtube.com/watch?v=${externalMeta.youtube.vid}` : undefined
  );
  addLink("youtube", "YouTube", youtubeUrl);

  const moreUrl = metadata?.song_link;
  addLink("more", "More Info", moreUrl);

  return links;
};

const mergeStreamingLinks = (...groups: Array<StreamingLink[]>) => {
  const merged: StreamingLink[] = [];
  const seen = new Set<string>();
  groups.forEach((group) => {
    group.forEach((link) => {
      const key = `${link.service}:${link.url}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(link);
    });
  });
  return merged;
};

const StreamingIcon = ({ service }: { service: StreamingService }) => {
  switch (service) {
    case "spotify":
      return <SpotifyIcon />;
    case "youtube":
      return <YoutubeIcon />;
    case "apple":
      return <Apple className="w-5 h-5" />;
    default:
      return <ExternalLink className="w-5 h-5" />;
  }
};

const getPrimaryMetadata = (result: AcrResponse | null): AcrMusicMetadata | undefined => {
  if (!result) return undefined;

  const direct = result.musicMetadata;
  if (direct && typeof direct === "object") {
    const typed = direct as Record<string, unknown>;
    if (
      "title" in typed ||
      "artist" in typed ||
      "album" in typed ||
      "external_metadata" in typed
    ) {
      return typed as AcrMusicMetadata;
    }
    const nested = (typed.metadata as { music?: AcrMusicMetadata[] } | undefined)?.music;
    if (Array.isArray(nested) && nested.length > 0) {
      return nested[0];
    }
  }

  const acrMeta = result.acrResult?.metadata?.music;
  if (Array.isArray(acrMeta) && acrMeta.length > 0) {
    return acrMeta[0];
  }

  const rawMeta = (result as { metadata?: { music?: AcrMusicMetadata[] } }).metadata?.music;
  if (Array.isArray(rawMeta) && rawMeta.length > 0) {
    return rawMeta[0];
  }

  return undefined;
};

const asExternalMetadata = (value: unknown): AcrExternalMetadata | undefined => {
  if (!value || typeof value !== "object") return undefined;
  return value as AcrExternalMetadata;
};

const getMetadataFromItem = (item: RecognizeItem): AcrMusicMetadata | undefined => {
  if (item.metadata && typeof item.metadata === "object") {
    const meta = item.metadata as AcrMusicMetadata;
    if (meta.external_metadata || meta.song_link) {
      return meta;
    }
  }

  const metadata: AcrMusicMetadata = {
    title: item.title ?? item.song?.name,
    artist: item.artist,
    external_metadata: undefined,
  };

  const externalMeta =
    asExternalMetadata(item.externalMetadata) ??
    asExternalMetadata(item.external_metadata) ??
    asExternalMetadata((item.song as Record<string, unknown> | undefined)?.externalMetadata) ??
    asExternalMetadata((item.song as Record<string, unknown> | undefined)?.external_metadata);

  if (externalMeta) {
    metadata.external_metadata = { ...externalMeta };
  }

  const songLink =
    item.songLink ??
    (item as { song_link?: string }).song_link ??
    ((item.song as Record<string, unknown> | undefined)?.song_link as string | undefined);
  if (songLink) {
    metadata.song_link = songLink;
  }

  if (item.youtubeVideoId) {
    metadata.external_metadata = metadata.external_metadata ?? {};
    metadata.external_metadata.youtube = { vid: item.youtubeVideoId };
  }

  if (metadata.external_metadata || metadata.song_link) {
    return metadata;
  }

  return undefined;
};

const getMetadataFromHummingResult = (item: HummingResult): AcrMusicMetadata | undefined => {
  const metadata: AcrMusicMetadata = {
    title: item.title,
    artist: item.artists?.map((artist) => artist?.name).filter(Boolean).join(", "),
    external_metadata: undefined,
  };

  if (item.youtubeVideoId) {
    metadata.external_metadata = { youtube: { vid: item.youtubeVideoId } };
  }

  return metadata.external_metadata ? metadata : undefined;
};

const getMetadataFromSong = (song?: EchoverseSong | null): AcrMusicMetadata | undefined => {
  if (!song) return undefined;
  const metadata: AcrMusicMetadata = {
    title: song.name,
    artist:
      typeof song.artists === "string"
        ? song.artists
        : (song.artists || [])
            .map((artist) => (typeof artist === "string" ? artist : artist?.name))
            .filter(Boolean)
            .join(", ") || undefined,
    external_metadata: undefined,
  };

  const externalMeta =
    asExternalMetadata((song as { externalMetadata?: AcrExternalMetadata }).externalMetadata) ??
    asExternalMetadata((song as { external_metadata?: AcrExternalMetadata }).external_metadata);

  if (externalMeta) {
    metadata.external_metadata = { ...externalMeta };
  }

  const additionalLink = (() => {
    const record = song as Record<string, unknown>;
    const possibleKeys = ["song_link", "songLink"];
    for (const key of possibleKeys) {
      const value = record?.[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return undefined;
  })();

  const songLink =
    (song as { songLink?: string }).songLink ||
    (song as { song_link?: string }).song_link ||
    additionalLink;

  if (typeof songLink === "string" && songLink.trim()) {
    metadata.song_link = songLink;
  }

  return metadata.external_metadata || metadata.song_link ? metadata : undefined;
};

type EchoverseSong = NonNullable<
  AcrResponse["song"]
> & {
  externalMetadata?: AcrExternalMetadata;
  external_metadata?: AcrExternalMetadata;
  songLink?: string;
  song_link?: string;
};

type RecognizeItem = {
  source: string;
  acrId?: string;
  title?: string;
  artist?: string;
  internal?: boolean;
  song?: EchoverseSong;
  youtubeVideoId?: string;
  score?: number; // Recognition confidence score (0-100) - CRITICAL for display
  scoreDouble?: number; // Recognition confidence score as double (for humming)
  metadata?: AcrMusicMetadata;
  externalMetadata?: AcrExternalMetadata;
  external_metadata?: AcrExternalMetadata;
  songLink?: string;
  song_link?: string;
};

const MusicRecognitionResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [echoverseSong, setEchoverseSong] = useState<EchoverseSong | null>(null);
  const [isSearchingEchoverse, setIsSearchingEchoverse] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [hummingResultsWithYoutube, setHummingResultsWithYoutube] = useState<HummingResult[]>([]);
  const [isSearchingYouTube, setIsSearchingYouTube] = useState(false);
  const [listResults, setListResults] = useState<RecognizeItem[] | null>(null);
  const [enrichedListResults, setEnrichedListResults] = useState<RecognizeItem[] | null>(null);

  // Detect if result is array from /songs/recognize
  const isListResponse = (val: unknown): val is RecognizeItem[] => Array.isArray(val);

  // Helper to check if result is ACR response
  const isAcrResponse = (res: RecognitionResult | null): res is AcrResponse => {
    return res !== null && 'matched' in res;
  };

  useEffect(() => {
    if (location.state?.result) {
      const res = location.state.result;
      console.log("[MusicRecognitionResult] Received result:", res);
      if (isListResponse(res)) {
        console.log("[MusicRecognitionResult] Detected list response, length:", res.length);
        setListResults(res);
        setResult(null);
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
      if (result && !isLoading && isAcrResponse(result)) {
        if (result.matched && result.song) {
          setEchoverseSong(result.song);
        } else {
          setEchoverseSong(null);
        }
        setIsSearchingEchoverse(false);
      }
    };

    handleRecognitionResult();
  }, [result, isLoading]);

  // Enrich listResults with YouTube Music video IDs (client-side)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!listResults || listResults.length === 0) {
        setEnrichedListResults(null);
        return;
      }
      const enriched = await Promise.all(
        listResults.map(async (item) => {
          if (item.internal || item.youtubeVideoId) return item;
          const vid = await searchYouTubeMusicVideoId(item.title || '', item.artist || '');
          return { ...item, youtubeVideoId: vid || undefined };
        })
      );
      if (!cancelled) setEnrichedListResults(enriched);
    })();
    return () => { cancelled = true; };
  }, [listResults]);

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
                const videoId = await searchYouTubeMusicVideoId(title, artists);
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

  const formatTimecode = (timecode?: string | number) => {
    if (timecode === undefined || timecode === null) return "";
    const seconds =
      typeof timecode === "number"
        ? Math.floor(timecode / 1000)
        : Number.parseInt(timecode, 10);
    if (Number.isNaN(seconds)) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePlayOnEchoverse = () => {
    if (!echoverseSong) return;

    const formattedSong: PlayerSong = {
      id: String(echoverseSong.id),
      name: echoverseSong.name,
      songName: echoverseSong.name,
      artist:
        typeof echoverseSong.artists === "string"
          ? echoverseSong.artists
          : echoverseSong.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ||
            "Unknown",
      album:
        typeof echoverseSong.album === "string"
          ? echoverseSong.album
          : echoverseSong.album?.name || "Unknown",
      duration: typeof echoverseSong.duration === "number"
        ? echoverseSong.duration
        : Number(echoverseSong.duration ?? 0),
      cover: echoverseSong.urlImageAlbum || "",
      genre: echoverseSong.genres?.[0]?.name || "Unknown",
      plays: echoverseSong.playCount !== undefined ? String(echoverseSong.playCount) : undefined,
      audio: echoverseSong.audioUrl,
      audioUrl: echoverseSong.audioUrl,
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

  const acrResult = isAcrResponse(result) ? result : null;
  const primaryMetadata = getPrimaryMetadata(acrResult);
  const internalSongMetadata = getMetadataFromSong(acrResult?.song);
  const streamingLinks = mergeStreamingLinks(
    getStreamingLinks(primaryMetadata),
    getStreamingLinks(internalSongMetadata)
  );
  
  const hasResult = (() => {
    if (isAcrResponse(result)) {
      if (result.matched && result.song) return true;
      if (result.hummingResults && result.hummingResults.length > 0) return true;
      if (primaryMetadata && Object.keys(primaryMetadata).length > 0) return true;
    }
    return false;
  })();
  
  // Prefer provided albumart, then Apple Music artwork, then Spotify album images (for AUDD)
  // For ACR, use urlImageAlbum from song
  const artworkUrl = (() => {
    if (isAcrResponse(result) && result.song?.urlImageAlbum) {
      return result.song.urlImageAlbum;
    }
    if (!hasResult || !primaryMetadata) return "";
    if (primaryMetadata.albumart) return primaryMetadata.albumart;
    const appleArtworkTemplate = primaryMetadata.apple_music?.artwork?.url;
    if (appleArtworkTemplate) {
      return appleArtworkTemplate.replace("{w}", "512").replace("{h}", "512");
    }
    const spotifyImages = primaryMetadata.external_metadata?.spotify?.album?.images;
    if (spotifyImages && spotifyImages.length > 0) {
      return spotifyImages[0]?.url || "";
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
            {(enrichedListResults || listResults).map((item, index) => {
              const isInternal = !!item.internal && !!item.song;
              const isHumming = item.source === 'humming';
              const isMusic = item.source === 'music';
              const isCustomFiles = item.source === 'custom_files';
              
              const title = isInternal ? item.song?.name : (item.title || '(No title)');
              // Get artists - now it's a string, not an array
              const artists = (() => {
                if (isInternal) {
                  if (typeof item.song?.artists === "string") {
                    return item.song.artists;
                  }
                  if (Array.isArray(item.song?.artists)) {
                    const names = item.song.artists.map((artist) => artist?.name).filter(Boolean).join(", ");
                    if (names) return names;
                  }
                  if (item.artist) return item.artist;
                  return "Unknown Artist";
                }
                return item.artist || "Unknown Artist";
              })();
              
              // Get score for display (use scoreDouble if available for humming, otherwise score)
              // Backend should always provide score (0-100), but handle null/undefined gracefully
              // CRITICAL: Check both score and scoreDouble, and handle 0 as valid score
              const displayScore = item.scoreDouble !== undefined && item.scoreDouble !== null 
                ? item.scoreDouble 
                : (item.score !== undefined && item.score !== null ? item.score : null);
              
              // Debug logging - log all items to see what we're getting
              console.log("[MusicRecognitionResult] Item data:", {
                source: item.source,
                acrId: item.acrId,
                title: item.title,
                score: item.score,
                scoreDouble: item.scoreDouble,
                displayScore: displayScore,
                isInternal: item.internal,
                rawItem: item
              });
              
              const itemMetadata = getMetadataFromItem(item);
              const itemStreamingLinks = getStreamingLinks(itemMetadata);

              return (
                <div key={item.acrId || index} className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-lg">{title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" />
                        {artists}
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap items-center">
                        {/* CRITICAL: Display score prominently - ALWAYS show if available (including 0) */}
                        {displayScore !== null && displayScore !== undefined && typeof displayScore === 'number' ? (
                          <Badge variant="default" className="bg-primary text-primary-foreground font-semibold text-base px-3 py-1">
                            ⭐ {(() => {
                              // Normalize score to 0-100 if needed (backend should already normalize, but double-check)
                              let normalizedScore = displayScore;
                              if (normalizedScore <= 1.0 && normalizedScore > 0) {
                                normalizedScore = normalizedScore * 100;
                              }
                              // Format: show as integer if whole number, otherwise 1 decimal
                              return normalizedScore % 1 !== 0 
                                ? normalizedScore.toFixed(1) 
                                : Math.round(normalizedScore);
                            })()}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-sm px-3 py-1">
                            ⚠️ Score not available (score: {String(item.score)}, scoreDouble: {String(item.scoreDouble)})
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInternal ? (
                        <Button
                          onClick={() => {
                            const song = item.song;
                            if (!song) return;
                            const formatted: PlayerSong = {
                              id: String(song.id),
                              name: song.name,
                              songName: song.name,
                              artist:
                                typeof song.artists === "string"
                                  ? song.artists
                                  : (song.artists || []).map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown",
                              album:
                                typeof song.album === "string"
                                  ? song.album
                                  : song.album?.name || "Unknown",
                              duration: typeof song.duration === "number" ? song.duration : Number(song.duration ?? 0),
                              cover: song.urlImageAlbum || "",
                              genre: song.genres?.[0]?.name || "Unknown",
                              plays: song.playCount !== undefined ? String(song.playCount) : undefined,
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
                      ) : (
                        // Fallback: Quick search on YouTube if no videoId yet
                        <Button
                          onClick={() => {
                            const q = encodeURIComponent([title, artists].filter(Boolean).join(' '));
                            window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener,noreferrer');
                          }}
                          variant="outline"
                          className="border-border"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Search YouTube
                        </Button>
                      )}
                    </div>
                  </div>
                  {itemStreamingLinks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {itemStreamingLinks.map((link) => (
                        <Button
                          key={`${link.service}-${link.url}`}
                          size="icon"
                          onClick={() => openExternalLink(link.url)}
                          className={`rounded-full ${link.className}`}
                          title={link.label}
                        >
                          <StreamingIcon service={link.service} />
                          <span className="sr-only">{link.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
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
              if (!isAcrResponse(result)) return null;

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
              }

              if (result.hummingResults && result.hummingResults.length > 0) {
                return (
                  <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      Không tìm thấy trong hệ thống. Hiển thị {result.hummingResults.length} kết quả từ Humming để tham khảo.
                    </AlertDescription>
                  </Alert>
                );
              }

              return (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Song not found in database. {result.score !== undefined && `Match score: ${result.score}/100`}
                  </AlertDescription>
                </Alert>
              );
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
                                return primaryMetadata?.title || primaryMetadata?.album?.name || "Unknown Title";
                              })()}
                            </h2>
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {(() => {
                                if (isAcrResponse(result) && typeof result.song?.artists === "string") {
                                  return result.song.artists;
                                }
                                if (isAcrResponse(result) && Array.isArray(result.song?.artists)) {
                                  return result.song?.artists?.map((a) => a.name).join(", ") || "Unknown Artist";
                                }
                                return (
                                  primaryMetadata?.artist ||
                                  primaryMetadata?.artists?.map((artist) => artist?.name).filter(Boolean).join(", ") ||
                                  "Unknown Artist"
                                );
                              })()}
                            </p>
                          </div>

                          {(() => {
                            if (isAcrResponse(result) && result.song) {
                              // ACR song info
                              return (
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
                              );
                            }
                            // External metadata info
                            return (
                              <>
                                {primaryMetadata?.album?.name && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                      Album: {primaryMetadata.album.name}
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {primaryMetadata?.release_date && (
                                    <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {primaryMetadata.release_date}
                                    </Badge>
                                  )}
                                  {primaryMetadata?.play_offset_ms && (
                                    <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {formatTimecode(primaryMetadata.play_offset_ms)}
                                    </Badge>
                                  )}
                                  {primaryMetadata?.label && (
                                    <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                                      Label: {primaryMetadata.label}
                                    </Badge>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {streamingLinks.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Listen on:</h3>
                            <div className="flex flex-wrap gap-3">
                              {streamingLinks.map((link) => (
                                <Button
                                  key={`${link.service}-${link.url}`}
                                  size="icon"
                                  onClick={() => openExternalLink(link.url)}
                                  className={`rounded-full ${link.className}`}
                                  title={link.label}
                                >
                                  <StreamingIcon service={link.service} />
                                  <span className="sr-only">{link.label}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

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

                        const hummingMetadata = getMetadataFromHummingResult(item);
                        const hummingStreamingLinks = getStreamingLinks(hummingMetadata);

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
                            {hummingStreamingLinks.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {hummingStreamingLinks.map((link) => (
                                  <Button
                                    key={`${link.service}-${link.url}`}
                                    size="icon"
                                    onClick={() => openExternalLink(link.url)}
                                    className={`rounded-full ${link.className}`}
                                    title={link.label}
                                  >
                                    <StreamingIcon service={link.service} />
                                    <span className="sr-only">{link.label}</span>
                                  </Button>
                                ))}
                              </div>
                            )}
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

