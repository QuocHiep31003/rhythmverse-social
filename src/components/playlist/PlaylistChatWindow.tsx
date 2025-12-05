import { useCallback, useEffect, useMemo, useState, KeyboardEventHandler, useRef } from "react";
import { X, Music, SendHorizonal, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { watchChatMessagesForRoom, getPlaylistRoomId, type FirebaseMessage, watchListeningSession, type ListeningSession, watchTyping, watchReactions } from "@/services/firebase/chat";
import { playlistChatApi, chatApi } from "@/services/api/chatApi";
import { songsApi } from "@/services/api/songApi";
import { mapToPlayerSong } from "@/lib/utils";
import { SharedPlaylistCard, SharedAlbumCard, SharedSongCard } from "@/components/social/SharedContentCards";
import { useMusic, type Song } from "@/contexts/MusicContext";

type PlaylistChatWindowProps = {
  playlistId: number;
  playlistName: string;
  coverUrl?: string | null;
  ownerName: string;
  memberCount: number;
  meId: number;
  onClose: () => void;
  onNewMessage?: (msg: FirebaseMessage) => void;
  onReact?: (messageId: number, emoji: string) => Promise<void>;
};

export const PlaylistChatWindow = ({
  playlistId,
  playlistName,
  coverUrl,
  ownerName,
  memberCount,
  meId,
  onClose,
  onNewMessage,
  onReact,
}: PlaylistChatWindowProps) => {
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { playSong, currentSong, isPlaying, updatePosition, position } = useMusic();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [listeningSession, setListeningSession] = useState<ListeningSession | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, { emoji: string; userId: number }>>>({});

  const roomId = useMemo(() => getPlaylistRoomId(playlistId), [playlistId]);

  useEffect(() => {
    let lastMessageKey: string | undefined;
    const unsubscribe = watchChatMessagesForRoom(roomId, (msgs) => {
      setMessages(msgs);
      if (!onNewMessage || !msgs.length) return;
      const last = msgs[msgs.length - 1];
      const key = last.id ?? String(last.sentAt ?? "");
      if (key && key !== lastMessageKey) {
        lastMessageKey = key;
        onNewMessage(last);
      }
    });
    return () => unsubscribe();
  }, [roomId, onNewMessage]);

  // Watch listening session state for this playlist room
  useEffect(() => {
    const unsubscribe = watchListeningSession(roomId, setListeningSession);
    return () => unsubscribe();
  }, [roomId]);

  // Scroll luôn xuống cuối khi mở cửa sổ hoặc khi có tin nhắn mới
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await playlistChatApi.sendText(playlistId, meId, text);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }, [input, sending, playlistId, meId]);

  const handleShareCurrentSong = useCallback(async () => {
    if (!currentSong || sending) return;
    const songIdNum = Number(currentSong.id);
    if (!Number.isFinite(songIdNum)) {
      console.warn("[PlaylistChatWindow] Cannot share current song - invalid id:", currentSong.id);
      return;
    }
    setSending(true);
    try {
      await playlistChatApi.shareSong(playlistId, meId, songIdNum);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to share current song:", e);
    } finally {
      setSending(false);
    }
  }, [currentSong, sending, playlistId, meId]);

  const handleSuggestCurrentSong = useCallback(async () => {
    if (!currentSong || sending) return;
    if (!listeningSession) return;
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (isHost) {
      // Host không suggest, host tự control
      return;
    }
    const songIdNum = Number(currentSong.id);
    if (!Number.isFinite(songIdNum)) {
      console.warn("[PlaylistChatWindow] Cannot suggest current song - invalid id:", currentSong.id);
      return;
    }
    setSending(true);
    try {
      await playlistChatApi.suggestSong(playlistId, meId, songIdNum);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to suggest current song:", e);
    } finally {
      setSending(false);
    }
  }, [currentSong, sending, playlistId, meId, listeningSession]);

  const handleStartListening = useCallback(async () => {
    if (!currentSong) {
      console.warn("[PlaylistChatWindow] Cannot start listening session - no currentSong");
      return;
    }
    const numericSongId = Number(currentSong.id);
    if (!Number.isFinite(numericSongId)) {
      console.warn("[PlaylistChatWindow] Invalid currentSong id for listening session:", currentSong.id);
      return;
    }
    try {
      const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
      await playlistChatApi.startListening(playlistId, meId, numericSongId, posMs, true);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to start listening session:", e);
    }
  }, [playlistId, meId, currentSong, position]);

  const handleJoinListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.joinListening(playlistId, meId);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to join listening session:", e);
    }
  }, [playlistId, meId, listeningSession]);

  const handleLeaveListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.leaveListening(playlistId, meId);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to leave listening session:", e);
    }
  }, [playlistId, meId, listeningSession]);

  const handleStopListening = useCallback(async () => {
    if (!listeningSession) return;
    try {
      await playlistChatApi.stopListening(playlistId, meId);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to stop listening session:", e);
    }
  }, [playlistId, meId, listeningSession]);

  // Nếu đang là host của session, tự broadcast state mới mỗi khi đổi bài / play-pause / position
  useEffect(() => {
    const syncAsHost = async () => {
      if (!listeningSession) return;
      const isHost = Number(meId) === Number(listeningSession.hostId);
      if (!isHost) return;

      if (!currentSong) return;

      const songId = Number(currentSong.id);
      if (!Number.isFinite(songId)) return;

      const currentSongIdInSession = typeof listeningSession.songId === "number"
        ? listeningSession.songId
        : Number(listeningSession.songId || 0);
      const changedSong = !Number.isFinite(currentSongIdInSession) || currentSongIdInSession !== songId;
      const changedPlaying = Boolean(listeningSession.isPlaying) !== Boolean(isPlaying);
      
      // Broadcast position mỗi 1 giây khi đang phát
      const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
      const positionChanged = Math.abs((listeningSession.positionMs ?? 0) - posMs) > 1000; // Chỉ update nếu khác > 1s

      if (!changedSong && !changedPlaying && !positionChanged) return;

      try {
        await playlistChatApi.startListening(playlistId, meId, songId, posMs, Boolean(isPlaying));
      } catch (e) {
        console.error("[PlaylistChatWindow] Failed to sync listening state as host:", e);
      }
    };

    void syncAsHost();
  }, [currentSong, isPlaying, listeningSession, meId, playlistId, position]);

  // Broadcast position realtime mỗi 1 giây khi host đang phát
  useEffect(() => {
    if (!listeningSession) return;
    const isHost = Number(meId) === Number(listeningSession.hostId);
    if (!isHost || !isPlaying || !currentSong) return;

    const interval = setInterval(async () => {
      try {
        const songId = Number(currentSong.id);
        if (!Number.isFinite(songId)) return;
        const posMs = typeof position === "number" && Number.isFinite(position) ? position : 0;
        await playlistChatApi.startListening(playlistId, meId, songId, posMs, true);
      } catch (e) {
        console.error("[PlaylistChatWindow] Failed to broadcast position:", e);
      }
    }, 1000); // Broadcast mỗi 1 giây

    return () => clearInterval(interval);
  }, [listeningSession, meId, isPlaying, currentSong, playlistId, position]);

  // Sync player with listening session for non-host participants (realtime)
  useEffect(() => {
    const sync = async () => {
      if (!listeningSession) return;
      if (!listeningSession.hostId || !listeningSession.songId) return;
      const isHost = Number(meId) === Number(listeningSession.hostId);
      if (isHost) return; // Host tự control, không sync

      // Chỉ sync cho user đã join (có trong participants)
      if (!listeningSession.participants || !listeningSession.participants[String(meId)]) {
        return;
      }

      const songId = listeningSession.songId;
      const positionMs = listeningSession.positionMs ?? 0;
      const targetPlaying = Boolean(listeningSession.isPlaying);

      // Load bài hát nếu khác bài hiện tại
      const needLoadSong = !currentSong || Number(currentSong.id) !== Number(songId);
      if (needLoadSong) {
        try {
          const apiSong = await songsApi.getById(String(songId));
          const mapped = mapToPlayerSong(apiSong as unknown as { [key: string]: unknown });
          const songToPlay: Song = {
            id: mapped.id,
            name: mapped.songName,
            songName: mapped.songName,
            artist: mapped.artist,
            album: mapped.album,
            duration: mapped.duration,
            cover: mapped.cover,
            audioUrl: mapped.audioUrl,
          };
          await playSong(songToPlay, true);
        } catch (e) {
          console.error("[PlaylistChatWindow] Failed to sync song for listening session:", e);
          return;
        }
      }

      // Sync position realtime (chỉ khi đã có bài hát)
      if (currentSong && Math.abs(position - positionMs) > 500) {
        try {
          await updatePosition(positionMs);
        } catch {
          // ignore
        }
      }

      // Sync play/pause state
      if (targetPlaying !== isPlaying) {
        try {
          if (targetPlaying && !isPlaying) {
            // Host đang play, participant phải play
            if (currentSong) {
              await playSong(currentSong, true);
            }
          } else if (!targetPlaying && isPlaying) {
            // Host đã pause, participant phải pause
            // Note: MusicContext không có pause trực tiếp, nhưng playSong với skipApiCall sẽ không tự động play
            // Tạm thời để MusicContext tự xử lý
          }
        } catch (e) {
          console.error("[PlaylistChatWindow] Failed to adjust playing state:", e);
        }
      }
    };

    void sync();
  }, [listeningSession, meId, currentSong, isPlaying, playSong, updatePosition, position]);

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Typing indicator handlers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Start typing indicator
    if (e.target.value.trim()) {
      chatApi.typingStart(roomId, meId).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        chatApi.typingStop(roomId, meId).catch(() => {});
      }, 3000);
    } else {
      chatApi.typingStop(roomId, meId).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [roomId, meId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        chatApi.typingStop(roomId, meId).catch(() => {});
      }
    };
  }, [roomId, meId]);

  const renderMessage = (msg: FirebaseMessage, index: number) => {
    const isMe = Number(msg.senderId) === Number(meId);
    const raw = (msg as unknown) as { type?: string; sharedContentType?: string; sharedContent?: unknown };
    const rawType = raw.type ?? raw.sharedContentType ?? "text";
    const type = typeof rawType === "string" ? rawType.toLowerCase() : "text";
    const content = msg.contentPlain ?? msg.content ?? "";
    const shared = (raw.sharedContent ?? null) as
      | {
          type?: string;
          id?: number;
          playlist?: unknown;
          album?: unknown;
          song?: unknown;
          title?: string;
          coverUrl?: string | null;
        }
      | null;

    if (type === "system") {
      return (
        <div key={msg.id ?? index} className="flex justify-center my-3">
          <span className="px-3 py-1.5 text-[12px] text-muted-foreground bg-muted/30 dark:bg-muted/20 rounded-full">
            {content}
          </span>
        </div>
      );
    }

    if (shared?.type === "PLAYLIST") {
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedPlaylistCard
            playlist={shared.playlist ?? shared}
            _link={shared.id ? `/playlist/${shared.id}` : undefined}
            isSentByMe={isMe}
          />
        </div>
      );
    }

    if (shared?.type === "ALBUM") {
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedAlbumCard
            album={shared.album ?? shared}
            _link={shared.id ? `/album/${shared.id}` : undefined}
            isSentByMe={isMe}
          />
        </div>
      );
    }

    if (shared?.type === "SONG") {
      const songData = (shared.song ?? shared) as {
        id?: number;
        title?: string;
        name?: string;
        coverUrl?: string | null;
        audioUrl?: string | null;
        artists?: string[] | Array<string | { name?: string }>;
      };
      const handlePlay = () => {
        const fakeSong: Song = {
          id: String(songData.id ?? ""),
          songName: songData.title ?? songData.name ?? "Unknown Song",
          name: songData.title ?? songData.name ?? "Unknown Song",
          artist: "",
          album: "",
          duration: 0,
          cover: songData.coverUrl ?? "",
          audioUrl: songData.audioUrl ?? undefined,
          url: undefined,
          audio: undefined,
          genre: undefined,
          plays: undefined,
          uuid: undefined,
        };
        playSong(fakeSong);
      };
      return (
        <div key={msg.id ?? index} className="my-1 flex">
          <SharedSongCard
            song={songData}
            _link={songData.id ? `/song/${songData.id}` : undefined}
            isSentByMe={isMe}
            onPlay={handlePlay}
          />
        </div>
      );
    }

    const bubbleCls = isMe
      ? "bg-primary text-primary-foreground rounded-tr-sm border border-primary/40"
      : "bg-muted/60 text-foreground rounded-tl-sm border border-muted/40";

    const displayName =
      isMe
        ? "You"
        : msg.senderName && msg.senderName.trim().length > 0
        ? msg.senderName
        : `User ${msg.senderId}`;

    const avatarUrl = msg.senderAvatar || undefined;
    const timestampMs =
      typeof msg.sentAt === "number" && Number.isFinite(msg.sentAt)
        ? msg.sentAt
        : Date.now();
    const timestampLabel = new Date(timestampMs).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return (
      <div
        key={msg.id ?? index}
        className={`group flex items-end gap-2 my-1 ${isMe ? "justify-end" : "justify-start"}`}
      >
        {!isMe && (
          <Avatar className="w-8 h-8 flex-shrink-0 self-start">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="max-w-[80%] sm:max-w-lg space-y-0.5">
          {/* Tên người gửi: chỉ hiện khi hover, giống logic timestamp trong MessageCard */}
          {!isMe && (
            <div className="text-[11px] font-medium text-muted-foreground/80 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {displayName}
            </div>
          )}
          <div className={`px-4 py-2 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed ${bubbleCls} relative group/message`}>
            {content}
            {/* Reactions */}
            {msg.id && reactions[String(msg.id)] && Object.keys(reactions[String(msg.id)]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(reactions[String(msg.id)]).map(([userIdStr, reaction]) => (
                  <span
                    key={userIdStr}
                    className="text-xs bg-background/80 px-1.5 py-0.5 rounded-full border border-border/60"
                    title={`${Number(userIdStr) === Number(meId) ? "Bạn" : `User ${userIdStr}`}: ${reaction.emoji}`}
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
            {/* Reaction button (hover) */}
            {msg.id && onReact && (
              <button
                type="button"
                className="absolute -bottom-1 right-1 opacity-0 group-hover/message:opacity-100 transition-opacity w-6 h-6 rounded-full bg-background/90 border border-border/60 flex items-center justify-center hover:bg-background"
                onClick={() => {
                  const messageIdNum = typeof msg.id === "string" ? Number(msg.id) : (typeof msg.id === "number" ? msg.id : 0);
                  if (messageIdNum > 0) {
                    onReact(messageIdNum, "👍");
                  }
                }}
                title="Thêm reaction"
              >
                <span className="text-xs">👍</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {timestampLabel}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-28 right-24 z-50 w-full max-w-md">
      <Card className="bg-background/95 border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[480px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 via-background to-background">
          <Avatar className="h-9 w-9">
            {coverUrl ? (
              <AvatarImage src={coverUrl || undefined} alt={playlistName} />
            ) : (
              <AvatarFallback>
                <Music className="w-4 h-4" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{playlistName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Collab room
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Owner: {ownerName} · {memberCount} collaborator{memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Nút tạo/dừng phòng nghe chung (chỉ host) */}
            {(!listeningSession || Number(listeningSession.hostId) === Number(meId)) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleStartListening}
                title={
                  currentSong
                    ? "Tạo/đồng bộ phòng nghe nhạc chung cho playlist này (bạn là host)"
                    : "Chọn bài hát rồi bấm để bắt đầu nghe chung"
                }
                disabled={!currentSong}
              >
                <Radio className="w-4 h-4" />
              </Button>
            )}
            {/* Nút đề xuất bài hát (chỉ participants) */}
            {listeningSession && Number(listeningSession.hostId) !== Number(meId) && currentSong && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSuggestCurrentSong}
                title="Đề xuất bài hát này vào queue"
                disabled={sending}
              >
                <Music className="w-4 h-4" />
              </Button>
            )}
            {listeningSession && listeningSession.hostId && Number(listeningSession.hostId) !== Number(meId) && (
              listeningSession.participants && listeningSession.participants[String(meId)] ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleLeaveListening}
                >
                  Rời phòng
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleJoinListening}
                >
                  Tham gia nghe chung
                </Button>
              )
            )}
            {listeningSession && listeningSession.hostId && Number(listeningSession.hostId) === Number(meId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleStopListening}
              >
                Tắt phòng
              </Button>
            )}
            {listeningSession && (
              <span className="ml-1 text-[10px] text-muted-foreground/80 hidden sm:inline">
                Đang nghe chung
                {listeningSession.participants
                  ? ` • ${Object.keys(listeningSession.participants).length} người`
                  : ""}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-gradient-to-b from-background via-background/95 to-background"
        >
          {messages.map((m, idx) => renderMessage(m, idx))}
          <div ref={messagesEndRef} className="h-0 w-full shrink-0" />
        </div>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && Object.values(typingUsers).some(Boolean) && (
          <div className="px-3 py-2 border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '0ms' }} />
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '200ms' }} />
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-primary font-medium">
                {Object.entries(typingUsers)
                  .filter(([_, isTyping]) => isTyping)
                  .map(([userId]) => {
                    const msg = messages.find(m => Number(m.senderId) === Number(userId));
                    return msg?.senderName || `User ${userId}`;
                  })
                  .join(", ")} đang nhập...
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-2 bg-background/95">
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn gì đó về playlist này…"
            className="text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};


