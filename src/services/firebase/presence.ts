import { ref, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase-config';
import { API_BASE_URL, buildJsonHeaders } from '@/services/api/config';

// Set presence qua backend API (backend sẽ write vào Firebase bằng Admin SDK)
export const setUserOnline = async (userId: number): Promise<void> => {
  try {
    // Gọi backend API để set presence (backend có Admin SDK nên có quyền write)
    const response = await fetch(`${API_BASE_URL}/presence/online/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders()
    });
    
    if (!response.ok) {
      // Nếu backend chưa implement API này, chỉ log warning thay vì throw error
      console.warn('[Firebase Presence] Backend API /presence/online/{userId} not available. Backend should set presence automatically on login.');
      return;
    }
    
    console.log('[Firebase Presence] User set online via backend API');
  } catch (error) {
    // Không throw error để không ảnh hưởng đến app
    console.warn('[Firebase Presence] Failed to set user online via API (backend may handle this automatically):', error);
  }
};

export const setUserOffline = async (userId: number): Promise<void> => {
  try {
    // Gọi backend API để set presence offline
    const response = await fetch(`${API_BASE_URL}/presence/offline/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders()
    });
    
    if (!response.ok) {
      // Nếu backend chưa implement API này, chỉ log warning
      console.warn('[Firebase Presence] Backend API /presence/offline/{userId} not available. Backend should set presence automatically on logout.');
      return;
    }
    
    console.log('[Firebase Presence] User set offline via backend API');
  } catch (error) {
    // Không throw error để không ảnh hưởng đến app
    console.warn('[Firebase Presence] Failed to set user offline via API (backend may handle this automatically):', error);
  }
};

export const watchUserPresence = (userId: number, callback: (presence: { userId: number; online: boolean }) => void) => {
  const userRef = ref(database, `presence/users/${userId}`);
  
  console.log('[Firebase Presence] Watching user:', userId);
  
  onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    console.log('[Firebase Presence] Snapshot received for user:', userId, 'data:', data);
    
    // onValue sẽ trigger mỗi khi value thay đổi, kể cả khi online: false
    // Nếu không có data (null) hoặc data.online = false, user là offline
    if (data && data.online === true) {
      const onlineStatus = true;
      console.log('[Firebase Presence] User', userId, 'is ONLINE');
      callback({
        userId,
        online: onlineStatus
      });
    } else {
      // Không có data hoặc online = false → OFFLINE
      const onlineStatus = false;
      console.log('[Firebase Presence] User', userId, 'is OFFLINE (data:', data, ')');
      callback({
        userId,
        online: onlineStatus
      });
    }
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
    off(userRef);
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

