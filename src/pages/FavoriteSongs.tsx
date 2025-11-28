import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  Play,
  Pause,
  MoreHorizontal,
  Share2,
  Shuffle,
  Download,
  List,
  ExternalLink,
  ListPlus,
} from "lucide-react";
import { favoritesApi, FavoriteSongDTO } from "@/services/api/favoritesApi";
import { playlistsApi, PlaylistLibraryItemDTO } from "@/services/api/playlistApi";
import { authApi } from "@/services/api";
import { PlaylistVisibility } from "@/types/playlist";
import type { PlaylistItem } from "@/types/playlistLibrary";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { useFavoriteSong, useFavoritePlaylist } from "@/hooks/useFavorites";
import { useMusic, type Song } from "@/contexts/MusicContext";
import { toSeconds, formatTotal, createSlug } from "@/utils/playlistUtils";
import ShareButton from "@/components/ShareButton";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";
import "./FavoriteSongs.css";

const PAGE_SIZE = 40;

const PlaylistCardWithFavorite = ({ playlist }: { playlist: PlaylistItem }) => {
  const numericId = Number(playlist.id);
  const favoriteHook = useFavoritePlaylist(Number.isFinite(numericId) ? numericId : undefined, { disableToast: false });
  return (
    <div className="snap-start w-full sm:w-auto sm:min-w-[240px] sm:max-w-[260px]">
      <PlaylistCard
        playlist={playlist}
        isLiked={favoriteHook.isFavorite}
        onLike={favoriteHook.toggleFavorite}
        likePending={favoriteHook.pending}
        onPlay={() => toast({ title: `Playing ${playlist.title}`, description: `${playlist.songCount} songs` })}
      />
    </div>
  );
};

const mapFavoriteSongToPlayerSong = (song: FavoriteSongDTO): Song => {
  const artistFromArray =
    Array.isArray(song.artists) && song.artists.length
      ? song.artists
          .map((artist) => {
            if (typeof artist === "string") return artist;
            if (artist && typeof artist === "object" && "name" in artist) {
              return (artist as { name?: string }).name ?? "";
            }
            return "";
          })
          .filter(Boolean)
          .join(", ")
      : "";
  const artist = song.artist || artistFromArray || "Unknown Artist";
  const albumName =
    typeof song.album === "string"
      ? song.album
      : (song.album as { name?: string })?.name ?? "";
  const cover =
    song.coverUrl || song.albumCoverImg || song.urlImageAlbum || "";
  const durationValue =
    typeof song.duration === "number" || typeof song.duration === "string"
      ? toSeconds(song.duration)
      : 0;

  return {
    id: String(song.id),
    name: song.name ?? song.title ?? "Untitled",
    title: song.name ?? song.title ?? "Untitled",
    songName: song.name ?? song.title ?? "Untitled",
    artist,
    album: albumName,
    duration: durationValue,
    cover,
    audioUrl: (song as { audioUrl?: string }).audioUrl,
  };
};

const mapLibraryPlaylist = (item: PlaylistLibraryItemDTO): PlaylistItem => ({
  id: String(item.playlistId),
  title: item.name,
  description: item.description ?? "",
  cover: item.coverUrl ?? "",
  songCount: item.songCount ?? 0,
  totalDuration: item.totalDuration ?? "--",
  isPublic: item.visibility === PlaylistVisibility.PUBLIC,
  visibility: item.visibility ?? null,
  likes: item.likes ?? 0,
  createdAt: item.createdAt ?? null,
  updatedAt: item.updatedAt ?? item.dateUpdate ?? null,
  ownerId: item.ownerId,
  ownerName: item.ownerName,
  ownerAvatar: item.ownerAvatar ?? null,
  isOwner: !!item.isOwner,
  isCollaborator: !!item.isCollaborator,
  role: item.role as PlaylistItem["role"],
});

const formatFavoriteDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  } catch {
    return parsed.toLocaleDateString("vi-VN");
  }
};

const FavoriteSongs = () => {
  const [songs, setSongs] = useState<FavoriteSongDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [shareSong, setShareSong] = useState<{ id: number; title: string; url: string } | null>(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<{ id: number; title: string; cover?: string } | null>(null);
  const [playlistPreview, setPlaylistPreview] = useState<PlaylistItem[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [profile, setProfile] = useState<{ name: string; avatar: string }>({ name: "", avatar: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [denseRows, setDenseRows] = useState(false);
  const navigate = useNavigate();
  const { playSong, setQueue, isPlaying, currentSong, togglePlay } = useMusic();

  const mappedSongs = useMemo(() => songs.map(mapFavoriteSongToPlayerSong), [songs]);
  const totalDuration = useMemo(
    () => mappedSongs.reduce((acc, song) => acc + song.duration, 0),
    [mappedSongs]
  );
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const data = await authApi.me();
        if (!mounted || !data) return;
        setProfile({
          name: data?.name || data?.username || "",
          avatar: data?.avatar || "",
        });
      } catch {
        // ignore
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const loadSongs = useCallback(
    async (targetPage = 0, replace = false) => {
      try {
        if (targetPage === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        const res = await favoritesApi.listSongs({ page: targetPage, size: PAGE_SIZE });
        const content = res.content ?? [];
        setSongs((prev) => (replace ? content : [...prev, ...content]));
        setHasMore(!res.last && (res.totalPages ?? 0) > targetPage + 1 && content.length > 0);
        setPage(targetPage);
      } catch (error) {
        console.error("Failed to load favorite songs", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const loadPlaylistPreview = useCallback(async () => {
    try {
      setLoadingPlaylists(true);
      const items = await playlistsApi.library();
      setPlaylistPreview(items.slice(0, 6).map(mapLibraryPlaylist));
    } catch {
      setPlaylistPreview([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  useEffect(() => {
    loadSongs(0, true);
    loadPlaylistPreview();
  }, [loadSongs, loadPlaylistPreview]);

  const handlePlayAll = () => {
    if (!mappedSongs.length) return;
    setQueue(mappedSongs);
    playSong(mappedSongs[0]);
  };

  const handlePlaySong = (index: number) => {
    if (!mappedSongs.length) return;
    setQueue(mappedSongs);
    playSong(mappedSongs[index]);
  };

  const handlePrimaryAction = () => {
    if (!mappedSongs.length) return;
    if (isPlaying) {
      togglePlay();
      return;
    }
    handlePlayAll();
  };

  const handleShufflePlay = () => {
    if (!mappedSongs.length) return;
    const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playSong(shuffled[0]);
  };

  const handleDownloadFavorites = () => {
    toast({
      title: "Tải playlist yêu thích",
      description: "Tính năng tải ngoại tuyến sẽ sớm ra mắt.",
    });
  };

  const handleToggleDensity = () => setDenseRows((prev) => !prev);

  const handleActionComingSoon = () =>
    toast({
      title: "Tính năng sắp ra mắt",
      description: "Chúng tôi đang hoàn thiện trải nghiệm này.",
    });

  const profileDisplayName = profile.name?.trim()
    ? profile.name
    : profileLoading
      ? "Đang tải..."
      : "Playlist của bạn";
  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || "B";
  const heroBackgroundClass = "favorite-hero-overlay";

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadSongs(page + 1);
  };

  const handleRemoveFavoriteLocally = (songId: number | string) => {
    setSongs((prev) => prev.filter((item) => String(item.id) !== String(songId)));
  };

  const handleOpenSongDetail = (song: FavoriteSongDTO) => {
    const slug = createSlug(song.name ?? song.title ?? "song", song.id);
    navigate(`/song/${slug}`);
  };

  return (
    <div className="min-h-screen text-white favorite-page-background">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className={`absolute inset-0 ${heroBackgroundClass}`} />
        <div className="relative container mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-end">
          <div className="relative w-52 h-52 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-[0_25px_45px_rgba(8,8,35,0.45)] ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9]" />
            <div className="absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.8),transparent_55%)]" />
            <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.8),transparent_45%)]" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.5),transparent_60%)]" />
            <div className="relative flex h-full w-full items-center justify-center">
              <div className="absolute inset-6 rounded-2xl border border-white/20" />
              <Heart className="relative w-24 h-24 text-white drop-shadow-[0_8px_25px_rgba(0,0,0,0.6)] fill-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <Badge className="bg-white/15 text-white uppercase tracking-[0.4em] rounded-full px-4 py-1 text-[11px]">
              Your Favorite
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mt-3 drop-shadow-sm">
              Liked Songs
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border border-white/20 bg-white/5">
                  <AvatarImage src={profile.avatar} alt={profileDisplayName} />
                  <AvatarFallback className="bg-white/10 text-white">
                    {profileInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">{profileDisplayName}</span>
              </div>
              <span className="text-white/40">•</span>
              <span>{mappedSongs.length} bài hát</span>
              <span className="text-white/40">•</span>
              <span>{formatTotal(totalDuration)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 md:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="icon"
              className={`h-16 w-16 rounded-full text-black shadow-2xl transition ${
                isPlaying ? "bg-white hover:bg-white/90" : "bg-[#1ed760] hover:bg-[#1ed760]/90"
              }`}
              onClick={handlePrimaryAction}
              disabled={!mappedSongs.length}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={handleShufflePlay}
              disabled={!mappedSongs.length}
            >
              <Shuffle className="w-4 h-4" />
              Ngẫu nhiên
            </Button>
            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => navigate("/playlists")}>
              Về thư viện
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white"
              onClick={handleDownloadFavorites}
              disabled={!mappedSongs.length}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant={denseRows ? "default" : "ghost"}
              size="icon"
              className={
                denseRows
                  ? "bg-white text-background hover:bg-white/90"
                  : "text-white/80 hover:text-white"
              }
              onClick={handleToggleDensity}
            >
              <List className="w-5 h-5" />
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

      <div className="container mx-auto max-w-6xl px-4 md:px-8 pb-12 space-y-10">
        <Card className="border-white/10 bg-black/40 backdrop-blur">
          <CardContent className="p-0">
            <div className="grid grid-cols-[56px_minmax(0,4fr)_minmax(0,2fr)_150px_96px_140px] md:grid-cols-[72px_minmax(0,4fr)_minmax(0,2.2fr)_160px_96px_160px] px-6 py-3 text-xs uppercase text-white/60 border-b border-white/10">
              <div className="text-center">#</div>
              <div>Bài hát</div>
              <div className="hidden sm:block">Album</div>
              <div className="hidden md:block text-center">Ngày thêm</div>
              <div className="text-center">Thời lượng</div>
              <div className="text-center">Hành động</div>
            </div>

            {loading ? (
              <div className="space-y-3 p-6">
                {[...Array(6)].map((_, idx) => (
                  <Skeleton key={idx} className="h-16 w-full bg-white/5" />
                ))}
              </div>
            ) : mappedSongs.length === 0 ? (
              <div className="px-6 py-12 text-center text-white/70">
                Bạn chưa lưu bài hát nào. Nhấn icon trái tim ở bất kỳ bài hát nào để thêm vào đây.
              </div>
            ) : (
              mappedSongs.map((song, index) => (
                <FavoriteSongRow
                  key={`${song.id}-${index}`}
                  song={songs[index]}
                  playerSong={song}
                  index={index}
                  isActive={currentSong?.id === song.id}
                  isPlaying={isPlaying}
                  onPlay={() => handlePlaySong(index)}
                  onOpenDetail={() => handleOpenSongDetail(songs[index])}
                  onRemoveFromList={handleRemoveFavoriteLocally}
                  onAddToPlaylist={() => {
                    const candidateId = Number(songs[index]?.id ?? song.id);
                    if (!Number.isFinite(candidateId)) {
                      toast({
                        title: "Không thể thêm",
                        description: "Thiếu thông tin bài hát để thêm vào playlist.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setAddToPlaylistSong({
                      id: candidateId,
                      title: song.title ?? song.name ?? "Unknown Song",
                      cover: song.cover,
                    });
                  }}
                  onShare={() =>
                    setShareSong({
                      id: song.id as unknown as number,
                      title: song.title ?? song.name ?? "Unknown Song",
                      url: `${window.location.origin}/song/${createSlug(song.title ?? song.name ?? "song", song.id)}`,
                    })
                  }
                  dense={denseRows}
                />
              ))
            )}
          </CardContent>
        </Card>

        {hasMore && mappedSongs.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Đang tải..." : "Tải thêm"}
            </Button>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-semibold">Playlist của bạn</h3>
              <p className="text-sm text-white/70">
                Tiếp tục nghe các playlist đã tạo hoặc đang cộng tác.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white" onClick={() => navigate("/playlists")}>
              Xem tất cả
            </Button>
          </div>
          {loadingPlaylists ? (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {[0, 1, 2].map((skeleton) => (
                <Skeleton key={skeleton} className="h-64 rounded-xl bg-white/5" />
              ))}
            </div>
          ) : playlistPreview.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
              Bạn chưa có playlist nào trong thư viện. Tạo playlist mới để hiển thị tại đây.
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {playlistPreview.map((playlist) => (
                <PlaylistCardWithFavorite
                  key={playlist.id}
                  playlist={playlist}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {shareSong && (
        <ShareButton
          key={`share-${shareSong.id}`}
          title={shareSong.title}
          type="song"
          url={shareSong.url}
          open
          onOpenChange={(open) => {
            if (!open) setShareSong(null);
          }}
        />
      )}

      {addToPlaylistSong && (
        <AddToPlaylistDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddToPlaylistSong(null);
          }}
          songId={addToPlaylistSong.id}
          songTitle={addToPlaylistSong.title}
          songCover={addToPlaylistSong.cover}
        />
      )}
    </div>
  );
};

interface FavoriteSongRowProps {
  song: FavoriteSongDTO;
  playerSong: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onOpenDetail: () => void;
  onRemoveFromList: (songId: number | string) => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  dense?: boolean;
}

const FavoriteSongRow = ({
  song,
  playerSong,
  index,
  isActive,
  isPlaying,
  onPlay,
  onOpenDetail,
  onRemoveFromList,
  onAddToPlaylist,
  onShare,
  dense = false,
}: FavoriteSongRowProps) => {
  const numericId = Number(song.id);
  const favoriteHook = useFavoriteSong(Number.isFinite(numericId) ? numericId : undefined);
  const cover = playerSong.cover || "/placeholder.svg";
  const likes = song.likes ?? 0;
  const gridTemplate = dense
    ? "grid-cols-[40px_minmax(0,2.5fr)_minmax(0,1.6fr)_110px_80px_130px] md:grid-cols-[56px_minmax(0,3fr)_minmax(0,1.8fr)_130px_96px_140px]"
    : "grid-cols-[56px_minmax(0,4fr)_minmax(0,2fr)_150px_96px_140px] md:grid-cols-[72px_minmax(0,4.5fr)_minmax(0,2.2fr)_160px_96px_160px]";
  const rowPadding = dense ? "px-4 py-2 gap-3 text-sm" : "px-6 py-3 gap-4";
  const coverSize = dense ? "w-10 h-10" : "w-12 h-12";
  const titleClass = dense ? "text-sm" : "text-base";
  const actionButtonSize = dense ? "h-7 w-7" : "h-8 w-8";

  return (
    <div
      onClick={onPlay}
      className={`grid ${gridTemplate} items-center ${rowPadding} transition-colors cursor-pointer ${
        isActive ? "bg-primary/10" : "hover:bg-muted/30"
      }`}
    >
      <div className="flex justify-center text-muted-foreground">
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
          <span>{index + 1}</span>
        )}
      </div>

      <div className="min-w-0 flex items-center gap-3">
        {cover ? (
          <img
            src={cover}
            alt={playerSong.title || playerSong.songName}
            className={`${coverSize} rounded object-cover`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {!cover && (
          <div className={`${coverSize} rounded bg-muted flex items-center justify-center text-sm font-semibold uppercase`}>
            {(playerSong.title || playerSong.songName || "?").charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className={`font-medium truncate ${titleClass}`}>{playerSong.title || playerSong.songName}</p>
          <p className="text-sm text-muted-foreground truncate">{playerSong.artist}</p>
        </div>
      </div>

      <div className="hidden sm:flex flex-col min-w-0 text-sm text-muted-foreground">
        <span className="truncate">{playerSong.album || "—"}</span>
      </div>

      <div className="hidden md:block text-sm text-muted-foreground text-center">
        {formatFavoriteDate(song.likedAt)}
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {playerSong.duration > 0 ? formatDurationForRow(playerSong.duration) : "--:--"}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`${actionButtonSize} rounded-full ${
            favoriteHook.isFavorite ? "text-red-500" : "text-muted-foreground"
          }`}
          onClick={async (e) => {
            e.stopPropagation();
            const wasFavorite = favoriteHook.isFavorite;
            const success = await favoriteHook.toggleFavorite();
            if (success && wasFavorite && song.id !== undefined && song.id !== null) {
              onRemoveFromList(song.id);
            }
          }}
          disabled={favoriteHook.pending || !Number.isFinite(numericId)}
          title={favoriteHook.isFavorite ? "Bỏ khỏi Favorite" : "Thêm vào Favorite"}
        >
          <Heart className={`w-4 h-4 ${favoriteHook.isFavorite ? "fill-current" : ""}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className={actionButtonSize}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist();
              }}
            >
              <ListPlus className="w-4 h-4 mr-2" />
              Thêm vào playlist
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Chia sẻ
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Xem chi tiết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const formatDurationForRow = (duration: number) => {
  const minutes = Math.floor(duration / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(duration % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default FavoriteSongs;

