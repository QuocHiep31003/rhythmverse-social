/* @ts-nocheck */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BannerCarousel from "@/components/BannerCarousel";
import FeaturedMusic from "@/components/FeaturedMusic";
import HomeIntro from "@/components/HomeIntro";

import GenreExplorer from "@/components/GenreExplorer";
import Footer from "@/components/Footer";
import { MobileNotifications } from "@/components/MobileNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import type { Song as PlayerSong } from "@/contexts/MusicContext";
import NewReleases from "@/components/ui/NewReleases"; // ✅ Component hiển thị bài hát mới
import NewAlbums from "@/components/ui/NewAlbums"; // ✅ Component hiển thị album mới
import AIPicksSection from "@/components/ui/AIPicksSection"; // ✅ AI Picks component
import TrendingSongsSection from "@/components/ui/TrendingSongsSection"; // ✅ Trending songs cho guest
import PopularSongsSection from "@/components/ui/PopularSongsSection"; // ✅ Popular songs cho guest
import ArtistFanSection from "@/components/ui/ArtistFanSection"; // ✅ Artist fan recommendations
import RecentListeningSection from "@/components/ui/RecentListeningSection"; // ✅ Nghe gần đây
import TopArtistSection from "@/components/ui/TopArtistSection"; // ✅ Ca sĩ nổi bật
import TopGenreMoodSection from "@/components/ui/TopGenreMoodSection"; // ✅ Genre/Mood nổi bật
import RecommendedArtistsSection from "@/components/ui/RecommendedArtistsSection"; // ✅ Gợi ý ca sĩ dựa trên lịch sử nghe
import RecommendedAlbumsSection from "@/components/ui/RecommendedAlbumsSection"; // ✅ Gợi ý album dựa trên lịch sử nghe
import { getAuthToken } from "@/services/api/config";
import { useEffect, useState } from "react";
import { formatPlayCount, mapToPlayerSong } from "@/lib/utils";
import { songsApi } from "@/services/api";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playSong, setQueue } = useMusic();

  // Dữ liệu từ API thực tế - Hot Month (Monthly Trending)
  const [topHitsMonth, setTopHitsMonth] = useState([]);
  const aiPicks: any[] = [];

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

        console.log('⚠️ No trending data from API.');
        setTopHitsWeek([]);
      } catch (err) {
        console.error("❌ Lỗi tải trending:", err);
        setTopHitsWeek([]);
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
        console.log('⚠️ No monthly data from API.');
        setTopHitsMonth([]);
      } catch (err) {
        console.error("❌ Lỗi tải monthly trending:", err);
        setTopHitsMonth([]);
      }
    };

    fetchHotMonth();
  }, []);


  return (
    <div className="min-h-screen bg-gradient-dark">
      <BannerCarousel />

      {/* Home Introduction - Giới thiệu về web */}
      <HomeIntro />

      <main className="pt-4">
        {/* Quick Features */}
        <section className="py-8">
          <div className="container px-6">
            {/* AI Picks For You - Smart Recommendations (chỉ hiển thị khi đã đăng nhập) */}
            <AIPicksSection />

            {/* Nghe gần đây - Các bài hát đã nghe từ playlist, albums, ... */}
            <RecentListeningSection />

            {/* Ca sĩ nổi bật - Nghệ sĩ nghe nhiều nhất và bài hát của họ */}
            <TopArtistSection />

            {/* Genre/Mood nổi bật - Thể loại/tâm trạng nghe nhiều nhất */}
            <TopGenreMoodSection />

            {/* Artist Fan Sections - Gợi ý bài hát theo artist hay nghe */}
            <ArtistFanSection />

            {/* Gợi ý ca sĩ - Dựa trên lịch sử nghe và vector người dùng */}
            <RecommendedArtistsSection />
            
            {/* Gợi ý album - Dựa trên lịch sử nghe và vector người dùng */}
            <RecommendedAlbumsSection />

            {/* New Releases - Bài hát mới ra mắt */}
            <NewReleases />

            {/* New Albums - Album mới */}
            <NewAlbums />

            {/* Guest sections - Hiển thị nhiều gợi ý hơn cho guest */}
            {!getAuthToken() && (
              <>
                <TrendingSongsSection />
                <PopularSongsSection />
              </>
            )}
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

