import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeaturedSection from "@/components/sections/FeaturedSection";
import GenreSection from "@/components/sections/GenreSection";
import MoodSection from "@/components/sections/MoodSection";
import TrendingSection from "@/components/sections/TrendingSection";
import StatsSection from "@/components/sections/StatsSection";
import CosmicSearchBar from "@/components/CosmicSearchBar";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-cosmic">
      <Header />
      <main className="pt-16">
        {/* Hero Search Section */}
        <section className="py-12 bg-gradient-glow">
          <div className="container px-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-neon bg-clip-text text-transparent mb-4">
                EchoVerse
              </h1>
              <p className="text-muted-foreground text-lg">Khám phá vũ trụ âm nhạc vô tận</p>
            </div>
            <CosmicSearchBar onSearch={(query) => console.log('Search:', query)} />
          </div>
        </section>

        {/* Main Sections */}
        <FeaturedSection />
        <TrendingSection />
        <MoodSection />
        <GenreSection />
        <StatsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
