import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from './config';
import { authApi } from './authApi';

export interface UserDTO {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    roleId?: number;
    roleName?: string;
    password?: string;
}

export interface UpdateProfilePayload {
    name?: string;
    phone?: string;
    address?: string;
    password?: string; // Optional - only if user wants to change password
}

export const userApi = {
    /**
     * Update current user's profile based on token
     * Uses PUT /api/user/profile endpoint which automatically identifies user from token
     */
    updateProfile: async (payload: UpdateProfilePayload): Promise<UserDTO> => {
        try {
            // Prepare the request body - only include fields that are provided
            const requestBody: any = {};
            if (payload.name !== undefined) requestBody.name = payload.name;
            if (payload.phone !== undefined) requestBody.phone = payload.phone;
            if (payload.address !== undefined) requestBody.address = payload.address;
            if (payload.password !== undefined && payload.password.trim() !== '') {
                requestBody.password = payload.password;
            }

            // Call PUT /api/user/profile - user is identified from token
            const response = await fetch(`${API_BASE_URL}/user/profile`, {
                method: 'PUT',
                headers: buildJsonHeaders(),
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorMessage = await parseErrorResponse(response);
                throw new Error(errorMessage);
            }

            const updatedUser = await response.json();
            return updatedUser;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error instanceof Error ? error : new Error('Failed to update profile');
        }
    },

    /**
     * Get current user's profile from token
     */
    getCurrentProfile: async (): Promise<UserDTO> => {
        try {
            const user = await authApi.me();
            return user as UserDTO;
        } catch (error) {
            console.error('Error getting current profile:', error);
            throw error instanceof Error ? error : new Error('Failed to get profile');
        }
    },

    /**
     * Get user by ID (for admin or viewing other profiles)
     */
    getById: async (userId: number): Promise<UserDTO> => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
                method: 'GET',
                headers: buildJsonHeaders(),
            });

            if (!response.ok) {
                const errorMessage = await parseErrorResponse(response);
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting user:', error);
            throw error instanceof Error ? error : new Error('Failed to get user');
        }
    },
};

export default userApi;

