import { apiClient, createFormDataHeaders, PaginationParams, PaginatedResponse } from './config';
import { mockSongs } from '@/data/mockData';

// Interface cho Song data
export interface Song {
  id: string | number;
  name: string;
  title?: string;
  releaseYear: number;
  genreIds: number[];
  artistIds: number[];
  artistNames?: string[];
  audioUrl: string;
  fingerId?: string;
  audio?: string;
  url?: string;
  plays?: string;
  playCount?: number;
  duration?: string | number;
  cover?: string;
  album?: string | { name: string };
  albumId?: number;
  artists?: Array<{ id: number; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  trendingScore?: number;
}

// Interface cho Song creation/update
export interface SongCreateUpdateData {
  name: string;
  releaseYear: number;
  genreIds: number[];
  artistIds: number[];
  audioUrl: string;
  fingerId?: string;
  duration?: string;
}

// Songs API sử dụng axios
export const songsApi = {
  // Lấy songs theo artist
  getByArtist: async (artistId: number): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/songs/by-artist/${artistId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching songs by artist:", error);
      return [];
    }
  },

  // Tìm bài hát theo tên nghệ sĩ và tên bài hát
  findByTitleAndArtist: async (title: string, artist: string): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/songs/find-by-title-and-artist`, {
        params: { title, artist }
      });
      return response.data;
    } catch (error) {
      console.error("Error finding song by title and artist:", error);
      return [];
    }
  },

  // Lấy tất cả songs với pagination
  getAll: async (params?: PaginationParams & { artistId?: number; genreId?: number; moodId?: number }): Promise<PaginatedResponse<Song>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.artistId !== undefined) queryParams.append('artistId', String(params.artistId));
      if (params?.genreId !== undefined) queryParams.append('genreId', String(params.genreId));
      if (params?.moodId !== undefined) queryParams.append('moodId', String(params.moodId));

      const url = `/songs?${queryParams.toString()}`;
      console.log("🌐 API Call:", url);
      console.log("📋 Params:", params);

      const response = await apiClient.get(url);
      console.log("✅ API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching songs:", error);
      // Return empty paginated response instead of mock
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: params?.size ?? 0,
        number: params?.page ?? 0,
        first: true,
        last: true,
        empty: true,
        pageable: {
          pageNumber: params?.page ?? 0,
          pageSize: params?.size ?? 0,
          sort: { empty: true, sorted: false, unsorted: true },
          offset: 0,
          paged: true,
          unpaged: false
        },
        sort: { empty: true, sorted: false, unsorted: true },
        numberOfElements: 0
      } as PaginatedResponse<Song>;
    }
  },

  // Lấy song theo ID
  getById: async (id: string): Promise<Song | null> => {
    try {
      const response = await apiClient.get(`/songs/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching song:", error);
      return null;
    }
  },

  // Lấy top 1 song theo fingerId (acrid)
  getTopByFingerId: async (fingerId: string): Promise<Song | null> => {
    try {
      const response = await apiClient.get(`/songs/by-finger/${encodeURIComponent(fingerId)}/top`);
      return response.data ?? null;
    } catch (error) {
      console.error("Error fetching top song by fingerId:", error);
      return null;
    }
  },

  // Tạo song mới
  create: async (data: SongCreateUpdateData): Promise<Song> => {
    try {
      const payload = {
        name: data.name,
        releaseYear: data.releaseYear,
        genreIds: data.genreIds,
        artistIds: data.artistIds,
        audioUrl: data.audioUrl,
        fingerId: data.fingerId,
        duration: data.duration,
      };

      const response = await apiClient.post('/songs', payload);
      return response.data;
    } catch (error) {
      console.error("Error creating song:", error);
      throw error;
    }
  },

  // Cập nhật song
  update: async (id: string, data: SongCreateUpdateData): Promise<Song> => {
    try {
      const payload = {
        name: data.name,
        releaseYear: data.releaseYear,
        genreIds: data.genreIds,
        artistIds: data.artistIds,
        audioUrl: data.audioUrl,
        fingerId: data.fingerId,
        duration: data.duration,
      };

      const response = await apiClient.put(`/songs/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating song:", error);
      throw error;
    }
  },

  // Xóa song
  delete: async (id: string): Promise<{ success: boolean }> => {
    try {
      await apiClient.delete(`/songs/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Error deleting song:", error);
      throw error;
    }
  },

  // Lấy số lượng songs
  getCount: async (search?: string): Promise<number> => {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiClient.get(`/songs/count${queryParams}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching song count:", error);
      return mockSongs.length;
    }
  },

  // Export songs to Excel
  exportExcel: async (): Promise<void> => {
    try {
      const response = await apiClient.get('/songs/export', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'songs.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting songs:", error);
      throw error;
    }
  },

  // Import songs from Excel
  importExcel: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/songs/import', formData, {
        headers: createFormDataHeaders()
      });

      return response.data;
    } catch (error) {
      console.error("Error importing songs:", error);
      throw error;
    }
  },

  // ========================================
  // TRENDING APIs - Backend đã sort sẵn
  // ========================================

  /**
   * Lấy trending 7 ngày (simple) - ĐÃ SORT SẴN Ở BACKEND
   * GET /api/trending/simple?limit=X
   */
  getTrendingSimple: async (limit: number = 20): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/trending/simple?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching trending:", error);
      return [];
    }
  },

  /**
   * Lấy trending với limit tùy chỉnh - ĐÃ SORT SẴN Ở BACKEND
   * Tự động chọn endpoint tối ưu dựa trên limit
   */
  getTrending: async (limit: number = 100): Promise<Song[]> => {
    try {
      let endpoint = `/trending/simple?limit=${limit}`;

      // Chọn endpoint tối ưu
      if (limit === 100) {
        endpoint = '/trending/top100';
      } else if (limit === 50) {
        endpoint = '/trending/top50';
      } else if (limit === 10) {
        endpoint = '/trending/top10';
      }

      console.log('🌐 Calling endpoint:', endpoint);
      const response = await apiClient.get(endpoint);
      console.log('📡 Response status:', response.status);
      console.log('✅ Data received:', response.data?.length, 'songs');

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("❌ Error fetching trending:", error);
      return [];
    }
  },

  /**
   * Lấy top 100 - ĐÃ SORT SẴN Ở BACKEND
   * GET /api/trending/top100
   */
  getTop100: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/top100');
      return response.data;
    } catch (error) {
      console.error("Error fetching top 100:", error);
      return [];
    }
  },

  /**
   * Lấy top 50 - ĐÃ SORT SẴN Ở BACKEND
   * GET /api/trending/top50
   */
  getTop50: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/top50');
      return response.data;
    } catch (error) {
      console.error("Error fetching top 50:", error);
      return [];
    }
  },

  /**
   * Lấy top 10 - ĐÃ SORT SẴN Ở BACKEND
   * GET /api/trending/top10
   */
  getTop10: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('trending/top-10');
      return response.data;
    } catch (error) {
      console.error("Error fetching top 10:", error);
      return [];
    }
  },

  /**
   * Lấy trending với sorting options - ĐÃ SORT Ở BACKEND
   * GET /api/trending/sorted?limit=X&sortBy=score&order=desc
   */
  getTrendingSorted: async (
    limit: number = 20,
    sortBy: 'score' | 'name' | 'plays' = 'score',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<Song[]> => {
    try {
      const response = await apiClient.get(
        `/trending/sorted?limit=${limit}&sortBy=${sortBy}&order=${order}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching sorted trending:", error);
      return [];
    }
  },

  // Trending theo period (từ TrendingScore entity)
  getDailyTrending: async (limit: number = 20): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/trending/daily?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching daily trending:", error);
      return [];
    }
  },

  getWeeklyTrending: async (limit: number = 20): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/trending/weekly?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching weekly trending:", error);
      return [];
    }
  },

  getMonthlyTrending: async (limit: number = 20): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/trending/monthly?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching monthly trending:", error);
      return [];
    }
  },

  // ========================================
  // NEW TRENDING APIs (Weekly & Monthly)
  // ========================================

  /**
   * Lấy top 5 bài hát trending
   * GET /api/trending/top-5
   */
  getTop5Trending: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/top-5');
      return response.data;
    } catch (error) {
      console.error("Error fetching top 5 trending:", error);
      return [];
    }
  },

  /**
   * Lấy top 100 bài hát trending
   * GET /api/trending/top-100
   */
  getTop100Trending: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/top-100');
      return response.data;
    } catch (error) {
      console.error("Error fetching top 100 trending:", error);
      return [];
    }
  },

  /**
   * Lấy top 5 bài hát trending hàng tuần (7 ngày)
   * GET /api/trending/weekly/top5
   */
  getWeeklyTop5: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/weekly/top5');
      return response.data;
    } catch (error) {
      console.error("Error fetching weekly top 5:", error);
      return [];
    }
  },

  /**
   * Lấy top 100 bài hát trending hàng tuần (7 ngày)
   * GET /api/trending/weekly/top100
   */
  getWeeklyTop100: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/weekly/top100');
      return response.data;
    } catch (error) {
      console.error("Error fetching weekly top 100:", error);
      return [];
    }
  },

  /**
   * Lấy top 5 bài hát trending hàng tháng (30 ngày)
   * GET /api/trending/monthly/top5
   */
  getMonthlyTop5: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/monthly/top5');
      return response.data;
    } catch (error) {
      console.error("Error fetching monthly top 5:", error);
      return [];
    }
  },

  /**
   * Lấy top 100 bài hát trending hàng tháng (30 ngày)
   * GET /api/trending/monthly/top100
   */
  getMonthlyTop100: async (): Promise<Song[]> => {
    try {
      const response = await apiClient.get('/trending/monthly/top100');
      return response.data;
    } catch (error) {
      console.error("Error fetching monthly top 100:", error);
      return [];
    }
  },

  /**
   * Tăng playCount của bài hát khi người dùng nghe
   * POST /api/songs/{songId}/play
   */
  incrementPlayCount: async (songId: string | number): Promise<void> => {
    console.log(`🎵 Attempting to increment play count for song: ${songId}`);
    
    try {
      const response = await apiClient.post(`/songs/${songId}/play`);
      console.log("✅ Play count incremented successfully:", response.data);
    } catch (error: any) {
      console.error("❌ Error incrementing play count:");
      console.error("  - Status:", error.response?.status);
      console.error("  - Status Text:", error.response?.statusText);
      console.error("  - Data:", error.response?.data);
      console.error("  - Song ID:", songId);
      
      // Log thêm thông tin để debug
      if (error.response?.status === 500) {
        console.error("  - Backend có lỗi server (500). Có thể:");
        console.error("    * SongId không tồn tại:", songId);
        console.error("    * Backend chưa implement đúng endpoint");
        console.error("    * Thiếu authentication/authorization");
      } else if (error.response?.status === 404) {
        console.error("  - Endpoint không tồn tại (404)");
      } else if (error.response?.status === 401) {
        console.error("  - Cần authentication (401)");
      }
      
      // Không throw error để không ảnh hưởng listening history
      console.warn("⚠️ Play count increment failed, but listening history will still be recorded");
    }
  },
};

export default songsApi;
