import { apiClient } from "./config";

export type SharedContentType = "PLAYLIST" | "ALBUM" | "SONG";

export interface SharedPlaylistSongDTO {
  id?: number;
  name?: string;
  artists?: Array<string | { id?: number; name?: string }>;
  urlImageAlbum?: string | null;
  coverUrl?: string | null;
  duration?: string | number | null;
}

export interface SharedPlaylistDTO {
  id?: number;
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: string | null;
  songLimit?: number | null;
  songs?: SharedPlaylistSongDTO[];
  ownerId?: number | null;
}

export interface SharedAlbumDTO {
  id?: number;
  name?: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  artist?: { id?: number; name?: string } | null;
}

export interface SharedSongDTO {
  id?: number;
  name?: string;
  title?: string;
  coverUrl?: string | null;
  urlImageAlbum?: string | null;
  audioUrl?: string | null;
  duration?: string | number | null;
  playCount?: number | null;
  artists?: Array<string | { id?: number; name?: string }>;
}

export interface SharedContentDTO {
  type?: SharedContentType;
  id?: number;
  title?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  playlist?: SharedPlaylistDTO | null;
  album?: SharedAlbumDTO | null;
  song?: SharedSongDTO | null;
}

export interface ChatMessageDTO {
  id: number;
  senderId: number;
  receiverId: number;
  content: string; // Encrypted content (from database)
  contentPlain?: string; // Plaintext content (from Firebase, for display)
  sentAt: string;
  read: boolean;
  sharedContentType?: SharedContentType | null;
  sharedContentId?: number | null;
  sharedContent?: SharedContentDTO | null;
}

export interface PlaylistChatMessageDTO extends ChatMessageDTO {
  playlistId?: number;
  type?: "text" | "song" | "playlist" | "album" | "system";
}

export const chatApi = {
  sendMessage: async (senderId: number, receiverId: number, content: string): Promise<ChatMessageDTO> => {
    try {
      console.log('[chatApi] Sending message:', { senderId, receiverId, contentLength: content.length });
      const response = await apiClient.post<ChatMessageDTO>('/chat/send', { senderId, receiverId, content });
      console.log('[chatApi] Send message success:', response.data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send message';
      console.error('[chatApi] Send message error:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  getHistory: async (userId1: number, userId2: number): Promise<ChatMessageDTO[]> => {
    try {
      const response = await apiClient.get<ChatMessageDTO[]>(`/chat/history/${userId1}/${userId2}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get chat history';
      throw new Error(errorMsg);
    }
  },
  sharePlaylist: async (senderId: number, receiverId: number, playlistId: number) => {
    try {
      const response = await apiClient.post<ChatMessageDTO>('/chat/share/playlist', { senderId, receiverId, playlistId });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to share playlist';
      throw new Error(errorMsg);
    }
  },
  shareSong: async (senderId: number, receiverId: number, songId: number) => {
    try {
      const response = await apiClient.post<ChatMessageDTO>('/chat/share/song', { senderId, receiverId, songId });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to share song';
      throw new Error(errorMsg);
    }
  },
  shareAlbum: async (senderId: number, receiverId: number, albumId: number) => {
    try {
      const response = await apiClient.post<ChatMessageDTO>('/chat/share/album', { senderId, receiverId, albumId });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to share album';
      throw new Error(errorMsg);
    }
  },
  markConversationRead: async (userId: number, friendId: number): Promise<void> => {
    try {
      // Try PUT first (preferred format)
      await apiClient.put(`/chat/read/conversation?readerId=${userId}&partnerId=${friendId}`);
      return;
    } catch (error1: any) {
      try {
        // Try POST with readerId/partnerId
        await apiClient.post(`/chat/read/conversation?readerId=${userId}&partnerId=${friendId}`);
        return;
      } catch (error2: any) {
        try {
          // Try POST with userId/friendId (backward compatible)
          await apiClient.post(`/chat/read/conversation?userId=${userId}&friendId=${friendId}`);
          return;
        } catch (error3: any) {
          try {
            // Try legacy endpoint
            await apiClient.post(`/chat/read/${userId}/${friendId}`);
            return;
          } catch (error4: any) {
            // If all fail, log warning but don't throw (non-critical operation)
            console.warn('[chatApi] Failed to mark conversation as read:', error4.response?.data?.message || error4.message);
          }
        }
      }
    }
  },
  typingStart: async (roomId: string, userId: number): Promise<void> => {
    if (!userId) {
      console.warn('[chatApi] typingStart: userId is required but was', userId);
      throw new Error('userId is required');
    }
    try {
      console.log('[chatApi] Starting typing:', { roomId, userId });
      await apiClient.post(`/chat/rooms/${roomId}/typing/start?userId=${userId}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to start typing';
      console.warn('[chatApi] Failed to start typing:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  typingStop: async (roomId: string, userId: number): Promise<void> => {
    if (!userId) {
      console.warn('[chatApi] typingStop: userId is required but was', userId);
      throw new Error('userId is required');
    }
    try {
      console.log('[chatApi] Stopping typing:', { roomId, userId });
      await apiClient.post(`/chat/rooms/${roomId}/typing/stop?userId=${userId}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to stop typing';
      console.warn('[chatApi] Failed to stop typing:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  toggleReaction: async (messageId: number, emoji: string, userId: number): Promise<ChatMessageDTO> => {
    try {
      console.log('[chatApi] Toggling reaction:', { messageId, emoji, userId });
      const encodedEmoji = encodeURIComponent(emoji);
      const response = await apiClient.post<ChatMessageDTO>(`/chat/messages/${messageId}/reactions?userId=${userId}&emoji=${encodedEmoji}`);
      console.log('[chatApi] Toggle reaction success:', response.data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to toggle reaction';
      console.error('[chatApi] Toggle reaction error:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  removeReaction: async (messageId: number, userId: number): Promise<void> => {
    try {
      await apiClient.delete(`/chat/messages/${messageId}/reactions/${userId}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove reaction';
      console.warn('[chatApi] Failed to remove reaction:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  deleteMessage: async (messageId: number, userId: number): Promise<{ messageId: number; deleted: boolean }> => {
    try {
      console.log('[chatApi] Deleting message:', { messageId, userId });
      const response = await apiClient.delete<{ messageId: number; deleted: boolean }>(`/chat/messages/${messageId}?userId=${userId}`);
      console.log('[chatApi] Delete message success:', response.data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete message';
      console.error('[chatApi] Delete message error:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  getUnreadCounts: async (userId: number): Promise<{ userId: number; unreadCounts: Record<string, number>; totalUnread: number }> => {
    try {
      const response = await apiClient.get<{ userId: number; unreadCounts: Record<string, number>; totalUnread: number }>(`/chat/unread/${userId}`);
      return response.data;
    } catch (error: any) {
      console.warn('[chatApi] Failed to get unread counts:', error.response?.data?.message || error.message);
      // Return empty if API not available yet (backward compatibility)
      return { userId, unreadCounts: {}, totalUnread: 0 };
    }
  },
};

export const playlistChatApi = {
  sendText: async (playlistId: number, senderId: number, content: string): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/send', { playlistId, senderId, content });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send text';
      console.error("[playlistChatApi] sendText error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  shareSong: async (playlistId: number, senderId: number, songId: number): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/send', {
        playlistId,
        senderId,
        sharedType: "SONG",
        sharedContentId: songId,
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to share song';
      console.error("[playlistChatApi] shareSong error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  startListening: async (playlistId: number, hostId: number, songId: number, positionMs: number, playing: boolean): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/listening/start', { playlistId, hostId, songId, positionMs, playing });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to start listening';
      console.error("[playlistChatApi] startListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  joinListening: async (playlistId: number, userId: number): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/listening/join', { playlistId, userId });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to join listening';
      console.error("[playlistChatApi] joinListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  stopListening: async (playlistId: number, hostId: number): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/listening/stop', { playlistId, hostId });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to stop listening';
      console.error("[playlistChatApi] stopListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  leaveListening: async (playlistId: number, userId: number): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/listening/leave', { playlistId, userId });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to leave listening';
      console.error("[playlistChatApi] leaveListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  suggestSong: async (playlistId: number, userId: number, songId: number): Promise<void> => {
    try {
      await apiClient.post('/playlist-chat/listening/suggest', { playlistId, userId, songId });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to suggest song';
      console.error("[playlistChatApi] suggestSong error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  markRoomAsRead: async (playlistId: number, userId: number): Promise<void> => {
    try {
      await apiClient.post(`/playlist-chat/mark-read/${playlistId}`, { userId });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to mark room as read';
      console.error("[playlistChatApi] markRoomAsRead error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
};
