import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, TrendingUp, Clock } from "lucide-react";

const TrendingSection = () => {
  const hotSongs = [
    {
      id: 1,
      title: "Cosmic Vibes",
      artist: "Stellar Beat",
      duration: "3:45",
      trend: "+25%",
      plays: "2.1M"
    },
    {
      id: 2,
      title: "Purple Dreams",
      artist: "Neon Harmony",
      duration: "4:12",
      trend: "+18%",
      plays: "1.8M"
    },
    {
      id: 3,
      title: "Galactic Flow",
      artist: "Space Rhythm",
      duration: "3:33",
      trend: "+31%",
      plays: "3.2M"
    },
    {
      id: 4,
      title: "Electric Soul",
      artist: "Digital Hearts",
      duration: "4:56",
      trend: "+14%",
      plays: "1.5M"
    }
  ];

  const recentlyPlayed = [
    {
      id: 1,
      title: "Midnight Echo",
      artist: "Void Symphony",
      lastPlayed: "2 phút trước"
    },
    {
      id: 2,
      title: "Quantum Beats",
      artist: "Future Bass",
      lastPlayed: "15 phút trước"
    },
    {
      id: 3,
      title: "Neon Pulse",
      artist: "Cyber Wave",
      lastPlayed: "1 giờ trước"
    }
  ];

  return (
    <section className="py-8">
      <div className="container px-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Hot Songs */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-border/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                🔥 <span className="bg-gradient-neon bg-clip-text text-transparent">Hot Trending</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hotSongs.map((song, index) => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/10 group cursor-pointer transition-all">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded text-white font-bold text-sm">
                    🔥
                  </div>
                  <div className="w-10 h-10 bg-gradient-cosmic rounded flex items-center justify-center">
                    <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-neon-pink">{song.trend}</p>
                    <p className="text-xs text-muted-foreground">{song.plays}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Xem thêm trending
              </Button>
            </CardContent>
          </Card>

          {/* Recently Played */}
          <Card className="bg-gradient-glass backdrop-blur-sm border-border/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-neon-blue" />
                Nghe gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentlyPlayed.map((song) => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/10 group cursor-pointer transition-all">
                  <div className="w-10 h-10 bg-gradient-neon rounded flex items-center justify-center">
                    <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{song.lastPlayed}</p>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-neon-pink/10 rounded-lg border border-primary/20">
                <h4 className="font-medium text-sm mb-2">Khám phá thêm</h4>
                <p className="text-xs text-muted-foreground mb-3">Tìm hiểu những bài hát mới phù hợp với sở thích của bạn</p>
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow">
                  Khám phá ngay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;