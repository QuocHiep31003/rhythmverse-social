import { API_BASE_URL, fetchWithAuth, parseErrorResponse } from "./config";

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

export const subscriptionPlanApi = {
  /**
   * Lấy tất cả các gói đang active (Public)
   */
  getActivePlans: async (): Promise<SubscriptionPlanDTO[]> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans`,
      { method: "GET" }
    );
    return parseResponse(response);
  },

  /**
   * Lấy tất cả các gói (Admin only)
   */
  getAllPlans: async (): Promise<SubscriptionPlanDTO[]> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/all`,
      { method: "GET" }
    );
    return parseResponse(response);
  },

  /**
   * Lấy gói theo ID
   */
  getPlanById: async (id: number): Promise<SubscriptionPlanDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/${id}`,
      { method: "GET" }
    );
    return parseResponse(response);
  },

  /**
   * Lấy gói theo plan code
   */
  getPlanByCode: async (planCode: string): Promise<SubscriptionPlanDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/code/${planCode}`,
      { method: "GET" }
    );
    return parseResponse(response);
  },

  /**
   * Tạo gói mới (Admin only)
   */
  createPlan: async (plan: SubscriptionPlanDTO): Promise<SubscriptionPlanDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plan),
      }
    );
    return parseResponse(response);
  },

  /**
   * Cập nhật gói (Admin only)
   */
  updatePlan: async (id: number, plan: SubscriptionPlanDTO): Promise<SubscriptionPlanDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plan),
      }
    );
    return parseResponse(response);
  },

  /**
   * Xóa gói (Admin only)
   */
  deletePlan: async (id: number): Promise<string> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/${id}`,
      { method: "DELETE" }
    );
    return parseResponse(response);
  },

  /**
   * Seed các gói mặc định (FREE và PREMIUM) - Admin only
   */
  seedDefaultPlans: async (): Promise<string> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/subscription-plans/seed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return parseResponse(response);
  },
};

export default subscriptionPlanApi;


