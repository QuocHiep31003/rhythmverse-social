import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  Headphones,
  Heart,
  Play,
} from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import Footer from "@/components/Footer";
import MusicPlayer from "@/components/MusicPlayer";
import Pagination from "@/components/Pagination";

const TrendingMusic = () => {
  const navigate = useNavigate();
  const { playSong, setQueue } = useMusic();
  const [topHitsToday, setTopHitsToday] = useState<any[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 20;

  // Lấy bài hát từ API với phân trang
  useEffect(() => {
    fetch(`http://localhost:8080/api/songs?page=${currentPage - 1}&size=${itemsPerPage}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.content) {
          const sorted = data.content.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
          setTopHitsToday(sorted);
          setFilteredSongs(sorted);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch((err) => console.error("Lỗi tải bài hát:", err));
  }, [currentPage]);

  // Filter songs based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(topHitsToday);
    } else {
      const filtered = topHitsToday.filter((song) => {
        const searchLower = searchQuery.toLowerCase();
        const title = (song.name || song.title || "").toLowerCase();
        const artist = song.artists?.map((a: any) => a.name).join(" ").toLowerCase() || 
                      (song.artist || "").toLowerCase();
        return title.includes(searchLower) || artist.includes(searchLower);
      });
      setFilteredSongs(filtered);
    }
  }, [searchQuery, topHitsToday]);

  // Phát nhạc và cập nhật queue
  const handlePlaySong = (song: any, index: number) => {
    const formattedSong = {
      id: song.id,
      title: song.name || song.title,
      artist: song.artists?.map((a: any) => a.name).join(", ") || song.artist || "Unknown",
      album: song.album?.name || song.album || "",
      duration: song.duration || 0,
      cover: song.cover || "",
      audioUrl: song.audioUrl || song.audio || "",
    };

    const formattedQueue = topHitsToday.map((s) => ({
      id: s.id,
      title: s.name || s.title,
      artist: s.artists?.map((a: any) => a.name).join(", ") || s.artist || "Unknown",
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
          
          {/* Search Bar */}
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

        

        {/* Trending Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Plays Today
                  </p>
                  <p className="text-3xl font-bold text-primary">12.8B</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Trending Artists
                  </p>
                  <p className="text-3xl font-bold text-primary">156</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                  <p className="text-3xl font-bold text-primary">24</p>
                </div>
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hot Today với scroll */}
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-pink" />
              Hot Today
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredSongs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No songs found
                  </p>
                ) : (
                  filteredSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer transition-all"
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
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Headphones className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {song.name || song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artists?.map((a) => a.name).join(", ") || song.artist || "Unknown"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Headphones className="w-3 h-3" />
                        {song.playCount || 0}
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
