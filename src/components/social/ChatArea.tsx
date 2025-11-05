import { useRef, useEffect, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, Send, Music, Edit } from "lucide-react";
import type { Friend, Message } from "@/types/social";
import { MessageCard } from "@/components/social/MessageCard";

interface ChatAreaProps {
  selectedChat: string | null;
  friends: Friend[];
  messages: Record<string, Message[]>;
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
}: ChatAreaProps) => {
  const chatContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const renderFriendsList = () => (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className={`p-3 rounded-lg cursor-pointer ${
            selectedChat === friend.id
              ? "bg-purple-500/20 border border-purple-400/40"
              : "bg-purple-500/5 border border-purple-300/10"
          }`}
          onClick={() => onFriendSelect(friend.id)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-purple-500 text-white text-sm">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-purple-500/20" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-purple-50/90">{friend.name}</p>
              <p className="text-xs text-purple-100/70">{friend.username}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

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
        {sortedMessages.map((message) => (
          <MessageCard key={message.id} message={message} playSong={playSong} />
        ))}
        <div ref={messagesEndRef} className="h-0 w-full shrink-0" aria-label="End of messages" />
      </>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 min-h-[420px] max-h-[calc(100vh-220px)] overflow-hidden">
      {/* Friends List */}
      <Card 
        className="lg:col-span-1 border-purple-300/20 shadow-none bg-transparent"
        style={{ boxShadow: 'none !important' }}
      >
        <CardHeader className="border-b border-purple-300/20 bg-transparent">
          <CardTitle className="flex items-center gap-2 text-purple-50/90">
            <MessageCircle className="w-5 h-5" />
            Messages
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-purple-200/70" style={{ transform: 'translateY(-50%)' }} />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-purple-500/10 border-purple-300/30 text-purple-50 placeholder:text-purple-200/50"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 overflow-y-auto">
          {loadingFriends ? (
            <p className="text-sm text-purple-100/70">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-purple-100/70">{meId ? 'No friends yet.' : 'Login to see your friends.'}</p>
          ) : (
            renderFriendsList()
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card 
        className="lg:col-span-2 flex flex-col relative overflow-hidden rounded-[24px] border border-purple-300/30 shadow-none bg-transparent min-h-[480px] lg:h-[calc(100vh-240px)] lg:max-h-[calc(100vh-240px)]"
        style={{ boxShadow: 'none !important' }}
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <CardHeader 
              className="p-2 border-b border-purple-300/20 relative z-10 bg-transparent"
              style={{ boxShadow: 'none !important', filter: 'none !important' }}
            >
              <div className="relative flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-purple-500 text-white text-sm font-semibold">
                    {friends
                      .find((f) => f.id === selectedChat)
                      ?.name.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-[15px] font-semibold text-white/90 tracking-wide">
                    {friends.find((f) => f.id === selectedChat)?.name}
                  </CardTitle>
                  <p className="text-[12px] text-white/60">
                    {friends.find((f) => f.id === selectedChat)?.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Message content */}
            <CardContent
              ref={chatContentRef}
              className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-hide bg-transparent"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                boxShadow: 'none !important',
                filter: 'none !important',
              }}
            >
              <div className="flex flex-col space-y-4 min-h-full">
                {renderMessages()}
              </div>
            </CardContent>

            {/* Input bar */}
            <div className="p-4 border-t border-purple-300/30 sticky bottom-0 left-0 right-0 z-10 bg-transparent">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Edit className="absolute left-4 top-1/2 h-4 w-4 text-purple-300/70" style={{ transform: 'translateY(-50%)' }} />
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
                    className="w-full pl-11 bg-white/15 border border-purple-300/30 text-white/95 placeholder:text-white/60 rounded-full"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSendMessage}
                  className="rounded-full bg-purple-500 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
                {currentSong && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 rounded-full border border-purple-400/30 text-white/90 bg-purple-500/5"
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
              <MessageCircle className="w-14 h-14 text-purple-300/60 mx-auto mb-4" />
              <h3 className="text-base font-semibold mb-1 text-white/90">Select a conversation</h3>
              <p className="text-sm text-white/70">Choose a friend to start messaging</p>
            </div>
          </div>
        )}
      </Card>
      <style>{`
        /* Remove gradient, backdrop-blur, shadow, and mix-blend effects */
        [class*="bg-gradient-to-br"][class*="from-[#1a0033]"],
        [class*="bg-gradient-to-br"][class*="via-[#1d0b40]"],
        [class*="bg-gradient-to-br"][class*="to-[#261b5a]"] {
          background: transparent !important;
          background-image: none !important;
        }
        
        [class*="backdrop-blur-2xl"],
        [class*="backdrop-saturate-150"] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        [class*="shadow-"][class*="inset"],
        [class*="shadow-[0_0_30px"] {
          box-shadow: none !important;
        }
        
        [class*="mix-blend-screen"] {
          mix-blend-mode: normal !important;
        }
        
        /* Remove gradient overlay divs */
        [class*="absolute"][class*="inset-0"][class*="bg-gradient-to-b"][class*="from-fuchsia"],
        [class*="absolute"][class*="inset-0"][class*="bg-gradient-to-b"][class*="to-purple-900"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};
