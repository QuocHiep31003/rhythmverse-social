import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Headphones } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import { formatPlayCount } from "@/lib/utils";
import { songsApi } from "@/services/api";

const TrendingMusic = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [allSongs, setAllSongs] = useState<any[]>([]); // Top 100 bài trending
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
  const [displayedSongs, setDisplayedSongs] = useState<any[]>([]); // Bài hát hiển thị theo page
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 20;

  // Fetch top 100 trending songs
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        console.log('🔍 Fetching trending songs...');
        
        // Thử API trending trước
        const trendingSongs = await songsApi.getTrending(100);
        
        if (trendingSongs && trendingSongs.length > 0) {
          console.log('✅ Loaded from trending API:', trendingSongs.length, 'songs');
          
          // Backend đã sort sẵn theo trendingScore, không cần sort lại
          setAllSongs(trendingSongs);
          setFilteredSongs(trendingSongs);
          setTotalPages(Math.ceil(trendingSongs.length / itemsPerPage));
          return;
        }
        
        // Nếu API trending không có data, dùng cách cũ
        console.log('⚠️ No trending data, falling back to fetching all songs...');
        const response = await fetch('http://localhost:8080/api/songs?size=1000');
        const data = await response.json();
        
        if (data && data.content) {
          const sorted = data.content
            .sort((a, b) => {
              // Chỉ sort theo trendingScore
              const scoreA = a.trendingScore || 0;
              const scoreB = b.trendingScore || 0;
              return scoreB - scoreA;
            })
            .slice(0, 100); // ⭐ Chỉ lấy top 100
          
          console.log('✅ Loaded from fallback:', sorted.length, 'songs');
          setAllSongs(sorted);
          setFilteredSongs(sorted);
          setTotalPages(Math.ceil(sorted.length / itemsPerPage));
        }
      } catch (err) {
        console.error("❌ Lỗi tải bài hát trending:", err);
      }
    };
    
    fetchTrending();
  }, []);

  // Lọc theo tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(allSongs);
    } else {
      const searchLower = searchQuery.toLowerCase();
      const filtered = allSongs.filter((song) => {
        const title = (song.name || song.title || "").toLowerCase();
        const artist =
          song.artistNames?.join(" ").toLowerCase() ||
          song.artists?.map((a: any) => a.name).join(" ").toLowerCase() ||
          (song.artist || "").toLowerCase();
        return title.includes(searchLower) || artist.includes(searchLower);
      });
      setFilteredSongs(filtered);
    }
  }, [searchQuery, allSongs]);

  // Phân trang client-side
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedSongs(filteredSongs.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredSongs.length / itemsPerPage));
  }, [currentPage, filteredSongs]);

  // Play nhạc
  const handlePlaySong = (song: any, index: number) => {
    const formattedSong = {
      id: song.id,
      title: song.name || song.title,
      artist: song.artistNames?.join(", ") || song.artists?.map((a: any) => a.name).join(", ") || song.artist || "Unknown",
      album: song.album?.name || song.album || "",
      duration: song.duration || 0,
      cover: song.cover || "",
      audioUrl: song.audioUrl || song.audio || "",
    };

    const formattedQueue = allSongs.map((s) => ({
      id: s.id,
      title: s.name || s.title,
      artist: s.artistNames?.join(", ") || s.artists?.map((a: any) => a.name).join(", ") || s.artist || "Unknown",
      album: s.album?.name || s.album || "",
      duration: s.duration || 0,
      cover: s.cover || "",
      audioUrl: s.audioUrl || s.audio || "",
    }));

    setQueue(formattedQueue);
    playSong(formattedSong);
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Trending Music
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover what's hot right now
          </p>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search songs or artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg bg-card/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Hot Today */}
        <Card
          // className="
          //   bg-gradient-glass backdrop-blur-sm border-white/10 
          //   transition-all duration-500 
          //   hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]
          //   hover:border-white/20 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5
          // "
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-pink" />
              Hot Today
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {displayedSongs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No songs found
                  </p>
                ) : (
                  displayedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="
                        flex items-center gap-3 p-2 rounded-lg 
                        group cursor-pointer transition-all duration-300
                        hover:bg-white/5 hover:scale-[1.02] hover:shadow-inner
                      "
                      onClick={() => handlePlaySong(song, index)}
                    >
                      <span className="w-6 text-sm text-muted-foreground text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>

                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {song.cover ? (
                          <img
                            src={song.cover}
                            alt={song.name || song.title}
                            className="
                              w-full h-full object-cover 
                              transition-transform duration-500 group-hover:scale-110
                            "
                          />
                        ) : (
                          <Headphones className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm group-hover:text-neon-pink transition-colors">
                          {song.name || song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artistNames?.join(", ") ||
                            song.artists?.map((a) => a.name).join(", ") ||
                            song.artist ||
                            "Unknown"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Headphones className="w-3 h-3" />
                          {formatPlayCount(song.playCount || 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default TrendingMusic;
