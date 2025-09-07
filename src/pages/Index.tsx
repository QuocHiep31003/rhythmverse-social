import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import GenreExplorer from "@/components/GenreExplorer";
import TrendingSection from "@/components/TrendingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      <main>
        <HeroSection />
        <GenreExplorer />
        <TrendingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
