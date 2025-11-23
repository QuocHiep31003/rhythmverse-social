import { ref, onValue, off } from 'firebase/database';
import { firebaseDb } from '@/config/firebase-config';
import { API_BASE_URL, buildJsonHeaders } from '@/services/api/config';

// Heartbeat ping để giữ presence online (Messenger-style)
// Gọi mỗi 15s để backend tự động tính online status dựa trên lastSeen
export const pingPresence = async (userId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/presence/ping/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.warn('[Firebase Presence] Ping failed:', response.status);
      return;
    }
    
    console.log('[Firebase Presence] Heartbeat ping sent for user:', userId);
  } catch (error) {
    console.warn('[Firebase Presence] Failed to ping presence:', error);
  }
};

// Set online status (gọi một lần khi login)
export const setUserOnline = async (userId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/presence/online/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.warn('[Firebase Presence] Set online failed:', response.status);
      return;
    }
    
    console.log('[Firebase Presence] User set online via backend API:', userId);
  } catch (error) {
    console.warn('[Firebase Presence] Failed to set user online:', error);
  }
};

// Set offline status (gọi khi logout hoặc pagehide)
export const setUserOffline = async (userId: number): Promise<void> => {
  try {
    // Best effort - không chờ response vì có thể tab đang đóng
    fetch(`${API_BASE_URL}/presence/offline/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      credentials: 'include',
      keepalive: true // Cho phép request tiếp tục sau khi tab đóng
    }).catch(() => {
      // Ignore errors - heartbeat window sẽ tự động handle offline
    });
    
    console.log('[Firebase Presence] User set offline via backend API:', userId);
  } catch (error) {
    // Ignore errors - heartbeat window sẽ tự động handle offline
    console.warn('[Firebase Presence] Failed to set user offline (non-critical):', error);
  }
};

export const watchUserPresence = (userId: number, callback: (presence: { userId: number; online: boolean }) => void) => {
  const statusRef = ref(firebaseDb, `presence/users/${userId}/online`);
  
  console.log('[Firebase Presence] Watching user:', userId);
  
  onValue(statusRef, (snapshot) => {
    const online = snapshot.val();
    console.log('[Firebase Presence] Snapshot received for user:', userId, 'online:', online);
    
    // online có thể là true, false, hoặc null (nếu chưa có data)
    const onlineStatus = online === true;
    
    if (onlineStatus) {
      console.log('[Firebase Presence] User', userId, 'is ONLINE');
    } else {
      console.log('[Firebase Presence] User', userId, 'is OFFLINE');
    }
    
    callback({
      userId,
      online: onlineStatus
    });
  }, (error) => {
    console.error('[Firebase Presence] Error watching user:', userId, error);
    // Callback với offline nếu có lỗi
    callback({
      userId,
      online: false
    });
  });
  
  return () => {
    console.log('[Firebase Presence] Unsubscribing from user:', userId);
    off(statusRef);
  };
};

export const watchMultipleUsersPresence = (userIds: number[], callback: (presence: { userId: number; online: boolean }) => void) => {
  console.log('[Firebase Presence] Watching multiple users:', userIds);
  
  if (userIds.length === 0) {
    console.log('[Firebase Presence] No users to watch');
    return () => {};
  }
  
  // onValue tự động trigger callback ngay khi subscribe, nên không cần đọc manual
  const unsubscribes = userIds.map(userId => {
    return watchUserPresence(userId, callback);
  });
  
  return () => {
    console.log('[Firebase Presence] Unsubscribing from multiple users:', userIds);
    unsubscribes.forEach(unsub => unsub());
  };
};

