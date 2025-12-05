import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, Heart, MoreHorizontal, ListPlus } from "lucide-react";
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
import { useFavoriteSong } from "@/hooks/useFavorites";

interface SongCardItemProps {
  song: Song;
  onPlay: (song: Song) => void;
  onAddToPlaylist: (songId: string | number, title: string, cover?: string) => void;
  onAddToQueue: (song: Song) => void;
}

const SongCardItem = ({ song, onPlay, onAddToPlaylist, onAddToQueue }: SongCardItemProps) => {
  const songName = song.songName || song.name || "Unknown Song";
  const artistName = typeof song.artists === 'string' ? song.artists : 
    (Array.isArray(song.artists) ? song.artists.map(a => a?.name).filter(Boolean).join(", ") : "Unknown Artist");
  const coverImage = song.albumImageUrl || song.albumCoverImg || song.urlImageAlbum || song.cover;
  const songId = song.id;
  const numericSongId = typeof songId === 'number' ? songId : (typeof songId === 'string' ? Number(songId) : undefined);
  const favoriteHook = useFavoriteSong(numericSongId, { disableToast: false });

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onPlay(song)}
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
              onPlay(song);
            }}
          >
            <Play className="w-6 h-6 ml-1 text-white" fill="white" />
          </Button>
        </div>
        
        {/* Heart và Menu 3 chấm */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="glass"
            size="icon"
            className={`rounded-full w-9 h-9 bg-black/55 hover:bg-black/70 border border-white/20 ${favoriteHook.isFavorite ? 'text-red-500' : ''}`}
            onClick={async (e) => {
              e.stopPropagation();
              await favoriteHook.toggleFavorite();
            }}
            disabled={favoriteHook.pending || !numericSongId}
          >
            <Heart className={`h-5 w-5 ${favoriteHook.isFavorite ? 'fill-current' : ''}`} />
          </Button>
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

      {/* Song Info */}
      <div className="min-h-[60px]">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {songName}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {artistName}
        </p>
      </div>
    </div>
  );
};

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
        let topArtists = await listeningHistoryApi.getTopArtists(userId, 3);
        
        // Nếu không có data từ listening history, lấy random artists làm fallback
        if (topArtists.length === 0) {
          console.log("⚠️ No listening history, fetching random artists as fallback...");
          try {
            const randomArtistsResponse = await artistsApi.getAll({
              page: 0,
              size: 3,
              sort: "id,desc", // Lấy artists mới nhất
            });
            if (randomArtistsResponse?.content && randomArtistsResponse.content.length > 0) {
              const randomArtists = randomArtistsResponse.content.map((artist) => ({
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
          setSections([]);
          setLoading(false);
          return;
        }

        // Với mỗi artist, lấy các bài hát có playCount cao nhất
        const sectionsData: ArtistFanSectionData[] = [];
        
        for (const artist of topArtists) {
          try {
            // Lấy 50 songs của artist, sort theo playCount desc
            const songsResponse = await artistsApi.getSongs(artist.artistId, {
              page: 0,
              size: 50,
              sort: "playCount,desc",
            });

            let songs = songsResponse?.content || [];
            
            // Nếu không có songs từ artist API, thử lấy từ songs API với artistId filter
            if (songs.length === 0) {
              const songsResponse2 = await songsApi.getAll({
                page: 0,
                size: 50,
                sort: "playCount,desc",
                artistId: artist.artistId,
              });
              
              if (songsResponse2?.content && songsResponse2.content.length > 0) {
                songs = songsResponse2.content;
              }
            }

            // Nếu vẫn không có songs, lấy random songs làm fallback
            if (songs.length === 0) {
              console.log(`⚠️ No songs from artist ${artist.artistName}, fetching random songs as fallback...`);
              try {
                const randomSongsResponse = await songsApi.getPublic({
                  page: 0,
                  size: 50,
                  sort: "playCount,desc",
                });
                if (randomSongsResponse?.content && randomSongsResponse.content.length > 0) {
                  songs = randomSongsResponse.content;
                }
              } catch (fallbackError) {
                console.error("Error fetching fallback songs:", fallbackError);
              }
            }

            // Chỉ thêm section nếu có songs
            if (songs.length > 0) {
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

  const handlePlaySong = async (song: Song, allSongs: Song[]) => {
    const playerSong = mapToPlayerSong(song);
    // Set queue với tất cả 50 bài của artist
    const allPlayerSongs = allSongs.map(s => mapToPlayerSong(s));
    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(playerSong, playSong);
  };

  const handlePlayAll = async (allSongs: Song[]) => {
    if (allSongs.length === 0) return;
    const allPlayerSongs = allSongs.map(s => mapToPlayerSong(s));
    await setQueue(allPlayerSongs);
    const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
    await playSongWithStreamUrl(allPlayerSongs[0], playSong);
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

  // Tính toán displayedSongs cho mỗi section - phải đặt trước early return để tuân thủ Rules of Hooks
  const sectionsWithDisplayedSongs = useMemo(() => {
    return sections.map(section => {
      let displayedSongs = section.songs;
      if (section.songs.length > 9) {
        const shuffled = [...section.songs].sort(() => Math.random() - 0.5);
        displayedSongs = shuffled.slice(0, 9);
      }
      return { ...section, displayedSongs };
    });
  }, [sections]);

  // Ẩn section này nếu không có token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  // Hiển thị skeleton khi đang loading
  if (loading) {
    return (
      <>
        {[...Array(3)].map((_, sectionIndex) => (
          <section key={`skeleton-${sectionIndex}`} className="mb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    For fans
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Hottest songs
                  </p>
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
        ))}
      </>
    );
  }

  // Nếu không có sections, return null
  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      {sectionsWithDisplayedSongs.map((section) => (
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
                variant="secondary"
                size="sm"
                className="rounded-full gap-2 text-[13px]"
                onClick={() => handlePlayAll(section.songs)}
              >
                <Play className="w-4 h-4" />
                Phát tất cả
              </Button>
            )}
          </div>

          {/* Grid 3x3 */}
          <div className="grid grid-cols-3 gap-4">
            {section.displayedSongs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 col-span-3">
                No songs available from {section.artist.artistName}
              </p>
            ) : (
              section.displayedSongs.map((song) => (
                <SongCardItem
                  key={song.id}
                  song={song}
                  onPlay={(song) => handlePlaySong(song, section.songs)}
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
              ))
            )}
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

