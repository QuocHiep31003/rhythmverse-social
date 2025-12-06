import { apiClient } from "./config";

/**
 * Mark a single notification as read via backend API
 * Backend will update Firebase after marking as read
 */
export const markNotificationAsRead = async (userId: number, notificationId: string): Promise<void> => {
  try {
    await apiClient.put(`/notifications/${userId}/${notificationId}/read`);
    console.log('✅ [Notifications API] Notification marked as read:', { userId, notificationId });
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to mark notification as read';
    throw new Error(errorMsg);
  }
};

/**
 * Mark multiple notifications as read via backend API
 * Backend will update Firebase after marking as read
 */
export const markNotificationsAsRead = async (userId: number, notificationIds: string[]): Promise<void> => {
  if (!notificationIds.length) return;
  
  try {
    // Gọi API cho từng notification (hoặc có thể có batch API)
    // Nếu backend có batch API, nên dùng batch API thay vì loop
    await Promise.all(
      notificationIds.map(id => markNotificationAsRead(userId, id))
    );
    console.log('✅ [Notifications API] All notifications marked as read:', { userId, count: notificationIds.length });
  } catch (error) {
    console.error('❌ [Notifications API] Failed to mark notifications as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read via backend API
 * Backend will update Firebase after marking all as read
 */
export const markAllNotificationsAsRead = async (userId: number): Promise<void> => {
  try {
    await apiClient.put(`/notifications/${userId}/read-all`);
    console.log('✅ [Notifications API] All notifications marked as read:', { userId });
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to mark all notifications as read';
    throw new Error(errorMsg);
  }
};









