import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { watchNotifications, type NotificationDTO } from "@/services/firebase/notifications";
import { BellRing, CheckCircle2, Share2, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MAX_DROPDOWN_ITEMS = 5;

const typeMeta: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
  }
> = {
  INVITE: {
    label: "Lời mời cộng tác",
    icon: Users,
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-100",
  },
  SHARE: {
    label: "Chia sẻ",
    icon: Share2,
    badge: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-100",
  },
  FRIEND_REQUEST: {
    label: "Lời mời kết bạn",
    icon: UserPlus,
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-100",
  },
  FRIEND_REQUEST_ACCEPTED: {
    label: "Bạn bè",
    icon: CheckCircle2,
    badge: "border-lime-500/30 bg-lime-500/12 text-lime-700 dark:text-lime-100",
  },
  DEFAULT: {
    label: "Thông báo",
    icon: BellRing,
    badge: "border-muted/40 bg-muted/20 text-muted-foreground",
  },
};

const parseTimestamp = (value?: string | number): number | null => {
  if (value == null) return null;
  if (typeof value === "number") {
    if (value < 1e12) return value * 1000;
    return value;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    if (numeric < 1e12) return numeric * 1000;
    return numeric;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

const formatRelativeTime = (value?: string | number) => {
  const timestamp = parseTimestamp(value);
  if (!timestamp) return "Vừa xong";
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} phút trước`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} giờ trước`;
  }
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} ngày trước`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getNotificationDescription = (notification: NotificationDTO): string => {
  const meta = notification.metadata as {
    playlistName?: string;
    songName?: string;
    albumName?: string;
    playlistId?: number;
    songId?: number;
    albumId?: number;
  } | undefined;

  switch (notification.type) {
    case "FRIEND_REQUEST":
      return "đã gửi lời mời kết bạn";
    case "FRIEND_REQUEST_ACCEPTED":
      return "đã chấp nhận lời mời kết bạn";
    case "INVITE": {
      const playlistName = meta?.playlistName || "một playlist";
      return `mời bạn cộng tác trên “${playlistName}”`;
    }
    case "SHARE": {
      const title =
        meta?.playlistName ||
        meta?.songName ||
        meta?.albumName ||
        notification.title ||
        "một nội dung";
      return `đã chia sẻ: “${title}”`;
    }
    default: {
      const fallback = String(notification.body || notification.title || "").trim();
      return fallback || "đã gửi một thông báo";
    }
  }
};

interface Props { onClose?: () => void }

const NotificationsDropdown = ({ onClose }: Props) => {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const navigate = useNavigate();

  const meId = useMemo(() => {
    try {
      const raw = localStorage.getItem("userId");
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!meId) return;
    const unsub = watchNotifications(meId, (list) => {
      const safe = (Array.isArray(list) ? list : []).filter((n) => n.type !== "MESSAGE");
      setItems(safe);
    });
    return () => {
      try { unsub(); } catch { /* noop */ }
    };
  }, [meId]);

  const visible = items.slice(0, MAX_DROPDOWN_ITEMS);

  const withStop = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handler();
  };

  const renderAction = (n: NotificationDTO) => {
    switch (n.type) {
      case "FRIEND_REQUEST":
        return (
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-7 px-3"
            onClick={withStop(() => { onClose?.(); navigate('/social?tab=friends'); })}
          >
            Xem lời mời
          </Button>
        );
      case "FRIEND_REQUEST_ACCEPTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200 h-6"
          >
            Bạn bè
          </Badge>
        );
      case "INVITE":
        return (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/50 text-primary hover:bg-primary/10 dark:hover:bg-primary/15 h-7 px-3"
            onClick={withStop(() => { onClose?.(); navigate('/social?tab=friends'); })}
          >
            Mở lời mời
          </Button>
        );
      case "SHARE":
        return (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15 h-7 px-3"
            onClick={withStop(() => { onClose?.(); navigate('/social'); })}
          >
            Xem nội dung
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <DropdownMenuContent align="end" className="w-[420px] p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="text-sm font-semibold">Thông báo</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/90"
          onClick={() => { onClose?.(); navigate('/notifications'); }}
        >
          Xem tất cả
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có thông báo nào
        </div>
      ) : (
        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {visible.map((n) => {
              const typeKey = n?.type && typeMeta[n.type] ? n.type : "DEFAULT";
              const meta = typeMeta[typeKey];
              const Icon = meta.icon;
              const timeAgo = formatRelativeTime(n.createdAt);
              const senderInitial = (n.senderName || "H").charAt(0).toUpperCase();
              const unread = !n.read;
              const description = getNotificationDescription(n);

              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    // Navigate to the relevant place when possible
                    const t = n.type;
                    const meta = (n.metadata || {}) as Record<string, unknown>;
                    if (t === 'FRIEND_REQUEST' || t === 'FRIEND_REQUEST_ACCEPTED') {
                      onClose?.();
                      navigate('/social?tab=friends');
                      return;
                    }
                    if (t === 'INVITE') {
                      onClose?.();
                      navigate('/social?tab=friends');
                      return;
                    }
                    if (t === 'SHARE') {
                      onClose?.();
                      // Best effort: send user to social hub where shares are surfaced
                      navigate('/social');
                      return;
                    }
                    onClose?.();
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onClose?.(); navigate('/social'); } }}
                  className={cn(
                    "flex items-start gap-3 rounded-xl p-3 transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none",
                  )}
                >
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-muted/30">
                    <Icon className="h-4 w-4 text-primary" />
                    {unread ? (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <Avatar className="h-9 w-9">
                    {n.senderAvatar ? (
                      <AvatarImage src={n.senderAvatar} alt={n.senderName || "Người dùng"} />
                    ) : null}
                    <AvatarFallback>{senderInitial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-normal break-words leading-snug">
                      <span className="font-medium">{n.senderName || "Hệ thống EchoVerse"}</span>{" "}
                      <span className="text-muted-foreground">{description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderAction(n)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Separator />
      <div className="px-4 py-2 text-xs text-muted-foreground">
        Hiển thị {visible.length} / {items.length} thông báo gần đây
      </div>
    </DropdownMenuContent>
  );
};

export default NotificationsDropdown;
