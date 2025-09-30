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
import { Play, Headphones, Star, TrendingUp, Sparkles, Music } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { mockSongs } from "@/data/mockData";

const Index = () => {
  const isMobile = useIsMobile();
  const { playSong, setQueue } = useMusic();
  
  const topHits100 = mockSongs.slice(0, 5);
  const topHitsToday = mockSongs.slice(5, 9);
  const aiPicks = mockSongs.slice(0, 3);

  const editorsChoice = [
    { id: 1, title: "Chill Vibes Collection", tracks: 25, editor: "Music Team" },
    { id: 2, title: "Indie Rock Rising", tracks: 30, editor: "Alex Chen" },
    { id: 3, title: "Electronic Dreams", tracks: 22, editor: "Sofia Rodriguez" }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      <PromotionCarousel />
      <main className="pt-4">
        {/* Quick Features */}
        <section className="py-8">
          <div className="container px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">AI Search</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-neon-pink mx-auto mb-2" />
                  <p className="text-sm font-medium">Trending</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Music className="w-8 h-8 text-neon-blue mx-auto mb-2" />
                  <p className="text-sm font-medium">Genres</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <Headphones className="w-8 h-8 text-neon-green mx-auto mb-2" />
                  <p className="text-sm font-medium">Radio</p>
                </CardContent>
              </Card>
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
                      <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                      <div className="w-10 h-10 bg-gradient-primary rounded flex items-center justify-center overflow-hidden">
                        {song.cover ? (
                          <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{song.plays}</p>
                        <p className="text-xs text-muted-foreground">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" size="sm">View All 100</Button>
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
                <CardContent className="space-y-2">
                  {topHitsToday.map((song, index) => (
                    <div 
                      key={song.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer"
                      onClick={() => {
                        setQueue(topHitsToday);
                        playSong(song);
                      }}
                    >
                      <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                      <div className="w-10 h-10 bg-gradient-accent rounded flex items-center justify-center overflow-hidden">
                        {song.cover ? (
                          <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" size="sm">See More Trending</Button>
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
                          <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        <p className="text-xs text-primary">{song.genre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-500">{song.plays}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="hero" className="w-full mt-4" size="sm">Get More AI Picks</Button>
                </CardContent>
              </Card>

              {/* Editor's Choice */}
              <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-neon-blue" />
                    Editor's Albums
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editorsChoice.map((album) => (
                    <div key={album.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer">
                      <div className="w-12 h-12 bg-gradient-subtle rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{album.title}</p>
                        <p className="text-xs text-muted-foreground">by {album.editor}</p>
                        <p className="text-xs text-muted-foreground">{album.tracks} tracks</p>
                      </div>
                      <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" size="sm">Browse All Albums</Button>
                </CardContent>
              </Card>
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
