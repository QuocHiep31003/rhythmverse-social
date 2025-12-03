import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Sparkles, MoreHorizontal, ListPlus, Info } from "lucide-react";
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

  useEffect(() => {
    const fetchAIPicks = async () => {
      // Chỉ gọi API khi có token (user đã đăng nhập)
      // Guest không cần AI picks, có thể ẩn section này hoặc hiển thị message
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        setAiPicks([]);
        return;
      }

      try {
        setLoading(true);

        // Gọi API AI picks for you từ backend (đã dùng user embedding + artist seed)
        const songs = await songsApi.getAiPicksForYou(20);

        const picks: AIPickSong[] = songs.map((fullSong, index) => {
          const displayArtists =
            typeof fullSong.artists === "string"
              ? fullSong.artists
              : resolveArtists(undefined, fullSong);

          // Tạo badge nhẹ nhàng, không quá "trending"
          const badgeColor = "bg-primary/15 text-primary border-primary/40";

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
            reason: "Just for you",
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
    };

    fetchAIPicks();
  }, []);

  const handlePlaySong = async (song: AIPickSong) => {
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

    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
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
            <h2 className="text-2xl font-bold text-foreground">AI Picks For You</h2>
            <p className="text-xs text-muted-foreground">
              Based on your favorite artists and listening preferences
            </p>
          </div>
        </div>
        {aiPicks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs rounded-full"
            onClick={() => navigate("/discover")}
          >
            See More Recommendations
          </Button>
        )}
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
              <p className="text-muted-foreground text-sm py-8">Loading smart recommendations...</p>
            ) : (
              aiPicks.map((song) => (
                <div
                  key={song.id}
                  className="w-[200px] flex-shrink-0 group cursor-pointer"
                  onClick={() => handlePlaySong(song)}
                >
                  {/* Cover Art với Badge */}
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-subtle mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border border-border/40">
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
                    {song.reason && (
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="outline"
                          className={`${song.badgeColor ?? "bg-primary/15 text-primary border-primary/40"} text-[10px] px-1.5 py-0.5 flex items-center gap-1 backdrop-blur`}
                        >
                          {song.badgeIcon ?? <Sparkles className="w-3 h-3" />}
                          {song.reason}
                        </Badge>
                      </div>
                    )}

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
                    {/* Menu 3 chấm */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="glass"
                            size="icon"
                            className="rounded-full w-9 h-9 bg-black/55 hover:bg-black/70 border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-5 w-5 text-white" />
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
                              const playerSong = mapToPlayerSong({
                                id: song.id,
                                name: song.songName,
                                songName: song.songName,
                                artists: song.artists,
                                url: song.audioUrl,
                                urlImageAlbum: song.albumImageUrl,
                                uuid: song.uuid,
                              });
                              await addToQueue(playerSong);
                            }}
                          >
                            <Music className="mr-2 h-4 w-4" />
                            Add to Queue
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/song/${createSlug(song.songName, song.id)}`);
                            }}
                          >
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="min-h-[60px]">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {song.songName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
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
        Smart recommendations based on hot trends, trending songs, and popular content right now
      </p>
      
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

