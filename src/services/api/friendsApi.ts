import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

export const friendsApi = {
  sendRequest: async (senderId: number, receiverId: number) => {
    const url = `${API_BASE_URL}/friends/request?senderId=${encodeURIComponent(senderId)}&receiverId=${encodeURIComponent(receiverId)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: buildJsonHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/friends/accept/${requestId}`, {
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

  getFriends: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/friends/${userId}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  getPending: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/friends/pending/${userId}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  remove: async (userId: number, friendId: number) => {
    const qs = new URLSearchParams({ userId: String(userId), friendId: String(friendId) }).toString();
    const response = await fetch(`${API_BASE_URL}/friends?${qs}`, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    try { return await response.text(); } catch { return 'Unfriended'; }
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

