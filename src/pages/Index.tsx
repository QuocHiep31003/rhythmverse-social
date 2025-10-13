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
import NewAlbums from "@/components/ui/NewAlbums"; // ✅ thêm component mới
import { mockSongs } from "@/data/mockData";
import { useEffect, useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playSong, setQueue } = useMusic();

  // Dữ liệu local (mock)
  const topHits100 = mockSongs.slice(0, 5);
  const aiPicks = mockSongs.slice(0, 3);

  // Danh sách Editor’s albums
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

  // Dữ liệu từ API thực tế
  const [topHitsToday, setTopHitsToday] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/songs")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.content) {
          const songs = data.content;
          const sorted = songs
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, 5);
          setTopHitsToday(sorted);
        }
      })
      .catch((err) => console.error("Lỗi tải bài hát:", err));
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
                  onClick={() => navigate(item.path)}
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
              {/* Top Hits 100 */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top Hits 100
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topHits100.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer"
                      onClick={() => {
                        setQueue(topHits100);
                        playSong(song);
                      }}
                    >
                      <span className="w-6 text-sm text-muted-foreground text-center">
                        {index + 1}
                      </span>
                      <div className="w-10 h-10 bg-gradient-primary rounded flex items-center justify-center overflow-hidden">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={song.title}
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
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {song.plays}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(song.duration / 60)}:
                          {(song.duration % 60).toString().padStart(2, "0")}
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

              {/* Top Hits Today */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neon-pink" />
                    Hot Today
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {topHitsToday.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer transition-all"
                      onClick={() => {
                        setQueue(topHitsToday);
                        playSong(song);
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
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Headphones className="w-6 h-6 text-gray-400" /> // icon tai nghe
                        )}
                      </div>

                      {/* Thông tin bài hát */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {song.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artists?.map((a) => a.name).join(", ")}
                        </p>
                      </div>

                      {/* Lượt nghe */}
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Headphones className="w-3 h-3" />
                          {song.playCount || 0}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* <Button
                    variant="outline"
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => navigate("/trending")}
                  >
                    See More Trending
                  </Button> */}
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
                            alt={song.title}
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

              {/* Editor's Choice */}
<<<<<<< HEAD
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-neon-blue" />
                    Editor's Albums
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editorsChoice.map((album) => (
                    <div
                      key={album.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-gradient-subtle rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {album.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {album.editor}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {album.tracks} tracks
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => navigate("/discover")}
                  >
                    Browse All Albums
                  </Button>
                </CardContent>
              </Card>
=======
 <NewAlbums />
>>>>>>> feaa6184998d9d00f7c4d718017df9db241274db
            </div>
          </div>
        </section>

        <FeaturedMusic />
        <GenreExplorer />
        <TrendingSection />
      </main>

      <Footer />

      {/* Mobile Notifications */}
      {isMobile && <MobileNotifications />}
    </div>
  );
};

export default Index;
