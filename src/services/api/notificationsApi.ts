import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

/**
 * Mark a single notification as read via backend API
 * Backend will update Firebase after marking as read
 */
export const markNotificationAsRead = async (userId: number, notificationId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/notifications/${userId}/${notificationId}/read`, {
    method: 'PUT',
    headers: buildJsonHeaders(),
  });
  
  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error || 'Failed to mark notification as read');
  }
  
  console.log('✅ [Notifications API] Notification marked as read:', { userId, notificationId });
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
  const response = await fetch(`${API_BASE_URL}/notifications/${userId}/read-all`, {
    method: 'PUT',
    headers: buildJsonHeaders(),
  });
  
  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error || 'Failed to mark all notifications as read');
  }
  
  console.log('✅ [Notifications API] All notifications marked as read:', { userId });
};









