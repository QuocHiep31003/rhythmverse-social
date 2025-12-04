import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Disc, Sparkles, Calendar } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import { createSlug } from "@/utils/playlistUtils";
import { useMusic } from "@/contexts/MusicContext";
import { songsApi } from "@/services/api";
import { mapToPlayerSong } from "@/lib/utils";

interface Album {
  id: number | string;
  name?: string;
  title?: string;
  artist?: { id: number | string; name?: string } | string;
  coverUrl?: string;
  cover?: string;
  releaseDate?: string;
  songs?: any[];
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
      let token = getAuthToken();
      
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
          if (entry.song?.album?.id) {
            albumIds.add(entry.song.album.id);
          }
          if (entry.song?.artists && Array.isArray(entry.song.artists)) {
            entry.song.artists.forEach((artist: { id: number }) => {
              if (artist.id) artistIds.add(artist.id);
            });
          }
        });

        // Lấy albums từ các artists đã nghe
        const recommendedSet = new Set<number | string>();
        const recommended: Album[] = [];

        // Lấy albums từ top artists (giới hạn 3 artists để tránh quá nhiều request)
        const topArtists = await listeningHistoryApi.getTopArtists(userId, 3);
        
        for (const topArtist of topArtists) {
          try {
            // Lấy albums của artist này
            const albumsResponse = await albumsApi.getAll({
              page: 0,
              size: 5,
              sort: "id,desc",
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
        const songs = albumDetail.songs.map((s: any) => mapToPlayerSong(s));
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

  const getArtistName = (artist: any): string => {
    if (typeof artist === 'string') return artist;
    if (artist?.name) return artist.name;
    return "Unknown Artist";
  };

  const getTrackCount = (album: Album): number => {
    return album.songCount || album.tracks || album.songs?.length || 0;
  };

  // Ẩn section này nếu không có token (guest) hoặc không có data
  const token = getAuthToken();
  if (!token || recommendedAlbums.length === 0) {
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
              Gợi ý album cho bạn
            </h2>
            <p className="text-xs text-muted-foreground">
              Dựa trên lịch sử nghe của bạn
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gradient-glass backdrop-blur-sm border-white/10 rounded-lg overflow-hidden">
              <div className="aspect-[4/3] bg-muted/20 rounded-t-lg animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted/20 rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted/20 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : recommendedAlbums.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Chưa có gợi ý album. Hãy nghe thêm nhạc để nhận gợi ý!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedAlbums.map((album) => {
            const artistName = getArtistName(album.artist);
            const albumName = album.name || album.title || "Unknown Album";
            const coverImage = album.coverUrl || album.cover;
            const releaseYear = album.releaseYear || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : null);
            const trackCount = getTrackCount(album);

            return (
              <div
                key={album.id}
                className="group bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-glow cursor-pointer overflow-hidden rounded-lg"
                onClick={() => navigate(`/album/${createSlug(albumName, album.id)}`)}
              >
                {/* Cover Art */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={albumName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Play button overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      size="icon"
                      className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-2xl scale-90 group-hover:scale-100 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAlbum(album);
                      }}
                    >
                      <Play className="w-7 h-7 ml-1 text-white" fill="white" />
                    </Button>
                  </div>

                  {/* Badge overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white border-white/20">
                      <Disc className="w-3 h-3 mr-1" />
                      Album
                    </Badge>
                  </div>
                </div>

                {/* Album Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {albumName}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {artistName}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    {releaseYear && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{releaseYear}</span>
                      </div>
                    )}
                    {trackCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        <span>{trackCount} {trackCount === 1 ? 'bài' : 'bài'}</span>
                      </div>
                    )}
                  </div>
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

