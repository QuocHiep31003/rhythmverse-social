import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Sparkles, Crown, Music2 } from "lucide-react";

const PromotionCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const promotions = [
    {
      id: 1,
      title: "New Release",
      subtitle: "Ed Sheeran – Autumn Variations",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      ctaText: "Listen Now",
      gradient: "from-orange-500/90 via-red-500/90 to-pink-600/90",
      icon: Play,
      badge: "NEW"
    },
    {
      id: 2,
      title: "Top Hits Vietnam",
      subtitle: "Fresh playlist just updated",
      image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
      ctaText: "Explore",
      gradient: "from-blue-500/90 via-purple-500/90 to-pink-500/90",
      icon: Music2,
      badge: "HOT"
    },
    {
      id: 3,
      title: "Premium Offer",
      subtitle: "30% off this week only",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
      ctaText: "Upgrade",
      gradient: "from-emerald-500/90 via-teal-500/90 to-cyan-500/90",
      icon: Crown,
      badge: "SALE"
    },
    {
      id: 4,
      title: "Taylor Swift",
      subtitle: "Midnights - New Album",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
      ctaText: "Play Now",
      gradient: "from-purple-500/90 via-violet-500/90 to-fuchsia-500/90",
      icon: Sparkles,
      badge: "TRENDING"
    }
  ];

  useEffect(() => {
    if (!isHovered) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % promotions.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [promotions.length, isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promotions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  return (
    <div className="container px-6 py-4">
      <div 
        className="relative overflow-hidden rounded-2xl h-32 md:h-36 group"
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
            const IconComponent = promo.icon;
            return (
              <div
                key={promo.id}
                className={`min-w-full flex items-center px-6 md:px-8 bg-gradient-to-r ${promo.gradient} relative`}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.05)_50%,transparent_52%)] bg-[length:20px_20px]" />
                </div>

                {/* Badge */}
                <div className="absolute top-4 right-4 md:right-8 z-10">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/30 shadow-lg">
                    {promo.badge}
                  </span>
                </div>

                {/* Album/Artist Image with Play Icon Overlay */}
                <div className="relative w-20 h-20 md:w-28 md:h-28 flex-shrink-0 mr-4 md:mr-6 group/image">
                  <div className="w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl group-hover:scale-105 transition-all duration-300">
                    <img 
                      src={promo.image} 
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
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
                      <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-gray-900 ml-0.5" />
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
                >
                  <span className="relative z-10">{promo.ctaText}</span>
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