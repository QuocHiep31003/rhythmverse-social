import { apiClient } from './config';
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
            const { name, phone, address, avatar } = payload;
            const body: Record<string, any> = { name, phone, address };
            if (avatar) body.avatar = avatar;
            const response = await apiClient.put<UserDTO>('/user/profile', body);
            return response.data;
        } catch (error: any) {
            console.error('Error updating profile:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update profile';
            throw new Error(errorMsg);
        }
    },

    /**
     * Admin: Trigger subscription expiry reminders (check & send email/notification ngay lập tức)
     */
    triggerSubscriptionReminders: async (): Promise<string> => {
        try {
            const response = await apiClient.post('/user/trigger-subscription-reminders');
            return response.data || "Subscription reminders triggered";
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to trigger subscription reminders";
            throw new Error(errorMsg);
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
            const response = await apiClient.get<UserDTO>(`/user/${userId}`);
            return response.data;
        } catch (error: any) {
            console.error('Error getting user:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get user';
            throw new Error(errorMsg);
        }
    },

    /**
     * Change user password via /api/user/change-password (POST). Body: {oldPassword, newPassword}
     */
    changePassword: async (oldPassword: string, newPassword: string): Promise<string> => {
        try {
            const response = await apiClient.post('/user/change-password', { oldPassword, newPassword });
            return response.data || 'Password changed successfully';
        } catch (error: any) {
            console.error('Error changing password:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to change password';
            throw new Error(errorMsg);
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

            const response = await apiClient.post<UserDTO>('/user/profile/avatar', formData);
            return response.data;
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to upload avatar';
            throw new Error(errorMsg);
        }
    },
};

export default userApi;

