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
  Users,
  MapPin,
  Calendar,
  Music,
  User
} from "lucide-react";

const ArtistDetail = () => {
  const { id } = useParams();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  // Mock artist data
  const artist = {
    id: id || "1",
    name: "Luna Eclipse",
    avatar: "/placeholder-artist.jpg",
    followers: "2.4M",
    monthlyListeners: "1.8M",
    location: "Los Angeles, CA",
    genres: ["Alternative Rock", "Indie Pop", "Electronic"],
    bio: "Luna Eclipse is an innovative artist blending ethereal melodies with modern electronic elements. Known for introspective lyrics and atmospheric soundscapes that transport listeners to otherworldly realms.",
    verified: true
  };

  // Mock songs data (sorted by newest to oldest)
  const popularSongs = [
    { id: "1", title: "Midnight Dreams", artist: "Luna Eclipse", duration: "3:45", releaseDate: "2024-03-15", streams: "15.2M", explicit: false },
    { id: "2", title: "Cosmic Journey", artist: "Luna Eclipse", duration: "4:12", releaseDate: "2024-02-28", streams: "12.8M", explicit: false },
    { id: "3", title: "Neon Lights", artist: "Luna Eclipse", duration: "3:28", releaseDate: "2024-01-20", streams: "18.5M", explicit: true },
    { id: "4", title: "Starfall", artist: "Luna Eclipse", duration: "4:55", releaseDate: "2023-12-10", streams: "22.1M", explicit: false },
    { id: "5", title: "Electric Dreams", artist: "Luna Eclipse", duration: "3:33", releaseDate: "2023-11-05", streams: "16.7M", explicit: false },
  ];

  const albums = [
    { id: "1", title: "Midnight Dreams", year: "2024", cover: "", type: "Album" },
    { id: "2", title: "Cosmic Reflections", year: "2023", cover: "", type: "Album" },
    { id: "3", title: "Stellar EP", year: "2023", cover: "", type: "EP" },
    { id: "4", title: "Luna Sessions", year: "2022", cover: "", type: "Album" },
  ];

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const toggleLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const playSong = (songId: string) => {
    console.log("Playing song:", songId);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      
      <div className="pt-6 pb-24 container mx-auto px-4">
        {/* Artist Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="w-full md:w-80 h-80 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <User className="w-32 h-32 text-white" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Artist</Badge>
                {artist.verified && (
                  <Badge className="bg-blue-500 hover:bg-blue-600">Verified</Badge>
                )}
              </div>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {artist.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{artist.followers} followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  <span>{artist.monthlyListeners} monthly listeners</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{artist.location}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {artist.genres.map((genre) => (
                  <Badge key={genre} variant="outline">{genre}</Badge>
                ))}
              </div>
              <p className="text-muted-foreground max-w-2xl">{artist.bio}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="hero" size="lg" className="rounded-full px-8">
                <Play className="w-5 h-5 mr-2" />
                Play
              </Button>
              <Button 
                variant={isFollowing ? "outline" : "secondary"} 
                size="lg" 
                className="rounded-full px-8"
                onClick={toggleFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <ShareButton title={artist.name} type="song" />
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Popular Songs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular</h2>
          <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
            <CardContent className="p-0">
              {popularSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 group transition-colors cursor-pointer"
                  onClick={() => playSong(song.id)}
                >
                  <div className="flex items-center justify-center w-8 text-muted-foreground group-hover:hidden">
                    {index + 1}
                  </div>
                  <div className="hidden group-hover:flex items-center justify-center w-8">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{song.title}</p>
                      {song.explicit && (
                        <Badge variant="outline" className="text-xs px-1 py-0">E</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{song.streams} plays</span>
                      <span>•</span>
                      <span>{new Date(song.releaseDate).getFullYear()}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
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
        </div>

        {/* Albums */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Albums and EPs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {albums.map((album) => (
              <Card key={album.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-gradient-accent mb-4 flex items-center justify-center relative overflow-hidden">
                    <Music className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                      <Button
                        variant="hero"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Play className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1 truncate">{album.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{album.year}</span>
                    <span>•</span>
                    <span>{album.type}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Related Artists */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Fans also like</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <Card key={item} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-secondary mx-auto mb-4 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2 truncate">Similar Artist</h3>
                  <p className="text-sm text-muted-foreground">Artist</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-full">
                    Follow
                  </Button>
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

export default ArtistDetail;