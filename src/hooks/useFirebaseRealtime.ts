import { useEffect, useRef } from 'react';
import { setUserOnline, setUserOffline, pingPresence, watchUserPresence, watchMultipleUsersPresence } from '@/services/firebase/presence';
import { watchChatMessages, sendMessage, type FirebaseMessage } from '@/services/firebase/chat';
import { watchNotifications, NotificationDTO } from '@/services/firebase/notifications';

type UseFirebaseRealtimeOptions = {
  onPresence?: (presence: { userId: number; online: boolean }) => void;
  onNotification?: (notification: NotificationDTO) => void;
  onMessage?: (message: FirebaseMessage) => void;
  friends?: number[];
};

export default function useFirebaseRealtime(
  userId: number | undefined,
  options?: UseFirebaseRealtimeOptions
) {
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribePresenceRef = useRef<(() => void)[]>([]);
  const unsubscribeChatRef = useRef<(() => void)[]>([]);
  const unsubscribeNotifRef = useRef<(() => void) | null>(null);
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
      console.log('[Firebase Realtime] No userId, skipping setup');
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
      }, 15000); // 15 giây - Messenger-style heartbeat
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
        // Bỏ qua lần load đầu tiên (chỉ show notifications mới sau đó)
        if (isInitialLoadRef.current) {
          // Đánh dấu tất cả notifications hiện tại là đã xem
          notifications.forEach(n => {
            if (n.id) {
              shownNotificationsRef.current.add(String(n.id));
            }
          });
          isInitialLoadRef.current = false;
          console.log('[Firebase Realtime] Initial load, marking all notifications as shown');
          return;
        }

        // Chỉ lấy notifications mới (chưa từng show)
        const unread = notifications.filter(n => {
          if (!n.id) return false;
          const id = String(n.id);
          // Chỉ lấy notification chưa đọc VÀ chưa từng show
          return !n.read && !shownNotificationsRef.current.has(id);
        });

        // Show notification mới nhất và đánh dấu đã show
        if (unread.length > 0) {
          const newest = unread[0]; // Đã sort newest first trong watchNotifications
          if (newest.id) {
            shownNotificationsRef.current.add(String(newest.id));
            console.log('[Firebase Realtime] Showing new notification:', newest.id);
            optionsRef.current?.onNotification?.(newest);
          }
        }
      });
    }

    // Cleanup presence watchers cũ (sẽ setup lại ở useEffect riêng)
    unsubscribePresenceRef.current.forEach(unsub => unsub());
    unsubscribePresenceRef.current = [];

    // Handle pagehide/beforeunload để set offline (best effort)
    const handlePageHide = () => {
      if (currentUserIdRef.current) {
        console.log('[Firebase Realtime] Page hiding, setting user offline');
        void setUserOffline(currentUserIdRef.current);
      }
    };
    
    const handleBeforeUnload = () => {
      if (currentUserIdRef.current) {
        console.log('[Firebase Realtime] Before unload, setting user offline');
        void setUserOffline(currentUserIdRef.current);
      }
    };
    
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // Gọi setUserOffline khi cleanup (nhưng không chờ response vì có thể đang unmount)
      if (currentUserIdRef.current) {
        void setUserOffline(currentUserIdRef.current);
      }
      unsubscribePresenceRef.current.forEach(unsub => unsub());
      unsubscribePresenceRef.current = [];
      unsubscribeChatRef.current.forEach(unsub => unsub());
      unsubscribeChatRef.current = [];
      if (unsubscribeNotifRef.current) {
        unsubscribeNotifRef.current();
        unsubscribeNotifRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Function để watch chat với một friend cụ thể
  const watchChatWithFriend = (friendId: number, onNewMessage: (msg: FirebaseMessage) => void) => {
    if (!userId) return () => {};
    
    const unsubscribe = watchChatMessages(userId, friendId, (messages) => {
      // Chỉ trigger callback cho message mới nhất nếu cần
      if (messages.length > 0 && options?.onMessage) {
        const latest = messages[messages.length - 1];
        if (latest.senderId !== userId) {
          options.onMessage(latest);
        }
      }
    });
    
    unsubscribeChatRef.current.push(unsubscribe);
    return unsubscribe;
  };

  return {
    sendMessage: (senderId: number, receiverId: number, content: string) => {
      return sendMessage(senderId, receiverId, content);
    },
    watchChatWithFriend,
    isConnected: !!userId
  };
}

