import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, Send, Music, Edit, Info, Smile, RefreshCw } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import type { Friend, Message } from "@/types/social";
import type { Song } from "@/contexts/MusicContext";
import { MessageCard } from "@/components/social/MessageCard";
import { cn } from "@/lib/utils";
import { StreakBadge } from "@/components/streak/StreakBadge";
import { useStreakManager } from "@/hooks/useStreakManager";
import { createStreakSystemMessage } from "@/components/streak/StreakSystemMessage";
import { useStreaksByFriends } from "@/hooks/useStreaksByFriends";
const getMessageUniqueKey = (message: Message): string => {
  if (typeof message.backendId === "number" && Number.isFinite(message.backendId)) {
    return `backend:${message.backendId}`;
  }
  return `id:${message.id}`;
};

interface ChatAreaProps {
  selectedChat: string | null;
  friends: Friend[];
  messages: Record<string, Message[]>;
  unreadByFriend?: Record<string, number>;
  unreadByPlaylist?: Record<string, number>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onFriendSelect: (friendId: string) => void;
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onShareCurrentSong: () => void;
  playSong: (song: Song) => void;
  currentSong: Song | null;
  loadingFriends: boolean;
  meId?: number;
  isFriendTyping?: boolean;
  onReact?: (message: Message, emoji: string) => void;
  onDelete?: (message: Message) => Promise<boolean | void> | boolean | void;
  playlistRooms?: Array<{
    id: number;
    name: string;
    coverUrl?: string | null;
    ownerName?: string | null;
    memberCount?: number; // Total members (owner + collaborators)
  }>;
  onOpenPlaylistChat?: (playlistId: number) => void;
}

const formatStreakTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const tsDayStart = startOfDay(date);

  let dayLabel = "";
  if (tsDayStart === todayStart) {
    dayLabel = "Hôm nay";
  } else if (tsDayStart === yesterdayStart) {
    dayLabel = "Hôm qua";
  } else {
    dayLabel = date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const timeLabel = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayLabel} ${timeLabel}`;
};

export const ChatArea = ({
  selectedChat,
  friends,
  messages,
  searchQuery,
  onSearchChange,
  onFriendSelect,
  newMessage,
  onMessageChange,
  onSendMessage,
  onShareCurrentSong,
  playSong,
  currentSong,
  loadingFriends,
  meId,
  unreadByFriend = {},
  unreadByPlaylist = {},
  isFriendTyping = false,
  onReact,
  onDelete,
  playlistRooms,
  onOpenPlaylistChat,
}: ChatAreaProps) => {
  const chatContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedFriend = friends.find((f) => f.id === selectedChat);
  // Tìm playlist room khi selectedChat là pl_{playlistId}
  // playlistRooms đã được map với id là playlistId hoặc id từ object gốc
  const selectedPlaylistRoom = useMemo(() => {
    if (!selectedChat?.startsWith("pl_")) return null;
    if (!playlistRooms || playlistRooms.length === 0) return null;
    
    const targetPlaylistId = selectedChat.replace("pl_", "");
    
    // playlistRooms đã được map với id là playlistId hoặc id từ object gốc
    const found = playlistRooms.find((r) => {
      // r.id đã là playlistId hoặc id từ object gốc (đã được map trong Social.tsx)
      const playlistId = String(r.id ?? "");
      return playlistId === targetPlaylistId;
    });
    
    return found || null;
  }, [selectedChat, playlistRooms]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [optimisticHiddenMessages, setOptimisticHiddenMessages] = useState<Record<string, Record<string, boolean>>>({});
  const [streakSystemMessages, setStreakSystemMessages] = useState<Record<string, Message[]>>({});
  const friendUserIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    friends.forEach((friend) => {
      if (!friend?.id) return;
      const resolved = friend.friendUserId ?? friend.id;
      map[friend.id] = String(resolved);
    });
    return map;
  }, [friends]);
  const selectedFriendUserKey = useMemo(() => {
    if (selectedFriend?.id) {
      return friendUserIdMap[selectedFriend.id] ?? selectedChat;
    }
    return selectedChat;
  }, [friendUserIdMap, selectedChat, selectedFriend]);

  const pushStreakSystemMessage = useCallback((friendKey: string, message: Message) => {
    setStreakSystemMessages((prev) => {
      const existing = prev[friendKey] || [];
      // Kiểm tra xem message đã tồn tại chưa (tránh duplicate)
      const messageId = message.id;
      const alreadyExists = existing.some((m) => m.id === messageId);
      if (alreadyExists) {
        return prev; // Không thêm nếu đã tồn tại
      }
      return {
        ...prev,
        [friendKey]: [...existing, message],
      };
    });
  }, []);

  const handleStreakWarning = useCallback(
    (friendName: string, hoursRemaining: number) => {
      if (!selectedChat || selectedChat.startsWith("pl_")) return;
      const friendKey = selectedFriendUserKey ?? selectedChat;
      if (!friendKey) return;
      const msg = createStreakSystemMessage({ type: "warning", friendName, hoursRemaining });
      pushStreakSystemMessage(friendKey, msg);
    },
    [pushStreakSystemMessage, selectedChat, selectedFriendUserKey],
  );

  const handleStreakExpired = useCallback(
    (friendName: string) => {
      if (!selectedChat || selectedChat.startsWith("pl_")) return;
      const friendKey = selectedFriendUserKey ?? selectedChat;
      if (!friendKey) return;
      const msg = createStreakSystemMessage({ type: "expired", friendName });
      pushStreakSystemMessage(friendKey, msg);
    },
    [pushStreakSystemMessage, selectedChat, selectedFriendUserKey],
  );

  const handleStreakStarted = useCallback(
    (friendName: string, currentStreak: number) => {
      if (!selectedChat || selectedChat.startsWith("pl_")) return;
      const friendKey = selectedFriendUserKey ?? selectedChat;
      if (!friendKey) return;
      const msg = createStreakSystemMessage({ type: "started", friendName, currentStreak });
      pushStreakSystemMessage(friendKey, msg);
    },
    [pushStreakSystemMessage, selectedChat, selectedFriendUserKey],
  );

  const streakManagerOptions = useMemo(
    () => ({
      friendName: selectedFriend?.name,
      onStreakWarning: handleStreakWarning,
      onStreakExpired: handleStreakExpired,
      onStreakStarted: handleStreakStarted,
    }),
    [selectedFriend?.name, handleStreakWarning, handleStreakExpired, handleStreakStarted],
  );

  const {
    streak,
    isExpired,
    isExpiringSoon,
    hoursRemaining,
    isLoading: streakLoading,
    refreshFromServer,
    forceRefresh,
  } = useStreakManager(selectedFriendUserKey ?? null, streakManagerOptions);
  const handleForceRefresh = useCallback(() => {
    void forceRefresh();
  }, [forceRefresh]);
  const friendUserIdList = useMemo(() => Array.from(new Set(Object.values(friendUserIdMap))), [friendUserIdMap]);
  const streaksByFriend = useStreaksByFriends(friendUserIdList);

  useEffect(() => {
    if (!selectedFriendUserKey) return;
    // Only refresh if it's a friend chat (not playlist room)
    if (selectedChat?.startsWith("pl_")) return;
    void refreshFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriendUserKey]);

  // Xóa streak system messages khi chuyển chat hoặc khi chat không còn active
  useEffect(() => {
    if (!selectedChat) {
      // Nếu không có chat nào được chọn, xóa tất cả streak messages
      setStreakSystemMessages({});
      return;
    }
    // Xóa streak messages của các chat khác (chỉ giữ lại chat hiện tại)
    setStreakSystemMessages((prev) => {
      const friendKey = selectedChat.startsWith("pl_") ? null : (selectedFriendUserKey ?? selectedChat);
      if (!friendKey) {
        // Nếu là playlist room, xóa tất cả streak messages
        return {};
      }
      // Chỉ giữ lại streak messages của chat hiện tại
      const filtered: Record<string, Message[]> = {};
      if (prev[friendKey]) {
        filtered[friendKey] = prev[friendKey];
      }
      return filtered;
    });
  }, [selectedChat, selectedFriendUserKey]);

  // Xóa streak messages của các friend không còn trong danh sách friends (đã unfriend)
  useEffect(() => {
    setStreakSystemMessages((prev) => {
      const friendIds = new Set(friends.map((f) => {
        const resolved = f.friendUserId ?? f.id;
        return String(resolved);
      }));
      
      // Xóa streak messages của các friend không còn trong danh sách
      const filtered: Record<string, Message[]> = {};
      Object.entries(prev).forEach(([friendKey, msgs]) => {
        if (friendIds.has(friendKey)) {
          filtered[friendKey] = msgs;
        }
      });
      
      // Nếu có thay đổi (đã xóa một số messages), trả về object mới
      if (Object.keys(filtered).length !== Object.keys(prev).length) {
        return filtered;
      }
      return prev;
    });
  }, [friends]);

  const visibleMessagesByFriend = useMemo(() => {
    const result: Record<string, Message[]> = {};
    Object.entries(messages).forEach(([friendId, friendMessages]) => {
      const hiddenMap = optimisticHiddenMessages[friendId];
      if (!hiddenMap) {
        result[friendId] = friendMessages;
        return;
      }
      result[friendId] = friendMessages.filter((msg) => !hiddenMap[getMessageUniqueKey(msg)]);
    });
    return result;
  }, [messages, optimisticHiddenMessages]);

  useEffect(() => {
    setOptimisticHiddenMessages((prev) => {
      let changed = false;
      const next: Record<string, Record<string, boolean>> = {};
      Object.entries(prev).forEach(([friendId, hiddenMap]) => {
        const friendMessages = messages[friendId] || [];
        const messageKeySet = new Set(friendMessages.map(getMessageUniqueKey));
        const retained: Record<string, boolean> = {};
        Object.keys(hiddenMap).forEach((key) => {
          if (messageKeySet.has(key)) {
            retained[key] = true;
          } else {
            changed = true;
          }
        });
        if (Object.keys(retained).length > 0) {
          next[friendId] = retained;
        }
      });
      return changed ? next : prev;
    });
  }, [messages]);

  const updateOptimisticHidden = (friendId: string, messageKey: string, hidden: boolean) => {
    setOptimisticHiddenMessages((prev) => {
      if (hidden) {
        const friendHidden = prev[friendId];
        if (friendHidden?.[messageKey]) return prev;
        return {
          ...prev,
          [friendId]: {
            ...(friendHidden || {}),
            [messageKey]: true,
          },
        };
      }
      const friendHidden = prev[friendId];
      if (!friendHidden?.[messageKey]) return prev;
      const updatedFriend = { ...friendHidden };
      delete updatedFriend[messageKey];
      if (Object.keys(updatedFriend).length === 0) {
        const { [friendId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [friendId]: updatedFriend,
      };
    });
  };

  const getVisibleMessagesForFriend = (friendId?: string | null): Message[] => {
    if (!friendId) return [];
    const base = visibleMessagesByFriend[friendId] ?? messages[friendId] ?? [];
    const streakMsgs = streakSystemMessages[friendId] ?? [];
    if (streakMsgs.length === 0) return base;
    const combined = [...base, ...streakMsgs];
    const sortKey = (m: Message) => {
      if (typeof m.sentAt === "number" && Number.isFinite(m.sentAt)) return m.sentAt;
      const parsed = Date.parse(m.timestamp);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return combined.sort((a, b) => sortKey(a) - sortKey(b));
  };

  const handleDeleteRequest = (message: Message) => {
    if (!selectedChat || !onDelete) return;
    const friendId = selectedChat;
    const messageKey = getMessageUniqueKey(message);
    updateOptimisticHidden(friendId, messageKey, true);
    const runDeletion = async () => {
      try {
        const result = await onDelete(message);
        const success = result !== false;
        if (!success) {
          updateOptimisticHidden(friendId, messageKey, false);
        }
      } catch (error) {
        updateOptimisticHidden(friendId, messageKey, false);
      }
    };
    void runDeletion();
  };
  
  // Debug typing status
  useEffect(() => {
    if (selectedChat) {
      console.log('[ChatArea] Typing status:', { 
        selectedChat, 
        isFriendTyping,
        friendName: selectedFriend?.name 
      });
    }
  }, [selectedChat, isFriendTyping, selectedFriend]);

  // Scroll to bottom function - force scroll
  const scrollToBottom = () => {
    const container = chatContentRef.current;
    if (!container) return;
    
    // Force scroll to bottom
    container.scrollTop = container.scrollHeight;
    
    // Also scroll end element into view
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  // Scroll immediately when chat changes
  useLayoutEffect(() => {
    if (selectedChat) {
      scrollToBottom();
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedChat]);

  // Scroll when messages change
  useEffect(() => {
    if (selectedChat && messages[selectedChat]?.length) {
      scrollToBottom();
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 200);
    }
  }, [selectedChat, messages]);

  const getLastMessagePreview = useCallback((friendId: string, fallbackHandle: string) => {
    const friendMessages = getVisibleMessagesForFriend(friendId);
    if (!friendMessages.length) {
      return fallbackHandle || "Bắt đầu trò chuyện";
    }
    const lastMessage = friendMessages[friendMessages.length - 1];

    if (lastMessage.type === "song") {
      const title = lastMessage.songData?.title || "một bài hát";
      return `🎵 Đã chia sẻ ${title}`;
    }
    if (lastMessage.type === "playlist") {
      const name = lastMessage.playlistData?.name || lastMessage.sharedPlaylist?.name || "playlist";
      return `🎧 Đã chia sẻ ${name}`;
    }
    if (lastMessage.type === "album") {
      const name = lastMessage.albumData?.name || lastMessage.sharedAlbum?.name || "album";
      return `💿 Đã chia sẻ ${name}`;
    }

    const plain =
      (lastMessage as Message & { contentPlain?: string }).contentPlain ??
      lastMessage.content ??
      "";
    const trimmed = plain.trim();
    const prefix =
      lastMessage.sender?.toLowerCase() === "you" || lastMessage.sender?.toLowerCase() === "bạn"
        ? "Bạn: "
        : "";
    return trimmed ? `${prefix}${trimmed}` : `${prefix}Đã gửi tin nhắn`;
  }, [getVisibleMessagesForFriend]);

  const renderChatList = useCallback(() => {
    type ChatListItem =
      | {
          kind: "friend";
          friend: Friend;
          lastActivity: number;
        }
      | {
          kind: "playlist";
          room: { id: number; name: string; coverUrl?: string | null; ownerName?: string | null; memberCount?: number };
          lastActivity: number;
        };

    const items: ChatListItem[] = [];

    // Bạn bè
    friends.forEach((friend) => {
      const messagesForFriend = getVisibleMessagesForFriend(friend.id);
      let lastActivity = 0;
      if (messagesForFriend.length > 0) {
        const lastMsg = messagesForFriend[messagesForFriend.length - 1];
        lastActivity =
          typeof lastMsg.sentAt === "number" && Number.isFinite(lastMsg.sentAt)
            ? lastMsg.sentAt
            : Number(lastMsg.id) || 0;
      }
      items.push({ kind: "friend", friend, lastActivity });
    });

    // Playlist rooms (đã được map trong Social.tsx với id, name, coverUrl, ownerName)
    // Chỉ hiển thị group chat khi có >=2 thành viên
    if (playlistRooms && playlistRooms.length > 0) {
      playlistRooms.forEach((room) => {
        if (!room.id) {
          return;
        }
        // Chỉ hiển thị group chat khi có >=2 thành viên
        const memberCount = room.memberCount ?? 1;
        if (memberCount < 2) {
          return; // Không hiển thị group chat khi chỉ có 1 người
        }
        const roomKey = `pl_${room.id}`;
        const roomMessages = messages[roomKey] || [];
        let lastActivity = 0;
        if (roomMessages.length > 0) {
          const lastMsg = roomMessages[roomMessages.length - 1];
          lastActivity =
            typeof lastMsg.sentAt === "number" && Number.isFinite(lastMsg.sentAt)
              ? lastMsg.sentAt
              : Number(lastMsg.id) || 0;
        }
        items.push({
          kind: "playlist",
          room: { 
            id: room.id, 
            name: room.name, 
            coverUrl: room.coverUrl ?? null, 
            ownerName: room.ownerName ?? null,
            memberCount: room.memberCount,
          },
          lastActivity,
        });
      });
    }

    // Sort theo lastActivity (mới nhất lên đầu)
    items.sort((a, b) => b.lastActivity - a.lastActivity);

    return (
      <div className="space-y-0.5">
        {items.map((item) => {
          if (item.kind === "friend") {
            const friend = item.friend;
            const friendUserKey = friendUserIdMap[friend.id];
            const friendStreak = friendUserKey ? streaksByFriend[friendUserKey] : undefined;
            const friendMessages = getVisibleMessagesForFriend(friend.id) || [];
            const lastMessage = friendMessages.length > 0 ? friendMessages[friendMessages.length - 1] : null;
            const lastMessageTime = lastMessage?.timestamp || "";

            return (
              <div
                key={`friend-${friend.id}`}
                className={cn(
                  "px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 flex items-center gap-3 hover:bg-muted/50 focus-visible:outline-none",
                  selectedChat === friend.id && "bg-primary/10 hover:bg-primary/15 border-l-2 border-primary"
                )}
                onClick={() => onFriendSelect(friend.id)}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {friend.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {friend.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">{friend.name}</p>
                      {friendStreak && friendStreak.streak > 0 && <StreakBadge streak={friendStreak.streak} size="sm" />}
                    </div>
                    {lastMessageTime && (
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">{lastMessageTime}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {getLastMessagePreview(friend.id, friend.username)}
                    </p>
                    {unreadByFriend[friend.id] > 0 && (
                      <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                        {unreadByFriend[friend.id] > 99 ? "99+" : unreadByFriend[friend.id]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Playlist room item
          const room = item.room;
          const roomKey = `pl_${room.id}`;
          const isSelected = selectedChat === roomKey;
          const roomMessages = messages[roomKey] || [];
          const lastMessage = roomMessages.length > 0 ? roomMessages[roomMessages.length - 1] : null;
          const lastMessageTime = lastMessage?.timestamp || "";
          
          return (
            <div
              key={`playlist-${room.id}`}
              className={cn(
                "px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 flex items-center gap-3 hover:bg-muted/50 focus-visible:outline-none",
                isSelected && "bg-primary/10 hover:bg-primary/15 border-l-2 border-primary"
              )}
              onClick={() => {
                if (onOpenPlaylistChat) {
                  onOpenPlaylistChat(room.id);
                }
              }}
            >
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10">
                  {room.coverUrl ? (
                    <AvatarImage src={room.coverUrl || undefined} alt={room.name} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {String(room.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate text-foreground">{room.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lastMessageTime && (
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">{lastMessageTime}</span>
                    )}
                    {unreadByPlaylist[String(room.id)] > 0 && (
                      <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                        {unreadByPlaylist[String(room.id)] > 99 ? "99+" : unreadByPlaylist[String(room.id)]}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {lastMessage
                    ? getLastMessagePreview(roomKey, room.name)
                    : room.ownerName
                    ? `Collab playlist • ${room.ownerName}`
                    : "Collab playlist"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [friends, playlistRooms, selectedChat, unreadByFriend, unreadByPlaylist, friendUserIdMap, streaksByFriend, getVisibleMessagesForFriend, getLastMessagePreview, onFriendSelect, onOpenPlaylistChat, messages]);

  const renderMessages = () => {
    if (!selectedChat) return null;
    const currentMessages = getVisibleMessagesForFriend(selectedChat);
    const sortedMessages = [...currentMessages].sort((a, b) => {
      const aKey = typeof a.sentAt === "number" && Number.isFinite(a.sentAt) ? a.sentAt : Number(a.id) || 0;
      const bKey = typeof b.sentAt === "number" && Number.isFinite(b.sentAt) ? b.sentAt : Number(b.id) || 0;
      const diff = aKey - bKey;
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

    return (
      <>
        {sortedMessages.map((message, index) => {
          // Xử lý playlist room chat: lấy senderAvatar từ message
          let senderAvatar: string | null = null;
          if (selectedChat.startsWith("pl_")) {
            // Playlist room: lấy avatar từ message (senderAvatar từ Firebase)
            senderAvatar = (message as any).senderAvatar || null;
          } else {
            // 1-1 chat: lấy avatar từ friend
            const senderFriend = message.sender === "You" ? null : friends.find((f) => f.id === selectedChat);
            senderAvatar = senderFriend?.avatar || null;
          }
          const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
          return (
            <MessageCard
              key={message.id}
              message={message}
              playSong={playSong}
              onReact={onReact}
            onDelete={onDelete ? handleDeleteRequest : undefined}
              senderAvatar={senderAvatar}
              meId={meId}
              previousMessage={previousMessage}
            />
          );
        })}
        <div ref={messagesEndRef} className="h-0 w-full shrink-0" aria-label="End of messages" />
      </>
    );
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-0 h-[calc(100vh-200px)] overflow-hidden text-foreground bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col border-r border-border/50 bg-background dark:bg-background min-h-0">
        {/* Header with title and icons */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-background flex-shrink-0">
          <h2 className="text-xl font-semibold text-foreground">Đoạn chat</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground/70 -translate-y-1/2" />
            <Input
              placeholder="Tìm kiếm cuộc trò chuyện"
              className="pl-10 h-9 bg-muted/40 dark:bg-muted/20 border-0 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1 bg-background flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-sm font-medium rounded-lg bg-primary/10 text-primary">
            Tất cả
          </Button>
        </div>
        
        {/* Chat list (friends + playlist groups chung một list) */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-2">
          {loadingFriends ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">Loading friends...</p>
          ) : friends.length === 0 && (!playlistRooms || playlistRooms.length === 0) ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
          ) : (
            renderChatList()
          )}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex flex-col relative overflow-hidden bg-background">
        {selectedChat ? (
          <>
            {/* Header - Messenger style */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-background">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10">
                    {selectedPlaylistRoom ? (
                      <>
                        <AvatarImage 
                          src={selectedPlaylistRoom.coverUrl || undefined}
                          alt={selectedPlaylistRoom.name || 'Playlist'}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {String(selectedPlaylistRoom.name || 'P').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage 
                          src={selectedFriend?.avatar}
                          alt={selectedFriend?.name || 'Friend'}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {selectedFriend?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {selectedFriend?.isOnline && !selectedPlaylistRoom && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-foreground truncate">
                      {selectedPlaylistRoom 
                        ? selectedPlaylistRoom.name 
                        : selectedFriend?.name}
                    </h3>
                    {!selectedPlaylistRoom && streak > 0 && <StreakBadge streak={streak} size="sm" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {selectedPlaylistRoom 
                        ? (selectedPlaylistRoom.ownerName ? `Collab playlist • ${selectedPlaylistRoom.ownerName}` : "Collab playlist")
                        : (selectedFriend?.isOnline ? "Đang hoạt động" : "Ngoại tuyến")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Info className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Message content */}
            <div
              ref={chatContentRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-background/40 dark:bg-background/20 relative"
            >
              <div className="flex flex-col min-h-full px-2.5 sm:px-3 py-3 pb-4 gap-2">
                {renderMessages()}
                {selectedChat && getVisibleMessagesForFriend(selectedChat).length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {selectedPlaylistRoom 
                          ? `Chưa có tin nhắn nào trong ${selectedPlaylistRoom.name}. Hãy bắt đầu trò chuyện!`
                          : "Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Typing indicator - above input */}
            {isFriendTyping && (
              <div className="px-4 py-2 border-t border-border/50 bg-background/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '0ms' }} />
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '200ms' }} />
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: '400ms' }} />
                  </div>
                  <span className="text-primary font-medium animate-pulse">
                    {selectedFriend?.name || "Friend"} đang nhập...
                  </span>
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-border/50 bg-background relative">
              <div className="flex items-center gap-2">
                {/* Left icons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {currentSong && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-muted/50"
                      onClick={onShareCurrentSong}
                    >
                      <Music className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                
                {/* Input field */}
                <div className="flex-1 relative">
                  <Input
                    placeholder={
                      selectedPlaylistRoom && selectedPlaylistRoom.memberCount !== undefined && selectedPlaylistRoom.memberCount < 2
                        ? "Group chat đã bị khóa (cần ít nhất 2 thành viên)"
                        : selectedPlaylistRoom 
                        ? `Nhắn gì đó về ${selectedPlaylistRoom.name}…` 
                        : "Nhập tin nhắn..."
                    }
                    value={newMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !(selectedPlaylistRoom && selectedPlaylistRoom.memberCount !== undefined && selectedPlaylistRoom.memberCount < 2)) {
                        onSendMessage();
                      }
                    }}
                    disabled={selectedPlaylistRoom && selectedPlaylistRoom.memberCount !== undefined && selectedPlaylistRoom.memberCount < 2}
                    className="w-full pl-4 pr-12 h-10 rounded-full bg-muted/50 dark:bg-muted/30 border-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {newMessage.trim() && !(selectedPlaylistRoom && selectedPlaylistRoom.memberCount !== undefined && selectedPlaylistRoom.memberCount < 2) && (
                    <Button
                      variant="default"
                      size="icon"
                      onClick={onSendMessage}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {/* Right quick reactions */}
                <div className="flex items-center gap-1 flex-shrink-0 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted/50"
                    onClick={() => setEmojiPickerOpen((prev) => !prev)}
                    aria-label="Chèn emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  {emojiPickerOpen && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: unknown) => {
                          const native =
                            typeof emoji === "object" && emoji !== null && "native" in emoji
                              ? (emoji as { native?: string }).native
                              : undefined;
                          if (native) {
                            onMessageChange(`${newMessage}${native}`);
                          }
                          setEmojiPickerOpen(false);
                        }}
                        theme="auto"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Chọn một cuộc trò chuyện</h3>
              <p className="text-sm text-muted-foreground">Hãy chọn bạn bè để bắt đầu nhắn tin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

