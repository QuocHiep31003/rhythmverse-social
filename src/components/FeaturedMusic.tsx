import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Heart,
  Share2,
  Plus,
  Headphones,
  Clock,
  TrendingUp,
  Music,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mockSongs } from "@/data/mockData";
import { Song } from "@/contexts/MusicContext";

const FeaturedMusic = () => {
  const { playSong, setQueue } = useMusic();
  const [activeCategory, setActiveCategory] = useState("trending");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // toggle helper
  const toggleSelection = (
    current: string[],
    item: string,
    setter: (val: string[]) => void
  ) => {
    if (current.includes(item)) {
      setter(current.filter((i) => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  const moods = ["Happy", "Chill", "Focus", "Party"];
  const genres = ["Electronic", "Synthpop", "Ambient", "Pop", "Indie Pop"];

  // Data
  const featuredSongs: Record<string, Song[]> = {
    trending: mockSongs.slice(0, 4),
    newReleases: mockSongs.slice(4, 8),
    aiRecommended: mockSongs.slice(6, 10),
  };

  const categories = [
    { key: "trending", label: "Trending Now", icon: TrendingUp },
    { key: "newReleases", label: "New Releases", icon: Sparkles },
    { key: "aiRecommended", label: "AI Pick for You", icon: Zap },
  ];

  // filter logic
  const songsInCategory = featuredSongs[activeCategory] ?? [];
  const filteredSongs =
    activeCategory === "aiRecommended"
      ? songsInCategory.filter((song) => {
          if (
            selectedGenres.length > 0 &&
            song.genre &&
            !selectedGenres.includes(song.genre)
          )
            return false;
          return true;
        })
      : songsInCategory;

  return (
    <section className="py-12">
      <div className="container px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Featured Music
            </h2>
            <p className="text-muted-foreground">
              Discover trending tracks, new releases, and AI-curated recommendations
            </p>
          </div>
          <Button variant="outline" className="mt-4 md:mt-0">
            <Music className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.key}
              variant={activeCategory === category.key ? "default" : "outline"}
              onClick={() => {
                setActiveCategory(category.key);
                setSelectedMoods([]);
                setSelectedGenres([]);
              }}
              className="gap-2"
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </Button>
          ))}
        </div>

        {/* Mood + Genre filters only for AI Pick */}
        {activeCategory === "aiRecommended" && (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Select Mood</h3>
              <div className="flex gap-2 flex-wrap">
                {moods.map((m) => (
                  <Button
                    key={m}
                    variant={
                      selectedMoods.includes(m) ? "default" : "outline"
                    }
                    onClick={() =>
                      toggleSelection(selectedMoods, m, setSelectedMoods)
                    }
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-medium mb-2">Select Genre</h3>
              <div className="flex gap-2 flex-wrap">
                {genres.map((g) => (
                  <Button
                    key={g}
                    variant={
                      selectedGenres.includes(g) ? "default" : "outline"
                    }
                    onClick={() =>
                      toggleSelection(selectedGenres, g, setSelectedGenres)
                    }
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Music Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSongs.map((song) => (
            <Card
              key={song.id}
              className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300 group cursor-pointer"
              onClick={() => {
                setQueue(filteredSongs);
                playSong(song);
              }}
            >
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <div className="w-full aspect-square bg-gradient-primary rounded-lg flex items-center justify-center relative overflow-hidden">
                    {song.cover ? (
                      <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-8 h-8 text-white/80" />
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="hero" size="icon" className="h-12 w-12">
                        <Play className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold truncate">{song.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      {song.plays}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className="text-xs">
                      {song.genre}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 pt-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedMusic;
