import { useEffect, useMemo } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { setUserOnline, setUserOffline, pingPresence } from "@/services/firebase/presence";

/**
 * Component quản lý online status toàn cục
 * Set online ngay khi vào app, không chỉ khi vào trang social
 */
const PresenceManager = () => {
  const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const meId = useMemo(() => {
    try {
      const raw = userIdRaw;
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  }, [userIdRaw]);

  const { firebaseReady } = useFirebaseAuth(meId);

  useEffect(() => {
    if (!meId || !firebaseReady) {
      return;
    }

    console.log('[PresenceManager] Setting up global presence for user:', meId);

    // Set online ngay khi vào app
    void setUserOnline(meId);

    // Heartbeat ping mỗi 15s để giữ online status
    const PRESENCE_PING_INTERVAL_MS = 15000;
    let pingInterval: NodeJS.Timeout | null = null;
    
    const startPing = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      pingInterval = setInterval(() => {
        // Chỉ ping khi tab đang visible
        if (!document.hidden) {
          console.log('[PresenceManager] Heartbeat ping');
          void pingPresence(meId);
        }
      }, PRESENCE_PING_INTERVAL_MS);
    };
    
    const stopPing = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    };

    // Bắt đầu ping
    startPing();

    // Xử lý khi chuyển tab (visibilitychange)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab bị ẩn - tạm dừng ping và set offline
        console.log('[PresenceManager] Tab hidden, setting user offline');
        stopPing();
        void setUserOffline(meId);
      } else {
        // Tab hiện lại - set online và resume ping
        console.log('[PresenceManager] Tab visible, setting user online');
        void setUserOnline(meId);
        startPing();
        // Ping ngay lập tức khi tab hiện lại
        void pingPresence(meId);
      }
    };

    // Set offline khi pagehide/beforeunload
    const handlePageHide = () => {
      console.log('[PresenceManager] Page hiding, setting user offline');
      stopPing();
      void setUserOffline(meId);
    };
    
    const handleBeforeUnload = () => {
      console.log('[PresenceManager] Before unload, setting user offline');
      stopPing();
      void setUserOffline(meId);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('[PresenceManager] Cleaning up presence manager');
      stopPing();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set offline khi cleanup
      void setUserOffline(meId);
    };
  }, [meId, firebaseReady]);

  return null;
};

export default PresenceManager;

