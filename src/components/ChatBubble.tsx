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
      "bg-white text-slate-900 border-slate-200 ring-sky-50 shadow-[0_10px_35px_rgba(15,23,42,0.12)]",
    dark:
      "dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:ring-slate-800 dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]",
  },
  success: {
    light:
      "bg-white text-slate-900 border-emerald-100 ring-emerald-50 shadow-[0_10px_35px_rgba(16,185,129,0.14)]",
    dark:
      "dark:bg-slate-900 dark:text-white dark:border-emerald-500/30 dark:ring-emerald-500/15 dark:shadow-[0_10px_35px_rgba(16,185,129,0.35)]",
  },
  warning: {
    light:
      "bg-white text-slate-900 border-amber-100 ring-amber-50 shadow-[0_10px_35px_rgba(245,158,11,0.14)]",
    dark:
      "dark:bg-slate-900 dark:text-white dark:border-amber-400/30 dark:ring-amber-400/15 dark:shadow-[0_10px_35px_rgba(245,158,11,0.35)]",
  },
  error: {
    light:
      "bg-white text-slate-900 border-rose-100 ring-rose-50 shadow-[0_10px_35px_rgba(244,63,94,0.16)]",
    dark:
      "dark:bg-slate-900 dark:text-white dark:border-rose-400/30 dark:ring-rose-400/15 dark:shadow-[0_10px_35px_rgba(244,63,94,0.4)]",
  },
  default: {
    light:
      "bg-white text-slate-900 border-slate-200 ring-slate-100 shadow-[0_10px_35px_rgba(15,23,42,0.12)]",
    dark:
      "dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:ring-slate-800 dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]",
  },
};

const getVariantKey = (variant?: ChatBubblePayload["variant"]) => {
  if (!variant) return "default" as const;
  return variantStyles[variant] ? variant : "default";
};

const cleanMessageBody = (from: string, message?: string | null) => {
  const body = (message ?? "").trim();
  const prefix = `${from}:`;
  if (body.toLowerCase().startsWith(prefix.toLowerCase())) {
    return body.slice(prefix.length).trimStart();
  }
  return body;
};

const truncateMessageBody = (text: string, maxChars = 220) => {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}…`;
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
      {newMessages.slice(-1).map((message) => {
        const unreadCount = typeof message.meta?.unreadCount === "number" ? message.meta.unreadCount : null;
        return (
        <div
          key={message.id}
          className={cn(
            "pointer-events-auto rounded-3xl p-5 max-w-[400px] cursor-pointer",
            "border ring-1 backdrop-blur-2xl backdrop-saturate-150",
            "animate-slide-in-right transition-all duration-300",
            "hover:shadow-2xl hover:-translate-y-0.5",
            variantStyles[getVariantKey(message.variant)].light,
            variantStyles[getVariantKey(message.variant)].dark
          )}
          onClick={() => dismissMessage(message.id)}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-slate-200 dark:ring-slate-500 ring-offset-0">
              <AvatarImage src={message.avatar} alt={message.from} />
              <AvatarFallback className="text-xs bg-slate-200 text-slate-800 dark:bg-slate-400 dark:text-slate-900">
                {message.from.charAt(0)}
              </AvatarFallback>
            </Avatar>
              {unreadCount != null && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {message.from}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMessage(message.id);
                  }}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-50 break-words line-clamp-2">
                {truncateMessageBody(
                  cleanMessageBody(message.from, message.message)
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-3 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400 dark:border-slate-500 dark:text-white dark:hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                // Lấy friendId từ meta để chuyển đến đúng chat
                const friendId = message.meta?.friendId || message.meta?.friendNumericId;
                if (friendId) {
                  // Chuyển đến trang social với tab chat và chọn đúng người
                  navigate(`/social?tab=chat&friend=${encodeURIComponent(String(friendId))}`);
                } else {
                  // Nếu không có friendId, chỉ chuyển đến trang chat
                  navigate('/social?tab=chat');
                }
                dismissMessage(message.id);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-1 text-slate-700 dark:text-white" />
              Reply
            </Button>
            {message.id.startsWith('inv-') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-3 text-slate-900 hover:text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
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
        );
      })}
    </div>
  );
};

export default ChatBubble;
