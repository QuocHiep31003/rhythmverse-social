import { useState, useMemo } from "react";
import { useMusic, type Song } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSongDisplay } from "@/lib/songDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { useEffect } from "react";
import { getAuthToken } from "@/services/api/config";

interface QueueSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customQueue?: Song[];
  customCurrentSongId?: string | number | null;
  onPlaySong?: (songId: string | number) => void;
  onRemoveFromQueue?: (songId: string | number) => void;
}

// QueueItem component
const QueueItem = ({
  song,
  index,
  isCurrent,
  onPlay,
  onRemove,
}: {
  song: Song;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) => {
  const { title, artist, cover } = getSongDisplay(song);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors rounded-md",
        isCurrent && "bg-primary/20"
      )}
      onClick={onPlay}
    >
      {/* Album Art - Small square */}
      {cover ? (
        <img
          src={cover}
          alt={title}
          className="w-12 h-12 rounded object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-gradient-primary flex-shrink-0 flex items-center justify-center">
          <span className="text-xs text-white font-semibold">{index + 1}</span>
        </div>
      )}

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-medium truncate text-sm leading-tight",
            isCurrent ? "text-primary" : "text-white"
          )}
        >
          {title}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {artist}
        </div>
      </div>

      {/* Actions */}
      {isCurrent ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-44 bg-[#282828] border-white/10 z-[100]"
            sideOffset={5}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Thêm vào danh sách yêu thích
              }}
              className="text-white hover:bg-white/10 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              Thêm vào danh sách yêu thích
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-white hover:bg-white/10 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onRemove();
              }}
            >
              Xóa khỏi danh sách chờ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const QueueSidebar = ({ 
  isOpen, 
  onClose, 
  customQueue,
  customCurrentSongId,
  onPlaySong,
  onRemoveFromQueue: customRemoveFromQueue
}: QueueSidebarProps) => {
  const { queue: contextQueue, currentSong, playSong: contextPlaySong, removeFromQueue: contextRemoveFromQueue, setQueue: contextSetQueue } = useMusic();
  const [activeTab, setActiveTab] = useState<"queue" | "recent">("queue");
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Sử dụng custom queue nếu có, nếu không dùng từ context
  const queue = customQueue || contextQueue;
  const currentSongId = customCurrentSongId !== undefined ? customCurrentSongId : (currentSong?.id || null);
  const playSong = onPlaySong ? async (song: Song) => {
    if (onPlaySong) {
      onPlaySong(song.id);
    }
  } : contextPlaySong;
  const removeFromQueue = customRemoveFromQueue || contextRemoveFromQueue;
  const setQueue = contextSetQueue; // Luôn dùng setQueue từ context để giữ queue

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  // Load recent listening history
  useEffect(() => {
    if (activeTab === "recent" && userId && getAuthToken()) {
      const loadRecent = async () => {
        try {
          setLoadingRecent(true);
          const history = await listeningHistoryApi.getByUser(userId, 0, 50);
          const songs: Song[] = history.content
            .filter((entry) => entry.song)
            .map((entry) => {
              const song = entry.song!;
              return {
                id: String(song.id),
                name: song.name || song.title || "Unknown Song",
                songName: song.name || song.title || "Unknown Song",
                title: song.name || song.title || "Unknown Song",
                artist: song.artistNames?.[0] || "Unknown Artist",
                album: song.album?.name || "",
                duration: song.duration || 0,
                cover: song.cover || "",
              };
            });
          setRecentSongs(songs);
        } catch (error) {
          console.error("Error loading recent songs:", error);
          setRecentSongs([]);
        } finally {
          setLoadingRecent(false);
        }
      };
      loadRecent();
    }
  }, [activeTab, userId]);

  const handlePlaySong = async (song: Song) => {
    if (String(currentSongId) === String(song.id)) return;
    try {
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      // QUAN TRỌNG: Truyền đầy đủ tham số để giữ queue
      // Nếu có onPlaySong (từ ControlMusicPlayer), chỉ gọi onPlaySong
      // Nếu không (từ MusicPlayer), gọi playSongWithStreamUrl với đầy đủ tham số
      if (onPlaySong) {
        onPlaySong(song.id);
      } else {
        await playSongWithStreamUrl(song, playSong, setQueue, queue, currentSong);
      }
    } catch (error) {
      console.error("Error playing song:", error);
    }
  };

  const displaySongs = activeTab === "queue" ? queue : recentSongs;

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[64px] bottom-[80px] w-[320px] bg-[#181818] border-l border-white/10 z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#181818] sticky top-0 z-10">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-md transition-all",
              activeTab === "queue"
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            Danh sách phát
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-md transition-all",
              activeTab === "recent"
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            Nghe gần đây
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-visible px-2 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
        {activeTab === "queue" ? (
          queue.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Danh sách chờ trống
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((song, index) => (
                <QueueItem
                  key={song.id}
                  song={song}
                  index={index}
                  isCurrent={String(currentSongId) === String(song.id)}
                  onPlay={async () => {
                    if (String(currentSongId) !== String(song.id)) {
                      if (onPlaySong) {
                        // Từ ControlMusicPlayer - chỉ cần gọi onPlaySong
                        onPlaySong(song.id);
                      } else {
                        // Từ MusicPlayer - cần truyền đầy đủ tham số để giữ queue
                        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
                        await playSongWithStreamUrl(song, playSong, setQueue, queue, currentSong);
                      }
                    }
                  }}
                  onRemove={async () => {
                    if (removeFromQueue) {
                      await removeFromQueue(song.id);
                    }
                  }}
                />
              ))}
            </div>
          )
        ) : (
          loadingRecent ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Đang tải...
            </div>
          ) : recentSongs.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Chưa có bài hát nào được nghe gần đây
            </div>
          ) : (
            <div className="space-y-1">
              {recentSongs.map((song, index) => (
                <QueueItem
                  key={`${song.id}-${index}`}
                  song={song}
                  index={index}
                  isCurrent={String(currentSongId) === String(song.id)}
                  onPlay={() => handlePlaySong(song)}
                  onRemove={() => {
                    if (removeFromQueue) {
                      removeFromQueue(song.id);
                    }
                  }}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default QueueSidebar;

