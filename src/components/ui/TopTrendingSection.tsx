import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, TrendingUp, MoreHorizontal, ListPlus, Heart } from "lucide-react";
import { songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import type { Song } from "@/services/api/songApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import { useFavoriteSong } from "@/hooks/useFavorites";

interface TopTrendingSectionProps {
  songs: Song[];
}

// Component for each song in grid - Horizontal layout
const SongCard = ({ song, onPlay, onAddToPlaylist, onAddToQueue }: { 
  song: Song;
  onPlay: (song: Song) => void;
  onAddToPlaylist: (songId: string | number, title: string, cover?: string) => void;
  onAddToQueue: (song: Song) => void;
}) => {
  const songName = song.songName || song.name || "Unknown Song";
  const artistName = typeof song.artists === 'string' ? song.artists : 
    (Array.isArray(song.artists) ? song.artists.map(a => a?.name).filter(Boolean).join(", ") : "Unknown Artist");
  const coverImage = song.albumImageUrl || song.albumCoverImg || song.urlImageAlbum || song.cover;
  const songId = song.id;
  const numericSongId = typeof songId === 'number' ? songId : (typeof songId === 'string' ? Number(songId) : undefined);
  const favoriteHook = useFavoriteSong(numericSongId, { disableToast: false });

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
      {/* Album Art - Left side, small square */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-subtle flex-shrink-0 border border-border/40">
        {coverImage ? (
          <img
            src={coverImage}
            alt={songName}
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
            onClick={() => onPlay(song)}
          >
            {songName}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {artistName}
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
                  onAddToPlaylist(song.id, songName, coverImage);
                }}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  onAddToQueue(song);
                }}
              >
                <Music className="mr-2 h-4 w-4" />
                Add to Queue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const TopTrendingSection = ({ songs: initialSongs }: TopTrendingSectionProps) => {
  const navigate = useNavigate();
  const { playSong, setQueue, addToQueue } = useMusic();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | number | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [selectedSongCover, setSelectedSongCover] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        // Lấy 50 bài trending
        const top100 = await songsApi.getTop100Trending();
        setSongs(top100.slice(0, 50));
      } catch (error) {
        console.error("Error fetching trending songs:", error);
        // Fallback về initialSongs nếu có
        if (initialSongs.length > 0) {
          setSongs(initialSongs.slice(0, 50));
        } else {
          setSongs([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, [initialSongs]);

  const getArtistName = (artists: Song["artists"]): string => {
    if (typeof artists === 'string') return artists;
    if (Array.isArray(artists)) {
      return artists.map(a => a?.name).filter(Boolean).join(", ") || "Unknown Artist";
    }
    return "Unknown Artist";
  };

  const handlePlaySong = async (song: Song) => {
    const playerSong = mapToPlayerSong(song);
    // Set queue với tất cả 50 bài
    const allPlayerSongs = songs.map(s => mapToPlayerSong(s));
    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const handlePlayAll = async () => {
    if (songs.length === 0) return;
    const allPlayerSongs = songs.map(s => mapToPlayerSong(s));
    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(allPlayerSongs[0], playSong);
  };

  // Lấy 9 bài random từ danh sách để hiển thị
  const displayedSongs = useMemo(() => {
    if (songs.length <= 9) return songs;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [songs]);

  const getCoverImage = (song: Song): string | undefined => {
    return song.albumImageUrl || 
           song.albumCoverImg || 
           song.urlImageAlbum || 
           song.cover;
  };

  const getSongName = (song: Song): string => {
    return song.songName || song.name || "Unknown Song";
  };

  if (songs.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Nghe nhiều nhất gần đây</h2>
            <p className="text-xs text-muted-foreground">
              Top bài hát đang hot trong tuần này
            </p>
          </div>
        </div>
        {songs.length > 0 && (
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
      ) : displayedSongs.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm mb-3">
            Không có bài hát trending nào
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/discover")}>
            Discover now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {displayedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPlay={handlePlaySong}
              onAddToPlaylist={(songId, title, cover) => {
                setSelectedSongId(songId);
                setSelectedSongTitle(title);
                setSelectedSongCover(cover);
                setAddToPlaylistOpen(true);
              }}
              onAddToQueue={async (song) => {
                const playerSong = mapToPlayerSong(song);
                await addToQueue(playerSong);
              }}
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
    </section>
  );
};

export default TopTrendingSection;

