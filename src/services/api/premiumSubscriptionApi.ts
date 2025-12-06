import { apiClient } from "./config";

export interface PremiumSubscriptionDTO {
  id?: string;
  userId?: number;
  userEmail?: string;
  orderCode?: number;
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
  if (Array.isArray(pageData?.content)) {
    const activeFirst = pageData.content.find(
      (item: PremiumSubscriptionDTO) =>
        item?.status?.toUpperCase() === "ACTIVE" ||
        item?.subscriptionStatus?.toUpperCase() === "ACTIVE" ||
        item?.isActive ||
        item?.active
    );
    return (activeFirst || pageData.content[0]) ?? null;
  }
  if (Array.isArray(pageData)) {
    return pageData[0] ?? null;
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
};

export default premiumSubscriptionApi;

