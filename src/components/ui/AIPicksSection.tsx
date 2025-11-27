import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Sparkles, TrendingUp, Flame, Zap } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { songsApi } from "@/services/api";
import type { Song } from "@/services/api/songApi";
import { callHotTodayTrending } from "@/services/api/trendingApi";

interface AIPickSong {
  id: number | string;
  songName: string;
  artists: string;
  albumImageUrl?: string;
  audioUrl?: string;
  uuid?: string;
  reason: "Hot Today" | "Trending" | "Rising" | "New Release" | "Popular";
  badgeColor: string;
  badgeIcon: React.ReactNode;
}

interface TopSongSummary {
  songId?: number | string;
  id?: number | string;
  songName?: string;
  name?: string;
  artists?: string;
  albumImageUrl?: string;
}

const isArtistArray = (
  artists: Song["artists"]
): artists is Array<{ id: number; name: string }> => Array.isArray(artists);

const resolveArtists = (rawArtists?: string, fullSong?: Song | null): string => {
  if (rawArtists && rawArtists.trim().length > 0) {
    return rawArtists;
  }

  if (fullSong) {
    if (typeof fullSong.artists === "string" && fullSong.artists.trim().length > 0) {
      return fullSong.artists;
    }

    if (isArtistArray(fullSong.artists)) {
      const names = fullSong.artists
        .map((artist) => artist?.name?.trim())
        .filter((name): name is string => Boolean(name));
      if (names.length > 0) {
        return names.join(", ");
      }
    }

    if (typeof (fullSong as Song & { artist?: string }).artist === "string") {
      const soloArtist = (fullSong as Song & { artist?: string }).artist?.trim();
      if (soloArtist) {
        return soloArtist;
      }
    }
  }

  return "Unknown Artist";
};

const AIPicksSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [aiPicks, setAiPicks] = useState<AIPickSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAIPicks = async () => {
      try {
        setLoading(true);
        
        // Strategy: Sử dụng hot-today và top-5 từ backend
        // Backend có: /trending/hot-today?top=X và /trending/top-5
        const [hotTodayResult, top5Result] = await Promise.allSettled([
          callHotTodayTrending(15), // Lấy top 15 từ hot-today
          songsApi.getTop5Trending(), // Top 5 trending
        ]);

        const picks: AIPickSong[] = [];
        const usedIds = new Set<number | string>();

        // Interface cho ResultDetailDTO từ backend
        interface ResultDetailDTO {
          songId: number;
          songName: string;
          albumImageUrl?: string;
          artists?: string;
          rank?: number;
          totalPoints?: number;
          oldRank?: number;
        }

        // 1. Xử lý Hot Today (từ hot-today endpoint)
        if (hotTodayResult.status === 'fulfilled' && Array.isArray(hotTodayResult.value) && hotTodayResult.value.length > 0) {
          const hotTodaySongs = hotTodayResult.value.slice(0, 10) as ResultDetailDTO[];
          
          // Fetch full song info cho tất cả songs cùng lúc
          const fullSongPromises = hotTodaySongs
            .filter(song => song.songId && !usedIds.has(song.songId))
            .map(song =>
              songsApi
                .getById(String(song.songId))
                .then(fullSong => ({ song, fullSong }))
                .catch(() => ({ song, fullSong: null }))
            );
          
          const fullSongResults = await Promise.all(fullSongPromises);
          
          fullSongResults.forEach(({ song, fullSong }) => {
            if (song.songId && !usedIds.has(song.songId) && picks.length < 10) {
              // Xác định reason dựa trên rank
              let reason: AIPickSong['reason'] = "Hot Today";
              let badgeColor = "bg-red-500/20 text-red-300 border-red-400/40";
              let badgeIcon = <Flame className="w-3 h-3" />;

              if (song.rank && song.rank <= 3) {
                reason = "Hot Today";
                badgeColor = "bg-orange-500/20 text-orange-300 border-orange-400/40";
                badgeIcon = <Flame className="w-3 h-3" />;
              } else if (song.oldRank && song.rank && song.rank < song.oldRank) {
                reason = "Rising";
                badgeColor = "bg-green-500/20 text-green-300 border-green-400/40";
                badgeIcon = <TrendingUp className="w-3 h-3" />;
              } else {
                reason = "Trending";
                badgeColor = "bg-purple-500/20 text-purple-300 border-purple-400/40";
                badgeIcon = <TrendingUp className="w-3 h-3" />;
              }

              picks.push({
                id: song.songId,
                songName: song.songName || fullSong?.name || "Unknown Song",
                artists: resolveArtists(song.artists, fullSong),
                albumImageUrl: song.albumImageUrl || fullSong?.albumImageUrl || fullSong?.urlImageAlbum || fullSong?.cover,
                audioUrl: fullSong?.audioUrl || fullSong?.url || fullSong?.audio,
                uuid: fullSong?.uuid,
                reason,
                badgeColor,
                badgeIcon,
              });
              usedIds.add(song.songId);
            }
          });
        }

        // 2. Thêm Top 5 nếu chưa đủ (từ top-5 endpoint)
        if (top5Result.status === 'fulfilled' && Array.isArray(top5Result.value) && top5Result.value.length > 0 && picks.length < 10) {
          const top5Songs = (top5Result.value as TopSongSummary[]).filter((song) => {
            const songId = song.songId ?? song.id;
            return songId && !usedIds.has(songId) && picks.length < 10;
          });

          // Fetch full song info cho top 5
          const top5Promises = top5Songs.map((song) => {
            const songId = song.songId ?? song.id;
            return songsApi
              .getById(String(songId))
              .then(fullSong => ({ song, fullSong }))
              .catch(() => ({ song, fullSong: null }));
          });
          
          const top5Results = await Promise.all(top5Promises);
          
          top5Results.forEach(({ song, fullSong }) => {
            const songId = song.songId ?? song.id;
            if (songId && !usedIds.has(songId) && picks.length < 10) {
              picks.push({
                id: songId,
                songName: song.songName || song.name || fullSong?.name || "Unknown Song",
                artists: resolveArtists(song.artists, fullSong),
                albumImageUrl: song.albumImageUrl || fullSong?.albumImageUrl || fullSong?.urlImageAlbum || fullSong?.cover,
                audioUrl: fullSong?.audioUrl || fullSong?.url || fullSong?.audio,
                uuid: fullSong?.uuid,
                reason: "Popular",
                badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
                badgeIcon: <Sparkles className="w-3 h-3" />,
              });
              usedIds.add(songId);
            }
          });
        }

        // Shuffle để đa dạng hơn
        const shuffled = picks.sort(() => Math.random() - 0.5);
        setAiPicks(shuffled.slice(0, 10)); // Lấy tối đa 10 bài
      } catch (error) {
        console.error("Error fetching AI picks:", error);
        setAiPicks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAIPicks();
  }, []);

  const handlePlaySong = (song: AIPickSong) => {
    // Convert to player song format
    const playerSong = mapToPlayerSong({
      id: song.id,
      name: song.songName,
      songName: song.songName,
      artists: song.artists,
      url: song.audioUrl,
      urlImageAlbum: song.albumImageUrl,
      uuid: song.uuid,
    });

    // Set queue với tất cả AI picks
    const allPlayerSongs = aiPicks.map(s => mapToPlayerSong({
      id: s.id,
      name: s.songName,
      songName: s.songName,
      artists: s.artists,
      url: s.audioUrl,
      urlImageAlbum: s.albumImageUrl,
      uuid: s.uuid,
    }));

    setQueue(allPlayerSongs);
    playSong(playerSong);
  };

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">AI Picks For You</h2>
        <Badge variant="secondary" className="ml-2">
          Thông minh
        </Badge>
      </div>

      {/* Horizontal scrolling container */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {loading ? (
              <div className="flex gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[200px] flex-shrink-0">
                    <div className="aspect-square bg-muted/20 rounded-lg animate-pulse mb-3" />
                    <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : aiPicks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8">Đang tải gợi ý thông minh...</p>
            ) : (
              aiPicks.map((song) => (
                <div
                  key={song.id}
                  className="w-[200px] flex-shrink-0 group cursor-pointer"
                  onClick={() => handlePlaySong(song)}
                >
                  {/* Cover Art với Badge */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-subtle mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    {song.albumImageUrl ? (
                      <img
                        src={song.albumImageUrl}
                        alt={song.songName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Badge reason */}
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant="outline" 
                        className={`${song.badgeColor} border text-[10px] px-1.5 py-0.5 flex items-center gap-1`}
                      >
                        {song.badgeIcon}
                        {song.reason}
                      </Badge>
                    </div>

                    {/* Play button overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Button
                        size="icon"
                        className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg scale-90 group-hover:scale-100 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(song);
                        }}
                      >
                        <Play className="w-6 h-6 ml-1 text-white" fill="white" />
                      </Button>
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="min-h-[60px]">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {song.songName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {song.artists}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mt-4">
        Gợi ý thông minh dựa trên xu hướng hot, bài hát trending và nội dung phổ biến hiện tại
      </p>
    </section>
  );
};

export default AIPicksSection;

