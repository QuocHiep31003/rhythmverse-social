import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { createSlug } from "@/utils/playlistUtils";

interface Album {
  id: number | string;
  name?: string;
  title?: string;
  artist?: { id: number | string; name?: string } | string;
  coverUrl?: string;
  cover?: string;
  releaseDate?: string;
  songs?: any[];
  tracks?: number;
  releaseYear?: number;
}

const NewAlbums = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await albumsApi.getAll({ page: 0, size: 10, sort: "id,desc" }); // Lấy nhiều hơn để scroll
        setAlbums(res?.content || []);
      } catch (error) {
        console.error("Error fetching albums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const getArtistName = (artist: any): string => {
    if (typeof artist === 'string') return artist;
    if (artist?.name) return artist.name;
    return "Unknown Artist";
  };

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Album mới phát hành</h2>
      </div>

      {/* Horizontal scrolling container */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {loading ? (
              <div className="flex gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[180px] flex-shrink-0">
                    <div className="aspect-square bg-muted/20 rounded-lg animate-pulse mb-3" />
                    <div className="h-4 bg-muted/20 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted/20 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : albums.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8">Không có album nào.</p>
            ) : (
              albums.map((album) => {
                const artistName = getArtistName(album.artist);
                const albumName = album.name || album.title || "Unknown Album";
                const coverImage = album.coverUrl || album.cover;
                const releaseYear = album.releaseYear || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : null);

                return (
                  <div
                    key={album.id}
                    className="w-[180px] flex-shrink-0 group cursor-pointer"
                    onClick={() => navigate(`/album/${createSlug(albumName, album.id)}`)}
                  >
                    {/* Cover Art */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-subtle mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={albumName}
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
                            navigate(`/album/${createSlug(albumName, album.id)}`);
                          }}
                        >
                          <Play className="w-6 h-6 ml-1 text-white" fill="white" />
                        </Button>
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="min-h-[60px]">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {albumName}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {artistName}
                        {releaseYear && ` • ${releaseYear}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewAlbums;
