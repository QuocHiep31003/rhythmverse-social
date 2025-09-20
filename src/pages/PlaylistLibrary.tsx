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
  Filter, 
  TrendingUp, 
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
      title: "My Favorites",
      description: "My all-time favorite songs",
      cover: "/placeholder.svg",
      songCount: 45,
      totalDuration: "3h 12m",
      isPublic: true,
      likes: 128,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20"
    },
    {
      id: "2", 
      title: "Workout Mix",
      description: "High energy songs for gym sessions",
      cover: "/placeholder.svg",
      songCount: 32,
      totalDuration: "2h 8m",
      isPublic: true,
      likes: 89,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18"
    },
    {
      id: "3",
      title: "Chill Vibes",
      description: "Relaxing music for peaceful moments",
      cover: "/placeholder.svg", 
      songCount: 28,
      totalDuration: "2h 45m",
      isPublic: false,
      likes: 0,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-19"
    }
  ];

  const trendingPlaylists = [
    {
      id: "t1",
      title: "Top Hits 2024",
      description: "The biggest hits of the year",
      cover: "/placeholder.svg",
      songCount: 50,
      totalDuration: "3h 30m",
      creator: "Spotify",
      likes: 2450000,
      followers: 8900000
    },
    {
      id: "t2",
      title: "Viral Pop",
      description: "Songs going viral on social media",
      cover: "/placeholder.svg",
      songCount: 40,
      totalDuration: "2h 55m",
      creator: "TikTok Music",
      likes: 1800000,
      followers: 5600000
    },
    {
      id: "t3",
      title: "indie folk vibes",
      description: "Discover the best indie folk artists",
      cover: "/placeholder.svg",
      songCount: 35,
      totalDuration: "2h 20m", 
      creator: "indiefolkvibes",
      likes: 450000,
      followers: 1200000
    }
  ];

  const filteredMyPlaylists = myPlaylists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrendingPlaylists = trendingPlaylists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
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
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          {/* My Playlists */}
          <TabsContent value="my-playlists">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* Trending Playlists */}
          <TabsContent value="trending">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrendingPlaylists.map((playlist) => (
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
                      
                      {/* Trending badge */}
                      <Badge className="absolute top-3 right-3 bg-red-500">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Trending
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 truncate">
                        {playlist.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {playlist.description}
                      </p>

                      {/* Creator */}
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {playlist.creator.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          by {playlist.creator}
                        </span>
                      </div>

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
                      </div>

                      {/* Social Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {formatNumber(playlist.likes)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {formatNumber(playlist.followers)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm">
                          Follow
                        </Button>
                        
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
                        </div>
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