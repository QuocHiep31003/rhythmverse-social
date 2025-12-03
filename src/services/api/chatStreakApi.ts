import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "./config";

export interface ChatStreakDTO {
  id: number;
  user1Id: number;
  user2Id: number;
  user1Name?: string | null;
  user2Name?: string | null;
  user1Avatar?: string | null;
  user2Avatar?: string | null;
  streak?: number; // backend json alias for currentStreakCount
  currentStreakCount?: number;
  maxStreak?: number | null;
  maxStreakCount?: number | null;
  lastInteraction?: string | null; // ISO date (YYYY-MM-DD)
  lastInteractionDate?: string | null;
  streakStartDate?: string | null;
  streakEndDate?: string | null;
  isActive: boolean;
  expireAt?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const chatStreakApi = {
  /**
   * Lấy tất cả active streaks của user hiện tại
   * GET /api/chat-streaks/active
   */
  getActive: async (): Promise<ChatStreakDTO[]> => {
    const res = await fetch(`${API_BASE_URL}/chat-streaks/active`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseErrorResponse(res));
    }
    const data = await res.json();
    return Array.isArray(data) ? (data as ChatStreakDTO[]) : [];
  },

  /**
   * Lấy streak giữa user hiện tại và một user khác
   * GET /api/chat-streaks/between/{otherUserId}
   */
  getBetween: async (otherUserId: number | string): Promise<ChatStreakDTO | null> => {
    const id = Number(otherUserId);
    if (!Number.isFinite(id)) {
      throw new Error("Invalid friend id");
    }

    const params = new URLSearchParams({ friendId: String(id) });

    const res = await fetch(`${API_BASE_URL}/chat-streaks/between?${params.toString()}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(await parseErrorResponse(res));
    }

    const data = (await res.json()) as ChatStreakDTO | null;
    return data;
  },

  /**
   * Tăng streak (ghi nhận tương tác) giữa user hiện tại và friendId
   */
  increment: async (friendId: number | string): Promise<ChatStreakDTO> => {
    const id = Number(friendId);
    if (!Number.isFinite(id)) {
      throw new Error("Invalid friend id");
    }
    const res = await fetch(`${API_BASE_URL}/chat-streaks/increment/${id}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseErrorResponse(res));
    }
    return (await res.json()) as ChatStreakDTO;
  },
};


