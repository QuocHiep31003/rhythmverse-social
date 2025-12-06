import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { playlistsApi, PlaylistDTO } from "@/services/api/playlistApi";
import { albumsApi } from "@/services/api/albumApi";
import { songsApi } from "@/services/api/songApi";
import { useMusic, Song } from "@/contexts/MusicContext";
import type { Message, SharedPlaylistMessageData, SharedAlbumMessageData, SharedSongMessageData } from "@/types/social";
import { SharedPlaylistCard, SharedAlbumCard, SharedSongCard } from "./SharedContentCards";
import { extractArtistNames, formatDurationLabel, normalizeArtistName, DEFAULT_ARTIST_NAME, decodeUnicodeEscapes } from "@/utils/socialUtils";
import { createSlug, toSeconds, formatTotal } from "@/utils/playlistUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { mapToPlayerSong } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api/config";
import { MoreVertical, Smile } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "😭", "🔥"];

interface MessageCardProps {
  message: Message;
  playSong: (song: Song) => void;
  onReact?: (message: Message, emoji: string) => void;
  onDelete?: (message: Message) => void;
  reactionOptions?: string[];
  senderAvatar?: string | null;
  meId?: number;
  previousMessage?: Message | null;
}

export const MessageCard = ({ message, playSong, onReact, onDelete, reactionOptions = DEFAULT_REACTIONS, senderAvatar, meId, previousMessage }: MessageCardProps) => {
  const { setQueue, currentSong } = useMusic();
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistDTO | null>(null);
  const [albumInfo, setAlbumInfo] = useState<{ id: number; name: string; coverUrl?: string | null; artist?: unknown; releaseYear?: number; songs?: Array<{ id?: number; duration?: string | number | null; length?: string | number | null; durationMs?: number | null }>; songCount?: number | null; totalSongs?: number | null; totalDuration?: string | null } | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const isSentByMe = message.sender === "You";
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const parseTimestampMs = (msg?: Message | null) => {
    if (!msg) return null;
    if (typeof msg.sentAt === "number" && Number.isFinite(msg.sentAt)) return msg.sentAt;
    const parsed = Date.parse(msg.timestamp);
    if (!Number.isNaN(parsed)) return parsed;
    const numericId = Number(msg.id);
    return Number.isFinite(numericId) ? numericId : null;
  };

  const currentTimeMs = parseTimestampMs(message);
  const previousTimeMs = parseTimestampMs(previousMessage);
  const timeDiffMs =
    currentTimeMs !== null && previousTimeMs !== null
      ? Math.abs(currentTimeMs - previousTimeMs)
      : null;
  const hasTimeGap = previousMessage === null || (timeDiffMs !== null && timeDiffMs >= 5 * 60 * 1000);

  // Chỉ hiện timestamp khi hover (ẩn mặc định)
  const showTimestamp = isHovered;

  const reactionButton = (
    <div className="relative">
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
        aria-label="Add reaction"
        onClick={() => setEmojiPickerOpen((prev) => !prev)}
      >
        <Smile className="w-4 h-4" />
      </button>
      <div
        className={`absolute bottom-full mb-2 ${
          isSentByMe ? "right-0" : "left-0"
        } ${emojiPickerOpen ? "flex" : "hidden"} gap-1.5 bg-background/98 dark:bg-background/95 border border-border/60 rounded-full px-2 py-1.5 shadow-xl z-40 backdrop-blur-sm`}
      >
        {reactionOptions.map((emoji) => (
          <button
            key={emoji}
            type="button"
                        className="text-xl transition-transform p-1 hover:bg-muted/40 rounded-full"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onReact?.(message, emoji);
                          setEmojiPickerOpen(false);
                        }}
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
        ))}
      </div>
    </div>
  );

  const visibilityClasses = emojiPickerOpen
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto";

  const actionButtonsSent = (
    <div
      className={`flex items-center gap-1 min-w-[96px] justify-end ${visibilityClasses}`}
    >
      {onDelete && (
        <>
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
            aria-label="More options"
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Thu hồi tin nhắn</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc muốn thu hồi tin nhắn này? Tin nhắn sẽ biến mất khỏi cuộc trò chuyện của cả hai bên.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete(message);
                    setDeleteDialogOpen(false);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Thu hồi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {onReact && reactionButton}
    </div>
  );

  const actionButtonsReceived = onReact ? (
    <div
      className={`flex items-center gap-1 min-w-[44px] justify-start ${visibilityClasses}`}
    >
      {reactionButton}
    </div>
  ) : null;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const detectTouch = () => {
      try {
        return (
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia("(pointer: coarse)").matches
        );
      } catch {
        return false;
      }
    };

    const update = () => setIsTouchDevice(detectTouch());
    update();

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia("(pointer: coarse)");
      const listener = (event: MediaQueryListEvent) => setIsTouchDevice(event.matches);
      mql.addEventListener("change", listener);
      return () => {
        mql?.removeEventListener("change", listener);
      };
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (message.type !== "playlist") return;
    // Fetch từ API để lấy songCount đúng - giống PlaylistLibrary
    const playlistId = message.sharedPlaylist?.id ?? message.playlistData?.id;
    if (!playlistId || playlistInfo) return;
    setLoadingPlaylist(true);
    playlistsApi
      .getById(playlistId)
      .then((data) => setPlaylistInfo(data))
      .catch(() => void 0)
      .finally(() => setLoadingPlaylist(false));
  }, [message.type, message.sharedPlaylist?.id, message.playlistData?.id, playlistInfo]);

  useEffect(() => {
    if (message.type !== "album") return;
    if (message.sharedAlbum) return;
    const albumId = message.albumData?.id;
    if (!albumId || albumInfo) return;
    setLoadingAlbum(true);
    albumsApi
      .getById(albumId)
      .then((data) => setAlbumInfo(data))
      .catch(() => void 0)
      .finally(() => setLoadingAlbum(false));
  }, [message.type, message.sharedAlbum, message.albumData?.id, albumInfo]);

  const playlistPreview = useMemo<SharedPlaylistMessageData | null>(() => {
    // Ưu tiên playlistInfo từ API (đã fetch) vì có songCount đúng
    if (playlistInfo) {
      const songs = Array.isArray(playlistInfo.songs)
        ? playlistInfo.songs.map((song: { id?: number; songId?: number; name?: string; title?: string; artists?: unknown; artistNames?: unknown; urlImageAlbum?: string; coverUrl?: string; cover?: string; duration?: unknown; length?: unknown; durationMs?: unknown }) => {
            const duration = song?.duration ?? song?.length ?? song?.durationMs ?? null;
            const durationValue = duration !== null && (typeof duration === 'string' || typeof duration === 'number') ? duration : null;
            const lengthValue = song?.length !== undefined && (typeof song.length === 'string' || typeof song.length === 'number') ? song.length : durationValue;
            const durationMsValue = typeof song?.durationMs === 'number' ? song.durationMs : null;
            return {
              id: song?.id ?? song?.songId,
              name: song?.name || song?.title || "",
              artists: extractArtistNames(song?.artists ?? song?.artistNames),
              coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? song?.cover ?? undefined,
              durationLabel: formatDurationLabel(duration),
              duration: durationValue,
              length: lengthValue,
              durationMs: durationMsValue,
            };
          })
        : [];
      
      // Calculate totalDuration from songs
      const totalDuration = songs.length > 0
        ? (() => {
            const totalSeconds = songs.reduce((acc, song) => {
              const duration = song.duration ?? song.length ?? song.durationMs;
              if (duration) {
                const seconds = toSeconds(duration);
                return acc + seconds;
              }
              return acc;
            }, 0);
            return totalSeconds > 0 ? formatTotal(totalSeconds) : null;
          })()
        : (playlistInfo as { totalDuration?: string | null }).totalDuration ?? null;
      
      // Get songCount from multiple sources - prioritize API fields
      const rawSongCount =
        (playlistInfo as { songCount?: number | null; totalSongs?: number | null }).songCount ??
        (playlistInfo as { songCount?: number | null; totalSongs?: number | null }).totalSongs ??
        null;
      const songCount =
        typeof rawSongCount === 'number' && Number.isFinite(rawSongCount) && rawSongCount >= 0
          ? rawSongCount
          : Array.isArray(playlistInfo.songs)
          ? playlistInfo.songs.length
          : Array.isArray(playlistInfo.songIds)
          ? playlistInfo.songIds.length
          : 0;
      
      return {
        id: playlistInfo.id,
        name: playlistInfo.name,
        description: playlistInfo.description ?? null,
        coverUrl: playlistInfo.coverUrl ?? null,
        visibility: playlistInfo.visibility ?? null,
        songLimit: playlistInfo.songLimit ?? null,
        songs,
        ownerName: playlistInfo.owner?.name ?? null,
        totalSongs: songCount,
        totalDuration,
      };
    }
    // Fallback về message.sharedPlaylist nếu chưa có playlistInfo từ API
    if (message.sharedPlaylist) {
      // Get songCount - nếu có từ API thì dùng, không thì fallback về songs.length
      const rawSongCount =
        (message.sharedPlaylist as { songCount?: number | null }).songCount ??
        message.sharedPlaylist.totalSongs ??
        null;
      const songCount =
        typeof rawSongCount === 'number' && Number.isFinite(rawSongCount) && rawSongCount >= 0
          ? rawSongCount
          : (Array.isArray(message.sharedPlaylist.songs) && message.sharedPlaylist.songs.length > 0
            ? message.sharedPlaylist.songs.length
            : 0);
      
      return {
        ...message.sharedPlaylist,
        songs: Array.isArray(message.sharedPlaylist.songs)
          ? message.sharedPlaylist.songs
          : [],
        totalSongs: songCount,
      };
    }
    if (message.playlistData) {
      // Get songCount from multiple sources - same logic as FavoriteSongs.tsx
      const rawSongCount = message.playlistData.songCount ?? null;
      const songCount =
        typeof rawSongCount === 'number' && Number.isFinite(rawSongCount) && rawSongCount >= 0
          ? rawSongCount
          : 0;
      
      return {
        id: message.playlistData.id,
        name: message.playlistData.name,
        description: null,
        coverUrl: message.playlistData.coverUrl ?? null,
        visibility: null,
        songLimit: null,
        songs: [],
        ownerName: message.playlistData.owner ?? null,
        totalSongs: songCount,
      };
    }
    return null;
  }, [playlistInfo, message.sharedPlaylist, message.playlistData]);

  const albumPreview = useMemo<SharedAlbumMessageData | null>(() => {
    if (message.sharedAlbum) {
      return message.sharedAlbum;
    }
    if (albumInfo) {
      const songCount =
        albumInfo.songCount ??
        albumInfo.totalSongs ??
        (Array.isArray(albumInfo.songs) ? albumInfo.songs.length : null);
      
      // Get artistName from multiple sources - prioritize artistName field, then normalize artist object
      const rawArtistName = 
        (albumInfo as { artistName?: string | null }).artistName ??
        (albumInfo as { artist?: unknown }).artist;
      const artistName = rawArtistName 
        ? normalizeArtistName(rawArtistName)
        : DEFAULT_ARTIST_NAME;
      
      return {
        id: albumInfo.id,
        name: albumInfo.name,
        coverUrl: albumInfo.coverUrl ?? null,
        artistName: artistName,
        releaseYear: albumInfo.releaseYear ?? null,
        releaseDateLabel: null,
        songCount: songCount ?? null,
        totalSongs: songCount ?? null,
        songs: Array.isArray(albumInfo.songs) ? albumInfo.songs : undefined,
        totalDuration: albumInfo.totalDuration ?? null,
      };
    }
    if (message.albumData) {
      // Get artistName from multiple sources - prioritize artistName field, then normalize artist
      const rawArtistName = 
        (message.albumData as { artistName?: string | null }).artistName ??
        message.albumData.artist;
      const artistName = rawArtistName 
        ? normalizeArtistName(rawArtistName)
        : DEFAULT_ARTIST_NAME;
      
      return {
        id: message.albumData.id,
        name: message.albumData.name,
        coverUrl: message.albumData.coverUrl ?? null,
        artistName: artistName,
        releaseYear: message.albumData.releaseYear ?? null,
        releaseDateLabel: null,
        songCount: (message.albumData as { songCount?: number | null }).songCount ?? null,
        totalSongs: (message.albumData as { songCount?: number | null }).songCount ?? null,
        totalDuration: (message.albumData as { totalDuration?: string | null }).totalDuration ?? null,
      };
    }
    return null;
  }, [message.sharedAlbum, albumInfo, message.albumData]);

  const songPreview = useMemo<SharedSongMessageData | null>(() => {
    if (message.sharedSong) {
      // Extract artists - BE trả về có thể là string hoặc array
      let artists: string[] = [];
      const rawArtists = (message.sharedSong as { artists?: unknown }).artists;
      if (Array.isArray(rawArtists)) {
        artists = rawArtists.map(a => typeof a === 'string' ? a : (a as { name?: string }).name || '').filter(Boolean);
      } else if (typeof rawArtists === 'string' && rawArtists.trim()) {
        // BE trả về artists là string (comma-separated)
        artists = rawArtists.split(',').map((a: string) => a.trim()).filter(Boolean);
      }
      
      return {
        ...message.sharedSong,
        artists: artists,
        artist: artists.length > 0 ? artists.join(', ') : undefined,
      };
    }
    if (message.songData) {
      const rawId = message.songData.id;
      const numericId = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : undefined;
      const parsedId = typeof numericId === "number" && Number.isFinite(numericId) ? numericId : undefined;
      return {
        id: parsedId,
        name: message.songData.title,
        artists: message.songData.artist ? [message.songData.artist] : [],
        artist: message.songData.artist,
        coverUrl: undefined,
        audioUrl: undefined,
        durationLabel: null,
      };
    }
    return null;
  }, [message.sharedSong, message.songData]);

  const linkFromContent = useMemo(() => {
    const raw = String(message.content || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : undefined;
  }, [message.content]);

  const playlistLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const id =
      message.sharedPlaylist?.id ??
      playlistPreview?.id ??
      message.playlistData?.id;
    const name =
      message.sharedPlaylist?.name ??
      playlistPreview?.name ??
      playlistInfo?.name ??
      message.playlistData?.name;
    return typeof id === "number" && Number.isFinite(id) 
      ? `/playlist/${createSlug(name || 'playlist', id)}` 
      : undefined;
  }, [linkFromContent, message.sharedPlaylist?.id, playlistPreview?.id, message.playlistData?.id, message.sharedPlaylist?.name, playlistPreview?.name, playlistInfo?.name, message.playlistData?.name]);

  const albumLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const id =
      message.sharedAlbum?.id ?? albumPreview?.id ?? message.albumData?.id;
    const name =
      message.sharedAlbum?.name ??
      albumPreview?.name ??
      albumInfo?.name ??
      message.albumData?.name;
    return typeof id === "number" && Number.isFinite(id) 
      ? `/album/${createSlug(name || 'album', id)}` 
      : undefined;
  }, [linkFromContent, message.sharedAlbum?.id, albumPreview?.id, message.albumData?.id, message.sharedAlbum?.name, albumPreview?.name, albumInfo?.name, message.albumData?.name]);

  const songLink = useMemo(() => {
    if (linkFromContent) return linkFromContent;
    const rawId =
      message.sharedSong?.id ??
      songPreview?.id ??
      (typeof message.songData?.id === "number"
        ? message.songData.id
        : typeof message.songData?.id === "string"
        ? Number(message.songData.id)
        : undefined);
    return typeof rawId === "number" && Number.isFinite(rawId) ? `/song/${rawId}` : undefined;
  }, [linkFromContent, message.sharedSong?.id, songPreview?.id, message.songData?.id]);

  const handlePlaySong = async () => {
    if (!songPreview) {
      console.warn("[MessageCard] No songPreview available");
      toast.error("Song not playable");
      return;
    }
    
    // Lấy songId ngay lập tức (không async)
    let songId: number | undefined;
    
    // Ưu tiên 1: từ songPreview.id
    if (songPreview.id) {
      if (typeof songPreview.id === "number") {
        songId = songPreview.id;
      } else if (typeof songPreview.id === "string") {
        const parsed = Number(songPreview.id);
        if (!isNaN(parsed) && isFinite(parsed)) {
          songId = parsed;
        }
      }
    }
    
    // Ưu tiên 2: từ message.songData.id
    if (!songId && message.songData?.id) {
      if (typeof message.songData.id === "number") {
        songId = message.songData.id;
      } else if (typeof message.songData.id === "string") {
        const parsed = Number(message.songData.id);
        if (!isNaN(parsed) && isFinite(parsed)) {
          songId = parsed;
        }
      }
    }
    
    // Ưu tiên 3: từ message.sharedSong?.id
    if (!songId && message.sharedSong?.id) {
      if (typeof message.sharedSong.id === "number") {
        songId = message.sharedSong.id;
      } else if (typeof message.sharedSong.id === "string") {
        const parsed = Number(message.sharedSong.id);
        if (!isNaN(parsed) && isFinite(parsed)) {
          songId = parsed;
        }
      }
    }
    
    if (!songId) {
      console.warn("[MessageCard] Could not determine songId", { songPreview, message: message.songData, sharedSong: message.sharedSong });
      toast.error("Song not playable: Missing song ID");
      return;
    }
    
    // Tạo playable song ngay từ songPreview để play nhanh, sau đó fetch detail trong background
    const quickPlayable: Song = {
      id: String(songId),
      name: songPreview.name || "Unknown Song",
      songName: songPreview.name || "Unknown Song",
      artist: Array.isArray(songPreview.artists) 
        ? songPreview.artists.join(", ") 
        : songPreview.artist || "Unknown Artist",
      album: "",
      duration: 0,
      cover: songPreview.coverUrl || "",
      audioUrl: songPreview.audioUrl || undefined,
    };
    
    // Play ngay với thông tin có sẵn
    setQueue([quickPlayable]);
    playSong(quickPlayable);
    
    // Fetch detail và update trong background
    try {
      const detail = await songsApi.getById(String(songId));
      
      if (!detail) {
        console.warn("[MessageCard] Song detail not found for ID:", songId);
        return;
      }
      
      // Lấy playback URL từ stream session API
      let playbackUrl: string | null = null;
      try {
        const streamSession = await songsApi.getPlaybackUrl(songId);
        playbackUrl = streamSession.playbackUrl;
      } catch (streamError) {
        playbackUrl = detail.audioUrl || detail.audio || detail.url || null;
      }
      
      // Nếu vẫn không có và có uuid, dùng proxy endpoint
      if (!playbackUrl && detail.uuid) {
        const proxyBaseUrl = `/api/songs/${songId}/stream-proxy`;
        playbackUrl = `${window.location.origin}${proxyBaseUrl}/${detail.uuid}_128kbps.m3u8`;
      }
      
      if (playbackUrl) {
        // Update với thông tin đầy đủ
        const mapped = mapToPlayerSong(detail);
        const fullPlayable: Song = {
          id: mapped.id,
          name: mapped.songName,
          songName: mapped.songName,
          artist: mapped.artist,
          album: mapped.album,
          duration: mapped.duration,
          cover: mapped.cover,
          audioUrl: playbackUrl,
        };
        
        // Update queue và current song nếu đang play
        setQueue([fullPlayable]);
        if (currentSong?.id === quickPlayable.id) {
          playSong(fullPlayable);
        }
      }
    } catch (error) {
      console.error("[MessageCard] Failed to fetch song detail:", error);
      // Không show error vì đã play được với thông tin cơ bản
    }
  };

  // System messages: hiển thị trung tâm, không avatar/bubble trái phải, KHÔNG reaction
  if (message.type === "system") {
    const text = decodeUnicodeEscapes(message.content);
    const timestamp = message.timestamp || (message.sentAt ? new Date(message.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    return (
      <div 
        className="flex justify-center items-center w-full my-3 -mx-2.5 sm:-mx-3 relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setEmojiPickerOpen(false);
        }}
      >
        <div className="relative flex flex-col items-center gap-1">
          {/* Timestamp above system message - chỉ hiển thị khi hover */}
          {timestamp && (
            <span className={`text-[10px] text-muted-foreground/70 transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}>
              {timestamp}
            </span>
          )}
          {/* System message content */}
          <div className="relative flex flex-col items-center">
            <span className="px-3 py-1.5 text-[12px] text-muted-foreground bg-muted/30 dark:bg-muted/20 rounded-full text-center inline-block">
              {text}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const contentNode: React.ReactNode = (() => {
    if (message.type === "song" && songPreview) {
      // Normalize artists to string[] for SharedSongCard
      const normalizedSong = songPreview ? {
        ...songPreview,
        artists: Array.isArray(songPreview.artists) 
          ? songPreview.artists.map(a => typeof a === 'string' ? a : (a as { name?: string }).name || '').filter(Boolean)
          : songPreview.artist ? [songPreview.artist] : [],
      } : undefined;
      
      return (
        <SharedSongCard
          song={normalizedSong}
          onPlay={handlePlaySong}
          _link={songLink}
          isSentByMe={isSentByMe}
        />
      );
    }
    if (message.type === "playlist") {
      return (
        <SharedPlaylistCard
          playlist={playlistPreview}
          _link={playlistLink}
          isSentByMe={isSentByMe}
          loading={loadingPlaylist}
          sharedBy={message.sender}
        />
      );
    }
    if (message.type === "album") {
      return (
        <SharedAlbumCard
          album={albumPreview}
          _link={albumLink}
          isSentByMe={isSentByMe}
        />
      );
    }

    return (
      <div
        className={`px-4 py-2 rounded-2xl break-words w-full min-w-0 whitespace-pre-wrap text-base leading-relaxed border ${
          isSentByMe 
            ? "bg-primary text-primary-foreground rounded-tr-sm border-primary/50" 
            : "bg-white text-foreground border-muted/40 dark:bg-muted/50 dark:text-muted-foreground rounded-tl-sm"
        }`}
      >
        {(() => {
          const txt = decodeUnicodeEscapes(message.content);
          const isUrl = /^https?:\/\//i.test(txt);
          return isUrl ? (
            <a href={txt} target="_blank" rel="noreferrer" className="text-base underline break-all">
              {txt}
            </a>
          ) : (
            <p className="text-base break-words whitespace-pre-wrap w-full leading-relaxed">
              {txt}
            </p>
          );
        })()}
      </div>
    );
  })();

  if (!contentNode) return null;

  return (
    <>
      {hasTimeGap && (
        <div className="flex justify-center my-3">
          <span className="px-3 py-1 text-[11px] text-muted-foreground/80 bg-muted/30 dark:bg-muted/20 rounded-full">
            {message.timestamp}
          </span>
        </div>
      )}
      <div
        className={`group flex items-start gap-2 ${isSentByMe ? "justify-end" : "justify-start"} mb-2`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {isSentByMe && actionButtonsSent}

        {!isSentByMe && (
          <Avatar className="w-8 h-8 flex-shrink-0 self-start">
            <AvatarImage src={senderAvatar || undefined} alt={message.sender} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {message.sender?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`max-w-[80%] sm:max-w-lg space-y-0.5 ${isSentByMe ? "mr-0" : "ml-0"} relative`}>
          <div className="relative w-full pb-5 min-h-0 overflow-visible">
            {contentNode}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`absolute bottom-0 ${
                  isSentByMe ? "right-0" : "left-0"
                } flex items-center gap-1 rounded-full bg-background/95 dark:bg-background/90 border border-border/40 px-2 py-0.5 shadow-sm z-20 flex-wrap max-w-[calc(100%-4px)]`}
              >
                {message.reactions.map((reaction) => {
                  const decodedEmoji = decodeUnicodeEscapes(reaction.emoji);
                  return (
                    <div
                      key={`${reaction.emoji}-${reaction.count}`}
                      className={`flex items-center gap-1 text-xs flex-shrink-0 ${
                        reaction.reactedByMe ? "text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      <span>{decodedEmoji}</span>
                      {reaction.count > 1 && <span>{reaction.count}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {showTimestamp && (
            <p
              className={`text-[10px] text-muted-foreground/50 transition-opacity duration-200 ${
                isHovered ? "opacity-100" : "opacity-0"
              } ${isSentByMe ? "text-right" : "text-left"}`}
            >
              {message.timestamp}
            </p>
          )}
        </div>

        {!isSentByMe && actionButtonsReceived}
      </div>
    </>
  );
};
