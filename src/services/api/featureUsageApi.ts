import { apiClient } from "./config";

export enum FeatureName {
  PLAYLIST_CREATE = "PLAYLIST_CREATE",
  FRIEND_LIMIT = "FRIEND_LIMIT",
  AI_SEARCH = "AI_SEARCH",
  ADVANCED_ANALYTICS = "ADVANCED_ANALYTICS",
}

export enum FeatureLimitType {
  UNLIMITED = "UNLIMITED",
  LIMITED = "LIMITED",
  DISABLED = "DISABLED",
}

export enum FeatureLimitPeriod {
  NONE = "NONE",
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export interface FeatureUsageDTO {
  id?: number;
  userId?: number;
  featureName: FeatureName;
  featureDisplayName?: string;
  usageCount?: number;
  limit?: number | null;
  remaining?: number | null;
  usageDate?: string;
  isPremium?: boolean;
  canUse?: boolean;
  limitType?: FeatureLimitType;
  limitPeriod?: FeatureLimitPeriod;
  periodValue?: number;
}

const parseResponse = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  if (data.success && data.data !== undefined) {
    return data.data;
  }
  return data;
};

export const featureUsageApi = {
  /**
   * Lấy thông tin usage của một feature cho user hiện tại
   */
  getFeatureUsage: async (featureName: FeatureName): Promise<FeatureUsageDTO> => {
    const response = await apiClient.get(`/feature-usage/${featureName}`);
    return parseResponse(response.data);
  },

  /**
   * Kiểm tra user có thể sử dụng feature không
   */
  canUseFeature: async (featureName: FeatureName): Promise<boolean> => {
    const response = await apiClient.get(`/feature-usage/check/${featureName}`);
    const result = parseResponse(response.data);
    return Boolean(result);
  },

  /**
   * Sử dụng feature (tăng usage count)
   */
  useFeature: async (featureName: FeatureName): Promise<FeatureUsageDTO> => {
    const response = await apiClient.post(`/feature-usage/use/${featureName}`);
    return parseResponse(response.data);
  },

  /**
   * Kiểm tra user có phải premium không
   */
  isPremiumUser: async (): Promise<boolean> => {
    const response = await apiClient.get('/feature-usage/premium-status');
    const result = parseResponse(response.data);
    return Boolean(result);
  },
};

export default featureUsageApi;





























