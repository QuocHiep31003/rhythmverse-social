import { API_BASE_URL, buildJsonHeaders, parseErrorResponse, apiClient } from './config';

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
    let numericTypeId: number;
    
    // Convert typeId sang number một cách an toàn
    if (typeof data.typeId === 'number') {
      numericTypeId = data.typeId;
    } else if (typeof data.typeId === 'string') {
      const parsed = parseInt(data.typeId, 10);
      if (isNaN(parsed) || !isFinite(parsed)) {
        throw new Error('ID không hợp lệ. Vui lòng thử lại.');
      }
      numericTypeId = parsed;
    } else {
      throw new Error('ID không hợp lệ. Vui lòng thử lại.');
    }

    // Validate typeId phải là số nguyên dương
    if (!Number.isInteger(numericTypeId) || numericTypeId <= 0) {
      throw new Error('ID phải là số nguyên dương hợp lệ.');
    }

    // Validate description
    const trimmedDescription = data.description?.trim() || '';
    if (!trimmedDescription || trimmedDescription.length === 0) {
      throw new Error('Mô tả không được để trống.');
    }

    if (trimmedDescription.length < 10) {
      throw new Error('Mô tả phải có ít nhất 10 ký tự.');
    }

    if (trimmedDescription.length > 2000) {
      throw new Error('Mô tả không được vượt quá 2000 ký tự.');
    }

    // Validate type
    if (!data.type || !Object.values(ReportType).includes(data.type as ReportType)) {
      throw new Error('Loại báo cáo không hợp lệ.');
    }

    const requestData = {
      type: data.type,
      typeId: numericTypeId,
      description: trimmedDescription,
    };

    console.log('[reportApi] Creating report with data:', requestData);
    console.log('[reportApi] Request data type check:', {
      type: typeof requestData.type,
      typeId: typeof requestData.typeId,
      typeIdValue: requestData.typeId,
      descriptionLength: requestData.description.length,
    });

    try {
      const response = await apiClient.post('/reports', requestData);
      console.log('[reportApi] Report created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[reportApi] Error creating report:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        requestData,
      });

      // Xử lý các lỗi validation phổ biến
      if (error.response?.status === 400) {
        const errorData = error.response?.data || {};
        let errorMessage = errorData.message || errorData.error || error.message || 'Dữ liệu không hợp lệ.';
        
        // Parse chi tiết lỗi từ backend
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const fieldErrors = errorData.errors.map((err: any) => err.defaultMessage || err.message).join(', ');
          errorMessage = fieldErrors || errorMessage;
        }

        // Kiểm tra các trường hợp cụ thể
        if (errorMessage.toLowerCase().includes('typeid') || errorMessage.toLowerCase().includes('type id')) {
          errorMessage = 'ID bài hát không hợp lệ. Vui lòng thử lại.';
        } else if (errorMessage.toLowerCase().includes('description') || errorMessage.toLowerCase().includes('mô tả')) {
          if (errorMessage.toLowerCase().includes('empty') || errorMessage.toLowerCase().includes('trống')) {
            errorMessage = 'Mô tả không được để trống.';
          } else if (errorMessage.toLowerCase().includes('length') || errorMessage.toLowerCase().includes('độ dài')) {
            errorMessage = 'Mô tả không hợp lệ về độ dài.';
          }
        }

        throw new Error(errorMessage);
      }

      // Xử lý lỗi 401 (Unauthorized)
      if (error.response?.status === 401) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      // Xử lý lỗi 403 (Forbidden)
      if (error.response?.status === 403) {
        throw new Error('Bạn không có quyền thực hiện thao tác này.');
      }

      // Xử lý lỗi network
      if (error.message && (error.message.includes('Network') || error.message.includes('timeout'))) {
        throw new Error('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }

      // Lỗi chung
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Không thể gửi báo cáo. Vui lòng thử lại sau.';
      throw new Error(errorMessage);
    }
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


