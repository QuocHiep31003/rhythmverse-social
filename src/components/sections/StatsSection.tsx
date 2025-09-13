import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Music, Headphones, Clock, Star } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      id: 1,
      title: "Tổng thời gian nghe",
      value: "127h 45m",
      icon: Clock,
      color: "neon-blue",
      change: "+12%"
    },
    {
      id: 2,
      title: "Bài hát yêu thích",
      value: "342",
      icon: Star,
      color: "neon-pink",
      change: "+8%"
    },
    {
      id: 3,
      title: "Nghệ sĩ theo dõi",
      value: "28",
      icon: Music,
      color: "neon-purple",
      change: "+5%"
    },
    {
      id: 4,
      title: "Playlist đã tạo",
      value: "15",
      icon: Headphones,
      color: "neon-green",
      change: "+3%"
    }
  ];

  const topGenres = [
    { name: "Electronic", percentage: 85, color: "neon-blue" },
    { name: "Pop", percentage: 72, color: "neon-pink" },
    { name: "Ambient", percentage: 58, color: "neon-purple" },
    { name: "Hip Hop", percentage: 41, color: "neon-green" }
  ];

  return (
    <section className="py-8">
      <div className="container px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-neon bg-clip-text text-transparent">
            Thống Kê Cá Nhân
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Xem thói quen nghe nhạc của bạn</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Card key={stat.id} className="bg-gradient-glass backdrop-blur-sm border-border/30 hover:shadow-glow transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 bg-gradient-to-br from-${stat.color} to-${stat.color}/50 rounded-lg`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs text-neon-green font-medium">{stat.change}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-glass backdrop-blur-sm border-border/30">
          <CardHeader>
            <CardTitle className="text-lg">Thể loại yêu thích</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topGenres.map((genre) => (
              <div key={genre.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{genre.name}</span>
                  <span className="text-muted-foreground">{genre.percentage}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={genre.percentage} 
                    className="h-2 bg-muted/30"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-2 bg-gradient-to-r from-${genre.color} to-${genre.color}/70 rounded-full transition-all duration-500`}
                    style={{ width: `${genre.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default StatsSection;