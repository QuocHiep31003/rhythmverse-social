import { useState } from "react";
import Footer from "@/components/Footer";
import ChatBubble from "@/components/ChatBubble";
import PromotionCarousel from "@/components/PromotionCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Search, 
  Heart, 
  MoreHorizontal, 
  Music,
  User,
  Album,
  ListMusic,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  Share2
} from "lucide-react";

const SearchResults = () => {
  const [searchQuery, setSearchQuery] = useState("love songs");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const searchResults = {
    songs: [
      { id: 1, title: "Love Story", artist: "Taylor Swift", album: "Fearless", duration: "3:55", image: "/placeholder.svg" },
      { id: 2, title: "Perfect", artist: "Ed Sheeran", album: "÷ (Divide)", duration: "4:23", image: "/placeholder.svg" },
      { id: 3, title: "All of Me", artist: "John Legend", album: "Love in the Future", duration: "4:29", image: "/placeholder.svg" },
      { id: 4, title: "Thinking Out Loud", artist: "Ed Sheeran", album: "x (Multiply)", duration: "4:41", image: "/placeholder.svg" },
      { id: 5, title: "A Thousand Years", artist: "Christina Perri", album: "The Twilight Saga", duration: "4:45", image: "/placeholder.svg" },
      { id: 6, title: "Make You Feel My Love", artist: "Adele", album: "19", duration: "3:32", image: "/placeholder.svg" },
      { id: 7, title: "Just the Way You Are", artist: "Bruno Mars", album: "Doo-Wops & Hooligans", duration: "3:40", image: "/placeholder.svg" },
      { id: 8, title: "Someone Like You", artist: "Adele", album: "21", duration: "4:45", image: "/placeholder.svg" }
    ],
    artists: [
      { id: 1, name: "Taylor Swift", followers: "89.2M", verified: true },
      { id: 2, name: "Ed Sheeran", followers: "47.8M", verified: true },
      { id: 3, name: "Adele", followers: "35.1M", verified: true }
    ],
    albums: [
      { id: 1, title: "Love in the Future", artist: "John Legend", year: "2013", tracks: 16 },
      { id: 2, title: "÷ (Divide)", artist: "Ed Sheeran", year: "2017", tracks: 16 },
      { id: 3, title: "21", artist: "Adele", year: "2011", tracks: 11 }
    ],
    playlists: [
      { id: 1, title: "Love Songs Collection", creator: "Spotify", tracks: 150, followers: "2.1M" },
      { id: 2, title: "Romantic Hits", creator: "Music Team", tracks: 85, followers: "856K" },
      { id: 3, title: "Love Ballads", creator: "Classic FM", tracks: 120, followers: "1.2M" }
    ]
  };

  const trendingSongs = [
    { id: 1, title: "Vampire", artist: "Olivia Rodrigo", trend: "+25%" },
    { id: 2, title: "Flowers", artist: "Miley Cyrus", trend: "+18%" },
    { id: 3, title: "Anti-Hero", artist: "Taylor Swift", trend: "+12%" },
    { id: 4, title: "Unholy", artist: "Sam Smith", trend: "+31%" }
  ];

  const genreTrending = [
    { genre: "Pop", songs: 1240, icon: "🎵" },
    { genre: "Rock", songs: 890, icon: "🎸" },
    { genre: "Hip Hop", songs: 750, icon: "🎤" },
    { genre: "Electronic", songs: 620, icon: "🔊" }
  ];

  const filters = [
    { id: "all", label: "All", count: searchResults.songs.length + searchResults.artists.length + searchResults.albums.length + searchResults.playlists.length },
    { id: "songs", label: "Songs", count: searchResults.songs.length },
    { id: "artists", label: "Artists", count: searchResults.artists.length },
    { id: "albums", label: "Albums", count: searchResults.albums.length },
    { id: "playlists", label: "Playlists", count: searchResults.playlists.length }
  ];

  const playSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <ChatBubble />
      
      <div className="pt-6 pb-6 container mx-auto px-4">
        {/* Promotion Carousel */}
        <PromotionCarousel />
      </div>
      
      {/* Filter Tabs */}
      <div className="pb-6">
        <div className="container mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "outline"}
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-full px-4 py-2 whitespace-nowrap ${
                  activeFilter === filter.id 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {filter.label}
                <Badge variant="secondary" className="ml-2">
                  {filter.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-32">
        <div className="flex gap-8">
          {/* Main Results */}
          <div className="flex-1">
            {(activeFilter === "all" || activeFilter === "songs") && (
              <div className="mb-8">
                <Card className="bg-card border-border">
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {searchResults.songs.slice(0, activeFilter === "all" ? 5 : searchResults.songs.length).map((song, index) => (
                        <div 
                          key={song.id} 
                          className="flex items-center gap-4 p-3 hover:bg-muted/50 group cursor-pointer rounded-lg transition-colors"
                          onClick={() => playSong(song)}
                        >
                          <span className="w-6 text-sm text-muted-foreground text-center group-hover:hidden">
                            {index + 1}
                          </span>
                          <div className="w-6 flex justify-center hidden group-hover:block">
                            <Play className="w-4 h-4 text-foreground" />
                          </div>
                          
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                          </div>
                          
                          <div className="hidden md:block text-sm text-muted-foreground truncate max-w-40">
                            {song.album}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                              <Heart className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground w-12 text-right">{song.duration}</span>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {(activeFilter === "all" || activeFilter === "artists") && searchResults.artists.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Artists</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.artists.map((artist) => (
                    <Card key={artist.id} className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                          <User className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2 text-foreground">
                          {artist.name}
                          {artist.verified && <Badge variant="secondary" className="bg-primary text-primary-foreground">✓</Badge>}
                        </h3>
                        <p className="text-muted-foreground mb-4">{artist.followers} followers</p>
                        <Button variant="outline">
                          Follow
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compact Sidebar */}
          <div className="w-80 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Trending Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingSongs.map((song, index) => (
                  <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <Play className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs font-medium text-primary">{song.trend}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Popular Genres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {genreTrending.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-foreground">{item.genre}</span>
                    </div>
                    <Badge variant="secondary">
                      {item.songs}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Player Bar */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Now Playing Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{currentSong.title}</p>
                <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Shuffle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <SkipBack className="w-6 h-6" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="w-12 h-12"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <SkipForward className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Repeat className="w-5 h-5" />
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div className="w-20 h-1 bg-muted rounded-full">
                  <div className="w-1/2 h-full bg-primary rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SearchResults;