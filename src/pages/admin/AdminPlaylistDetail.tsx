import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Music, Play, Pause } from "lucide-react";
import { playlistsApi, songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { toast } from "@/hooks/use-toast";

const AdminPlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = useMusic();
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylistDetail();
  }, [id]);

  const loadPlaylistDetail = async () => {
    try {
      setLoading(true);
      const playlistData = await playlistsApi.getById(id!);
      setPlaylist(playlistData);
      
      // Load all songs and filter by playlist
      const allSongs = await songsApi.getAll();
      // In a real app, you'd have a songs-by-playlist endpoint
      setSongs(allSongs.slice(0, 5)); // Mock: show first 5 songs
    } catch (error) {
      console.error("Error loading playlist:", error);
      toast({ title: "Error loading playlist", variant: "destructive" });
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

  if (!playlist) {
    return (
      <div className="p-6">
        <div className="text-center">Playlist not found</div>
      </div>
    );
  }

  const placeholderImage = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop";

  return (
    <div className="p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/playlists")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Playlists
      </Button>

      <Card className="p-6">
        <div className="flex gap-6 mb-6">
          <img
            src={playlist.coverUrl || placeholderImage}
            alt={playlist.name}
            className="w-48 h-48 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
            <p className="text-muted-foreground mb-4">{playlist.description}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{songs.length} songs</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-4">Songs</h2>
          {songs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No songs in this playlist
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
                    alt={song.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{song.title}</div>
                    <div className="text-sm text-muted-foreground">{song.artist}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{song.album}</div>
                  <div className="text-sm text-muted-foreground">{song.duration}</div>
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

export default AdminPlaylistDetail;
