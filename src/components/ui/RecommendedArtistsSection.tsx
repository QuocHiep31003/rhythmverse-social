import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, User, Sparkles } from "lucide-react";
import { artistsApi, type Artist } from "@/services/api/artistApi";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import { useMusic } from "@/contexts/MusicContext";
import { songsApi } from "@/services/api";
import { mapToPlayerSong } from "@/lib/utils";

const RecommendedArtistsSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [recommendedArtists, setRecommendedArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | undefined;
    let cancelled = false;

    const fetchRecommendedArtists = async (retryCount = 0) => {
      let token = getAuthToken();
      
      // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
      if (!token && retryCount < 3) {
        const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        console.log(`[RecommendedArtistsSection] No token found, waiting ${waitTime}ms for token from other tabs... (retry ${retryCount + 1}/3)`);
        retryTimeout = setTimeout(() => {
          if (!cancelled) {
            fetchRecommendedArtists(retryCount + 1);
          }
        }, waitTime);
        return;
      }

      if (!token || !userId) {
        setLoading(false);
        setRecommendedArtists([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy top artists từ listening history (top 1 để không quá nhiều)
        let topArtists = await listeningHistoryApi.getTopArtists(userId, 1);
        
        // Nếu không có data từ listening history, lấy random artists làm fallback
        if (topArtists.length === 0) {
          console.log("⚠️ No listening history, fetching random artists as fallback...");
          try {
            const randomArtistsResponse = await artistsApi.getAll({
              page: 0,
              size: 6,
              sort: "id,desc", // Lấy artists mới nhất
            });
            if (randomArtistsResponse?.content && randomArtistsResponse.content.length > 0) {
              const randomArtists = randomArtistsResponse.content.map((artist, index) => ({
                artistId: artist.id,
                artistName: artist.name,
                listenCount: 0,
              }));
              topArtists = randomArtists;
            }
          } catch (fallbackError) {
            console.error("Error fetching fallback artists:", fallbackError);
          }
        }

        // Nếu vẫn không có artists, return empty
        if (topArtists.length === 0) {
          setRecommendedArtists([]);
          setLoading(false);
          return;
        }

        // Chỉ lấy top artists, không lấy related artists để tránh quá nhiều
        const recommended: Artist[] = [];

        // Lấy thông tin đầy đủ của top artists
        for (const topArtist of topArtists) {
          try {
            const artist = await artistsApi.getById(topArtist.artistId);
            if (artist) {
              recommended.push(artist);
            }
          } catch (error) {
            console.error(`Error fetching artist ${topArtist.artistId}:`, error);
          }
        }

        // Nếu không đủ, lấy random artists làm fallback
        if (recommended.length < 6) {
          try {
            const randomArtistsResponse = await artistsApi.getAll({
              page: 0,
              size: 6 - recommended.length,
              sort: "id,desc",
            });
            if (randomArtistsResponse?.content) {
              for (const artist of randomArtistsResponse.content) {
                if (!recommended.some(a => a.id === artist.id)) {
                  recommended.push(artist);
                  if (recommended.length >= 6) break;
                }
              }
            }
          } catch (error) {
            console.error("Error fetching fallback random artists:", error);
          }
        }

        setRecommendedArtists(recommended.slice(0, 6));
      } catch (error) {
        console.error("Error fetching recommended artists:", error);
        setRecommendedArtists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedArtists();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [userId]);

  const handlePlayArtist = async (artistId: number) => {
    try {
      // Lấy top songs của artist
      const songsResponse = await artistsApi.getSongs(artistId, {
        page: 0,
        size: 1,
        sort: "playCount,desc",
      });

      if (songsResponse?.content && songsResponse.content.length > 0) {
        const song = songsResponse.content[0];
        const playerSong = mapToPlayerSong(song as any);
        await setQueue([playerSong]);
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(playerSong, playSong);
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
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
            Recommended artists for you
            </h2>
            <p className="text-xs text-muted-foreground">
            Based on your listening history
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scrolling container */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {loading ? (
              <div className="flex gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[180px] flex-shrink-0">
                    <div className="aspect-square bg-muted/20 rounded-full animate-pulse mb-3" />
                    <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recommendedArtists.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8">
              No artist recommendations yet. Listen to more music to get suggestions!
              </p>
            ) : (
              recommendedArtists.map((artist) => {
                return (
                  <div
                    key={artist.id}
                    className="w-[180px] flex-shrink-0 group cursor-pointer"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                    {/* Avatar - Circular */}
                    <div className="relative aspect-square rounded-full overflow-hidden bg-gradient-subtle mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-border/40 group-hover:border-primary/60">
                      {artist.avatar ? (
                        <img
                          src={artist.avatar}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <User className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Play button overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Button
                          size="icon"
                          className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg scale-90 group-hover:scale-100 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayArtist(artist.id);
                          }}
                        >
                          <Play className="w-6 h-6 ml-1 text-white" fill="white" />
                        </Button>
                      </div>

                      {/* Verified badge */}
                      {artist.verified && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-primary/80 backdrop-blur-sm text-white border-white/20 p-0.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="text-center min-h-[60px]">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {artist.name}
                      </h3>
                      {artist.country && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {artist.country}
                        </p>
                      )}
                      {artist.monthlyListeners && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                    {artist.monthlyListeners} monthly listeners
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecommendedArtistsSection;

