import { ref, onValue, query, orderByKey, limitToLast, update } from 'firebase/database';
import { firebaseDb, firebaseAuth } from '@/config/firebase-config';

export interface NotificationDTO {
  id?: string; // Firebase key
  type?: 'MESSAGE' | 'SHARE' | 'INVITE' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED';
  title?: string;
  body?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string | null;
  metadata?: { [key: string]: unknown; playlistName?: string; songName?: string; albumName?: string; type?: string };
  createdAt?: string | number;
  read?: boolean;
}

export const watchNotifications = (
  userId: number,
  callback: (notifications: NotificationDTO[]) => void
) => {
  const notificationsRef = ref(firebaseDb, `notifications/${userId}`);
  
  console.log('[Firebase Notifications] Watching notifications for user:', userId);
  
  const notificationsQuery = query(
    notificationsRef,
    orderByKey(),
    limitToLast(50)
  );
  
  const unsubscribe = onValue(notificationsQuery, (snapshot) => {
    const notifications: NotificationDTO[] = [];
    let count = 0;
    snapshot.forEach((childSnapshot) => {
      notifications.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      } as NotificationDTO);
      count++;
      return false; // Continue iteration
    });
    console.log('[Firebase Notifications] Snapshot received for user:', userId, 'exists:', snapshot.exists(), 'count:', count);
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => {
      const timeA = a.createdAt || a.id || 0;
      const timeB = b.createdAt || b.id || 0;
      if (typeof timeA === 'string' && typeof timeB === 'string') {
        return timeB.localeCompare(timeA);
      }
      return Number(timeB) - Number(timeA);
    });
    console.log('[Firebase Notifications] Parsed notifications:', notifications.length);
    callback(notifications);
  }, (error) => {
    console.error('[Firebase Notifications] Error watching notifications:', userId, error);
  });
  
  return () => {
    console.log('[Firebase Notifications] Unsubscribing from user:', userId);
    unsubscribe();
  };
};

// Track failed attempts để tránh spam log
let hasLoggedPermissionError = false;

export const markNotificationsAsRead = async (userId: number, notificationIds: string[]) => {
  if (!notificationIds.length) return;
  
  // Kiểm tra Firebase auth state trước khi cập nhật
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    // Im lặng - không log vì đã có optimistic update
    return;
  }
  
  const updates: Record<string, boolean> = {};
  notificationIds.forEach((id) => {
    if (id) {
      updates[`${id}/read`] = true;
    }
  });
  if (!Object.keys(updates).length) return;
  
  try {
    await update(ref(firebaseDb, `notifications/${userId}`), updates);
    // Reset flag khi thành công
    hasLoggedPermissionError = false;
  } catch (error: any) {
    // Chỉ log lỗi permission_denied một lần để tránh spam console
    if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('permission_denied')) {
      if (!hasLoggedPermissionError) {
        console.warn('[Firebase Notifications] Permission denied - có thể do Firebase security rules. UI vẫn hoạt động bình thường với optimistic updates.');
        hasLoggedPermissionError = true;
      }
    } else {
      // Log các lỗi khác (ít xảy ra hơn)
      console.warn('[Firebase Notifications] Failed to mark as read', error?.message || error);
    }
    // Không throw error để tránh làm gián đoạn UI - optimistic update đã xử lý UI rồi
  }
};
