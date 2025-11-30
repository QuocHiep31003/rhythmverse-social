/* @ts-nocheck */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PromotionCarousel from "@/components/PromotionCarousel";
import FeaturedMusic from "@/components/FeaturedMusic";
import GenreExplorer from "@/components/GenreExplorer";
import Footer from "@/components/Footer";
import { MobileNotifications } from "@/components/MobileNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import type { Song as PlayerSong } from "@/contexts/MusicContext";
import NewAlbums from "@/components/ui/NewAlbums"; // ✅ Thêm component mới
import AIPicksSection from "@/components/ui/AIPicksSection"; // ✅ AI Picks component
import { mockSongs } from "@/data/mockData";
import { useEffect, useState } from "react";
import { formatPlayCount, mapToPlayerSong } from "@/lib/utils";
import { songsApi } from "@/services/api";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playSong, setQueue } = useMusic();

  // Dữ liệu từ API thực tế - Hot Month (Monthly Trending)
  const [topHitsMonth, setTopHitsMonth] = useState([]);
  const aiPicks = mockSongs.slice(0, 3);

  // Danh sách Editor's albums
  const editorsChoice = [
    {
      id: 1,
      title: "Chill Vibes Collection",
      tracks: 25,
      editor: "Music Team",
    },
    { id: 2, title: "Indie Rock Rising", tracks: 30, editor: "Alex Chen" },
    {
      id: 3,
      title: "Electronic Dreams",
      tracks: 22,
      editor: "Sofia Rodriguez",
    },
  ];

  // Dữ liệu từ API thực tế - Hot Week (Weekly Trending)
  const [topHitsWeek, setTopHitsWeek] = useState([]);


  useEffect(() => {
    // Hot Week: Sử dụng API /api/trending/top-5
    const fetchHotWeek = async () => {
      try {
        const top5Trending = await songsApi.getTop5Trending();

        if (top5Trending && top5Trending.length > 0) {
          console.log('✅ Loaded top 5 trending:', top5Trending.length, 'songs');
          setTopHitsWeek(top5Trending);
          return;
        }

        console.log('⚠️ No trending data, falling back to mock data...');
        setTopHitsWeek(mockSongs.slice(0, 5));
      } catch (err) {
        console.error("❌ Lỗi tải trending:", err);
        setTopHitsWeek(mockSongs.slice(0, 5));
      }
    };

    fetchHotWeek();
  }, []);

  // Fetch monthly top 100 trending songs
  useEffect(() => {
    const fetchHotMonth = async () => {
      try {
        const monthlyTop100 = await songsApi.getMonthlyTop100();

        if (monthlyTop100 && monthlyTop100.length > 0) {
          console.log('✅ Loaded monthly top 100:', monthlyTop100.length, 'songs');

          // Sort by trendingScore từ cao xuống thấp (backend đã sort sẵn nhưng đảm bảo)
          const sortedSongs = monthlyTop100.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
          setTopHitsMonth(sortedSongs.slice(0, 5)); // Show top 5 on homepage
          return;
        }

        // Fallback nếu API không có data
        console.log('⚠️ No monthly data, falling back to mock data...');
        setTopHitsMonth(mockSongs.slice(0, 5));
      } catch (err) {
        console.error("❌ Lỗi tải monthly trending:", err);
        setTopHitsMonth(mockSongs.slice(0, 5));
      }
    };

    fetchHotMonth();
  }, []);


  return (
    <div className="min-h-screen bg-gradient-dark">
      <PromotionCarousel />
      
      {/* Find songs by melody only - Right below banner */}
      <FeaturedMusic />
      
      <main className="pt-4">
        {/* Quick Features */}
        <section className="py-8">
          <div className="container px-6">
            {/* AI Picks For You - Smart Recommendations */}
            <AIPicksSection />

            {/* Editor's Choice / New Albums */}
            <NewAlbums />
          </div>
        </section>

        <GenreExplorer />
      </main>

      <Footer />
      {isMobile && <MobileNotifications />}
      
    </div>
  );
};

export default Index;

