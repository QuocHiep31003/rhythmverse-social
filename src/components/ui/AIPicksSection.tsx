import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Sparkles, MoreHorizontal, ListPlus, Info, Heart, ListMusic, RefreshCcw } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { songsApi } from "@/services/api";
import type { Song } from "@/services/api/songApi";
import { getAuthToken } from "@/services/api/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import { createSlug } from "@/utils/playlistUtils";

interface AIPickSong {
  id: number | string;
  songName: string;
  artists: string;
  albumImageUrl?: string;
  audioUrl?: string;
  uuid?: string;
  reason?: string;
  badgeColor?: string;
  badgeIcon?: React.ReactNode;
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
  const { playSong, setQueue, addToQueue } = useMusic();
  const [aiPicks, setAiPicks] = useState<AIPickSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | number | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [selectedSongCover, setSelectedSongCover] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAIPicks = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAiPicks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let songs = await songsApi.getAiPicksForYou(20);

      if (!songs || songs.length === 0) {
        console.log("⚠️ AI picks empty, falling back to trending songs...");
        try {
          songs = await songsApi.getTop5Trending();
          if (!songs || songs.length === 0) {
            songs = await songsApi.getMonthlyTop100();
            if (songs && songs.length > 0) {
              songs = songs.slice(0, 10);
            }
          }
        } catch (fallbackError) {
          console.error("Error fetching fallback trending songs:", fallbackError);
          songs = [];
        }
      }

      const picks: AIPickSong[] = songs.map((fullSong) => {
        const displayArtists =
          typeof fullSong.artists === "string"
            ? fullSong.artists
            : resolveArtists(undefined, fullSong);

        const badgeColor = "bg-primary/15 text-primary border-primary/40";
        const reason =
          songs.length > 0 && songs[0]?.trendingScore !== undefined
            ? "Trending Now"
            : "Just for you";

        return {
          id: fullSong.id,
          songName: fullSong.songName || fullSong.name || "Unknown Song",
          artists: displayArtists,
          albumImageUrl:
            fullSong.albumImageUrl ||
            fullSong.albumCoverImg ||
            fullSong.urlImageAlbum ||
            fullSong.cover,
          audioUrl: fullSong.audioUrl || fullSong.url || fullSong.audio,
          uuid: fullSong.uuid,
          reason,
          badgeColor,
          badgeIcon: <Sparkles className="w-3 h-3" />,
        };
      });

      setAiPicks(picks.slice(0, 10));
    } catch (error) {
      console.error("Error fetching AI picks:", error);
      setAiPicks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAIPicks();
  }, [fetchAIPicks]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAIPicks();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAIPicks]);

  const buildPlayerSong = useCallback(
    (song: AIPickSong) =>
      mapToPlayerSong({
        id: song.id,
        name: song.songName,
        songName: song.songName,
        artists: song.artists,
        url: song.audioUrl,
        urlImageAlbum: song.albumImageUrl,
        uuid: song.uuid,
      }),
    []
  );

  const handlePlaySong = async (song: AIPickSong) => {
    const playerSong = buildPlayerSong(song);
    await setQueue([playerSong]);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const handlePlayAll = async () => {
    if (aiPicks.length === 0) return;
    const songs = aiPicks.map(buildPlayerSong);
    await setQueue(songs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(songs[0], playSong);
  };

  // Ẩn section này nếu không có token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const featuredSong = aiPicks[0];
  const secondarySongs = aiPicks.slice(1);

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">AI Picks For You</h2>
            <p className="text-xs text-muted-foreground">
              Based on your favorite artists and listening preferences
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">
                Phần 1: Gợi ý bài hát
              </p>
              <h3 className="text-2xl font-semibold text-white mt-1">AI gợi ý dành riêng cho bạn</h3>
            </div>
            {aiPicks.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full gap-2 text-[13px]"
                onClick={handlePlayAll}
                disabled={loading}
              >
                <Play className="w-4 h-4" />
                Phát tất cả
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl p-4 animate-pulse h-40" />
              ))}
            </div>
          ) : aiPicks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm mb-3">
                Chưa có gợi ý. Hãy nghe thêm nhạc để AI hiểu bạn hơn!
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/discover")}>
                Khám phá ngay
              </Button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
              {featuredSong && (
                <div className="lg:w-1/3 bg-black/30 rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col gap-3">
                  <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
                    {featuredSong.albumImageUrl ? (
                      <img
                        src={featuredSong.albumImageUrl}
                        alt={featuredSong.songName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <Music className="w-12 h-12 text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">
                      Featured pick
                    </p>
                    <h3 className="text-lg font-semibold text-white line-clamp-1">
                      {featuredSong.songName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {featuredSong.artists}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <Button
                      size="sm"
                      className="rounded-full gap-2"
                      onClick={() => handlePlaySong(featuredSong)}
                    >
                      <Play className="w-4 h-4" />
                      Phát
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                      onClick={() => handlePlaySong(featuredSong)}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full border border-white/10"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSongId(featuredSong.id);
                            setSelectedSongTitle(featuredSong.songName);
                            setSelectedSongCover(featuredSong.albumImageUrl);
                            setAddToPlaylistOpen(true);
                          }}
                        >
                          <ListPlus className="mr-2 h-4 w-4" />
                          Add to Playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const playerSong = buildPlayerSong(featuredSong);
                            await addToQueue(playerSong);
                          }}
                        >
                          <Music className="mr-2 h-4 w-4" />
                          Add to Queue
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/song/${createSlug(featuredSong.songName, featuredSong.id)}`)
                          }
                        >
                          <Info className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(secondarySongs.length > 0 ? secondarySongs : aiPicks).map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition cursor-pointer"
                    onClick={() => handlePlaySong(song)}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                      {song.albumImageUrl ? (
                        <img
                          src={song.albumImageUrl}
                          alt={song.songName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-white/60" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white line-clamp-1">{song.songName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{song.artists}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full w-9 h-9 text-white/80 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song);
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add to Playlist Dialog */}
      {selectedSongId && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSongId}
          songTitle={selectedSongTitle}
          songCover={selectedSongCover}
        />
      )}
    </section>
  );
};

export default AIPicksSection;

