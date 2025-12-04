import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Play, Disc } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { createSlug } from "@/utils/playlistUtils";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";

interface Album {
  id: number | string;
  name?: string;
  title?: string;
  artist?: { id: number | string; name?: string } | string;
  coverUrl?: string;
  cover?: string;
  releaseDate?: string;
  songs?: Array<{ id: number | string; [key: string]: unknown }>;
  tracks?: number;
  songCount?: number;
  releaseYear?: number;
}

const NewAlbums = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        // Lấy albums mới nhất dựa trên releaseDate (ngày phát hành)
        const res = await albumsApi.getAll({ page: 0, size: 6, sort: "releaseDate,desc" });
        setAlbums(res?.content || []);
      } catch (error) {
        console.error("Error fetching albums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const handlePlayAlbum = async (album: Album) => {
    try {
      // Lấy songs của album
      const albumDetail = await albumsApi.getById(album.id);
      if (albumDetail?.songs && albumDetail.songs.length > 0) {
        const songs = albumDetail.songs.map((s: { id: number | string; [key: string]: unknown }) => mapToPlayerSong(s));
        await setQueue(songs);
        if (songs.length > 0) {
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(songs[0], playSong);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const getArtistName = (artist: { id?: number | string; name?: string } | string | undefined): string => {
    if (typeof artist === 'string') return artist;
    if (artist?.name) return artist.name;
    return "Unknown Artist";
  };

  const getTrackCount = (album: Album): number => {
    return album.songCount || album.tracks || album.songs?.length || 0;
  };

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Disc className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">New Albums</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Discover complete collections from your favorite artists
        </p>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
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
      ) : albums.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No albums available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums.map((album) => {
            const artistName = getArtistName(album.artist);
            const albumName = album.name || album.title || "Unknown Album";
            const coverImage = album.coverUrl || album.cover;
            const albumNumericId = typeof album.id === "number" && Number.isFinite(album.id) 
              ? album.id 
              : typeof album.id === "string" 
                ? (() => { const parsed = Number(album.id); return Number.isFinite(parsed) ? parsed : undefined; })()
                : undefined;

            // Gradient giống playlist card để đồng bộ style
            const gradientIndex = ((albumNumericId ?? 0) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
            const gradientClass = [
              "from-[#4b5563] via-[#6b7280] to-[#111827]",
              "from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
              "from-[#fb7185] via-[#f97316] to-[#b91c1c]",
              "from-[#a855f7] via-[#8b5cf6] to-[#4c1d95]",
              "from-[#22c55e] via-[#16a34a] to-[#14532d]",
              "from-[#f97316] via-[#ef4444] to-[#7c2d12]",
            ][gradientIndex];

            const albumSlug = createSlug(albumName, album.id);
            const albumUrl = `/album/${albumSlug}`;

            return (
              <Card 
                key={album.id}
                className="bg-transparent border-none transition-all duration-300 group h-full flex flex-col hover:scale-[1.01] cursor-pointer"
                onClick={() => navigate(albumUrl)}
              >
                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="relative aspect-square rounded-2xl overflow-hidden">
                    {/* Ảnh cover nếu có, nếu không dùng gradient giống playlist */}
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={albumName}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

                    <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                          Album
                        </p>
                        <h3 className="text-2xl font-semibold text-white leading-tight line-clamp-3">
                          {albumName}
                        </h3>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="truncate">
                          {getTrackCount(album) > 0
                            ? `${getTrackCount(album)} bài hát`
                            : "Album"}
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
                      {artistName}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default NewAlbums;
