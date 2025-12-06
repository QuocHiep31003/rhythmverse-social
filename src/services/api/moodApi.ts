import { apiClient, PaginationParams } from './config';

export const moodsApi = {
    getAll: async ({ page = 0, size = 10, sort = "name,asc", search }: PaginationParams = {}) => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                size: size.toString(),
                sort,
                ...(search && { search }),
            });
            const response = await apiClient.get(`/moods?${queryParams}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching moods:", error);
            throw error;
        }
    },

    /**
     * Lấy moods cho user (chỉ lấy ACTIVE)
     * GET /api/moods/public?page=X&size=Y&sort=name,asc
     */
    getPublic: async ({ page = 0, size = 10, sort = "name,asc", search }: PaginationParams = {}): Promise<any> => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                size: size.toString(),
                sort,
                ...(search && { search }),
            });
            const response = await apiClient.get(`/moods/public?${queryParams}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching public moods:", error);
            return {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size,
                number: page,
                first: true,
                last: true,
                empty: true
            };
        }
    },

    getById: async (id: number) => {
        try {
            const response = await apiClient.get(`/moods/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching mood:", error);
            throw error;
        }
    },

    create: async (data: { name: string; iconUrl?: string; gradient?: string; status?: string }) => {
        try {
            const response = await apiClient.post('/moods', data);
            return response.data;
        } catch (error) {
            console.error("Error creating mood:", error);
            throw error;
        }
    },

    update: async (id: number, data: { name: string; iconUrl?: string; gradient?: string; status?: string }) => {
        try {
            const response = await apiClient.put(`/moods/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Error updating mood:", error);
            throw error;
        }
    },

    getDeactivationWarning: async (id: number) => {
        try {
            const response = await apiClient.get(`/moods/${id}/deactivation-warning`);
            return response.data;
        } catch (error) {
            console.error("Error fetching deactivation warning:", error);
            throw error;
        }
    },

    delete: async (id: number) => {
        try {
            await apiClient.delete(`/moods/${id}`);
            return { success: true };
        } catch (error) {
            console.error("Error deleting mood:", error);
            throw error;
        }
    },

    exportExcel: async () => {
        try {
            const response = await apiClient.get('/moods/export', {
                responseType: 'blob'
            });
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'moods.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exporting moods:", error);
            throw error;
        }
    },

    importExcel: async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/moods/import', formData);
            return response.data;
        } catch (error) {
            console.error("Error importing moods:", error);
            throw error;
        }
    },
};

