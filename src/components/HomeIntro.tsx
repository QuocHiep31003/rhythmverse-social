import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Compass,
  Users,
  MessageCircle,
} from "lucide-react";

const HomeIntro = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Find Music by Melody",
      description: "Hum, sing, or upload an audio file to find the song you're looking for",
      color: "from-primary to-purple-600",
      badge: "Music Recognition",
      link: "/music-recognition",
    },
    {
      icon: Compass,
      title: "Discover by Genre & Mood",
      description: "Get music recommendations that match your mood and preferences with AI",
      color: "from-accent to-pink-600",
      badge: "AI-RECOMMEND",
      link: "/discover",
    },
    {
      icon: Users,
      title: "Create Playlists with Friends",
      description: "Create and share personal playlists, collaborate with friends to build shared music collections",
      color: "from-blue-500 to-cyan-600",
      badge: "Collaborative",
      link: "/playlist/create",
    },
    {
      icon: MessageCircle,
      title: "Connect & Chat with Friends",
      description: "Make friends, send messages, and share your favorite music with the community",
      color: "from-emerald-500 to-teal-600",
      badge: "Social",
      link: "/social",
    },
  ];

  return (
    <section className="py-10 md:py-12 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <div className="container px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Search, Share, Enjoy Music
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover, search, and share your favorite songs with friends
          </p>
        </div>

        {/* Features Grid - 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-glow group cursor-pointer"
                onClick={() => navigate(feature.link)}
              >
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeIntro;

