import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Sparkles, Minus, MoreHorizontal, ListPlus, Users } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { TrendingSong, getTrendingComparison, TrendStatus } from "@/services/api/trendingApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDuration, mapToPlayerSong } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import ShareButton from "@/components/ShareButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TrendIcon = ({ status }: { status: TrendStatus }) => {
    switch (status) {
        case TrendStatus.RISING:
            return <ArrowUp className="h-4 w-4 text-green-500" />;
        case TrendStatus.FALLING:
            return <ArrowDown className="h-4 w-4 text-red-500" />;
        case TrendStatus.NEW:
            return <Sparkles className="h-4 w-4 text-yellow-500" />;
        default:
            return <Minus className="h-4 w-4 text-gray-500" />;
    }
};

interface TrendingSongWithRank extends ReturnType<typeof mapToPlayerSong> {
  rank: number;
  trendStatus: TrendStatus;
}

const TrendingSection = () => {
  const { playSong, setQueue } = useMusic();
  const [trendingSongs, setTrendingSongs] = useState<TrendingSongWithRank[]>([]);
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

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const top10 = await getTrendingComparison(10);
        
        if (top10 && top10.length > 0) {
          const formattedSongs = top10.map((song: TrendingSong): TrendingSongWithRank => ({
            ...mapToPlayerSong({
              ...song, // Pass toàn bộ object để không bị mất field nào
              id: song.songId,
              songName: song.songName,
              albumImageUrl: song.albumImageUrl,
            }),
            rank: song.rank,
            trendStatus: song.trendStatus,
          }));
          
          setTrendingSongs(formattedSongs);
        } else {
          setTrendingSongs([]);
        }
      } catch (err) {
        console.error("❌ Error loading trending songs:", err);
        setTrendingSongs([]); // Clear on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    ))
  );

  return (
    <section className="py-12">
      <div className="container px-4 md:px-6">
        <Card className="bg-card/60 border-border/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Hot Today</span>
            </CardTitle>
            <Link to="/top100">
              <Button variant="ghost" size="sm">See All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
                renderSkeletons()
            ) : trendingSongs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trending songs available right now.
              </div>
            ) : (
              trendingSongs.map((song, index) => (
                <div 
                  key={song.id} 
                  className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => {
                    setQueue(trendingSongs);
                    playSong(song);
                  }}
                >
                <div className="flex items-center justify-center w-8 text-lg font-bold text-primary">
                  {index + 1}
                </div>
                <div className="relative w-14 h-14 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img 
                    src={song.cover} 
                    alt={song.songName || "Unknown Song"} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-1 right-1 bg-black/50 p-0.5 rounded-full">
                    <TrendIcon status={song.trendStatus} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{song.songName || "Unknown Song"}</h4>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <div className="hidden sm:block text-sm text-muted-foreground">
                  {formatDuration(song.duration)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSongForPlaylist({
                          id: song.id,
                          name: song.songName || "Unknown Song",
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
                          title: song.songName || "Unknown Song",
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
              ))
            )}
          </CardContent>
        </Card>
      </div>
      
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
    </section>
  );
};

export default TrendingSection;