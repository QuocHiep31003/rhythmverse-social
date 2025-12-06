import { apiClient } from "./config";

export interface PremiumSubscriptionDTO {
  id?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  userAddress?: string;
  userAvatar?: string;
  orderCode?: number;
  // Snapshot fields to preserve purchase-time data
  priceAtPurchase?: number | null;
  currencyAtPurchase?: string | null;
  durationDaysSnapshot?: number | null;
  planPriceSnapshot?: number | null;
  planCurrencySnapshot?: string | null;
  planDurationDaysSnapshot?: number | null;
  planFeatureSnapshot?: string | null;
  planName?: string;
  planCode?: string;
  description?: string;
  durationDays?: number;
  amount?: number;
  currency?: string;
  status?: string;
  subscriptionStatus?: string;
  state?: string;
  paymentStatus?: string;
  startsAt?: string;
  expiresAt?: string;
  startDate?: string;
  endDate?: string;
  currentPeriodEnd?: string;
  reference?: string;
  createdAt?: string;
  updatedAt?: string;
  autoRenew?: boolean;
  price?: number;
  active?: boolean;
  isActive?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const extractLatestSubscription = (data: any): PremiumSubscriptionDTO | null => {
  if (!data) return null;
  const pageData = data?.data ?? data;

  const pickLatest = (items: PremiumSubscriptionDTO[]) => {
    if (!items.length) return null;
    // Ưu tiên ACTIVE, sau đó trạng thái SUCCESS/PAID/TRIALING, chọn expiresAt mới nhất
    const prioritized = [...items].sort((a, b) => {
      const rank = (item: PremiumSubscriptionDTO) => {
        const st = (item.status || item.subscriptionStatus || "").toUpperCase();
        if (st === "ACTIVE") return 3;
        if (st === "TRIALING" || st === "SUCCESS" || st === "PAID") return 2;
        if (item.isActive || item.active) return 2;
        return 1;
      };
      const rDiff = rank(b) - rank(a);
      if (rDiff !== 0) return rDiff;
      const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
      const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
      if (bExp !== aExp) return bExp - aExp;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
    return prioritized[0] ?? null;
  };

  if (Array.isArray(pageData?.content)) {
    return pickLatest(pageData.content) ?? null;
  }
  if (Array.isArray(pageData)) {
    return pickLatest(pageData) ?? null;
  }
  if (typeof pageData === "object") {
    return pageData as PremiumSubscriptionDTO;
  }
  return null;
};

export const premiumSubscriptionApi = {
  /**
   * Lấy thông tin gói premium của người dùng hiện tại
   * @param userId optional - nếu truyền sẽ lấy theo userId (admin view), nếu không sẽ lấy /me
   */
  getMySubscription: async (userId?: number | string): Promise<PremiumSubscriptionDTO | null> => {
    try {
      const query = typeof userId !== "undefined" ? `?userId=${userId}&page=0&size=1` : "";
      const endpoint = userId
        ? `/premium-subscriptions${query}`
        : `/premium-subscriptions/me?page=0&size=1`;

      const response = await apiClient.get(endpoint);
      return extractLatestSubscription(response.data);
    } catch (error: any) {
      if (error.response?.status === 204 || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Lấy danh sách tất cả premium subscriptions (cho admin)
   */
  listAll: async (
    userId?: number,
    status?: string,
    page: number = 0,
    size: number = 10
  ): Promise<PageResponse<PremiumSubscriptionDTO>> => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId.toString());
    if (status) params.append("status", status);
    params.append("page", page.toString());
    params.append("size", size.toString());

    const response = await apiClient.get(`/premium-subscriptions?${params.toString()}`);
    const payload = response.data;
    
    if (payload.success && payload.data) {
      return payload.data;
    }
    return payload;
  },

  /**
   * Lấy số lượng subscriptions theo từng plan (admin only)
   */
  getSubscriptionCountByPlan: async (): Promise<Record<string, number>> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/premium-subscriptions/admin/by-plan`,
      { method: "GET" }
    );

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    if (payload.success && payload.data) {
      return payload.data;
    }
    throw new Error("Invalid response format");
  },

  /**
   * Lấy danh sách subscriptions theo plan code (admin only)
   */
  getSubscriptionsByPlanCode: async (
    planCode: string,
    page: number = 0,
    size: number = 10
  ): Promise<PageResponse<PremiumSubscriptionDTO>> => {
    const params = new URLSearchParams();
    params.append("planCode", planCode);
    params.append("page", page.toString());
    params.append("size", size.toString());

    const response = await fetchWithAuth(
      `${API_BASE_URL}/premium-subscriptions/admin/by-plan-code?${params.toString()}`,
      { method: "GET" }
    );

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    if (payload.success && payload.data) {
      return payload.data;
    }
    throw new Error("Invalid response format");
  },

  /**
   * Lấy thông tin chi tiết subscription theo ID (admin only)
   */
  getSubscriptionById: async (subscriptionId: string): Promise<PremiumSubscriptionDTO> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/premium-subscriptions/admin/${subscriptionId}`,
      { method: "GET" }
    );

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    if (payload.success && payload.data) {
      return payload.data;
    }
    throw new Error("Invalid response format");
  },

  /**
   * Hủy subscription của user (admin only)
   */
  cancelSubscription: async (
    subscriptionId: string,
    reason?: string
  ): Promise<void> => {
    const params = new URLSearchParams();
    if (reason) params.append("reason", reason);

    const response = await fetchWithAuth(
      `${API_BASE_URL}/premium-subscriptions/admin/${subscriptionId}/cancel${params.toString() ? `?${params.toString()}` : ""}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
  },
};

export default premiumSubscriptionApi;

