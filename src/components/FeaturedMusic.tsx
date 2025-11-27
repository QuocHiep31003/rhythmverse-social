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
      title: "Tìm kiếm bằng giai điệu",
      description: "Hum, hát hoặc ngân nga giai điệu bạn nhớ, chúng tôi sẽ tìm bài hát cho bạn",
      color: "from-neon-pink to-primary",
      badge: "Humming",
    },
    {
      icon: Fingerprint,
      title: "Audio Fingerprint",
      description: "Tải lên file audio hoặc link YouTube, hệ thống sẽ nhận diện bài hát chính xác",
      color: "from-neon-blue to-accent",
      badge: "Fingerprint",
    },
    {
      icon: Search,
      title: "Tìm kiếm thông minh",
      description: "Không cần biết tên bài hát, chỉ cần nhớ giai điệu là đủ",
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
            Tìm bài hát chỉ bằng giai điệu
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Bạn nhớ giai điệu nhưng quên tên bài hát? Chỉ cần hum, hát hoặc tải file audio lên, 
            chúng tôi sẽ tìm ra bài hát bạn đang tìm kiếm!
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
                  Sẵn sàng thử ngay?
                </h3>
                <p className="text-muted-foreground text-lg">
                  Hum một giai điệu hoặc tải file audio lên để tìm bài hát bạn đang tìm kiếm
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
                  Thử ngay
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 min-w-[200px]"
                  onClick={() => navigate("/discover")}
                >
                  <Music className="w-5 h-5" />
                  Khám phá thêm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats or Testimonials */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">99%+</div>
            <div className="text-muted-foreground">Độ chính xác</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">Hàng triệu</div>
            <div className="text-muted-foreground">Bài hát trong database</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">Chỉ vài giây</div>
            <div className="text-muted-foreground">Để tìm ra bài hát</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMusic;
