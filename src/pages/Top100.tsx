import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, Trophy, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import Footer from "@/components/Footer";
import { songsApi } from "@/services/api";
import { useMusic } from "@/contexts/MusicContext";
import { callHotTodayTrending } from "@/services/api/trendingApi";

const Top100 = () => {
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const { playSong, setQueue } = useMusic();

  // Fetch top 100 trending songs (dùng API hot-today chuẩn hóa với top=100)
  useEffect(() => {
    const fetchTop100 = async () => {
      try {
        const top100 = await callHotTodayTrending(100);
        if (top100 && top100.length > 0) {
          // Map fields về đúng UI cần (ResultDetailDTO)
          const formattedSongs = top100.slice(0, 100).map((song: any, index: number) => ({
            id: song.songId,
            title: song.songName || song.title,
            artist: song.artist || song.artists?.map((a:any) => a.name).join(", ") || "Unknown",
            album: song.albumName || song.album || "Unknown",
            duration: song.duration,
            rank: song.rank || index + 1,
            previousRank: song.oldRank,
            plays: (song.playCount ? `${(song.playCount/1000000).toFixed(1)}M` : ""),
            cover: song.albumImageUrl || "/placeholder.svg",
            audioUrl: song.audioUrl || "",
          }));
          setTopSongs(formattedSongs);
        } else {
          setTopSongs([]);
        }
      } catch (err) {
        console.error("❌ Lỗi tải hot-today trending:", err);
        setTopSongs([]);
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
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      cover: song.cover,
      audioUrl: song.audioUrl,
    };

    const formattedQueue = topSongs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      cover: s.cover,
      audioUrl: s.audioUrl,
    }));

    setQueue(formattedQueue);
    playSong(formattedSong);
    toast({ title: `Playing ${song.title}` });
  };

  const getRankIcon = (currentRank: number, previousRank: number) => {
    // Nếu vị trí cũ > 100 thì đây là NEW
    if (previousRank > 100 || previousRank <= 0 || previousRank === undefined || previousRank === null) {
      return <Sparkles className="w-4 h-4 text-yellow-400" title="New" />;
    }
    const change = previousRank - currentRank;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
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

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Hot Month Charts
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
                  Hot Month Top 100
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topSongs.slice(0, 20).map((song) => (
                  <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card/30 transition-colors">
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      <span className={`text-lg font-bold ${song.rank <= 3 ? 'text-yellow-500' :
                          song.rank <= 10 ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                        #{song.rank}
                      </span>
                      {getRankIcon(song.rank, song.previousRank)}
                    </div>

                    {/* Cover & Play */}
                    <div className="relative group">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={song.cover} alt={song.title} />
                        <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
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
                      <h4 className="font-medium truncate">{song.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{song.plays}</span>
                      <span>{song.duration}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRankChange(song.rank, song.previousRank)}
                      </Badge>
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
                      <ShareButton title={song.title} type="song" />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-4">
                  View All 100 Songs
                </Button>
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