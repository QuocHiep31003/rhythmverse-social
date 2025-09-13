import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PromotionCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const promotions = [
    {
      id: 1,
      title: "🔥 New Release: Ed Sheeran – Autumn Variations",
      thumbnail: "/placeholder.svg",
      ctaText: "Nghe ngay",
      gradient: "from-orange-500 to-red-600"
    },
    {
      id: 2,
      title: "🎧 Playlist Top Hits Việt Nam vừa cập nhật",
      thumbnail: "/placeholder.svg",
      ctaText: "Khám phá",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      id: 3,
      title: "✨ Gói Premium giảm 30% trong tuần này",
      thumbnail: "/placeholder.svg",
      ctaText: "Nâng cấp",
      gradient: "from-green-500 to-teal-600"
    },
    {
      id: 4,
      title: "🎵 Album mới từ Taylor Swift - Midnights",
      thumbnail: "/placeholder.svg",
      ctaText: "Nghe ngay",
      gradient: "from-purple-500 to-pink-600"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promotions.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promotions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  return (
    <div className="container px-6 py-4">
      <div className="relative overflow-hidden rounded-xl h-24 bg-gradient-glass backdrop-blur-sm border border-white/10">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`min-w-full flex items-center px-6 bg-gradient-to-r ${promo.gradient}`}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 bg-white/20 rounded-lg flex-shrink-0 mr-4 backdrop-blur-sm">
                <img 
                  src={promo.thumbnail} 
                  alt="Promotion" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base md:text-lg truncate">
                  {promo.title}
                </h3>
              </div>

              {/* CTA Button */}
              <Button 
                variant="secondary" 
                size="sm" 
                className="ml-4 bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                {promo.ctaText}
              </Button>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
          onClick={nextSlide}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Dot Indicators */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {promotions.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
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