import { apiClient } from "./config";
import type { DashboardStatsResponse } from "@/types/dashboard";

export interface DashboardSummaryParams {
  startDate?: string;
  endDate?: string;
  period?: "daily" | "monthly" | "yearly";
}

export const dashboardApi = {
  getSummary: async (params?: DashboardSummaryParams): Promise<DashboardStatsResponse> => {
    const response = await apiClient.get<DashboardStatsResponse>("/dashboard/summary", {
      params,
    });
    return response.data;
  },
};
