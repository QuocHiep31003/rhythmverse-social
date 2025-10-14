import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  Heart,
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  Headphones,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import MusicPlayer from "@/components/MusicPlayer";

const TrendingMusic = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [topHitsToday, setTopHitsToday] = useState<any[]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // ✅ Lấy top bài hát từ API
  useEffect(() => {
    fetch("http://localhost:8080/api/songs")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.content) {
          const songs = data.content;
          const sorted = songs
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, 10);
          setTopHitsToday(sorted);
        }
      })
      .catch((err) => console.error("Lỗi tải bài hát:", err));
  }, []);

  // ✅ Like/unlike
  const toggleLike = (songId: string) => {
    setLikedSongs((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
    toast({
      title: likedSongs.includes(songId)
        ? "Removed from liked songs"
        : "Added to liked songs",
      duration: 2000,
    });
  };

  // ✅ Phát nhạc thật (nếu API có audioUrl)
  const playSong = (song: any) => {
    if (audio) {
      audio.pause();
    }
    if (song.audioUrl) {
      const newAudio = new Audio(song.audioUrl);
      newAudio.play();
      setAudio(newAudio);
    }

    toast({
      title: `Now playing: ${song.name || song.title}`,
      description:
        song.artists?.map((a: any) => a.name).join(", ") ||
        song.artist ||
        "Unknown artist",
      duration: 3000,
    });
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

        {/* ✅ Hot Today (thay thế Trending Songs List) */}
        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-pink" />
              Hot Today
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {topHitsToday.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 group cursor-pointer transition-all"
                onClick={() => playSong(song)}
              >
                <span className="w-6 text-sm text-muted-foreground text-center">
                  {index + 1}
                </span>

                <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {song.cover ? (
                    <img
                      src={song.cover}
                      alt={song.name}
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
                    {song.artists?.map((a) => a.name).join(", ")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Headphones className="w-3 h-3" />
                    {song.playCount || 0}
                  </p>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-4"
              size="sm"
              onClick={() => navigate("/trending")}
            >
              See More Trending
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default TrendingMusic;
