import { useNavigate } from "react-router-dom";
import { Music, Play } from "lucide-react";
import { DEFAULT_ARTIST_NAME } from "@/utils/socialUtils";
import { cn } from "@/lib/utils";
import { toSeconds, formatTotal } from "@/utils/playlistUtils";

/* ---------- WRAPPER ---------- */
export const SharedContentWrapper = ({
  isSentByMe,
  children,
}: {
  isSentByMe: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={`flex w-full ${
      isSentByMe ? "justify-end" : "justify-start"
    }`}
  >
    <div className="flex-1 max-w-full sm:max-w-[80%] overflow-hidden break-words">
      {children}
    </div>
  </div>
);

/* ---------- BASE CARD (Playlist / Album) ---------- */
const GlassMediaCard = ({
  type,
  image,
  title,
  subtitle,
  onClick,
}: {
  type: "Playlist" | "Album";
  image?: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-xl w-full border cursor-pointer transition-all duration-300",
      "bg-white/95 border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_40px_rgba(15,23,42,0.15)]",
      "dark:bg-white/10 dark:border-white/20 dark:shadow-[0_6px_20px_rgba(91,33,182,0.25)] hover:scale-[1.02]"
    )}
  >
    <div className="relative aspect-square">
      {image ? (
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-slate-200 dark:bg-gradient-to-br dark:from-purple-700 dark:to-indigo-800">
          <Music className="w-8 h-8 text-slate-500 dark:text-white/60" />
        </div>
      )}
      {/* Label */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold 
        text-slate-700 bg-white/90 border border-white/80 shadow-sm
        dark:text-white/90 dark:bg-white/20 dark:border-white/25">
        {type}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent dark:from-black/70 dark:via-black/40 dark:to-transparent" />
    </div>

    <div className="px-3 py-2 bg-white/90 border-t border-slate-100 dark:bg-white/5 dark:border-white/10">
      <p className="font-semibold text-[13px] text-slate-900 dark:text-white truncate">{title}</p>
      <p className="text-[10px] text-slate-600 dark:text-white/70 truncate">{subtitle}</p>
    </div>
  </div>
);

/* ---------- PLAYLIST CARD ---------- */
type SharedPlaylist = {
  name?: string;
  coverUrl?: string | null;
  cover?: string | null;
  ownerName?: string | null;
  totalSongs?: number | null;
  songs?: Array<{ id?: string | number; duration?: string | number | null; length?: string | number | null; durationMs?: number | null }>;
  songCount?: number | null;
  songIds?: Array<string | number>;
  totalDuration?: string | null;
};

interface SharedPlaylistCardProps {
  playlist?: SharedPlaylist;
  _link?: string;
  isSentByMe: boolean;
  loading?: boolean;
  sharedBy?: string;
}

export const SharedPlaylistCard = ({
  playlist,
  _link,
  isSentByMe,
  loading,
  sharedBy,
}: SharedPlaylistCardProps) => {
  const navigate = useNavigate();
  if (!playlist && !loading) return null;
  const go = () => _link && navigate(_link);

  const title = loading ? "Loading…" : playlist?.name || "Shared playlist";
  const ownerLabel = playlist?.ownerName || sharedBy || (isSentByMe ? "You" : "Friend");
  
  // Get songCount from multiple sources - same logic as PlaylistLibrary.tsx
  // Ưu tiên songCount/totalSongs từ API, sau đó fallback về songs.length hoặc songIds.length
  const rawSongCount =
    playlist?.songCount ??
    playlist?.totalSongs ??
    null;
  const count =
    typeof rawSongCount === 'number' && Number.isFinite(rawSongCount) && rawSongCount >= 0
      ? rawSongCount
      : (Array.isArray(playlist?.songs) && playlist.songs.length > 0
        ? playlist.songs.length
        : (Array.isArray(playlist?.songIds) && playlist.songIds.length > 0
          ? playlist.songIds.length
          : 0));
  
  // Calculate totalDuration from songs if available
  const calculatedDuration = playlist?.songs && Array.isArray(playlist.songs) && playlist.songs.length > 0
    ? (() => {
        const totalSeconds = playlist.songs.reduce((acc, song) => {
          const duration = song.duration ?? song.length ?? song.durationMs;
          if (duration) {
            const seconds = toSeconds(duration);
            return acc + seconds;
          }
          return acc;
        }, 0);
        return totalSeconds > 0 ? formatTotal(totalSeconds) : null;
      })()
    : null;
  
  const duration = playlist?.totalDuration ?? calculatedDuration ?? null;
  const durationText = duration ? ` · ${duration}` : "";
  const subtitle = `Playlist · ${ownerLabel} · ${count} ${count === 1 ? "song" : "songs"}${durationText}`;

  return (
    <SharedContentWrapper isSentByMe={isSentByMe}>
      <div className="w-full max-w-[220px] sm:max-w-[250px]">
        <GlassMediaCard
          type="Playlist"
          image={playlist?.coverUrl || playlist?.cover}
          title={title}
          subtitle={subtitle}
          onClick={go}
        />
      </div>
    </SharedContentWrapper>
  );
};

/* ---------- ALBUM CARD ---------- */
type SharedAlbum = {
  id?: number;
  name?: string;
  coverUrl?: string | null;
  artistName?: string | null;
  releaseYear?: string | number | null;
  releaseDateLabel?: string | null;
  songCount?: number | null;
  totalSongs?: number | null;
  songs?: Array<{ id?: string | number; duration?: string | number | null; length?: string | number | null; durationMs?: number | null }>;
  totalDuration?: string | null;
};

interface SharedAlbumCardProps {
  album?: SharedAlbum;
  _link?: string;
  isSentByMe: boolean;
}

export const SharedAlbumCard = ({
  album,
  _link,
  isSentByMe,
}: SharedAlbumCardProps) => {
  const navigate = useNavigate();
  if (!album) return null;
  const go = () => _link && navigate(_link);

  const artist = album.artistName || DEFAULT_ARTIST_NAME;
  const release = album.releaseYear ?? album.releaseDateLabel ?? "";
  
  const count =
    album?.songCount ??
    album?.totalSongs ??
    album?.songs?.length ??
    0;
  
  // Calculate totalDuration from songs if available
  const calculatedDuration = album?.songs && Array.isArray(album.songs) && album.songs.length > 0
    ? (() => {
        const totalSeconds = album.songs.reduce((acc, song) => {
          const duration = song.duration ?? song.length ?? song.durationMs;
          if (duration) {
            const seconds = toSeconds(duration);
            return acc + seconds;
          }
          return acc;
        }, 0);
        return totalSeconds > 0 ? formatTotal(totalSeconds) : null;
      })()
    : null;
  
  const duration = album?.totalDuration ?? calculatedDuration ?? null;
  const durationText = duration ? ` · ${duration}` : "";
  const countText = count > 0 ? ` · ${count} ${count === 1 ? "song" : "songs"}` : "";
  const subtitle = `Album · ${artist}${release ? ` · ${release}` : ""}${countText}${durationText}`;

  return (
    <SharedContentWrapper isSentByMe={isSentByMe}>
      <div className="w-full max-w-[220px] sm:max-w-[250px]">
        <GlassMediaCard
          type="Album"
          image={album.coverUrl}
          title={album.name}
          subtitle={subtitle}
          onClick={go}
        />
      </div>
    </SharedContentWrapper>
  );
};

/* ---------- SONG CARD ---------- */
type SharedSong = {
  id?: number;
  name?: string;
  coverUrl?: string | null;
  artists?: string[] | Array<string | { name?: string }>;
  artist?: string;
  durationLabel?: string;
  audioUrl?: string | null;
};

interface SharedSongCardProps {
  song?: SharedSong;
  onPlay: () => void;
  _link?: string;
  isSentByMe: boolean;
}

export const SharedSongCard = ({
  song,
  onPlay,
  _link,
  isSentByMe,
}: SharedSongCardProps) => {
  const navigate = useNavigate();
  
  if (!song) return null;
  const go = () => _link && navigate(_link);

  // Extract artist name similar to FavoriteSongs.tsx
  // Ưu tiên artist string, sau đó artists array
  const artistName = (song as { artist?: string }).artist 
    || (Array.isArray(song.artists) && song.artists.length > 0
      ? song.artists.map(a => typeof a === 'string' ? a : (a as { name?: string }).name || '').filter(Boolean).join(", ")
      : DEFAULT_ARTIST_NAME);

  return (
    <SharedContentWrapper isSentByMe={isSentByMe}>
      <div
        className="flex items-center w-full rounded-xl
        border border-white/20 bg-white/5
        shadow-[0_6px_20px_rgba(91,33,182,0.25)]
        hover:bg-white/10 hover:shadow-[0_8px_24px_rgba(91,33,182,0.35)]
        transition-all duration-300 p-3"
      >
        {/* Ảnh bài hát */}
        <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-700 to-indigo-800">
              <Music className="w-5 h-5 text-white/60" />
            </div>
          )}
        </div>

        {/* Nội dung bài hát */}
        <div className="flex-1 min-w-0 px-3 text-left">
          <p className="font-medium text-sm text-white leading-tight line-clamp-2">
            {song.name || "Unknown Song"}
          </p>
          <p className="text-xs text-white/70 truncate mt-0.5">
            {artistName}
          </p>
          {song.durationLabel && (
            <p className="text-[10px] text-white/50 mt-0.5">{song.durationLabel}</p>
          )}
        </div>

        {/* Nút Play */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Play song"
          className="flex items-center justify-center flex-shrink-0 h-9 w-9 rounded-full 
          bg-white/25 border border-white/30 hover:bg-white/35 active:bg-white/45
          shadow-[0_0_10px_rgba(255,255,255,0.25)] transition-all ml-2 cursor-pointer z-10"
        >
          <Play className="w-4 h-4 text-white" />
        </button>
      </div>
    </SharedContentWrapper>
  );
};
