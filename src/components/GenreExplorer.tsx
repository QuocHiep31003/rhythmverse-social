import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music2, Waves, Zap, Coffee, Sun, Moon, Heart, Flame, LucideIcon } from "lucide-react";
import { genresApi, moodsApi } from "@/services/api";

interface GenreItem {
  name: string;
  icon: LucideIcon;
  color: string;
  count: string;
  iconUrl?: string;
}

interface MoodItem {
  name: string;
  icon: LucideIcon;
  gradient: string;
  iconUrl?: string;
}

// Default icons as fallback
const defaultGenres: GenreItem[] = [
  { name: "Pop", icon: Heart, color: "bg-neon-pink", count: "2.1M songs" },
  { name: "Electronic", icon: Zap, color: "bg-neon-blue", count: "1.8M songs" },
  { name: "Hip Hop", icon: Flame, color: "bg-primary", count: "1.5M songs" },
  { name: "Rock", icon: Music2, color: "bg-neon-green", count: "2.3M songs" },
  { name: "Jazz", icon: Waves, color: "bg-accent", count: "890K songs" },
  { name: "Lo-Fi", icon: Coffee, color: "bg-muted-foreground", count: "650K songs" },
];

const defaultMoods: MoodItem[] = [
  { name: "Energetic", icon: Sun, gradient: "from-neon-pink to-primary" },
  { name: "Chill", icon: Moon, gradient: "from-neon-blue to-accent" },
  { name: "Focus", icon: Coffee, gradient: "from-neon-green to-primary" },
  { name: "Party", icon: Flame, gradient: "from-primary to-neon-pink" },
];

const GenreExplorer = () => {
  const [genres, setGenres] = useState(defaultGenres);
  const [moods, setMoods] = useState(defaultMoods);

  useEffect(() => {
    // Fetch genres from backend
    genresApi.getAll({ page: 0, size: 6, sort: "name,asc" })
      .then(data => {
        if (data?.content && data.content.length > 0) {
          setGenres(data.content.map((genre: { name: string; iconUrl?: string }, index: number) => ({
            name: genre.name,
            icon: defaultGenres[index % defaultGenres.length]?.icon || Music2,
            color: defaultGenres[index % defaultGenres.length]?.color || "bg-primary",
            count: `${Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 10)}M songs`,
            iconUrl: genre.iconUrl,
          })));
        }
      })
      .catch(err => console.log("Error fetching genres:", err));

    // Fetch moods from backend
    moodsApi.getAll({ page: 0, size: 4, sort: "name,asc" })
      .then(data => {
        if (data?.content && data.content.length > 0) {
          setMoods(data.content.map((mood: { name: string; iconUrl?: string }, index: number) => ({
            name: mood.name,
            icon: defaultMoods[index % defaultMoods.length]?.icon || Sun,
            gradient: defaultMoods[index % defaultMoods.length]?.gradient || "from-neon-pink to-primary",
            iconUrl: mood.iconUrl,
          })));
        }
      })
      .catch(err => console.log("Error fetching moods:", err));
  }, []);

  return (
    <section id="genres-section" className=" bg-gradient-to-br from-background to-music-dark">
      <div className="container px-6">
        {/* <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Discover
            </span>{" "}
            <span className="text-foreground">Your Sound</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore millions of songs across genres and moods. Find your perfect soundtrack for any moment.
          </p>
        </div> */}

        {/* Genre Grid */}
        <div className="mb-16 pt-12">
          <h3 className="text-2xl font-semibold mb-8 text-center">Browse by Genre</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {genres.map((genre) => {
              const Icon = genre.icon;
              return (
                <Card 
                  key={genre.name}
                  className="bg-card/50 border-border/40 hover:bg-card/80 transition-all duration-300 group cursor-pointer hover:scale-105 hover:shadow-neon"
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${genre.color} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform overflow-hidden`}>
                      {genre.iconUrl ? (
                        <img src={genre.iconUrl} alt={genre.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{genre.name}</h4>
                    <p className="text-xs text-muted-foreground">{genre.count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Mood Explorer */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold mb-8 text-center">Music for Every Mood</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {moods.map((mood) => {
              const Icon = mood.icon;
              return (
                <Card 
                  key={mood.name}
                  className="relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-glow"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                  <CardContent className="relative p-8 text-center">
                    {mood.iconUrl ? (
                      <div className="w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <img src={mood.iconUrl} alt={mood.name} className="w-full h-full object-cover rounded-full" />
                      </div>
                    ) : (
                      <Icon className="h-12 w-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    )}
                    <h4 className="text-xl font-semibold text-foreground mb-2">{mood.name}</h4>
                    <Button variant="glass" size="sm" className="mt-4">
                      Explore
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Trending Section */}
        <div className="text-center">
          <Card className="bg-gradient-glass border-border/40 max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-4 text-foreground">What's Trending Now</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-neon-pink mb-2">#1</div>
                  <div className="text-foreground font-medium">Midnight Synthwave</div>
                  <div className="text-sm text-muted-foreground">Electronic • Trending</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-neon-blue mb-2">#2</div>
                  <div className="text-foreground font-medium">Chill Hop Beats</div>
                  <div className="text-sm text-muted-foreground">Lo-Fi • Rising</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-neon-green mb-2">#3</div>
                  <div className="text-foreground font-medium">Indie Rock Revival</div>
                  <div className="text-sm text-muted-foreground">Rock • Hot</div>
                </div>
              </div>
              <Button variant="hero" className="mt-6">
                View All Trending
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default GenreExplorer;