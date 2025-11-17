import { API_BASE_URL, fetchWithAuth, parseErrorResponse } from "./config";

export interface PremiumSubscriptionDTO {
  id?: number;
  planName?: string;
  planCode?: string;
  status?: string;
  subscriptionStatus?: string;
  state?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  currentPeriodEnd?: string;
  autoRenew?: boolean;
  price?: number;
  currency?: string;
  active?: boolean;
  isActive?: boolean;
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
    const query = typeof userId !== "undefined" ? `?userId=${userId}&page=0&size=1` : "";
    const endpoint = userId
      ? `${API_BASE_URL}/premium-subscriptions${query}`
      : `${API_BASE_URL}/premium-subscriptions/me?page=0&size=1`;

    const response = await fetchWithAuth(endpoint, { method: "GET" });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    return extractLatestSubscription(payload);
  },
};

export default premiumSubscriptionApi;

