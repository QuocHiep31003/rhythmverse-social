import { useEffect, useMemo, useState, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import ChatBubble from "@/components/ChatBubble";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { watchNotifications, type NotificationDTO } from "@/services/firebase/notifications";
import { BellRing, CheckCircle2, Share2, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const typeMeta: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
    tone: string;
  }
> = {
  INVITE: {
    label: "Lời mời cộng tác",
    icon: Users,
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-100",
    tone: "from-emerald-500/10 via-transparent to-transparent",
  },
  INVITE_ACCEPTED: {
    label: "Chấp nhận cộng tác",
    icon: CheckCircle2,
    badge: "border-green-500/30 bg-green-500/12 text-green-700 dark:text-green-100",
    tone: "from-green-500/10 via-transparent to-transparent",
  },
  INVITE_REJECTED: {
    label: "Từ chối cộng tác",
    icon: Users,
    badge: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-100",
    tone: "from-red-500/10 via-transparent to-transparent",
  },
  SHARE: {
    label: "Chia sẻ",
    icon: Share2,
    badge: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-100",
    tone: "from-violet-500/10 via-transparent to-transparent",
  },
  FRIEND_REQUEST: {
    label: "Lời mời kết bạn",
    icon: UserPlus,
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-100",
    tone: "from-amber-500/10 via-transparent to-transparent",
  },
  FRIEND_REQUEST_ACCEPTED: {
    label: "Bạn bè",
    icon: CheckCircle2,
    badge: "border-lime-500/30 bg-lime-500/12 text-lime-700 dark:text-lime-100",
    tone: "from-lime-500/10 via-transparent to-transparent",
  },
  DEFAULT: {
    label: "Thông báo",
    icon: BellRing,
    badge: "border-muted/40 bg-muted/20 text-muted-foreground",
    tone: "from-primary/5 via-transparent to-transparent",
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
      return `mời bạn cộng tác trên "${playlistName}"`;
    }
    case "INVITE_ACCEPTED": {
      const playlistName = meta?.playlistName || "một playlist";
      return `đã chấp nhận lời mời cộng tác trên "${playlistName}"`;
    }
    case "INVITE_REJECTED": {
      const playlistName = meta?.playlistName || "một playlist";
      return `đã từ chối lời mời cộng tác trên "${playlistName}"`;
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

const Notifications = () => {
  // ✅ Persist notifications trong state và ref để không mất khi chuyển trang
  const [rawItems, setRawItems] = useState<NotificationDTO[]>([]);
  const [locallyRead, setLocallyRead] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const itemsRef = useRef<NotificationDTO[]>([]); // ✅ Ref để persist
  
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
      const safeList = Array.isArray(list) ? list : [];
      // Chỉ filter MESSAGE, giữ lại TẤT CẢ notifications khác (kể cả trùng)
      const filtered = safeList.filter((item) => item.type !== "MESSAGE");
      
      // ✅ Debug: Log friend request notifications
      const friendRequests = filtered.filter(n => n.type === 'FRIEND_REQUEST');
      const invites = filtered.filter(n => n.type === 'INVITE');
      console.log('[Notifications Page] Notifications loaded:', {
        total: filtered.length,
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
      setRawItems(filtered);
      itemsRef.current = filtered;
    });
    return () => { try { unsub(); } catch { /* noop */ } };
  }, [meId]);
  
  // ✅ Restore từ ref khi component mount lại (khi quay lại từ trang khác)
  useEffect(() => {
    if (itemsRef.current.length > 0 && rawItems.length === 0) {
      setRawItems(itemsRef.current);
    }
  }, [rawItems.length]);

  useEffect(() => {
    // Remove local flags for notifications no longer present
    setLocallyRead((prev) => {
      const next = { ...prev };
      const ids = new Set(rawItems.map((item) => String(item.id)));
      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [rawItems]);

  const goTo = (n: NotificationDTO) => {
    try {
      const type = n.type;
      const meta = n.metadata as { playlistId?: number; roomId?: string } | undefined;
      
      if (type === 'INVITE' || type === 'INVITE_ACCEPTED' || type === 'INVITE_REJECTED') {
        // Navigate đến social với tab friends để xem collab invites
        navigate("/social?tab=friends");
      } else if (type === 'FRIEND_REQUEST' || type === 'FRIEND_REQUEST_ACCEPTED') {
        // Navigate đến social với tab friends để xem friend requests
        navigate("/social?tab=friends");
      } else if (type === 'SHARE') {
        // Navigate đến social để xem chat/share
        if (meta?.roomId) {
          navigate(`/social?chat=${meta.roomId}`);
        } else {
          navigate("/social");
        }
      } else {
        // Default: navigate đến social
        navigate("/social");
      }
    } catch { /* noop */ }
  };

  // Sắp xếp thông báo theo thời gian mới nhất trước (createdAt giảm dần)
  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      const timeA = parseTimestamp(a.createdAt) ?? 0;
      const timeB = parseTimestamp(b.createdAt) ?? 0;
      return timeB - timeA; // Mới nhất trước
    });
  }, [rawItems]);
  
  // Pagination: hiển thị 6 items ban đầu (6 thông báo mới nhất), nếu có nhiều hơn 6 thì có nút "Xem thêm"
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const hasInitializedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Chỉ reset về 6 khi vào trang lần đầu (khi items từ 0 lên > 0)
    // Không reset khi user đã click "Xem thêm"
    if (!hasInitializedRef.current && items.length > 0) {
      setVisibleCount(6);
      hasInitializedRef.current = true;
    }
    // Nếu items giảm xuống dưới visibleCount, reset về items.length hoặc 6 (tùy cái nào nhỏ hơn)
    if (items.length < visibleCount) {
      setVisibleCount(Math.min(6, items.length));
    }
  }, [items.length, visibleCount]);
  
  // Lấy 6 thông báo mới nhất (đã được sắp xếp)
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  const grouped = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const buckets: Record<string, NotificationDTO[]> = {
      "Hôm nay": [],
      "Hôm qua": [],
      "Tuần này": [],
      "Tháng này": [],
      "Trước đó": [],
    };

    visibleItems.forEach((item) => {
      const timestamp = parseTimestamp(item.createdAt) ?? startOfToday;
      if (timestamp >= startOfToday) {
        buckets["Hôm nay"].push(item);
      } else if (timestamp >= startOfYesterday) {
        buckets["Hôm qua"].push(item);
      } else if (timestamp >= startOfWeek) {
        buckets["Tuần này"].push(item);
      } else if (timestamp >= startOfMonth) {
        buckets["Tháng này"].push(item);
      } else {
        buckets["Trước đó"].push(item);
      }
    });

    return buckets;
  }, [visibleItems]);

  const orderedSections = useMemo(
    () =>
      ["Hôm nay", "Hôm qua", "Tuần này", "Tháng này", "Trước đó"].filter(
        (key) => grouped[key]?.length
      ),
    [grouped]
  );

  const withStop = (handler: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    handler();
  };

  const markAsRead = (notificationId: NotificationDTO["id"]) => {
    setLocallyRead((prev) => ({ ...prev, [String(notificationId)]: true }));
  };

  const renderAction = (notification: NotificationDTO) => {
    switch (notification.type) {
      case "FRIEND_REQUEST":
        return (
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            onClick={withStop(() => navigate("/social?tab=friends"))}
          >
            Xem lời mời
          </Button>
        );
      case "FRIEND_REQUEST_ACCEPTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"
          >
            Bạn bè
          </Badge>
        );
      case "INVITE":
        return (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/50 text-primary hover:bg-primary/10 dark:hover:bg-primary/15"
            onClick={withStop(() => navigate("/social?tab=friends"))}
          >
            Mở lời mời
          </Button>
        );
      case "INVITE_ACCEPTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-green-500/40 bg-green-500/12 text-green-700 dark:text-green-200"
          >
            Đã chấp nhận
          </Badge>
        );
      case "INVITE_REJECTED":
        return (
          <Badge
            variant="secondary"
            className="rounded-full border border-red-500/40 bg-red-500/12 text-red-700 dark:text-red-200"
          >
            Đã từ chối
          </Badge>
        );
      case "SHARE":
        return (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15"
            onClick={withStop(() => navigate("/social?tab=friends"))}
          >
            Xem nội dung
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/40 to-background py-10 text-foreground">
      <ChatBubble />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Thông báo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nắm bắt hoạt động mới nhất từ bạn bè và cộng đồng EchoVerse.
          </p>
        </div>
        <Card className="overflow-hidden border border-border/60 bg-card shadow-lg shadow-primary/5 backdrop-blur-sm transition-colors dark:bg-card/80">
          <CardContent className="space-y-6 p-6">
            {orderedSections.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-14 text-center text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/20">
                  <BellRing className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">Chưa có thông báo nào</p>
                  <p className="text-sm text-muted-foreground">
                    Khi có hoạt động mới, chat bubble sẽ hiển thị ngay và lưu lại tại đây.
                  </p>
                </div>
              </div>
            ) : (
              orderedSections.map((sectionKey) => {
                const sectionItems = grouped[sectionKey] || [];
                return (
                  <div key={sectionKey} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
                        {sectionKey}
                      </span>
                      <Separator className="flex-1 bg-border/60" />
                    </div>
                    <div className="space-y-3">
                      {sectionItems.map((n) => {
                        const typeKey = n?.type && typeMeta[n.type] ? n.type : "DEFAULT";
                        const meta = typeMeta[typeKey];
                        const Icon = meta.icon;
                        const unread = !locallyRead[String(n.id)] && !n.read;
                        const timeAgo = formatRelativeTime(n.createdAt);
                        const senderInitial = (n.senderName || "H").charAt(0).toUpperCase();
                        const action = renderAction(n);
                        const description = getNotificationDescription(n);

                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              markAsRead(n.id);
                              // Navigate ngay lập tức, không delay
                              goTo(n);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                markAsRead(n.id);
                                goTo(n);
                              }
                            }}
                            className={cn(
                              "rounded-3xl border border-border/60 bg-card/80 p-4 transition-all focus-visible:outline-none backdrop-blur-sm dark:bg-card/60",
                              "hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/30",
                              unread ? "shadow-md shadow-primary/10 dark:shadow-primary/20" : "opacity-95 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-foreground dark:bg-muted/20">
                                <Icon className="h-5 w-5 text-primary" />
                                {unread ? (
                                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                                ) : null}
                              </div>
                              <div className="flex flex-1 items-center gap-3">
                                <Avatar className="h-10 w-10 border border-border/60 bg-card/90 dark:bg-card/70">
                                  {n.senderAvatar ? (
                                    <AvatarImage src={n.senderAvatar} alt={n.senderName || "Người dùng"} />
                                  ) : null}
                                  <AvatarFallback>{senderInitial}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm text-foreground">
                                    <span className="font-semibold text-foreground">{n.senderName || "Hệ thống EchoVerse"}</span>{" "}
                                    <span className="text-muted-foreground">{description}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                                </div>
                                {action ? <div className="pl-2">{action}</div> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
            {items.length > 6 && (
              <div className="pt-4 flex justify-center gap-2">
                {visibleCount < items.length && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setVisibleCount((c) => Math.min(c + 6, items.length))}
                  >
                    Xem thêm
                  </Button>
                )}
                {visibleCount > 6 && (
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setVisibleCount(6)}
                  >
                    Ẩn bớt
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
