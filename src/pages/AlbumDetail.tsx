import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import ShareButton from "@/components/ShareButton";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Heart, Clock, Calendar, Music, MoreHorizontal, Users, ListPlus, Plus, Shuffle, Share2, Download } from "lucide-react";
import { albumsApi } from "@/services/api/albumApi";
import { useMusic } from "@/contexts/MusicContext";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { mapToPlayerSong } from "@/lib/utils";
import { parseSlug, createSlug } from "@/utils/playlistUtils";
import { useFavoriteAlbum, useFavoriteSong } from "@/hooks/useFavorites";
import { favoritesApi } from "@/services/api/favoritesApi";
import { toast } from "@/hooks/use-toast";
import "./AlbumDetail.css";

/* ========== Helper: Lấy màu và định dạng thời gian ========== */
async function getDominantColor(url: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ r: 36, g: 36, b: 44 });
      const w = 32, h = 32;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) return resolve({ r: 36, g: 36, b: 44 });
      resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
    };
    img.onerror = () => resolve({ r: 36, g: 36, b: 44 });
  });
}
function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}
function mix(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t);
}
function makePalette(rgb: { r: number; g: number; b: number }) {
  const base = { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
  return {
    primary: `rgb(${mix(base.r, 255, 0.25)}, ${mix(base.g, 255, 0.25)}, ${mix(base.b, 255, 0.25)})`,
    surfaceTop: `rgb(${mix(base.r, 30, 0.55)}, ${mix(base.g, 30, 0.55)}, ${mix(base.b, 30, 0.55)})`,
    surfaceBottom: `rgb(${mix(base.r, 10, 0.75)}, ${mix(base.g, 10, 0.75)}, ${mix(base.b, 10, 0.75)})`,
  };
}
function msToMMSS(sec: number) {
  const s = Math.floor(sec);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

// Convert various duration representations to seconds
function toSeconds(input: any): number {
  try {
    if (typeof input === 'number' && Number.isFinite(input)) {
      // Heuristic: treat large values as milliseconds
      return input > 10000 ? Math.round(input / 1000) : Math.round(input);
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return 0;
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map((p) => Number(p));
        if (parts.every((n) => Number.isFinite(n))) {
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (parts.length === 2) return parts[0] * 60 + parts[1];
        }
      }
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n > 10000 ? Math.round(n / 1000) : Math.round(n);
    }
  } catch {}
  return 0;
}

function formatTotalDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface AlbumSongRowProps {
  song: any;
  index: number;
  active: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  releaseDate?: string | null;
  onAddToPlaylist: () => void;
  onShare: () => void;
}

const AlbumSongRow = ({
  song,
  index,
  active,
  isPlaying,
  onPlay,
  releaseDate,
  onAddToPlaylist,
  onShare,
}: AlbumSongRowProps) => {
  const numericSongId = useMemo(() => {
    if (typeof song.id === "number" && Number.isFinite(song.id)) return song.id;
    if (typeof song.id === "string") {
      const parsed = Number(song.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }, [song.id]);
  const favoriteHook = useFavoriteSong(numericSongId, { disableToast: false });

  return (
    <div
      className={`grid grid-cols-[56px_minmax(0,1fr)_130px_110px_120px] md:grid-cols-[72px_minmax(0,1fr)_180px_130px_140px]
        items-center gap-3 px-6 py-3 cursor-pointer transition-colors
        ${active ? "bg-primary/10" : "hover:bg-muted/30"}`}
      onClick={onPlay}
    >
      <div className="flex justify-center items-center">
        {active ? (
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
          <span>{song.index ?? index + 1}</span>
        )}
      </div>

      <div>
        <div className={`truncate font-medium ${active ? "text-primary" : ""}`}>
          {song.name || song.songName || "Unknown Song"}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {song.artist}
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-center text-sm w-full">
        {releaseDate ? new Date(releaseDate).toLocaleDateString() : "—"}
      </div>
      <div className="flex items-center justify-center text-sm w-full">
        {toSeconds(song.duration) > 0 ? msToMMSS(toSeconds(song.duration)) : "-"}
      </div>
      <div className="flex items-center justify-center gap-2 w-full">
        <Button
          size="icon"
          variant="ghost"
          className={`h-8 w-8 rounded-full ${
            favoriteHook.isFavorite ? "text-red-500" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            favoriteHook.toggleFavorite();
          }}
          disabled={favoriteHook.pending || !numericSongId}
        >
          <Heart className={`w-4 h-4 ${favoriteHook.isFavorite ? "fill-current" : ""}`} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist();
              }}
            >
              <ListPlus className="w-4 h-4 mr-2" />
              Thêm vào playlist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Chia sẻ với bạn bè
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

/* ========== Component chính ========== */
const AlbumDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { playSong, togglePlay, isPlaying, currentSong, setQueue } = useMusic();

  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [shareAlbumOpen, setShareAlbumOpen] = useState(false);
  const [palette, setPalette] = useState({
    primary: "rgb(140,140,160)",
    surfaceTop: "rgb(28,28,34)",
    surfaceBottom: "rgb(12,12,16)",
  });
  const [albumLikeCount, setAlbumLikeCount] = useState<number | null>(null);
  const heroGradient = useMemo(() => {
    const glow = "rgba(167, 139, 250, 0.65)";
    const accent = "rgba(59, 130, 246, 0.45)";
    return `
      radial-gradient(circle at 20% 20%, ${glow}, transparent 50%),
      radial-gradient(circle at 80% 10%, ${accent}, transparent 45%),
      linear-gradient(180deg, ${palette.surfaceTop} 0%, ${palette.surfaceBottom} 65%, rgba(2,4,12,0.98) 100%)
    `;
  }, [palette.surfaceTop, palette.surfaceBottom]);
  const pageGradient = useMemo(() => {
    const match = palette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    const [r, g, b] = match ? match.slice(1).map(Number) : [168, 85, 247];
    return `linear-gradient(180deg, rgba(${r},${g},${b},0.25) 0%, rgba(14,8,40,0.95) 55%, #030712 100%)`;
  }, [palette.primary]);
  const albumNumericId = useMemo(() => {
    if (album?.id != null) {
      const numeric = Number(album.id);
      if (Number.isFinite(numeric)) return numeric;
    }
    if (slug) {
      const parsed = parseSlug(slug);
      if (parsed.id && Number.isFinite(parsed.id)) {
        return Number(parsed.id);
      }
    }
    return undefined;
  }, [album?.id, slug]);
  const {
    isFavorite: isAlbumSaved,
    pending: albumFavoritePending,
    loading: albumFavoriteLoading,
    toggleFavorite: toggleAlbumFavorite,
  } = useFavoriteAlbum(albumNumericId);

  const totalDuration = useMemo(() => {
    return songs.reduce((acc, cur) => acc + toSeconds(cur.duration), 0);
  }, [songs]);

  /* ========== Fetch album ========== */
  useEffect(() => {
    (async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const parsed = parseSlug(slug);
        const albumId = parsed.id || Number(slug);
        if (!albumId || isNaN(albumId)) {
          navigate('/discover');
          return;
        }
        const res = await albumsApi.getById(albumId);
        if (!res) return;

        const norm = {
          id: res.id,
          title: res.name,
          artist: res.artist?.name ?? "Unknown Artist",
          artistId: res.artist?.id,
          cover: res.coverUrl ?? "/placeholder-album.jpg",
          releaseDate: res.releaseDate ?? "",
          songs: res.songs ?? [],
          likes: res.likes ?? res.favoriteCount ?? 0,
        };
        const songList = norm.songs.map((s: any, i: number) => ({
          ...mapToPlayerSong({
            ...s, // Pass toàn bộ song object để không bị mất field albumCoverImg
            artist: (s.artists && s.artists[0]?.name) || norm.artist,
            album: norm.name,
            albumCoverImg: s.albumCoverImg ?? s.urlImageAlbum ?? norm.cover, // Ưu tiên albumCoverImg từ song
            urlImageAlbum: s.urlImageAlbum ?? norm.cover,
          }),
          index: i + 1,
        }));
        setAlbum(norm);
        setSongs(songList);
        setQueue(songList);

        const dom = await getDominantColor(norm.cover);
        setPalette(makePalette(dom));

        // Lấy số lượt thích
        try {
          const likeCountRes = await favoritesApi.getAlbumLikeCount(albumId);
          setAlbumLikeCount(likeCountRes.count);
        } catch (e) {
          console.warn('Failed to load album like count:', e);
          setAlbumLikeCount(null);
        }

        // lấy related albums
        if (norm.artistId) {
          const all = await albumsApi.getAll({ size: 100 });
          const filtered = all.content.filter(
            (a: any) => a.artist?.id === norm.artistId && a.id !== norm.id
          );
          setRelated(filtered.slice(0, 6));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, navigate]);

  /* ========== Play / Pause logic chuẩn ========== */
  const handlePlayAlbum = async () => {
    if (!songs.length) return;
    if (isPlaying) togglePlay();
    else {
      // Đẩy toàn bộ bài hát trong album vào queue trước, giống Trending
      setQueue(songs);
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      if (currentSong && songs.find((s) => s.id === currentSong.id))
        await playSongWithStreamUrl(currentSong, playSong); // resume đúng bài
      else await playSongWithStreamUrl(songs[0], playSong); // play bài đầu
    }
  };

  const handleShuffleAlbum = () => {
    if (!songs.length) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playSong(shuffled[0]);
  };

  const handleDownloadAlbum = () => {
    toast({
      title: "Tải album",
      description: "Tính năng tải album sẽ ra mắt sớm.",
    });
  };

  const handleActionComingSoon = () => {
    toast({
      title: "Tính năng sắp ra mắt",
      description: "Chúng tôi đang hoàn thiện trải nghiệm này.",
    });
  };

  const headerStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(180deg, ${palette.surfaceTop} 0%, ${palette.surfaceBottom} 100%)`,
    }),
    [palette]
  );

  if (loading) {
    return (
      <div className="min-h-screen text-white album-page-background">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 album-hero-overlay" />
          <div className="relative container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-end">
            <Skeleton className="w-52 h-52 md:w-64 md:h-64 rounded-3xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-3 mt-6">
                <Skeleton className="h-11 w-24 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto max-w-6xl px-4 md:px-8 py-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-0">
              <div className="px-6 py-3 border-b border-white/10">
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="space-y-2 px-6 py-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white album-page-background" style={{ background: pageGradient }}>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 album-hero-overlay" style={{ backgroundImage: heroGradient }} />
        <div className="relative container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-end">
          <div className="relative w-52 h-52 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-[0_25px_45px_rgba(8,8,35,0.45)] ring-1 ring-white/10 flex items-center justify-center bg-black/20">
            <img
              src={album?.cover}
              alt={album?.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="flex-1 flex flex-col justify-end text-center md:text-left">
            <Badge className="w-fit mx-auto md:mx-0 mb-3 bg-white/15 text-white uppercase tracking-[0.4em] rounded-full px-4 py-1 text-[11px]">
              Album
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black drop-shadow-sm">
              {album?.title}
            </h1>
            <p className="mt-2 text-white/80 text-lg">{album?.artist}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 text-sm text-white/80">
              <span>{songs.length} bài hát</span>
              <span className="text-white/40">•</span>
              <span>{formatTotalDuration(totalDuration)}</span>
              <span className="text-white/40">•</span>
              <span>
                {album?.releaseDate
                  ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(
                      new Date(album.releaseDate)
                    )
                  : "—"}
              </span>
              {albumLikeCount !== null && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {albumLikeCount.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 md:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="icon"
                  className={`h-16 w-16 rounded-full text-white shadow-2xl transition duration-200 ${
                    isPlaying ? "bg-[#c084fc] hover:bg-[#c084fc]/90" : "bg-[#a855f7] hover:bg-[#9333ea]"
              }`}
              onClick={handlePlayAlbum}
              disabled={!songs.length}
            >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={handleShuffleAlbum}
              disabled={!songs.length}
            >
              <Shuffle className="w-4 h-4" />
              Ngẫu nhiên
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white"
              onClick={handleDownloadAlbum}
              disabled={!songs.length}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`text-white/80 hover:text-white ${isAlbumSaved ? "text-red-500" : ""}`}
              onClick={toggleAlbumFavorite}
              disabled={!albumNumericId || albumFavoritePending || albumFavoriteLoading}
              aria-label={isAlbumSaved ? "Đã lưu album này" : "Lưu album vào thư viện"}
            >
              <Heart className={`w-5 h-5 ${isAlbumSaved ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white"
              onClick={() => setShareAlbumOpen(true)}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white"
              onClick={handleActionComingSoon}
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* song list */}
      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-8">
        <Card className="border-white/10 bg-black/40 backdrop-blur">
          <CardContent className="p-0">
            <div className="grid grid-cols-[56px_minmax(0,1fr)_130px_110px_120px] md:grid-cols-[72px_minmax(0,1fr)_180px_130px_140px] px-6 py-3 gap-3 text-xs uppercase text-white/70 border-b border-border items-center">
              <div className="flex justify-center items-center">#</div>
              <div className="flex items-center">Title</div>
              <div className="hidden sm:flex items-center justify-center w-full">Released</div>
              <div className="flex items-center justify-center w-full">Duration</div>
              <div className="flex items-center justify-center w-full">Actions</div>
            </div>

            {songs.length ? (
              songs.map((song, index) => {
                const active = currentSong?.id === song.id;
                return (
                  <AlbumSongRow
                    key={song.id}
                    song={song}
                    index={index}
                    active={active}
                    isPlaying={isPlaying && active}
                    onPlay={async () => {
                      if (active && isPlaying) {
                        togglePlay();
                      } else {
                        // Đẩy queue = toàn bộ bài hát trong album, rồi phát bài được chọn
                        setQueue(songs);
                        const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
                        await playSongWithStreamUrl(song, playSong);
                      }
                    }}
                    releaseDate={album?.releaseDate}
                    onAddToPlaylist={() => {
                      setSelectedSongForPlaylist({
                        id: song.id,
                        name: song.name || song.songName || "Unknown Song",
                        cover: song.urlImageAlbum || song.cover,
                      });
                      setAddToPlaylistOpen(true);
                    }}
                    onShare={() => {
                      setShareSong({
                        id: song.id,
                        title: song.name || song.songName || "Unknown Song",
                        url: `${window.location.origin}/song/${song.id}`,
                      });
                    }}
                  />
                );
              })
            ) : (
              <div className="px-6 py-10 text-center text-muted-foreground">
                No songs found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* related albums */}
      {related.length > 0 && (
        <div className="container mx-auto max-w-6xl px-4 md:px-8 pb-16">
          <h2 className="text-2xl font-semibold mb-5">
            More from {album?.artist}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {related.map((rel: any) => (
              <Card
                key={rel.id}
                onClick={() => navigate(`/album/${createSlug(rel.name || rel.title || 'album', rel.id)}`)}
                className="cursor-pointer border-border hover:border-primary/40 bg-card hover:bg-muted/30 transition-all overflow-hidden"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={rel.coverUrl}
                    alt={rel.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-3">
                  <p className="font-medium truncate">{rel.name}</p>
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {rel.artist?.name || "Unknown Artist"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {rel.releaseDate && (
                      <span>
                        {new Date(rel.releaseDate).getFullYear()}
                      </span>
                    )}
                    {rel.likes !== undefined && rel.likes !== null && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {rel.likes}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ChatBubble />
      <Footer />

      {/* equalizer animation */}
      <style>{`
        .bar {
          display:inline-block;
          width:2px;
          height:8px;
          background:${isPlaying ? palette.primary : "transparent"};
          animation:${isPlaying ? "ev 1s ease-in-out infinite" : "none"};
        }
        .bar.delay-100{animation-delay:.12s}
        .bar.delay-200{animation-delay:.24s}
        @keyframes ev{0%{height:4px}50%{height:14px}100%{height:4px}}
      `}</style>
      
      {selectedSongForPlaylist && (
        <AddToPlaylistDialog
          open={addToPlaylistOpen}
          onOpenChange={setAddToPlaylistOpen}
          songId={selectedSongForPlaylist.id}
          songTitle={selectedSongForPlaylist.name}
          songCover={selectedSongForPlaylist.cover}
        />
      )}
      <ShareButton
        title={album?.title || "Album"}
        type="album"
        url={`${window.location.origin}/album/${createSlug(
          album?.title || album?.name || "album",
          album?.id ?? (slug ? parseSlug(slug).id : undefined)
        )}`}
        albumId={Number(album?.id ?? (slug ? parseSlug(slug).id : undefined))}
        open={shareAlbumOpen}
        onOpenChange={setShareAlbumOpen}
      />
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

export default AlbumDetail;
