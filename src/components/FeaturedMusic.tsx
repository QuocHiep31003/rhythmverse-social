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

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  cover?: string;
  genre: string;
  mood?: string[];
  plays: string;
  isNew?: boolean;
  isAIRecommended?: boolean;
}

const FeaturedMusic = () => {
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
  const genres = ["Electronic", "Synthwave", "Ambient", "EDM", "Indie Rock"];

  // Data
  const featuredSongs: Record<string, Song[]> = {
    trending: [
      {
        id: "1",
        title: "Cosmic Dreams",
        artist: "StarGazer",
        album: "Galactic Soundscapes",
        duration: "3:42",
        genre: "Electronic",
        mood: ["Happy", "Party"],
        plays: "2.1M",
        isAIRecommended: true,
      },
      {
        id: "2",
        title: "Midnight City",
        artist: "M83",
        album: "Hurry Up, We're Dreaming",
        duration: "4:03",
        genre: "Synthwave",
        mood: ["Chill", "Focus"],
        plays: "18.7M",
      },
      {
        id: "3",
        title: "Ocean Waves",
        artist: "Chill Collective",
        album: "Serenity",
        duration: "5:12",
        genre: "Ambient",
        mood: ["Chill"],
        plays: "956K",
        isNew: true,
      },
    ],
    newReleases: [
      {
        id: "5",
        title: "Neon Nights",
        artist: "Synth Masters",
        album: "Digital Dreams",
        duration: "4:15",
        genre: "Synthpop",
        mood: ["Happy"],
        plays: "125K",
        isNew: true,
      },
      {
        id: "6",
        title: "Lost in Time",
        artist: "Echo Chamber",
        duration: "3:58",
        genre: "Indie Rock",
        mood: ["Focus"],
        plays: "89K",
        isNew: true,
        isAIRecommended: true,
      },
    ],
    aiRecommended: [
      {
        id: "8",
        title: "Mind Reader",
        artist: "Neural Network",
        duration: "3:45",
        genre: "Experimental",
        mood: ["Focus"],
        plays: "567K",
        isAIRecommended: true,
      },
      {
        id: "9",
        title: "Digital Soul",
        artist: "AI Composer",
        duration: "4:21",
        genre: "Electronic",
        mood: ["Chill"],
        plays: "892K",
        isAIRecommended: true,
      },
    ],
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
            !selectedGenres.includes(song.genre)
          )
            return false;
          if (
            selectedMoods.length > 0 &&
            !selectedMoods.some((m) => song.mood?.includes(m))
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
            >
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <div className="w-full aspect-square bg-gradient-primary rounded-lg flex items-center justify-center relative overflow-hidden">
                    <Music className="w-8 h-8 text-white/80" />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="hero" size="icon" className="h-12 w-12">
                        <Play className="w-6 h-6" />
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {song.isNew && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                      {song.isAIRecommended && (
                        <Badge className="bg-gradient-primary text-white text-xs gap-1">
                          <Zap className="w-3 h-3" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold truncate">{song.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {song.duration}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
