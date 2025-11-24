import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { playlistsApi, PlaylistDTO } from "@/services/api/playlistApi";
import { albumsApi } from "@/services/api/albumApi";
import { songsApi } from "@/services/api/songApi";
import { useMusic, Song } from "@/contexts/MusicContext";
import type { Message, SharedPlaylistMessageData, SharedAlbumMessageData, SharedSongMessageData } from "@/types/social";
import { SharedPlaylistCard, SharedAlbumCard, SharedSongCard } from "./SharedContentCards";
import { extractArtistNames, formatDurationLabel, normalizeArtistName, DEFAULT_ARTIST_NAME, decodeUnicodeEscapes } from "@/utils/socialUtils";
import { createSlug } from "@/utils/playlistUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { mapToPlayerSong } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api/config";
import { MoreVertical, Smile } from "lucide-react";

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
  const { setQueue } = useMusic();
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistDTO | null>(null);
  const [albumInfo, setAlbumInfo] = useState<{ id: number; name: string; coverUrl?: string | null; artist?: unknown; releaseYear?: number; songs?: unknown[] } | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const isSentByMe = message.sender === "You";
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
          aria-label="More options"
          onClick={() => {
            if (window.confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
              onDelete(message);
            }
          }}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
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
    if (message.sharedPlaylist) return;
    const playlistId = message.playlistData?.id;
    if (!playlistId || playlistInfo) return;
    setLoadingPlaylist(true);
    playlistsApi
      .getById(playlistId)
      .then((data) => setPlaylistInfo(data))
      .catch(() => void 0)
      .finally(() => setLoadingPlaylist(false));
  }, [message.type, message.sharedPlaylist, message.playlistData?.id, playlistInfo]);

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
    if (message.sharedPlaylist) {
      return {
        ...message.sharedPlaylist,
        songs: Array.isArray(message.sharedPlaylist.songs)
          ? message.sharedPlaylist.songs
          : [],
      };
    }
    if (playlistInfo) {
      const songs = Array.isArray(playlistInfo.songs)
        ? playlistInfo.songs.map((song: { id?: number; songId?: number; name?: string; title?: string; artists?: unknown; artistNames?: unknown; urlImageAlbum?: string; coverUrl?: string; cover?: string; duration?: unknown; length?: unknown; durationMs?: unknown }) => ({
            id: song?.id ?? song?.songId,
            name: song?.name || song?.title || "",
            artists: extractArtistNames(song?.artists ?? song?.artistNames),
            coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? song?.cover ?? undefined,
            durationLabel: formatDurationLabel(song?.duration ?? song?.length ?? song?.durationMs),
          }))
        : [];
      return {
        id: playlistInfo.id,
        name: playlistInfo.name,
        description: playlistInfo.description ?? null,
        coverUrl: playlistInfo.coverUrl ?? null,
        visibility: playlistInfo.visibility ?? null,
        songLimit: playlistInfo.songLimit ?? null,
        songs,
        ownerName: playlistInfo.owner?.name ?? null,
        totalSongs: Array.isArray(playlistInfo.songs)
          ? playlistInfo.songs.length
          : Array.isArray(playlistInfo.songIds)
          ? playlistInfo.songIds.length
          : null,
      };
    }
    if (message.playlistData) {
      return {
        id: message.playlistData.id,
        name: message.playlistData.name,
        description: null,
        coverUrl: message.playlistData.coverUrl ?? null,
        visibility: null,
        songLimit: null,
        songs: [],
        ownerName: message.playlistData.owner ?? null,
        totalSongs: message.playlistData.songCount ?? null,
      };
    }
    return null;
  }, [message.sharedPlaylist, playlistInfo, message.playlistData]);

  const albumPreview = useMemo<SharedAlbumMessageData | null>(() => {
    if (message.sharedAlbum) {
      return message.sharedAlbum;
    }
    if (albumInfo) {
      return {
        id: albumInfo.id,
        name: albumInfo.name,
        coverUrl: albumInfo.coverUrl ?? null,
        artistName: normalizeArtistName((albumInfo as { artist?: unknown }).artist),
        releaseYear: albumInfo.releaseYear ?? null,
        releaseDateLabel: null,
      };
    }
    if (message.albumData) {
      return {
        id: message.albumData.id,
        name: message.albumData.name,
        coverUrl: message.albumData.coverUrl ?? null,
        artistName: message.albumData.artist ?? null,
        releaseYear: message.albumData.releaseYear ?? null,
        releaseDateLabel: null,
      };
    }
    return null;
  }, [message.sharedAlbum, albumInfo, message.albumData]);

  const songPreview = useMemo<SharedSongMessageData | null>(() => {
    if (message.sharedSong) {
      return {
        ...message.sharedSong,
        artists: Array.isArray(message.sharedSong.artists)
          ? message.sharedSong.artists
          : [],
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
    
    try {
      // Thử nhiều cách để lấy songId
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
      
      console.log("[MessageCard] Attempting to play song with ID:", songId);
      
      // Lấy thông tin bài hát từ API
      const detail = await songsApi.getById(String(songId));
      
      if (!detail) {
        console.warn("[MessageCard] Song detail not found for ID:", songId);
        toast.error("Song not playable: Song not found");
        return;
      }
      
      console.log("[MessageCard] Song detail retrieved:", { id: detail.id, hasAudioUrl: !!detail.audioUrl });
      
      // Lấy playback URL từ stream session API (cho shared songs)
      let playbackUrl: string | null = null;
      try {
        const streamSession = await songsApi.getPlaybackUrl(songId);
        playbackUrl = streamSession.playbackUrl;
        console.log("[MessageCard] Playback URL retrieved:", playbackUrl);
      } catch (streamError) {
        console.warn("[MessageCard] Failed to get playback URL, trying fallback:", streamError);
        // Fallback: thử lấy từ song detail
        playbackUrl = detail.audioUrl || detail.audio || detail.url || null;
      }
      
      // Nếu vẫn không có và có uuid, dùng proxy endpoint (giống MusicPlayer)
      if (!playbackUrl && detail.uuid) {
        try {
          // Dùng proxy endpoint với uuid từ song detail
          const proxyBaseUrl = `/api/songs/${songId}/stream-proxy`;
          playbackUrl = `${window.location.origin}${proxyBaseUrl}/${detail.uuid}_128kbps.m3u8`;
          console.log("[MessageCard] Using proxy endpoint with UUID:", playbackUrl);
        } catch (streamError2) {
          console.warn("[MessageCard] Failed to build proxy URL:", streamError2);
        }
      }
      
      if (!playbackUrl) {
        console.warn("[MessageCard] No playback URL available for song:", { detail });
        toast.error("Song not playable: No audio URL");
        return;
      }
      
      // Sử dụng mapToPlayerSong để đảm bảo format đúng
      const mapped = mapToPlayerSong(detail);
      
      // Convert PlayerSong sang Song format cho MusicContext
      const playable: Song = {
        id: mapped.id,
        name: mapped.songName,
        songName: mapped.songName,
        artist: mapped.artist,
        album: mapped.album,
        duration: mapped.duration,
        cover: mapped.cover,
        audioUrl: playbackUrl,
      };
      
      console.log("[MessageCard] Playing song:", playable);
      setQueue([playable]);
      playSong(playable);
    } catch (error) {
      console.error("[MessageCard] Failed to play song:", error);
      toast.error("Failed to play song");
    }
  };

  const contentNode: React.ReactNode = (() => {
    if (message.type === "song" && songPreview) {
      return (
        <SharedSongCard
          song={songPreview}
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
        className={`px-3 py-1.5 rounded-2xl break-words w-full min-w-0 whitespace-pre-wrap text-sm leading-relaxed ${
          isSentByMe 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted/70 dark:bg-muted/50 rounded-tl-sm"
        }`}
      >
        {(() => {
          const txt = decodeUnicodeEscapes(message.content);
          const isUrl = /^https?:\/\//i.test(txt);
          return isUrl ? (
            <a href={txt} target="_blank" rel="noreferrer" className="text-sm underline break-all">
              {txt}
            </a>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap w-full leading-relaxed">
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
