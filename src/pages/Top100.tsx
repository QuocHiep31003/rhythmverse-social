import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Heart, Trophy, TrendingUp, TrendingDown, Minus, Sparkles, MoreHorizontal, ListPlus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Footer from "@/components/Footer";
import { useMusic } from "@/contexts/MusicContext";
import type { Song } from "@/contexts/MusicContext";
import { callHotTodayTrending } from "@/services/api/trendingApi";
import { Skeleton } from "@/components/ui/skeleton";
import { mapToPlayerSong, type PlayerSong as BasePlayerSong, type ApiSong, formatDuration } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";

type TopSong = BasePlayerSong & {
  name?: string;
  rank: number;
  previousRank: number;
  plays: string;
};

type TrendingApiSong = ApiSong & {
  newRank?: number;
  oldRank?: number;
  playCount?: number;
  previousRank?: number;
  rank?: number;
};

type Top3HistoryLine = {
  songId?: string | number;
  songName?: string;
  color?: string;
  albumImageUrl?: string;
  scoreHistory?: number[];
};

type Top3HistoryResponse = {
  labels: string[];
  lines: Top3HistoryLine[];
};

type ChartTooltipPayload = {
  value?: number;
  name?: string | number;
  payload?: Record<string, unknown>;
};

type TooltipValue = number | string | Array<number | string>;
type TooltipName = string | number;

const generateLast24Hours = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const labels: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    labels.push(`${d.getHours().toString().padStart(2, "0")}:00`);
  }
  return labels;
};

const CustomTop3ChartTooltip = ({ active, payload, label }: TooltipProps<TooltipValue, TooltipName>) => {
  if (!active || !payload?.length) return null;
  const entries: ChartTooltipPayload[] = payload.map((item) => ({
    value: typeof item.value === "number" ? item.value : Number(item.value ?? 0),
    name: item.name,
    payload: item.payload as Record<string, unknown>,
  }));
  const sorted = [...entries].sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0));
  return (
    <div className="rounded bg-card border p-3 shadow text-xs min-w-[200px]">
      <div className="font-semibold mb-2">{label}</div>
      <div className="flex flex-col gap-1">
        {sorted.map((pl, i: number) => {
          const nameKey = pl?.name != null ? String(pl.name) : "";
          const meta = pl?.payload?.[`${nameKey}_meta`] as Top3HistoryLine | undefined;
          return (
            <div key={i} className="flex items-center gap-2">
              {meta?.albumImageUrl && (
                <img src={meta.albumImageUrl} className="w-5 h-5 rounded object-cover" alt="" />
              )}
              <span className="truncate flex-1" style={{ color: meta?.color }}>{pl?.name}</span>
              <span className="font-bold" style={{ color: meta?.color }}>{pl?.value ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Top100 = () => {
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [topSongs, setTopSongs] = useState<TopSong[]>([]);
  const { playSong, setQueue, addToQueue, queue } = useMusic();
  const [isLoading, setIsLoading] = useState(true);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<{
    id: string | number;
    name: string;
    cover?: string;
  } | null>(null);
  const [shareSong, setShareSong] = useState<{
    id: string | number;
    title: string;
    url: string;
  } | null>(null);
  const [top3History, setTop3History] = useState<Top3HistoryResponse>({ labels: [], lines: [] });
  const [isLoadingTop3Chart, setIsLoadingTop3Chart] = useState(true);

  // Fetch top 100 trending songs (dùng API hot-today chuẩn hóa với top=100)
  useEffect(() => {
    const fetchTop100 = async () => {
      try {
        setIsLoading(true);
        const top100 = (await callHotTodayTrending(100)) as TrendingApiSong[];
        if (top100 && top100.length > 0) {
          // Map fields về đúng UI cần - dùng helper function để nhất quán
          const formattedSongs: TopSong[] = top100.slice(0, 100).map((song, index) => {
            const baseSong = mapToPlayerSong({
              ...song,
              id: song.songId ?? song.id,
            });

            return {
              ...baseSong,
              name: song.songName ?? song.name ?? baseSong.songName,
              rank: song.newRank ?? song.rank ?? index + 1,
              previousRank: song.oldRank ?? song.previousRank ?? 0,
              plays: song.playCount ? `${(song.playCount / 1000000).toFixed(1)}M` : "",
            };
          });
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

  useEffect(() => {
    setIsLoadingTop3Chart(true);
    fetch("http://localhost:8080/api/trending/snapshot-history-top3?limit=24")
      .then(res => res.json())
      .then((data: Top3HistoryResponse) => setTop3History(data))
      .catch(() => setTop3History({ labels: [], lines: [] }))
      .finally(() => setIsLoadingTop3Chart(false));
  }, []);

  const handlePlaySong = (song: TopSong) => {
    const formattedSong: Song = {
      id: String(song.id),
      name: song.name || song.songName,
      songName: song.songName,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      cover: song.cover,
      audioUrl: song.audioUrl,
    };

    const formattedQueue: Song[] = topSongs.map((s) => ({
      id: String(s.id),
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
      return <Sparkles className="w-4 h-4 text-yellow-400" aria-label="New" />;
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

  const toggleLike = (itemId: string | number) => {
    const normalizedId = String(itemId);
    const alreadyLiked = likedItems.includes(normalizedId);

    setLikedItems(prev =>
      prev.includes(normalizedId)
        ? prev.filter(id => id !== normalizedId)
        : [...prev, normalizedId]
    );
    toast({
      title: alreadyLiked ? "Removed from favorites" : "Added to favorites",
      duration: 2000,
    });
  };

  const handleAddToQueue = (song: TopSong) => {
    const formattedSong: Song = {
      id: String(song.id),
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
        title: `${song.name || song.songName || "Bài hát"} đã được đưa ra sau cùng danh sách phát`,
        duration: 2000,
      });
    } else {
      // Nếu chưa có, add vào cuối
      addToQueue(formattedSong);
      toast({
        title: `${song.name || song.songName || "Bài hát"} đã được thêm vào cuối danh sách`,
        duration: 2000,
      });
    }
  };

type ChartDataPoint = {
  time: string;
  [key: string]: string | number | Top3HistoryLine | undefined;
};

const chartLabels = generateLast24Hours();
  const chartLines = Array.isArray(top3History.lines) ? top3History.lines : [];
const chartData: ChartDataPoint[] = chartLabels.map((label: string, idx: number) => {
  const entry: ChartDataPoint = { time: label };
    chartLines.forEach((line, index) => {
      const scores = Array.isArray(line?.scoreHistory) ? line.scoreHistory : [];
    const key = line.songName || (line.songId ? String(line.songId) : `song-${index}`);
      const offset = chartLabels.length - scores.length;
      const localIdx = idx - Math.max(0, offset);
      const value = localIdx >= 0 && localIdx < scores.length ? (scores[localIdx] ?? 0) : 0;
      entry[key] = value;
      entry[`${key}_meta`] = line;
    });
    return entry;
  });

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Trending
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            The ultimate ranking of music's biggest hits
          </p>
          <div className="mt-6 bg-card/60 border border-border/40 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Biểu đồ biến động Top 3 trong 24 giờ gần nhất
            </p>
            {isLoadingTop3Chart ? (
              <Skeleton className="w-full h-[240px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="time"
                    interval={0}
                    minTickGap={0}
                    allowDuplicatedCategory={false}
                    tick={{ fontSize: 10 }}
                    padding={{ left: 0, right: 0 }}
                  />
                  <YAxis allowDecimals domain={["auto", "auto"]} hide tick={false} axisLine={false} tickLine={false} width={0} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <CustomTop3ChartTooltip active={active} payload={payload} label={label} />
                    )}
                    cursor={{ stroke: "#9ca3af", strokeDasharray: "3 3" }}
                  />
                  {chartLines.map((line, index) => {
                    const dataKey = line.songName || (line.songId ? String(line.songId) : `song-${index}`);
                    return (
                      <Line
                        key={dataKey}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={line.color || "#facc15"}
                        strokeWidth={3}
                        dot={{ r: 2, stroke: line.color || "#facc15", fill: "#fff" }}
                        activeDot={{ r: 6, stroke: line.color || "#facc15", fill: "#fff", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 100 Songs
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
                    <span>{formatDuration(song.duration)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                        <Button
                      variant="ghost"
                      size="icon"
                          onClick={() => toggleLike(song.id)}
                          className={`h-8 w-8 ${likedItems.includes(String(song.id)) ? 'text-red-500' : ''}`}
                    >
                          <Heart className={`w-4 h-4 ${likedItems.includes(String(song.id)) ? 'fill-current' : ''}`} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSongForPlaylist({
                              id: song.id,
                              name: song.name || song.songName || "Unknown Song",
                              cover: song.cover,
                            });
                            setAddToPlaylistOpen(true);
                          }}
                        >
                          <ListPlus className="w-4 h-4 mr-2" />
                          Thêm vào playlist
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareSong({
                              id: song.id,
                              title: song.name || song.songName || "Unknown Song",
                              url: `${window.location.origin}/song/${song.id}`,
                            });
                          }}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Chia sẻ với bạn bè
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
      
      {selectedSongForPlaylist && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSongForPlaylist.id}
          songTitle={selectedSongForPlaylist.name}
          songCover={selectedSongForPlaylist.cover}
        />
      )}
      {shareSong && (
        <ShareButton
          key={`share-${shareSong.id}-${Date.now()}`}
          title={shareSong.title}
          type="song"
          url={shareSong.url}
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setShareSong(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default Top100;