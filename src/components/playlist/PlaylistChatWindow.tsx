import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEventHandler,
} from "react";
import { X, Music, SendHorizonal, Smile, Disc, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  watchChatMessagesForRoom,
  getPlaylistRoomId,
  type FirebaseMessage,
  watchTyping,
  watchReactions,
} from "@/services/firebase/chat";
import { playlistChatApi, chatApi } from "@/services/api/chatApi";
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
  currentAlbumId?: number; // For sharing current album
  currentPlaylistId?: number; // For sharing current playlist (other than this one)
};

export const PlaylistChatWindow: React.FC<PlaylistChatWindowProps> = ({
  playlistId,
  playlistName,
  coverUrl,
  ownerName,
  memberCount,
  meId,
  onClose,
  onNewMessage,
  onReact,
  currentAlbumId,
  currentPlaylistId,
}) => {
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { playSong, currentSong } = useMusic();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, { emoji: string; userId: number }>>>({});

  const roomId = useMemo(() => getPlaylistRoomId(playlistId), [playlistId]);

  // Subscribe messages
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

  // Auto scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
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

  const handleShareCurrentAlbum = useCallback(async () => {
    if (!currentAlbumId || sending) return;
    setSending(true);
    try {
      await playlistChatApi.shareAlbum(playlistId, meId, currentAlbumId);
    } catch (e) {
      console.error("[PlaylistChatWindow] Failed to share current album:", e);
    } finally {
      setSending(false);
    }
  }, [currentAlbumId, sending, playlistId, meId]);

  const handleShareCurrentPlaylist = useCallback(async () => {
    if (!currentPlaylistId || sending || currentPlaylistId === playlistId) return;
    setSending(true);
      try {
      await playlistChatApi.sharePlaylist(playlistId, meId, currentPlaylistId);
            } catch (e) {
      console.error("[PlaylistChatWindow] Failed to share current playlist:", e);
      } finally {
      setSending(false);
    }
  }, [currentPlaylistId, sending, playlistId, meId]);

  // Typing indicator
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
      const value = e.target.value.trim();
      if (value) {
      chatApi.typingStart(roomId, meId).catch(() => {});
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
    },
    [roomId, meId]
  );

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        chatApi.typingStop(roomId, meId).catch(() => {});
    };
  }, [roomId, meId]);

  useEffect(() => {
    const unsubscribe = watchTyping(roomId, meId, (data) => {
      if (!data) {
        setTypingUsers({});
        return;
      }
      setTypingUsers((prev) => ({ ...prev, [data.userId]: !!data.isTyping }));
    });
    return () => {
      unsubscribe();
      setTypingUsers({});
    };
  }, [roomId, meId]);

  useEffect(() => {
    const unsubscribe = watchReactions(roomId, (reactMap) => {
      setReactions(reactMap);
    });
    return () => {
      unsubscribe();
      setReactions({});
    };
  }, [roomId]);

  const renderMessage = (msg: FirebaseMessage, index: number) => {
    const isMe = Number(msg.senderId) === Number(meId);
    const rawType =
      (msg as { type?: string; sharedContentType?: string }).type ??
      (msg as { sharedContentType?: string }).sharedContentType ??
      "text";
    const type = typeof rawType === "string" ? rawType.toLowerCase() : "text";
    const content = msg.contentPlain ?? msg.content ?? "";
    const shared = (msg as any).sharedContent as
      | { type?: string; id?: number; playlist?: any; album?: any; song?: any; title?: string; coverUrl?: string | null }
      | null
      | undefined;

    // System messages: senderId = 0 hoặc type = "system" hoặc senderName = "system"
    const isSystemMessage = 
      type === "system" ||
      Number(msg.senderId) === 0 ||
      (msg as { senderName?: string }).senderName?.toLowerCase() === "system" ||
      content.trim().toLowerCase().startsWith("[system]") ||
      content.trim().toLowerCase().startsWith("system:");

    if (isSystemMessage) {
      return (
        <div key={msg.id ?? index} className="flex justify-center my-2">
          <span className="px-2.5 py-1 text-[11px] text-muted-foreground bg-muted/30 dark:bg-muted/20 rounded-full">
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
          <Avatar className="w-7 h-7 flex-shrink-0 self-start">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="max-w-[75%] space-y-0.5">
          <div className="text-[10px] font-medium text-muted-foreground/80 mb-0.5">
            {displayName} • {timestampLabel}
            </div>
          <div className={`px-3 py-1.5 rounded-xl break-words whitespace-pre-wrap text-xs leading-relaxed ${bubbleCls} relative group/message`}>
            {content}
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
            {msg.id && onReact && type !== "system" && (
              <button
                type="button"
                className="absolute -bottom-0.5 right-0.5 opacity-0 group-hover/message:opacity-100 transition-opacity w-5 h-5 rounded-full bg-background/90 border border-border/60 flex items-center justify-center hover:bg-background"
                onClick={async () => {
                  const messageIdNum = typeof msg.id === "string" ? Number(msg.id) : (typeof msg.id === "number" ? msg.id : 0);
                  if (messageIdNum > 0 && onReact) {
                    await onReact(messageIdNum, "👍");
                  }
                }}
                title="Thêm reaction"
              >
                <span className="text-[10px]">👍</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const someoneTyping = Object.entries(typingUsers).some(([uid, active]) => Number(uid) !== meId && active);

  return (
    <div className="fixed bottom-28 right-24 z-40 w-[380px] h-[500px] flex flex-col overflow-hidden bg-card border border-border rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              {coverUrl ? (
                <AvatarImage src={coverUrl || undefined} alt={playlistName} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {String(playlistName || "P").charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-foreground truncate">{playlistName}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {memberCount} thành viên
                        </div>
                    </div>
                    </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
                    </Button>
          </div>

        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1 bg-background scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6">Chưa có tin nhắn nào</div>
          ) : (
            messages.map((m, idx) => renderMessage(m, idx))
          )}
          <div ref={messagesEndRef} />
            </div>

        {someoneTyping && (
          <div className="px-3 py-1 text-[10px] text-primary">Đang nhập...</div>
        )}

        <div className="border-t border-border px-2 py-2 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {currentSong && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted/50 flex-shrink-0"
                onClick={handleShareCurrentSong}
                title="Chia sẻ bài hát đang phát"
              >
                <Music className="w-4 h-4" />
              </Button>
            )}
            {currentAlbumId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted/50 flex-shrink-0"
                onClick={handleShareCurrentAlbum}
                title="Chia sẻ album đang xem"
              >
                <Disc className="w-4 h-4" />
              </Button>
            )}
            {currentPlaylistId && currentPlaylistId !== playlistId && (
            <Button
              variant="ghost"
              size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted/50 flex-shrink-0"
                onClick={handleShareCurrentPlaylist}
                title="Chia sẻ playlist đang xem"
            >
                <ListMusic className="w-4 h-4" />
            </Button>
            )}
            <div className="flex-1 relative min-w-0">
          <Input
                placeholder="Nhắn..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
                className="w-full pl-3 pr-9 h-8 rounded-full bg-muted/50 dark:bg-muted/30 border-0 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
          />
              {input.trim() && (
          <Button
                  variant="default"
            size="icon"
            onClick={handleSend}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
                  <SendHorizonal className="w-3.5 h-3.5" />
          </Button>
              )}
        </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-muted/50 flex-shrink-0"
              onClick={() => setInput((prev) => `${prev}😊`)}
              aria-label="Chèn emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
    </div>
        </div>
    </div>
  );
};


