import apiClient from "./config";

export interface SeedPreferencePayload {
  artistIds: number[];
}

export interface SeedPreferenceResponse {
  completed: boolean;
  artistIds: number[];
  initialEmbedding?: string;
}

export const userPreferenceApi = {
  getSeed: async (): Promise<SeedPreferenceResponse> => {
    const res = await apiClient.get("/user/preferences/seed");
    return res.data;
  },
  saveSeed: async (payload: SeedPreferencePayload): Promise<SeedPreferenceResponse> => {
    const res = await apiClient.post("/user/preferences/seed", payload);
    return res.data;
  },
};

export default userPreferenceApi;

