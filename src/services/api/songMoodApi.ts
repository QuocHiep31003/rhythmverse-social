import { apiClient } from './config';

export interface SongMood {
  id: number;
  moodId: number;
  moodName: string;
  score: number;
}

const normalizeResponse = (data: any): SongMood[] => {
  if (Array.isArray(data)) return data as SongMood[];
  if (Array.isArray(data?.data)) return data.data as SongMood[];
  if (Array.isArray(data?.content)) return data.content as SongMood[];
  return [];
};

export const songMoodApi = {
  // Lấy tất cả moods của một song
  getBySong: async (songId: number): Promise<SongMood[]> => {
    try {
      const response = await apiClient.get(`/song-moods/songs/${songId}`);
      return normalizeResponse(response.data);
    } catch (error) {
      console.error("Error fetching song moods:", error);
      return [];
    }
  },

  // Thêm mood vào song
  add: async (songId: number, moodId: number, score: number = 1.0): Promise<SongMood> => {
    try {
      const response = await apiClient.post(`/song-moods/songs/${songId}`, {
        moodId,
        score,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error adding song mood:", error);
      throw error;
    }
  },

  // Cập nhật score của song mood
  update: async (songMoodId: number, score: number): Promise<SongMood> => {
    try {
      const response = await apiClient.put(`/song-moods/${songMoodId}`, {
        score,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error updating song mood:", error);
      throw error;
    }
  },

  // Xóa mood khỏi song
  remove: async (songMoodId: number, songId: number): Promise<void> => {
    try {
      await apiClient.delete(`/song-moods/${songMoodId}/songs/${songId}`);
    } catch (error) {
      console.error("Error removing song mood:", error);
      throw error;
    }
  },
};

