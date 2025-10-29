import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PromotionCarousel from "@/components/PromotionCarousel";
import FeaturedMusic from "@/components/FeaturedMusic";
import GenreExplorer from "@/components/GenreExplorer";
import TrendingSection from "@/components/TrendingSection";
import Footer from "@/components/Footer";
import { MobileNotifications } from "@/components/MobileNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play,
  Headphones,
  Star,
  TrendingUp,
  Sparkles,
  Music,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import NewAlbums from "@/components/ui/NewAlbums"; // ✅ Thêm component mới
import { mockSongs } from "@/data/mockData";
import { useEffect, useState } from "react";
import { formatPlayCount } from "@/lib/utils";
import { songsApi } from "@/services/api";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playSong, setQueue } = useMusic();

  // Dữ liệu từ API thực tế - Hot Month (Monthly Trending)
  const [topHitsMonth, setTopHitsMonth] = useState([]);
  const aiPicks = mockSongs.slice(0, 3);

  // Danh sách Editor's albums
  const editorsChoice = [
    {
      id: 1,
      title: "Chill Vibes Collection",
      tracks: 25,
      editor: "Music Team",
    },
    { id: 2, title: "Indie Rock Rising", tracks: 30, editor: "Alex Chen" },
    {
      id: 3,
      title: "Electronic Dreams",
      tracks: 22,
      editor: "Sofia Rodriguez",
    },
  ];

  // Dữ liệu từ API thực tế - Hot Week (Weekly Trending)
  const [topHitsWeek, setTopHitsWeek] = useState([]);

  useEffect(() => {
    // Hot Week: Sử dụng API /api/trending/top-5
    const fetchHotWeek = async () => {
      try {
        const top5Trending = await songsApi.getTop5Trending();
        
        if (top5Trending && top5Trending.length > 0) {
          console.log('✅ Loaded top 5 trending:', top5Trending.length, 'songs');
          setTopHitsWeek(top5Trending);
          return;
        }
        
        console.log('⚠️ No trending data, falling back to mock data...');
        setTopHitsWeek(mockSongs.slice(0, 5));
      } catch (err) {
        console.error("❌ Lỗi tải trending:", err);
        setTopHitsWeek(mockSongs.slice(0, 5));
      }
    };
    
    fetchHotWeek();
  }, []);

  // Fetch monthly top 100 trending songs
  useEffect(() => {
    const fetchHotMonth = async () => {
      try {
        const monthlyTop100 = await songsApi.getMonthlyTop100();
        
        if (monthlyTop100 && monthlyTop100.length > 0) {
          console.log('✅ Loaded monthly top 100:', monthlyTop100.length, 'songs');
          
          // Sort by trendingScore từ cao xuống thấp (backend đã sort sẵn nhưng đảm bảo)
          const sortedSongs = monthlyTop100.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
          setTopHitsMonth(sortedSongs.slice(0, 5)); // Show top 5 on homepage
          return;
        }
        
        // Fallback nếu API không có data
        console.log('⚠️ No monthly data, falling back to mock data...');
        setTopHitsMonth(mockSongs.slice(0, 5));
      } catch (err) {
        console.error("❌ Lỗi tải monthly trending:", err);
        setTopHitsMonth(mockSongs.slice(0, 5));
      }
    };
    
    fetchHotMonth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <PromotionCarousel /> 
      <main className="pt-4">
        {/* Quick Features */}
        <section className="py-8">
          <div className="container px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  icon: Sparkles,
                  color: "text-primary",
                  label: "AI Search",
                  path: "/discover",
                },
                {
                  icon: TrendingUp,
                  color: "text-neon-pink",
                  label: "Trending",
                  path: "/trending",
                },
                {
                  icon: Music,
                  color: "text-neon-blue",
                  label: "Genres",
                  path: "/discover",
                },
                {
                  icon: Headphones,
                  color: "text-neon-green",
                  label: "Radio",
                  path: "/discover",
                },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer"
                  onClick={() => {
                    if (item.label === "Genres") {
                      // Scroll to genres section on the same page
                      const genresSection = document.getElementById("genres-section");
                      if (genresSection) {
                        genresSection.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    } else {
                      navigate(item.path);
                    }
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <item.icon
                      className={`w-8 h-8 ${item.color} mx-auto mb-2`}
                    />
                    <p className="text-sm font-medium">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Music Lists Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Hot Month */}
              <Card
                className="
    bg-gradient-glass backdrop-blur-sm border-white/10 
    transition-all duration-500 
    hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]
    hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5
  "
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Hot Month
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {topHitsMonth.map((song, index) => (
                    <div
                      key={song.id}
                      className="
          flex items-center gap-3 p-2 rounded-lg 
          group cursor-pointer transition-all 
          hover:bg-white/5 hover:scale-[1.02] hover:shadow-inner
        "
                      onClick={() => {
                        const formattedSongs = topHitsMonth.map(s => ({
                          id: s.id,
                          title: s.name,
                          artist: s.artistNames?.join(", ") || s.artists?.map((a) => a.name).join(", ") || "Unknown",
                          album: s.album?.name || "Unknown",
                          duration: s.duration || 0,
                          cover: s.cover || "",
                          genre: s.genreNames?.[0] || s.genres?.[0]?.name || "Unknown",
                          plays: formatPlayCount(s.playCount || 0),
                          audio: s.audioUrl,
                          audioUrl: s.audioUrl,
                        }));
                        setQueue(formattedSongs);
                        const currentFormatted = formattedSongs.find(s => s.id === song.id);
                        playSong(currentFormatted);
                      }}
                    >
                      {/* Số thứ tự */}
                      <span className="w-6 text-sm text-muted-foreground text-center">
                        {index + 1}
                      </span>

                      {/* Ảnh bìa hoặc ảnh mặc định */}
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={song.name}
                            className="
                w-full h-full object-cover 
                transition-transform duration-500 group-hover:scale-110
              "
                          />
                        ) : (
                          <Headphones className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Thông tin bài hát */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm group-hover:text-neon-pink transition-colors">
                          {(song as any).name || song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(song as any).artistNames?.join(", ") || (song as any).artists?.map((a: any) => a.name).join(", ") || "Unknown"}
                        </p>
                      </div>

                      {/* Lượt nghe */}
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Headphones className="w-3 h-3" />
                          {formatPlayCount(song.playCount || 0)}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => navigate("/top100")}
                  >
                    View All 100
                  </Button>
                </CardContent>
              </Card>

              {/* Hot Week */}
              <Card
                className="
    bg-gradient-glass backdrop-blur-sm border-white/10 
    transition-all duration-500 
    hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]
    hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5
  "
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neon-pink" />
                    Hot Week
                  </CardTitle>
                </CardHeader>

                <CardContent >
                  {topHitsWeek.map((song, index) => (
                    <div
                      key={song.id}
                      className="
          flex items-center gap-3 p-2 rounded-lg 
          group cursor-pointer transition-all 
          hover:bg-white/5 hover:scale-[1.02] hover:shadow-inner
        "
                      onClick={() => {
                        const formattedSongs = topHitsWeek.map(s => ({
                          id: s.id,
                          title: s.songName,
                          artist: s.artistNames?.join(", ") || s.artists?.map((a) => a.name).join(", ") || "Unknown",
                          album: s.album?.name || "Unknown",
                          duration: s.duration || 0,
                          cover: s.cover || "",
                          genre: s.genreNames?.[0] || s.genres?.[0]?.name || "Unknown",
                          plays: formatPlayCount(s.playCount || 0),
                          audio: s.audioUrl,
                          audioUrl: s.audioUrl,
                        }));
                        setQueue(formattedSongs);
                        const currentFormatted = formattedSongs.find(s => s.id === song.id);
                        playSong(currentFormatted);
                      }}
                    >
                      {/* Số thứ tự */}
                      <span className="w-6 text-sm text-muted-foreground text-center">
                        {index + 1}
                      </span>

                      {/* Ảnh bìa hoặc ảnh mặc định */}
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={song.songName}
                            className="
                w-full h-full object-cover 
                transition-transform duration-500 group-hover:scale-110
              "
                          />
                        ) : (
                          <Headphones className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Thông tin bài hát */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm group-hover:text-neon-pink transition-colors">
                          {(song as any).songName || song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(song as any).artistNames?.join(", ") || (song as any).artists?.map((a: any) => a.name).join(", ") || "Unknown"}
                        </p>
                      </div>

                      {/* Lượt nghe */}
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Headphones className="w-3 h-3" />
                          {formatPlayCount(song.duration || 0)}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => navigate("/trending")}
                  >
                    See More Trending
                  </Button>
                </CardContent>
              </Card>

              {/* AI Picks */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Picks For You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiPicks.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer"
                      onClick={() => {
                        setQueue(aiPicks);
                        playSong(song);
                      }}
                    >
                      <div className="w-10 h-10 bg-gradient-neon rounded flex items-center justify-center overflow-hidden">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={(song as any).name || song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artist}
                        </p>
                        <p className="text-xs text-primary">{song.genre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-500">
                          {song.plays}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="hero"
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => navigate("/discover")}
                  >
                    Get More AI Picks
                  </Button>
                </CardContent>
              </Card>

              {/* Editor's Choice / New Albums */}
              <NewAlbums />
            </div>
          </div>
        </section>

        <FeaturedMusic />
        <GenreExplorer />
        <TrendingSection />
      </main>

      <Footer />
      {isMobile && <MobileNotifications />}
    </div>
  );
};

export default Index;

