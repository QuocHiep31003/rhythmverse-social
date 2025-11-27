import { API_BASE_URL, PaginationParams } from './config';

export const moodsApi = {
    getAll: async ({ page = 0, size = 10, sort = "name,asc", search }: PaginationParams = {}) => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                size: size.toString(),
                sort,
                ...(search && { search }),
            });
            const response = await fetch(`${API_BASE_URL}/moods?${queryParams}`);
            if (!response.ok) {
                throw new Error("Failed to fetch moods");
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching moods:", error);
            throw error;
        }
    },

    getById: async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/moods/${id}`);
            if (!response.ok) {
                throw new Error("Failed to fetch mood");
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching mood:", error);
            throw error;
        }
    },

    create: async (data: { name: string; iconUrl?: string; gradient?: string; status?: string }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/moods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to create mood");
            }
            return await response.json();
        } catch (error) {
            console.error("Error creating mood:", error);
            throw error;
        }
    },

    update: async (id: number, data: { name: string; iconUrl?: string; gradient?: string; status?: string }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/moods/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to update mood");
            }
            return await response.json();
        } catch (error) {
            console.error("Error updating mood:", error);
            throw error;
        }
    },

    getDeactivationWarning: async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/moods/${id}/deactivation-warning`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch deactivation warning");
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching deactivation warning:", error);
            throw error;
        }
    },

    delete: async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/moods/${id}`, {
                method: 'DELETE'
            });
            return { success: true };
        } catch (error) {
            console.error("Error deleting mood:", error);
            throw error;
        }
    },

    exportExcel: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/moods/export`);
            if (!response.ok) {
                throw new Error("Failed to export moods");
            }
            const blob = await response.blob();
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

            const response = await fetch(`${API_BASE_URL}/moods/import`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to import moods");
            }

            return await response.text();
        } catch (error) {
            console.error("Error importing moods:", error);
            throw error;
        }
    },
};

