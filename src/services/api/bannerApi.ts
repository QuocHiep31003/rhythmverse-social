import { apiClient } from './config';
import { guestClient } from './guestApi';

export interface BannerDTO {
  id: number;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  active?: boolean;
  // any additional fields are passed through as-is
  [key: string]: any;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string; // e.g. "id,desc"
  search?: string;
}

export interface BannerFilterParams extends PaginationParams {
  status?: "all" | "active" | "inactive";
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const bannersApi = {
  getAll: async (params?: BannerFilterParams): Promise<PaginatedResponse<BannerDTO>> => {
    try {
      const query = new URLSearchParams();
      if (params?.page !== undefined) query.append("page", String(params.page));
      if (params?.size !== undefined) query.append("size", String(params.size));
      if (params?.sort) query.append("sort", params.sort);
      if (params?.search) query.append("search", params.search);
      if (params?.status && params.status !== "all") {
        query.append("active", params.status === "active" ? "true" : "false");
      }
      const response = await apiClient.get<PaginatedResponse<BannerDTO>>(`/banners?${query.toString()}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch banners";
      throw new Error(errorMsg);
    }
  },

  getActive: async (): Promise<BannerDTO[]> => {
    try {
      const response = await guestClient.get<BannerDTO[]>('/banners/active');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to fetch active banners";
      throw new Error(errorMsg);
    }
  },

  create: async (data: BannerDTO): Promise<BannerDTO> => {
    try {
      const response = await apiClient.post<BannerDTO>('/banners', data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to create banner";
      throw new Error(errorMsg);
    }
  },

  update: async (id: number, data: BannerDTO): Promise<BannerDTO> => {
    try {
      const response = await apiClient.put<BannerDTO>(`/banners/${id}`, data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to update banner";
      throw new Error(errorMsg);
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/banners/${id}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to delete banner";
      throw new Error(errorMsg);
    }
  },

  // Bulk delete banners
  deleteMany: async (ids: number[]): Promise<void> => {
    try {
      await apiClient.delete('/banners', { data: ids });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to delete banners";
      throw new Error(errorMsg);
    }
  },

  setActive: async (id: number, active: boolean): Promise<BannerDTO> => {
    try {
      const response = await apiClient.patch<BannerDTO>(`/banners/${id}/active`, { active });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to update active state";
      throw new Error(errorMsg);
    }
  },

  // Import banners (xlsx/xls/csv) via backend
  import: async (file: File): Promise<string> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await apiClient.post('/banners/import', fd);
      return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to import banners";
      throw new Error(errorMsg);
    }
  },
};

export type { BannerDTO as Banner };





