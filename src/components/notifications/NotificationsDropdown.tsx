import { useEffect, useMemo, useState, useRef } from "react";
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
import { subscribeTempNotification } from "@/utils/notificationBus";
import { BellRing, CheckCircle2, Share2, UserPlus, Users, AlertTriangle, Ban, Crown, Flame, AlarmClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSlug } from "@/utils/playlistUtils";

const MAX_DROPDOWN_ITEMS = 5;

const getStoredUserId = (): number | undefined => {
  try {
    const raw =
      localStorage.getItem("userId") ||
      sessionStorage.getItem("userId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
};

const typeMeta: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
  }
> = {
  INVITE: {
    label: "Collaboration invite",
    icon: Users,
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-100",
  },
  INVITE_ACCEPTED: {
    label: "Collaboration accepted",
    icon: CheckCircle2,
    badge: "border-green-500/30 bg-green-500/12 text-green-700 dark:text-green-100",
  },
  INVITE_REJECTED: {
    label: "Collaboration declined",
    icon: Users,
    badge: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-100",
  },
  SHARE: {
    label: "Share",
    icon: Share2,
    badge: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-100",
  },
  FRIEND_REQUEST: {
    label: "Friend request",
    icon: UserPlus,
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-100",
  },
  FRIEND_REQUEST_ACCEPTED: {
    label: "Friends",
    icon: CheckCircle2,
    badge: "border-lime-500/30 bg-lime-500/12 text-lime-700 dark:text-lime-100",
  },
  PLAYLIST_WARNED: {
    label: "Playlist warning",
    icon: AlertTriangle,
    badge: "border-yellow-500/30 bg-yellow-500/12 text-yellow-700 dark:text-yellow-100",
  },
  PLAYLIST_BANNED: {
    label: "Playlist removed",
    icon: Ban,
    badge: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-100",
  },
  PLAYLIST_RESTORED: {
    label: "Playlist restored",
    icon: CheckCircle2,
    badge: "border-green-500/30 bg-green-500/12 text-green-700 dark:text-green-100",
  },
  SUBSCRIPTION_EXPIRING_SOON: {
    label: "Plan expiring soon",
    icon: Crown,
    badge: "border-purple-500/30 bg-purple-500/12 text-purple-700 dark:text-purple-100",
  },
  STREAK_WARNING: {
    label: "Streak warning",
    icon: AlarmClock,
    badge: "border-orange-500/40 bg-orange-500/12 text-orange-700 dark:text-orange-100",
  },
  STREAK_BROKEN: {
    label: "Streak ended",
    icon: Flame,
    badge: "border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-100",
  },
  COLLAB_ADDED: {
    label: "Added to collaboration",
    icon: Users,
    badge: "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-100",
  },
  DEFAULT: {
    label: "Notification",
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
  if (!timestamp) return "Just now";
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
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
    planName?: string;
    planDetailName?: string;
    daysBeforeExpiry?: number;
    friendName?: string;
    hoursRemaining?: number;
    streakDays?: number;
  } | undefined;

  switch (notification.type) {
    case "FRIEND_REQUEST":
      return "sent you a friend request";
    case "FRIEND_REQUEST_ACCEPTED":
      return "accepted your friend request";
    case "INVITE": {
      const playlistName = meta?.playlistName || "a playlist";
      return `invited you to collaborate on "${playlistName}"`;
    }
    case "INVITE_ACCEPTED": {
      const playlistName = meta?.playlistName || "a playlist";
      return `accepted your collaboration invite on "${playlistName}"`;
    }
    case "INVITE_REJECTED": {
      const playlistName = meta?.playlistName || "a playlist";
      return `declined your collaboration invite on "${playlistName}"`;
    }
    case "COLLAB_ADDED": {
      const playlistName = meta?.playlistName || "a playlist";
      return `added you collab on Playlist "${playlistName}"`;
    }
    case "SHARE": {
      const title =
        meta?.playlistName ||
        meta?.songName ||
        meta?.albumName ||
        notification.title ||
        "some content";
      return `shared: "${title}"`;
    }
    case "PLAYLIST_WARNED": {
      const playlistName = meta?.playlistName || "a playlist";
      const warningCount = (meta as { warningCount?: number })?.warningCount || 0;
      const warningReason = (meta as { warningReason?: string })?.warningReason || "";
      if (warningReason) {
        return `Playlist "${playlistName}" received a warning (${warningCount}/3): ${warningReason}`;
      }
      return `Playlist "${playlistName}" received a warning (${warningCount}/3)`;
    }
    case "PLAYLIST_BANNED": {
      const playlistName = meta?.playlistName || "a playlist";
      const banReason = (meta as { banReason?: string })?.banReason || "";
      if (banReason) {
        return `Playlist "${playlistName}" was removed from the system. Reason: ${banReason}`;
      }
      return `Playlist "${playlistName}" was removed from the system`;
    }
    case "PLAYLIST_RESTORED": {
      const playlistName = meta?.playlistName || "a playlist";
      return `Playlist "${playlistName}" has been restored`;
    }
    case "SUBSCRIPTION_EXPIRING_SOON": {
      const planName =
        meta?.planName ||
        meta?.planDetailName ||
        (notification.title || "your Premium plan");
      const days = (meta?.daysBeforeExpiry as number | undefined) ?? 1;
      if (days === 1) {
        return `${planName} will expire in 1 day`;
      }
      return `${planName} will expire in ${days} days`;
    }
    case "STREAK_WARNING": {
      const friendName = meta?.friendName || notification.senderName || "your friend";
      const hours = meta?.hoursRemaining;
      if (typeof hours === "number" && hours > 0) {
        return `Your streak with ${friendName} is at risk – about ${hours} hour${hours > 1 ? "s" : ""} left`;
      }
      return (
        notification.body ||
        `Your streak with ${friendName} is at risk. Send a message to keep it alive!`
      );
    }
    case "STREAK_BROKEN": {
      const friendName = meta?.friendName || notification.senderName || "your friend";
      const streakDays = meta?.streakDays;
      if (typeof streakDays === "number" && streakDays > 0) {
        return `Your ${streakDays}-day streak with ${friendName} has ended`;
      }
      return (
        notification.body ||
        `Your streak with ${friendName} has ended. Start a new one today!`
      );
    }
    default: {
      const fallback = String(notification.body || notification.title || "").trim();
      return fallback || "sent you a notification";
    }
  }
};

interface Props {
  userId?: number | null;
  onClose?: () => void;
}

const NotificationsDropdown = ({ userId, onClose }: Props) => {
  // ✅ Persist notifications trong state để không mất khi chuyển trang
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const navigate = useNavigate();
  const itemsRef = useRef<NotificationDTO[]>([]); // ✅ Ref để persist

  const resolvedUserId = useMemo(() => {
    if (typeof userId === "number" && Number.isFinite(userId)) {
      return userId;
    }
    return getStoredUserId();
  }, [userId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const unsub = watchNotifications(resolvedUserId, (list) => {
      // Chỉ filter MESSAGE, giữ lại TẤT CẢ notifications khác (kể cả trùng)
      const safe = (Array.isArray(list) ? list : []).filter((n) => n.type !== "MESSAGE");
      
      // ✅ Debug: Log friend request notifications
      const friendRequests = safe.filter(n => n.type === 'FRIEND_REQUEST');
      const invites = safe.filter(n => n.type === 'INVITE');
      console.log('[NotificationsDropdown] Notifications loaded:', {
        total: safe.length,
        friendRequests: friendRequests.length,
        invites: invites.length,
        friendRequestDetails: friendRequests.slice(0, 5).map(n => ({
          id: n.id,
          type: n.type,
          read: n.read,
          senderName: n.senderName,
          createdAt: n.createdAt
        }))
      });
      
      // ✅ Update cả state và ref để persist - HIỂN THỊ TẤT CẢ, KHÔNG DEDUPLICATE
      setItems(safe);
      itemsRef.current = safe;
    });
    return () => {
      try {
        unsub();
      } catch {
        /* noop */
      }
    };
  }, [resolvedUserId]);
  
  // ✅ Listen to temporary notifications (e.g., friend requests from FriendRequestWatcher)
  useEffect(() => {
    const unsubscribe = subscribeTempNotification((notification) => {
      // Chỉ thêm notification tạm thời nếu chưa có trong danh sách
      setItems((prev) => {
        // Kiểm tra xem notification đã tồn tại chưa (dựa vào senderId và type)
        // Đối với FRIEND_REQUEST, kiểm tra dựa vào senderId
        const exists = prev.some((n) => {
          if (notification.type === 'FRIEND_REQUEST') {
            return n.type === 'FRIEND_REQUEST' && n.senderId === notification.senderId;
          }
          // Đối với các loại notification khác, kiểm tra dựa vào id
          return n.id === notification.id;
        });
        if (exists) {
          return prev;
        }
        // Thêm notification mới vào đầu danh sách
        const updated = [notification, ...prev];
        itemsRef.current = updated;
        return updated;
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);
  
  // ✅ Restore từ ref khi component mount lại (khi quay lại từ trang khác)
  useEffect(() => {
    if (itemsRef.current.length > 0 && items.length === 0) {
      setItems(itemsRef.current);
    }
  }, [items.length]);

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
      case "INVITE_ACCEPTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-green-500/40 bg-green-500/12 text-green-700 dark:text-green-200 h-6"
          >
            Đã chấp nhận
          </Badge>
        );
      case "INVITE_REJECTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-red-500/40 bg-red-500/12 text-red-700 dark:text-red-200 h-6"
          >
            Đã từ chối
          </Badge>
        );
      case "COLLAB_ADDED":
        return (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/50 text-primary hover:bg-primary/10 dark:hover:bg-primary/15 h-7 px-3"
            onClick={withStop(() => {
              const meta = (n.metadata || {}) as { playlistId?: number; playlistName?: string };
              onClose?.();
              if (meta?.playlistId && meta?.playlistName) {
                const slug = createSlug(meta.playlistName, meta.playlistId);
                navigate(`/playlist/${slug}`);
              } else if (meta?.playlistId) {
                navigate(`/playlists/${meta.playlistId}`);
              } else {
                navigate('/playlists');
              }
            })}
          >
            View playlist
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
      case "STREAK_WARNING":
      case "STREAK_BROKEN":
        return (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15 h-7 px-3"
            onClick={withStop(() => { onClose?.(); navigate('/social'); })}
          >
            Mở chat
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
              // Treat only explicit true as read; string "false"/number 0 should remain unread
              const unread = n.read !== true;
              const description = getNotificationDescription(n);

              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    // Navigate to the relevant place when possible
                    const t = n.type;
                    const meta = (n.metadata || {}) as { playlistId?: number; roomId?: string; [key: string]: unknown };
                    onClose?.();
                    
                    // Navigate ngay lập tức, không delay
                    if (t === 'FRIEND_REQUEST' || t === 'FRIEND_REQUEST_ACCEPTED') {
                      navigate('/social?tab=friends');
                      return;
                    }
                    if (t === 'INVITE' || t === 'INVITE_ACCEPTED' || t === 'INVITE_REJECTED') {
                      // Navigate đến social với tab friends, có thể thêm expand invite nếu cần
                      navigate('/social?tab=friends');
                      return;
                    }
                    if (t === 'COLLAB_ADDED') {
                      // Navigate đến playlist detail
                      const playlistMeta = meta as { playlistId?: number; playlistName?: string };
                      if (playlistMeta?.playlistId && playlistMeta?.playlistName) {
                        const slug = createSlug(playlistMeta.playlistName, playlistMeta.playlistId);
                        navigate(`/playlist/${slug}`);
                      } else if (playlistMeta?.playlistId) {
                        navigate(`/playlists/${playlistMeta.playlistId}`);
                      } else {
                        navigate('/playlists');
                      }
                      return;
                    }
                    if (t === 'SHARE') {
                      // Navigate đến chat nếu có roomId
                      if (meta?.roomId) {
                        navigate(`/social?chat=${meta.roomId}`);
                      } else {
                      navigate('/social');
                      }
                      return;
                    }
                    if (t === 'PLAYLIST_BANNED' || t === 'PLAYLIST_WARNED' || t === 'PLAYLIST_RESTORED') {
                      // Navigate đến playlist detail nếu có playlistId
                      if (meta?.playlistId) {
                        navigate(`/playlists/${meta.playlistId}`);
                      }
                      return;
                    }
                    if (t === 'STREAK_WARNING' || t === 'STREAK_BROKEN') {
                      navigate('/social');
                      return;
                    }
                    // Default: navigate đến social
                    navigate('/social');
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
