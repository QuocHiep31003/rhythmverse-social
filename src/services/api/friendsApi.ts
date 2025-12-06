import { apiClient } from "./config";

export const friendsApi = {
  // Backward-compatible: senderId tham số bị bỏ qua theo API mới
  sendRequest: async (_senderId: number, receiverId: number) => {
    try {
      const response = await apiClient.post('/friends/requests', { toUserId: receiverId });
      return response.data || 'Friend request sent';
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send friend request';
      throw new Error(errorMsg);
    }
  },

  accept: async (requestId: number) => {
    try {
      const response = await apiClient.post(`/friends/requests/${requestId}/accept`);
      return response.data || 'Friend request accepted';
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept friend request';
      throw new Error(errorMsg);
    }
  },

  // New API: Reject a friend request
  reject: async (requestId: number) => {
    try {
      const response = await apiClient.post(`/friends/requests/${requestId}/reject`);
      return response.data || 'Friend request rejected';
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to reject friend request';
      throw new Error(errorMsg);
    }
  },

  // Backward-compatible: userId tham số bị bỏ qua theo API mới
  getFriends: async (_userId?: number) => {
    try {
      const response = await apiClient.get('/friends');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get friends';
      throw new Error(errorMsg);
    }
  },

  // Backward-compatible: thay bằng requests?incoming=true
  getPending: async (_userId?: number) => {
    try {
      const response = await apiClient.get('/friends/requests?incoming=true');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get pending friend requests';
      throw new Error(errorMsg);
    }
  },

  // Backward-compatible: userId tham số bị bỏ qua theo API mới
  remove: async (_userId: number, friendId: number, opts?: { relationshipId?: number }) => {
    console.log('[Friends API] Unfriend request:', {
      userId: _userId,
      friendId: friendId,
      relationshipId: opts?.relationshipId
    });

    try {
      // Prefer official endpoint: DELETE /api/friends/{friendId}
      const response = await apiClient.delete(`/friends/${friendId}`);
      const result = response.data || "Unfriended";
      console.log('[Friends API] Unfriend success:', result);
      return result;
    } catch (error1: any) {
      // Fallback: try relationshipId endpoint if available
      if (opts?.relationshipId) {
        try {
          console.log('[Friends API] Trying fallback endpoint with relationshipId:', opts.relationshipId);
          const response = await apiClient.delete(`/friends/relationships/${opts.relationshipId}`);
          const result = response.data || "Unfriended";
          console.log('[Friends API] Unfriend success (fallback):', result);
          return result;
        } catch (error2: any) {
          const errorMsg = error1.response?.data?.message || error2.response?.data?.message || error1.message || error2.message || "Failed to unfriend";
          console.error('[Friends API] Both endpoints failed');
          throw new Error(errorMsg);
        }
      }
      const errorMsg = error1.response?.data?.message || error1.message || "Failed to unfriend";
      throw new Error(errorMsg);
    }
  },
};

// New API: Friend Requests listing with direction
export const friendRequestsApi = {
  // GET /api/friends/requests?incoming=true|false
  list: async (incoming: boolean) => {
    try {
      const qs = new URLSearchParams({ incoming: String(incoming) }).toString();
      const response = await apiClient.get(`/friends/requests?${qs}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to list friend requests';
      throw new Error(errorMsg);
    }
  },
};

// Public profile API (no token required)
export interface PublicProfileDTO {
  id?: number;
  username: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

export const publicProfileApi = {
  // GET /api/user/{username}/public
  get: async (username: string): Promise<PublicProfileDTO> => {
    try {
      const response = await apiClient.get<PublicProfileDTO>(`/user/${encodeURIComponent(username)}/public`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get public profile';
      throw new Error(errorMsg);
    }
  },
};

// Invite Link DTO
export interface InviteLinkDTO {
  id: number;
  inviterId: number;
  inviterName: string;
  inviterAvatar?: string | null;
  inviteCode: string;
  inviteUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

// Preview response
export interface InvitePreviewDTO {
  inviterId: number;
  inviterName: string;
  inviterAvatar?: string | null;
  message: string; // "{Tên} mời bạn kết bạn"
}

// Toggle response
export interface ToggleInviteLinkResponse {
  isActive: boolean;
  message: string;
}

export const inviteLinksApi = {
  // Lấy invite link của tôi (mỗi user chỉ có 1 link duy nhất)
  getMyInviteLink: async (): Promise<InviteLinkDTO> => {
    try {
      const response = await apiClient.get<InviteLinkDTO>('/friends/invite/me');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get my invite link';
      throw new Error(errorMsg);
    }
  },

  // Tạo/lấy invite link cho user (backward compatibility - POST endpoint)
  // Endpoint này sẽ gọi getOrCreateInviteLink() giống như GET /me
  create: async (userId: number): Promise<InviteLinkDTO & { shareUrl?: string }> => {
    try {
      const response = await apiClient.post<InviteLinkDTO>(`/friends/invite/${userId}`);
      const data = response.data;
      // Xử lý cả hai trường hợp: inviteUrl và shareUrl
      return {
        ...data,
        inviteUrl: data.inviteUrl || (data as any).shareUrl,
        shareUrl: (data as any).shareUrl || data.inviteUrl,
        isActive: data.isActive !== undefined ? data.isActive : (data as any).active,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create invite link';
      throw new Error(errorMsg);
    }
  },

  // Lấy invite link của user khác (public)
  getUserInviteLink: async (userId: number): Promise<InviteLinkDTO> => {
    try {
      const response = await apiClient.get<InviteLinkDTO>(`/friends/invite/user/${userId}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get user invite link';
      throw new Error(errorMsg);
    }
  },

  // Preview invite link
  preview: async (inviteCode: string): Promise<InvitePreviewDTO> => {
    if (!inviteCode) throw new Error('Missing inviteCode');
    try {
      const qs = new URLSearchParams({ inviteCode }).toString();
      const response = await apiClient.get<InvitePreviewDTO>(`/friends/invite/preview?${qs}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to preview invite link';
      throw new Error(errorMsg);
    }
  },

  // Accept invite link
  accept: async (inviteCode: string) => {
    if (!inviteCode) {
      throw new Error('Missing inviteCode');
    }
    try {
      const qs = new URLSearchParams({ inviteCode }).toString();
      const response = await apiClient.post(`/friends/invite/accept?${qs}`);
      return response.data || 'Invite accepted';
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept invite';
      throw new Error(errorMsg);
    }
  },

  // Toggle enable/disable invite link
  toggle: async (linkId: number, disable: boolean): Promise<ToggleInviteLinkResponse> => {
    try {
      const qs = new URLSearchParams({ disable: String(disable) }).toString();
      const response = await apiClient.put<ToggleInviteLinkResponse>(`/friends/invite/${linkId}/toggle?${qs}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to toggle invite link';
      throw new Error(errorMsg);
    }
  },
};
