import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Headphones } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import { formatDuration } from "@/lib/utils";
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
        console.log('🔍 Fetching top 100 trending songs...');
        
        const top100 = await songsApi.getTop100Trending();
        
        if (top100 && top100.length > 0) {
          console.log('✅ Loaded top 100 trending:', top100.length, 'songs');
          setAllSongs(top100);
          setFilteredSongs(top100);
          setTotalPages(Math.ceil(top100.length / itemsPerPage));
          return;
        }
        
        console.log('⚠️ No trending data');
        setAllSongs([]);
        setFilteredSongs([]);
        setTotalPages(1);
      } catch (err) {
        console.error("❌ Lỗi tải trending:", err);
        setAllSongs([]);
        setFilteredSongs([]);
        setTotalPages(1);
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
      id: String(song.id), // Ensure ID is string
      title: song.songName || song.title,
      artist: song.artistNames?.join(", ") || song.artists?.map((a: any) => a.name).join(", ") || song.artist || "Unknown",
      album: song.album?.name || song.album || "",
      duration: song.duration || 0,
      cover: song.cover || "",
      audioUrl: song.audioUrl || song.audio || "",
    };

    const formattedQueue = allSongs.map((s) => ({
      id: String(s.id), // Ensure ID is string
      title: s.songName || s.title,
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
              Top 100 Trending
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

        {/* Hot Week */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-pink" />
              Trending Now
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
                      onClick={() => {
                        console.log('🎵 Playing trending song from page:', {
                          id: song.id,
                          title: song.songName || song.title,
                          artist: song.artistNames?.join(", ") || song.artists?.map((a) => a.name).join(", ") || song.artist || "Unknown",
                          audioUrl: song.audioUrl || song.audio
                        });
                        handlePlaySong(song, index);
                      }}
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
                          {song.songName || song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artistNames?.join(", ") ||
                            song.artists?.map((a) => a.name).join(", ") ||
                            song.artist ||
                            "Unknown"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(song.duration)}
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
