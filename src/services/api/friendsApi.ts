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

export const inviteLinksApi = {
  create: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/friends/invite/${userId}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    return await response.json();
  },

  preview: async (inviteCode: string) => {
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
      return await response.json();
    } catch {
      try { return await response.text(); } catch { return 'Invite accepted'; }
    }
  },
};

