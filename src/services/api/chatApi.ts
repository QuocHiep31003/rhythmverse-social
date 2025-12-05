import { API_BASE_URL, buildJsonHeaders, parseErrorResponse, buildAuthHeaders } from "./config";

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
    console.log('[chatApi] Sending message to:', `${API_BASE_URL}/chat/send`, { senderId, receiverId, contentLength: content.length });
    const res = await fetch(`${API_BASE_URL}/chat/send`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, content }),
    });
    console.log('[chatApi] Response status:', res.status, res.statusText);
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error('[chatApi] Send message error:', errorMsg);
      throw new Error(errorMsg);
    }
    const result = await res.json();
    console.log('[chatApi] Send message success:', result);
    return result;
  },
  getHistory: async (userId1: number, userId2: number): Promise<ChatMessageDTO[]> => {
    const res = await fetch(`${API_BASE_URL}/chat/history/${userId1}/${userId2}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
  sharePlaylist: async (senderId: number, receiverId: number, playlistId: number) => {
    // First try JSON body (preferred)
    let res = await fetch(`${API_BASE_URL}/chat/share/playlist`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, playlistId }),
    });
    if (res.ok) return (await res.json()) as ChatMessageDTO;
    const jsonErr = await parseErrorResponse(res);
    // Backward compatibility: try query params if server expects it
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), playlistId: String(playlistId) });
    res = await fetch(`${API_BASE_URL}/chat/share/playlist?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(jsonErr || (await parseErrorResponse(res)));
    return (await res.json()) as ChatMessageDTO;
  },
  shareSong: async (senderId: number, receiverId: number, songId: number) => {
    let res = await fetch(`${API_BASE_URL}/chat/share/song`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, songId }),
    });
    if (res.ok) return (await res.json()) as ChatMessageDTO;
    const jsonErr = await parseErrorResponse(res);
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), songId: String(songId) });
    res = await fetch(`${API_BASE_URL}/chat/share/song?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(jsonErr || (await parseErrorResponse(res)));
    return (await res.json()) as ChatMessageDTO;
  },
  shareAlbum: async (senderId: number, receiverId: number, albumId: number) => {
    let res = await fetch(`${API_BASE_URL}/chat/share/album`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ senderId, receiverId, albumId }),
    });
    if (res.ok) return (await res.json()) as ChatMessageDTO;
    const jsonErr = await parseErrorResponse(res);
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), albumId: String(albumId) });
    res = await fetch(`${API_BASE_URL}/chat/share/album?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(jsonErr || (await parseErrorResponse(res)));
    return (await res.json()) as ChatMessageDTO;
  },
  markConversationRead: async (userId: number, friendId: number): Promise<void> => {
    // 🔴 DEBUG: Log mỗi lần mark as read được gọi
    console.log('🔴 [DEBUG] markConversationRead called:', { userId, friendId });
    console.trace('🔴 [DEBUG] Call stack:');
    
    // Try correct endpoint formats theo chuẩn Messenger
    // Format 1: PUT /api/chat/read/conversation?readerId={userId}&partnerId={friendId} (khuyến nghị)
    let res = await fetch(`${API_BASE_URL}/chat/read/conversation?readerId=${userId}&partnerId=${friendId}`, {
      method: "PUT",
      headers: buildJsonHeaders(),
    });
    if (res.ok) {
      console.log('✅ [DEBUG] Marked conversation as read successfully (Format 1)');
      return;
    }
    
    // Format 2: POST /api/chat/read/conversation?readerId={userId}&partnerId={friendId}
    const errorMsg1 = await parseErrorResponse(res);
    res = await fetch(`${API_BASE_URL}/chat/read/conversation?readerId=${userId}&partnerId=${friendId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (res.ok) {
      console.log('✅ [DEBUG] Marked conversation as read successfully (Format 2)');
      return;
    }
    
    // Format 3: POST /api/chat/read/conversation?userId={userId}&friendId={friendId} (backward compatible)
    const errorMsg2 = await parseErrorResponse(res);
    res = await fetch(`${API_BASE_URL}/chat/read/conversation?userId=${userId}&friendId=${friendId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (res.ok) {
      console.log('✅ [DEBUG] Marked conversation as read successfully (Format 3)');
      return;
    }
    
    // Format 4: Legacy endpoint POST /api/chat/read/{userId}/{friendId}
    const errorMsg3 = await parseErrorResponse(res);
    res = await fetch(`${API_BASE_URL}/chat/read/${userId}/${friendId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (res.ok) {
      console.log('✅ [DEBUG] Marked conversation as read successfully (Format 4)');
      return;
    }
    
    // If all fail, log warning but don't throw (non-critical operation)
    const finalError = await parseErrorResponse(res);
    console.warn('[chatApi] Failed to mark conversation as read:', errorMsg1 || errorMsg2 || errorMsg3 || finalError);
  },
  typingStart: async (roomId: string, userId: number): Promise<void> => {
    if (!userId) {
      console.warn('[chatApi] typingStart: userId is required but was', userId);
      throw new Error('userId is required');
    }
    console.log('[chatApi] Starting typing:', { roomId, userId });
    const res = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/typing/start?userId=${userId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    console.log('[chatApi] Typing start response:', res.status, res.statusText);
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.warn('[chatApi] Failed to start typing:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  typingStop: async (roomId: string, userId: number): Promise<void> => {
    if (!userId) {
      console.warn('[chatApi] typingStop: userId is required but was', userId);
      throw new Error('userId is required');
    }
    console.log('[chatApi] Stopping typing:', { roomId, userId });
    const res = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/typing/stop?userId=${userId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    console.log('[chatApi] Typing stop response:', res.status, res.statusText);
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.warn('[chatApi] Failed to stop typing:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  toggleReaction: async (messageId: number, emoji: string, userId: number): Promise<ChatMessageDTO> => {
    console.log('[chatApi] Toggling reaction:', { messageId, emoji, userId });
    // Endpoint mới: /api/chat/messages/{messageId}/reactions?userId={userId}&emoji={emoji}
    const encodedEmoji = encodeURIComponent(emoji);
    const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}/reactions?userId=${userId}&emoji=${encodedEmoji}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    console.log('[chatApi] Toggle reaction response:', res.status, res.statusText);
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error('[chatApi] Toggle reaction error:', errorMsg);
      throw new Error(errorMsg);
    }
    const result = await res.json();
    console.log('[chatApi] Toggle reaction success:', result);
    return result;
  },
  removeReaction: async (messageId: number, userId: number): Promise<void> => {
    // Endpoint mới: DELETE /api/chat/messages/{messageId}/reactions/{userId}
    const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}/reactions/${userId}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.warn('[chatApi] Failed to remove reaction:', errorMsg);
      throw new Error(errorMsg);
    }
  },
  deleteMessage: async (messageId: number, userId: number): Promise<{ messageId: number; deleted: boolean }> => {
    console.log('[chatApi] Deleting message:', { messageId, userId });
    const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}?userId=${userId}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    console.log('[chatApi] Delete message response:', res.status, res.statusText);
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error('[chatApi] Delete message error:', errorMsg);
      throw new Error(errorMsg);
    }
    const result = await res.json();
    console.log('[chatApi] Delete message success:', result);
    return result;
  },
  getUnreadCounts: async (userId: number): Promise<{ userId: number; unreadCounts: Record<string, number>; totalUnread: number }> => {
    const res = await fetch(`${API_BASE_URL}/chat/unread/${userId}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.warn('[chatApi] Failed to get unread counts:', errorMsg);
      // Return empty if API not available yet (backward compatibility)
      return { userId, unreadCounts: {}, totalUnread: 0 };
    }
    return await res.json();
  },
};

export const playlistChatApi = {
  sendText: async (playlistId: number, senderId: number, content: string): Promise<void> => {
    const payload = { playlistId, senderId, content };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/send`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] sendText error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  shareSong: async (playlistId: number, senderId: number, songId: number): Promise<void> => {
    const payload = {
      playlistId,
      senderId,
      sharedType: "SONG",
      sharedContentId: songId,
    };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/send`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] shareSong error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  shareAlbum: async (playlistId: number, senderId: number, albumId: number): Promise<void> => {
    const payload = {
      playlistId,
      senderId,
      sharedType: "ALBUM",
      sharedContentId: albumId,
    };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/send`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] shareAlbum error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  sharePlaylist: async (playlistId: number, senderId: number, sharedPlaylistId: number): Promise<void> => {
    const payload = {
      playlistId,
      senderId,
      sharedType: "PLAYLIST",
      sharedContentId: sharedPlaylistId,
    };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/send`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] sharePlaylist error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  startListening: async (playlistId: number, hostId: number, songId: number, positionMs: number, playing: boolean, initialQueue?: number[]): Promise<void> => {
    const payload: any = { playlistId, hostId, songId, positionMs, playing };
    if (initialQueue && initialQueue.length > 0) {
      payload.initialQueue = initialQueue;
    }
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/start`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] startListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  joinListening: async (playlistId: number, userId: number): Promise<void> => {
    const payload = { playlistId, userId };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/join`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] joinListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  stopListening: async (playlistId: number, hostId: number): Promise<void> => {
    const payload = { playlistId, hostId };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/stop`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] stopListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  leaveListening: async (playlistId: number, userId: number): Promise<void> => {
    const payload = { playlistId, userId };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/leave`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] leaveListening error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  suggestSong: async (playlistId: number, userId: number, songId: number): Promise<void> => {
    const payload = { playlistId, userId, songId };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/suggest`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] suggestSong error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  markRoomAsRead: async (playlistId: number, userId: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/playlist-chat/mark-read/${playlistId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] markRoomAsRead error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
  removeFromQueue: async (playlistId: number, songId: number): Promise<void> => {
    const payload = { playlistId, songId };
    const res = await fetch(`${API_BASE_URL}/playlist-chat/listening/queue/${songId}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorResponse(res);
      console.error("[playlistChatApi] removeFromQueue error:", errorMsg);
      throw new Error(errorMsg);
    }
  },
};
