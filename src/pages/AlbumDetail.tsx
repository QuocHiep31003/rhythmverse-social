import { useState } from "react";
import { useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Heart, 
  MoreHorizontal,
  Clock,
  Calendar,
  Music,
  User
} from "lucide-react";

const AlbumDetail = () => {
  const { id } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  // Mock album data
  const album = {
    id: id || "1",
    title: "Midnight Dreams",
    artist: "Luna Eclipse",
    artistId: "artist-1",
    cover: "/placeholder-album.jpg",
    releaseDate: "2024-01-15",
    genre: "Alternative Rock",
    duration: "42:35",
    totalTracks: 12,
    description: "A journey through dreams and nighttime reflections, featuring ethereal melodies and introspective lyrics."
  };

  const songs = [
    { id: "1", title: "Moonlight Serenade", artist: "Luna Eclipse", duration: "3:45", explicit: false },
    { id: "2", title: "City Lights", artist: "Luna Eclipse", duration: "4:12", explicit: false },
    { id: "3", title: "Midnight Train", artist: "Luna Eclipse", duration: "3:28", explicit: true },
    { id: "4", title: "Dream Catcher", artist: "Luna Eclipse", duration: "4:55", explicit: false },
    { id: "5", title: "Neon Nights", artist: "Luna Eclipse", duration: "3:33", explicit: false },
    { id: "6", title: "Silent Storm", artist: "Luna Eclipse", duration: "4:18", explicit: false },
    { id: "7", title: "Starfall", artist: "Luna Eclipse", duration: "3:52", explicit: false },
    { id: "8", title: "Electric Dreams", artist: "Luna Eclipse", duration: "4:07", explicit: false },
    { id: "9", title: "Cosmic Dance", artist: "Luna Eclipse", duration: "3:15", explicit: false },
    { id: "10", title: "Aurora", artist: "Luna Eclipse", duration: "5:23", explicit: false },
    { id: "11", title: "Twilight", artist: "Luna Eclipse", duration: "3:41", explicit: false },
    { id: "12", title: "Dawn", artist: "Luna Eclipse", duration: "4:06", explicit: false }
  ];

  const toggleLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const playSong = (songId: string) => {
    // Handle play song logic
    console.log("Playing song:", songId);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      
      <div className="pt-6 pb-24 container mx-auto px-4">
        {/* Album Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="w-full md:w-80 h-80 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Music className="w-32 h-32 text-white" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">Album</Badge>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {album.title}
              </h1>
              <div className="flex items-center gap-2 text-lg mb-4">
                <a 
                  href={`/artist/${album.artistId}`}
                  className="font-medium hover:text-primary transition-colors cursor-pointer"
                >
                  {album.artist}
                </a>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{new Date(album.releaseDate).getFullYear()}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{album.totalTracks} songs</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{album.duration}</span>
              </div>
              <p className="text-muted-foreground max-w-2xl">{album.description}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="hero" size="lg" className="rounded-full px-8">
                <Play className="w-5 h-5 mr-2" />
                Play Album
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <Heart className="w-5 h-5" />
              </Button>
              <ShareButton title={album.title} type="album" />
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 border-b border-border/20 text-sm text-muted-foreground">
              <div className="text-center">#</div>
              <div>Title</div>
              <div className="hidden sm:block text-center">
                <Calendar className="w-4 h-4 mx-auto" />
              </div>
              <div className="flex justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div className="w-8"></div>
            </div>
            
            {songs.map((song, index) => (
              <div
                key={song.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 hover:bg-white/5 group transition-colors cursor-pointer"
                onClick={() => playSong(song.id)}
              >
                <div className="flex items-center justify-center text-muted-foreground group-hover:hidden">
                  {index + 1}
                </div>
                <div className="hidden group-hover:flex items-center justify-center">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{song.title}</p>
                      {song.explicit && (
                        <Badge variant="outline" className="text-xs px-1 py-0">E</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                </div>
                
                <div className="hidden sm:flex items-center justify-center text-sm text-muted-foreground">
                  {new Date(album.releaseDate).toLocaleDateString()}
                </div>
                
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                  {song.duration}
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                  >
                    <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <ShareButton title={song.title} type="song" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* More from Artist */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">More from {album.artist}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-gradient-accent mb-4 flex items-center justify-center">
                    <Music className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2 truncate">Another Album</h3>
                  <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                  <p className="text-xs text-muted-foreground">2023</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AlbumDetail;