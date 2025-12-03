import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/Footer";
import { 
  TrendingUp, 
  Clock, 
  Music, 
  Play,
  Zap,
  Sparkles,
  Brain,
  Star,
  Headphones,
  Users,
  Loader2,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { songsApi as songsApiClient, moodsApi, genresApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getTrendingComparison, TrendingSong } from "@/services/api/trendingApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [hotToday, setHotToday] = useState<TrendingSong[]>([]);
  const [rankHistoryData, setRankHistoryData] = useState([]);
  const { setQueue, playSong } = useMusic();
  const { toast } = useToast();

  const [availableMoods, setAvailableMoods] = useState<Array<{ id: number; name: string; tone: "positive" | "negative" | "neutral" }>>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: number; name: string; iconUrl?: string }>>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<number[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [isLoadingMoodRecs, setIsLoadingMoodRecs] = useState(false);

  useEffect(() => {
    getTrendingComparison(10).then(setHotToday).catch(() => {});
  }, []);

  // Load moods for AI mood-based recommendations (only get ACTIVE)
  useEffect(() => {
    const loadMoods = async () => {
      try {
        const data = await moodsApi.getAll({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((m: any) => {
          const name: string = m.name || "";
          const lower = name.toLowerCase();
          let tone: "positive" | "negative" | "neutral" = "neutral";
          if (/(vui|happy|joy|love|party|energetic|phấn khích|sôi động)/i.test(lower)) {
            tone = "positive";
          } else if (/(buồn|sad|đau|tâm trạng|lonely|cry|heartbreak|dark)/i.test(lower)) {
            tone = "negative";
          }
          return { id: m.id as number, name, tone };
        });
        setAvailableMoods(items);
      } catch (error) {
        console.error("Failed to load moods for AI pick:", error);
      }
    };
    loadMoods();
  }, []);

  // Load genres for selection with logos (only get ACTIVE, ~50 genres)
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const data = await genresApi.getAll({ page: 0, size: 50, sort: "name,asc" });
        const items = (data?.content ?? []).map((g: any) => ({
          id: g.id as number,
          name: g.name || "",
          iconUrl: g.iconUrl || undefined,
        }));
        setAvailableGenres(items);
      } catch (error) {
        console.error("Failed to load genres:", error);
      }
    };
    loadGenres();
  }, []);

  // FE mock 8 rank points (fake dev, BE needs to add API to get real history points)
  useEffect(() => {
    if (hotToday.length < 3) return;
    // Assume 8 time points
    const mockTimes = [
      "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h"
    ];
    // Top 3 songs, each with 8 rank points (1 is top)
    const mockRanks = [
      [3,2,3,2,1,1,1,1], // top 1: fluctuating
      [2,1,1,1,2,3,2,2], // top 2
      [1,3,2,3,3,2,3,3], // top 3
    ];
    const data = mockTimes.map((time, idx) => ({
      time,
      song1: mockRanks[0][idx],
      song2: mockRanks[1][idx],
      song3: mockRanks[2][idx],
    }));
    setRankHistoryData(data);
  }, [hotToday]);

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
        description: "Select a mood or genre to discover new music.",
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
    <div className="min-h-screen bg-gradient-dark">
      <div className="pt-4 pb-24">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              AI-Powered Music Discovery
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover music like never before with our advanced AI features
            </p>
            
          </div>

          {/* AI Features Section */}
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                Discover with AI
              </h2>
              <p className="text-muted-foreground">
                Advanced AI technology helps you discover new music that matches your musical taste
              </p>
            </div>

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
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center">
                <Brain className="w-5 h-5 text-primary" />
                AI Pick For You
              </h2>
              <p className="text-sm text-muted-foreground">
                Select your mood and/or genre, then click Submit to create a matching playlist.
              </p>
            </div>

            {/* Genre Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-center">Genre</h3>
              <div className="flex flex-wrap justify-center gap-3 mb-2">
                {availableGenres.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Loading genres...</p>
                ) : (
                  availableGenres.map((genre) => {
                    const isSelected = selectedGenreIds.includes(genre.id);
                    return (
                      <Button
                        key={genre.id}
                        type="button"
                        size="lg"
                        variant={isSelected ? "default" : "outline"}
                        className="rounded-full px-4 py-2 h-auto gap-2"
                        onClick={() => handleToggleGenre(genre.id)}
                      >
                        {genre.iconUrl && (
                          <img 
                            src={genre.iconUrl} 
                            alt={genre.name} 
                            className="w-6 h-6 object-cover rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium">{genre.name}</span>
                      </Button>
                    );
                  })
                )}
              </div>
              {selectedGenreIds.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {selectedGenreIds.length} genre{selectedGenreIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Mood Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-center">Mood</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {availableMoods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Loading moods...</p>
                ) : (
                  availableMoods.map((mood) => {
                    const isSelected = selectedMoodIds.includes(mood.id);
                    return (
                      <Button
                        key={mood.id}
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="rounded-full text-xs px-3 py-1"
                        onClick={() => handleToggleMood(mood.id)}
                      >
                        <span className="flex items-center gap-1">
                          <span>{mood.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
                              mood.tone === "positive"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/40"
                                : mood.tone === "negative"
                                ? "bg-rose-500/10 text-rose-300 border-rose-400/40"
                                : "bg-blue-500/10 text-blue-200 border-blue-400/40"
                            }`}
                          >
                            {mood.tone === "positive"
                              ? "Positive"
                              : mood.tone === "negative"
                              ? "Melancholic"
                              : "Neutral"}
                          </span>
                        </span>
                      </Button>
                    );
                  })
                )}
              </div>
              {selectedMoodIds.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
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
              <p className="text-xs text-muted-foreground text-center max-w-md">
                {selectedMoodIds.length === 0 && selectedGenreIds.length === 0
                  ? "Select at least one mood or genre to get started"
                  : "Click the button above to create a playlist based on your selection. Recommendations will appear in the player at the bottom of the screen."}
              </p>
            </div>
          </section>

          {/* Traditional Discovery removed below AI section as requested */}
        </div>
      </div>

      {/* Cosmic Hot Today + Rank Changes Section */}
      <section className="relative py-12 overflow-hidden">
        {/* Spacey background, different tone from Music Recognition */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-950/80 via-slate-950/90 to-indigo-900/80" />
          <div className="absolute -top-32 -left-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  Hot Today
                </h2>
                <p className="text-xs md:text-sm text-cyan-100/80">
                  Real-time trending songs across the EchoVerse universe
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Left: Hot Today list */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hotToday.length === 0 ? (
                  <span className="text-sm text-cyan-100/80">
                    No trending songs available.
                  </span>
                ) : (
                  hotToday.map((song, i) => (
                    <Card
                      key={song.songId}
                      className="group cursor-pointer bg-white/5 hover:bg-white/10 border border-cyan-400/30 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                      onClick={() => navigate(`/song/${song.songId}`)}
                    >
                      <CardContent className="p-4 flex gap-3">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-400 flex items-center justify-center overflow-hidden shadow-lg shadow-cyan-500/40 group-hover:scale-105 transition-transform">
                            {song.albumImageUrl ? (
                              <img
                                src={song.albumImageUrl}
                                alt={song.songName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-7 h-7 text-white" />
                            )}
                          </div>
                          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold flex items-center justify-center text-white shadow-md shadow-cyan-500/60">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white truncate">
                            {song.songName}
                          </h3>
                          <p className="text-xs text-cyan-100/80 truncate">
                            {song.artists?.map(a => a.name).join(", ")}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-[11px] text-cyan-100/80">
                            <Badge
                              variant="outline"
                              className="border-cyan-400/60 bg-cyan-500/10 text-[10px] px-2 py-0.5 uppercase tracking-wide"
                            >
                              Hot Today
                            </Badge>
                            {song.score !== undefined && (
                              <span className="opacity-80">
                                Score: {song.score.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Right: Top 3 Rank Fluctuation Chart */}
            <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-indigo-950/90 p-4 md:p-5 shadow-lg shadow-cyan-500/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-cyan-50">
                <TrendingUp className="w-5 h-5 text-cyan-300" />
                Top 3 Rank Changes
              </h3>
              <p className="text-[11px] text-cyan-100/70 mb-3">
                Rank movement of today&apos;s top 3 songs over the last hours
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rankHistoryData}>
                    <XAxis dataKey="time" stroke="#bae6fd" />
                    <YAxis
                      reversed
                      allowDecimals={false}
                      domain={[1, "auto"]}
                      stroke="#bae6fd"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        borderRadius: 8,
                        border: "1px solid rgba(34,211,238,0.6)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#e0f2fe" }} />
                    <Line
                      type="monotone"
                      dataKey="song1"
                      stroke="#22d3ee"
                      name={hotToday[0]?.songName || "#1"}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="song2"
                      stroke="#a855f7"
                      name={hotToday[1]?.songName || "#2"}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="song3"
                      stroke="#f97316"
                      name={hotToday[2]?.songName || "#3"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Discover;