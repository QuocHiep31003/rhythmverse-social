const API_BASE_URL = "http://localhost:8080/api";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

      const response = await fetch(`${API_BASE_URL}/albums?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch albums");

      const data: PaginatedResponse<any> = await response.json();
      return data;
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

      const response = await fetch(`${API_BASE_URL}/albums?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to search albums");
      return await response.json();
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
      const response = await fetch(
        `${API_BASE_URL}/albums/search/name?name=${encodeURIComponent(name)}`
      );
      if (!response.ok) throw new Error("Failed to search albums by name");
      return await response.json();
    } catch (error) {
      console.error("Error searching albums by name:", error);
      await delay(200);
      return [];
    }
  },

  // ✅ Lấy 1 album theo ID
  getById: async (id: string | number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/albums/${id}`);
      if (!response.ok) throw new Error("Failed to fetch album");
      return await response.json();
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

      const response = await fetch(`${API_BASE_URL}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create album");
      }

      return await response.json();
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

      const response = await fetch(`${API_BASE_URL}/albums/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update album");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating album:", error);
      throw error;
    }
  },
  // ✅ Tìm kiếm album theo tên nghệ sĩ
  searchByArtist: async (artistName: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/albums/search/artist?artistName=${encodeURIComponent(artistName)}`
      );
      if (!response.ok) throw new Error("Failed to search albums by artist");
      return await response.json();
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

    const response = await fetch(`${API_BASE_URL}/albums/public/search?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to load active albums");
    }
    return response.json();
  },


  // ✅ Xoá album
  delete: async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/albums/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete album");
      return { success: true };
    } catch (error) {
      console.error("Error deleting album:", error);
      throw error;
    }
  },
};

