import { ref, onValue, query, orderByKey, limitToLast } from 'firebase/database';
import { database } from '@/config/firebase-config';

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
  const notificationsRef = ref(database, `notifications/${userId}`);
  
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

