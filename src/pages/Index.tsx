import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PromotionCarousel from "@/components/PromotionCarousel";
import FeaturedMusic from "@/components/FeaturedMusic";
import GenreExplorer from "@/components/GenreExplorer";
import TrendingSection from "@/components/TrendingSection";
import Footer from "@/components/Footer";
import { MobileNotifications } from "@/components/MobileNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play,
  Headphones,
  Star,
  TrendingUp,
  Sparkles,
  Music,
  Heart,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import NewAlbums from "@/components/ui/NewAlbums"; // ✅ Thêm component mới
import { mockSongs } from "@/data/mockData";
import { useEffect, useState } from "react";
import { formatPlayCount } from "@/lib/utils";
import { songsApi } from "@/services/api";
import { getTrendingComparison, TrendingSong } from "@/services/api/trendingApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import React from "react"; // (đảm bảo đã import cho JSX trong tooltip)

// Helper tạo 8 mốc giờ (3 tiếng 1 mốc) dạng "HH:00"
function generateRecentHours() {
  const now = new Date();
  return Array.from({ length: 8 }).map((_, i) => {
    const d = new Date(now.getTime() - (7 - i) * 3 * 60 * 60 * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  });
}

// Custom Tooltip cho Chart
const CHART_COLORS = [
  '#facc15', // vàng top 1
  '#34d399', // xanh lá top 2
  '#fb923c', // cam top 3
];

const CustomChartTooltip = ({ active, payload, label, songs }) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]; // Chỉ show đúng line hover
  const chartIndex = parseInt(entry.dataKey.replace("song", "")) - 1;
  const color = CHART_COLORS[chartIndex] || '#fff';

  // Xác định vị trí đúng của bài hát ở mỗi mốc
  const hours = generateRecentHours();
  const timeIdx = hours.findIndex((h) => h === label);
  if (timeIdx < 0) return null;
  const mockRanks = [ [3,2,3,2,1,1,1,1], [2,1,1,1,2,3,2,2], [1,3,2,3,3,2,3,3] ];
  const songTopIds = [mockRanks[0][timeIdx]-1, mockRanks[1][timeIdx]-1, mockRanks[2][timeIdx]-1];
  const topSongs = songTopIds.map(i => songs?.[i]);
  const thisSong = topSongs[chartIndex];

  // Tính phần trăm đóng góp score (nếu có score)
  const scores = topSongs.map(s => typeof s?.score === 'number' ? s.score : 0);
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const percent = (thisSong && typeof thisSong.score === 'number' && totalScore > 0) ? Math.round(thisSong.score / totalScore * 100) : null;

  // Tooltip: avatar, tên, nghệ sĩ, phần trăm phải, dòng dưới show 3 score top, bài đang hover màu nổi bật
  return (
    <div className="rounded-lg bg-card border p-3 min-w-[208px] shadow-xl flex items-center gap-2" style={{ borderColor: color, borderWidth: 2 }}>
      {thisSong?.albumImageUrl && (
        <img src={thisSong.albumImageUrl} alt={thisSong.songName} className="w-10 h-10 rounded object-cover border-2" style={{ borderColor: color }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate max-w-[130px] font-semibold text-base" style={{color}}>{thisSong?.songName}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[130px]">{thisSong?.artists?.map(a => a.name).join(", ")}</div>
        <div className="flex gap-1 mt-1 text-xs whitespace-nowrap select-none">
          {scores.map((s, i) =>
            <span key={i} style={i===chartIndex ? { color, fontWeight: 700 } : {}}>{s}</span>
          ).reduce((prev, curr) => [prev, <span key={'sep-'+Math.random()}>|</span>, curr])}
        </div>
      </div>
      <div className="text-right ml-2 font-bold text-lg select-none" style={{color}}>
        {percent !== null ? `${percent}%` : ''}
      </div>
    </div>
  );
};

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

  const [hotToday, setHotToday] = useState<TrendingSong[]>([]);
  const [rankHistoryData, setRankHistoryData] = useState([]);

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

  useEffect(() => {
    getTrendingComparison(10).then(setHotToday).catch(() => { });
  }, []);

  useEffect(() => {
    if (hotToday.length < 3) return;
    const hours = generateRecentHours();
    // Mock: lấy top 3 vị trí lúc từng mốc (bằng các giá trị random demo)
    // Nếu có real history thì lấy đúng từ API!
    const mockRanks = [[3, 2, 3, 2, 1, 1, 1, 1], [2, 1, 1, 1, 2, 3, 2, 2], [1, 3, 2, 3, 3, 2, 3, 3]];
    const data = hours.map((time, idx) => ({
      time,
      song1: mockRanks[0][idx],
      song2: mockRanks[1][idx],
      song3: mockRanks[2][idx],
    }));
    setRankHistoryData(data);
  }, [hotToday]);

  const [top3History, setTop3History] = useState({ labels: [], lines: [] });
  useEffect(() => {
    fetch("http://localhost:8080/api/trending/snapshot-history-top3?limit=8")
      .then(res => res.json())
      .then(setTop3History)
      .catch(() => setTop3History({ labels: [], lines: [] }));
  }, []);

  // Chuẩn bị dữ liệu chart (Recharts)
  const chartData = Array.isArray(top3History.labels)
    ? top3History.labels.map((label, idx) => {
        const entry = { time: label };
        (top3History.lines ?? []).forEach(line => {
          const scoreArr = Array.isArray(line.scoreHistory) ? line.scoreHistory : [];
          entry[line.songName || line.songId] = scoreArr[idx] ?? 0;
          entry[`${line.songName || line.songId}_meta`] = line; // cho tooltip
        });
        return entry;
      })
    : [];

  // Tooltip custom
  const CustomTop3ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const totalScore = payload.reduce((sum, pl) => sum + (parseFloat(pl.value) || 0), 0);
    return (
      <div className="rounded bg-card border p-3 shadow text-xs min-w-[180px]">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((pl, idx) => {
          const meta = pl.payload[`${pl.name}_meta`];
          const percent = totalScore > 0 ? Math.round((parseFloat(pl.value) / totalScore) * 100) : null;
          return (
            <div key={pl.name} className="flex gap-2 items-center mb-1">
              {meta?.albumImageUrl && (
                <img src={meta.albumImageUrl} className="w-7 h-7 rounded object-cover" alt="" />
              )}
              <span className="truncate flex-1">{pl.name}</span>
              <span className="font-bold" style={{ color: meta?.color }}>{pl.value ?? 0}</span>
              {percent !== null && <span className="ml-1 text-xs text-muted-foreground">{percent}%</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <PromotionCarousel />
      <main className="pt-4">
        {/* Quick Features */}
        <section className="py-8">
          <div className="container px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  icon: Sparkles,
                  color: "text-primary",
                  label: "AI Search",
                  path: "/discover",
                },
                {
                  icon: TrendingUp,
                  color: "text-neon-pink",
                  label: "Trending",
                  path: "/trending",
                },
                {
                  icon: Music,
                  color: "text-neon-blue",
                  label: "Genres",
                  path: "/discover",
                },
                {
                  icon: Headphones,
                  color: "text-neon-green",
                  label: "Radio",
                  path: "/discover",
                },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="bg-gradient-glass backdrop-blur-sm border-white/10 hover:shadow-glow transition-all cursor-pointer"
                  onClick={() => {
                    if (item.label === "Genres") {
                      // Scroll to genres section on the same page
                      const genresSection = document.getElementById("genres-section");
                      if (genresSection) {
                        genresSection.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    } else {
                      navigate(item.path);
                    }
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <item.icon
                      className={`w-8 h-8 ${item.color} mx-auto mb-2`}
                    />
                    <p className="text-sm font-medium">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Music Lists Section */}
            <div className="mb-10 flex flex-col gap-6 items-stretch">
              {/* Chart Top 3 biến động nằm trên */}
              <div className="bg-gradient-glass rounded-xl p-4 w-full">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Top 3 Rank Changes
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" />
                    <YAxis allowDecimals domain={["auto", "auto"]} />
                    <Tooltip content={<CustomTop3ChartTooltip />} />
                    <Legend />
                    {top3History.lines.map((line) => (
                      <Line
                        key={line.songId}
                        type="monotone"
                        dataKey={line.songName || line.songId}
                        stroke={line.color}
                        strokeWidth={3}
                        dot={{ stroke: line.color, fill: '#fff' }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* === HotToday Top 10 Section (new, giống ZingMP3, đẹp như Top100) === */}
              {hotToday.length > 0 && (
                <div className="bg-gradient-glass rounded-xl mt-6 p-4 w-full">
                  <div className="flex items-center gap-2 mb-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-lg">Hot Today</span>
                    </div>
                    <Button size="sm" variant="outline" className="px-3 py-1 text-xs font-normal" onClick={() => navigate('/top100')}>
                      See more
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {hotToday.slice(0, 10).map((song, idx) => (
                      <div
                        key={song.songId || idx}
                        className="flex items-center gap-4 p-3 rounded-lg transition-colors group cursor-pointer"
                        onClick={() => {
                          setQueue(hotToday.slice(0, 10));
                          playSong(song);
                        }}
                      >
                        {/* Rank */}
                        <div className="flex items-center gap-2 w-12">
                          <span className={`text-lg font-bold 
                            ${idx === 0 ? 'text-yellow-500' :
                              idx === 1 ? 'text-sky-400' :
                                idx === 2 ? 'text-pink-400' :
                                  'text-muted-foreground'
                            }`}>
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Cover & Play */}
                        <div className="relative group">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shadow border bg-muted flex items-center justify-center">
                            <img src={song.albumImageUrl} alt={song.songName} className="w-full h-full object-cover" />
                          </div>
                          <button
                            className="absolute inset-0 w-12 h-12 rounded-full bg-primary/80 opacity-0 transition-opacity"
                            onClick={e => { e.stopPropagation(); setQueue(hotToday.slice(0, 10)); playSong(song); }}
                          >
                            <Play className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Song Info - không hiển thị genre/mood */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate transition-colors group-hover:text-primary">{song.songName}</h4>
                          <p className="text-sm text-muted-foreground truncate">{song.artists?.map(a => a.name).join(', ')}</p>
                        </div>

                        {/* Plays/duration/genre badge */}
                        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{song.plays || '-'}</span>
                          <span>{song.duration}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); if (typeof toggleLike !== 'undefined') toggleLike(song.songId); }}
                            className={`h-8 w-8 ${typeof likedItems !== 'undefined' && likedItems.includes(song.songId) ? 'text-red-500' : ''}`}
                          >
                            <Heart className={`w-4 h-4 ${typeof likedItems !== 'undefined' && likedItems.includes(song.songId) ? 'fill-current' : ''}`} />
                          </Button>
                          {typeof ShareButton !== 'undefined' && <ShareButton title={song.songName} type="song" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Hot Today section removed as requested */}
            </div>

            {/* AI Picks */}
            <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Picks For You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiPicks.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/5 hover:bg-muted/10 group cursor-pointer"
                    onClick={() => {
                      setQueue(aiPicks);
                      playSong(song);
                    }}
                  >
                    <div className="w-10 h-10 bg-gradient-neon rounded flex items-center justify-center overflow-hidden">
                      {song.cover ? (
                        <img
                          src={song.cover}
                          alt={(song as any).name || song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </p>
                      <p className="text-xs text-primary">{song.genre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-500">
                        {song.plays}
                      </p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="hero"
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => navigate("/discover")}
                >
                  Get More AI Picks
                </Button>
              </CardContent>
            </Card>

            {/* Editor's Choice / New Albums */}
            <NewAlbums />
          </div>
        </section>

        <FeaturedMusic />
        <GenreExplorer />
        <TrendingSection />
      </main>

      <Footer />
      {isMobile && <MobileNotifications />}
    </div>
  );
};

export default Index;

