import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from './config';

export enum ReportType {
  SONG = 'SONG',
  ARTIST = 'ARTIST',
  ALBUM = 'ALBUM',
  PLAYLIST = 'PLAYLIST',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  REJECT = 'REJECT',
}

export interface ReportDTO {
  id?: number;
  type: ReportType;
  typeId: number;
  description: string;
  status?: ReportStatus;
  reporterId?: number;
  adminId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReportRequest {
  type: ReportType;
  typeId: number;
  description: string;
}

export const reportApi = {
  /**
   * Tạo báo cáo mới
   */
  create: async (data: CreateReportRequest): Promise<ReportDTO> => {
    // Validate và chuẩn hóa dữ liệu trước khi gửi
    const requestData = {
      type: data.type,
      typeId: Number(data.typeId), // Đảm bảo là number
      description: data.description?.trim() || '',
    };

    // Validate typeId
    if (!Number.isInteger(requestData.typeId) || requestData.typeId <= 0) {
      throw new Error('Type ID must be a positive integer');
    }

    // Validate description
    if (!requestData.description || requestData.description.length === 0) {
      throw new Error('Description cannot be empty');
    }

    if (requestData.description.length > 2000) {
      throw new Error('Description must not exceed 2000 characters');
    }

    console.log('[reportApi] Creating report with data:', requestData);

    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      let errorMessage = await parseErrorResponse(response);
      console.error('[reportApi] Error creating report:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        requestData,
      });

      // Xử lý các lỗi validation phổ biến
      if (response.status === 400) {
        // Nếu error message chứa "Invalid input data", thử parse chi tiết hơn
        if (errorMessage.includes('Invalid input data') || errorMessage.includes('invalid')) {
          // Kiểm tra từng trường có thể gây lỗi
          if (!requestData.typeId || requestData.typeId <= 0) {
            errorMessage = 'ID bài hát không hợp lệ. Vui lòng thử lại.';
          } else if (!requestData.description || requestData.description.trim().length === 0) {
            errorMessage = 'Mô tả không được để trống.';
          } else if (requestData.description.length > 2000) {
            errorMessage = 'Mô tả không được vượt quá 2000 ký tự.';
          } else {
            errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
          }
        }
      }

      throw new Error(errorMessage || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
    }

    return await response.json();
  },

  /**
   * Lấy tất cả báo cáo (Admin only)
   */
  getAll: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
    search?: string;
    status?: ReportStatus;
    type?: ReportType;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);

    const response = await fetch(`${API_BASE_URL}/reports?${queryParams.toString()}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to fetch reports');
    }

    return await response.json();
  },

  /**
   * Lấy báo cáo theo ID
   */
  getById: async (id: number): Promise<ReportDTO> => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to fetch report');
    }

    return await response.json();
  },

  /**
   * Lấy báo cáo của người dùng hiện tại
   */
  getMyReports: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sort) queryParams.append('sort', params.sort);

    const response = await fetch(`${API_BASE_URL}/reports/my-reports?${queryParams.toString()}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to fetch my reports');
    }

    return await response.json();
  },

  /**
   * Cập nhật status của báo cáo (Admin only)
   */
  updateStatus: async (id: number, status: ReportStatus): Promise<ReportDTO> => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}/status?status=${status}`, {
      method: 'PUT',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to update report status');
    }

    return await response.json();
  },
};

