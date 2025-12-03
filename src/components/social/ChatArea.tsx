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
  isFriendTyping = false,
  onReact,
  onDelete,
}: ChatAreaProps) => {
  const chatContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedFriend = friends.find((f) => f.id === selectedChat);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [optimisticHiddenMessages, setOptimisticHiddenMessages] = useState<Record<string, Record<string, boolean>>>({});
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

  const {
    streak,
    isExpired,
    isExpiringSoon,
    hoursRemaining,
    isLoading: streakLoading,
    refreshFromServer,
    forceRefresh,
  } = useStreakManager(selectedFriendUserKey ?? null, {
    friendName: selectedFriend?.name,
  });
  const handleForceRefresh = useCallback(() => {
    void forceRefresh();
  }, [forceRefresh]);
  const friendUserIdList = useMemo(() => Array.from(new Set(Object.values(friendUserIdMap))), [friendUserIdMap]);
  const streaksByFriend = useStreaksByFriends(friendUserIdList);

  useEffect(() => {
    if (!selectedFriendUserKey) return;
    void refreshFromServer();
  }, [refreshFromServer, selectedFriendUserKey]);

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
    return visibleMessagesByFriend[friendId] ?? messages[friendId] ?? [];
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

  const getLastMessagePreview = (friendId: string, fallbackHandle: string) => {
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
  };

  const renderFriendsList = () => {
    // Sắp xếp bạn bè theo tin nhắn mới nhất
    const sortedFriends = [...friends].sort((a, b) => {
      const messagesA = getVisibleMessagesForFriend(a.id);
      const messagesB = getVisibleMessagesForFriend(b.id);
      
      // Lấy tin nhắn mới nhất của mỗi bạn
      const lastMsgA = messagesA.length > 0 
        ? messagesA[messagesA.length - 1] 
        : null;
      const lastMsgB = messagesB.length > 0 
        ? messagesB[messagesB.length - 1] 
        : null;
      
      if (!lastMsgA && !lastMsgB) return 0; // Không có tin nhắn thì giữ nguyên thứ tự
      if (!lastMsgA) return 1; // A không có tin nhắn thì xuống cuối
      if (!lastMsgB) return -1; // B không có tin nhắn thì xuống cuối
      
      // So sánh thời gian gửi tin nhắn
      const timeA = typeof lastMsgA.sentAt === 'number' ? lastMsgA.sentAt : Number(lastMsgA.id) || 0;
      const timeB = typeof lastMsgB.sentAt === 'number' ? lastMsgB.sentAt : Number(lastMsgB.id) || 0;
      
      return timeB - timeA; // Mới nhất lên đầu
    });
    
    return (
      <div className="space-y-0.5">
        {sortedFriends.map((friend) => {
          const friendUserKey = friendUserIdMap[friend.id];
          const friendStreak = friendUserKey ? streaksByFriend[friendUserKey] : undefined;
          const friendMessages = getVisibleMessagesForFriend(friend.id) || [];
          const lastMessage = friendMessages.length > 0 ? friendMessages[friendMessages.length - 1] : null;
          const lastMessageTime = lastMessage?.timestamp || '';
          
          return (
        <div
          key={friend.id}
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
                    {friend.name.split(' ').map(n => n[0]).join('')}
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
                    {friendStreak && friendStreak.streak > 0 && (
                      <StreakBadge streak={friendStreak.streak} size="sm" />
                    )}
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
        })}
      </div>
    );
  };

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
          const senderFriend = message.sender === "You" ? null : friends.find((f) => f.id === selectedChat);
          const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
          return (
            <MessageCard
              key={message.id}
              message={message}
              playSong={playSong}
              onReact={onReact}
            onDelete={onDelete ? handleDeleteRequest : undefined}
              senderAvatar={senderFriend?.avatar || null}
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
      <div className="hidden lg:flex flex-col border-r border-border/50 bg-background dark:bg-background">
        {/* Header with title and icons */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-background">
          <h2 className="text-xl font-semibold text-foreground">Đoạn chat</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-border/50">
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
        <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1 bg-background">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-sm font-medium rounded-lg bg-primary/10 text-primary">
            Tất cả
          </Button>
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-custom p-2">
          {loadingFriends ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
          ) : (
            renderFriendsList()
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
                  </Avatar>
                  {selectedFriend?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-foreground truncate">
                      {selectedFriend?.name}
                    </h3>
                    {streak > 0 && <StreakBadge streak={streak} size="sm" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {selectedFriend?.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
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
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
                    className="w-full pl-4 pr-12 h-10 rounded-full bg-muted/50 dark:bg-muted/30 border-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  {newMessage.trim() && (
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

