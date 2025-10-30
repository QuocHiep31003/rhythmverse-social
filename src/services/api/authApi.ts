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
            const error = await response.json();
            throw new Error(error.message || 'Không gửi được OTP reset password');
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
            const error = await response.json();
            throw new Error(error.message || 'Đặt lại mật khẩu thất bại');
        }
        return await response.json();
    },
};

export default authApi;


