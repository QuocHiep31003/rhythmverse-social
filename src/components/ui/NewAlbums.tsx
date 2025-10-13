import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Play } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";

interface Album {
  id: number;
  name: string;
  artist?: {
    id: number;
    name: string;
  };
  coverUrl?: string;
  releaseDate?: string;
  songs?: any[];
}

const NewAlbums = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await albumsApi.getAll({ page: 0, size: 6, sort: "id,desc" }); // ✅ lấy album mới nhất
        setAlbums(res?.content || []);
      } catch (error) {
        console.error("Error fetching albums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5 text-neon-blue" />
          New Albums
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && (
          <p className="text-muted-foreground text-sm">Loading albums...</p>
        )}

        {!loading && albums.length === 0 && (
          <p className="text-muted-foreground text-sm">No albums found.</p>
        )}

        {!loading &&
          albums.map((album) => (
            <div
              key={album.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer"
              onClick={() => navigate(`/album/${album.id}`)} // ✅ nhấn để chuyển sang chi tiết album
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-subtle">
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-6 h-6 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{album.name}</p>
                <p className="text-xs text-muted-foreground">
                  by {album.artist?.name || "Unknown Artist"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {album.songs?.length || 0} tracks
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/album/${album.id}`);
                }}
              >
                <Play className="w-3 h-3" />
              </Button>
            </div>
          ))}

        <Button
          variant="outline"
          className="w-full mt-4"
          size="sm"
          onClick={() => navigate("/discover")}
        >
          Browse All Albums
        </Button>
      </CardContent>
    </Card>
  );
};

export default NewAlbums;
