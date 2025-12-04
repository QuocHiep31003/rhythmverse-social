import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music2, Waves, Zap, Coffee, Sun, Moon, Heart, Flame, LucideIcon, Play, Disc } from "lucide-react";
import { genresApi, moodsApi, songsApi, albumsApi } from "@/services/api";
import { GENRE_ICON_OPTIONS, MOOD_ICON_OPTIONS } from "@/data/iconOptions";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { getAuthToken } from "@/services/api/config";
import { useNavigate } from "react-router-dom";

interface GenreItem {
  name: string;
  icon: LucideIcon;
  color: string;
  count?: string;
  iconUrl?: string;
  iconKey?: string;
}

interface MoodItem {
  name: string;
  icon: LucideIcon;
  gradient: string;
  iconUrl?: string;
  gradientFromBackend?: string;
  iconKey?: string;
}

// Default icons as fallback
const defaultGenres: GenreItem[] = [
  { name: "Pop", icon: Heart, color: "bg-neon-pink", count: "2.1M songs" },
  { name: "Electronic", icon: Zap, color: "bg-neon-blue", count: "1.8M songs" },
  { name: "Hip Hop", icon: Flame, color: "bg-primary", count: "1.5M songs" },
  { name: "Rock", icon: Music2, color: "bg-neon-green", count: "2.3M songs" },
  { name: "Jazz", icon: Waves, color: "bg-accent", count: "890K songs" },
  { name: "Lo-Fi", icon: Coffee, color: "bg-muted-foreground", count: "650K songs" },
];

const defaultMoods: MoodItem[] = [
  { name: "Energetic", icon: Sun, gradient: "from-neon-pink to-primary" },
  { name: "Chill", icon: Moon, gradient: "from-neon-blue to-accent" },
  { name: "Focus", icon: Coffee, gradient: "from-neon-green to-primary" },
  { name: "Party", icon: Flame, gradient: "from-primary to-neon-pink" },
];

interface Album {
  id: number;
  name: string;
  title?: string;
  coverUrl?: string;
  cover?: string;
  artist?: { id: number; name: string } | string;
  releaseYear?: number;
  year?: number;
}

interface TopGenreMood {
  id: number;
  name: string;
  type: 'genre' | 'mood';
  count: number;
}

const GenreExplorer = () => {
  const navigate = useNavigate();
  const [topGenres, setTopGenres] = useState<(GenreItem & { id?: number; albums?: Album[] })[]>([]);
  const [topMoods, setTopMoods] = useState<(MoodItem & { id?: number; albums?: Album[] })[]>([]);
  const { setQueue, playSong } = useMusic();
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [loadingMoods, setLoadingMoods] = useState(false);
  const [historySongCount, setHistorySongCount] = useState<number>(0);
  const [shouldShow, setShouldShow] = useState(false);

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  // Kiểm tra số lượng bài hát trong lịch sử nghe
  useEffect(() => {
    const checkHistoryCount = async () => {
      const token = getAuthToken();
      if (!token || !userId) {
        setShouldShow(false);
        return;
      }

      try {
        // Lấy 100 bài hát gần nhất để đếm
        const history = await listeningHistoryApi.getByUser(userId, 0, 100);
        const count = history.content.filter(entry => entry.song).length;
        setHistorySongCount(count);
        setShouldShow(count < 10);
      } catch (error) {
        console.error("Error checking history count:", error);
        setShouldShow(false);
      }
    };

    checkHistoryCount();
  }, [userId]);

  // Lấy 4 genre/mood phổ biến nhất từ 100 bài hát gần nhất và albums của chúng
  useEffect(() => {
    if (!shouldShow || !userId || !getAuthToken()) {
      return;
    }

    const loadTopGenresAndMoods = async () => {
      try {
        // Lấy overview từ listening history để có genres và moods
        const overview = await listeningHistoryApi.getOverview(userId);
        
        // Lấy top 4 genres
        const top4Genres = (overview.genres || []).slice(0, 4);
        setLoadingGenres(true);
        
        const genresWithAlbums = await Promise.all(
          top4Genres.map(async (genre: { id: number; name: string; percentage: number }) => {
            try {
              // Lấy songs từ genre này để tìm albums
              const songsResponse = await songsApi.getAll({
                genreId: genre.id,
                page: 0,
                size: 50,
                status: "ACTIVE",
              });
              
              // Lấy albums từ songs (group by album)
              const albumMap = new Map<number, Album>();
              if (songsResponse?.content) {
                songsResponse.content.forEach((song: any) => {
                  if (song.album?.id && !albumMap.has(song.album.id)) {
                    albumMap.set(song.album.id, {
                      id: song.album.id,
                      name: song.album.name || song.album.title || "Unknown Album",
                      title: song.album.name || song.album.title,
                      coverUrl: song.album.coverUrl || song.album.cover || song.albumImageUrl,
                      cover: song.album.coverUrl || song.album.cover || song.albumImageUrl,
                      artist: song.album.artist || song.artists?.[0],
                      releaseYear: song.album.releaseYear || song.album.year,
                      year: song.album.releaseYear || song.album.year,
                    });
                  }
                });
              }
              
              const albums = Array.from(albumMap.values()).slice(0, 4);
              
              // Lấy icon cho genre
              const genreDetail = await genresApi.getById(genre.id).catch(() => null);
              const iconUrl = genreDetail?.iconUrl;
              const isPresetValue = iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('/');
              const preset = isPresetValue ? GENRE_ICON_OPTIONS.find((option) => option.value === iconUrl) : undefined;
              const fallback = defaultGenres[top4Genres.indexOf(genre) % defaultGenres.length] || defaultGenres[0];
              
              return {
                id: genre.id,
                name: genre.name,
                icon: preset?.icon || fallback.icon,
                color: preset?.badgeClass || fallback.color,
                iconUrl: preset ? undefined : (iconUrl && iconUrl.startsWith('http') ? iconUrl : undefined),
                iconKey: preset?.value,
                albums,
              };
            } catch (error) {
              console.error(`Error loading albums for genre ${genre.id}:`, error);
              const fallback = defaultGenres[top4Genres.indexOf(genre) % defaultGenres.length] || defaultGenres[0];
              return {
                id: genre.id,
                name: genre.name,
                icon: fallback.icon,
                color: fallback.color,
                albums: [],
              };
            }
          })
        );
        
        setTopGenres(genresWithAlbums);
        setLoadingGenres(false);
        
        // Lấy top 4 moods
        const top4Moods = (overview.moods || []).slice(0, 4);
        setLoadingMoods(true);
        
        const moodsWithAlbums = await Promise.all(
          top4Moods.map(async (mood: { id: number; name: string; percentage: number }) => {
            try {
              // Lấy songs từ mood này để tìm albums
              const songsResponse = await songsApi.getAll({
                moodId: mood.id,
                page: 0,
                size: 50,
                status: "ACTIVE",
              });
              
              // Lấy albums từ songs (group by album)
              const albumMap = new Map<number, Album>();
              if (songsResponse?.content) {
                songsResponse.content.forEach((song: any) => {
                  if (song.album?.id && !albumMap.has(song.album.id)) {
                    albumMap.set(song.album.id, {
                      id: song.album.id,
                      name: song.album.name || song.album.title || "Unknown Album",
                      title: song.album.name || song.album.title,
                      coverUrl: song.album.coverUrl || song.album.cover || song.albumImageUrl,
                      cover: song.album.coverUrl || song.album.cover || song.albumImageUrl,
                      artist: song.album.artist || song.artists?.[0],
                      releaseYear: song.album.releaseYear || song.album.year,
                      year: song.album.releaseYear || song.album.year,
                    });
                  }
                });
              }
              
              const albums = Array.from(albumMap.values()).slice(0, 4);
              
              // Lấy icon cho mood
              const moodDetail = await moodsApi.getById(mood.id).catch(() => null);
              const iconUrl = moodDetail?.iconUrl;
              const preset = MOOD_ICON_OPTIONS.find((option) => option.value === iconUrl);
              const fallback = defaultMoods[top4Moods.indexOf(mood) % defaultMoods.length] || defaultMoods[0];
              
              return {
                id: mood.id,
                name: mood.name,
                icon: preset?.icon || fallback.icon,
                gradient: preset?.gradientClass || moodDetail?.gradient || fallback.gradient || "from-neon-pink to-primary",
                iconUrl: preset ? undefined : (iconUrl && iconUrl.startsWith('http') ? iconUrl : undefined),
                iconKey: preset?.value,
                albums,
              };
            } catch (error) {
              console.error(`Error loading albums for mood ${mood.id}:`, error);
              const fallback = defaultMoods[top4Moods.indexOf(mood) % defaultMoods.length] || defaultMoods[0];
              return {
                id: mood.id,
                name: mood.name,
                icon: fallback.icon,
                gradient: fallback.gradient,
                albums: [],
              };
            }
          })
        );
        
        setTopMoods(moodsWithAlbums);
        setLoadingMoods(false);
      } catch (error) {
        console.error("Error loading top genres and moods:", error);
        setLoadingGenres(false);
        setLoadingMoods(false);
      }
    };

    loadTopGenresAndMoods();
  }, [shouldShow, userId]);

  // Handle play album từ genre (giống Discover)
  const handlePlayGenre = async (genreId: number | undefined) => {
    if (!genreId) return;
    
    try {
      setLoadingGenres(true);
      const songs = await songsApi.recommendByGenre(genreId, 50);
      if (songs && songs.length > 0) {
        // Shuffle và lấy random 1 bài để phát
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        const randomSong = shuffled[0];
        const playerSong = mapToPlayerSong(randomSong);
        
        // Set queue với 50 bài và phát ngẫu nhiên
        const playerSongs = shuffled.map(mapToPlayerSong);
        await setQueue(playerSongs);
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(playerSong, playSong);
      }
    } catch (error) {
      console.error("Error loading genre preview:", error);
    } finally {
      setLoadingGenres(false);
    }
  };

  // Handle play album từ mood (giống Discover)
  const handlePlayMood = async (moodId: number | undefined) => {
    if (!moodId) return;
    
    try {
      setLoadingMoods(true);
      const songs = await songsApi.recommendByMood(moodId, 50);
      if (songs && songs.length > 0) {
        // Shuffle và lấy random 1 bài để phát
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        const randomSong = shuffled[0];
        const playerSong = mapToPlayerSong(randomSong);
        
        // Set queue với 50 bài và phát ngẫu nhiên
        const playerSongs = shuffled.map(mapToPlayerSong);
        await setQueue(playerSongs);
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(playerSong, playSong);
      }
    } catch (error) {
      console.error("Error loading mood preview:", error);
    } finally {
      setLoadingMoods(false);
    }
  };

  // Handle play album
  const handlePlayAlbum = async (album: Album, genreId?: number, moodId?: number) => {
    try {
      // Lấy songs của album
      const albumDetail = await albumsApi.getById(album.id);
      if (albumDetail?.songs && albumDetail.songs.length > 0) {
        const songs = albumDetail.songs.map((s: any) => mapToPlayerSong(s));
        await setQueue(songs);
        if (songs.length > 0) {
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songs[0], playSong);
        }
      } else {
        // Nếu album không có songs, fallback về play từ genre/mood
        if (genreId) {
          await handlePlayGenre(genreId);
        } else if (moodId) {
          await handlePlayMood(moodId);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
      // Fallback về play từ genre/mood
      if (genreId) {
        await handlePlayGenre(genreId);
      } else if (moodId) {
        await handlePlayMood(moodId);
      }
    }
  };

  const getArtistName = (artist: Album["artist"]): string => {
    if (typeof artist === 'string') return artist;
    if (artist && typeof artist === 'object' && 'name' in artist) return artist.name;
    return "Unknown Artist";
  };

  // Ẩn section này nếu không đủ điều kiện
  if (!shouldShow || !getAuthToken() || (!topGenres.length && !topMoods.length)) {
    return null;
  }

  return (
    <section id="genres-section" className="bg-gradient-to-br from-background to-music-dark">
      <div className="container px-6">
        {/* Genre Grid - Hiển thị 4 albums từ 4 genre phổ biến nhất */}
        {topGenres.length > 0 && (
          <div className="mb-16 pt-12">
            <h3 className="text-2xl font-semibold mb-8 text-center">Browse by Genre</h3>
            {loadingGenres ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-card/50 border-border/40">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted/20 rounded-t-lg animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted/20 rounded animate-pulse" />
                        <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topGenres.map((genre) => {
                  const Icon = genre.icon;
                  return (
                    <div key={genre.id} className="space-y-4">
                      {/* Genre Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 ${genre.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {genre.iconUrl ? (
                            <img src={genre.iconUrl} alt={genre.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <Icon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground">{genre.name}</h4>
                      </div>
                      
                      {/* Albums Grid */}
                      {genre.albums && genre.albums.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {genre.albums.map((album) => (
                            <Card
                              key={album.id}
                              className="group bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-white/20 transition-all cursor-pointer"
                              onClick={() => handlePlayAlbum(album, genre.id)}
                            >
                              <CardContent className="p-0">
                                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                  {album.coverUrl || album.cover ? (
                                    <img
                                      src={album.coverUrl || album.cover}
                                      alt={album.name || album.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-music.png';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                                      <Disc className="w-12 h-12 text-white" />
                                    </div>
                                  )}
                                  
                                  {/* Play button overlay */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      size="icon"
                                      className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayAlbum(album, genre.id);
                                      }}
                                    >
                                      <Play className="w-6 h-6 ml-1 text-white" fill="white" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <h5 className="font-medium text-sm truncate mb-1 group-hover:text-primary transition-colors">
                                    {album.name || album.title || "Unknown Album"}
                                  </h5>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {getArtistName(album.artist)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Không có album</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mood Explorer - Hiển thị 4 albums từ 4 mood phổ biến nhất */}
        {topMoods.length > 0 && (
          <div className="mb-16">
            <h3 className="text-2xl font-semibold mb-8 text-center">Music for Every Mood</h3>
            {loadingMoods ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-card/50 border-border/40">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted/20 rounded-t-lg animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted/20 rounded animate-pulse" />
                        <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topMoods.map((mood) => {
                  const Icon = mood.icon;
                  return (
                    <div key={mood.id} className="space-y-4">
                      {/* Mood Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 bg-gradient-to-br ${mood.gradient} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {mood.iconUrl ? (
                            <img src={mood.iconUrl} alt={mood.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <Icon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground">{mood.name}</h4>
                      </div>
                      
                      {/* Albums Grid */}
                      {mood.albums && mood.albums.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {mood.albums.map((album) => (
                            <Card
                              key={album.id}
                              className="group bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-white/20 transition-all cursor-pointer"
                              onClick={() => handlePlayAlbum(album, undefined, mood.id)}
                            >
                              <CardContent className="p-0">
                                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                  {album.coverUrl || album.cover ? (
                                    <img
                                      src={album.coverUrl || album.cover}
                                      alt={album.name || album.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-music.png';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                                      <Disc className="w-12 h-12 text-white" />
                                    </div>
                                  )}
                                  
                                  {/* Play button overlay */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      size="icon"
                                      className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayAlbum(album, undefined, mood.id);
                                      }}
                                    >
                                      <Play className="w-6 h-6 ml-1 text-white" fill="white" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <h5 className="font-medium text-sm truncate mb-1 group-hover:text-primary transition-colors">
                                    {album.name || album.title || "Unknown Album"}
                                  </h5>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {getArtistName(album.artist)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Không có album</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default GenreExplorer;