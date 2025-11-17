import { apiClient, API_BASE_URL, fetchWithAuth } from './config';

export interface SongContributor {
  id: number;
  artistId: number;
  artistName: string;
  role: 'PERFORMER_MAIN' | 'PERFORMER_FEAT' | 'COMPOSER' | 'LYRICIST' | 'PRODUCER' | 'OTHER';
}

export const songContributorApi = {
  // Lấy tất cả contributors của một song
  getBySong: async (songId: number): Promise<SongContributor[]> => {
    try {
      const response = await apiClient.get(`/contributors/songs/${songId}`);
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  },

  // Thêm contributor vào song
  add: async (songId: number, artistId: number, role: string): Promise<SongContributor> => {
    try {
      const response = await apiClient.post(`/contributors/songs/${songId}`, {
        artistId,
        role,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error adding contributor:", error);
      throw error;
    }
  },

  // Xóa contributor khỏi song
  remove: async (contributorId: number, songId: number): Promise<void> => {
    try {
      await apiClient.delete(`/contributors/${contributorId}/songs/${songId}`);
    } catch (error) {
      console.error("Error removing contributor:", error);
      throw error;
    }
  },
};

