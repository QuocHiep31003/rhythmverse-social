import { API_BASE_URL, buildJsonHeaders, parseErrorResponse, createFormDataHeaders } from './config';
import { authApi } from './authApi';

export interface UserDTO {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    roleId?: number;
    roleName?: string;
    role?: string; // Backend enum UserRole serialized as string: "USER" or "ADMIN"
    roles?: string[]; // Array of roles (if multiple)
    password?: string;
    avatar?: string; // <-- add avatar field
    premium?: boolean;
    isPremium?: boolean;
    premiumStartDate?: string;
    premiumEndDate?: string;
    premiumActivatedAt?: string;
    premiumExpiresAt?: string;
}

export interface UpdateProfilePayload {
    name?: string;
    phone?: string;
    address?: string;
    password?: string; // Optional - only if user wants to change password
    avatarImg?: File | null;
    avatar?: string | null; // add URL string
}

export const userApi = {
    /**
     * Update current user's profile based on token
     * Always sends multipart/form-data regardless of avatar to match BE contract
     */
    updateProfile: async (payload: UpdateProfilePayload): Promise<UserDTO> => {
        try {
            const headers = buildJsonHeaders();
            const { name, phone, address, avatar } = payload;
            const body: Record<string, any> = { name, phone, address };
            if (avatar) body.avatar = avatar;
            const response = await fetch(`${API_BASE_URL}/user/profile`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
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
     * Admin: Trigger subscription expiry reminders (check & send email/notification ngay lập tức)
     */
    triggerSubscriptionReminders: async (): Promise<string> => {
        const response = await fetch(`${API_BASE_URL}/user/trigger-subscription-reminders`, {
            method: "POST",
            headers: buildJsonHeaders(),
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text || "Failed to trigger subscription reminders");
        }
        return text;
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

    /**
     * Change user password via /api/user/change-password (POST). Body: {oldPassword, newPassword}
     */
    changePassword: async (oldPassword: string, newPassword: string): Promise<string> => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/change-password`, {
                method: 'POST',
                headers: buildJsonHeaders(),
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const text = await response.text();
            if (!response.ok) {
                throw new Error(text || 'Failed to change password');
            }
            return text;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error instanceof Error ? error : new Error('Failed to change password');
        }
    },

    /**
     * Upload profile avatar image to backend
     * Backend will handle Cloudinary upload with metadata and automatically update user avatar
     */
    uploadAvatar: async (file: File): Promise<UserDTO> => {
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size exceeds 5MB limit');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/user/profile/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData
            });

            if (!response.ok) {
                const errorMessage = await parseErrorResponse(response);
                throw new Error(errorMessage);
            }

            const updatedUser = await response.json();
            return updatedUser;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error instanceof Error ? error : new Error('Failed to upload avatar');
        }
    },
};

export default userApi;

