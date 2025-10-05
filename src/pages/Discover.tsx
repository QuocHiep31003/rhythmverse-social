import { useState } from "react";
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
  Users
} from "lucide-react";

const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [userType, setUserType] = useState<"guest" | "free" | "premium">("guest");

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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Discover;