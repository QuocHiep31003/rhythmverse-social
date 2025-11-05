import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Heart, MoreHorizontal, Users, Share2, Trash2 } from "lucide-react";
import { Song } from "@/contexts/MusicContext";
import { formatDateDisplay, msToMMSS, toSeconds } from "@/utils/playlistUtils";

interface PlaylistSongItemProps {
  song: Song & { addedBy?: string; addedAt?: string };
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  onRemove?: () => void;
  onHide?: () => void;
  onCollab?: () => void;
  canEdit: boolean;
  isCollaborator: boolean;
  meId?: number;
}

export const PlaylistSongItem = ({
  song,
  index,
  isActive,
  isPlaying,
  isLiked,
  onPlay,
  onToggleLike,
  onRemove,
  onHide,
  onCollab,
  canEdit,
  isCollaborator,
  meId,
}: PlaylistSongItemProps) => {
  return (
    <div
      onClick={onPlay}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-background/30 transition-colors group cursor-pointer"
    >
      <div className="w-8 text-center flex justify-center">
        {isActive ? (
          isPlaying ? (
            <span className="flex gap-0.5 h-4 items-end">
              <i className="bar" />
              <i className="bar delay-100" />
              <i className="bar delay-200" />
            </span>
          ) : (
            <Play className="w-4 h-4" />
          )
        ) : (
          <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
        )}
      </div>

      <Avatar className="w-12 h-12">
        <AvatarImage src={song.cover} alt={song.title} />
        <AvatarFallback>{song.title.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{song.title}</h4>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>

      <div className="hidden md:block flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{song.album}</p>
      </div>

      <div className="hidden lg:block w-36 text-right leading-tight">
        {(() => {
          const addedDate = formatDateDisplay(song.addedAt);
          if (!addedDate && !song.addedBy) return null;
          return (
            <div className="space-y-0.5">
              {addedDate && <p className="text-xs text-muted-foreground">{addedDate}</p>}
              {song.addedBy && <p className="text-[11px] text-muted-foreground">{song.addedBy}</p>}
            </div>
          );
        })()}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
          className={`h-8 w-8 ${isLiked ? 'text-red-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </Button>

        <span className="text-sm text-muted-foreground w-12 text-right">
          {toSeconds(song.duration) > 0 ? msToMMSS(toSeconds(song.duration)) : '--:--'}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Tùy chọn bài hát"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
            {meId && isCollaborator && onHide && (
              <DropdownMenuItem onClick={onHide}>
                Ẩn bài hát này
              </DropdownMenuItem>
            )}
            {canEdit && onCollab && (
              <DropdownMenuItem onClick={onCollab}>
                <Users className="w-4 h-4 mr-2" />Cộng tác
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch { void 0; } }}>
              <Share2 className="w-4 h-4 mr-2" />Chia sẻ
            </DropdownMenuItem>
            {canEdit && onRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onRemove}>
                  <Trash2 className="w-4 h-4 mr-2" />Xóa khỏi playlist
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

