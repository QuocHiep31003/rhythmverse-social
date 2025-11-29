import axios from 'axios';

// Base URL cho API
export const API_BASE_URL = "http://localhost:8080/api";
// Auth server base (remove trailing /api to hit OAuth endpoints)
export const AUTH_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

// JWT token utilities
interface DecodedToken {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 * @param token JWT token string
 * @returns Decoded token payload or null if invalid
 */
export const decodeToken = (token: string | null): DecodedToken | null => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as DecodedToken;
  } catch (error) {
    console.error('[decodeToken] Failed to decode token:', error);
    return null;
  }
};

/**
 * Check if token is expired or will expire soon
 * @param token JWT token string
 * @param bufferMinutes Minutes before expiration to consider as "expiring soon" (default: 15 minutes)
 * @returns true if token is expired or expiring soon
 */
export const isTokenExpiringSoon = (token: string | null, bufferMinutes: number = 15): boolean => {
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = bufferMinutes * 60 * 1000; // Convert minutes to milliseconds

  // Token is expired or will expire within buffer time
  return (expirationTime - currentTime) <= bufferTime;
};

/**
 * Get time until token expiration in milliseconds
 * @param token JWT token string
 * @returns Time until expiration in ms, or 0 if expired/invalid
 */
export const getTimeUntilExpiration = (token: string | null): number => {
  if (!token) return 0;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;

  return Math.max(0, timeUntilExpiration);
};

// Auth helpers for API requests
export const getAuthToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      // Ưu tiên adminToken nếu đang ở trang admin
      const isAdminPage = window.location.pathname.startsWith('/admin');
      if (isAdminPage) {
        return localStorage.getItem('adminToken') || localStorage.getItem('token');
      }
      return localStorage.getItem('token') || localStorage.getItem('adminToken');
    }
    return null;
  } catch {
    try {
      const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      if (isAdminPage) {
        return localStorage.getItem('adminToken') || localStorage.getItem('token');
      }
      return localStorage.getItem('token') || localStorage.getItem('adminToken');
    } catch {
      return null;
    }
  }
};

// Helper để lấy admin token (ưu tiên adminToken)
export const getAdminToken = (): string | null => {
  try {
    return typeof window !== 'undefined'
      ? (localStorage.getItem('adminToken') || localStorage.getItem('token'))
      : null;
  } catch {
    try {
      return localStorage.getItem('adminToken') || localStorage.getItem('token');
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
    // Kiểm tra xem đang ở admin page hay không
    const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    if (isAdminPage) {
      // Lưu vào adminToken và adminRefreshToken nếu đang ở admin page
      localStorage.setItem('adminToken', token);
      if (refreshToken) {
        localStorage.setItem('adminRefreshToken', refreshToken);
      }
    } else {
      // Lưu vào token và refreshToken cho user thường
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }

    // Cũng lưu vào sessionStorage để đồng bộ
    try {
      sessionStorage.setItem('token', token);
      if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
      }
    } catch (e) {
      // Ignore sessionStorage errors
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


// Request interceptor để thêm token vào headers và check expiration trước khi gửi
apiClient.interceptors.request.use(
  async (config) => {
    const token = getAuthToken();
    
    // Check if token is expiring soon before sending request
    if (token && isTokenExpiringSoon(token, 15)) {
      console.log('[apiClient] Token expiring soon, refreshing before request...');
      try {
        await refreshTokenIfNeeded();
        // Get fresh token after refresh
        const newToken = getAuthToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        } else if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[apiClient] Failed to refresh token before request:', error);
        // Continue with existing token, let response interceptor handle 401
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } else if (token) {
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
        console.log('[apiClient] Token expired, refreshing token...');
        // Import authApi dynamically to avoid circular dependency
        const { authApi } = await import('./authApi');
        const response = await authApi.refreshToken(refreshToken);

        if (response.token && response.refreshToken) {
          console.log('[apiClient] Token refreshed successfully');
          // Lưu tokens mới
          setTokens(response.token, response.refreshToken);

          // Update token trong original request
          originalRequest.headers.Authorization = `Bearer ${response.token}`;

          // Process queue với token mới
          processQueue(null, response.token);
          isRefreshing = false;

          // Retry original request với token mới
          console.log('[apiClient] Retrying original request with new token');
          return apiClient(originalRequest);
        } else {
          console.error('[apiClient] Invalid refresh response:', response);
          throw new Error('Invalid response from refresh token endpoint');
        }
      } catch (refreshError) {
        console.error('[apiClient] Refresh token failed:', refreshError);
        isRefreshing = false;
        clearTokens();
        processQueue(refreshError, null);

        // Redirect to login
        if (typeof window !== 'undefined') {
          const isAdminPage = window.location.pathname.startsWith('/admin');
          window.location.href = isAdminPage ? '/admin/login' : '/login';
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
        (typeof error.response.data === 'string' ? error.response.data : null) ||
        `${error.response.status} ${error.response.statusText}`;
      console.error("[apiClient] Server error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        message
      });
      throw new Error(message);
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      console.error("[apiClient] Network error - no response received:", {
        code: error.code,
        message: error.message,
        timeout: error.config?.timeout,
        url: error.config?.url
      });

      // Check if it's a timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Request timeout - the server is taking too long to respond. Please try again.');
      }

      throw new Error('Network error - please check your connection and ensure the backend server is running');
    } else {
      // Lỗi khác
      console.error("[apiClient] Request setup error:", error.message);
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

// Auto-refresh token management
let tokenRefreshInterval: NodeJS.Timeout | null = null;
let isRefreshingProactively = false;

/**
 * Proactively refresh token if it's expiring soon
 * @returns Promise<boolean> true if refresh was successful, false otherwise
 */
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const token = getAuthToken();
  const refreshToken = getRefreshToken();

  // No token or refresh token available
  if (!token || !refreshToken) {
    return false;
  }

  // Check if token is expiring soon (within 15 minutes)
  if (!isTokenExpiringSoon(token, 15)) {
    return false; // Token is still valid, no need to refresh
  }

  // Prevent multiple simultaneous refresh attempts
  if (isRefreshingProactively) {
    console.log('[refreshTokenIfNeeded] Refresh already in progress, skipping...');
    return false;
  }

  isRefreshingProactively = true;

  try {
    console.log('[refreshTokenIfNeeded] Token expiring soon, refreshing proactively...');
    const { authApi } = await import('./authApi');
    const response = await authApi.refreshToken(refreshToken);

    if (response.token && response.refreshToken) {
      console.log('[refreshTokenIfNeeded] Token refreshed successfully');
      setTokens(response.token, response.refreshToken);
      isRefreshingProactively = false;
      return true;
    } else {
      console.error('[refreshTokenIfNeeded] Invalid refresh response:', response);
      isRefreshingProactively = false;
      return false;
    }
  } catch (error) {
    console.error('[refreshTokenIfNeeded] Failed to refresh token:', error);
    isRefreshingProactively = false;
    // Don't clear tokens here, let the interceptor handle 401 errors
    return false;
  }
};

let manualRefreshPromise: Promise<string | null> | null = null;

/**
 * Force refresh access token immediately (used for streaming retries)
 * @returns Fresh access token string or null if refresh failed
 */
export const forceRefreshAccessToken = async (): Promise<string | null> => {
  if (manualRefreshPromise) {
    return manualRefreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  manualRefreshPromise = (async () => {
    try {
      const { authApi } = await import('./authApi');
      const response = await authApi.refreshToken(refreshToken);

      if (response.token) {
        setTokens(response.token, response.refreshToken || refreshToken);
        return response.token;
      }

      throw new Error('Invalid response from refresh token endpoint');
    } catch (error) {
      clearTokens();
      throw error;
    } finally {
      manualRefreshPromise = null;
    }
  })();

  return manualRefreshPromise;
};

/**
 * Start automatic token refresh interval
 * Checks token expiration every 1 minute and refreshes if needed
 */
export const startTokenRefreshInterval = (): void => {
  // Clear existing interval if any
  stopTokenRefreshInterval();

  // Check immediately
  refreshTokenIfNeeded();

  // Then check every 1 minute (60000ms) - more frequent to catch expiration sooner
  tokenRefreshInterval = setInterval(() => {
    refreshTokenIfNeeded();
  }, 60 * 1000); // 1 minute

  console.log('[startTokenRefreshInterval] Token refresh interval started (checks every 1 minute)');
};

/**
 * Stop automatic token refresh interval
 */
export const stopTokenRefreshInterval = (): void => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log('[stopTokenRefreshInterval] Token refresh interval stopped');
  }
};

// Start token refresh interval when module loads (if in browser and token exists)
// This handles page refresh scenarios
if (typeof window !== 'undefined') {
  // Wait a bit for localStorage to be ready
  setTimeout(() => {
    const token = getAuthToken();
    if (token && !tokenRefreshInterval) {
      startTokenRefreshInterval();
    }
  }, 1000);
}

export default apiClient;
