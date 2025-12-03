import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Play, Calendar, Disc } from "lucide-react";
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
  songCount?: number;
  releaseYear?: number;
}

const NewAlbums = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await albumsApi.getAll({ page: 0, size: 6, sort: "id,desc" }); // Lấy 6 albums cho grid
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

      {/* Grid Layout - Different from songs */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-muted/20 rounded-t-lg animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted/20 rounded animate-pulse mb-2" />
                  <div className="h-4 bg-muted/20 rounded w-3/4 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No albums available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => {
            const artistName = getArtistName(album.artist);
            const albumName = album.name || album.title || "Unknown Album";
            const coverImage = album.coverUrl || album.cover;
            const releaseYear = album.releaseYear || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : null);
            const trackCount = getTrackCount(album);

            return (
              <Card
                key={album.id}
                className="group bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-glow cursor-pointer overflow-hidden"
                onClick={() => navigate(`/album/${createSlug(albumName, album.id)}`)}
              >
                <CardContent className="p-0">
                  {/* Cover Art - Larger aspect ratio for albums */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={albumName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Play button overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        size="icon"
                        className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-2xl scale-90 group-hover:scale-100 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/album/${createSlug(albumName, album.id)}`);
                        }}
                      >
                        <Play className="w-7 h-7 ml-1 text-white" fill="white" />
                      </Button>
                    </div>

                    {/* Badge overlay */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white border-white/20">
                        <Disc className="w-3 h-3 mr-1" />
                        Album
                      </Badge>
                    </div>
                  </div>

                  {/* Album Info - More detailed */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {albumName}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {artistName}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      {releaseYear && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{releaseYear}</span>
                        </div>
                      )}
                      {trackCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          <span>{trackCount} {trackCount === 1 ? 'track' : 'tracks'}</span>
                        </div>
                      )}
                    </div>
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
