import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Heart, Trophy, TrendingUp, TrendingDown, Minus, Sparkles, MoreVertical, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { callHotTodayTrending } from "@/services/api/trendingApi";
import { Skeleton } from "@/components/ui/skeleton";
import { mapToPlayerSong } from "@/lib/utils";

const Top100 = () => {
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const { playSong, setQueue, addToQueue, queue } = useMusic();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch top 100 trending songs (dùng API hot-today chuẩn hóa với top=100)
  useEffect(() => {
    const fetchTop100 = async () => {
      try {
        setIsLoading(true);
        const top100 = await callHotTodayTrending(100);
        if (top100 && top100.length > 0) {
          // Map fields về đúng UI cần - dùng helper function để nhất quán
          const formattedSongs = top100.slice(0, 100).map((song: any, index: number) => ({
            ...mapToPlayerSong({
              ...song, // Pass toàn bộ object để không bị mất field nào, đặc biệt là albumCoverImg
              id: song.songId ?? song.id,
            }),
            // Thêm các field đặc biệt cho Top100 UI
            rank: song.newRank ?? song.rank ?? index + 1,
            previousRank: song.oldRank ?? song.previousRank ?? 0,
            plays: (song.playCount ? `${(song.playCount / 1000000).toFixed(1)}M` : ""),
          }));
          setTopSongs(formattedSongs);
        } else {
          setTopSongs([]);
        }
      } catch (err) {
        console.error("❌ Lỗi tải hot-today trending:", err);
        setTopSongs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTop100();
  }, []);

  const topArtists = Array.from({ length: 50 }, (_, i) => ({
    id: `artist-${i + 1}`,
    name: `Top Artist ${i + 1}`,
    genre: ["Pop", "Rock", "Hip-Hop", "Electronic", "R&B"][Math.floor(Math.random() * 5)],
    followers: `${(Math.random() * 50 + 10).toFixed(1)}M`,
    rank: i + 1,
    previousRank: i + Math.floor(Math.random() * 10) - 5,
    avatar: "/placeholder.svg"
  }));

  const topAlbums = Array.from({ length: 50 }, (_, i) => ({
    id: `album-${i + 1}`,
    title: `Top Album ${i + 1}`,
    artist: `Artist ${i + 1}`,
    year: 2020 + Math.floor(Math.random() * 4),
    rank: i + 1,
    previousRank: i + Math.floor(Math.random() * 10) - 5,
    streams: `${(Math.random() * 100 + 20).toFixed(1)}M`,
    cover: "/placeholder.svg"
  }));

  const handlePlaySong = (song: any) => {
    const formattedSong = {
      id: song.id,
      name: song.name || song.songName,
      songName: song.songName,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      cover: song.cover,
      audioUrl: song.audioUrl,
    };

    const formattedQueue = topSongs.map((s) => ({
      id: s.id,
      name: s.name || s.songName,
      songName: s.songName,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      cover: s.cover,
      audioUrl: s.audioUrl,
    }));

    setQueue(formattedQueue);
    playSong(formattedSong);
    toast({ title: `Playing ${song.name || song.songName || "Unknown Song"}` });
  };

  const getRankIcon = (currentRank: number, previousRank: number) => {
    // Nếu vị trí cũ > 100 thì đây là NEW
    if (previousRank > 100 || previousRank <= 0 || previousRank === undefined || previousRank === null) {
      return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
    const change = previousRank - currentRank;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };
  // Hiển thị mũi tên + số thay đổi ngay cạnh rank (không hiện ở khu vực tim)
  const renderRankDelta = (currentRank: number, previousRank: number) => {
    if (previousRank > 100 || previousRank <= 0 || previousRank === undefined || previousRank === null) {
      return <span className="flex items-center gap-1 text-yellow-400"><Sparkles className="w-4 h-4" /></span>;
    }
    const change = previousRank - currentRank;
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-green-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">{change}</span>
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-red-500">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs font-medium">{Math.abs(change)}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-xs font-medium opacity-0">0</span>
      </span>
    );
  };
  const getRankChange = (currentRank: number, previousRank: number) => {
    // Nếu hạng cũ ngoài top 100, coi là NEW
    if (previousRank > 100 || previousRank <= 0 || previousRank === undefined || previousRank === null) {
      return "NEW";
    }
    const change = previousRank - currentRank;
    if (change === 0) return "—";
    return change > 0 ? `+${change}` : `${change}`;
  };

  const toggleLike = (itemId: string) => {
    setLikedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    toast({
      title: likedItems.includes(itemId) ? "Removed from favorites" : "Added to favorites",
      duration: 2000,
    });
  };

  const handleAddToQueue = (song: any) => {
    const formattedSong = {
      id: song.id,
      name: song.name || song.songName,
      songName: song.songName || song.name,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      cover: song.cover,
      audioUrl: song.audioUrl,
      uuid: song.uuid,
    };

    // Kiểm tra xem bài hát đã có trong queue chưa
    const existingIndex = queue.findIndex(s => String(s.id) === String(song.id));
    
    if (existingIndex >= 0) {
      // Nếu đã có, remove và add lại ở cuối
      const newQueue = queue.filter(s => String(s.id) !== String(song.id));
      setQueue([...newQueue, formattedSong]);
      toast({
        title: "Đã di chuyển bài hát",
        description: `${song.name || song.songName || "Bài hát"} đã được đưa ra sau cùng trong danh sách phát`,
        duration: 2000,
      });
    } else {
      // Nếu chưa có, add vào cuối
      addToQueue(formattedSong);
      toast({
        title: "Đã thêm vào danh sách phát",
        description: `${song.name || song.songName || "Bài hát"} đã được thêm vào cuối danh sách`,
        duration: 2000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Hot Today
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            The ultimate ranking of music's biggest hits
          </p>
        </div>

        <Tabs defaultValue="songs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="songs">Top Songs</TabsTrigger>
            <TabsTrigger value="artists">Top Artists</TabsTrigger>
            <TabsTrigger value="albums">Top Albums</TabsTrigger>
          </TabsList>

          {/* Top Songs */}
          <TabsContent value="songs" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Hot Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="w-16 h-6" />
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <div className="hidden md:flex items-center gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-10" />
                      </div>
                    </div>
                  ))
                ) : (
                  topSongs.slice(0, 100).map((song) => (
                    <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card/30 transition-colors">
                      {/* Rank + delta (mũi tên + số) */}
                      <div className="flex items-center gap-1 w-20">
                        <span className={`text-lg font-bold ${song.rank <= 3 ? 'text-yellow-500' :
                          song.rank <= 10 ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                          #{song.rank}
                        </span>
                        {renderRankDelta(song.rank, song.previousRank)}
                      </div>

                      {/* Cover & Play */}
                      <div className="relative group">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={song.cover} alt={song.name || song.songName || "Unknown Song"} />
                          <AvatarFallback>{(song.name || song.songName || "?").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button
                          size="icon"
                          className="absolute inset-0 w-12 h-12 rounded-full bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePlaySong(song)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{song.name || song.songName || "Unknown Song"}</h4>
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      </div>

                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{song.plays}</span>
                        <span>{song.duration}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleLike(song.id)}
                          className={`h-8 w-8 ${likedItems.includes(song.id) ? 'text-red-500' : ''}`}
                        >
                          <Heart className={`w-4 h-4 ${likedItems.includes(song.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleAddToQueue(song);
                            }}>
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm vào danh sách đang phát
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <ShareButton title={song.name || song.songName || "Unknown Song"} type="song" />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}

              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Artists */}
          <TabsContent value="artists" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top 50 Artists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topArtists.slice(0, 15).map((artist) => (
                  <div key={artist.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card/30 transition-colors">
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      <span className={`text-lg font-bold ${artist.rank <= 3 ? 'text-yellow-500' :
                        artist.rank <= 10 ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                        #{artist.rank}
                      </span>
                      {getRankIcon(artist.rank, artist.previousRank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={artist.avatar} alt={artist.name} />
                      <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{artist.name}</h4>
                      <p className="text-sm text-muted-foreground">{artist.genre}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{artist.followers} followers</span>
                      <Badge variant="outline" className="text-xs">
                        {getRankChange(artist.rank, artist.previousRank)}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleLike(artist.id)}
                        className={`h-8 w-8 ${likedItems.includes(artist.id) ? 'text-red-500' : ''}`}
                      >
                        <Heart className={`w-4 h-4 ${likedItems.includes(artist.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <ShareButton title={artist.name} type="song" />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-4">
                  View All 50 Artists
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Albums */}
          <TabsContent value="albums" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top 50 Albums
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topAlbums.slice(0, 15).map((album) => (
                  <div key={album.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card/30 transition-colors">
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      <span className={`text-lg font-bold ${album.rank <= 3 ? 'text-yellow-500' :
                        album.rank <= 10 ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                        #{album.rank}
                      </span>
                      {getRankIcon(album.rank, album.previousRank)}
                    </div>

                    {/* Cover */}
                    <Avatar className="w-12 h-12 rounded-md">
                      <AvatarImage src={album.cover} alt={album.title} />
                      <AvatarFallback className="rounded-md">{album.title.charAt(0)}</AvatarFallback>
                    </Avatar>

                    {/* Album Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{album.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{album.artist} • {album.year}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{album.streams} streams</span>
                      <Badge variant="outline" className="text-xs">
                        {getRankChange(album.rank, album.previousRank)}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleLike(album.id)}
                        className={`h-8 w-8 ${likedItems.includes(album.id) ? 'text-red-500' : ''}`}
                      >
                        <Heart className={`w-4 h-4 ${likedItems.includes(album.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <ShareButton title={album.title} type="album" />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-4">
                  View All 50 Albums
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Top100;