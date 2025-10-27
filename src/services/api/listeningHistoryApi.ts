const API_BASE_URL = "http://localhost:8080/api";

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to record listen: ${response.statusText}`);
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
  getByUser: async (userId: number): Promise<ListeningHistoryDTO[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listening-history/user/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listening history: ${response.statusText}`);
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
   * Delete a specific listening history entry
   */
  delete: async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listening-history/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete listening history: ${response.statusText}`);
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
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listening history: ${response.statusText}`);
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
