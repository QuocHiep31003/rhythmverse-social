import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, TrendingUp, Clock, Music, Play } from "lucide-react";
import MusicCard from "@/components/MusicCard";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const genres = [
    "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical", 
    "Country", "R&B", "Reggae", "Folk", "Blues", "Punk"
  ];

  const moods = [
    "Happy", "Sad", "Energetic", "Chill", "Romantic", "Motivational",
    "Nostalgic", "Party", "Relaxing", "Intense", "Dreamy", "Dark"
  ];

  const trendingSongs = [
    { id: 1, title: "Stellar Journey", artist: "Cosmic Band", genre: "Electronic", plays: "2.1M" },
    { id: 2, title: "Midnight Vibes", artist: "Night Owl", genre: "Chill", plays: "1.8M" },
    { id: 3, title: "Electric Dreams", artist: "Synth Wave", genre: "Electronic", plays: "1.5M" },
    { id: 4, title: "Ocean Breeze", artist: "Coastal Sounds", genre: "Ambient", plays: "1.2M" },
  ];

  const newReleases = [
    { id: 5, title: "Neon Lights", artist: "City Beats", genre: "Pop", releaseDate: "2024-01-15" },
    { id: 6, title: "Mountain High", artist: "Peak Performers", genre: "Rock", releaseDate: "2024-01-12" },
    { id: 7, title: "Digital Love", artist: "Tech Hearts", genre: "Electronic", releaseDate: "2024-01-10" },
    { id: 8, title: "Summer Rain", artist: "Weather Sounds", genre: "Indie", releaseDate: "2024-01-08" },
  ];

  const recommendations = [
    { id: 9, title: "Space Odyssey", artist: "Galactic Voyage", genre: "Ambient", reason: "Based on your recent listens" },
    { id: 10, title: "Urban Pulse", artist: "City Life", genre: "Hip Hop", reason: "Similar to your liked songs" },
    { id: 11, title: "Acoustic Sunset", artist: "String Theory", genre: "Folk", reason: "Matches your mood" },
    { id: 12, title: "Bass Drop", artist: "Electronic Force", genre: "EDM", reason: "Trending in your area" },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark pt-20 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Discover Music
          </h1>
          <p className="text-muted-foreground">
            Explore new sounds, trending tracks, and personalized recommendations
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by song, artist, album, or lyrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/40"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Advanced Filters
            </Button>
          </div>

          {/* Genre Filter */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenre === genre ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mood Filter */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Moods</h3>
            <div className="flex flex-wrap gap-2">
              {moods.map((mood) => (
                <Badge
                  key={mood}
                  variant={selectedMood === mood ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Clock className="w-4 h-4" />
              New Releases
            </TabsTrigger>
            <TabsTrigger value="recommended" className="gap-2">
              <Music className="w-4 h-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <Play className="w-4 h-4" />
              Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Trending Now</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendingSongs.map((song) => (
                  <Card key={song.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gradient-primary rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-medium truncate">{song.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="text-xs">{song.genre}</Badge>
                        <span className="text-xs text-muted-foreground">{song.plays} plays</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Fresh Releases</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {newReleases.map((song) => (
                  <Card key={song.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gradient-secondary rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-medium truncate">{song.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="text-xs">{song.genre}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(song.releaseDate).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommended" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Recommended For You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recommendations.map((song) => (
                  <Card key={song.id} className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gradient-accent rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-medium truncate">{song.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{song.reason}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="text-xs">{song.genre}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Top Charts</h2>
              <div className="space-y-4">
                {trendingSongs.map((song, index) => (
                  <Card key={song.id} className="hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-primary w-8 text-center">
                          #{index + 1}
                        </div>
                        <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{song.title}</h3>
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">{song.genre}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{song.plays} plays</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Discover;