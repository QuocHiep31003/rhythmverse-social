import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * Guest API Client - Dùng cho các API public (không cần token)
 * Không có interceptors để thêm token
 */
export const guestClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor để xử lý lỗi
guestClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const message = error.response.data?.message ||
        error.response.data?.error ||
        error.response.data?.details ||
        (typeof error.response.data === 'string' ? error.response.data : null) ||
        `${error.response.status} ${error.response.statusText}`;
      console.error("[guestClient] Server error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        message
      });
      throw new Error(message);
    } else if (error.request) {
      console.error("[guestClient] Network error - no response received:", {
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
      console.error("[guestClient] Request setup error:", error.message);
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

export default guestClient;

