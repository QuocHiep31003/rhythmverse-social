import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { playlistCollabInvitesApi } from "@/services/api/playlistApi";
import { useNavigate } from "react-router-dom";
import useFirebaseRealtime from "@/hooks/useFirebaseRealtime";
import { type NotificationDTO as FBNotificationDTO } from "@/services/firebase/notifications";

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
  const navigate = useNavigate();

  const pushAndAutohide = (message: ChatMessage) => {
    setNewMessages(prev => [...prev, message]);
    setIsVisible(true);
    setTimeout(() => {
      setNewMessages(prev => prev.filter(m => m.id !== message.id));
    }, 5000);
  };

  // Simulate receiving messages (only when authenticated in DEV)
  useEffect(() => {
    const isAuthed = (() => {
      try {
        return !!(localStorage.getItem('token') || localStorage.getItem('adminToken') || sessionStorage.getItem('token'));
      } catch { return false; }
    })();
    if (!import.meta.env.DEV || !isAuthed) return; // Only simulate in development when authed
    const simulateMessage = () => {
      const sampleMessages = [
        { from: "Alex M.", message: "Check out this new song I found!" },
        { from: "Sarah K.", message: "Want to collaborate on a playlist?" },
        { from: "Mike R.", message: "Your quiz was amazing!" },
        { from: "Emma L.", message: "Thanks for the friend request!" }
      ];

      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const message: ChatMessage = {
        id: `sim-${Date.now()}`,
        from: randomMessage.from,
        message: randomMessage.message,
        timestamp: new Date()
      };

      pushAndAutohide(message);
    };

    // Simulate random messages every 30-60 seconds
    const interval = setInterval(simulateMessage, Math.random() * 30000 + 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time-ish: poll pending collaboration invites and show as chat notifications
  useEffect(() => {
    let isCancelled = false;
    const STORAGE_KEY = 'seenCollabInviteIds';

    const readSeen = (): Set<number> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set<number>(Array.isArray(arr) ? arr : []);
      } catch { return new Set<number>(); }
    };

    let seen = readSeen();

    const saveSeen = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen))); } catch {}
    };

    const checkInvites = async () => {
      // Only poll when authenticated
      const hasToken = (() => { try { return !!localStorage.getItem('token'); } catch { return false; } })();
      if (!hasToken) return;
      try {
        const list = await playlistCollabInvitesApi.pending();
        const invites: any[] = Array.isArray(list) ? list : [];
        const fresh = invites.filter(inv => typeof inv?.id === 'number' && !seen.has(inv.id));
        if (fresh.length && !isCancelled) {
          fresh.forEach(inv => {
            const from = inv.senderName || 'New Invite';
            const pName = inv.playlist?.name || (inv.playlistId ? `Playlist #${inv.playlistId}` : 'a playlist');
            const message: ChatMessage = {
              id: `inv-${inv.id}`,
              from,
              message: `mời bạn cộng tác trên "${pName}"`,
              timestamp: new Date(),
            };
            pushAndAutohide(message);
          });
          fresh.forEach(inv => seen.add(inv.id));
          saveSeen();
        }
      } catch {
        // ignore
      }
    };

    // initial check and interval
    void checkInvites();
    const interval = setInterval(checkInvites, 30000);
    // React to token changes
    const onStorage = (e: StorageEvent) => { if (e.key === 'token') void checkInvites(); };
    window.addEventListener('storage', onStorage);
    return () => { isCancelled = true; clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, []);

  // Realtime notifications: show bubble for MESSAGE/INVITE across the app
  const meId = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  }, [typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined]);

  useFirebaseRealtime(meId, {
    onNotification: (n: FBNotificationDTO) => {
      try {
        if (n?.type === 'MESSAGE') {
          const title = n.senderName || 'New message';
          const body = n.body || '';
          const msg: ChatMessage = { id: `msg-${n.id || Date.now()}` , from: String(title), message: String(body), timestamp: new Date() };
          pushAndAutohide(msg);
        } else if (n?.type === 'INVITE') {
          const from = n.senderName || 'New Invite';
          const pName = (n.metadata as any)?.playlistName || 'a playlist';
          const msg: ChatMessage = { id: `inv-${n.id || Date.now()}`, from: String(from), message: `mời bạn cộng tác trên "${pName}"`, timestamp: new Date() };
          pushAndAutohide(msg);
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

  return (
    <div className="fixed bottom-32 right-3 z-40 space-y-2 pointer-events-none">
      {newMessages.slice(-1).map((message, index) => (
        <div
          key={message.id}
          className={cn(
            // Liquid glass, soft purple theme
            "pointer-events-auto rounded-2xl p-3 max-w-[280px]",
            "bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-indigo-500/10",
            "backdrop-blur-xl backdrop-saturate-150",
            "border border-purple-300/20 ring-1 ring-purple-400/10",
            "shadow-[0_8px_30px_rgba(88,28,135,0.25)]",
            "animate-slide-in-right transition-all duration-300 hover:shadow-2xl hover:ring-purple-400/20"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
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
              <p className="text-xs text-purple-100/80 break-words">
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
