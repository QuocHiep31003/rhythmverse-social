import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/Footer";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Music, 
  Play,
  Zap,
  Sparkles,
  Brain,
  Mic,
  FileText,
  Crown,
  Star,
  Headphones,
  Lock,
  Users,
  Loader2,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mapToPlayerSong } from "@/lib/utils";
import { songsApi as songsApiClient, moodsApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getTrendingComparison, TrendingSong } from "@/services/api/trendingApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [userType, setUserType] = useState<"guest" | "free" | "premium">("guest");
  const [hotToday, setHotToday] = useState<TrendingSong[]>([]);
  const [rankHistoryData, setRankHistoryData] = useState([]);
  const { setQueue, playSong } = useMusic();
  const { toast } = useToast();

  const [availableMoods, setAvailableMoods] = useState<Array<{ id: number; name: string; tone: "positive" | "negative" | "neutral" }>>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<number[]>([]);
  const [isLoadingMoodRecs, setIsLoadingMoodRecs] = useState(false);

  useEffect(() => {
    getTrendingComparison(10).then(setHotToday).catch(() => {});
  }, []);

  // Load moods for AI mood-based recommendations
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

  // FE mock dữ liệu 8 điểm rank (fake dev, BE cần bổ sung API lấy chuỗi điểm history thật)
  useEffect(() => {
    if (hotToday.length < 3) return;
    // Giả sử 8 mốc giờ
    const mockTimes = [
      "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h"
    ];
    // Top 3 bài, mỗi bài mảng 8 điểm rank (1 là top nhất)
    const mockRanks = [
      [3,2,3,2,1,1,1,1], // top 1: lên xuống
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
            title: "Mood trái ngược nhau",
            description: "Hạn chế chọn cùng lúc mood quá vui và quá buồn để gợi ý chính xác hơn.",
            variant: "warning",
          });
          return prev;
        }
      }

      // Khi chọn mood mới, tự loại các mood trái dấu (nếu có)
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

  // Khi danh sách mood được chọn thay đổi, tự động gọi BE để tạo queue
  useEffect(() => {
    const run = async () => {
      if (selectedMoodIds.length === 0) return;
      try {
        setIsLoadingMoodRecs(true);
        // 1) Thử dùng API recommend theo multi-mood
        const apiSongs = await songsApiClient.getRecommendationsByMoods(selectedMoodIds, 30);
        let mapped = apiSongs.map((s) => mapToPlayerSong(s));

        // 2) Nếu vẫn trống, fallback sang search theo moodId đầu tiên (ACTIVE)
        if (mapped.length === 0 && selectedMoodIds[0] != null) {
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
          playSong(mapped[0]);
          toast({
            title: "Đã tạo danh sách phát theo mood",
            description: `Đang phát: ${mapped[0].songName}`,
          });
        } else {
          toast({
            title: "Không tìm thấy bài hát phù hợp",
            description: "Thử chọn mood khác hoặc kiểm tra lại dữ liệu mood/bài hát trong hệ thống.",
          });
        }
      } catch (error) {
        console.error("Failed to load mood recommendations:", error);
        toast({
          title: "Lỗi khi gợi ý theo mood",
          description: "Vui lòng thử lại sau.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMoodRecs(false);
      }
    };
    run();
  }, [selectedMoodIds, playSong, setQueue, toast]);

  // AI Features for different user types
  const aiFeatures = {
    guest: [
      {
        icon: Mic,
        title: "Melody Search Demo",
        description: "Try our AI melody recognition - hum a tune and find the song",
        status: "demo",
        action: "Try Demo"
      },
      {
        icon: FileText,
        title: "Lyrics Search Demo",
        description: "Search songs by typing partial lyrics you remember",
        status: "demo",
        action: "Try Demo"
      },
      {
        icon: Brain,
        title: "Genre Explorer",
        description: "Discover music by mood and activity with AI suggestions",
        status: "available",
        action: "Explore"
      }
    ],
    free: [
      {
        icon: Mic,
        title: "Basic Melody Search",
        description: "Use AI to find songs by humming melodies (5 searches/day)",
        status: "limited",
        action: "Search Now"
      },
      {
        icon: FileText,
        title: "Advanced Lyrics Search",
        description: "Full access to our AI-powered lyrics search engine",
        status: "available",
        action: "Search Lyrics"
      },
      {
        icon: Brain,
        title: "AI Recommendations",
        description: "Get personalized song suggestions based on your listening history",
        status: "available",
        action: "Get Recommendations"
      },
      {
        icon: TrendingUp,
        title: "Trend Analysis",
        description: "See what's trending in your favorite genres",
        status: "available",
        action: "View Trends"
      }
    ],
    premium: [
      {
        icon: Mic,
        title: "Unlimited Melody Search",
        description: "Unlimited AI melody recognition with advanced algorithms",
        status: "premium",
        action: "Search Melody"
      },
      {
        icon: FileText,
        title: "Premium Lyrics Search",
        description: "Advanced lyrics search with context and meaning analysis",
        status: "premium",
        action: "Advanced Search"
      },
      {
        icon: Brain,
        title: "Advanced AI Recommendations",
        description: "Deep learning recommendations with mood and context analysis",
        status: "premium",
        action: "Discover Music"
      },
      {
        icon: Sparkles,
        title: "Collaborative Playlists",
        description: "AI-powered collaborative playlist creation and editing",
        status: "premium",
        action: "Create Playlist"
      },
      {
        icon: Star,
        title: "Exclusive AI Events",
        description: "Join AI-curated listening parties and exclusive events",
        status: "premium",
        action: "Join Events"
      }
    ]
  };

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
            
            {/* User Type Selector (for demo purposes) */}
            <div className="flex justify-center mt-6 gap-2">
              <Button 
                variant={userType === "guest" ? "default" : "outline"}
                onClick={() => setUserType("guest")}
                size="sm"
              >
                Guest Mode
              </Button>
              <Button 
                variant={userType === "free" ? "default" : "outline"}
                onClick={() => setUserType("free")}
                size="sm"
              >
                Free User
              </Button>
              <Button 
                variant={userType === "premium" ? "default" : "outline"}
                onClick={() => setUserType("premium")}
                size="sm"
                className="gap-1"
              >
                <Crown className="w-3 h-3" />
                Premium
              </Button>
            </div>
          </div>

          {/* AI Features Section */}
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">AI Features Available to You</h2>
              <p className="text-muted-foreground">
                {userType === "guest" && "Try our AI-powered features in demo mode"}
                {userType === "free" && "Access AI features with your free account"}
                {userType === "premium" && "Unlimited access to all AI-powered features"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {aiFeatures[userType].map((feature, index) => (
                <Card 
                  key={index} 
                  className={`bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all duration-300 ${
                    feature.status === "premium" ? "border-primary/40" : ""
                  }`}
                >
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      feature.status === "premium" ? "bg-gradient-primary" :
                      feature.status === "available" ? "bg-gradient-secondary" :
                      feature.status === "limited" ? "bg-gradient-accent" :
                      "bg-muted/20"
                    }`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="flex items-center justify-center gap-2">
                      {feature.title}
                      {feature.status === "premium" && <Crown className="w-4 h-4 text-primary" />}
                      {feature.status === "demo" && <Badge variant="secondary">Demo</Badge>}
                      {feature.status === "limited" && <Badge variant="outline">Limited</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                    <Button 
                      variant={feature.status === "premium" ? "hero" : "outline"}
                      className="w-full gap-2"
                      disabled={feature.status === "demo"}
                      onClick={() => {
                        if (feature.status !== "demo") {
                          console.log('Feature clicked:', feature.title);
                        }
                      }}
                    >
                      <Zap className="w-4 h-4" />
                      {feature.action}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upgrade CTA for non-premium users */}
            {userType !== "premium" && (
              <Card className="bg-gradient-primary/10 border-primary/20 p-6 text-center">
                <CardContent className="space-y-4">
                  <Crown className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-xl font-bold">Unlock Full AI Power</h3>
                  <p className="text-muted-foreground">
                    Get unlimited access to melody search, advanced lyrics analysis, and AI-powered recommendations
                  </p>
                  <Button variant="hero" size="lg" className="gap-2" onClick={() => navigate('/premium')}>
                    <Sparkles className="w-4 h-4" />
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* AI Pick For You - Mood based */}
          <section className="mb-12">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center">
                <Brain className="w-5 h-5 text-primary" />
                AI Pick For You
              </h2>
              <p className="text-sm text-muted-foreground">
                Chọn mood hiện tại của bạn, hệ thống sẽ tự tạo danh sách phát phù hợp và phát luôn cho bạn.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {availableMoods.map((mood) => {
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
                          ? "Tích cực"
                          : mood.tone === "negative"
                          ? "Trầm buồn"
                          : "Nhẹ nhàng"}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-col items-center gap-1">
              {selectedMoodIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Chọn ít nhất 1 mood. Hạn chế chọn cùng lúc mood quá vui và quá buồn để gợi ý chính xác hơn.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Đã chọn {selectedMoodIds.length} mood. Danh sách phát sẽ được cập nhật tự động khi bạn thay đổi mood.
                </p>
              )}
              {isLoadingMoodRecs && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo danh sách phát theo mood của bạn...
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Gợi ý sẽ xuất hiện trong trình phát ở cuối màn hình dưới dạng danh sách chờ.
              </p>
            </div>
          </section>

          {/* Advanced Search Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Advanced Music Search</h2>
            
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Melody Search */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    AI Melody Search
                    {userType === "guest" && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Hum, whistle, or sing a melody to find any song
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      disabled={userType === "guest"}
                    >
                      <Mic className="w-4 h-4" />
                      Start Humming
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                  {userType === "free" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      3/5 daily searches remaining
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Lyrics Search */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    AI Lyrics Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Type any lyrics you remember, even partial ones
                  </p>
                  <div className="space-y-2">
                    <Input 
                      placeholder="e.g., 'something about love under stars...'"
                      className="bg-muted/50 border-border/40"
                    />
                    <Button variant="outline" className="w-full gap-2">
                      <Search className="w-4 h-4" />
                      Search Lyrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Traditional Discovery */}
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
              <TabsTrigger value="ai-recommended" className="gap-2">
                <Brain className="w-4 h-4" />
                AI Recommended
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-2">
                <Users className="w-4 h-4" />
                Social Discovery
              </TabsTrigger>
            </TabsList>

          <TabsContent value="trending" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Trending Now</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendingSongs.map((song) => (
                  <Card 
                    key={song.id} 
                    className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                    onClick={() => navigate(`/song/${song.id}`)}
                  >
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
                  <Card 
                    key={song.id} 
                    className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                    onClick={() => navigate(`/song/${song.id}`)}
                  >
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

            <TabsContent value="ai-recommended" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-primary" />
                  AI-Powered Recommendations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recommendations.map((song) => (
                    <Card 
                      key={song.id} 
                      className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                      onClick={() => navigate(`/song/${song.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square bg-gradient-primary rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative">
                          <Brain className="w-8 h-8 text-white" />
                          <Badge className="absolute top-1 right-1 bg-gradient-primary text-white text-xs gap-1">
                            <Zap className="w-2 h-2" />
                            AI
                          </Badge>
                        </div>
                        <h3 className="font-medium truncate">{song.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                        <p className="text-xs text-primary mt-1 truncate">{song.reason}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="secondary" className="text-xs">{song.genre}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Social Discovery
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Headphones className="w-5 h-5" />
                        Friends are Listening
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {trendingSongs.slice(0, 2).map((song, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            3 friends
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Community Trending
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {newReleases.slice(0, 2).map((song, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10">
                          <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{song.title}</p>
                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Rising
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* --- Block Hot Today + Biểu đồ biến động bên phải --- */}
          <div className="mb-10 grid md:grid-cols-3 gap-6 items-start">
            {/* Hot Today Left */}
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Hot Today
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                {hotToday.length === 0 ? (
                  <span className="text-muted-foreground">No trending songs available.</span>
                ) : (
                  hotToday.map((song, i) => (
                    <Card 
                      key={song.songId}
                      className="group hover:shadow-glow transition-all duration-300 cursor-pointer bg-gradient-glass backdrop-blur-sm border-white/10"
                      onClick={() => navigate(`/song/${song.songId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square bg-gradient-primary rounded-lg mb-3 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                          {song.albumImageUrl
                            ? <img src={song.albumImageUrl} alt={song.songName} className="w-12 h-12 object-cover rounded" />
                            : <Music className="w-8 h-8 text-white" />}
                        </div>
                        <h3 className="font-medium truncate">
                          {i + 1}. {song.songName}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.artists?.map(a => a.name).join(", ")}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="secondary" className="text-xs">Hot Today</Badge>
                          <span className="text-xs text-muted-foreground">{song.score?.toFixed(2) ?? ""}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            {/* Right: Chart Top 3 trend biến động */}
            <div className="bg-gradient-glass rounded-xl p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Top 3 Rank Changes
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rankHistoryData}>
                  <XAxis dataKey="time" />
                  <YAxis reversed allowDecimals={false} domain={[1, 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="song1" stroke="#8884d8" name={hotToday[0]?.songName || "#1"}/>
                  <Line type="monotone" dataKey="song2" stroke="#82ca9d" name={hotToday[1]?.songName || "#2"}/>
                  <Line type="monotone" dataKey="song3" stroke="#ffc658" name={hotToday[2]?.songName || "#3"}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Discover;