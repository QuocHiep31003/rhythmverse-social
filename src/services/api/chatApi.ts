import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

export interface ChatMessageDTO {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt: string;
  read: boolean;
}

export const chatApi = {
  getHistory: async (userId1: number, userId2: number): Promise<ChatMessageDTO[]> => {
    const res = await fetch(`${API_BASE_URL}/chat/history/${userId1}/${userId2}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
};

