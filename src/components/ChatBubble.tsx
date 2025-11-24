import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api/config";
import { useNavigate } from "react-router-dom";
import { subscribeChatBubble, type ChatBubblePayload } from "@/utils/chatBubbleBus";

type ChatBubbleMessage = ChatBubblePayload & { timestamp: Date; id: string };

const variantStyles: Record<
  NonNullable<ChatBubblePayload["variant"]> | "default",
  { light: string; dark: string }
> = {
  info: {
    light:
      "bg-white/95 text-slate-900 border-slate-200 ring-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.12)]",
    dark:
      "dark:bg-gradient-to-br dark:from-purple-500/15 dark:via-fuchsia-500/10 dark:to-indigo-500/10 dark:text-purple-50/90 dark:border-purple-300/20 dark:ring-purple-400/10 dark:shadow-[0_8px_30px_rgba(88,28,135,0.25)]",
  },
  success: {
    light:
      "bg-emerald-50 text-emerald-900 border-emerald-200 ring-emerald-100 shadow-[0_8px_30px_rgba(16,185,129,0.15)]",
    dark:
      "dark:bg-gradient-to-br dark:from-emerald-500/20 dark:via-emerald-500/15 dark:to-emerald-500/5 dark:text-emerald-50 dark:border-emerald-300/30 dark:ring-emerald-400/20 dark:shadow-[0_8px_30px_rgba(16,185,129,0.25)]",
  },
  warning: {
    light:
      "bg-amber-50 text-amber-900 border-amber-200 ring-amber-100 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
    dark:
      "dark:bg-gradient-to-br dark:from-amber-500/25 dark:via-amber-500/15 dark:to-amber-500/10 dark:text-amber-50 dark:border-amber-300/40 dark:ring-amber-400/20 dark:shadow-[0_8px_30px_rgba(245,158,11,0.25)]",
  },
  error: {
    light:
      "bg-rose-50 text-rose-900 border-rose-200 ring-rose-100 shadow-[0_8px_30px_rgba(244,63,94,0.15)]",
    dark:
      "dark:bg-gradient-to-br dark:from-rose-500/25 dark:via-rose-500/15 dark:to-rose-500/10 dark:text-rose-50 dark:border-rose-300/40 dark:ring-rose-400/20 dark:shadow-[0_8px_30px_rgba(244,63,94,0.25)]",
  },
  default: {
    light:
      "bg-white/95 text-slate-900 border-slate-200 ring-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.12)]",
    dark:
      "dark:bg-gradient-to-br dark:from-purple-500/15 dark:via-fuchsia-500/10 dark:to-indigo-500/10 dark:text-purple-50/90 dark:border-purple-300/20 dark:ring-purple-400/10 dark:shadow-[0_8px_30px_rgba(88,28,135,0.25)]",
  },
};

const getVariantKey = (variant?: ChatBubblePayload["variant"]) => {
  if (!variant) return "default" as const;
  return variantStyles[variant] ? variant : "default";
};

const ChatBubble = () => {
  const [newMessages, setNewMessages] = useState<ChatBubbleMessage[]>([]);
  const navigate = useNavigate();

  const pushAndAutohide = (message: ChatBubbleMessage) => {
    setNewMessages(prev => {
      const deduped = prev.filter(m => !(m.variant === message.variant && m.message === message.message && m.from === message.from));
      return [...deduped, message];
    });
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
    <div className="fixed bottom-32 right-3 z-40 space-y-3 pointer-events-none">
      {newMessages.slice(-1).map((message) => (
        <div
          key={message.id}
          className={cn(
            "pointer-events-auto rounded-3xl p-4 max-w-[340px] cursor-pointer",
            "border ring-1 backdrop-blur-2xl backdrop-saturate-150",
            "animate-slide-in-right transition-all duration-300",
            "hover:shadow-2xl hover:-translate-y-0.5",
            variantStyles[getVariantKey(message.variant)].light,
            variantStyles[getVariantKey(message.variant)].dark
          )}
          onClick={() => dismissMessage(message.id)}
        >
          <div className="flex items-start gap-4">
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-slate-200 dark:ring-purple-400/30 ring-offset-0">
              <AvatarImage src={message.avatar} alt={message.from} />
              <AvatarFallback className="text-xs bg-slate-200 text-slate-700 dark:bg-purple-500/40 dark:text-white">
                {message.from.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-slate-900 dark:text-purple-50/90 truncate">
                  {message.from}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-500 hover:text-slate-700 dark:text-purple-200/70 dark:hover:text-purple-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMessage(message.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-700 dark:text-purple-100/80 break-words line-clamp-2 overflow-hidden">
                {message.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-3 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-purple-400/30 dark:text-purple-100 dark:hover:bg-purple-400/10 dark:hover:border-purple-300/40"
              onClick={(e) => {
                e.stopPropagation();
                dismissMessage(message.id);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-1 text-slate-500 dark:text-purple-200" />
              Reply
            </Button>
            {message.id.startsWith('inv-') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-3 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-purple-100 dark:hover:text-purple-50 dark:hover:bg-purple-400/10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/social?tab=friends');
                  dismissMessage(message.id);
                }}
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
