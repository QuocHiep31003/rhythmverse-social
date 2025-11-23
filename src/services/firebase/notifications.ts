import { ref, onValue, query, orderByKey, limitToLast } from 'firebase/database';
import { firebaseDb } from '@/config/firebase-config';

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
      const notification = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      } as NotificationDTO;
      notifications.push(notification);
      count++;
      return false; // Continue iteration
    });
    console.log('[Firebase Notifications] Snapshot received for user:', userId, 'exists:', snapshot.exists(), 'count:', count);
    
    // Log tất cả notification types để debug
    const notificationTypes = notifications.map(n => ({ 
      id: n.id, 
      type: n.type, 
      read: n.read,
      senderName: n.senderName 
    }));
    const unreadNotifications = notifications.filter(n => !n.read);
    const unreadTypes = unreadNotifications.map(n => n.type);
    console.log('[Firebase Notifications] Notification types:', {
      total: notifications.length,
      unread: unreadNotifications.length,
      unreadTypes: unreadTypes,
      sample: notificationTypes.slice(0, 5) // Chỉ log 5 cái đầu để không spam
    });
    
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

/**
 * ⚠️ DEPRECATED: markNotificationsAsRead đã được di chuyển sang notificationsApi.ts
 * 
 * FE KHÔNG được tự động update notifications trong Firebase.
 * Tất cả thay đổi notification (mark as read) phải qua backend API.
 * 
 * Sử dụng: import { markNotificationsAsRead } from '@/services/api/notificationsApi';
 * 
 * Backend sẽ mirror vào Firebase sau khi mark as read.
 * FE chỉ đọc từ Firebase để nhận updates realtime.
 */
