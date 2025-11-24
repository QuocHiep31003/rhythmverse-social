import { apiClient, getAdminToken } from "./config";
import type { DashboardStatsResponse } from "@/types/dashboard";
import axios from "axios";
import { API_BASE_URL } from "./config";

export interface DashboardSummaryParams {
  startDate?: string;
  endDate?: string;
  period?: "daily" | "weekly" | "monthly" | "yearly";
}

export const dashboardApi = {
  getSummary: async (params?: DashboardSummaryParams): Promise<DashboardStatsResponse> => {
    // Sử dụng adminToken cho dashboard API
    const adminToken = getAdminToken();
    const response = await axios.get<DashboardStatsResponse>(`${API_BASE_URL}/dashboard/summary`, {
      params,
      headers: {
        'Authorization': adminToken ? `Bearer ${adminToken}` : undefined,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },
};
