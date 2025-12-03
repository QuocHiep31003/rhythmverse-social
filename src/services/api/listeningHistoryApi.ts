import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from './config';
import { artistsApi } from './artistApi';

export interface ListeningHistoryPayload {
  userId: number;
  songId: number | string;
  listenedDuration?: number;
  songDuration?: number;
  listenCount?: number;
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

export const listeningHistoryApi = {
  
  recordListen: async (payload: ListeningHistoryPayload): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listening-history`, {
        method: "POST",
        headers: buildJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      console.log("✅ Listening history recorded successfully");
    } catch (error) {
      console.error("❌ Error recording listening history:", error);
      throw error;
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
      const response = await fetch(`${API_BASE_URL}/listening-history/user/${userId}?page=${page}&size=${size}&sort=listenedAt,desc`, {
        method: "GET",
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        // Gracefully handle not found as empty history
        if (response.status === 404) {
          console.warn(`⚠️ Listening history not found for user ${userId}. Returning empty list.`);
          return [];
        }
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
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
    } catch (error) {
      console.error("❌ Error fetching listening history:", error);
      throw error;
    }
  },

  /**
   * Overview thống kê lịch sử nghe của user, có filter thời gian.
   * from/to là ISO string (optional).
   */
  getOverview: async (userId: number, params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append("from", params.from);
    if (params?.to) query.append("to", params.to);

    const qs = query.toString();
    const url = `${API_BASE_URL}/listening-history/user/${userId}/overview${qs ? `?${qs}` : ""}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      return response.json() as Promise<{
        totalListeningSeconds: number;
        songsPlayed: number;
        playlistsCreated: number;
        genres: { id: number; name: string; percentage: number }[];
        moods: { id: number; name: string; percentage: number }[];
      }>;
    } catch (error) {
      console.error("❌ Error fetching listening overview:", error);
      throw error;
    }
  },

  /**
   * Delete a specific listening history entry
   */
  delete: async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listening-history/${id}`, {
        method: "DELETE",
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      console.log("✅ Listening history deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting listening history:", error);
      throw error;
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
      const response = await fetch(`${API_BASE_URL}/listening-history?page=${page}&size=${size}`, {
        method: "GET",
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Listening history fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching listening history:", error);
      throw error;
    }
  },

  /**
   * Get top artists from listening history (most listened artists)
   */
  getTopArtists: async (userId: number, limit: number = 3): Promise<Array<{
    artistId: number;
    artistName: string;
    listenCount: number;
  }>> => {
    try {
      // Lấy listening history của user
      const history = await listeningHistoryApi.getByUser(userId, 0, 1000);
      
      // Đếm số lần nghe theo artist name (vì có thể không có ID)
      const artistCountsByName = new Map<string, number>();
      
      history.content.forEach((entry) => {
        const listenCount = entry.listenCount || 1;
        
        // Ưu tiên lấy từ song.artists (có ID)
        if (entry.song?.artists && Array.isArray(entry.song.artists)) {
          entry.song.artists.forEach((artist: { id: number; name: string }) => {
            if (artist.name) {
              const existing = artistCountsByName.get(artist.name) || 0;
              artistCountsByName.set(artist.name, existing + listenCount);
            }
          });
        }
        
        // Fallback: sử dụng artistNames nếu có
        if (entry.artistNames && Array.isArray(entry.artistNames) && entry.artistNames.length > 0) {
          entry.artistNames.forEach((artistName: string) => {
            if (artistName && artistName.trim()) {
              const existing = artistCountsByName.get(artistName.trim()) || 0;
              artistCountsByName.set(artistName.trim(), existing + listenCount);
            }
          });
        }
      });
      
      // Chuyển Map thành Array và sort theo listenCount
      const topArtistsByName = Array.from(artistCountsByName.entries())
        .map(([name, count]) => ({
          artistName: name,
          listenCount: count,
        }))
        .sort((a, b) => b.listenCount - a.listenCount)
        .slice(0, limit);
      
      // Tìm artist ID từ name (gọi API search)
      const topArtists: Array<{
        artistId: number;
        artistName: string;
        listenCount: number;
      }> = [];
      
      for (const artist of topArtistsByName) {
        try {
          // Tìm artist bằng tên
          const searchResult = await artistsApi.searchPublic(artist.artistName, {
            page: 0,
            size: 1,
          });
          
          if (searchResult?.content && searchResult.content.length > 0) {
            const foundArtist = searchResult.content[0];
            topArtists.push({
              artistId: foundArtist.id,
              artistName: artist.artistName,
              listenCount: artist.listenCount,
            });
          } else {
            // Nếu không tìm thấy, bỏ qua artist này
            console.warn(`Artist not found: ${artist.artistName}`);
          }
        } catch (error) {
          console.error(`Error searching artist ${artist.artistName}:`, error);
        }
      }
      
      return topArtists;
    } catch (error) {
      console.error("❌ Error fetching top artists:", error);
      return [];
    }
  },
};
