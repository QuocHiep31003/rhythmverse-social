import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { bannersApi, type Banner } from "@/services/api/bannerApi";
import { mockBanners } from "@/data/mockBanners";

const BannerCarousel = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  const handleCTAClick = (banner: Banner) => {
    // Sử dụng ctaUrl từ banner nếu có
    const ctaUrl = (banner as any).ctaUrl;
    if (ctaUrl) {
      navigate(ctaUrl);
      return;
    }
    
    // Fallback: logic cũ nếu không có ctaUrl
    const title = banner.title?.toLowerCase() || "";
    const ctaText = banner.ctaText?.toLowerCase() || "";
    
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
    bannersApi
      .getActive()
      .then((data) => {
        if (!mounted) return;
        // Nếu không có data từ API, dùng mock data để xem trước
        if (data && data.length > 0) {
          setBanners(data);
        } else {
          // Fallback to mock data for preview
          setBanners(mockBanners as Banner[]);
        }
      })
      .catch(() => {
        if (!mounted) return;
        // Fallback to mock data on error
        setBanners(mockBanners as Banner[]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHovered) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (banners.length ? (prev + 1) % banners.length : 0));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners.length, isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (banners.length ? (prev + 1) % banners.length : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (banners.length ? (prev - 1 + banners.length) % banners.length : 0));
  };

  return (
    <div className="container px-4 md:px-6 py-3 md:py-4">
      <div 
        className="relative overflow-hidden rounded-2xl md:rounded-3xl h-36 md:h-40 group shadow-2xl border border-white/10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Multi-layer Gradient Background with Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/35 to-blue-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
        
        {/* Animated Glow Orbs - Multiple Layers */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-neon-pink/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Animated Border Glow */}
        <div className="absolute inset-0 rounded-2xl md:rounded-3xl border-2 border-white/20 group-hover:border-white/40 transition-all duration-500" />
        
        <div 
          className="flex transition-all duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {banners.map((banner) => {
            const gradient = (banner as any).gradient || "from-purple-500/90 via-violet-500/90 to-fuchsia-500/90";
            // If gradient contains rgba() stops from auto-generation, use inline style
            const rgbaStops = typeof gradient === 'string' ? gradient.match(/rgba\([^\)]+\)/g) : null;
            const bgStyle = rgbaStops && rgbaStops.length > 0
              ? { backgroundImage: `linear-gradient(135deg, ${rgbaStops.join(', ')})` }
              : undefined;
            const badge = (banner as any).badge || (banner.active ? "ACTIVE" : "");
            return (
              <div
                key={banner.id}
                className={`min-w-full flex items-center px-5 md:px-8 relative ${rgbaStops ? '' : `bg-gradient-to-br ${gradient}`}`}
                style={bgStyle}
              >
                {/* Multi-layer Animated Background Patterns */}
                <div className="absolute inset-0 opacity-15">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_47%,rgba(255,255,255,0.06)_50%,transparent_53%)] bg-[length:25px_25px] opacity-60" />
                </div>

                {/* Floating Particle Orbs */}
                <div className="absolute top-4 right-12 w-20 h-20 bg-white/8 rounded-full blur-xl" />
                <div className="absolute bottom-4 left-12 w-16 h-16 bg-white/8 rounded-full blur-lg" />

                {/* Premium Badge with Glassmorphism */}
                {badge && (
                  <div className="absolute top-3 right-4 md:top-4 md:right-6 z-20">
                    <span className="px-3 py-1 bg-gradient-to-r from-white/30 via-white/25 to-white/30 backdrop-blur-2xl rounded-full text-white text-xs font-extrabold border-2 border-white/50 shadow-xl shadow-white/30 hover:scale-110 transition-all duration-300 uppercase tracking-wider">
                      {badge}
                    </span>
                  </div>
                )}

                {/* Premium Album/Artist Image with Multi-layer Effects - Clickable */}
                <div 
                  className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0 mr-4 md:mr-6 group/image cursor-pointer"
                  onClick={() => handleCTAClick(banner)}
                >
                  {/* Multi-layer Glow Effects */}
                  <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl scale-110 group-hover:scale-125 transition-all duration-500" />
                  <div className="absolute inset-0 bg-neon-pink/25 rounded-xl blur-lg scale-105 group-hover:scale-120 transition-all duration-500" style={{ animationDelay: '0.1s' }} />
                  
                  {/* Image Container with Premium Border */}
                  <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-4 border-white/50 shadow-2xl group-hover:scale-105 group-hover:rotate-1 transition-all duration-500 group-hover:border-white/70 group-hover:shadow-white/30">
                    <img 
                      src={(banner as any).image || banner.imageUrl || "/placeholder.svg"} 
                      alt={banner.title}
                      className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    {/* Multi-layer Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500" />
                  </div>
                  
                  {/* Premium Play Icon with Multiple Effects */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all duration-300 z-10">
                    {/* Outer Glow Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-full animate-ping" />
                    </div>
                    {/* Middle Pulse Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-white/15 rounded-full animate-pulse" />
                    </div>
                    {/* Play Button */}
                    <div className="relative w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-white via-white to-white/95 backdrop-blur-2xl rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300 border-4 border-white/60">
                      <Play className="w-6 h-6 md:w-7 md:h-7 text-gray-900 ml-0.5" fill="currentColor" />
                      {/* Inner Glow */}
                      <div className="absolute inset-0 bg-white/40 rounded-full blur-lg" />
                    </div>
                  </div>
                </div>

                {/* Premium Content with Gradient Text */}
                <div className="flex-1 min-w-0 mr-4 md:mr-6 z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/90 font-extrabold text-lg md:text-xl lg:text-2xl tracking-tight drop-shadow-2xl">
                      {banner.title}
                    </h3>
                  </div>
                  <p className="text-white/95 text-sm md:text-base font-semibold drop-shadow-xl line-clamp-2 leading-relaxed">
                    {banner.subtitle}
                  </p>
                </div>

                {/* Premium CTA Button with Advanced Effects */}
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="relative bg-gradient-to-r from-white via-white to-white/95 hover:from-white hover:via-white hover:to-white text-gray-900 font-bold px-6 md:px-8 py-4 md:py-5 rounded-full shadow-2xl hover:shadow-white/60 transition-all duration-300 hover:scale-110 border-4 border-white/70 z-10 group/button overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCTAClick(banner);
                  }}
                >
                  {/* Background Glow Layers */}
                  <div className="absolute inset-0 bg-white/40 rounded-full blur-2xl scale-150 group-hover/button:scale-200 transition-all duration-700" />
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-125 group-hover/button:scale-150 transition-all duration-700" />
                  
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full opacity-0 group-hover/button:opacity-100 group-hover/button:animate-shimmer transition-opacity duration-500" />
                  
                  {/* Button Content */}
                  <span className="relative z-10 text-sm md:text-base flex items-center gap-2 font-extrabold">
                    {banner.ctaText || 'Listen Now'}
                    <Play className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" fill="currentColor" />
                  </span>
                  
                  {/* Ripple Effect on Hover */}
                  <div className="absolute inset-0 rounded-full bg-white/30 opacity-0 group-hover/button:opacity-100 group-hover/button:scale-150 transition-all duration-500" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Premium Navigation Buttons with Glassmorphism */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-12 w-12 bg-gradient-to-br from-white/20 via-white/15 to-white/10 hover:from-white/30 hover:via-white/25 hover:to-white/15 text-white backdrop-blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 border-2 border-white/40 shadow-2xl hover:scale-110 hover:shadow-white/40 z-20"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-6 w-6" />
          <div className="absolute inset-0 bg-white/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 transform -translate-y-1/2 h-12 w-12 bg-gradient-to-br from-white/20 via-white/15 to-white/10 hover:from-white/30 hover:via-white/25 hover:to-white/15 text-white backdrop-blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 border-2 border-white/40 shadow-2xl hover:scale-110 hover:shadow-white/40 z-20"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
          <div className="absolute inset-0 bg-white/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>

        {/* Premium Progress Bar Indicators with Glow */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentSlide 
                  ? 'w-8 bg-white shadow-lg shadow-white/50 scale-110 border-2 border-white/50' 
                  : 'w-4 bg-white/50 hover:bg-white/70 hover:scale-110 border border-white/30'
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerCarousel;

