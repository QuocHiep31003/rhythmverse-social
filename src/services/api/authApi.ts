import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from './config';

export const authApi = {
    /**
     * Register a new user
     */
    register: async (data: { name: string; email: string; password: string }) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return await response.json();
    },

    getFirebaseToken: async (): Promise<{ token: string; userId: number }> => {
        const response = await fetch(`${API_BASE_URL}/auth/firebase-token`, {
            method: 'GET',
            headers: buildJsonHeaders(),
        });
        if (!response.ok) {
            throw new Error(await parseErrorResponse(response));
        }
        return await response.json();
    },

    /**
     * Verify OTP for registration
     */
    verifyOtp: async (data: { email: string; otp: string }) => {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'OTP verification failed');
        }
        return await response.json();
    },

    login: async (data: { email: string; password: string; rememberMe: boolean }) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return await response.json();
    },

    me: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: buildJsonHeaders(),
        });
        if (!response.ok) {
            throw new Error(await parseErrorResponse(response));
        }
        return await response.json();
    },

    loginAdmin: async (data: { email: string; password: string }) => {
        const response = await fetch(`${API_BASE_URL}/auth/login/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Admin login failed');
        }
        return await response.json();
    },

    /**
     * Gửi OTP reset password
     */
    sendResetPasswordOtp: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error.message || 'Không gửi được OTP reset password');
            } else {
                const text = await response.text();
                throw new Error(text || 'Không gửi được OTP reset password');
            }
        }
        return await response.json();
    },
    /**
     * Đổi mật khẩu qua OTP
     */
    resetPasswordWithOtp: async (email: string, otp: string, newPassword: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error.message || 'Đặt lại mật khẩu thất bại');
            } else {
                const text = await response.text();
                throw new Error(text || 'Đặt lại mật khẩu thất bại');
            }
        }
        return await response.json();
    },

    /**
     * Refresh access token using refresh token
     */
    refreshToken: async (refreshToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to refresh token');
        }

        return await response.json();
    },
};

export default authApi;


