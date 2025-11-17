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

export const chatApi = {
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
};
