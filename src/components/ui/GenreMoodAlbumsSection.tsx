import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Play, Disc } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { songsApi } from "@/services/api";
import { getAuthToken } from "@/services/api/config";
import type { Song } from "@/services/api/songApi";

interface GenreMoodAlbum {
  id: string;
  title: string;
  genreId: number;
  genreName: string;
  moodId: number;
  moodName: string;
  songs: Song[];
  coverImage?: string;
}

const GenreMoodAlbumsSection = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [albums, setAlbums] = useState<GenreMoodAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  useEffect(() => {
    const fetchGenreMoodAlbums = async () => {
      const token = getAuthToken();
      if (!token || !userId) {
        setLoading(false);
        setAlbums([]);
        return;
      }

      try {
        setLoading(true);

        // Lấy overview để có genres và moods từ lịch sử nghe
        const overview = await listeningHistoryApi.getOverview(userId);
        
        if (!overview || (!overview.genres || overview.genres.length === 0) || 
            (!overview.moods || overview.moods.length === 0)) {
          console.log("⚠️ No genre/mood data from listening history");
          setAlbums([]);
          setLoading(false);
          return;
        }

        // Lấy top 3 genres và top 3 moods
        const topGenres = overview.genres
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 3);
        
        const topMoods = overview.moods
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 3);

        // Tạo 5 albums mix từ genres và moods
        const albumPromises: Promise<GenreMoodAlbum | null>[] = [];
        
        // Mix 1: Top genre + Top mood
        if (topGenres.length > 0 && topMoods.length > 0) {
          albumPromises.push(
            createGenreMoodAlbum(topGenres[0], topMoods[0], 0)
          );
        }

        // Mix 2: Top genre + Second mood
        if (topGenres.length > 0 && topMoods.length > 1) {
          albumPromises.push(
            createGenreMoodAlbum(topGenres[0], topMoods[1], 1)
          );
        }

        // Mix 3: Second genre + Top mood
        if (topGenres.length > 1 && topMoods.length > 0) {
          albumPromises.push(
            createGenreMoodAlbum(topGenres[1], topMoods[0], 2)
          );
        }

        // Mix 4: Second genre + Second mood
        if (topGenres.length > 1 && topMoods.length > 1) {
          albumPromises.push(
            createGenreMoodAlbum(topGenres[1], topMoods[1], 3)
          );
        }

        // Mix 5: Third genre + Third mood (hoặc top nếu không đủ)
        const genreIndex = topGenres.length > 2 ? 2 : (topGenres.length > 1 ? 1 : 0);
        const moodIndex = topMoods.length > 2 ? 2 : (topMoods.length > 1 ? 1 : 0);
        if (topGenres.length > 0 && topMoods.length > 0) {
          albumPromises.push(
            createGenreMoodAlbum(topGenres[genreIndex], topMoods[moodIndex], 4)
          );
        }

        const results = await Promise.all(albumPromises);
        const validAlbums = results.filter((album): album is GenreMoodAlbum => album !== null);
        
        setAlbums(validAlbums.slice(0, 5));
      } catch (error) {
        console.error("Error fetching genre/mood albums:", error);
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGenreMoodAlbums();
  }, [userId]);

  const createGenreMoodAlbum = async (
    genre: { id: number; name: string },
    mood: { id: number; name: string },
    index: number
  ): Promise<GenreMoodAlbum | null> => {
    try {
      // Lấy bài hát theo genre và mood
      const [genreSongs, moodSongs] = await Promise.all([
        songsApi.recommendByGenre(genre.id, 20),
        songsApi.recommendByMood(mood.id, 20),
      ]);

      // Mix bài hát: lấy bài hát có cả genre và mood, hoặc mix từ cả hai
      const mixedSongs: Song[] = [];
      const songIds = new Set<number | string>();

      // Ưu tiên bài hát có cả genre và mood từ danh sách genreSongs
      genreSongs.forEach(song => {
        if (song.moodIds && song.moodIds.includes(mood.id)) {
          if (!songIds.has(song.id)) {
            mixedSongs.push(song);
            songIds.add(song.id);
          }
        }
      });

      // Thêm bài hát từ moodSongs có genre phù hợp
      moodSongs.forEach(song => {
        if (song.genreIds && song.genreIds.includes(genre.id)) {
          if (!songIds.has(song.id)) {
            mixedSongs.push(song);
            songIds.add(song.id);
          }
        }
      });

      // Thêm bài hát từ genre nếu chưa đủ
      genreSongs.forEach(song => {
        if (mixedSongs.length < 15 && !songIds.has(song.id)) {
          mixedSongs.push(song);
          songIds.add(song.id);
        }
      });

      // Thêm bài hát từ mood nếu chưa đủ
      moodSongs.forEach(song => {
        if (mixedSongs.length < 15 && !songIds.has(song.id)) {
          mixedSongs.push(song);
          songIds.add(song.id);
        }
      });

      if (mixedSongs.length === 0) {
        return null;
      }

      // Lấy cover image từ bài hát đầu tiên
      const coverImage = mixedSongs[0]?.albumImageUrl || 
                        mixedSongs[0]?.albumCoverImg || 
                        mixedSongs[0]?.urlImageAlbum || 
                        mixedSongs[0]?.cover;

      return {
        id: `genre-${genre.id}-mood-${mood.id}`,
        title: `${genre.name} + ${mood.name}`,
        genreId: genre.id,
        genreName: genre.name,
        moodId: mood.id,
        moodName: mood.name,
        songs: mixedSongs.slice(0, 15),
        coverImage,
      };
    } catch (error) {
      console.error(`Error creating album for ${genre.name} + ${mood.name}:`, error);
      return null;
    }
  };

  const handlePlayAlbum = async (album: GenreMoodAlbum) => {
    if (album.songs.length === 0) return;
    
    try {
      const songs = album.songs.map(song => mapToPlayerSong(song));
      await setQueue(songs);
      if (songs.length > 0) {
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(songs[0], playSong);
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const getInitials = (text: string): string => {
    const words = text.split(/[\s+]/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  // Ẩn section này nếu không có token (guest)
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  if (loading) {
    return (
      <section className="mb-12">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Disc className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Genre & Mood Mix</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Albums được tạo dựa trên thể loại và tâm trạng bạn thường nghe
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-transparent border-none h-full flex flex-col">
              <CardContent className="p-0 flex flex-col flex-1">
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <div className="w-full h-full bg-[#181818] dark:bg-white/5 animate-pulse" />
                </div>
                <div className="px-1 pt-2 min-w-0">
                  <div className="h-4 bg-[#181818] dark:bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-[#181818] dark:bg-white/5 rounded w-3/4 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (albums.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Disc className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Genre & Mood Mix</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Albums được tạo dựa trên thể loại và tâm trạng bạn thường nghe
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {albums.map((album, index) => {
          const albumNumericId = index % 6;
          const gradientClass = [
            "from-[#4b5563] via-[#6b7280] to-[#111827]",
            "from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
            "from-[#fb7185] via-[#f97316] to-[#b91c1c]",
            "from-[#a855f7] via-[#8b5cf6] to-[#4c1d95]",
            "from-[#22c55e] via-[#16a34a] to-[#14532d]",
            "from-[#f97316] via-[#ef4444] to-[#7c2d12]",
          ][albumNumericId];

          const initials = getInitials(album.title);

          return (
            <Card 
              key={album.id}
              className="bg-transparent border-none transition-all duration-300 group h-full flex flex-col hover:scale-[1.01] cursor-pointer"
              onClick={() => handlePlayAlbum(album)}
            >
              <CardContent className="p-0 flex flex-col flex-1">
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  {/* Ảnh cover nếu có, nếu không dùng gradient với chữ */}
                  {album.coverImage ? (
                    <>
                      <img
                        src={album.coverImage}
                        alt={album.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />
                    </>
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
                    />
                  )}
                  
                  <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                        Mix
                      </p>
                      <h3 className="text-2xl font-semibold text-white leading-tight line-clamp-3">
                        {album.title}
                      </h3>
                    </div>

                    {/* Hiển thị chữ initials nếu không có cover image */}
                    {!album.coverImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                          <span className="text-3xl font-bold text-white">{initials}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="truncate">
                        {album.songs.length > 0
                          ? `${album.songs.length} bài hát`
                          : "Mix"}
                      </span>
                    </div>

                    {/* Nút Play ở giữa card khi hover */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        className="pointer-events-auto w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 shadow-xl"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePlayAlbum(album);
                        }}
                      >
                        <Play className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-2 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {album.genreName} • {album.moodName}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default GenreMoodAlbumsSection;

