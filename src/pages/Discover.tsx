import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";
import {
  Zap,
  Sparkles,
  Brain,
  Star,
  Loader2,
  Music,
  Heart,
  Smile,
  Frown,
  Cloud,
  Sun,
  Moon,
  Flame,
  Droplets,
  Sparkles as SparklesIcon,
  Headphones,
  Radio,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { songsApi as songsApiClient, moodsApi, genresApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { GENRE_ICON_OPTIONS, MOOD_ICON_OPTIONS } from "@/data/iconOptions";

const isRemoteIcon = (value?: string) => !!value && /^https?:\/\//i.test(value);

const Discover = () => {
  const { setQueue, playSong } = useMusic();
  const { toast } = useToast();

  const [availableMoods, setAvailableMoods] = useState<Array<{ id: number; name: string; tone: "positive" | "negative" | "neutral"; iconUrl?: string; songCount?: number }>>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: number; name: string; iconUrl?: string; songCount?: number }>>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<number[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [isLoadingMoodRecs, setIsLoadingMoodRecs] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Load moods for AI mood-based recommendations (only get ACTIVE)
  useEffect(() => {
    const loadMoods = async () => {
      try {
        const data = await moodsApi.getPublic({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((m: any) => {
          const name: string = m.name || "";
          const lower = name.toLowerCase();
          let tone: "positive" | "negative" | "neutral" = "neutral";
          if (/(vui|happy|joy|love|party|energetic|phấn khích|sôi động)/i.test(lower)) {
            tone = "positive";
          } else if (/(buồn|sad|đau|tâm trạng|lonely|cry|heartbreak|dark)/i.test(lower)) {
            tone = "negative";
          }
          return { 
            id: m.id as number, 
            name, 
            tone,
            iconUrl: m.iconUrl || undefined
          };
        });
        setAvailableMoods(items);
        
        // Load song counts for each mood
        setIsLoadingCounts(true);
        const moodsWithCounts = await Promise.all(
          items.map(async (mood) => {
            try {
              const songData = await songsApiClient.getAll({
                moodId: mood.id,
                page: 0,
                size: 1,
                status: "ACTIVE",
              });
              return { ...mood, songCount: songData.totalElements || 0 };
            } catch (error) {
              console.error(`Failed to load song count for mood ${mood.id}:`, error);
              return { ...mood, songCount: 0 };
            }
          })
        );
        setAvailableMoods(moodsWithCounts);
        setIsLoadingCounts(false);
      } catch (error) {
        console.error("Failed to load moods for AI pick:", error);
        setIsLoadingCounts(false);
      }
    };
    loadMoods();
  }, []);

  // Load genres for selection with logos (only get ACTIVE, ~50 genres)
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const data = await genresApi.getPublic({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((g: any) => ({
          id: g.id as number,
          name: g.name || "",
          iconUrl: g.iconUrl || undefined,
        }));
        setAvailableGenres(items);
        
        // Load song counts for each genre
        setIsLoadingCounts(true);
        const genresWithCounts = await Promise.all(
          items.map(async (genre) => {
            try {
              const songData = await songsApiClient.getAll({
                genreId: genre.id,
                page: 0,
                size: 1,
                status: "ACTIVE",
              });
              return { ...genre, songCount: songData.totalElements || 0 };
            } catch (error) {
              console.error(`Failed to load song count for genre ${genre.id}:`, error);
              return { ...genre, songCount: 0 };
            }
          })
        );
        setAvailableGenres(genresWithCounts);
        setIsLoadingCounts(false);
      } catch (error) {
        console.error("Failed to load genres:", error);
        setIsLoadingCounts(false);
      }
    };
    loadGenres();
  }, []);

  // Get icon for mood based on name
  const getMoodIcon = useCallback((moodName: string, tone: "positive" | "negative" | "neutral") => {
    const lower = moodName.toLowerCase();
    if (tone === "positive") {
      if (/(happy|vui|joy|phấn khích)/i.test(lower)) return Smile;
      if (/(love|romantic|yêu)/i.test(lower)) return Heart;
      if (/(party|energetic|sôi động)/i.test(lower)) return SparklesIcon;
      if (/(sun|summer|nắng)/i.test(lower)) return Sun;
      return Heart;
    } else if (tone === "negative") {
      if (/(sad|buồn|cry|đau)/i.test(lower)) return Frown;
      if (/(dark|night|tối)/i.test(lower)) return Moon;
      if (/(rain|mưa|storm)/i.test(lower)) return Cloud;
      return Frown;
    } else {
      if (/(chill|relax|thư giãn)/i.test(lower)) return Droplets;
      if (/(fire|flame|lửa)/i.test(lower)) return Flame;
      return Music;
    }
  }, []);

  const toneConflicts = useCallback((currentTones: Set<string>, newTone: "positive" | "negative") => {
    if (newTone === "positive") return currentTones.has("negative");
    if (newTone === "negative") return currentTones.has("positive");
    return false;
  }, []);

  const handleToggleMood = useCallback((moodId: number) => {
    setSelectedMoodIds((prev) => {
      const already = prev.includes(moodId);
      if (already) {
        return prev.filter((id) => id !== moodId);
      }
      const mood = availableMoods.find((m) => m.id === moodId);
      if (!mood) return prev;

      const currentTones = new Set(
        prev
          .map((id) => availableMoods.find((m) => m.id === id)?.tone)
          .filter(Boolean) as string[]
      );

      if (mood.tone === "positive" || mood.tone === "negative") {
        if (toneConflicts(currentTones, mood.tone)) {
          toast({
            title: "Conflicting Moods",
            description: "Avoid selecting both very happy and very sad moods at the same time for more accurate recommendations.",
            variant: "warning",
          });
          return prev;
        }
      }

      // When selecting new mood, automatically remove conflicting moods (if any)
      const filtered = prev.filter((id) => {
        const t = availableMoods.find((m) => m.id === id)?.tone;
        if (!t) return true;
        if (mood.tone === "positive" && t === "negative") return false;
        if (mood.tone === "negative" && t === "positive") return false;
        return true;
      });

      return [...filtered, moodId];
    });
  }, [availableMoods, toneConflicts, toast]);

  // Handle toggle genre selection
  const handleToggleGenre = useCallback((genreId: number) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      }
      return [...prev, genreId];
    });
  }, []);

  // Handle submit to create playlist
  const handleSubmitDiscovery = useCallback(async () => {
      if (selectedMoodIds.length === 0 && selectedGenreIds.length === 0) {
        toast({
          title: "Please select at least one mood or genre",
          description: "Select at least one mood or genre to discover new music.",
          variant: "destructive",
        });
        return;
      }

    try {
      setIsLoadingMoodRecs(true);
      let mapped: any[] = [];

      // If moods exist, prioritize using mood-based recommendations API
      if (selectedMoodIds.length > 0) {
        try {
          const apiSongs = await songsApiClient.getRecommendationsByMoods(selectedMoodIds, 50);
          mapped = apiSongs.map((s) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Failed to get mood recommendations:", e);
        }
      }

      // If genres exist, filter or get more songs by genres
      if (selectedGenreIds.length > 0) {
        try {
          // Get songs by first genre (or merge with mood results if available)
          const genreSongs = await songsApiClient.getAll({
            genreId: selectedGenreIds[0],
            size: 50,
            page: 0,
            status: "ACTIVE",
          });
          const content = Array.isArray((genreSongs as any)?.content)
            ? (genreSongs as any).content
            : [];
          const genreMapped = content.map((s: any) => mapToPlayerSong(s));

          // If mood results exist, merge and filter by selected genres
          if (mapped.length > 0) {
            // Merge and remove duplicates
            const merged = [...mapped, ...genreMapped];
            const unique = merged.filter((song, index, self) =>
              index === self.findIndex((s) => s.songId === song.songId)
            );
            mapped = unique;
          } else {
            mapped = genreMapped;
          }
        } catch (e) {
          console.error("Failed to get genre songs:", e);
        }
      }

      // Fallback: if still empty and has mood, try search by first moodId
      if (mapped.length === 0 && selectedMoodIds.length > 0) {
        try {
          const firstMoodId = selectedMoodIds[0];
          const fallback = await songsApiClient.getAll({
            moodId: firstMoodId,
            size: 30,
            page: 0,
            status: "ACTIVE",
          });
          const content = Array.isArray((fallback as any)?.content)
            ? (fallback as any).content
            : (fallback as any)?.songs ?? [];
          mapped = content.map((s: any) => mapToPlayerSong(s));
        } catch (e) {
          console.error("Fallback mood search failed:", e);
        }
      }

      if (mapped.length > 0) {
        setQueue(mapped);
        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
        await playSongWithStreamUrl(mapped[0], playSong);
        const moodText = selectedMoodIds.length > 0 ? `${selectedMoodIds.length} mood${selectedMoodIds.length > 1 ? 's' : ''}` : "";
        const genreText = selectedGenreIds.length > 0 ? `${selectedGenreIds.length} genre${selectedGenreIds.length > 1 ? 's' : ''}` : "";
        const filterText = [moodText, genreText].filter(Boolean).join(" and ");
        toast({
          title: "Playlist Created",
          description: `Now playing: ${mapped[0].songName} (by ${filterText})`,
        });
      } else {
        toast({
          title: "No matching songs found",
          description: "Try selecting different moods/genres or check the system data.",
        });
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
        toast({
          title: "Error creating playlist",
          description: "Please try again later.",
          variant: "destructive",
        });
    } finally {
      setIsLoadingMoodRecs(false);
    }
  }, [selectedMoodIds, selectedGenreIds, playSong, setQueue, toast]);

  // AI Features for discovery
  const aiFeatures = [
    {
      icon: Brain,
      title: "Smart Recommendations",
      description: "AI system analyzes your music preferences and suggests the most suitable songs",
      gradient: "from-blue-500/20 via-purple-500/20 to-pink-500/20",
      iconGradient: "from-blue-500 to-purple-500",
      borderColor: "border-blue-500/30"
    },
    {
      icon: Sparkles,
      title: "Mood-Based Search",
      description: "Select your mood and current activity, AI will find music that matches your emotions",
      gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
      iconGradient: "from-emerald-500 to-teal-500",
      borderColor: "border-emerald-500/30"
    },
    {
      icon: Star,
      title: "Advanced Personalization",
      description: "Based on your listening history and behavior to create unique playlists",
      gradient: "from-amber-500/20 via-orange-500/20 to-red-500/20",
      iconGradient: "from-amber-500 to-orange-500",
      borderColor: "border-amber-500/30"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Space Background Effects - Loang như Music Recognition nhưng màu xanh dương */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                            radial-gradient(2px 2px at 60% 70%, rgba(255,255,255,0.8), transparent),
                            radial-gradient(1px 1px at 50% 50%, white, transparent),
                            radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.6), transparent),
                            radial-gradient(2px 2px at 90% 40%, rgba(255,255,255,0.4), transparent),
                            radial-gradient(1px 1px at 33% 60%, white, transparent),
                            radial-gradient(1px 1px at 55% 80%, rgba(255,255,255,0.6), transparent)`,
          backgroundSize: '200% 200%',
          animation: 'twinkle 20s linear infinite',
        }} />
        {/* Space Gradient Overlay - Màu xanh dương */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/10 to-sky-900/20" />
        {/* Nebula Effect - Màu xanh dương */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div className="pt-4 pb-24 relative z-10">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center shadow-lg shadow-primary/20">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AI-Powered Music Discovery
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover music like never before with our advanced AI features
            </p>
          </div>

          {/* AI Features Section */}
          <section className="mb-12">
          

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {aiFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-sm ${feature.borderColor} border-2 hover:shadow-glow transition-all duration-300 group hover:scale-105`}
                  >
                    <CardHeader className="text-center">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.iconGradient} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2 text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* AI Pick For You - Mood & Genre based */}
          <section className="mb-12">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-3 flex items-center gap-2 justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
                AI Pick For You
              </h2>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                Select your mood and/or genre, then click Submit to create a matching playlist.
              </p>
            </div>

            {/* Genre Selection */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                Music Genres
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                {availableGenres.length === 0 ? (
                  [...Array(10)].map((_, idx) => (
                    <Card key={idx} className="bg-white/5 border border-white/10 animate-pulse">
                      <CardContent className="p-4 h-24" />
                    </Card>
                  ))
                ) : (
                  availableGenres.map((genre) => {
                    const isSelected = selectedGenreIds.includes(genre.id);
                    return (
                      <Card
                        key={genre.id}
                        className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${
                          isSelected
                            ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary shadow-lg shadow-primary/20"
                            : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                        }`}
                        onClick={() => handleToggleGenre(genre.id)}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? "bg-primary/20"
                              : "bg-white/10 group-hover:bg-white/15"
                          } transition-colors`}>
                            {(() => {
                              const preset = GENRE_ICON_OPTIONS.find((opt) => opt.value === genre.iconUrl);
                              if (preset) {
                                const IconComp = preset.icon;
                                return (
                                  <IconComp className={`w-7 h-7 ${isSelected ? "text-primary" : "text-white/70"}`} />
                                );
                              }
                              if (isRemoteIcon(genre.iconUrl)) {
                                return (
                                  <img
                                    src={genre.iconUrl}
                                    alt={genre.name}
                                    className="w-9 h-9 object-cover rounded-lg"
                                  />
                                );
                              }
                              return <Music className={`w-7 h-7 ${isSelected ? "text-primary" : "text-white/70"}`} />;
                            })()}
                          </div>
                          <div className="text-center w-full">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? "text-primary" : "text-white"
                            }`}>
                              {genre.name}
                            </p>
                            {genre.songCount !== undefined && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {genre.songCount.toLocaleString()} songs
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
              {selectedGenreIds.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {selectedGenreIds.length} genre{selectedGenreIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Mood Selection */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Moods & Emotions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                {availableMoods.length === 0 ? (
                  [...Array(10)].map((_, idx) => (
                    <Card key={idx} className="bg-white/5 border border-white/10 animate-pulse">
                      <CardContent className="p-4 h-28" />
                    </Card>
                  ))
                ) : (
                  availableMoods.map((mood) => {
                    const isSelected = selectedMoodIds.includes(mood.id);
                    const MoodIcon = getMoodIcon(mood.name, mood.tone);
                    const toneColors = {
                      positive: {
                        bg: "from-emerald-500/30 to-teal-500/10",
                        border: "border-emerald-400/40",
                        iconBg: "bg-emerald-500/20",
                        iconColor: "text-emerald-300",
                        badge: "bg-emerald-500/10 text-emerald-300 border-emerald-400/40"
                      },
                      negative: {
                        bg: "from-rose-500/30 to-pink-500/10",
                        border: "border-rose-400/40",
                        iconBg: "bg-rose-500/20",
                        iconColor: "text-rose-300",
                        badge: "bg-rose-500/10 text-rose-300 border-rose-400/40"
                      },
                      neutral: {
                        bg: "from-blue-500/30 to-cyan-500/10",
                        border: "border-blue-400/40",
                        iconBg: "bg-blue-500/20",
                        iconColor: "text-blue-300",
                        badge: "bg-blue-500/10 text-blue-200 border-blue-400/40"
                      }
                    };
                    const colors = toneColors[mood.tone];
                    
                    return (
                      <Card
                        key={mood.id}
                        className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${
                          isSelected
                            ? `bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg`
                            : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                        }`}
                        onClick={() => handleToggleMood(mood.id)}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isSelected ? colors.iconBg : "bg-white/10 group-hover:bg-white/15"
                          } transition-colors`}>
                            {(() => {
                              const preset = MOOD_ICON_OPTIONS.find((opt) => opt.value === mood.iconUrl);
                              if (preset) {
                                const IconComp = preset.icon;
                                return (
                                  <IconComp className={`w-6 h-6 ${isSelected ? colors.iconColor : "text-white/70"}`} />
                                );
                              }
                              if (isRemoteIcon(mood.iconUrl)) {
                                return (
                                  <img
                                    src={mood.iconUrl}
                                    alt={mood.name}
                                    className="w-8 h-8 object-cover rounded-lg"
                                  />
                                );
                              }
                              return <MoodIcon className={`w-6 h-6 ${isSelected ? colors.iconColor : "text-white/70"}`} />;
                            })()}
                          </div>
                          <div className="text-center w-full">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? colors.iconColor : "text-white"
                            }`}>
                              {mood.name}
                            </p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${colors.badge}`}>
                                {mood.tone === "positive"
                                  ? "Happy"
                                  : mood.tone === "negative"
                                    ? "Sad"
                                    : "Neutral"}
                              </span>
                            </div>
                            {mood.songCount !== undefined && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {mood.songCount.toLocaleString()} songs
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
              {selectedMoodIds.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {selectedMoodIds.length} mood{selectedMoodIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={handleSubmitDiscovery}
                disabled={isLoadingMoodRecs || (selectedMoodIds.length === 0 && selectedGenreIds.length === 0)}
                variant="hero"
                size="lg"
                className="gap-2 min-w-[200px]"
              >
                {isLoadingMoodRecs ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating playlist...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Playlist
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {selectedMoodIds.length === 0 && selectedGenreIds.length === 0
                  ? "Select at least one mood or genre to get started"
                  : "Click the button above to create a playlist based on your selection. Recommendations will appear in the player at the bottom of the screen."}
              </p>
            </div>
          </section>

          {/* Traditional Discovery removed below AI section as requested */}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Discover;