import axios from 'axios';

// Base URL cho API
export const API_BASE_URL = "http://localhost:8080/api";

// Auth helpers for API requests
export const getAuthToken = (): string | null => {
  try {
    return typeof window !== 'undefined'
      ? (localStorage.getItem('token') || localStorage.getItem('adminToken'))
      : null;
  } catch {
    try {
      return localStorage.getItem('token') || localStorage.getItem('adminToken');
    } catch {
      return null;
    }
  }
};

// Get refresh token from storage
export const getRefreshToken = (): string | null => {
  try {
    return typeof window !== 'undefined'
      ? (localStorage.getItem('refreshToken') || localStorage.getItem('adminRefreshToken'))
      : null;
  } catch {
    try {
      return localStorage.getItem('refreshToken') || localStorage.getItem('adminRefreshToken');
    } catch {
      return null;
    }
  }
};

// Set tokens in storage
export const setTokens = (token: string, refreshToken?: string) => {
  try {
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  } catch (error) {
    console.error('Failed to save tokens:', error);
  }
};

// Clear tokens from storage
export const clearTokens = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
  } catch (error) {
    console.error('Failed to clear tokens:', error);
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

// Response interceptor để xử lý lỗi và tự động refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 (Unauthorized) và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh, đợi kết quả
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        processQueue(new Error('No refresh token available'), null);
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('No refresh token available'));
      }

      try {
        // Import authApi dynamically to avoid circular dependency
        const { authApi } = await import('./authApi');
        const response = await authApi.refreshToken(refreshToken);

        if (response.token && response.refreshToken) {
          // Lưu tokens mới
          setTokens(response.token, response.refreshToken);

          // Update token trong original request
          originalRequest.headers.Authorization = `Bearer ${response.token}`;

          // Process queue với token mới
          processQueue(null, response.token);
          isRefreshing = false;

          // Retry original request với token mới
          return apiClient(originalRequest);
        } else {
          throw new Error('Invalid response from refresh token endpoint');
        }
      } catch (refreshError) {
        isRefreshing = false;
        clearTokens();
        processQueue(refreshError, null);
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

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

// Helper function để tạo headers cho JSON
export const buildJsonHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Helper: chỉ thêm Authorization, không set Content-Type
export const buildAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Helper function để parse error response
export const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return (data && (data.message || data.error || data.details)) || JSON.stringify(data);
  } catch {
    try {
      const text = await response.text();
      return text || `${response.status} ${response.statusText}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }
};

// Fetch wrapper với auto refresh token
let isRefreshingFetch = false;
let failedQueueFetch: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueueFetch = (error: any, token: string | null = null) => {
  failedQueueFetch.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueueFetch = [];
};

export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Thêm token vào headers
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, fetchOptions);

    // Nếu lỗi 401, thử refresh token
    if (response.status === 401 && !(fetchOptions as any)._retry) {
      if (isRefreshingFetch) {
        // Nếu đang refresh, đợi kết quả
        return new Promise((resolve, reject) => {
          failedQueueFetch.push({ resolve, reject });
        })
          .then((newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            (fetchOptions as any)._retry = true;
            return fetch(url, { ...fetchOptions, headers });
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      (fetchOptions as any)._retry = true;
      isRefreshingFetch = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshingFetch = false;
        clearTokens();
        processQueueFetch(new Error('No refresh token available'), null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('No refresh token available'));
      }

      try {
        // Import authApi dynamically to avoid circular dependency
        const { authApi } = await import('./authApi');
        const refreshResponse = await authApi.refreshToken(refreshToken);

        if (refreshResponse.token && refreshResponse.refreshToken) {
          // Lưu tokens mới
          setTokens(refreshResponse.token, refreshResponse.refreshToken);

          // Update headers với token mới
          headers.set('Authorization', `Bearer ${refreshResponse.token}`);

          // Process queue với token mới
          processQueueFetch(null, refreshResponse.token);
          isRefreshingFetch = false;

          // Retry original request với token mới
          return fetch(url, { ...fetchOptions, headers });
        } else {
          throw new Error('Invalid response from refresh token endpoint');
        }
      } catch (refreshError) {
        isRefreshingFetch = false;
        clearTokens();
        processQueueFetch(refreshError, null);
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

// Interface cho pagination params
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  name?: string;
  country?: string;
  debutYear?: string;
  releaseYear?: number;
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
