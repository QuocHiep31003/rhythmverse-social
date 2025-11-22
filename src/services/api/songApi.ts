import { apiClient, createFormDataHeaders, PaginationParams, PaginatedResponse, API_BASE_URL, fetchWithAuth, parseErrorResponse } from './config';
import { mockSongs } from '@/data/mockData';

// Interface cho Song data - đồng bộ với BE SongDTO
export interface Song {
  id: string | number;
  name: string; // BE trả về field "name", không phải "songName"
  title?: string;
  releaseYear?: number;
  genreIds?: number[];
  artistIds?: number[];
  artistNames?: string[];
  uuid?: string;
  audio?: string;
  url?: string;
  streamPath?: string; // S3 stream path: stream/{uuid}/{uuid}_128kbps.m3u8
  plays?: string;
  playCount?: number;
  duration?: string | number; // BE trả về string format "3:45"
  cover?: string;
  album?: string | { name: string };
  albumId?: number;
  albumName?: string; // Từ một số API response
  albumCoverImg?: string; // Field chính thức cho ảnh album từ BE
  albumImageUrl?: string; // Từ TrendingSong API
  urlImageAlbum?: string; // Từ BE SongDTO (legacy)
  artists?: Array<{ id: number; name: string }> | string; // Có thể là chuỗi format "A, B ft C"
  performers?: Array<{ id: number; name: string }>;
  authors?: Array<{ id: number; name: string }>;
  singer?: Array<{ id: number; name: string }>;
  feat?: Array<{ id: number; name: string }>;
  composer?: Array<{ id: number; name: string }>;
  lyricist?: Array<{ id: number; name: string }>;
  producer?: Array<{ id: number; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  trendingScore?: number;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
  acrId?: string; // ACR Cloud fingerprint ID
  fingerprintStatus?: number; // 0: processing, 1: Ready, -1: Error
  // Các field từ TrendingSong có thể có
  songId?: number;
  songName?: string; // Một số API trả về songName thay vì name
  rank?: number;
  previousRank?: number;
  trendStatus?: string;
  score?: number;
}

// Interface cho Song creation/update
export interface SongCreateUpdateData {
  name: string;
  releaseYear: number;
  genreIds: number[];
  artistIds?: number[];
  performerIds?: number[];
  featIds?: number[];
  composerIds?: number[];
  lyricistIds?: number[];
  producerIds?: number[];
  uuid?: string; // Optional for update/import nếu đã có audio trên S3
  duration?: string;
  moodIds?: number[];
  status?: "ACTIVE" | "INACTIVE";
  file?: File; // Optional file for update
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
  getAll: async (params?: PaginationParams & { artistId?: number; genreId?: number; moodId?: number; status?: string }): Promise<PaginatedResponse<Song>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.artistId !== undefined) queryParams.append('artistId', String(params.artistId));
      if (params?.genreId !== undefined) queryParams.append('genreId', String(params.genreId));
      if (params?.moodId !== undefined) queryParams.append('moodId', String(params.moodId));
      if (params?.status) queryParams.append('status', params.status);

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

  getWithoutAlbum: async (params?: PaginationParams & { search?: string; genreId?: number; moodId?: number }): Promise<PaginatedResponse<Song>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.genreId !== undefined) queryParams.append('genreId', String(params.genreId));
      if (params?.moodId !== undefined) queryParams.append('moodId', String(params.moodId));

      const url = `/songs/without-album?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching songs without album:", error);
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

  // Tạo song mới
  create: async (data: SongCreateUpdateData): Promise<Song> => {
    try {
      const payload: Record<string, any> = {
        name: data.name,
        releaseYear: data.releaseYear,
        genreIds: data.genreIds,
      };
      if (data.moodIds !== undefined) payload.moodIds = data.moodIds;
      if (data.uuid) payload.uuid = data.uuid;
      if (data.duration) payload.duration = data.duration;
      if (data.performerIds !== undefined) payload.performerIds = data.performerIds;
      if (data.featIds !== undefined) payload.featIds = data.featIds;
      if (data.composerIds !== undefined) payload.composerIds = data.composerIds;
      if (data.lyricistIds !== undefined) payload.lyricistIds = data.lyricistIds;
      if (data.producerIds !== undefined) payload.producerIds = data.producerIds;
      if (data.uuid !== undefined) payload.uuid = data.uuid;
      if (data.artistIds !== undefined) {
        payload.artistIds = data.artistIds;
      } else if (data.performerIds !== undefined) {
        payload.artistIds = data.performerIds;
      }

      const response = await apiClient.post('/songs', payload);
      return response.data;
    } catch (error) {
      console.error("Error creating song:", error);
      throw error;
    }
  },

  // Tạo song mới (kèm upload file audio)
  createWithFile: async (data: SongCreateUpdateData & { file: File }): Promise<Song> => {
    try {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("name", data.name);
      formData.append("releaseYear", String(data.releaseYear));

      if (data.duration) formData.append("duration", data.duration);

      const appendList = (field: string, values?: number[]) => {
        values?.forEach((value) => formData.append(field, String(value)));
      };

      appendList("genreIds", data.genreIds);
      appendList("moodIds", data.moodIds);
      appendList("performerIds", data.performerIds);
      appendList("featIds", data.featIds);
      appendList("composerIds", data.composerIds);
      appendList("lyricistIds", data.lyricistIds);
      appendList("producerIds", data.producerIds);
      appendList("artistIds", data.artistIds);

      const response = await fetchWithAuth(`${API_BASE_URL}/songs`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      const responseData = await response.json();
      return responseData?.song ?? responseData;
    } catch (error) {
      console.error("Error creating song with file:", error);
      throw error;
    }
  },

  // Cập nhật song (JSON body)
  update: async (id: string, data: SongCreateUpdateData): Promise<Song> => {
    try {
      const payload: Record<string, any> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.releaseYear !== undefined) payload.releaseYear = data.releaseYear;
      if (data.duration !== undefined) payload.duration = data.duration;
      if (data.status !== undefined) payload.status = data.status;
      if (data.genreIds !== undefined) payload.genreIds = data.genreIds;
      if (data.moodIds !== undefined) payload.moodIds = data.moodIds;
      if (data.performerIds !== undefined) payload.performerIds = data.performerIds;
      if (data.featIds !== undefined) payload.featIds = data.featIds;
      if (data.composerIds !== undefined) payload.composerIds = data.composerIds;
      if (data.lyricistIds !== undefined) payload.lyricistIds = data.lyricistIds;
      if (data.producerIds !== undefined) payload.producerIds = data.producerIds;
      if (data.artistIds !== undefined) payload.artistIds = data.artistIds;

      console.log("🌐 API Update Song - URL:", `/songs/${id}`);
      console.log("📦 API Update Song - Payload:", payload);
      console.log("📦 API Update Song - Status in payload:", payload.status);

      const response = await apiClient.put(`/songs/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating song:", error);
      throw error;
    }
  },

  // Cập nhật file audio (multipart)
  updateWithFile: async (id: string, data: SongCreateUpdateData): Promise<Song> => {
    try {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.releaseYear !== undefined) formData.append('releaseYear', String(data.releaseYear));
      if (data.duration) formData.append('duration', data.duration);
      if (data.genreIds && data.genreIds.length) data.genreIds.forEach(v => formData.append('genreIds', String(v)));
      if (data.performerIds && data.performerIds.length) data.performerIds.forEach(v => formData.append('performerIds', String(v)));
      if (data.featIds && data.featIds.length) data.featIds.forEach(v => formData.append('featIds', String(v)));
      if (data.composerIds && data.composerIds.length) data.composerIds.forEach(v => formData.append('composerIds', String(v)));
      if (data.lyricistIds && data.lyricistIds.length) data.lyricistIds.forEach(v => formData.append('lyricistIds', String(v)));
      if (data.producerIds && data.producerIds.length) data.producerIds.forEach(v => formData.append('producerIds', String(v)));
      if (data.artistIds && data.artistIds.length) data.artistIds.forEach(v => formData.append('artistIds', String(v)));
      if (data.moodIds && data.moodIds.length) data.moodIds.forEach(v => formData.append('moodIds', String(v)));
      if (data.status) formData.append('status', data.status);
      if (data.file) formData.append('file', data.file, data.file.name || 'audio');

      // Use fetch to avoid axios default JSON Content-Type interfering with FormData boundary
      const res = await fetchWithAuth(`${API_BASE_URL}/songs/${id}/file`, {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json as Song;
    } catch (error) {
      console.error("Error updating song file:", error);
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
    } catch (error: unknown) {
      console.error("❌ Error incrementing play count:");
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
        console.error("  - Status:", axiosError.response?.status);
        console.error("  - Status Text:", axiosError.response?.statusText);
        console.error("  - Data:", axiosError.response?.data);
      }
      console.error("  - Song ID:", songId);

      // Log thêm thông tin để debug
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 500) {
          console.error("  - Backend có lỗi server (500). Có thể:");
          console.error("    * SongId không tồn tại:", songId);
          console.error("    * Backend chưa implement đúng endpoint");
          console.error("    * Thiếu authentication/authorization");
        } else if (axiosError.response?.status === 404) {
          console.error("  - Endpoint không tồn tại (404)");
        } else if (axiosError.response?.status === 401) {
          console.error("  - Cần authentication (401)");
        }
      }

      // Không throw error để không ảnh hưởng listening history
      console.warn("⚠️ Play count increment failed, but listening history will still be recorded");
    }
  },

  // Get CloudFront HLS URL for streaming (BE trả về JSON với streamUrl)
  getStreamUrl: async (songId: number | string): Promise<{ streamUrl: string; uuid?: string }> => {
    const response = await apiClient.get(`/songs/${songId}/stream-url`);
    return response.data;
  },

  // Build S3 stream URL directly from uuid (used cho debug hoặc test)
  getS3StreamUrl: (uuid: string | undefined | null): string | null => {
    if (!uuid) return null;
    const bucketName = "echoverse";
    const region = "ap-southeast-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/stream/${uuid}/${uuid}.m3u8`;
  },

  // Lấy danh sách bài hát gợi ý dựa trên bài hát hiện tại
  getRecommendations: async (songId: string | number, limit: number = 10): Promise<Song[]> => {
    try {
      const response = await apiClient.get(`/songs/${songId}/recommendations?limit=${limit}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      return [];
    }
  },
};

export default songsApi;
