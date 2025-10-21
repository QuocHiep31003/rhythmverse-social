const API_BASE_URL = "http://localhost:8080/api";

export interface ListeningHistoryPayload {
  userId: number;
  songId: number | string;
}

export const listeningHistoryApi = {
  /**
   * Record a song listen when user has listened to at least 50% of the song
   */
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
};
