import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Sparkles, MoreHorizontal, ListPlus, Heart, ListMusic, AlertTriangle } from "lucide-react";
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
import GenreMoodAlbumsSection from "@/components/ui/GenreMoodAlbumsSection";
import { useFavoriteSong } from "@/hooks/useFavorites";
import { ReportDialog } from "@/components/ui/ReportDialog";
import { ReportType } from "@/services/api/reportApi";
import { toast } from "@/hooks/use-toast";

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
  const [allAiPicks, setAllAiPicks] = useState<AIPickSong[]>([]); // All songs
  const [loading, setLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | number | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [selectedSongCover, setSelectedSongCover] = useState<string | undefined>(undefined);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSongId, setReportSongId] = useState<number | string | null>(null);
  const [reportSongName, setReportSongName] = useState<string>("");

  const fetchAIPicks = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAllAiPicks([]);
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
              songs = songs.slice(0, 20);
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

      // Save all songs
      setAllAiPicks(picks);
    } catch (error) {
      console.error("Error fetching AI picks:", error);
      setAllAiPicks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Random 9 songs to display
  const displayedPicks = useMemo(() => {
    if (allAiPicks.length <= 9) return allAiPicks;
    const shuffled = [...allAiPicks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [allAiPicks]);

  useEffect(() => {
    fetchAIPicks();
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
    if (allAiPicks.length === 0) return;
    // Play all songs starting from the clicked song
    const allSongs = allAiPicks.map(buildPlayerSong);
    const clickedSong = buildPlayerSong(song);
    // Find the index of the clicked song in the full list
    const songIndex = allSongs.findIndex(s => s.id === clickedSong.id);
    // Reorder queue to start from clicked song
    const reorderedQueue = songIndex >= 0 
      ? [...allSongs.slice(songIndex), ...allSongs.slice(0, songIndex)]
      : allSongs;
    await setQueue(reorderedQueue);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(reorderedQueue[0], playSong);
  };

  const handlePlayAll = async () => {
    if (allAiPicks.length === 0) return;
    // Play all songs, not just 9 displayed
    const songs = allAiPicks.map(buildPlayerSong);
    await setQueue(songs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(songs[0], playSong);
  };

  // Hide this section if no token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  // Component for each song in grid - Horizontal layout
  const SongCard = ({ song }: { song: AIPickSong }) => {
    const numericSongId = typeof song.id === 'number' ? song.id : (typeof song.id === 'string' ? Number(song.id) : undefined);
    const favoriteHook = useFavoriteSong(numericSongId, { disableToast: false });

    return (
      <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
        {/* Album Art - Left side, small square */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-subtle flex-shrink-0 border border-border/40">
          {song.albumImageUrl ? (
            <img
              src={song.albumImageUrl}
              alt={song.songName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Music className="w-6 h-6 text-white/60" />
            </div>
          )}
        </div>

        {/* Song Info - Right side */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-sm mb-0.5 line-clamp-1 text-white hover:text-primary transition-colors cursor-pointer"
              onClick={() => handlePlaySong(song)}
            >
              {song.songName}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {song.artists}
            </p>
          </div>
          
          {/* Icons - Right side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full w-7 h-7 text-white/60 hover:text-white hover:bg-white/10 ${favoriteHook.isFavorite ? 'text-red-500 hover:text-red-400' : ''}`}
              onClick={async (e) => {
                e.stopPropagation();
                await favoriteHook.toggleFavorite();
              }}
              disabled={favoriteHook.pending || !numericSongId}
            >
              <Heart className={`h-4 w-4 ${favoriteHook.isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-7 h-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSongId(song.id);
                    setSelectedSongTitle(song.songName);
                    setSelectedSongCover(song.albumImageUrl);
                    setAddToPlaylistOpen(true);
                  }}
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Add to Playlist
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    const playerSong = buildPlayerSong(song);
                    await addToQueue(playerSong as any);
                  }}
                >
                  <Music className="mr-2 h-4 w-4" />
                  Add to Queue
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Validate song.id trước khi mở dialog báo cáo
                    const songId = song.id;
                    const isValidId = typeof songId === 'number' 
                      ? (Number.isInteger(songId) && songId > 0)
                      : (typeof songId === 'string' && !isNaN(Number(songId)) && Number(songId) > 0);
                    
                    if (!isValidId) {
                      toast({
                        title: "Lỗi",
                        description: "Không thể báo cáo bài hát này do ID không hợp lệ.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setReportSongId(song.id);
                    setReportSongName(song.songName);
                    setReportDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Suggested Songs</h2>
            <p className="text-xs text-muted-foreground">
              Based on your listening preferences
            </p>
          </div>
        </div>
        {allAiPicks.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full gap-2 text-[13px]"
            onClick={handlePlayAll}
            disabled={loading}
          >
            <Play className="w-4 h-4" />
            Play All
          </Button>
        )}
      </div>

      {/* Grid 3x3 - Horizontal layout */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg">
              <div className="w-16 h-16 bg-muted/20 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedPicks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm mb-3">
            No recommendations yet. Listen to more music so AI can learn your taste!
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/discover")}>
            Discover now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {displayedPicks.map((song) => (
            <SongCard 
              key={song.id} 
              song={song}
            />
          ))}
        </div>
      )}
      
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

      {/* Report Dialog */}
      {reportSongId && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          type={ReportType.SONG}
          typeId={reportSongId}
          typeName={reportSongName}
        />
      )}
      
      {/* Genre & Mood Mix Albums - Display right below songs */}
      <div className="mt-8">
        <GenreMoodAlbumsSection />
      </div>
    </section>
  );
};

export default AIPicksSection;

