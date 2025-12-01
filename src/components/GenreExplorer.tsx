import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music2, Waves, Zap, Coffee, Sun, Moon, Heart, Flame, LucideIcon, Play } from "lucide-react";
import { genresApi, moodsApi, songsApi } from "@/services/api";
import { GENRE_ICON_OPTIONS, MOOD_ICON_OPTIONS } from "@/data/iconOptions";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";

interface GenreItem {
  name: string;
  icon: LucideIcon;
  color: string;
  count?: string;
  iconUrl?: string;
  iconKey?: string;
}

interface MoodItem {
  name: string;
  icon: LucideIcon;
  gradient: string;
  iconUrl?: string;
  gradientFromBackend?: string;
  iconKey?: string;
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
  const [genres, setGenres] = useState<(GenreItem & { id?: number })[]>(defaultGenres);
  const [moods, setMoods] = useState<(MoodItem & { id?: number })[]>(defaultMoods);
  const { setQueue, playSong } = useMusic();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredGenreId, setHoveredGenreId] = useState<number | null>(null);
  const [hoveredMoodId, setHoveredMoodId] = useState<number | null>(null);
  const [loadingGenreId, setLoadingGenreId] = useState<number | null>(null);
  const [loadingMoodId, setLoadingMoodId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch genres from backend
    genresApi.getAll({ page: 0, size: 6, sort: "name,asc" })
      .then(data => {
        if (data?.content && data.content.length > 0) {
          setGenres(data.content.map((genre: { id: number; name: string; iconUrl?: string }, index: number) => {
            const preset = GENRE_ICON_OPTIONS.find((option) => option.value === genre.iconUrl);
            const fallback = defaultGenres[index % defaultGenres.length] || defaultGenres[0];
            return {
              id: genre.id,
              name: genre.name,
              icon: preset?.icon || fallback.icon,
              color: preset?.badgeClass || fallback.color,
              iconUrl: preset ? undefined : genre.iconUrl,
              iconKey: preset?.value,
            };
          }));
        }
      })
      .catch(err => console.log("Error fetching genres:", err));

    // Fetch moods from backend
    moodsApi.getAll({ page: 0, size: 4, sort: "name,asc" })
      .then(data => {
        if (data?.content && data.content.length > 0) {
          setMoods(data.content.map((mood: { id: number; name: string; iconUrl?: string; gradient?: string }, index: number) => {
            const preset = MOOD_ICON_OPTIONS.find((option) => option.value === mood.iconUrl);
            const fallback = defaultMoods[index % defaultMoods.length] || defaultMoods[0];
            return {
              id: mood.id,
              name: mood.name,
              icon: preset?.icon || fallback.icon,
              gradient: preset?.gradientClass || mood.gradient || fallback.gradient || "from-neon-pink to-primary",
              iconUrl: preset ? undefined : mood.iconUrl,
              gradientFromBackend: mood.gradient,
              iconKey: preset?.value,
            };
          }));
        }
      })
      .catch(err => console.log("Error fetching moods:", err));
  }, []);

  const handleGenreHover = (genreId: number | undefined) => {
    if (!genreId) return;
    
    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredGenreId(genreId);
    
    // Delay để tránh gọi API quá nhiều khi hover nhanh
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        setLoadingGenreId(genreId);
        const songs = await songsApi.recommendByGenre(genreId, 50);
        if (songs && songs.length > 0) {
          // Shuffle và lấy random 1 bài để phát
          const shuffled = [...songs].sort(() => Math.random() - 0.5);
          const randomSong = shuffled[0];
          const playerSong = mapToPlayerSong(randomSong);
          
          // Set queue với 50 bài và phát ngẫu nhiên
          const playerSongs = shuffled.map(mapToPlayerSong);
          setQueue(playerSongs);
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(playerSong, playSong);
        }
      } catch (error) {
        console.error("Error loading genre preview:", error);
      } finally {
        setLoadingGenreId(null);
      }
    }, 500); // Delay 500ms
  };

  const handleGenreLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredGenreId(null);
    setLoadingGenreId(null);
  };

  const handleMoodHover = (moodId: number | undefined) => {
    if (!moodId) return;
    
    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredMoodId(moodId);
    
    // Delay để tránh gọi API quá nhiều khi hover nhanh
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        setLoadingMoodId(moodId);
        const songs = await songsApi.recommendByMood(moodId, 50);
        if (songs && songs.length > 0) {
          // Shuffle và lấy random 1 bài để phát
          const shuffled = [...songs].sort(() => Math.random() - 0.5);
          const randomSong = shuffled[0];
          const playerSong = mapToPlayerSong(randomSong);
          
          // Set queue với 50 bài và phát ngẫu nhiên
          const playerSongs = shuffled.map(mapToPlayerSong);
          setQueue(playerSongs);
          const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
          await playSongWithStreamUrl(playerSong, playSong);
        }
      } catch (error) {
        console.error("Error loading mood preview:", error);
      } finally {
        setLoadingMoodId(null);
      }
    }, 500); // Delay 500ms
  };

  const handleMoodLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredMoodId(null);
    setLoadingMoodId(null);
  };

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
              const isHovered = hoveredGenreId === genre.id;
              const isLoading = loadingGenreId === genre.id;
              return (
                <Card 
                  key={genre.name}
                  className="bg-card/50 border-border/40 hover:bg-card/80 transition-all duration-300 group cursor-pointer hover:scale-105 hover:shadow-neon relative"
                  onMouseEnter={() => handleGenreHover(genre.id)}
                  onMouseLeave={handleGenreLeave}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${genre.color} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform overflow-hidden relative`}>
                      {genre.iconUrl ? (
                        <img src={genre.iconUrl} alt={genre.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="h-6 w-6 text-white" />
                      )}
                      {/* Icon play ngẫu nhiên khi hover */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="h-5 w-5 text-white fill-white" />
                          )}
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{genre.name}</h4>
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
              const isHovered = hoveredMoodId === mood.id;
              const isLoading = loadingMoodId === mood.id;
              return (
                <Card 
                  key={mood.name}
                  className="relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-glow"
                  onMouseEnter={() => handleMoodHover(mood.id)}
                  onMouseLeave={handleMoodLeave}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                  <CardContent className="relative p-8 text-center">
                    <div className="relative">
                      {mood.iconUrl ? (
                        <div className="w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform rounded-full overflow-hidden ring-2 ring-white/10 relative">
                          <img src={mood.iconUrl} alt={mood.name} className="w-full h-full object-cover" />
                          {/* Icon play ngẫu nhiên khi hover */}
                          {isHovered && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Play className="h-5 w-5 text-white fill-white" />
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform relative">
                          <Icon className="h-12 w-12 text-primary" />
                          {/* Icon play ngẫu nhiên khi hover */}
                          {isHovered && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Play className="h-5 w-5 text-white fill-white" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

      </div>
    </section>
  );
};

export default GenreExplorer;