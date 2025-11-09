import { API_BASE_URL, fetchWithAuth } from './config';

export interface CreateOrderRequest {
  amount: number;
  description: string;
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
  createdAt: string;
  updatedAt: string;
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
    buyerEmail?: string;
  }): Promise<CreateOrderResponse['data']> => {
    const baseUrl = getFrontendBaseUrl();
    const payload: CreateOrderRequest = {
      ...data,
      returnUrl: `${baseUrl}/payment/success`,
      cancelUrl: `${baseUrl}/payment/cancel`,
    };

    const response = await fetchWithAuth(`${API_BASE_URL}/payments/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Không thể tạo đơn hàng';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.desc || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result: CreateOrderResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.desc || 'Không thể tạo đơn hàng');
    }

    // Lưu orderCode vào sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('payos_order_code', result.data.orderCode.toString());
    }

    return result.data;
  },

  /**
   * Kiểm tra trạng thái cuối cùng của đơn hàng
   * Endpoint này sẽ đợi webhook từ PayOS (không cần polling)
   */
  getFinalStatus: async (orderCode: number, timeoutMs: number = 20000): Promise<OrderStatus> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/payments/orders/${orderCode}/final-status?timeoutMs=${timeoutMs}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Không thể lấy trạng thái đơn hàng';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.desc || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result: OrderStatusResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.desc || 'Không thể lấy trạng thái đơn hàng');
    }

    return result.data;
  },

  /**
   * Lấy chi tiết đơn hàng
   */
  getOrderDetail: async (orderCode: number): Promise<OrderHistoryItem> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/payments/orders/${orderCode}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Không thể lấy chi tiết đơn hàng';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.desc || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result: OrderDetailResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.desc || 'Không thể lấy chi tiết đơn hàng');
    }

    return result.data;
  },

  /**
   * Lấy lịch sử thanh toán
   */
  getHistory: async (page: number = 0, size: number = 10): Promise<OrderHistoryResponse['data']> => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/payments/orders/history?page=${page}&size=${size}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Không thể lấy lịch sử thanh toán';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.desc || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result: OrderHistoryResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.desc || 'Không thể lấy lịch sử thanh toán');
    }

    return result.data;
  },
};


