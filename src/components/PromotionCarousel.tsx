import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { promotionsApi, type Promotion } from "@/services/api/promotionApi";
import { mockPromotions } from "@/data/mockPromotions";

const PromotionCarousel = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const handleCTAClick = (promo: Promotion) => {
    // Sử dụng ctaUrl từ promotion nếu có
    const ctaUrl = (promo as any).ctaUrl;
    if (ctaUrl) {
      navigate(ctaUrl);
      return;
    }
    
    // Fallback: logic cũ nếu không có ctaUrl
    const title = promo.title?.toLowerCase() || "";
    const ctaText = promo.ctaText?.toLowerCase() || "";
    
    // Premium banner → navigate to premium page
    if (title.includes("premium") || title.includes("nâng cấp") || ctaText.includes("nâng cấp")) {
      navigate("/premium");
      return;
    }
    
    // "Tìm bài hát" / "Thử ngay" → navigate to music recognition
    if (title.includes("tìm bài hát") || title.includes("giai điệu") || ctaText.includes("thử ngay")) {
      navigate("/music-recognition");
      return;
    }
    
    // "Khám phá" / "Trending" → navigate to discover
    if (title.includes("khám phá") || title.includes("xu hướng") || title.includes("trending") || ctaText.includes("khám phá")) {
      navigate("/discover");
      return;
    }
    
    // Default: navigate to discover
    navigate("/discover");
  };

  useEffect(() => {
    let mounted = true;
    promotionsApi
      .getActive()
      .then((data) => {
        if (!mounted) return;
        // Nếu không có data từ API, dùng mock data để xem trước
        if (data && data.length > 0) {
          setPromotions(data);
        } else {
          // Fallback to mock data for preview
          setPromotions(mockPromotions as Promotion[]);
        }
      })
      .catch(() => {
        if (!mounted) return;
        // Fallback to mock data on error
        setPromotions(mockPromotions as Promotion[]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHovered) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (promotions.length ? (prev + 1) % promotions.length : 0));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [promotions.length, isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (promotions.length ? (prev + 1) % promotions.length : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (promotions.length ? (prev - 1 + promotions.length) % promotions.length : 0));
  };

  return (
    <div className="container px-6 py-2 md:py-3">
      <div 
        className="relative overflow-hidden rounded-2xl h-28 md:h-32 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient Background with Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-xl" />
        
        <div 
          className="flex transition-all duration-700 ease-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {promotions.map((promo) => {
            const gradient = (promo as any).gradient || "from-purple-500/90 via-violet-500/90 to-fuchsia-500/90";
            // If gradient contains rgba() stops from auto-generation, use inline style
            const rgbaStops = typeof gradient === 'string' ? gradient.match(/rgba\([^\)]+\)/g) : null;
            const bgStyle = rgbaStops && rgbaStops.length > 0
              ? { backgroundImage: `linear-gradient(to right, ${rgbaStops.join(', ')})` }
              : undefined;
            const badge = (promo as any).badge || (promo.active ? "ACTIVE" : "");
            return (
              <div
                key={promo.id}
                className={`min-w-full flex items-center px-6 md:px-8 relative ${rgbaStops ? '' : `bg-gradient-to-r ${gradient}`}`}
                style={bgStyle}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.05)_50%,transparent_52%)] bg-[length:20px_20px]" />
                </div>

                {/* Badge */}
                {badge && (
                  <div className="absolute top-4 right-4 md:right-8 z-10">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/30 shadow-lg">
                      {badge}
                    </span>
                  </div>
                )}

                {/* Album/Artist Image with Play Icon Overlay */}
                <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0 mr-4 md:mr-6 group/image">
                  <div className="w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl group-hover:scale-105 transition-all duration-300">
                    <img 
                      src={(promo as any).image || promo.imageUrl || "/placeholder.svg"} 
                      alt={promo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  
                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
                      <Play className="w-5 h-5 md:w-6 md:h-6 text-gray-900 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg md:text-xl tracking-tight">
                      {promo.title}
                    </h3>
                  </div>
                  <p className="text-white/90 text-sm md:text-base font-medium truncate">
                    {promo.subtitle}
                  </p>
                </div>

                {/* CTA Button with Glow Effect */}
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="relative bg-white hover:bg-white text-gray-900 font-semibold px-6 md:px-8 rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105 border-2 border-white/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCTAClick(promo);
                  }}
                >
                  <span className="relative z-10">{promo.ctaText || 'Listen Now'}</span>
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Modern Navigation Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10 w-10 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-10 w-10 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20"
          onClick={nextSlide}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Modern Progress Bar Indicators */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {promotions.map((_, index) => (
            <button
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentSlide 
                  ? 'w-8 bg-white shadow-lg shadow-white/50' 
                  : 'w-4 bg-white/40 hover:bg-white/60'
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionCarousel;