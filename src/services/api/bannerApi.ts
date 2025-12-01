const API_BASE_URL = "http://localhost:8080/api";

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
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append("page", String(params.page));
    if (params?.size !== undefined) query.append("size", String(params.size));
    if (params?.sort) query.append("sort", params.sort);
    if (params?.search) query.append("search", params.search);
    if (params?.status && params.status !== "all") {
      query.append("active", params.status === "active" ? "true" : "false");
    }
    const res = await fetch(`${API_BASE_URL}/promotions?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch banners");
    return res.json();
  },

  getActive: async (): Promise<BannerDTO[]> => {
    const res = await fetch(`${API_BASE_URL}/promotions/active`);
    if (!res.ok) throw new Error("Failed to fetch active banners");
    return res.json();
  },

  create: async (data: BannerDTO): Promise<BannerDTO> => {
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to create banner");
    return res.json();
  },

  update: async (id: number, data: BannerDTO): Promise<BannerDTO> => {
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to update banner");
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete banner");
  },

  // Bulk delete banners
  deleteMany: async (ids: number[]): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/promotions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids),
    });
    if (!res.ok) throw new Error("Failed to delete banners");
  },

  setActive: async (id: number, active: boolean): Promise<BannerDTO> => {
    const res = await fetch(`${API_BASE_URL}/promotions/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error(await res.text() || "Failed to update active state");
    return res.json();
  },

  // Import banners (xlsx/xls/csv) via backend
  import: async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE_URL}/promotions/import`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to import banners");
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      return typeof data === "string" ? data : JSON.stringify(data);
    }
    return res.text();
  },
};

export type { BannerDTO as Banner };


