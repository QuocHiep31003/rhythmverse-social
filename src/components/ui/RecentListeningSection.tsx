import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, MoreHorizontal, ListPlus, Clock, Heart } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import type { ListeningHistoryDTO } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import { createSlug } from "@/utils/playlistUtils";
import { useFavoriteSong } from "@/hooks/useFavorites";

// Component for each song in grid - Horizontal layout
const SongCard = ({ entry, onPlay, onAddToPlaylist, onAddToQueue }: { 
  entry: ListeningHistoryDTO;
  onPlay: (entry: ListeningHistoryDTO) => void;
  onAddToPlaylist: (songId: string | number, title: string, cover?: string) => void;
  onAddToQueue: (entry: ListeningHistoryDTO) => void;
}) => {
  const songName = entry.song?.name || entry.song?.title || entry.songName || "Unknown Song";
  const artistName = entry.song?.artistNames?.join(", ") || 
    (Array.isArray(entry.song?.artists) ? entry.song?.artists.map(a => a.name).filter(Boolean).join(", ") : "") || 
    (Array.isArray(entry.artistNames) ? entry.artistNames.join(", ") : "") || 
    "Unknown Artist";
  const coverImage = entry.song?.cover || (entry.song as any)?.urlImageAlbum || (entry.song as any)?.albumCoverImg;
  const songId = entry.song?.id || entry.songId;
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
            onClick={() => {
              if (songId) {
                onPlay(entry);
              }
            }}
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
                  if (songId) {
                    onAddToPlaylist(songId, songName, coverImage);
                  }
                }}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  onAddToQueue(entry);
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

const RecentListeningSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue, addToQueue } = useMusic();
  const [recentSongs, setRecentSongs] = useState<ListeningHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | number | null>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [selectedSongCover, setSelectedSongCover] = useState<string | undefined>(undefined);

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | undefined;
    let cancelled = false;

    const fetchRecentListening = async (retryCount = 0) => {
      let token = getAuthToken();
      
      // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
      if (!token && retryCount < 3) {
        const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        retryTimeout = setTimeout(() => {
          if (!cancelled) {
            fetchRecentListening(retryCount + 1);
          }
        }, waitTime);
        return;
      }

      if (!token || !userId) {
        setLoading(false);
        setRecentSongs([]);
        return;
      }

      try {
        setLoading(true);
        // Lấy lịch sử nghe gần đây (50 bài hát)
        const history = await listeningHistoryApi.getByUser(userId, 0, 50);
        
        // Lọc các bài hát có thông tin đầy đủ
        const validSongs = history.content.filter(
          (entry) => entry.song && entry.song.id
        );
        
        setRecentSongs(validSongs);
      } catch (error) {
        console.error("Error fetching recent listening:", error);
        setRecentSongs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentListening();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [userId]);

  const handlePlaySong = async (entry: ListeningHistoryDTO) => {
    if (!entry.song) return;
    
    const playerSong = mapToPlayerSong({
      id: entry.song.id,
      name: entry.song.name || entry.song.title || "Unknown Song",
      songName: entry.song.name || entry.song.title,
      artists: entry.song.artistNames || entry.song.artists?.map(a => a.name).join(", ") || "Unknown Artist",
      url: entry.song.audioUrl || entry.song.audio,
      urlImageAlbum: entry.song.cover,
      uuid: (entry.song as any).uuid,
    });

    // Set queue với tất cả recent songs (50 bài)
    const allPlayerSongs = recentSongs
      .filter(e => e.song)
      .map(e => mapToPlayerSong({
        id: e.song!.id,
        name: e.song!.name || e.song!.title || "Unknown Song",
        songName: e.song!.name || e.song!.title,
        artists: e.song!.artistNames || e.song!.artists?.map(a => a.name).join(", ") || "Unknown Artist",
        url: e.song!.audioUrl || e.song!.audio,
        urlImageAlbum: e.song!.cover,
        uuid: (e.song as any).uuid,
      }));

    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const handlePlayAll = async () => {
    if (recentSongs.length === 0) return;
    
    const allPlayerSongs = recentSongs
      .filter(e => e.song)
      .map(e => mapToPlayerSong({
        id: e.song!.id,
        name: e.song!.name || e.song!.title || "Unknown Song",
        songName: e.song!.name || e.song!.title,
        artists: e.song!.artistNames || e.song!.artists?.map(a => a.name).join(", ") || "Unknown Artist",
        url: e.song!.audioUrl || e.song!.audio,
        urlImageAlbum: e.song!.cover,
        uuid: (e.song as any).uuid,
      }));

    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(allPlayerSongs[0], playSong);
  };

  const getSongName = (entry: ListeningHistoryDTO): string => {
    return entry.song?.name || entry.song?.title || entry.songName || "Unknown Song";
  };

  const getArtistName = (entry: ListeningHistoryDTO): string => {
    if (entry.song?.artistNames && entry.song.artistNames.length > 0) {
      return entry.song.artistNames.join(", ");
    }
    if (entry.song?.artists && Array.isArray(entry.song.artists)) {
      return entry.song.artists.map(a => a.name).filter(Boolean).join(", ");
    }
    if (entry.artistNames && entry.artistNames.length > 0) {
      return entry.artistNames.join(", ");
    }
    return "Unknown Artist";
  };

  const getCoverImage = (entry: ListeningHistoryDTO): string | undefined => {
    return entry.song?.cover || (entry.song as any)?.urlImageAlbum || (entry.song as any)?.albumCoverImg;
  };

  // Lấy 9 bài random từ danh sách để hiển thị
  const displayedSongs = useMemo(() => {
    if (recentSongs.length <= 9) return recentSongs;
    const shuffled = [...recentSongs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [recentSongs]);

  // Ẩn section này nếu không có token (guest) hoặc không có data
  const token = getAuthToken();
  if (!token || recentSongs.length === 0) {
    return null;
  }

  return (
    <>
      <section className="mb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Nghe nhiều nhất gần đây</h2>
              <p className="text-xs text-muted-foreground">
                Songs you've recently listened to from playlists, albums, and more
              </p>
            </div>
          </div>
          {recentSongs.length > 0 && (
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
              You haven&apos;t played any songs recently
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/discover")}>
              Discover now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {displayedSongs.map((entry) => (
              <SongCard
                key={entry.id || entry.songId}
                entry={entry}
                onPlay={handlePlaySong}
                onAddToPlaylist={(songId, title, cover) => {
                  setSelectedSongId(songId);
                  setSelectedSongTitle(title);
                  setSelectedSongCover(cover);
                  setAddToPlaylistOpen(true);
                }}
                onAddToQueue={async (entry) => {
                  if (entry.song) {
                    const artistName = entry.song.artistNames?.join(", ") || 
                      (Array.isArray(entry.song.artists) ? entry.song.artists.map(a => a.name).filter(Boolean).join(", ") : "") || 
                      "Unknown Artist";
                    const coverImage = entry.song.cover || (entry.song as any)?.urlImageAlbum || (entry.song as any)?.albumCoverImg;
                    const playerSong = mapToPlayerSong({
                      id: entry.song.id,
                      name: entry.song.name || entry.song.title || "Unknown Song",
                      songName: entry.song.name || entry.song.title,
                      artists: artistName,
                      url: entry.song.audioUrl || entry.song.audio,
                      urlImageAlbum: coverImage,
                      uuid: (entry.song as any)?.uuid,
                    } as any);
                    await addToQueue(playerSong);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

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
    </>
  );
};

export default RecentListeningSection;

