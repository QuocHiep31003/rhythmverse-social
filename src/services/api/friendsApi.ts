import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

export const friendsApi = {
  // Backward-compatible: senderId tham số bị bỏ qua theo API mới
  sendRequest: async (_senderId: number, receiverId: number) => {
    // New API: POST /api/friends/requests  body: { toUserId }
    const url = `${API_BASE_URL}/friends/requests`;
    const response = await fetch(url, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ toUserId: receiverId }),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    try {
      return await response.text();
    } catch {
      return 'Friend request sent';
    }
  },

  accept: async (requestId: number) => {
    // New API: POST /api/friends/requests/{id}/accept
    const response = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/accept`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    try {
      return await response.text();
    } catch {
      return 'Friend request accepted';
    }
  },

  // New API: Reject a friend request
  reject: async (requestId: number) => {
    // POST /api/friends/requests/{id}/reject
    const response = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/reject`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    try {
      return await response.text();
    } catch {
      return 'Friend request rejected';
    }
  },

  // Backward-compatible: userId tham số bị bỏ qua theo API mới
  getFriends: async (_userId?: number) => {
    // New API: GET /api/friends
    const response = await fetch(`${API_BASE_URL}/friends`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  // Backward-compatible: thay bằng requests?incoming=true
  getPending: async (_userId?: number) => {
    const response = await fetch(`${API_BASE_URL}/friends/requests?incoming=true`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  // Backward-compatible: userId tham số bị bỏ qua theo API mới
  remove: async (_userId: number, friendId: number, opts?: { relationshipId?: number }) => {
    const headers = buildJsonHeaders();

    // Prefer official endpoint: DELETE /api/friends/{friendId}
    const primaryResponse = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
      method: "DELETE",
      headers,
    });

    if (primaryResponse.ok) {
      try {
        return await primaryResponse.text();
      } catch {
        return "Unfriended";
      }
    }

    const primaryError = await parseErrorResponse(primaryResponse);

    if (opts?.relationshipId) {
      const fallbackResponse = await fetch(`${API_BASE_URL}/friends/relationships/${opts.relationshipId}`, {
        method: "DELETE",
        headers,
      });
      if (fallbackResponse.ok) {
        try {
          return await fallbackResponse.text();
        } catch {
          return "Unfriended";
        }
      }
      const fallbackError = await parseErrorResponse(fallbackResponse);
      throw new Error(primaryError || fallbackError || "Failed to unfriend");
    }

    throw new Error(primaryError || "Failed to unfriend");
  },
};

// New API: Friend Requests listing with direction
export const friendRequestsApi = {
  // GET /api/friends/requests?incoming=true|false
  list: async (incoming: boolean) => {
    const qs = new URLSearchParams({ incoming: String(incoming) }).toString();
    const response = await fetch(`${API_BASE_URL}/friends/requests?${qs}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(username)}/public`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/friends/invite/me`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  // Tạo/lấy invite link cho user (backward compatibility - POST endpoint)
  // Endpoint này sẽ gọi getOrCreateInviteLink() giống như GET /me
  create: async (userId: number): Promise<InviteLinkDTO & { shareUrl?: string }> => {
    const response = await fetch(`${API_BASE_URL}/friends/invite/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    const data = await response.json();
    // Xử lý cả hai trường hợp: inviteUrl và shareUrl
    return {
      ...data,
      inviteUrl: data.inviteUrl || data.shareUrl,
      shareUrl: data.shareUrl || data.inviteUrl,
      isActive: data.isActive !== undefined ? data.isActive : data.active,
    };
  },

  // Lấy invite link của user khác (public)
  getUserInviteLink: async (userId: number): Promise<InviteLinkDTO> => {
    const response = await fetch(`${API_BASE_URL}/friends/invite/user/${userId}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  // Preview invite link
  preview: async (inviteCode: string): Promise<InvitePreviewDTO> => {
    if (!inviteCode) throw new Error('Missing inviteCode');
    const qs = new URLSearchParams({ inviteCode }).toString();
    const response = await fetch(`${API_BASE_URL}/friends/invite/preview?${qs}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  // Accept invite link
  accept: async (inviteCode: string) => {
    if (!inviteCode) {
      throw new Error('Missing inviteCode');
    }
    const qs = new URLSearchParams({ inviteCode }).toString();
    const response = await fetch(`${API_BASE_URL}/friends/invite/accept?${qs}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    try {
      return await response.text();
    } catch {
      return 'Invite accepted';
    }
  },

  // Toggle enable/disable invite link
  toggle: async (linkId: number, disable: boolean): Promise<ToggleInviteLinkResponse> => {
    const qs = new URLSearchParams({ disable: String(disable) }).toString();
    const response = await fetch(`${API_BASE_URL}/friends/invite/${linkId}/toggle?${qs}`, {
      method: 'PUT',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },
};
