import { useRef, useEffect, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, Send, Music, Edit } from "lucide-react";
import type { Friend, Message } from "@/types/social";
import { MessageCard } from "@/components/social/MessageCard";
import { cn } from "@/lib/utils";

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
  playSong: (song: any) => void;
  currentSong: any;
  loadingFriends: boolean;
  meId?: number;
  isFriendTyping?: boolean;
  onReact?: (message: Message, emoji: string) => void;
}

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
}: ChatAreaProps) => {
  const chatContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedFriend = friends.find((f) => f.id === selectedChat);

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
    const friendMessages = messages[friendId] || [];
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
      const messagesA = messages[a.id] || [];
      const messagesB = messages[b.id] || [];
      
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
      <div className="space-y-2">
        {sortedFriends.map((friend) => (
        <div
          key={friend.id}
          className={cn(
            "p-3 rounded-xl cursor-pointer border transition-all duration-200 flex flex-col gap-2 bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60",
            selectedChat === friend.id && "bg-primary/10 border-primary/40 shadow-sm hover:bg-primary/15"
          )}
          onClick={() => onFriendSelect(friend.id)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={friend.avatar} alt={friend.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card" />
              )}
              {unreadByFriend[friend.id] > 0 && (
                <div className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                  {unreadByFriend[friend.id] > 99 ? '99+' : unreadByFriend[friend.id]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-foreground">{friend.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {getLastMessagePreview(friend.id, friend.username)}
              </p>
            </div>
          </div>
        </div>
        ))}
      </div>
    );
  };

  const renderMessages = () => {
    if (!selectedChat) return null;
    const currentMessages = messages[selectedChat] || [];
    const sortedMessages = [...currentMessages].sort((a, b) => {
      const aKey = typeof a.sentAt === "number" && Number.isFinite(a.sentAt) ? a.sentAt : Number(a.id) || 0;
      const bKey = typeof b.sentAt === "number" && Number.isFinite(b.sentAt) ? b.sentAt : Number(b.id) || 0;
      const diff = aKey - bKey;
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

    return (
      <>
        {sortedMessages.map((message) => {
          const senderFriend = message.sender === "You" ? null : friends.find((f) => f.id === selectedChat);
          return (
            <MessageCard
              key={message.id}
              message={message}
              playSong={playSong}
              onReact={onReact}
              senderAvatar={senderFriend?.avatar || null}
            />
          );
        })}
        {isFriendTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            {(selectedFriend?.name || "Friend")} đang nhập...
          </div>
        )}
        <div ref={messagesEndRef} className="h-0 w-full shrink-0" aria-label="End of messages" />
      </>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 min-h-[420px] max-h-[calc(100vh-220px)] overflow-hidden text-foreground">
      {/* Friends List */}
      <Card 
        className="lg:col-span-1 border-border/80 bg-card/90 dark:bg-card/70 shadow-sm backdrop-blur-sm transition-colors"
      >
        <CardHeader className="border-b border-border/70 bg-card/95 dark:bg-card/70">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <MessageCircle className="w-5 h-5 text-primary" />
            Messages
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground/70 -translate-y-1/2" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-muted/50 dark:bg-muted/30 border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 overflow-y-auto scrollbar-custom">
          {loadingFriends ? (
            <p className="text-sm text-muted-foreground">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
          ) : (
            renderFriendsList()
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card 
        className="lg:col-span-2 flex flex-col relative overflow-hidden rounded-3xl border border-border/70 shadow-lg shadow-primary/5 bg-card/95 dark:bg-card/70 min-h-[480px] lg:h-[calc(100vh-240px)] lg:max-h-[calc(100vh-240px)] transition-colors"
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <CardHeader 
              className="p-4 border-b border-border/70 relative z-10 bg-card/95 dark:bg-card/70"
            >
              <div className="relative flex items-center gap-3">
                <Avatar className="w-9 h-9">
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
                <div>
                  <CardTitle className="text-[15px] font-semibold text-foreground tracking-wide">
                    {selectedFriend?.name}
                  </CardTitle>
                  <p className="text-[12px] text-muted-foreground">
                    {isFriendTyping
                      ? "Đang nhập..."
                      : selectedFriend?.isOnline
                      ? "Đang hoạt động"
                      : "Ngoại tuyến"}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Message content */}
            <CardContent
              ref={chatContentRef}
              className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-hide bg-gradient-to-b from-background/80 via-card/80 to-background/70 dark:from-background/40 dark:via-card/40 dark:to-background/50"
            >
              <div className="flex flex-col space-y-4 min-h-full">
                {renderMessages()}
              </div>
            </CardContent>

            {/* Input bar */}
            <div className="p-4 border-t border-border/70 sticky bottom-0 left-0 right-0 z-10 bg-card/90 dark:bg-card/70 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Edit className="absolute left-4 top-1/2 h-4 w-4 text-muted-foreground/70 -translate-y-1/2" />
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
                    className="w-full pl-11 h-12 rounded-full bg-muted/40 dark:bg-muted/30 border border-border/60 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
                  />
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={onSendMessage}
                  className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition"
                >
                  <Send className="w-4 h-4" />
                </Button>
                {currentSong && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:ml-2 rounded-full border border-border/70 text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/50"
                    onClick={onShareCurrentSong}
                  >
                    <Music className="w-4 h-4 mr-2" /> Share current song
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base font-semibold mb-1 text-foreground">Chọn một cuộc trò chuyện</h3>
              <p className="text-sm text-muted-foreground">Hãy chọn bạn bè để bắt đầu nhắn tin</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
