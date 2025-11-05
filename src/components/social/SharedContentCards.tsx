import { useNavigate } from "react-router-dom";
import { Music, Play } from "lucide-react";
import { DEFAULT_ARTIST_NAME } from "@/utils/socialUtils";

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
    className="relative overflow-hidden rounded-xl w-full
      bg-white/10 border border-white/20 
      shadow-[0_6px_20px_rgba(91,33,182,0.25)]
      hover:scale-[1.02] transition-all duration-300 cursor-pointer"
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
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-700 to-indigo-800">
          <Music className="w-8 h-8 text-white/60" />
        </div>
      )}
      {/* Label */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold 
        text-white/90 bg-white/20 border border-white/25">
        {type}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
    </div>

    <div className="px-3 py-2 bg-white/5 border-t border-white/10">
      <p className="font-semibold text-[13px] text-white truncate">{title}</p>
      <p className="text-[10px] text-white/70 truncate">{subtitle}</p>
    </div>
  </div>
);

/* ---------- PLAYLIST CARD ---------- */
export const SharedPlaylistCard = ({
  playlist,
  _link,
  isSentByMe,
  loading,
}: any) => {
  const navigate = useNavigate();
  if (!playlist && !loading) return null;
  const go = () => _link && navigate(_link);

  const title = loading ? "Loading…" : playlist?.name || "Shared playlist";
  const count = playlist?.totalSongs ?? playlist?.songs?.length ?? 0;
  const subtitle = `Playlist · EchoVerse · ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <SharedContentWrapper isSentByMe={isSentByMe}>
      <div className="w-full max-w-[220px] sm:max-w-[250px]">
        <GlassMediaCard
          type="Playlist"
          image={playlist?.coverUrl}
          title={title}
          subtitle={subtitle}
          onClick={go}
        />
      </div>
    </SharedContentWrapper>
  );
};

/* ---------- ALBUM CARD ---------- */
export const SharedAlbumCard = ({
  album,
  _link,
  isSentByMe,
}: any) => {
  const navigate = useNavigate();
  if (!album) return null;
  const go = () => _link && navigate(_link);

  const artist = album.artistName || DEFAULT_ARTIST_NAME;
  const release = album.releaseYear ?? album.releaseDateLabel ?? "";
  const subtitle = `Album · ${artist}${release ? ` · ${release}` : ""}`;

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
export const SharedSongCard = ({
  song,
  onPlay,
  _link,
  isSentByMe,
}: any) => {
  const navigate = useNavigate();
  
  if (!song) return null;
  const go = () => _link && navigate(_link);

  return (
    <SharedContentWrapper isSentByMe={isSentByMe}>
      <div
        onClick={go}
        className="flex items-center w-full rounded-xl
        border border-white/20 bg-white/5
        shadow-[0_6px_20px_rgba(91,33,182,0.25)]
        hover:scale-[1.02] transition-all duration-300 cursor-pointer p-2 sm:p-3"
      >
        {/* Ảnh bài hát */}
        <div className="h-[55px] w-[55px] flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-700 to-indigo-800">
              <Music className="w-4 h-4 text-white/60" />
            </div>
          )}
        </div>

        {/* Nội dung bài hát */}
        <div className="flex-1 min-w-0 px-3 text-left">
          <p className="font-medium text-[13px] text-white leading-snug break-words whitespace-normal">
            {song.name}
          </p>
          <p className="text-[11px] text-white/70 truncate">
            {song.artists?.join(", ") || DEFAULT_ARTIST_NAME}
          </p>
          {song.durationLabel && (
            <p className="text-[10px] text-white/50">{song.durationLabel}</p>
          )}
        </div>

        {/* Nút Play */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          aria-label="Play song"
          className="flex items-center justify-center flex-shrink-0 h-8 w-8 rounded-full 
          bg-white/25 border border-white/30 hover:bg-white/35 
          shadow-[0_0_10px_rgba(255,255,255,0.25)] transition-all"
        >
          <Play className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </SharedContentWrapper>
  );
};
