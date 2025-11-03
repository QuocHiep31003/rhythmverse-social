import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

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
  content: string;
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
};
