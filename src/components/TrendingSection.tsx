import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MusicCard from "./MusicCard";
import { TrendingUp, Clock, Heart } from "lucide-react";

const trendingSongs = [
  { title: "Hành tinh âm nhạc", artist: "Tùng Sơn", album: "Galaxy", duration: "3:45" },
  { title: "Vũ trụ lofi", artist: "Chill Band", album: "Space Beats", duration: "4:12" },
  { title: "Nhịp điệu đêm", artist: "DJ Star", album: "Midnight", duration: "5:23" },
  { title: "Echo Dreams", artist: "Luna Waves", album: "Neon Nights", duration: "3:58" },
  { title: "Digital Sunrise", artist: "Cyber Melody", album: "Future Sounds", duration: "4:35" },
];

const recentlyPlayed = [
  { title: "Synthwave Journey", artist: "Retro Future", duration: "4:20" },
  { title: "Urban Groove", artist: "Street Beats", duration: "3:15" },  
  { title: "Ambient Space", artist: "Cosmic Sound", duration: "6:42" },
  { title: "Bass Drop", artist: "Electronic Pulse", duration: "3:33" },
];

const TrendingSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-music-dark to-background">
      <div className="container px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trending Now */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Trending Now</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trendingSongs.map((song, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/20 transition-colors group cursor-pointer">
                    <div className="text-2xl font-bold text-primary w-8">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-foreground">
                        {song.artist.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{song.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-muted-foreground hover:text-neon-pink cursor-pointer transition-colors" />
                      <span className="text-sm text-muted-foreground">{song.duration}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recently Played */}
          <div>
            <Card className="bg-card/50 border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <span>Recently Played</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentlyPlayed.map((song, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-accent-foreground">
                        {song.artist.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-foreground truncate text-sm">{song.title}</h5>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{song.duration}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-glass border-border/40 mt-6">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Your Music Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Songs Played</span>
                    <span className="font-semibold text-primary">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours Listened</span>
                    <span className="font-semibold text-neon-blue">86.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Favorite Genre</span>
                    <span className="font-semibold text-neon-pink">Electronic</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;