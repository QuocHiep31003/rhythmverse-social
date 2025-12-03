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

interface FeaturedMusicProps {
  showOnlyFeatures?: boolean;
  showOnlyStats?: boolean;
}

interface FeaturedMusicProps {
  showOnlyFeatures?: boolean;
  showOnlyStats?: boolean;
  compact?: boolean;
}

const FeaturedMusic = ({ showOnlyFeatures = false, showOnlyStats = false, compact = false }: FeaturedMusicProps) => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Humming Search",
      description: "Hum, sing, or whistle a melody and we'll match it to the right song",
      color: "from-neon-pink to-primary",
      badge: "Humming",
    },
    {
      icon: Fingerprint,
      title: "Audio Fingerprint",
      description: "Upload any audio clip or YouTube link to get an exact match in seconds",
      color: "from-neon-blue to-accent",
      badge: "Fingerprint",
    },
    {
      icon: Music,
      title: "Smart AI Discovery",
      description: "Let EchoVerse AI find songs for you even if you only remember the vibe",
      color: "from-neon-green to-primary",
      badge: "AI Powered",
    },
  ];

  const sectionPadding = compact ? "py-8" : "py-16";
  const cardPadding = compact ? "p-6" : "p-8";
  const iconSize = compact ? "w-6 h-6" : "w-8 h-8";
  const iconWrapperSize = compact ? "w-12 h-12" : "w-16 h-16";

  return (
    <section className={`relative overflow-hidden ${sectionPadding}`}>
      {/* Space Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/5 to-pink-900/10" />
      </div>
      
      <div className="container px-6 relative z-10">
        {/* Features Grid - Only show if showOnlyFeatures is true or both are false */}
        {(!showOnlyStats) && (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${compact ? "mb-6" : "mb-10"}`}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className={`bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-glow group ${compact ? "rounded-2xl" : ""}`}
                >
                  <CardContent className={cardPadding}>
                    <div className={`${iconWrapperSize} rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className={`${iconSize} text-white`} />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 tracking-wide uppercase ${compact ? "opacity-80" : ""}`}
                    >
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
        )}

        {/* Stats - Only show if showOnlyStats is true or both are false */}
        {(!showOnlyFeatures) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className={`${compact ? "text-2xl" : "text-3xl"} font-bold text-primary mb-2`}>99%+</div>
              <div className="text-muted-foreground">Accuracy</div>
            </div>
            <div>
              <div className={`${compact ? "text-2xl" : "text-3xl"} font-bold text-primary mb-2`}>Millions</div>
              <div className="text-muted-foreground">Songs in Database</div>
            </div>
            <div>
              <div className={`${compact ? "text-2xl" : "text-3xl"} font-bold text-primary mb-2`}>Just Seconds</div>
              <div className="text-muted-foreground">To Find Your Song</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedMusic;
