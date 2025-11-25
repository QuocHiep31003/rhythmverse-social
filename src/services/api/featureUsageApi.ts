import { API_BASE_URL, fetchWithAuth, parseErrorResponse } from "./config";

export enum FeatureName {
  PLAYLIST_CREATE = "PLAYLIST_CREATE",
  OFFLINE_DOWNLOAD = "OFFLINE_DOWNLOAD",
  AI_SEARCH = "AI_SEARCH",
  ADVANCED_ANALYTICS = "ADVANCED_ANALYTICS",
  CUSTOM_THEME = "CUSTOM_THEME",
}

export interface FeatureUsageDTO {
  id?: number;
  userId?: number;
  featureName: FeatureName;
  featureDisplayName?: string;
  usageCount?: number;
  limit?: number;
  remaining?: number;
  usageDate?: string;
  isPremium?: boolean;
  canUse?: boolean;
}

const parseResponse = async (response: Response): Promise<any> => {
  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const payload = await response.json();
  if (payload.success && payload.data !== undefined) {
    return payload.data;
  }
  return payload;
};

export const featureUsageApi = {
  /**
   * Lấy thông tin usage của một feature cho user hiện tại
   */
  getFeatureUsage: async (featureName: FeatureName): Promise<FeatureUsageDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/feature-usage/${featureName}`,
      { method: "GET" }
    );

    return parseResponse(response);
  },

  /**
   * Kiểm tra user có thể sử dụng feature không
   */
  canUseFeature: async (featureName: FeatureName): Promise<boolean> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/feature-usage/check/${featureName}`,
      { method: "GET" }
    );

    const result = await parseResponse(response);
    return Boolean(result);
  },

  /**
   * Sử dụng feature (tăng usage count)
   */
  useFeature: async (featureName: FeatureName): Promise<FeatureUsageDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/feature-usage/use/${featureName}`,
      { method: "POST" }
    );

    return parseResponse(response);
  },

  /**
   * Kiểm tra user có phải premium không
   */
  isPremiumUser: async (): Promise<boolean> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/feature-usage/premium-status`,
      { method: "GET" }
    );

    const result = await parseResponse(response);
    return Boolean(result);
  },
};

export default featureUsageApi;

















