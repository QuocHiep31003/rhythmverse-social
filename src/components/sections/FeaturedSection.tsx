import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Heart, MoreHorizontal } from "lucide-react";

const FeaturedSection = () => {
  const featuredTracks = [
    {
      id: 1,
      title: "Starlight Symphony",
      artist: "Cosmic Dreams",
      album: "Galaxy Echoes",
      duration: "4:23",
      image: "/placeholder.svg",
      featured: true
    },
    {
      id: 2,
      title: "Neon Nights",
      artist: "Electric Pulse",
      album: "Digital Waves",
      duration: "3:47",
      image: "/placeholder.svg",
      featured: true
    },
    {
      id: 3,
      title: "Void Walker",
      artist: "Space Odyssey",
      album: "Beyond Stars",
      duration: "5:12",
      image: "/placeholder.svg",
      featured: true
    }
  ];

  return (
    <section className="py-8">
      <div className="container px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-neon bg-clip-text text-transparent">
            Nhạc Nổi Bật
          </h2>
          <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary">
            Xem tất cả
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTracks.map((track) => (
            <Card key={track.id} className="bg-gradient-glass backdrop-blur-sm border-border/30 hover:shadow-glow transition-all duration-300 group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-glow rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{track.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                    <p className="text-xs text-muted-foreground/80 truncate">{track.album}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{track.duration}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-neon-pink">
                          <Heart className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;