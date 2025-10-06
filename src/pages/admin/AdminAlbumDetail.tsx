import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Music, Play, Pause } from "lucide-react";
import { albumsApi, songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";

const AdminAlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = useMusic();
  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbumDetail();
  }, [id]);

  const loadAlbumDetail = async () => {
    try {
      setLoading(true);
      const albumData = await albumsApi.getById(id!);
      setAlbum(albumData);
      
      // Load all songs and filter by album
      const allSongs = await songsApi.getAll();
      const albumSongs = allSongs.filter((song: any) => song.album === albumData.title);
      setSongs(albumSongs);
    } catch (error) {
      console.error("Error loading album:", error);
      toast({ title: "Error loading album", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayClick = (song: any) => {
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-6">
        <div className="text-center">Album not found</div>
      </div>
    );
  }

  const placeholderImage = "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop";

  return (
    <div className="p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/albums")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Albums
      </Button>

      <Card className="p-6">
        <div className="flex gap-6 mb-6">
          <img
            src={album.coverUrl || placeholderImage}
            alt={album.title}
            className="w-48 h-48 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{album.title}</h1>
            <p className="text-lg text-muted-foreground mb-2">{album.artist}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Released: {album.releaseYear}</span>
              <span>•</span>
              <span>{songs.length} songs</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-4">Songs</h2>
          {songs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No songs in this album
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-muted-foreground w-8">{index + 1}</span>
                  <img
                    src={song.coverUrl || placeholderImage}
                    alt={song.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{song.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {song.artists?.map((a: any) => a.name).join(", ") || song.artist}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{song.genre}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePlayClick(song)}
                  >
                    {currentSong?.id === song.id && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminAlbumDetail;
