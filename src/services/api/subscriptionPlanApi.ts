import { apiClient } from "./config";

export interface PlanFeatureDTO {
  id?: number;
  planId?: number;
  featureName: string;
  featureDisplayName?: string;
  limitValue?: number | null; // null = unlimited
  limitType?: string; // UNLIMITED, LIMITED, DISABLED
  limitPeriod?: string; // NONE, DAY, WEEK, MONTH, YEAR
  limitCycle?: string; // DAILY, MONTHLY (mới thêm)
  periodValue?: number;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanDetailDTO {
  id?: number;
  planId?: number;
  detailName: string;
  price: number;
  currency?: string;
  durationDays: number;
  isActive?: boolean;
  displayOrder?: number;
  isRecommended?: boolean;
  updatedById?: number;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlanDTO {
  id?: number;
  planCode: string;
  planName: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  features?: PlanFeatureDTO[];
  details?: PlanDetailDTO[]; // Các options giá/thời gian
  updatedById?: number;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
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

export const subscriptionPlanApi = {
  /**
   * Lấy tất cả các gói đang active (Public)
   */
  getActivePlans: async (): Promise<SubscriptionPlanDTO[]> => {
    const response = await apiClient.get('/subscription-plans');
    return parseResponse(response.data);
  },

  /**
   * Lấy tất cả các gói (Admin only)
   */
  getAllPlans: async (): Promise<SubscriptionPlanDTO[]> => {
    const response = await apiClient.get('/subscription-plans/all');
    return parseResponse(response.data);
  },

  /**
   * Lấy gói theo ID
   */
  getPlanById: async (id: number): Promise<SubscriptionPlanDTO> => {
    const response = await apiClient.get(`/subscription-plans/${id}`);
    return parseResponse(response.data);
  },

  /**
   * Lấy gói theo plan code
   */
  getPlanByCode: async (planCode: string): Promise<SubscriptionPlanDTO> => {
    const response = await apiClient.get(`/subscription-plans/code/${planCode}`);
    return parseResponse(response.data);
  },

  /**
   * Tạo gói mới (Admin only)
   */
  createPlan: async (plan: SubscriptionPlanDTO): Promise<SubscriptionPlanDTO> => {
    const response = await apiClient.post('/subscription-plans', plan);
    return parseResponse(response.data);
  },

  /**
   * Cập nhật gói (Admin only)
   */
  updatePlan: async (id: number, plan: SubscriptionPlanDTO): Promise<SubscriptionPlanDTO> => {
    const response = await apiClient.put(`/subscription-plans/${id}`, plan);
    return parseResponse(response.data);
  },

  /**
   * Xóa gói (Admin only)
   */
  deletePlan: async (id: number): Promise<string> => {
    const response = await apiClient.delete(`/subscription-plans/${id}`);
    return parseResponse(response.data);
  },

  /**
   * Seed các gói mặc định (FREE và PREMIUM) - Admin only
   */
  seedDefaultPlans: async (): Promise<string> => {
    const response = await apiClient.post('/subscription-plans/seed');
    return parseResponse(response.data);
  },
};

export default subscriptionPlanApi;


