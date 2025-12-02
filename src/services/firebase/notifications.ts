import { ref, onValue, query, orderByKey, limitToLast } from 'firebase/database';
import { firebaseDb } from '@/config/firebase-config';

export interface NotificationDTO {
  id?: string; // Firebase key
  type?: 'MESSAGE' | 'SHARE' | 'INVITE' | 'INVITE_ACCEPTED' | 'INVITE_REJECTED' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED' | 'PLAYLIST_BANNED' | 'PLAYLIST_WARNED' | 'PLAYLIST_RESTORED' | 'SUBSCRIPTION_EXPIRING_SOON';
  title?: string;
  body?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string | null;
  metadata?: { [key: string]: unknown; playlistName?: string; songName?: string; albumName?: string; type?: string; playlistId?: number; warningCount?: number; banReason?: string; warningReason?: string; planName?: string; planDetailName?: string; daysBeforeExpiry?: number };
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
    
    // ✅ Log tất cả notification types để debug - kiểm tra read status
    const notificationTypes = notifications.map(n => ({ 
      id: n.id, 
      type: n.type, 
      read: n.read,
      readType: typeof n.read, // Log type của read để debug
      senderName: n.senderName 
    }));
    // ✅ Coi undefined/null là unread (chưa đọc)
    const unreadNotifications = notifications.filter(n => n.read !== true);
    const unreadTypes = unreadNotifications.map(n => n.type);
    
    // ✅ Log breakdown theo type để debug friend request
    const byType = notifications.reduce((acc, n) => {
      const type = n.type || 'UNKNOWN';
      if (!acc[type]) acc[type] = { total: 0, unread: 0, read: 0 };
      acc[type].total++;
      if (n.read === true) acc[type].read++;
      else acc[type].unread++;
      return acc;
    }, {} as Record<string, { total: number; unread: number; read: number }>);
    
    const friendRequests = notifications.filter(n => n.type === 'FRIEND_REQUEST');
    const invites = notifications.filter(n => n.type === 'INVITE');
    const playlistBanned = notifications.filter(n => n.type === 'PLAYLIST_BANNED');
    const playlistWarned = notifications.filter(n => n.type === 'PLAYLIST_WARNED');
    const playlistRestored = notifications.filter(n => n.type === 'PLAYLIST_RESTORED');
    
    console.log('[Firebase Notifications] Notification types:', {
      total: notifications.length,
      unread: unreadNotifications.length,
      unreadTypes: unreadTypes,
      byType: byType, // ✅ Breakdown theo type
      readStatusBreakdown: {
        true: notifications.filter(n => n.read === true).length,
        false: notifications.filter(n => n.read === false).length,
        undefined: notifications.filter(n => n.read === undefined).length,
        null: notifications.filter(n => n.read === null).length
      },
      friendRequests: {
        total: friendRequests.length,
        unread: friendRequests.filter(n => n.read !== true).length,
        read: friendRequests.filter(n => n.read === true).length,
        details: friendRequests.slice(0, 5).map(n => ({
          id: n.id,
          read: n.read,
          senderName: n.senderName,
          createdAt: n.createdAt
        }))
      },
      invites: {
        total: invites.length,
        unread: invites.filter(n => n.read !== true).length,
        read: invites.filter(n => n.read === true).length,
        details: invites.slice(0, 5).map(n => ({
          id: n.id,
          read: n.read,
          senderName: n.senderName,
          createdAt: n.createdAt
        }))
      },
      playlistModeration: {
        banned: {
          total: playlistBanned.length,
          unread: playlistBanned.filter(n => n.read !== true).length,
          details: playlistBanned.slice(0, 5).map(n => ({
            id: n.id,
            type: n.type,
            read: n.read,
            playlistName: n.metadata?.playlistName,
            createdAt: n.createdAt
          }))
        },
        warned: {
          total: playlistWarned.length,
          unread: playlistWarned.filter(n => n.read !== true).length,
          details: playlistWarned.slice(0, 5).map(n => ({
            id: n.id,
            type: n.type,
            read: n.read,
            playlistName: n.metadata?.playlistName,
            warningCount: n.metadata?.warningCount,
            createdAt: n.createdAt
          }))
        },
        restored: {
          total: playlistRestored.length,
          unread: playlistRestored.filter(n => n.read !== true).length,
          details: playlistRestored.slice(0, 5).map(n => ({
            id: n.id,
            type: n.type,
            read: n.read,
            playlistName: n.metadata?.playlistName,
            createdAt: n.createdAt
          }))
        }
      }
    });
    
    // ✅ Log chi tiết friend requests để debug
    if (friendRequests.length > 0) {
      console.log('[Firebase Notifications] 🔍 Friend Requests Details:', friendRequests.map(n => ({
        id: n.id,
        type: n.type,
        read: n.read,
        readType: typeof n.read,
        senderId: n.senderId,
        senderName: n.senderName,
        createdAt: n.createdAt,
        body: n.body
      })));
    } else {
      console.log('[Firebase Notifications] ⚠️ No FRIEND_REQUEST notifications found!');
    }
    
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
