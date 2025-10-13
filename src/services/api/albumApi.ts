import { mockAlbums } from "@/data/mockData";

const API_BASE_URL = "http://localhost:8080/api";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  name?: string;
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

      const response = await fetch(`${API_BASE_URL}/albums?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch albums");

      const data: PaginatedResponse<any> = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching albums:", error);
      await delay(300);
      return {
        content: mockAlbums,
        totalElements: mockAlbums.length,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false,
      } as PaginatedResponse<any>;
    }
  },

  // ✅ Lấy 1 album theo ID
  getById: async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/albums/${id}`);
      if (!response.ok) throw new Error("Failed to fetch album");
      return await response.json();
    } catch (error) {
      console.error("Error fetching album:", error);
      return mockAlbums.find((a) => a.id.toString() === id.toString());
    }
  },

  // ✅ Tạo mới album
  create: async (data: any) => {
    try {
      const payload = {
        name: data.name,
        artistId: data.artistId,
        songIds: data.songIds,
        releaseDate: data.releaseDate,
        coverUrl: data.coverUrl || "",
        description: data.description || "",
      };

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
      const payload = {
        name: data.name,
        artistId: data.artistId,
        songIds: data.songIds,
        releaseDate: data.releaseDate,
        coverUrl: data.coverUrl,
        description: data.description,
      };

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
