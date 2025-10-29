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
};

export default authApi;


