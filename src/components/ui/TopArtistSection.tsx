import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, MoreHorizontal, ListPlus, Info, Star } from "lucide-react";
import { songsApi, artistsApi } from "@/services/api";
import { createSlug } from "@/utils/playlistUtils";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import type { Song } from "@/services/api/songApi";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";

const TopArtistSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue, addToQueue } = useMusic();
  const [topArtist, setTopArtist] = useState<{
    artistId: number;
    artistName: string;
    listenCount: number;
  } | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
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
    const fetchTopArtistSection = async () => {
      const token = getAuthToken();
      if (!token || !userId) {
        setLoading(false);
        setTopArtist(null);
        setSongs([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy top artists từ listening history (chỉ lấy 1 artist nổi bật nhất)
        const topArtists = await listeningHistoryApi.getTopArtists(userId, 1);
        
        if (topArtists.length === 0) {
          setTopArtist(null);
          setSongs([]);
          setLoading(false);
          return;
        }

        const artist = topArtists[0];
        setTopArtist(artist);

        // Lấy các bài hát của artist này (nổi bật - sort theo playCount desc)
        try {
          // Thử lấy từ artist API trước
          const songsResponse = await artistsApi.getSongs(artist.artistId, {
            page: 0,
            size: 10,
            sort: "playCount,desc",
          });

          const artistSongs = songsResponse?.content || [];
          
          // Nếu không có songs từ artist API, thử lấy từ songs API với artistId filter
          if (artistSongs.length === 0) {
            const songsResponse2 = await songsApi.getPublic({
              page: 0,
              size: 10,
              sort: "playCount,desc",
              artistId: artist.artistId,
            });
            
            if (songsResponse2?.content && songsResponse2.content.length > 0) {
              setSongs(songsResponse2.content);
            } else {
              setSongs([]);
            }
          } else {
            setSongs(artistSongs);
          }
        } catch (error) {
          console.error(`Error fetching songs for artist ${artist.artistName}:`, error);
          setSongs([]);
        }
      } catch (error) {
        console.error("Error fetching top artist section:", error);
        setTopArtist(null);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopArtistSection();
  }, [userId]);

  const getArtistName = (artists: Song["artists"]): string => {
    if (typeof artists === 'string') return artists;
    if (Array.isArray(artists)) {
      return artists.map(a => a?.name).filter(Boolean).join(", ") || "Unknown Artist";
    }
    return "Unknown Artist";
  };

  const handlePlaySong = async (song: Song) => {
    const playerSong = mapToPlayerSong(song);
    await setQueue([playerSong]);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const getCoverImage = (song: Song): string | undefined => {
    return song.albumImageUrl || 
           song.albumCoverImg || 
           song.urlImageAlbum || 
           song.cover;
  };

  const getSongName = (song: Song): string => {
    return song.songName || song.name || "Unknown Song";
  };

  // Ẩn section này nếu không có token (guest) hoặc không có data
  const token = getAuthToken();
  if (!token || !topArtist || songs.length === 0) {
    return null;
  }

  return (
    <>
      <section className="mb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Ca sĩ nổi bật của bạn
              </h2>
              <p className="text-xs text-muted-foreground">
                {topArtist.artistName} - Nghệ sĩ bạn nghe nhiều nhất
              </p>
            </div>
          </div>
          {songs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={() => navigate(`/artist/${topArtist.artistId}`)}
            >
              Xem tất cả
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
              ) : songs.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8">
                  Không có bài hát nào từ {topArtist.artistName}
                </p>
              ) : (
                songs.map((song) => {
                  const songName = getSongName(song);
                  const artistName = getArtistName(song.artists);
                  const coverImage = getCoverImage(song);

                  return (
                    <div
                      key={song.id}
                      className="w-[200px] flex-shrink-0 group cursor-pointer"
                      onClick={() => navigate(`/song/${createSlug(songName, song.id)}`)}
                    >
                      {/* Cover Art */}
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-subtle mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border border-border/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={songName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-12 h-12 text-muted-foreground" />
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
                                  setSelectedSongTitle(songName);
                                  setSelectedSongCover(coverImage);
                                  setAddToPlaylistOpen(true);
                                }}
                              >
                                <ListPlus className="mr-2 h-4 w-4" />
                                Add to Playlist
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const playerSong = mapToPlayerSong(song);
                                  await addToQueue(playerSong);
                                }}
                              >
                                <Music className="mr-2 h-4 w-4" />
                                Add to Queue
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/song/${createSlug(songName, song.id)}`);
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
                          {songName}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {artistName}
                        </p>
                        {song.playCount && (
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {song.playCount.toLocaleString()} lượt nghe
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

export default TopArtistSection;

