import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from './config';

export interface ListeningHistoryPayload {
  userId: number;
  songId: number | string;
}

export interface ListeningHistoryDTO {
  id?: number;
  userId: number;
  songId: number;
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
   * Get listening history for a specific user
   */
  getByUser: async (userId: number, page: number = 0, size: number = 100): Promise<ListeningHistoryDTO[]> => {
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
      const list = Array.isArray(data) ? data : (data?.content ?? []);
      console.log("✅ Listening history fetched successfully:", list);
      return list;
    } catch (error) {
      console.error("❌ Error fetching listening history:", error);
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
};
