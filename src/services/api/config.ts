import axios from 'axios';

// Base URL cho API
// export const API_BASE_URL = "http://localhost:8080/api";
export const API_BASE_URL = "https://coral-app-jtjsq.ondigitalocean.app/api";
// Base URL cho các endpoint auth (OAuth2, login external, ...) – dùng origin của API
export const AUTH_SERVER_URL = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:8080";
  }
})();

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

// Auth helpers for API requests - CHỈ DÙNG sessionStorage
// ✅ User token - chỉ lấy từ sessionStorage 'token' (không lấy adminToken)
export const getAuthToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('token');
    }
    return null;
  } catch {
    try {
      return sessionStorage.getItem('token');
    } catch {
      return null;
    }
  }
};

// ✅ Admin token - chỉ lấy từ sessionStorage 'adminToken' (không lấy user token)
export const getAdminToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminToken');
    }
    return null;
  } catch {
    try {
      return sessionStorage.getItem('adminToken');
    } catch {
      return null;
    }
  }
};

// ✅ User refresh token - chỉ lấy từ sessionStorage 'refreshToken'
export const getRefreshToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('refreshToken');
    }
    return null;
  } catch {
    try {
      return sessionStorage.getItem('refreshToken');
    } catch {
      return null;
    }
  }
};

// ✅ Admin refresh token - chỉ lấy từ sessionStorage 'adminRefreshToken'
export const getAdminRefreshToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminRefreshToken');
    }
    return null;
  } catch {
    try {
      return sessionStorage.getItem('adminRefreshToken');
    } catch {
      return null;
    }
  }
};

// ✅ Set user tokens - CHỈ lưu vào 'token' và 'refreshToken'
export const setUserTokens = (token: string, refreshToken?: string) => {
  try {
    if (typeof window === 'undefined') return;

    sessionStorage.setItem('token', token);
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
    }

    console.log('[setUserTokens] User tokens saved to sessionStorage:', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken
    });

    // Broadcast token update
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.postMessage({
          type: 'TOKEN_UPDATED',
          timestamp: Date.now()
        });
        authChannel.close();
        console.log('[setUserTokens] Broadcasted TOKEN_UPDATED to other tabs');
      } catch (error) {
        console.warn('[setUserTokens] Failed to broadcast token update:', error);
      }
    }

    // Dispatch custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenUpdated'));
    }
  } catch (error) {
    console.error('[setUserTokens] Failed to save tokens:', error);
  }
};

// ✅ Legacy function - tự động detect admin page (giữ lại để backward compatibility)
export const setTokens = (token: string, refreshToken?: string) => {
  try {
    if (typeof window === 'undefined') return;

    // Kiểm tra xem đang ở admin page hay không
    const isAdminPage = window.location.pathname.startsWith('/admin');

    if (isAdminPage) {
      setAdminTokens(token, refreshToken);
    } else {
      setUserTokens(token, refreshToken);
    }
  } catch (error) {
    console.error('[setTokens] Failed to save tokens:', error);
  }
};

// Clear tokens from storage - CHỈ DÙNG sessionStorage
export const clearTokens = () => {
  try {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminRefreshToken');
    sessionStorage.removeItem('userId'); // Clear userId khi logout

    console.log('[clearTokens] All tokens and userId cleared from sessionStorage');
  } catch (error) {
    console.error('[clearTokens] Failed to clear tokens:', error);
  }
};

// Helper functions để quản lý userId - DÙNG sessionStorage để đồng nhất với token
export const getUserId = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('userId');
  } catch (error) {
    console.error('[getUserId] Failed to get userId:', error);
    return null;
  }
};

export const setUserId = (userId: string | number): void => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('userId', String(userId));
  } catch (error) {
    console.error('[setUserId] Failed to set userId:', error);
  }
};

export const removeUserId = (): void => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('userId');
  } catch (error) {
    console.error('[removeUserId] Failed to remove userId:', error);
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
    // ✅ Nếu data là FormData, xóa Content-Type để axios tự set boundary đúng
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = getAuthToken();

    // Check if token is expiring soon before sending request (refresh nếu còn 5 phút)
    if (token && isTokenExpiringSoon(token, 5)) {
      console.log('[apiClient] Token expiring soon (within 5 min), refreshing before request...');
      try {
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
          // Get fresh token after refresh
          const newToken = getAuthToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            console.log('[apiClient] Using refreshed token');
            return config;
          }
        }
      } catch (error) {
        console.error('[apiClient] Failed to refresh token before request:', error);
        // Continue with existing token, let response interceptor handle 401
      }
    }

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
        // ✅ Không clear tokens ngay - có thể đang đợi token từ tab khác
        // ✅ Không redirect ngay - để các component có cơ hội retry hoặc đợi token
        processQueue(new Error('No refresh token available'), null);

        // ✅ Chỉ redirect nếu đang ở trang cần authentication và đã đợi một chút
        // ✅ Hoặc đơn giản là không redirect, để component tự xử lý
        console.warn('[apiClient] No refresh token available. Tab may be waiting for token from other tabs.');

        return Promise.reject(new Error('No refresh token available'));
      }

      try {
        console.log('[apiClient] Token expired, refreshing token...');
        // Import authApi dynamically to avoid circular dependency
        const { authApi } = await import('./authApi');
        const response = await authApi.refreshToken(refreshToken);

        if (response.token && response.refreshToken) {
          console.log('[apiClient] Token refreshed successfully');
          // Lưu user tokens mới
          setUserTokens(response.token, response.refreshToken);

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

        // ✅ Chỉ clear tokens nếu refresh thực sự fail (không phải do chưa có token)
        const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
        const isNoTokenError = errorMessage.includes('No refresh token') || errorMessage.includes('refresh token');

        if (!isNoTokenError) {
          // Chỉ clear user tokens nếu refresh thực sự fail (token invalid, expired, etc.)
          clearUserTokens();
        }

        processQueue(refreshError, null);

        // ✅ Không redirect ngay - để component có cơ hội retry hoặc đợi token từ tab khác
        // ✅ Chỉ log warning thay vì redirect
        console.warn('[apiClient] Refresh token failed. Component will handle retry or wait for token from other tabs.');

        return Promise.reject(refreshError);
      }
    }

    // ✅ Xử lý lỗi 403 (Access Denied) - Yêu cầu đăng nhập để phát nhạc
    // ✅ Bỏ qua xử lý cho API phát nhạc (/songs/*/play-now) để playSongHelper.ts xử lý riêng
    if (error.response?.status === 403) {
      const requestUrl = error.config?.url || '';
      const isPlayNowEndpoint = requestUrl.includes('/songs/') && requestUrl.includes('/play-now');

      // Nếu là API phát nhạc, để playSongHelper.ts xử lý riêng (không hiển thị toast ở đây)
      if (isPlayNowEndpoint) {
        return Promise.reject(error);
      }

      const message = error.response.data?.message ||
        error.response.data?.error ||
        'Access Denied';

      console.error("[apiClient] Access Denied (403):", {
        status: error.response.status,
        data: error.response.data,
        message
      });

      // Hiển thị thông báo cho người dùng
      if (typeof window !== 'undefined') {
        // Sử dụng sonner toast nếu có, hoặc alert
        try {
          // Thử import sonner dynamically
          const { toast } = await import('sonner');
          toast.error('Yêu cầu đăng nhập', {
            description: 'Vui lòng đăng nhập để tiếp tục phát nhạc và sử dụng các tính năng.',
            duration: 5000,
          });
        } catch {
          // Fallback nếu sonner không có
          alert('Yêu cầu đăng nhập\nVui lòng đăng nhập để tiếp tục phát nhạc và sử dụng các tính năng.');
        }

        // Clear user tokens và redirect về login
        clearUserTokens();

        // Đợi một chút để toast hiển thị trước khi redirect
        setTimeout(() => {
          const isAdminPage = window.location.pathname.startsWith('/admin');
          window.location.href = isAdminPage ? '/admin/login' : '/login';
        }, 1000);
      }

      return Promise.reject(new Error(message));
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
    console.log('[refreshTokenIfNeeded] No token or refresh token available');
    return false;
  }

  // Check if token is expiring soon (within 5 minutes) - refresh sớm hơn để tránh hết hạn
  if (!isTokenExpiringSoon(token, 5)) {
    return false; // Token is still valid, no need to refresh
  }

  // Prevent multiple simultaneous refresh attempts
  if (isRefreshingProactively) {
    console.log('[refreshTokenIfNeeded] Refresh already in progress, waiting...');
    // Wait for current refresh to complete
    let waitCount = 0;
    while (isRefreshingProactively && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    // Check if we got a new token
    const newToken = getAuthToken();
    return newToken !== token;
  }

  isRefreshingProactively = true;

  try {
    console.log('[refreshTokenIfNeeded] Token expiring soon (within 5 min), refreshing proactively...');
    const { authApi } = await import('./authApi');
    const response = await authApi.refreshToken(refreshToken);

    if (response.token && response.refreshToken) {
      console.log('[refreshTokenIfNeeded] ✅ Token refreshed successfully');
      setUserTokens(response.token, response.refreshToken);
      isRefreshingProactively = false;
      return true;
    } else {
      console.error('[refreshTokenIfNeeded] ❌ Invalid refresh response:', response);
      isRefreshingProactively = false;
      return false;
    }
  } catch (error) {
    console.error('[refreshTokenIfNeeded] ❌ Failed to refresh token:', error);
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
    clearUserTokens();
    return null;
  }

  manualRefreshPromise = (async () => {
    try {
      const { authApi } = await import('./authApi');
      const response = await authApi.refreshToken(refreshToken);

      if (response.token) {
        setUserTokens(response.token, response.refreshToken || refreshToken);
        return response.token;
      }

      throw new Error('Invalid response from refresh token endpoint');
    } catch (error) {
      clearUserTokens();
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
  // Wait a bit for sessionStorage to be ready
  setTimeout(() => {
    const token = getAuthToken();
    if (token && !tokenRefreshInterval) {
      console.log('[config] Starting token refresh interval');
      startTokenRefreshInterval();
    }
  }, 500);
}

// ========================================
// ADMIN CLIENT - Dùng adminToken riêng
// ========================================

// Tạo axios instance cho admin với config cơ bản
export const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper để set admin tokens riêng
export const setAdminTokens = (token: string, refreshToken?: string) => {
  try {
    if (typeof window === 'undefined') return;

    sessionStorage.setItem('adminToken', token);
    if (refreshToken) {
      sessionStorage.setItem('adminRefreshToken', refreshToken);
    }

    console.log('[setAdminTokens] Admin tokens saved to sessionStorage:', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken
    });

    // Broadcast token update
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.postMessage({
          type: 'TOKEN_UPDATED',
          timestamp: Date.now()
        });
        authChannel.close();
        console.log('[setAdminTokens] Broadcasted TOKEN_UPDATED to other tabs');
      } catch (error) {
        console.warn('[setAdminTokens] Failed to broadcast token update:', error);
      }
    }

    // Dispatch custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenUpdated'));
    }
  } catch (error) {
    console.error('[setAdminTokens] Failed to save tokens:', error);
  }
};

// Helper để clear admin tokens
export const clearAdminTokens = () => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminRefreshToken');
    console.log('[clearAdminTokens] Admin tokens cleared from sessionStorage');
  } catch (error) {
    console.error('[clearAdminTokens] Failed to clear tokens:', error);
  }
};

// Admin refresh token helper
let isRefreshingAdmin = false;
let failedQueueAdmin: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueueAdmin = (error: any, token: string | null = null) => {
  failedQueueAdmin.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueueAdmin = [];
};

// Request interceptor cho adminClient
adminClient.interceptors.request.use(
  async (config) => {
    // ✅ Nếu data là FormData, xóa Content-Type để axios tự set boundary đúng
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const adminToken = getAdminToken();

    // Check if token is expiring soon before sending request
    if (adminToken && isTokenExpiringSoon(adminToken, 5)) {
      console.log('[adminClient] Token expiring soon (within 5 min), refreshing before request...');
      try {
        const refreshed = await refreshAdminTokenIfNeeded();
        if (refreshed) {
          const newToken = getAdminToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            console.log('[adminClient] Using refreshed token');
            return config;
          }
        }
      } catch (error) {
        console.error('[adminClient] Failed to refresh token before request:', error);
      }
    }

    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor cho adminClient
adminClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 (Unauthorized) và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshingAdmin) {
        return new Promise((resolve, reject) => {
          failedQueueAdmin.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return adminClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshingAdmin = true;

      const adminRefreshToken = getAdminRefreshToken();
      if (!adminRefreshToken) {
        isRefreshingAdmin = false;
        processQueueAdmin(new Error('No admin refresh token available'), null);
        console.warn('[adminClient] No admin refresh token available.');
        return Promise.reject(new Error('No admin refresh token available'));
      }

      try {
        console.log('[adminClient] Token expired, refreshing admin token...');
        const { authApi } = await import('./authApi');
        const response = await authApi.refreshToken(adminRefreshToken);

        if (response.token && response.refreshToken) {
          console.log('[adminClient] Admin token refreshed successfully');
          setAdminTokens(response.token, response.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${response.token}`;
          processQueueAdmin(null, response.token);
          isRefreshingAdmin = false;

          console.log('[adminClient] Retrying original request with new token');
          return adminClient(originalRequest);
        } else {
          console.error('[adminClient] Invalid refresh response:', response);
          throw new Error('Invalid response from refresh token endpoint');
        }
      } catch (refreshError) {
        console.error('[adminClient] Refresh token failed:', refreshError);
        isRefreshingAdmin = false;

        const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
        const isNoTokenError = errorMessage.includes('No refresh token') || errorMessage.includes('refresh token');

        if (!isNoTokenError) {
          clearAdminTokens();
        }

        processQueueAdmin(refreshError, null);
        console.warn('[adminClient] Refresh token failed.');

        return Promise.reject(refreshError);
      }
    }

    // Xử lý lỗi 403 (Access Denied)
    if (error.response?.status === 403) {
      const message = error.response.data?.message ||
        error.response.data?.error ||
        'Access Denied';

      console.error("[adminClient] Access Denied (403):", {
        status: error.response.status,
        data: error.response.data,
        message
      });

      if (typeof window !== 'undefined') {
        try {
          const { toast } = await import('sonner');
          toast.error('Không có quyền truy cập', {
            description: 'Bạn không có quyền thực hiện thao tác này.',
            duration: 5000,
          });
        } catch {
          alert('Không có quyền truy cập\nBạn không có quyền thực hiện thao tác này.');
        }

        clearAdminTokens();

        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 1000);
      }

      return Promise.reject(new Error(message));
    }

    // Xử lý lỗi chung
    if (error.response) {
      const message = error.response.data?.message ||
        error.response.data?.error ||
        error.response.data?.details ||
        (typeof error.response.data === 'string' ? error.response.data : null) ||
        `${error.response.status} ${error.response.statusText}`;
      console.error("[adminClient] Server error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        message
      });
      throw new Error(message);
    } else if (error.request) {
      console.error("[adminClient] Network error - no response received:", {
        code: error.code,
        message: error.message,
        timeout: error.config?.timeout,
        url: error.config?.url
      });

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Request timeout - the server is taking too long to respond. Please try again.');
      }

      throw new Error('Network error - please check your connection and ensure the backend server is running');
    } else {
      console.error("[adminClient] Request setup error:", error.message);
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

// Helper để refresh admin token nếu cần
export const refreshAdminTokenIfNeeded = async (): Promise<boolean> => {
  const adminToken = getAdminToken();
  const adminRefreshToken = getAdminRefreshToken();

  if (!adminToken || !adminRefreshToken) {
    console.log('[refreshAdminTokenIfNeeded] No admin token or refresh token available');
    return false;
  }

  if (!isTokenExpiringSoon(adminToken, 5)) {
    return false;
  }

  if (isRefreshingAdmin) {
    console.log('[refreshAdminTokenIfNeeded] Refresh already in progress, waiting...');
    let waitCount = 0;
    while (isRefreshingAdmin && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    const newToken = getAdminToken();
    return newToken !== adminToken;
  }

  isRefreshingAdmin = true;

  try {
    console.log('[refreshAdminTokenIfNeeded] Admin token expiring soon, refreshing proactively...');
    const { authApi } = await import('./authApi');
    const response = await authApi.refreshToken(adminRefreshToken);

    if (response.token && response.refreshToken) {
      console.log('[refreshAdminTokenIfNeeded] ✅ Admin token refreshed successfully');
      setAdminTokens(response.token, response.refreshToken);
      isRefreshingAdmin = false;
      return true;
    } else {
      console.error('[refreshAdminTokenIfNeeded] ❌ Invalid refresh response:', response);
      isRefreshingAdmin = false;
      return false;
    }
  } catch (error) {
    console.error('[refreshAdminTokenIfNeeded] ❌ Failed to refresh admin token:', error);
    isRefreshingAdmin = false;
    return false;
  }
};

export default apiClient;
