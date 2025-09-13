import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Heart, Zap, Coffee, Smile } from "lucide-react";

const MoodSection = () => {
  const moods = [
    {
      id: 1,
      name: "Energetic",
      icon: Zap,
      description: "Pump up your energy",
      gradient: "from-neon-pink to-neon-purple",
      tracks: 156
    },
    {
      id: 2,
      name: "Chill",
      icon: Coffee,
      description: "Relax and unwind",
      gradient: "from-neon-blue to-neon-green",
      tracks: 203
    },
    {
      id: 3,
      name: "Happy",
      icon: Smile,
      description: "Feel good vibes",
      gradient: "from-neon-green to-neon-pink",
      tracks: 178
    },
    {
      id: 4,
      name: "Romantic",
      icon: Heart,
      description: "Love songs collection",
      gradient: "from-neon-pink to-primary",
      tracks: 134
    },
    {
      id: 5,
      name: "Morning",
      icon: Sun,
      description: "Start your day right",
      gradient: "from-primary to-neon-blue",
      tracks: 89
    },
    {
      id: 6,
      name: "Night",
      icon: Moon,
      description: "Late night sessions",
      gradient: "from-cosmic-deep to-primary",
      tracks: 167
    }
  ];

  return (
    <section className="py-8">
      <div className="container px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-neon bg-clip-text text-transparent">
              Âm Nhạc Theo Tâm Trạng
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Tìm nhạc phù hợp với cảm xúc hiện tại</p>
          </div>
          <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary">
            Xem thêm
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {moods.map((mood) => {
            const IconComponent = mood.icon;
            return (
              <Card key={mood.id} className="bg-gradient-glass backdrop-blur-sm border-border/30 hover:shadow-glow transition-all duration-300 group cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className={`w-14 h-14 mx-auto mb-3 bg-gradient-to-br ${mood.gradient} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-neon`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{mood.name}</h3>
                  <p className="text-xs text-muted-foreground/80 mb-2">{mood.description}</p>
                  <p className="text-xs text-primary font-medium">{mood.tracks} bài</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MoodSection;