import { apiClient } from './config';
import { guestClient } from './guestApi';

export const authApi = {
    /**
     * Register a new user (public - không cần token)
     */
    register: async (data: { name: string; email: string; password: string }) => {
        try {
            const response = await guestClient.post('/auth/register', data);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
            throw new Error(errorMsg);
        }
    },

    getFirebaseToken: async (): Promise<{ token: string; userId: number }> => {
        try {
            const response = await apiClient.get<{ token: string; userId: number }>('/auth/firebase-token');
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get Firebase token';
            throw new Error(errorMsg);
        }
    },

    /**
     * Verify OTP for registration (public - không cần token)
     */
    verifyOtp: async (data: { email: string; otp: string }) => {
        try {
            const response = await guestClient.post('/auth/verify-otp', data);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'OTP verification failed';
            throw new Error(errorMsg);
        }
    },

    login: async (data: { email: string; password: string; rememberMe: boolean }) => {
        try {
            const response = await guestClient.post('/auth/login', data);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Login failed';
            throw new Error(errorMsg);
        }
    },

    me: async () => {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get current user';
            throw new Error(errorMsg);
        }
    },

    loginAdmin: async (data: { email: string; password: string }) => {
        try {
            const response = await guestClient.post('/auth/login/admin', data);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Admin login failed';
            throw new Error(errorMsg);
        }
    },

    /**
     * Gửi OTP reset password (public - không cần token)
     */
    sendResetPasswordOtp: async (email: string) => {
        try {
            const response = await guestClient.post('/auth/forgot-password/send-otp', { email });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Không gửi được OTP reset password';
            throw new Error(errorMsg);
        }
    },
    /**
     * Đổi mật khẩu qua OTP (public - không cần token)
     */
    resetPasswordWithOtp: async (email: string, otp: string, newPassword: string) => {
        try {
            const response = await guestClient.post('/auth/forgot-password/reset', { email, otp, newPassword });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Đặt lại mật khẩu thất bại';
            throw new Error(errorMsg);
        }
    },

    /**
     * Refresh access token using refresh token (public - không cần token)
     */
    refreshToken: async (refreshToken: string) => {
        try {
            const response = await guestClient.post('/auth/refresh', { refreshToken });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to refresh token';
            throw new Error(errorMsg);
        }
    },

    /**
     * OAuth2 login with Google (for mobile apps) (public - không cần token)
     * Mobile app should get access token from Google SDK and send it here
     * 
     * @param data OAuth2TokenRequest containing Google access token
     * @returns AuthResponse with JWT token and user info
     */
    loginWithGoogle: async (data: { accessToken: string; rememberMe?: boolean }) => {
        try {
            const response = await guestClient.post('/auth/oauth2/google', {
                accessToken: data.accessToken,
                rememberMe: data.rememberMe || false,
            });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Google login failed';
            throw new Error(errorMsg);
        }
    },

    /**
     * OAuth2 login with Facebook (for mobile apps) (public - không cần token)
     * Mobile app should get access token from Facebook SDK and send it here
     * 
     * @param data OAuth2TokenRequest containing Facebook access token
     * @returns AuthResponse with JWT token and user info
     */
    loginWithFacebook: async (data: { accessToken: string; rememberMe?: boolean }) => {
        try {
            const response = await guestClient.post('/auth/oauth2/facebook', {
                accessToken: data.accessToken,
                rememberMe: data.rememberMe || false,
            });
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Facebook login failed';
            throw new Error(errorMsg);
        }
    },
};

export default authApi;


