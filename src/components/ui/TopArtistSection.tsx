import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, MoreHorizontal, ListPlus, Star } from "lucide-react";
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
    let retryTimeout: NodeJS.Timeout | undefined;
    let cancelled = false;

    const fetchTopArtistSection = async (retryCount = 0) => {
      let token = getAuthToken();
      
      // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
      if (!token && retryCount < 3) {
        const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        retryTimeout = setTimeout(() => {
          if (!cancelled) {
            fetchTopArtistSection(retryCount + 1);
          }
        }, waitTime);
        return;
      }

      if (!token || !userId) {
        setLoading(false);
        setTopArtist(null);
        setSongs([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy top artists từ listening history (chỉ lấy 1 artist nổi bật nhất)
        let topArtists = await listeningHistoryApi.getTopArtists(userId, 1);
        
        // Nếu không có data từ listening history, lấy random artist làm fallback
        if (topArtists.length === 0) {
          console.log("⚠️ No listening history, fetching random artist as fallback...");
          try {
            const randomArtistsResponse = await artistsApi.getAll({
              page: 0,
              size: 1,
              sort: "id,desc", // Lấy artist mới nhất
            });
            if (randomArtistsResponse?.content && randomArtistsResponse.content.length > 0) {
              const randomArtist = randomArtistsResponse.content[0];
              topArtists = [{
                artistId: randomArtist.id,
                artistName: randomArtist.name,
                listenCount: 0,
              }];
            }
          } catch (fallbackError) {
            console.error("Error fetching fallback artist:", fallbackError);
          }
        }

        // Nếu vẫn không có artist, return empty
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
          const songsResponse = await songsApi.getPublic({
            page: 0,
            size: 10,
            sort: "playCount,desc",
            artistId: artist.artistId,
          });

          if (songsResponse?.content && songsResponse.content.length > 0) {
            setSongs(songsResponse.content);
          } else {
            // Nếu không có songs từ artist, lấy random songs làm fallback
            console.log(`⚠️ No songs from artist ${artist.artistName}, fetching random songs as fallback...`);
            try {
              const randomSongsResponse = await songsApi.getPublic({
                page: 0,
                size: 10,
                sort: "playCount,desc",
              });
              if (randomSongsResponse?.content && randomSongsResponse.content.length > 0) {
                setSongs(randomSongsResponse.content);
              } else {
                setSongs([]);
              }
            } catch (fallbackError) {
              console.error("Error fetching fallback songs:", fallbackError);
              setSongs([]);
            }
          }
        } catch (error) {
          console.error(`Error fetching songs for artist ${artist.artistName}:`, error);
          // Fallback: lấy random songs
          try {
            const randomSongsResponse = await songsApi.getPublic({
              page: 0,
              size: 10,
              sort: "playCount,desc",
            });
            if (randomSongsResponse?.content && randomSongsResponse.content.length > 0) {
              setSongs(randomSongsResponse.content);
            } else {
              setSongs([]);
            }
          } catch (fallbackError) {
            console.error("Error fetching fallback songs:", fallbackError);
            setSongs([]);
          }
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

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
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

  // Ẩn section này nếu không có token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  // Hiển thị skeleton khi đang loading hoặc chưa có data
  if (loading || !topArtist) {
    return (
      <section className="mb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                For fans
              </h2>
            </div>
          </div>
        </div>

        {/* Horizontal scrolling container */}
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
            <div className="flex gap-4 min-w-max">
              <div className="flex gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[200px] flex-shrink-0">
                    <div className="aspect-square bg-muted/20 rounded-lg animate-pulse mb-3" />
                    <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
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
                For {topArtist.artistName} fans
              </h2>
            </div>
          </div>
          {songs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={() => navigate(`/artist/${topArtist.artistId}`)}
            >
              View all
            </Button>
          )}
        </div>

        {/* Horizontal scrolling container */}
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
            <div className="flex gap-4 min-w-max">
              {songs.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8">
                  No songs available from {topArtist.artistName}
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
                      onClick={() => handlePlaySong(song)}
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
                            {song.playCount.toLocaleString()} plays
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

