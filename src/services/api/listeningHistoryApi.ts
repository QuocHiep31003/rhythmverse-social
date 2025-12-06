import { apiClient } from './config';
import type { Song } from './songApi';

export interface ListeningHistoryPayload {
  userId: number;
  songId: number | string;
  listenedDuration?: number;
  songDuration?: number;
  listenCount?: number;
  sourceId?: number; // ID của album hoặc playlist (null nếu là song độc lập)
  sourceType?: "ALBUM" | "PLAYLIST" | "SONG_INDEPENDENT"; // Nguồn phát bài hát
  sessionId?: string; // Session ID để track cùng một lần nghe
  playSource?: string; // ListeningPlaySource enum
}

export interface ListeningHistoryDTO {
  id?: number;
  userId: number;
  songId: number;
  listenedDuration?: number;
  songDuration?: number;
  listenCount?: number;
  listenedAt?: string;
  songName?: string;
  artistNames?: string[];
  sourceId?: number; // ID của album hoặc playlist
  sourceType?: "ALBUM" | "PLAYLIST" | "SONG_INDEPENDENT"; // Nguồn phát bài hát
  listenedPercentage?: number; // % đã nghe (0-100)
  song?: {
    id: number;
    name?: string;
    title?: string;
    duration?: number;
    cover?: string;
    audioUrl?: string;
    audio?: string;
    playCount?: number;
    artistNames?: string[];
    artists?: Array<{ name: string }>;
    album?: {
      name: string;
    };
  };
}

export interface ArtistTopSongsResponse {
  artistId: number;
  artistName: string;
  listenCount: number;
  songs: Song[];
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
}

export const listeningHistoryApi = {

  recordListen: async (payload: ListeningHistoryPayload): Promise<ListeningHistoryDTO> => {
    try {
      const response = await apiClient.post<ListeningHistoryDTO>('/listening-history', payload);
      console.log("✅ Listening history recorded successfully, ID:", response.data.id);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error recording listening history:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to record listening history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get listening history for a specific user (paginated)
   */
  getByUser: async (userId: number, page: number = 0, size: number = 10): Promise<{
    content: ListeningHistoryDTO[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> => {
    try {
      const response = await apiClient.get(`/listening-history/user/${userId}?page=${page}&size=${size}&sort=listenedAt,desc`);
      const data = response.data;
      
      // Backend trả về Page object với structure: { content: [], totalElements: number, ... }
      if (Array.isArray(data)) {
        // Fallback nếu backend trả về array thay vì Page object
        return {
          content: data,
          totalElements: data.length,
          totalPages: Math.ceil(data.length / size),
          size,
          number: page,
          first: page === 0,
          last: data.length < size,
          empty: data.length === 0,
        };
      }
      console.log("✅ Listening history fetched successfully:", data);
      return data;
    } catch (error: any) {
      // Gracefully handle not found as empty history
      if (error.response?.status === 404) {
        console.warn(`⚠️ Listening history not found for user ${userId}. Returning empty list.`);
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true,
          empty: true,
        };
      }
      console.error("❌ Error fetching listening history:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch listening history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get listening history for current authenticated user (from token) - paginated
   */
  getMyListeningHistory: async (page: number = 0, size: number = 10): Promise<{
    content: ListeningHistoryDTO[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> => {
    try {
      const response = await apiClient.get(`/listening-history/me?page=${page}&size=${size}&sort=listenedAt,desc`);
      const data = response.data;
      
      if (Array.isArray(data)) {
        return {
          content: data,
          totalElements: data.length,
          totalPages: Math.ceil(data.length / size),
          size,
          number: page,
          first: page === 0,
          last: data.length < size,
          empty: data.length === 0,
        };
      }
      console.log("✅ My listening history fetched successfully:", data);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`⚠️ Listening history not found for current user. Returning empty list.`);
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true,
          empty: true,
        };
      }
      console.error("❌ Error fetching my listening history:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch my listening history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Overview thống kê lịch sử nghe của user, có filter thời gian.
   * from/to là ISO string (optional).
   */
  getOverview: async (userId: number, params?: { from?: string; to?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.from) query.append("from", params.from);
      if (params?.to) query.append("to", params.to);

      const qs = query.toString();
      const url = `/listening-history/user/${userId}/overview${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<{
        totalListeningSeconds: number;
        songsPlayed: number;
        playlistsCreated: number;
        genres: { id: number; name: string; percentage: number }[];
        moods: { id: number; name: string; percentage: number }[];
      }>(url);

      return response.data;
    } catch (error: any) {
      console.error("❌ Error fetching listening overview:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch listening overview';
      throw new Error(errorMessage);
    }
  },

  /**
   * Overview thống kê lịch sử nghe của user hiện tại (từ token), có filter thời gian.
   * from/to là ISO string (optional).
   */
  getMyOverview: async (params?: { from?: string; to?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.from) query.append("from", params.from);
      if (params?.to) query.append("to", params.to);

      const qs = query.toString();
      const url = `/listening-history/me/overview${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<{
        totalListeningSeconds: number;
        songsPlayed: number;
        playlistsCreated: number;
        genres: { id: number; name: string; percentage: number }[];
        moods: { id: number; name: string; percentage: number }[];
      }>(url);

      return response.data;
    } catch (error: any) {
      console.error("❌ Error fetching my listening overview:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch my listening overview';
      throw new Error(errorMessage);
    }
  },

  /**
   * Update duration của listening history (nhẹ hơn PUT, chỉ update duration)
   * Dùng để track duration từ frontend định kỳ (mỗi 10-15s) hoặc khi pause/stop
   */
  updateDuration: async (id: number, listenedDuration: number, songDuration?: number): Promise<ListeningHistoryDTO> => {
    try {
      const response = await apiClient.patch<ListeningHistoryDTO>(`/listening-history/${id}/duration`, {
        listenedDuration,
        songDuration,
      });
      console.log("✅ Listening history duration updated successfully");
      return response.data;
    } catch (error: any) {
      console.error("❌ Error updating listening history duration:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update listening history duration';
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a specific listening history entry
   */
  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/listening-history/${id}`);
      console.log("✅ Listening history deleted successfully");
    } catch (error: any) {
      console.error("❌ Error deleting listening history:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete listening history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all listening history with pagination
   */
  getAll: async (page: number = 0, size: number = 20): Promise<{
    content: ListeningHistoryDTO[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> => {
    try {
      const response = await apiClient.get(`/listening-history?page=${page}&size=${size}`);
      const data = response.data;
      console.log("✅ Listening history fetched successfully:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Error fetching listening history:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch listening history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get top artists from listening history (most listened artists)
   */
  getTopArtistSongs: async (
    userId: number,
    params?: { artists?: number; songLimit?: number; lookbackDays?: number }
  ): Promise<ArtistTopSongsResponse[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.artists) query.append("artists", params.artists.toString());
      if (params?.songLimit) query.append("songLimit", params.songLimit.toString());
      if (params?.lookbackDays) query.append("lookbackDays", params.lookbackDays.toString());
      const qs = query.toString();
      const url = `/listening-history/user/${userId}/top-artist-songs${qs ? `?${qs}` : ""}`;

      const response = await apiClient.get<ArtistTopSongsResponse[]>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("❌ Error fetching top artist songs:", error);
      return [];
    }
  },

  /**
   * Wrapper để giữ backward-compat: chỉ trả danh sách artist (không kèm songs)
   * nhưng nguồn dữ liệu đã chuyển sang BE.
   */
  getTopArtists: async (userId: number, limit: number = 3): Promise<Array<{
    artistId: number;
    artistName: string;
    listenCount: number;
  }>> => {
    const data = await listeningHistoryApi.getTopArtistSongs(userId, { artists: limit, songLimit: 1 });
    return (data || []).map((item) => ({
      artistId: item.artistId,
      artistName: item.artistName,
      listenCount: item.listenCount ?? 0,
    }));
  },
};
