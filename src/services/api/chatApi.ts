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
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), playlistId: String(playlistId) });
    const res = await fetch(`${API_BASE_URL}/chat/share/playlist?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as ChatMessageDTO;
  },
  shareSong: async (senderId: number, receiverId: number, songId: number) => {
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), songId: String(songId) });
    const res = await fetch(`${API_BASE_URL}/chat/share/song?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as ChatMessageDTO;
  },
  shareAlbum: async (senderId: number, receiverId: number, albumId: number) => {
    const qs = new URLSearchParams({ senderId: String(senderId), receiverId: String(receiverId), albumId: String(albumId) });
    const res = await fetch(`${API_BASE_URL}/chat/share/album?${qs.toString()}`, {
      method: "POST",
      headers: buildAuthHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as ChatMessageDTO;
  },
};
