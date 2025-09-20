import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Music, 
  Plus, 
  Search, 
  Heart, 
  Play, 
  Users,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";

const PlaylistLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [likedPlaylists, setLikedPlaylists] = useState<string[]>([]);

  const myPlaylists = [
    {
      id: "1",
      title: "My Favorites ❤️",
      description: "My all-time favorite songs from different genres",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      songCount: 45,
      totalDuration: "3h 12m",
      isPublic: true,
      likes: 128,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20"
    },
    {
      id: "2", 
      title: "Workout Beast Mode 💪",
      description: "High energy EDM and rap for intense gym sessions",
      cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
      songCount: 32,
      totalDuration: "2h 8m",
      isPublic: true,
      likes: 89,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18"
    },
    {
      id: "3",
      title: "Chill & Study 📚",
      description: "Lo-fi beats and ambient sounds for focus",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      songCount: 28,
      totalDuration: "2h 45m",
      isPublic: false,
      likes: 0,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-19"
    },
    {
      id: "4",
      title: "Road Trip Vibes 🚗",
      description: "Perfect songs for long drives and adventures",
      cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
      songCount: 67,
      totalDuration: "4h 23m",
      isPublic: true,
      likes: 245,
      createdAt: "2023-12-20",
      updatedAt: "2024-01-22"
    },
    {
      id: "5",
      title: "Night Jazz Sessions 🎷",
      description: "Smooth jazz for late night relaxation",
      cover: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
      songCount: 34,
      totalDuration: "2h 56m",
      isPublic: true,
      likes: 156,
      createdAt: "2023-11-15",
      updatedAt: "2024-01-21"
    },
    {
      id: "6",
      title: "Party Hits 2024 🎉",
      description: "Latest party anthems and dance floor bangers",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
      songCount: 52,
      totalDuration: "3h 18m",
      isPublic: true,
      likes: 423,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-23"
    }
  ];

  const favoriteSongs = [
    {
      id: "fav1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: "3:20",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      likedAt: "2024-01-23"
    },
    {
      id: "fav2", 
      title: "Watermelon Sugar",
      artist: "Harry Styles",
      album: "Fine Line",
      duration: "2:54",
      cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
      likedAt: "2024-01-22"
    },
    {
      id: "fav3",
      title: "Levitating",
      artist: "Dua Lipa", 
      album: "Future Nostalgia",
      duration: "3:23",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
      likedAt: "2024-01-21"
    },
    {
      id: "fav4",
      title: "Good 4 U",
      artist: "Olivia Rodrigo",
      album: "SOUR",
      duration: "2:58",
      cover: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
      likedAt: "2024-01-20"
    }
  ];


  const filteredMyPlaylists = myPlaylists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavorites = favoriteSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLike = (playlistId: string) => {
    setLikedPlaylists(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
    toast({
      title: likedPlaylists.includes(playlistId) ? "Removed from liked playlists" : "Added to liked playlists",
      duration: 2000,
    });
  };

  const playPlaylist = (playlist: any) => {
    toast({
      title: `Playing ${playlist.title}`,
      description: `${playlist.songCount} songs`,
      duration: 3000,
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Your Music Library
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your playlists and discover trending music
            </p>
          </div>
          
          <Link to="/create-playlist">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Plus className="w-5 h-5 mr-2" />
              Create Playlist
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="songs">Song Count</SelectItem>
              <SelectItem value="likes">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="my-playlists" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
            <TabsTrigger value="my-playlists">My Playlists</TabsTrigger>
            <TabsTrigger value="favorites">Favorite Songs</TabsTrigger>
          </TabsList>

          {/* My Playlists */}
          <TabsContent value="my-playlists">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredMyPlaylists.map((playlist) => (
                <Card key={playlist.id} className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 group">
                  <CardContent className="p-0">
                    {/* Cover Image */}
                    <div className="relative aspect-square">
                      <img
                        src={playlist.cover}
                        alt={playlist.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
                          onClick={() => playPlaylist(playlist)}
                        >
                          <Play className="w-8 h-8" />
                        </Button>
                      </div>
                      
                      {/* Privacy badge */}
                      <Badge 
                        variant={playlist.isPublic ? "default" : "secondary"}
                        className="absolute top-3 right-3"
                      >
                        {playlist.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <Link to={`/playlist/${playlist.id}`}>
                        <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors truncate">
                          {playlist.title}
                        </h3>
                      </Link>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {playlist.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Music className="w-4 h-4" />
                          {playlist.songCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {playlist.totalDuration}
                        </div>
                        {playlist.isPublic && (
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {formatNumber(playlist.likes)}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(playlist.updatedAt).toLocaleDateString()}
                        </p>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleLike(playlist.id)}
                            className={`h-8 w-8 ${likedPlaylists.includes(playlist.id) ? 'text-red-500' : ''}`}
                          >
                            <Heart className={`w-4 h-4 ${likedPlaylists.includes(playlist.id) ? 'fill-current' : ''}`} />
                          </Button>
                          <ShareButton title={playlist.title} type="playlist" />
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Favorite Songs */}
          <TabsContent value="favorites">
            <div className="space-y-4">
              {filteredFavorites.map((song, index) => (
                <Card key={song.id} className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Track Number / Play Button */}
                      <div className="w-8 text-center">
                        <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hidden group-hover:flex w-8 h-8"
                          onClick={() => toast({
                            title: `Playing ${song.title}`,
                            description: `by ${song.artist}`,
                            duration: 3000,
                          })}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Cover */}
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={song.cover} alt={song.title} />
                        <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
                      </Avatar>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-foreground">{song.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      </div>

                      {/* Album */}
                      <div className="hidden md:block flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">{song.album}</p>
                      </div>

                      {/* Liked date */}
                      <div className="hidden lg:block w-32">
                        <p className="text-sm text-muted-foreground">
                          Liked {new Date(song.likedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </Button>

                        {/* Duration */}
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {song.duration}
                        </span>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default PlaylistLibrary;