import { apiClient, API_BASE_URL } from './config';
import { verifyPayosSignature, verifyPayosWebhookPayload } from '@/utils/payosSignatureVerifier';

export interface CreateOrderRequest {
  amount: number;
  description: string;
  planCode: string;
  planDetailId: number;
  buyerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreateOrderResponse {
  success: boolean;
  desc: string;
  data: {
    orderCode: number;
    checkoutUrl: string;
  };
}

export interface PlanFeatureSnapshot {
  featureName?: string;
  limitType?: string;
  limitValue?: number | null;
  limitPeriod?: string | null;
  periodValue?: number | null;
  isEnabled?: boolean | null;
}

export interface OrderStatus {
  status: 'SUCCESS' | 'FAILED';
  orderCode: number;
  amount: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderStatusResponse {
  success: boolean;
  desc: string;
  data: OrderStatus;
}

export interface OrderHistoryItem {
  orderCode: number;
  amount: number;
  description: string;
  status: 'SUCCESS' | 'FAILED';
  currency?: string | null;
  paymentLinkId?: string | null;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  expiredAt?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bin?: string | null;
  reference?: string | null;
  transactionDateTime?: string | null;
  payosCode?: string | null;
  payosDesc?: string | null;
  counterAccountBankId?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
  virtualAccountName?: string | null;
  virtualAccountNumber?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  planCode?: string | null;
  planName?: string | null;
  planDetailId?: number | null;
  planDetailName?: string | null;
  planDurationDaysSnapshot?: number | null;
  planPriceSnapshot?: number | null;
  planCurrencySnapshot?: string | null;
  planFeatureSnapshot?: string | null;
}

export interface OrderHistoryResponse {
  success: boolean;
  desc: string;
  data: {
    content: OrderHistoryItem[];
    totalPages: number;
    totalElements: number;
    page: number;
    size: number;
  };
}

export interface OrderDetailResponse {
  success: boolean;
  desc: string;
  data: OrderHistoryItem;
}

const getFrontendBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:5173';
};

export const paymentApi = {
  /**
   * Tạo đơn hàng mới
   */
  createOrder: async (data: {
    amount: number;
    description: string;
    planCode: string;
    planDetailId: number;
    buyerEmail?: string;
  }): Promise<CreateOrderResponse['data']> => {
    const baseUrl = getFrontendBaseUrl();
    const payload: CreateOrderRequest = {
      ...data,
      returnUrl: `${baseUrl}/payment/success`,
      cancelUrl: `${baseUrl}/payment/cancel`,
    };

    console.log('[paymentApi] Creating order with payload:', payload);
    console.log('[paymentApi] API URL:', `${API_BASE_URL}/payments/orders`);

    try {
      const response = await apiClient.post<CreateOrderResponse>('/payments/orders', payload);
      console.log('[paymentApi] Response status:', response.status, response.statusText);
      console.log('[paymentApi] Success response:', response.data);

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.desc || 'Unable to create order');
      }

      if (!result.data || !result.data.checkoutUrl) {
        throw new Error('Response không chứa checkoutUrl');
      }

      // Lưu orderCode vào sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('payos_order_code', result.data.orderCode.toString());
      }

      return result.data;
    } catch (error) {
      console.error('[paymentApi] Exception in createOrder:', error);
      throw error;
    }
  },

  /**
   * Kiểm tra trạng thái cuối cùng của đơn hàng
   * Endpoint này sẽ đợi webhook từ PayOS (không cần polling)
   */
  getFinalStatus: async (orderCode: number, timeoutMs: number = 20000): Promise<OrderStatus> => {
    try {
      const response = await apiClient.get<OrderStatusResponse>(
        `/payments/orders/${orderCode}/final-status?timeoutMs=${timeoutMs}`
      );

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.desc || 'Unable to get order status');
      }

      return result.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.desc || error.response?.data?.message || error.message || 'Unable to get order status';
      throw new Error(errorMessage);
    }
  },

  /**
   * Lấy chi tiết đơn hàng
   */
  getOrderDetail: async (orderCode: number): Promise<OrderHistoryItem> => {
    try {
      const response = await apiClient.get<OrderDetailResponse>(`/payments/orders/${orderCode}`);

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.desc || 'Unable to get order detail');
      }

      return result.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.desc || error.response?.data?.message || error.message || 'Unable to get order detail';
      throw new Error(errorMessage);
    }
  },

  /**
   * Lấy lịch sử thanh toán
   */
  getHistory: async (page: number = 0, size: number = 10): Promise<OrderHistoryResponse['data']> => {
    try {
      const response = await apiClient.get<OrderHistoryResponse>(
        `/payments/orders/history?page=${page}&size=${size}`
      );

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.desc || 'Unable to get payment history');
      }

      return result.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.desc || error.response?.data?.message || error.message || 'Unable to get payment history';
      throw new Error(errorMessage);
    }
  },

  /**
   * Đánh dấu đơn hàng là FAILED khi người dùng cancel trên PayOS
   */
  cancelOrder: async (orderCode: number, reason?: string): Promise<void> => {
    try {
      await apiClient.post(`/payments/orders/${orderCode}/cancel`, {
        reason: reason || 'Payment cancelled by user at PayOS',
      });
      // Không cần trả về gì thêm, backend đã mark FAILED
    } catch (error: any) {
      const errorMessage = error.response?.data?.desc || error.response?.data?.message || error.message || 'Unable to cancel order';
      throw new Error(errorMessage);
    }
  },

  /**
   * Xác thực chữ ký PayOS webhook (utility function)
   * 
   * ⚠️ LƯU Ý: Thông thường Frontend không cần verify signature vì:
   * - ReturnUrl từ PayOS không có signature
   * - Webhook chỉ được gửi đến Backend
   * 
   * Function này chỉ dùng khi:
   * - Testing/Development
   * - Nhận data từ PayOS có kèm signature (hiếm)
   * 
   * @param webhookData Data object từ webhook
   * @param signature Signature từ webhook
   * @returns Promise<boolean> true nếu signature hợp lệ
   */
  verifySignature: async (
    webhookData: Record<string, any>,
    signature: string
  ): Promise<boolean> => {
    return verifyPayosSignature(webhookData, signature);
  },

  /**
   * Xác thực chữ ký từ webhook payload đầy đủ
   * 
   * @param payload Webhook payload từ PayOS
   * @returns Promise<boolean> true nếu signature hợp lệ
   */
  verifyWebhookPayload: async (payload: {
    code?: string;
    desc?: string;
    success?: boolean;
    data?: Record<string, any>;
    signature?: string;
  }): Promise<boolean> => {
    return verifyPayosWebhookPayload(payload);
  },
};


