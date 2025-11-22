import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api/config";
import { useNavigate } from "react-router-dom";
import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";
import { type NotificationDTO as FBNotificationDTO } from "@/services/firebase/notifications";
import { subscribeChatBubble, type ChatBubblePayload } from "@/utils/chatBubbleBus";

type ChatBubbleMessage = ChatBubblePayload & { timestamp: Date; id: string };

const ChatBubble = () => {
  const [newMessages, setNewMessages] = useState<ChatBubbleMessage[]>([]);
  const navigate = useNavigate();

  const pushAndAutohide = (message: ChatBubbleMessage) => {
    setNewMessages(prev => [...prev, message]);
    setTimeout(() => {
      setNewMessages(prev => prev.filter(m => m.id !== message.id));
    }, 5000);
  };

  const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const meId = useMemo(() => {
    try {
      const raw = userIdRaw;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  }, [userIdRaw]);

  const toAbsoluteUrl = (u?: string | null): string | undefined => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/?$/, '');
    if (u.startsWith('/api/')) {
      if (base.endsWith('/api')) {
        return `${base.slice(0, -4)}${u}`;
      }
    }
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u}`;
  };

  useEffect(() => {
    const unsubscribe = subscribeChatBubble((payload) => {
      const base: ChatBubbleMessage = {
        id: payload.id ?? `bus-${Date.now()}`,
        from: payload.from,
        message: payload.message,
        avatar: payload.avatar,
        variant: payload.variant,
        meta: payload.meta,
        timestamp: new Date(),
      };
      pushAndAutohide(base);
    });
    return unsubscribe;
  }, []);

  // Only show REAL notifications from Firebase
  useFirebaseRealtime(meId, {
    onNotification: (n: FBNotificationDTO) => {
      try {
        const from = n.senderName || 'Someone';
        const avatar = toAbsoluteUrl(n.senderAvatar ?? null);
        const base: ChatBubbleMessage = { id: `${n.id || Date.now()}`, from, message: '', avatar, timestamp: new Date() };
        if (n?.type === 'MESSAGE') {
          base.id = `msg-${base.id}`;
          base.message = String(n.body || 'New message');
          pushAndAutohide(base);
        } else if (n?.type === 'INVITE') {
          const metadata = n.metadata as { playlistName?: string } | undefined;
          const pName = metadata?.playlistName || 'a playlist';
          base.id = `inv-${base.id}`;
          base.message = `invited you to collaborate on "${pName}"`;
          pushAndAutohide(base);
        } else if (n?.type === 'SHARE') {
          const title = (n.metadata?.playlistName as string) || (n.metadata?.songName as string) || (n.metadata?.albumName as string) || n.title || 'Shared content';
          base.id = `share-${base.id}`;
          base.message = `shared: ${title}`;
          pushAndAutohide(base);
        } else if (n?.type === 'FRIEND_REQUEST') {
          base.id = `fr-${base.id}`;
          base.message = 'sent you a friend request';
          pushAndAutohide(base);
        } else if (n?.type === 'FRIEND_REQUEST_ACCEPTED') {
          base.id = `fr-acc-${base.id}`;
          base.message = 'accepted your friend request';
          pushAndAutohide(base);
        }
      } catch { /* ignore */ }
    }
  });

  const dismissMessage = (messageId: string) => {
    setNewMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const isAuthed = (() => {
    try {
      return !!(localStorage.getItem('token') || localStorage.getItem('adminToken') || sessionStorage.getItem('token'));
    } catch { return false; }
  })();

  if (!isAuthed || newMessages.length === 0) return null;

  const resolveVariant = (msg: ChatBubbleMessage) => {
    switch (msg.variant) {
      case 'success':
        return "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 border-emerald-300/30 ring-emerald-400/20";
      case 'warning':
        return "from-amber-500/25 via-amber-500/15 to-amber-500/10 border-amber-300/40 ring-amber-400/20";
      case 'error':
        return "from-rose-500/25 via-rose-500/15 to-rose-500/10 border-rose-300/40 ring-rose-400/20";
      default:
        return "from-purple-500/15 via-fuchsia-500/10 to-indigo-500/10 border-purple-300/20 ring-purple-400/10";
    }
  };

  return (
    <div className="fixed bottom-32 right-3 z-40 space-y-2 pointer-events-none">
      {newMessages.slice(-1).map((message, index) => (
        <div
          key={message.id}
          className={cn(
            "pointer-events-auto rounded-2xl p-3 max-w-[280px]",
            "bg-gradient-to-br",
            resolveVariant(message),
            "backdrop-blur-xl backdrop-saturate-150",
            "border ring-1",
            "shadow-[0_8px_30px_rgba(88,28,135,0.25)]",
            "animate-slide-in-right transition-all duration-300 hover:shadow-2xl hover:ring-purple-400/20"
          )}
          style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-6 w-6 flex-shrink-0 ring-2 ring-purple-400/30 ring-offset-0">
              <AvatarImage src={message.avatar} alt={message.from} />
              <AvatarFallback className="text-[10px]">{message.from.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs text-purple-50/90 truncate">
                  {message.from}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-purple-200/70 hover:text-purple-50"
                  onClick={() => dismissMessage(message.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-purple-100/80 break-words line-clamp-2 overflow-hidden">
                {message.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-5 text-[11px] px-2 border-purple-400/30 text-purple-100 hover:bg-purple-400/10 hover:border-purple-300/40"
              onClick={() => dismissMessage(message.id)}
            >
              <MessageCircle className="w-3 h-3 mr-1 text-purple-200" />
              Reply
            </Button>
            {message.id.startsWith('inv-') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[11px] px-2 text-purple-100 hover:text-purple-50 hover:bg-purple-400/10"
                onClick={() => { navigate('/social?tab=friends'); dismissMessage(message.id); }}
              >
                View
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatBubble;

