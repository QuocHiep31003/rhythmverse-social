import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Heart, MoreHorizontal, Search, Filter, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";

const TrendingMusic = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");

  const trendingSongs = [
    {
      id: "1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: "3:20",
      plays: "2.1B",
      trend: "+15%",
      cover: "/placeholder.svg",
      rank: 1
    },
    {
      id: "2", 
      title: "Shape of You",
      artist: "Ed Sheeran",
      album: "÷ (Divide)",
      duration: "3:53",
      plays: "3.4B", 
      trend: "+8%",
      cover: "/placeholder.svg",
      rank: 2
    },
    {
      id: "3",
      title: "Someone You Loved",
      artist: "Lewis Capaldi",
      album: "Divinely Uninspired",
      duration: "3:02",
      plays: "1.8B",
      trend: "+12%",
      cover: "/placeholder.svg", 
      rank: 3
    },
    {
      id: "4",
      title: "Watermelon Sugar",
      artist: "Harry Styles", 
      album: "Fine Line",
      duration: "2:54",
      plays: "1.5B",
      trend: "+20%",
      cover: "/placeholder.svg",
      rank: 4
    },
    {
      id: "5",
      title: "Dance Monkey",
      artist: "Tones and I",
      album: "The Kids Are Coming",
      duration: "3:29",
      plays: "2.9B",
      trend: "+5%", 
      cover: "/placeholder.svg",
      rank: 5
    }
  ];

  const filteredSongs = trendingSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLike = (songId: string) => {
    setLikedSongs(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
    toast({
      title: likedSongs.includes(songId) ? "Removed from liked songs" : "Added to liked songs",
      duration: 2000,
    });
  };

  const playSong = (song: any) => {
    toast({
      title: `Now playing: ${song.title}`,
      description: `by ${song.artist}`,
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Trending Music
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover what's hot right now
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trending songs or artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              size="sm"
            >
              All Genres
            </Button>
            <Button
              variant={filter === "pop" ? "default" : "outline"}
              onClick={() => setFilter("pop")}
              size="sm"
            >
              Pop
            </Button>
            <Button
              variant={filter === "rock" ? "default" : "outline"}
              onClick={() => setFilter("rock")}
              size="sm"
            >
              Rock
            </Button>
          </div>
        </div>

        {/* Trending Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Plays Today</p>
                  <p className="text-3xl font-bold text-primary">12.8B</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trending Artists</p>
                  <p className="text-3xl font-bold text-primary">156</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                  <p className="text-3xl font-bold text-primary">24</p>
                </div>
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trending Songs List */}
        <div className="space-y-4">
          {filteredSongs.map((song) => (
            <Card 
              key={song.id} 
              className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 group cursor-pointer"
              onClick={() => navigate(`/song/${song.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full">
                    <span className="text-lg font-bold text-primary">#{song.rank}</span>
                  </div>

                  {/* Cover & Play Button */}
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={song.cover} alt={song.title} />
                      <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute inset-0 w-16 h-16 rounded-full bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(song);
                      }}
                    >
                      <Play className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{song.title}</h3>
                    <p className="text-muted-foreground truncate">{song.artist}</p>
                    <p className="text-sm text-muted-foreground">{song.album}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      {song.trend}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{song.plays} plays</p>
                    <p className="text-sm text-muted-foreground">{song.duration}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className={`h-8 w-8 ${likedSongs.includes(song.id) ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton title={song.title} type="song" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('More options');
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrendingMusic;