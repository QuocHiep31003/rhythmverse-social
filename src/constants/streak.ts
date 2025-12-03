export const STREAK_STORAGE_EVENT = "streak:update";

export interface StreakStorageEventDetail {
  friendId: string;
  type: "updated" | "invalidate";
  payload?: {
    streak: number;
    expireAt: number | null;
    lastInteraction: string | null;
    isActive: boolean;
  };
}







