import { Button } from "@/components/ui/button";
import { Play, Headphones, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-music.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-music-dark/90 via-background/80 to-primary/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 container px-6 py-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Discover
            </span>
            <br />
            <span className="text-foreground">Your Music Universe</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Search by melody, explore by mood, connect through music. 
            Experience the next generation of music discovery with AI-powered recommendations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="hero" size="lg" className="text-lg px-8 py-4 h-auto">
              <Play className="h-5 w-5 mr-2" />
              Start Listening Free
            </Button>
            <Button variant="glass" size="lg" className="text-lg px-8 py-4 h-auto">
              <Headphones className="h-5 w-5 mr-2" />
              Explore Features
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">10M+</div>
              <div className="text-muted-foreground">Songs Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neon-blue mb-2">500K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neon-pink mb-2">50K+</div>
              <div className="text-muted-foreground">Playlists Created</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Music Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-pulse opacity-60" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-neon-pink rounded-full animate-bounce opacity-40" />
        <div className="absolute bottom-40 left-20 w-5 h-5 bg-neon-blue rounded-full animate-ping opacity-50" />
        <div className="absolute bottom-20 right-10 w-3 h-3 bg-neon-green rounded-full animate-pulse opacity-70" />
      </div>

      {/* Trending Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm">Trending: Lo-Fi Hip Hop • Electronic • Pop</span>
      </div>
    </section>
  );
};

export default HeroSection;