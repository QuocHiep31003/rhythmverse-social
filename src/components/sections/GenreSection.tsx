import { Card, CardContent } from "@/components/ui/card";
import { Music, Headphones, Radio, Mic } from "lucide-react";

const GenreSection = () => {
  const genres = [
    {
      id: 1,
      name: "Pop",
      icon: Music,
      color: "neon-pink",
      tracks: "2.5K"
    },
    {
      id: 2,
      name: "Electronic",
      icon: Radio,
      color: "neon-blue",
      tracks: "1.8K"
    },
    {
      id: 3,
      name: "Hip Hop",
      icon: Mic,
      color: "neon-purple",
      tracks: "3.2K"
    },
    {
      id: 4,
      name: "Ambient",
      icon: Headphones,
      color: "neon-green",
      tracks: "945"
    }
  ];

  return (
    <section className="py-8">
      <div className="container px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-neon bg-clip-text text-transparent">
            Thể Loại Âm Nhạc
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Khám phá âm nhạc theo sở thích của bạn</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {genres.map((genre) => {
            const IconComponent = genre.icon;
            return (
              <Card key={genre.id} className="bg-gradient-glass backdrop-blur-sm border-border/30 hover:shadow-neon transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-${genre.color} to-${genre.color}/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{genre.name}</h3>
                  <p className="text-xs text-muted-foreground">{genre.tracks} bài hát</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GenreSection;