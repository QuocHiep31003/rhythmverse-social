import { useEffect, useRef } from "react";
import {
  setUserOnline,
  setUserOffline,
  pingPresence,
  watchUserPresence,
  watchMultipleUsersPresence,
} from "@/services/firebase/presence";
import { watchNotifications, NotificationDTO } from "@/services/firebase/notifications";
import { watchStreakUpdates, FirebaseStreakPayload } from "@/services/firebase/streaks";
import { STREAK_STORAGE_EVENT, StreakStorageEventDetail } from "@/constants/streak";
import type { StreakState } from "@/hooks/useStreakManager";

// Để tránh spam presence ping, FE không được ping quá dày.
// Backend thường có heartbeat window ~30s, nên đặt tối thiểu 10s.
const MIN_PING_INTERVAL_MS = 10000;
const DEFAULT_PING_INTERVAL_MS = 15000;
const envPingIntervalRaw = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_PRESENCE_PING_INTERVAL_MS;
const parsedEnvPing = envPingIntervalRaw ? Number(envPingIntervalRaw) : NaN;
const PRESENCE_PING_INTERVAL_MS = Number.isFinite(parsedEnvPing)
  ? Math.max(parsedEnvPing, MIN_PING_INTERVAL_MS)
  : DEFAULT_PING_INTERVAL_MS;

type UseFirebaseRealtimeOptions = {
  onPresence?: (presence: { userId: number; online: boolean }) => void;
  onNotification?: (notification: NotificationDTO) => void;
  friends?: number[];
};

export default function useFirebaseRealtime(
  userId: number | undefined,
  options?: UseFirebaseRealtimeOptions
) {
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribePresenceRef = useRef<(() => void)[]>([]);
  const unsubscribeNotifRef = useRef<(() => void) | null>(null);
  const unsubscribeStreakRef = useRef<(() => void) | null>(null);
  const shownNotificationsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);
  const lastPingTimeRef = useRef<number>(0);
  const currentUserIdRef = useRef<number | undefined>(undefined);
  const optionsRef = useRef<UseFirebaseRealtimeOptions | undefined>(options);

  // Cập nhật options ref khi options thay đổi (không trigger re-render)
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!userId) {
      console.log("[Firebase Realtime] No userId, skipping setup");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      unsubscribePresenceRef.current.forEach((unsub) => unsub());
      unsubscribePresenceRef.current = [];
      if (unsubscribeNotifRef.current) {
        unsubscribeNotifRef.current();
        unsubscribeNotifRef.current = null;
      }
      if (unsubscribeStreakRef.current) {
        unsubscribeStreakRef.current();
        unsubscribeStreakRef.current = null;
      }
      return;
    }

    const userIdChanged = currentUserIdRef.current !== userId;
    
    console.log('[Firebase Realtime] Setting up for userId:', userId, 'changed:', userIdChanged, 'friends:', optionsRef.current?.friends);

    // Nếu userId thay đổi, reset và set online
    if (userIdChanged) {
      shownNotificationsRef.current.clear();
      isInitialLoadRef.current = true;
      currentUserIdRef.current = userId;
      
      // Set online ngay khi userId thay đổi (lần đầu mount hoặc đổi user)
      console.log('[Firebase Realtime] UserId changed, setting user online');
      lastPingTimeRef.current = Date.now();
      
      // Gọi setUserOnline một lần khi login (optional, backward compatible)
      void setUserOnline(userId);
      
      // Clear interval cũ nếu có
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Heartbeat ping mỗi 15s (phải < 30s heartbeat window của backend)
      // Backend sẽ tự động tính online status dựa trên lastSeen
      pingIntervalRef.current = setInterval(() => {
        console.log('[Firebase Realtime] Heartbeat ping');
        lastPingTimeRef.current = Date.now();
        void pingPresence(userId);
      }, PRESENCE_PING_INTERVAL_MS); // default 15s heartbeat
      console.log('[Firebase Realtime] Heartbeat interval (ms):', PRESENCE_PING_INTERVAL_MS);
    } else {
      // Nếu userId không đổi, chỉ cập nhật presence listeners nếu cần
      console.log('[Firebase Realtime] UserId unchanged, updating listeners if needed');
    }

    // Luôn cleanup và setup lại notifications và presence listeners
    // Cleanup cũ trước
    if (unsubscribeNotifRef.current) {
      unsubscribeNotifRef.current();
      unsubscribeNotifRef.current = null;
    }
    unsubscribePresenceRef.current.forEach(unsub => unsub());
    unsubscribePresenceRef.current = [];

    // Watch notifications
    const currentOptions = optionsRef.current;
    if (currentOptions?.onNotification) {
      console.log('[Firebase Realtime] Setting up notification watch');
      unsubscribeNotifRef.current = watchNotifications(userId, (notifications) => {
        // ✅ Hiển thị notifications unread ngay cả khi initial load
        if (isInitialLoadRef.current) {
          // ✅ Lấy tất cả notifications unread (read === false hoặc read === undefined)
          // Coi undefined/null là unread (chưa đọc)
          const unreadOnInitialLoad = notifications.filter(n => n.read !== true);
          
          // ✅ Log chi tiết để debug
          const readStatusSample = notifications.slice(0, 10).map(n => ({
            id: n.id,
            type: n.type,
            read: n.read,
            readType: typeof n.read,
            senderName: n.senderName
          }));
          
          console.log('[Firebase Realtime] Initial load:', {
            total: notifications.length,
            unread: unreadOnInitialLoad.length,
            unreadTypes: unreadOnInitialLoad.map(n => n.type),
            readStatusSample: readStatusSample,
            unreadDetails: unreadOnInitialLoad.slice(0, 5).map(n => ({
              id: n.id,
              type: n.type,
              read: n.read,
              senderName: n.senderName
            }))
          });
          
          // ✅ Show tất cả unread notifications khi initial load
          unreadOnInitialLoad.forEach((notification) => {
            if (notification.id) {
              shownNotificationsRef.current.add(String(notification.id));
              console.log('[Firebase Realtime] Showing unread notification on initial load:', {
                id: notification.id,
                type: notification.type,
                senderName: notification.senderName,
                body: notification.body
              });
              optionsRef.current?.onNotification?.(notification);
            }
          });
          
          // ✅ Đánh dấu tất cả notifications (cả read và unread) là đã xem để không show lại
          notifications.forEach(n => {
            if (n.id) {
              shownNotificationsRef.current.add(String(n.id));
            }
          });
          isInitialLoadRef.current = false;
          console.log('[Firebase Realtime] Initial load completed, shown', unreadOnInitialLoad.length, 'unread notifications');
          return;
        }

        // Lấy notifications mới (chưa từng show) - chỉ show notification được tạo SAU khi user vào trang
        const unread = notifications.filter(n => {
          if (!n.id) return false;
          const id = String(n.id);
          // ✅ Chỉ lấy notification chưa đọc (read !== true) VÀ chưa từng show
          return n.read !== true && !shownNotificationsRef.current.has(id);
        });

        // Log chi tiết để debug
        const unreadDetails = unread.map(n => ({
          id: n.id,
          type: n.type,
          read: n.read,
          senderName: n.senderName,
          body: n.body?.substring(0, 50)
        }));
        const allUnread = notifications.filter(n => !n.read);
        
        console.log('[Firebase Realtime] Filtered unread notifications:', {
          total: notifications.length,
          allUnreadCount: allUnread.length,
          allUnreadTypes: allUnread.map(n => n.type),
          newUnreadCount: unread.length,
          newUnreadDetails: unreadDetails,
          shownCount: shownNotificationsRef.current.size
        });

        // Show TẤT CẢ unread notifications mới (không chỉ mới nhất)
        // Điều này đảm bảo user nhận được tất cả notifications (friend request, collab invite, etc.)
        unread.forEach((notification) => {
          if (notification.id) {
            shownNotificationsRef.current.add(String(notification.id));
            console.log('[Firebase Realtime] Showing notification:', {
              id: notification.id,
              type: notification.type,
              senderName: notification.senderName,
              body: notification.body,
              read: notification.read
            });
            optionsRef.current?.onNotification?.(notification);
          }
        });

        if (unread.length === 0) {
          console.log('[Firebase Realtime] No new unread notifications to show');
        }
      });
    }

    // Cleanup presence watchers cũ (sẽ setup lại ở useEffect riêng)
    unsubscribePresenceRef.current.forEach(unsub => unsub());
    unsubscribePresenceRef.current = [];

    if (unsubscribeStreakRef.current) {
      unsubscribeStreakRef.current();
      unsubscribeStreakRef.current = null;
    }

    unsubscribeStreakRef.current = watchStreakUpdates(userId, (friendId, payload) => {
      const mappedPayload: StreakState | null = payload
        ? {
            streak: payload.streak ?? 0,
            expireAt: payload.expireAt ?? null,
            lastInteraction: payload.lastInteraction ?? null,
            isActive: payload.event !== "ended",
          }
        : null;
      const detail: StreakStorageEventDetail = mappedPayload
        ? { friendId: String(friendId), type: "updated", payload: mappedPayload }
        : { friendId: String(friendId), type: "invalidate" };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(STREAK_STORAGE_EVENT, { detail }));
      }
    });

    // KHÔNG xử lý pagehide/beforeunload ở đây vì PresenceManager đang quản lý online status toàn cục
    // useFirebaseRealtime chỉ quản lý notifications và presence watching cho friends

    // Cleanup
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // KHÔNG gọi setUserOffline khi cleanup vì PresenceManager đang quản lý online status toàn cục
      // Chỉ set offline khi thực sự đóng app/tab (đã xử lý trong PresenceManager)
      unsubscribePresenceRef.current.forEach((unsub) => unsub());
      unsubscribePresenceRef.current = [];
      if (unsubscribeNotifRef.current) {
        unsubscribeNotifRef.current();
        unsubscribeNotifRef.current = null;
      }
      if (unsubscribeStreakRef.current) {
        unsubscribeStreakRef.current();
        unsubscribeStreakRef.current = null;
      }
    };
  }, [userId]); // Chỉ phụ thuộc vào userId, các options được lưu trong refs để tránh re-render

  // Separate useEffect để watch presence khi friends thay đổi
  // Sử dụng JSON.stringify để so sánh array thay vì reference
  const friendsKey = options?.friends ? JSON.stringify([...options.friends].sort((a, b) => a - b)) : '';
  
  useEffect(() => {
    if (!userId) {
      return;
    }

    const currentOptions = optionsRef.current;
    const friendsList = currentOptions?.friends;

    // Cleanup presence watchers cũ
    unsubscribePresenceRef.current.forEach(unsub => unsub());
    unsubscribePresenceRef.current = [];

    // Watch presence của friends
    if (friendsList && friendsList.length > 0) {
      console.log('[Firebase Realtime] Setting up presence watch for friends:', friendsList);
      const unsubscribe = watchMultipleUsersPresence(friendsList, (presence) => {
        console.log('[Firebase Realtime] Presence callback triggered:', presence);
        const latestOptions = optionsRef.current;
        if (latestOptions?.onPresence) {
          console.log('[Firebase Realtime] Calling onPresence callback with:', presence);
          latestOptions.onPresence(presence);
        } else {
          console.warn('[Firebase Realtime] onPresence callback is not defined');
        }
      });
      unsubscribePresenceRef.current.push(unsubscribe);
    } else {
      console.log('[Firebase Realtime] No friends to watch presence for');
    }

    return () => {
      unsubscribePresenceRef.current.forEach(unsub => unsub());
      unsubscribePresenceRef.current = [];
    };
  }, [userId, friendsKey]); // Re-run khi friends thay đổi (so sánh bằng JSON.stringify)

  return {
    isConnected: !!userId
  };
}
