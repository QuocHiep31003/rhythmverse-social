import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, Music } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { createSlug } from "@/utils/playlistUtils";

interface Album {
  id: number | string;
  name?: string;
  title?: string;
  artist?: { id: number | string; name?: string } | string;
  coverUrl?: string;
  cover?: string;
  releaseDate?: string;
  songs?: Array<{ id: number | string; [key: string]: unknown }>;
  tracks?: number;
  songCount?: number;
  releaseYear?: number;
}

const RecommendedAlbumsSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | undefined;
    let cancelled = false;

    const fetchRecommendedAlbums = async (retryCount = 0) => {
      const token = getAuthToken();
      
      // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
      if (!token && retryCount < 3) {
        const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        console.log(`[RecommendedAlbumsSection] No token found, waiting ${waitTime}ms for token from other tabs... (retry ${retryCount + 1}/3)`);
        retryTimeout = setTimeout(() => {
          if (!cancelled) {
            fetchRecommendedAlbums(retryCount + 1);
          }
        }, waitTime);
        return;
      }

      if (!token || !userId) {
        setLoading(false);
        setRecommendedAlbums([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy listening history để tìm các albums đã nghe
        const history = await listeningHistoryApi.getByUser(userId, 0, 100);
        
        if (history.content.length === 0) {
          setRecommendedAlbums([]);
          setLoading(false);
          return;
        }

        // Tập hợp các album IDs và artist IDs từ lịch sử nghe
        const albumIds = new Set<number>();
        const artistIds = new Set<number>();
        
        history.content.forEach((entry) => {
          // Note: entry.song.album chỉ có name, không có id trong ListeningHistoryDTO
          // Nếu cần album ID, có thể tìm từ song.albumId hoặc search bằng tên album
          // Hiện tại bỏ qua việc lấy album ID từ listening history
          
          if (entry.song?.artists && Array.isArray(entry.song.artists)) {
            entry.song.artists.forEach((artist: { id?: number | string; name?: string }) => {
              if (artist.id) {
                const artistId = typeof artist.id === 'number' ? artist.id : Number(artist.id);
                if (Number.isFinite(artistId)) {
                  artistIds.add(artistId);
                }
              }
            });
          }
        });

        // Lấy albums từ các artists đã nghe
        const recommendedSet = new Set<number | string>();
        const recommended: Album[] = [];

        // Lấy albums từ top artists (giới hạn 3 artists để tránh quá nhiều request)
        // Dựa trên tổng hợp ca sĩ vector từ listening history
        const topArtists = await listeningHistoryApi.getTopArtists(userId, 3);
        
        for (const topArtist of topArtists) {
          try {
            // Lấy albums của artist này, ưu tiên albums mới nhất
            const albumsResponse = await albumsApi.getAll({
              page: 0,
              size: 5,
              sort: "releaseDate,desc", // Ưu tiên albums mới nhất từ artists này
              artistId: topArtist.artistId,
            });

            if (albumsResponse?.content) {
              for (const album of albumsResponse.content) {
                // Bỏ qua albums đã nghe
                if (!albumIds.has(Number(album.id)) && !recommendedSet.has(album.id)) {
                  recommendedSet.add(album.id);
                  recommended.push(album);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching albums for artist ${topArtist.artistName}:`, error);
          }
        }

        // Nếu không đủ, lấy thêm albums mới từ các artists khác
        if (recommended.length < 6) {
          try {
            const allAlbumsResponse = await albumsApi.getAll({
              page: 0,
              size: 20,
              sort: "id,desc",
            });

            if (allAlbumsResponse?.content) {
              for (const album of allAlbumsResponse.content) {
                if (recommended.length >= 6) break;
                
                // Chỉ lấy albums từ artists đã nghe hoặc albums mới
                const albumArtistId = typeof album.artist === 'object' && album.artist?.id 
                  ? Number(album.artist.id) 
                  : null;
                
                const isFromListenedArtist = albumArtistId && artistIds.has(albumArtistId);
                const isNewAlbum = !albumIds.has(Number(album.id));
                
                if ((isFromListenedArtist || isNewAlbum) && !recommendedSet.has(album.id)) {
                  recommendedSet.add(album.id);
                  recommended.push(album);
                }
              }
            }
          } catch (error) {
            console.error("Error fetching additional albums:", error);
          }
        }

        setRecommendedAlbums(recommended.slice(0, 6));
      } catch (error) {
        console.error("Error fetching recommended albums:", error);
        setRecommendedAlbums([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedAlbums();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [userId]);

  const handlePlayAlbum = async (album: Album) => {
    try {
      // Lấy songs của album
      const albumDetail = await albumsApi.getById(album.id);
      if (albumDetail?.songs && albumDetail.songs.length > 0) {
        const songs = albumDetail.songs.map((s: { id: number | string; [key: string]: unknown }) => mapToPlayerSong(s));
        await setQueue(songs);
        if (songs.length > 0) {
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songs[0], playSong);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const getArtistName = (artist: { id?: number | string; name?: string } | string | undefined): string => {
    if (typeof artist === 'string') return artist;
    if (artist?.name) return artist.name;
    return "Unknown Artist";
  };

  // Ẩn section này nếu không có token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Recommended albums for you
            </h2>
            <p className="text-xs text-muted-foreground">
              Dựa trên tổng hợp ca sĩ vector từ lịch sử nghe của bạn
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout - Apple Music style: đơn giản, chỉ cover + tên album + tên nghệ sĩ */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-muted/20 rounded-lg animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 bg-muted/20 rounded animate-pulse" />
                <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : recommendedAlbums.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No album recommendations yet. Listen to more music to get suggestions!
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {recommendedAlbums.map((album) => {
            const albumName = album.name || album.title || "Unknown Album";
            const artistName = getArtistName(album.artist);
            const coverImage = album.coverUrl || album.cover;
            const albumSlug = createSlug(albumName, album.id);
            const albumUrl = `/album/${albumSlug}`;

            return (
              <div
                key={album.id}
                className="group cursor-pointer"
                onClick={() => navigate(albumUrl)}
              >
                {/* Cover Image - Aspect Square */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/10 mb-2">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={albumName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary-glow/20">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Play Button - Hiện khi hover, giống Apple Music */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayAlbum(album);
                      }}
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </Button>
                  </div>
                </div>

                {/* Album Info - Chỉ tên album và tên nghệ sĩ */}
                <div className="space-y-1 min-w-0">
                  <h3 
                    className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(albumUrl);
                    }}
                  >
                    {albumName}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {artistName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecommendedAlbumsSection;

