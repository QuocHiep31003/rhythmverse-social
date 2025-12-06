import { apiClient } from './config';

interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  name?: string;
  artist?: string;
  artistId?: number;
  releaseYear?: number;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


/** ---------------------------
 * 🎵 ALBUMS API MODULE
 * --------------------------- */
export const albumsApi = {
  // ✅ Lấy tất cả album (phân trang)
  getAll: async (params?: PaginationParams) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append("page", params.page.toString());
      if (params?.size !== undefined) queryParams.append("size", params.size.toString());
      if (params?.sort) queryParams.append("sort", params.sort);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.name) queryParams.append("name", params.name);
      if (params?.artist) queryParams.append("artist", params.artist);
      if (params?.artistId !== undefined) queryParams.append("artistId", String(params.artistId));
      if (params?.releaseYear !== undefined) queryParams.append("releaseYear", String(params.releaseYear));

      const response = await apiClient.get(`/albums?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching albums:", error);
      await delay(300);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: params?.size ?? 0,
        number: params?.page ?? 0,
        first: true,
        last: true,
        empty: true,
      } as PaginatedResponse<any>;
    }
  },

  // Search albums by name OR artist (combined)
  search: async (
    query: string,
    params?: { page?: number; size?: number; sort?: string }
  ): Promise<PaginatedResponse<any>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append("page", String(params.page));
      if (params?.size !== undefined) queryParams.append("size", String(params.size));
      if (params?.sort) queryParams.append("sort", params.sort);

      // Prefer a backend that supports unified search via the same endpoint
      queryParams.append("search", query);
      queryParams.append("name", query);
      queryParams.append("artist", query);

      const response = await apiClient.get(`/albums?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error searching albums (combined):", error);
      await delay(200);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: params?.size ?? 0,
        number: params?.page ?? 0,
        first: true,
        last: true,
        empty: true,
      } as PaginatedResponse<any>;
    }
  },

  // Search albums by name only
  searchByName: async (name: string) => {
    try {
      // Try a dedicated endpoint if available
      const response = await apiClient.get(`/albums/search/name?name=${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      console.error("Error searching albums by name:", error);
      await delay(200);
      return [];
    }
  },

  // ✅ Lấy 1 album theo ID
  getById: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/albums/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching album:", error);
      return null;
    }
  },

  // ✅ Tạo mới album
  create: async (data: any) => {
    try {
      const payload: any = {
        name: data.name,
        artistId: data.artistId,
        songIds: data.songIds,
        releaseDate: data.releaseDate,
        coverUrl: data.coverUrl || "",
        description: data.description || "",
      };
      if (data.coverUrl && String(data.coverUrl).trim() !== "") {
        payload.cover = data.coverUrl; // compatibility alias
      }

      const response = await apiClient.post('/albums', payload);
      return response.data;
    } catch (error) {
      console.error("Error creating album:", error);
      throw error;
    }
  },

  // ✅ Cập nhật album
  update: async (id: number, data: any) => {
    try {
      const payload: any = {
        name: data.name,
        artistId: data.artistId,
        songIds: data.songIds,
        releaseDate: data.releaseDate,
        coverUrl: data.coverUrl,
        description: data.description,
      };
      if (data.coverUrl && String(data.coverUrl).trim() !== "") {
        payload.cover = data.coverUrl; // compatibility alias
      }

      const response = await apiClient.put(`/albums/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating album:", error);
      throw error;
    }
  },
  // ✅ Tìm kiếm album theo tên nghệ sĩ
  searchByArtist: async (artistName: string) => {
    try {
      const response = await apiClient.get(`/albums/search/artist?artistName=${encodeURIComponent(artistName)}`);
      return response.data;
    } catch (error) {
      console.error("Error searching albums by artist:", error);
      await delay(300);
      return [];
    }
  },

  searchPublicActive: async (
    query?: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (query && query.trim().length > 0) {
      queryParams.append("query", query.trim());
    }
    queryParams.append("page", String(params?.page ?? 0));
    queryParams.append("size", String(params?.size ?? 12));
    queryParams.append("sort", params?.sort ?? "name,asc");

    const response = await apiClient.get(`/albums/public/search?${queryParams.toString()}`);
    return response.data;
  },


  // ✅ Xoá album
  delete: async (id: number) => {
    try {
      await apiClient.delete(`/albums/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Error deleting album:", error);
      throw error;
    }
  },

  // ✅ Export albums to Excel
  exportExcel: async () => {
    try {
      const response = await apiClient.get('/albums/export', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "albums_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting albums:", error);
      throw error;
    }
  },

  // ✅ Import albums from Excel
  importExcel: async (file: File) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await apiClient.post('/albums/import', fd);
      return response.data || "Import albums thành công";
    } catch (error: any) {
      console.error("Error importing albums:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Import failed";
      throw new Error(errorMsg);
    }
  },
};

