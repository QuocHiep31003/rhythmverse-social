import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, Heart, MoreHorizontal, ListPlus, Info } from "lucide-react";
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

interface TopArtist {
  artistId: number;
  artistName: string;
  listenCount: number;
}

interface ArtistFanSectionData {
  artist: TopArtist;
  songs: Song[];
}

const ArtistFanSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue, addToQueue } = useMusic();
  const [sections, setSections] = useState<ArtistFanSectionData[]>([]);
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

    const fetchArtistFanSections = async (retryCount = 0) => {
      let token = getAuthToken();
      
      // ✅ Nếu tab mới mở, đợi một chút để token có thể được share từ tab khác
      if (!token && retryCount < 3) {
        const waitTime = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        retryTimeout = setTimeout(() => {
          if (!cancelled) {
            fetchArtistFanSections(retryCount + 1);
          }
        }, waitTime);
        return;
      }

      if (!token || !userId) {
        setLoading(false);
        setSections([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy top artists từ listening history
        const topArtists = await listeningHistoryApi.getTopArtists(userId, 3);
        
        if (topArtists.length === 0) {
          setSections([]);
          setLoading(false);
          return;
        }

        // Với mỗi artist, lấy các bài hát có playCount cao nhất
        const sectionsData: ArtistFanSectionData[] = [];
        
        for (const artist of topArtists) {
          try {
            // Lấy songs của artist, sort theo playCount desc
            const songsResponse = await artistsApi.getSongs(artist.artistId, {
              page: 0,
              size: 10,
              sort: "playCount,desc",
            });

            const songs = songsResponse?.content || [];
            
            // Nếu không có songs từ artist API, thử lấy từ songs API với artistId filter
            if (songs.length === 0) {
              const songsResponse2 = await songsApi.getAll({
                page: 0,
                size: 10,
                sort: "playCount,desc",
                artistId: artist.artistId,
              });
              
              if (songsResponse2?.content && songsResponse2.content.length > 0) {
                sectionsData.push({
                  artist,
                  songs: songsResponse2.content,
                });
              }
            } else {
              sectionsData.push({
                artist,
                songs,
              });
            }
          } catch (error) {
            console.error(`Error fetching songs for artist ${artist.artistName}:`, error);
          }
        }

        setSections(sectionsData);
      } catch (error) {
        console.error("Error fetching artist fan sections:", error);
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistFanSections();

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

  // Ẩn section này nếu không có token (guest) hoặc không có data
  const token = getAuthToken();
  if (!token || sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <section key={section.artist.artistId} className="mb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  For {section.artist.artistName} Fans
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hottest songs from {section.artist.artistName}
                </p>
              </div>
            </div>
            {section.songs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full"
                onClick={() => navigate(`/artist/${section.artist.artistId}`)}
              >
                View All
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
                ) : section.songs.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8">
                    No songs available from {section.artist.artistName}
                  </p>
                ) : (
                  section.songs.map((song) => {
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
      ))}
      
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

export default ArtistFanSection;

