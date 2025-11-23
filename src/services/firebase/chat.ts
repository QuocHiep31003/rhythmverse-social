import { ref, onValue, onChildAdded, onChildChanged, onChildRemoved, query, orderByChild, limitToLast } from "firebase/database";
import { firebaseDb } from "@/config/firebase-config";
import { API_BASE_URL, buildJsonHeaders } from "@/services/api/config";
import type { SharedContentDTO, SharedContentType } from "@/services/api/chatApi";

export interface FirebaseMessage {
  id?: string;
  senderId: number;
  receiverId: number;
  content?: string; // Encrypted content (ciphertext)
  contentCipher?: string; // Encrypted content (alternative field name)
  contentPreview?: string; // Preview/rút gọn (tạm thời)
  contentPlain?: string; // Plaintext content (preferred for display)
  sentAt: number;
  read?: boolean;
  messageId?: number;
  sharedContentType?: SharedContentType | null;
  sharedContentId?: number | null;
  sharedContent?: SharedContentDTO | null;
}

export const getChatRoomKey = (userId1: number, userId2: number): string => {
  const min = Math.min(userId1, userId2);
  const max = Math.max(userId1, userId2);
  return `${min}_${max}`;
};

export const watchChatMessages = (
  userId1: number,
  userId2: number,
  callback: (messages: FirebaseMessage[]) => void
) => {
  const chatRoomKey = getChatRoomKey(userId1, userId2);
  const messagesRef = ref(firebaseDb, `chats/${chatRoomKey}/messages`);
  
  console.log('[Firebase Chat] Watching messages for room:', chatRoomKey);
  
  const messagesQuery = query(
    messagesRef,
    orderByChild('sentAt'),
    limitToLast(50)
  );
  
  const unsubscribe = onValue(
    messagesQuery,
    (snapshot) => {
      console.log('[Firebase Chat] Received snapshot for room:', chatRoomKey, snapshot.exists());
      const messages: FirebaseMessage[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val() as Omit<FirebaseMessage, 'id'>;
          // Priority: contentPlain > contentPreview > content/contentCipher
          // If only cipher/preview exists, we'll fetch full plaintext from API later
          const displayContent =
            data.contentPlain ??
            data.contentPreview ??
            (typeof data.content === 'string' ? data.content : '') ??
            (typeof data.contentCipher === 'string' ? data.contentCipher : '');
          const message: FirebaseMessage = {
            id: childSnapshot.key ?? undefined,
            ...data,
            content: displayContent,
            contentPlain: data.contentPlain ?? (data.contentPreview ? undefined : displayContent),
          };
          messages.push(message);
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
    unsubscribe();
  };
};

export const watchRoomMeta = (roomId: string, callback: (data: any | null) => void) => {
  const roomRef = ref(firebaseDb, `rooms/${roomId}`);
  const unsubscribe = onValue(
    roomRef,
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    },
    (error) => {
      console.error("[Firebase Chat] Error watching room meta:", error);
      callback(null);
    }
  );
  return () => unsubscribe();
};

export const watchTyping = (
  roomId: string,
  friendId: number,
  callback: (data: { isTyping: boolean; updatedAt?: number } | null) => void
) => {
  // Path theo chuẩn Messenger: typing/{roomKey}/{userId}
  const typingRef = ref(firebaseDb, `typing/${roomId}/${friendId}`);
  console.log('[Firebase Chat] Watching typing at:', `typing/${roomId}/${friendId}`);
  const unsubscribe = onValue(
    typingRef,
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      console.log('[Firebase Chat] Typing snapshot received:', { roomId, friendId, exists: snapshot.exists(), data });
      if (data && typeof data === 'object') {
        // Đảm bảo data có đúng format
        const typingData = {
          isTyping: Boolean(data.isTyping),
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined
        };
        callback(typingData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn("[Firebase Chat] Error watching typing:", error?.code || error?.message || error);
      callback(null);
    }
  );
  return () => unsubscribe();
};

export const watchReactions = (
  roomId: string,
  callback: (reactions: Record<string, Record<string, { emoji: string; userId: number }>>) => void
) => {
  // Actual Firebase structure: chats/{roomId}/reactions/{firebaseKey}/{userId}
  const reactionsRef = ref(firebaseDb, `chats/${roomId}/reactions`);
  console.log('[Firebase Chat] Watching reactions at:', `chats/${roomId}/reactions`);
  
  // Use a local state to track all reactions
  let currentReactions: Record<string, Record<string, { emoji: string; userId: number }>> = {};
  
  // Listen to initial value and all changes
  const unsubscribeValue = onValue(
    reactionsRef,
    (snapshot) => {
      const rawData = snapshot.exists() ? (snapshot.val() as Record<string, Record<string, { emoji: string; userId: number; reactedAt?: number; userName?: string }>>) : {};
      console.log('[Firebase Chat] Reactions snapshot (onValue):', { roomId, exists: snapshot.exists(), keys: Object.keys(rawData), rawData });
      
      // Transform data structure: { firebaseKey: { userId: { emoji, userId, ... } } }
      const data: Record<string, Record<string, { emoji: string; userId: number }>> = {};
      Object.entries(rawData).forEach(([firebaseKey, userReactions]) => {
        if (userReactions && typeof userReactions === 'object') {
          data[firebaseKey] = {};
          Object.entries(userReactions).forEach(([userIdStr, reaction]) => {
            if (reaction && typeof reaction === 'object' && reaction.emoji) {
              data[firebaseKey][userIdStr] = {
                emoji: reaction.emoji,
                userId: Number(userIdStr) || reaction.userId || 0,
              };
            }
          });
        }
      });
      
      currentReactions = data;
      console.log('[Firebase Chat] Transformed reactions (onValue):', data);
      callback(data);
    },
    (error) => {
      console.error("[Firebase Chat] Error watching reactions (onValue):", error);
      callback({});
    }
  );
  
  // Also listen to child changes for real-time updates at message level
  // When a new message gets its first reaction, onChildAdded fires
  const unsubscribeAdded = onChildAdded(reactionsRef, (snapshot) => {
    const firebaseKey = snapshot.key;
    const userReactions = snapshot.val() as Record<string, { emoji: string; userId: number; reactedAt?: number; userName?: string }> | null;
    if (!firebaseKey || !userReactions) return;
    
    console.log('[Firebase Chat] Reaction added for message:', firebaseKey, userReactions);
    
    // Update current reactions - merge with existing
    if (!currentReactions[firebaseKey]) {
      currentReactions[firebaseKey] = {};
    }
    Object.entries(userReactions).forEach(([userIdStr, reaction]) => {
      if (reaction && typeof reaction === 'object' && reaction.emoji) {
        currentReactions[firebaseKey][userIdStr] = {
          emoji: reaction.emoji,
          userId: Number(userIdStr) || reaction.userId || 0,
        };
      }
    });
    
    // Trigger callback with updated reactions
    callback({ ...currentReactions });
  });
  
  // When reactions for an existing message change (new user reacts or updates)
  const unsubscribeChanged = onChildChanged(reactionsRef, (snapshot) => {
    const firebaseKey = snapshot.key;
    const userReactions = snapshot.val() as Record<string, { emoji: string; userId: number; reactedAt?: number; userName?: string }> | null;
    if (!firebaseKey || !userReactions) return;
    
    console.log('[Firebase Chat] Reaction changed for message:', firebaseKey, userReactions);
    
    // Replace all reactions for this message (backend sends full object)
    currentReactions[firebaseKey] = {};
    Object.entries(userReactions).forEach(([userIdStr, reaction]) => {
      if (reaction && typeof reaction === 'object' && reaction.emoji) {
        currentReactions[firebaseKey][userIdStr] = {
          emoji: reaction.emoji,
          userId: Number(userIdStr) || reaction.userId || 0,
        };
      }
    });
    
    // Trigger callback with updated reactions
    callback({ ...currentReactions });
  });
  
  // When all reactions for a message are removed
  const unsubscribeRemoved = onChildRemoved(reactionsRef, (snapshot) => {
    const firebaseKey = snapshot.key;
    if (!firebaseKey) return;
    
    console.log('[Firebase Chat] All reactions removed for message:', firebaseKey);
    delete currentReactions[firebaseKey];
    callback({ ...currentReactions });
  });
  
  return () => {
    unsubscribeValue();
    unsubscribeAdded();
    unsubscribeChanged();
    unsubscribeRemoved();
  };
};

export const watchMessageIndex = (
  roomId: string,
  callback: (index: Record<string, string>) => void
) => {
  // messageIndex maps messageId (number) -> firebaseKey (string)
  // Path: chats/{roomId}/messageIndex
  const indexRef = ref(firebaseDb, `chats/${roomId}/messageIndex`);
  console.log('[Firebase Chat] Watching messageIndex at:', `chats/${roomId}/messageIndex`);
  const unsubscribe = onValue(
    indexRef,
    (snapshot) => {
      const index = snapshot.exists() ? (snapshot.val() as Record<string, string>) : {};
      console.log('[Firebase Chat] MessageIndex snapshot:', { roomId, index });
      callback(index);
    },
    (error) => {
      console.error("[Firebase Chat] Error watching messageIndex:", error);
      callback({});
    }
  );
  return () => unsubscribe();
};

export const markMessageAsRead = async (messageId: string, senderId: number, receiverId: number) => {
  try {
    await fetch(`${API_BASE_URL}/chat/read/${messageId}?senderId=${senderId}&receiverId=${receiverId}`, {
      method: 'PUT',
      headers: buildJsonHeaders()
    });
    
    const chatRoomKey = getChatRoomKey(senderId, receiverId);
    const readRef = ref(firebaseDb, `chats/${chatRoomKey}/messages/${messageId}/read`);
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
