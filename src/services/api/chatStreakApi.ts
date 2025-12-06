import { apiClient } from "./config";

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
    try {
      const response = await apiClient.get<ChatStreakDTO[]>('/chat-streaks/active');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get active streaks';
      throw new Error(errorMsg);
    }
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

    try {
      const params = new URLSearchParams({ friendId: String(id) });
      const response = await apiClient.get<ChatStreakDTO>(`/chat-streaks/between?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get streak between users';
      throw new Error(errorMsg);
    }
  },

  /**
   * Tăng streak (ghi nhận tương tác) giữa user hiện tại và friendId
   */
  increment: async (friendId: number | string): Promise<ChatStreakDTO> => {
    const id = Number(friendId);
    if (!Number.isFinite(id)) {
      throw new Error("Invalid friend id");
    }
    try {
      const response = await apiClient.post<ChatStreakDTO>(`/chat-streaks/increment/${id}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to increment streak';
      throw new Error(errorMsg);
    }
  },
};


