import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Search, 
  Clock, 
  Heart, 
  MoreHorizontal, 
  Music,
  User,
  Album,
  ListMusic
} from "lucide-react";

const SearchResults = () => {
  const [searchQuery, setSearchQuery] = useState("love songs");
  const [activeFilter, setActiveFilter] = useState("all");

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
    { genre: "Pop", songs: 1240 },
    { genre: "Rock", songs: 890 },
    { genre: "Hip Hop", songs: 750 },
    { genre: "Electronic", songs: 620 }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <div className="pt-20 pb-8 container mx-auto px-4">
        {/* Search Header */}
        <div className="mb-8">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs, artists, albums..."
              className="pl-12 h-12 text-lg bg-gradient-glass backdrop-blur-sm border-white/10"
            />
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-2xl font-bold">Search results for</h1>
            <span className="text-2xl font-bold text-primary">"{searchQuery}"</span>
          </div>
          
          <p className="text-muted-foreground">Found {searchResults.songs.length + searchResults.artists.length + searchResults.albums.length + searchResults.playlists.length} results</p>
        </div>

        <div className="flex gap-8">
          {/* Main Results */}
          <div className="flex-1">
            <Tabs value={activeFilter} onValueChange={setActiveFilter}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="songs">Songs</TabsTrigger>
                <TabsTrigger value="artists">Artists</TabsTrigger>
                <TabsTrigger value="albums">Albums</TabsTrigger>
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-8">
                {/* Songs */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Songs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {searchResults.songs.slice(0, 5).map((song, index) => (
                        <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100/5 group cursor-pointer">
                          <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                          </div>
                          <div className="hidden md:block text-sm text-muted-foreground truncate max-w-32">
                            {song.album}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <Heart className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground w-12 text-right">{song.duration}</span>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">Show all songs</Button>
                  </CardContent>
                </Card>

                {/* Artists */}
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Artists
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {searchResults.artists.map((artist) => (
                        <div key={artist.id} className="text-center p-4 rounded-lg hover:bg-slate-100/5 cursor-pointer">
                          <div className="w-20 h-20 bg-gradient-primary rounded-full mx-auto mb-3 flex items-center justify-center">
                            <User className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="font-bold mb-1 flex items-center justify-center gap-1">
                            {artist.name}
                            {artist.verified && <Badge variant="secondary" className="text-xs">✓</Badge>}
                          </h3>
                          <p className="text-sm text-muted-foreground">{artist.followers} followers</p>
                          <Button variant="outline" size="sm" className="mt-2">Follow</Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="songs">
                <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {searchResults.songs.map((song, index) => (
                        <div key={song.id} className="flex items-center gap-4 p-4 hover:bg-slate-100/5 group cursor-pointer">
                          <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                          </div>
                          <div className="hidden md:block text-sm text-muted-foreground truncate max-w-40">
                            {song.album}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <Heart className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground w-12 text-right">{song.duration}</span>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="artists">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.artists.map((artist) => (
                    <Card key={artist.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all">
                      <CardContent className="p-6 text-center">
                        <div className="w-24 h-24 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                          <User className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                          {artist.name}
                          {artist.verified && <Badge variant="secondary">✓</Badge>}
                        </h3>
                        <p className="text-muted-foreground mb-4">{artist.followers} followers</p>
                        <Button variant="hero" className="w-full">Follow</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="albums">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.albums.map((album) => (
                    <Card key={album.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="w-full aspect-square bg-gradient-accent rounded-lg mb-4 flex items-center justify-center">
                          <Album className="w-16 h-16 text-white" />
                        </div>
                        <h3 className="font-bold truncate mb-1">{album.title}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{album.artist}</p>
                        <p className="text-xs text-muted-foreground">{album.year} • {album.tracks} tracks</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="playlists">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.playlists.map((playlist) => (
                    <Card key={playlist.id} className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="w-full aspect-square bg-gradient-neon rounded-lg mb-4 flex items-center justify-center">
                          <ListMusic className="w-16 h-16 text-white" />
                        </div>
                        <h3 className="font-bold truncate mb-1">{playlist.title}</h3>
                        <p className="text-sm text-muted-foreground mb-1">by {playlist.creator}</p>
                        <p className="text-xs text-muted-foreground">{playlist.tracks} tracks • {playlist.followers} followers</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Trending Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingSongs.map((song, index) => (
                  <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 cursor-pointer">
                    <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                    <div className="w-8 h-8 bg-gradient-primary rounded flex items-center justify-center">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs font-medium text-green-500">{song.trend}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Popular Genres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {genreTrending.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/10 cursor-pointer">
                    <span className="font-medium">{item.genre}</span>
                    <Badge variant="secondary">{item.songs}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SearchResults;