import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  from: string;
  message: string;
  avatar?: string;
  timestamp: Date;
}

const ChatBubble = () => {
  const [newMessages, setNewMessages] = useState<ChatMessage[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Simulate receiving messages
  useEffect(() => {
    const simulateMessage = () => {
      const sampleMessages = [
        { from: "Alex M.", message: "Check out this new song I found!" },
        { from: "Sarah K.", message: "Want to collaborate on a playlist?" },
        { from: "Mike R.", message: "Your quiz was amazing!" },
        { from: "Emma L.", message: "Thanks for the friend request!" }
      ];

      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const message: ChatMessage = {
        id: Date.now().toString(),
        from: randomMessage.from,
        message: randomMessage.message,
        timestamp: new Date()
      };

      setNewMessages(prev => [...prev, message]);
      setIsVisible(true);

      // Auto hide after 5 seconds
      setTimeout(() => {
        setNewMessages(prev => prev.filter(m => m.id !== message.id));
      }, 5000);
    };

    // Simulate random messages every 30-60 seconds
    const interval = setInterval(simulateMessage, Math.random() * 30000 + 30000);
    return () => clearInterval(interval);
  }, []);

  const dismissMessage = (messageId: string) => {
    setNewMessages(prev => prev.filter(m => m.id !== messageId));
  };

  if (newMessages.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 space-y-2">
      {newMessages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            "bg-background/95 backdrop-blur-lg border border-border/40 rounded-lg p-3 shadow-lg max-w-xs",
            "animate-slide-in-right transition-all duration-300 hover:shadow-xl"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.avatar} alt={message.from} />
              <AvatarFallback className="text-xs">{message.from.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-foreground">{message.from}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={() => dismissMessage(message.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground break-words">{message.message}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => dismissMessage(message.id)}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Reply
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatBubble;