import Header from "@/components/Header";
import FeaturedMusic from "@/components/FeaturedMusic";
import GenreExplorer from "@/components/GenreExplorer";
import TrendingSection from "@/components/TrendingSection";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Headphones, Star, TrendingUp, Sparkles, Music } from "lucide-react";

const Index = () => {
  const topHits100 = [
    { id: 1, title: "Flowers", artist: "Miley Cyrus", duration: "3:20", plays: "1.2B" },
    { id: 2, title: "Anti-Hero", artist: "Taylor Swift", duration: "3:24", plays: "987M" },
    { id: 3, title: "As It Was", artist: "Harry Styles", duration: "2:47", plays: "1.5B" },
    { id: 4, title: "Unholy", artist: "Sam Smith ft. Kim Petras", duration: "2:36", plays: "856M" },
    { id: 5, title: "Bad Habit", artist: "Steve Lacy", duration: "3:51", plays: "743M" }
  ];

  const topHitsToday = [
    { id: 1, title: "Vampire", artist: "Olivia Rodrigo", duration: "3:39", trend: "+15%" },
    { id: 2, title: "Paint The Town Red", artist: "Doja Cat", duration: "3:50", trend: "+22%" },
    { id: 3, title: "Cruel Summer", artist: "Taylor Swift", duration: "2:58", trend: "+8%" },
    { id: 4, title: "Seven", artist: "Jung Kook ft. Latto", duration: "3:03", trend: "+31%" }
  ];

  const aiPicks = [
    { id: 1, title: "Summertime Sadness", artist: "Lana Del Rey", reason: "Based on your mood", match: "94%" },
    { id: 2, title: "Blinding Lights", artist: "The Weeknd", reason: "Similar to your likes", match: "89%" },
    { id: 3, title: "Good 4 U", artist: "Olivia Rodrigo", reason: "Popular in your area", match: "91%" }
  ];

  const editorsChoice = [
    { id: 1, title: "Chill Vibes Collection", tracks: 25, editor: "Music Team" },
    { id: 2, title: "Indie Rock Rising", tracks: 30, editor: "Alex Chen" },
    { id: 3, title: "Electronic Dreams", tracks: 22, editor: "Sofia Rodriguez" }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <main className="pt-16">
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
                    <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer">
                      <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                      <div className="w-10 h-10 bg-gradient-primary rounded flex items-center justify-center">
                        <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{song.plays}</p>
                        <p className="text-xs text-muted-foreground">{song.duration}</p>
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
                    <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer">
                      <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                      <div className="w-10 h-10 bg-gradient-accent rounded flex items-center justify-center">
                        <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-500">{song.trend}</p>
                        <p className="text-xs text-muted-foreground">{song.duration}</p>
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
                    <div key={song.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer">
                      <div className="w-10 h-10 bg-gradient-neon rounded flex items-center justify-center">
                        <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        <p className="text-xs text-primary">{song.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-500">{song.match}</p>
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
                <TrendingSection />
        <GenreExplorer />

      </main>
      <Footer />
    </div>
  );
};

export default Index;
