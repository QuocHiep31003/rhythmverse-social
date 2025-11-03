  import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Headphones, ArrowUp, ArrowDown, Sparkles, Minus, Play } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import { formatDuration, toSeconds } from "@/lib/utils";
import { getTrendingComparison, TrendingSong, TrendStatus } from "@/services/api/trendingApi";
import { Skeleton } from "@/components/ui/skeleton";

const TrendIcon = ({ status, className = "" }: { status: TrendStatus, className?: string }) => {
    switch (status) {
        case TrendStatus.RISING:
            return <ArrowUp className={`h-4 w-4 text-green-500 ${className}`} />;
        case TrendStatus.FALLING:
            return <ArrowDown className={`h-4 w-4 text-red-500 ${className}`} />;
        case TrendStatus.NEW:
            return <Sparkles className={`h-4 w-4 text-yellow-500 ${className}`} />;
        default:
            return <Minus className={`h-4 w-4 text-gray-500 ${className}`} />;
    }
};

const TrendingMusic = () => {
  const { playSong, setQueue } = useMusic();
  const [allSongs, setAllSongs] = useState<TrendingSong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<TrendingSong[]>([]);
  const [displayedSongs, setDisplayedSongs] = useState<TrendingSong[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const top10 = await getTrendingComparison(10); // chỉ lấy 10 bài
        const safe = Array.isArray(top10) ? top10 : [];
        setAllSongs(safe);
        setFilteredSongs(safe);
        setTotalPages(1);
      } catch (err) {
        console.error("❌ Error loading top 10 trending:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrending();
  }, []);

  useEffect(() => {
    const searchLower = searchQuery.toLowerCase();
    const filtered = searchQuery.trim()
      ? allSongs.filter(song =>
          song.songName.toLowerCase().includes(searchLower) ||
          song.artists.some(artist => artist.name.toLowerCase().includes(searchLower))
        )
      : allSongs;
    setFilteredSongs(filtered);
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, allSongs]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedSongs(filteredSongs.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredSongs.length / itemsPerPage));
  }, [currentPage, filteredSongs, itemsPerPage]);

  const handlePlaySong = (song: TrendingSong) => {
    const formattedQueue = allSongs.map(s => ({
      id: String(s.songId),
      title: s.songName,
      artist: s.artists?.map(a => a.name).join(", ") || "Unknown",
      album: s.albumName || "Unknown", // <-- Thêm dòng này
      duration: toSeconds(s.duration),
      cover: s.albumImageUrl,
      audioUrl: s.audioUrl,
    }));
    
    const songToPlay = formattedQueue.find(s => s.id === String(song.songId));
    if(songToPlay) {
      setQueue(formattedQueue);
      playSong(songToPlay);
    }
  };

  const renderSkeletons = () => (
    Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-12" />
        </div>
    ))
  );

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Today's Top 100
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            The most played tracks on Rhythmverse right now
          </p>
          <div className="mt-6">
            <input
              type="text"
              placeholder="Filter by song or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg bg-card/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {isLoading ? (
                renderSkeletons()
              ) : allSongs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? `No songs found for "${searchQuery}"` : "No trending songs available."}
                </p>
              ) : (
                (Array.isArray(allSongs) ? allSongs : []).map((song, index) => (
                  <div
                    key={song.songId}
                    className="flex items-center gap-4 p-3 rounded-lg group transition-colors hover:bg-card/30"
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      <span className={`text-lg font-bold ${
                        index + 1 <= 3 ? "text-yellow-500" : index + 1 <= 10 ? "text-primary" : "text-muted-foreground"
                      }`}>
                        #{index + 1}
                      </span>
                      <TrendIcon status={song.trendStatus} />
                    </div>
                    {/* Cover & Play */}
                    <div className="relative group">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {song.albumImageUrl ? (
                          <img
                            src={song.albumImageUrl}
                            alt={song.songName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Headphones className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <button
                        className="absolute inset-0 w-12 h-12 rounded-full bg-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        onClick={() => handlePlaySong(song)}
                        type="button"
                      >
                        <Play className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{song.songName}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artists.map(a => a.name).join(", ")}
                      </p>
                    </div>
                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                  </div>
                ))
              )}
              {/* Nút xem top100 */}
              <button
                className="mt-4 w-full py-2 border rounded-lg bg-transparent hover:bg-card/60 border-border/50 font-medium"
                onClick={() => window.location.href = "/top100"}
              >
                See All 100
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default TrendingMusic;
