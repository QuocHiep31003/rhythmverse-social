const API_BASE_URL = "http://localhost:8080/api";

export interface ListeningHistoryPayload {
  userId: number;
  songId: number | string;
}

export const listeningHistoryApi = {
  /**
   * Record a song play immediately when user clicks play
   */
  recordPlay: async (songId: number | string, userId: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/${songId}/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record play: ${response.statusText}`);
      }

      console.log("✅ Play recorded successfully");
    } catch (error) {
      console.error("❌ Error recording play:", error);
      // Don't throw - continue playing music even if logging fails
    }
  },

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
