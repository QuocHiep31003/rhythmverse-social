import { apiClient } from './config';

export interface SongGenre {
  id: number;
  genreId: number;
  genreName: string;
  score: number;
}

const normalizeResponse = (data: any): SongGenre[] => {
  if (Array.isArray(data)) return data as SongGenre[];
  if (Array.isArray(data?.data)) return data.data as SongGenre[];
  if (Array.isArray(data?.content)) return data.content as SongGenre[];
  return [];
};

export const songGenreApi = {
  // Lấy tất cả genres của một song
  getBySong: async (songId: number): Promise<SongGenre[]> => {
    try {
      const response = await apiClient.get(`/song-genres/songs/${songId}`);
      return normalizeResponse(response.data);
    } catch (error) {
      console.error("Error fetching song genres:", error);
      return [];
    }
  },

  // Thêm genre vào song
  add: async (songId: number, genreId: number, score: number = 1.0): Promise<SongGenre> => {
    try {
      const response = await apiClient.post(`/song-genres/songs/${songId}`, {
        genreId,
        score,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error adding song genre:", error);
      throw error;
    }
  },

  // Cập nhật score của song genre
  update: async (songGenreId: number, score: number): Promise<SongGenre> => {
    try {
      const response = await apiClient.put(`/song-genres/${songGenreId}`, {
        score,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error updating song genre:", error);
      throw error;
    }
  },

  // Xóa genre khỏi song
  remove: async (songGenreId: number, songId: number): Promise<void> => {
    try {
      await apiClient.delete(`/song-genres/${songGenreId}/songs/${songId}`);
    } catch (error) {
      console.error("Error removing song genre:", error);
      throw error;
    }
  },
};

