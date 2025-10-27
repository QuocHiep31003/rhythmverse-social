import axios from 'axios';

// Base URL cho API
export const API_BASE_URL = "http://localhost:8080/api";

// Auth helpers for API requests
const getAuthToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  } catch {
    return null;
  }
};

// Tạo axios instance với config cơ bản
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm token vào headers
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý lỗi chung
    if (error.response) {
      // Server trả về response với status code lỗi
      const message = error.response.data?.message ||
        error.response.data?.error ||
        error.response.data?.details ||
        `${error.response.status} ${error.response.statusText}`;
      throw new Error(message);
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      throw new Error('Network error - please check your connection');
    } else {
      // Lỗi khác
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

// Helper function để tạo headers cho FormData
export const createFormDataHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Interface cho pagination params
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  // name?: string;  
  // country?: string;
  // debutYear?: string;
  // releaseYear?: number;
}

// Interface cho paginated response
export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export default apiClient;
