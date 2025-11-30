import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Music,
  Fingerprint,
  Search,
  ArrowRight,
} from "lucide-react";

const FeaturedMusic = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Search by Melody",
      description: "Hum, sing, or whistle the melody you remember, and we'll find the song for you",
      color: "from-neon-pink to-primary",
      badge: "Humming",
    },
    {
      icon: Fingerprint,
      title: "Audio Fingerprint",
      description: "Upload an audio file or YouTube link, and our system will accurately identify the song",
      color: "from-neon-blue to-accent",
      badge: "Fingerprint",
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "No need to know the song name, just remember the melody and that's enough",
      color: "from-neon-green to-primary",
      badge: "AI Powered",
    },
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <div className="container px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Find Songs by Melody Only
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Remember the melody but forgot the song name? Just hum, sing, or upload an audio file, 
            and we'll find the song you're looking for!
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-glow group"
              >
                <CardContent className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
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

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-primary/30">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  Ready to Try It Now?
                </h3>
                <p className="text-muted-foreground text-lg">
                  Hum a melody or upload an audio file to find the song you're looking for
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="hero"
                  size="lg"
                  className="gap-2 min-w-[200px]"
                  onClick={() => navigate("/music-recognition")}
                >
                  <Mic className="w-5 h-5" />
                  Try Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
           
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats or Testimonials */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">99%+</div>
            <div className="text-muted-foreground">Accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">Millions</div>
            <div className="text-muted-foreground">Songs in Database</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">Just Seconds</div>
            <div className="text-muted-foreground">To Find Your Song</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMusic;
