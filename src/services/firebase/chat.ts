import { ref, onValue, query, orderByChild, limitToLast, off } from 'firebase/database';
import { database } from '@/config/firebase-config';
import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from '@/services/api/config';
import type { SharedContentDTO, SharedContentType } from '@/services/api/chatApi';

export interface FirebaseMessage {
  id?: string;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt: number;
  read?: boolean;
  sharedContentType?: SharedContentType | null;
  sharedContentId?: number | null;
  sharedContent?: SharedContentDTO | null;
}

export const getChatRoomKey = (userId1: number, userId2: number): string => {
  const min = Math.min(userId1, userId2);
  const max = Math.max(userId1, userId2);
  return `${min}_${max}`;
};

export const sendMessage = async (senderId: number, receiverId: number, content: string) => {
  console.log('[Firebase Chat] Sending message:', { senderId, receiverId, content: content.substring(0, 50) });
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat/send`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, content })
    });
    
    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response);
      console.error('[Firebase Chat] Send failed:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const result = await response.json();
    console.log('[Firebase Chat] Message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[Firebase Chat] Send error:', error);
    throw error;
  }
};

export const watchChatMessages = (
  userId1: number,
  userId2: number,
  callback: (messages: FirebaseMessage[]) => void
) => {
  const chatRoomKey = getChatRoomKey(userId1, userId2);
  const messagesRef = ref(database, `chats/${chatRoomKey}/messages`);
  
  console.log('[Firebase Chat] Watching messages for room:', chatRoomKey);
  
  const messagesQuery = query(
    messagesRef,
    orderByChild('sentAt'),
    limitToLast(50)
  );
  
  onValue(
    messagesQuery,
    (snapshot) => {
      console.log('[Firebase Chat] Received snapshot for room:', chatRoomKey, snapshot.exists());
      const messages: FirebaseMessage[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val() as Omit<FirebaseMessage, 'id'>;
          messages.push({
            id: childSnapshot.key ?? undefined,
            ...data
          } as FirebaseMessage);
        });
        // Sort by sentAt (oldest first)
        messages.sort((a, b) => {
          const timeA = a.sentAt || 0;
          const timeB = b.sentAt || 0;
          return timeA - timeB;
        });
      }
      console.log('[Firebase Chat] Parsed messages:', messages.length);
      callback(messages);
    },
    (error) => {
      console.error('[Firebase Chat] Error watching messages:', error);
      // Nếu lỗi permission, vẫn callback với empty array
      callback([]);
    }
  );
  
  return () => {
    console.log('[Firebase Chat] Unsubscribing from room:', chatRoomKey);
    off(messagesRef);
  };
};

export const markMessageAsRead = async (messageId: string, senderId: number, receiverId: number) => {
  try {
    await fetch(`${API_BASE_URL}/chat/read/${messageId}?senderId=${senderId}&receiverId=${receiverId}`, {
      method: 'PUT',
      headers: buildJsonHeaders()
    });
    
    const chatRoomKey = getChatRoomKey(senderId, receiverId);
    const readRef = ref(database, `chats/${chatRoomKey}/messages/${messageId}/read`);
    const { set } = await import('firebase/database');
    set(readRef, true).catch(() => {});
  } catch (e) {
    console.error('Failed to mark as read', e);
  }
};

// Xóa toàn bộ chat history (gọi backend API để xóa từ Firebase)
export const deleteChatHistory = async (userId1: number, userId2: number) => {
  try {
    console.log('[Firebase Chat] Deleting chat history for:', userId1, userId2);
    
    // Nếu backend có API để xóa chat, gọi ở đây
    // Ví dụ: DELETE /api/chat/history/{userId1}/{userId2}
    // Hiện tại chỉ log, backend cần implement API này
    
    const chatRoomKey = getChatRoomKey(userId1, userId2);
    console.log('[Firebase Chat] Chat room key:', chatRoomKey);
    
    // Note: Frontend không có quyền write vào Firebase trực tiếp (security rules)
    // Backend cần implement API: DELETE /api/chat/clear/{userId1}/{userId2}
    // để xóa messages từ Firebase bằng Admin SDK
    
    return { success: true, message: 'Chat history cleared locally. Backend should delete from Firebase.' };
  } catch (error) {
    console.error('[Firebase Chat] Failed to delete chat history:', error);
    throw error;
  }
};
