import { apiClient, createFormDataHeaders, PaginationParams, PaginatedResponse } from './config';
import { mockArtists } from '@/data/mockData';

// Interface cho Artist data
export interface Artist {
    id: number;
    name: string;
    country: string;
    debutYear: number;
    bio?: string;
    avatar?: string;
    followers?: string;
    monthlyListeners?: string;
    location?: string;
    genres?: string[];
    verified?: boolean;
}

// Interface cho Artist creation/update
export interface ArtistCreateUpdateData {
    name: string;
    country: string;
    debutYear: number;
    bio?: string;
    avatar?: string;
}

// Artists API sử dụng axios
export const artistsApi = {
    // Lấy tất cả artists với pagination
    getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Artist>> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page !== undefined) queryParams.append('page', params.page.toString());
            if (params?.size !== undefined) queryParams.append('size', params.size.toString());
            if (params?.sort) queryParams.append('sort', params.sort);
            if (params?.search) queryParams.append('search', params.search);

            const response = await apiClient.get(`/artists?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artists:", error);
            // Return empty paginated response instead of mock
            return {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size: params?.size ?? 0,
                number: params?.page ?? 0,
                first: true,
                last: true,
                empty: true,
                pageable: {
                    pageNumber: params?.page ?? 0,
                    pageSize: params?.size ?? 0,
                    sort: { empty: true, sorted: false, unsorted: true },
                    offset: 0,
                    paged: true,
                    unpaged: false
                },
                sort: { empty: true, sorted: false, unsorted: true },
                numberOfElements: 0
            } as PaginatedResponse<Artist>;
        }
    },

    // Lấy artist theo ID
    getById: async (id: number): Promise<Artist | null> => {
        try {
            const response = await apiClient.get(`/artists/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artist:", error);
            return mockArtists.find(a => a.id === id) || null;
        }
    },

    // Lấy artist với thông tin chi tiết (bao gồm songs, albums)
    getByIdWithDetails: async (id: number): Promise<{
        artist: Artist;
        songs: any[];
        albums: any[];
        relatedArtists: Artist[];
    } | null> => {
        try {
            const response = await apiClient.get(`/artists/${id}/details`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artist details:", error);
            const artist = mockArtists.find(a => a.id === id);
            if (!artist) return null;

            return {
                artist,
                songs: [],
                albums: [],
                relatedArtists: []
            };
        }
    },

    // Tạo artist mới
    create: async (data: ArtistCreateUpdateData): Promise<Artist> => {
        try {
            const payload = {
                name: data.name,
                country: data.country,
                debutYear: data.debutYear,
                bio: data.bio,
                avatar: data.avatar,
            };

            const response = await apiClient.post('/artists', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating artist:", error);
            throw error;
        }
    },

    // Cập nhật artist
    update: async (id: number, data: ArtistCreateUpdateData): Promise<Artist> => {
        try {
            const payload = {
                name: data.name,
                country: data.country,
                debutYear: data.debutYear,
                bio: data.bio,
                avatar: data.avatar,
            };

            const response = await apiClient.put(`/artists/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating artist:", error);
            throw error;
        }
    },

    // Xóa artist
    delete: async (id: number): Promise<{ success: boolean }> => {
        try {
            await apiClient.delete(`/artists/${id}`);
            return { success: true };
        } catch (error) {
            console.error("Error deleting artist:", error);
            throw error;
        }
    },

    // Lấy số lượng artists
    getCount: async (search?: string): Promise<number> => {
        try {
            const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await apiClient.get(`/artists/count${queryParams}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artist count:", error);
            return mockArtists.length;
        }
    },

    // Export artists to Excel
    exportExcel: async (): Promise<void> => {
        try {
            const response = await apiClient.get('/artists/export', {
                responseType: 'blob'
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'artists.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exporting artists:", error);
            throw error;
        }
    },

    // Import artists from Excel
    importExcel: async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/artists/import', formData, {
                headers: createFormDataHeaders()
            });

            return response.data;
        } catch (error) {
            console.error("Error importing artists:", error);
            throw error;
        }
    },

    // Lấy songs của artist
    getSongs: async (artistId: number, params?: PaginationParams): Promise<PaginatedResponse<any>> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page !== undefined) queryParams.append('page', params.page.toString());
            if (params?.size !== undefined) queryParams.append('size', params.size.toString());
            if (params?.sort) queryParams.append('sort', params.sort);

            const response = await apiClient.get(`/artists/${artistId}/songs?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artist songs:", error);
            return {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size: params?.size ?? 0,
                number: params?.page ?? 0,
                first: true,
                last: true,
                empty: true,
                pageable: {
                    pageNumber: params?.page ?? 0,
                    pageSize: params?.size ?? 0,
                    sort: { empty: true, sorted: false, unsorted: true },
                    offset: 0,
                    paged: true,
                    unpaged: false
                },
                sort: { empty: true, sorted: false, unsorted: true },
                numberOfElements: 0
            } as PaginatedResponse<any>;
        }
    },

    // Lấy albums của artist
    getAlbums: async (artistId: number, params?: PaginationParams): Promise<PaginatedResponse<any>> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page !== undefined) queryParams.append('page', params.page.toString());
            if (params?.size !== undefined) queryParams.append('size', params.size.toString());
            if (params?.sort) queryParams.append('sort', params.sort);

            const response = await apiClient.get(`/artists/${artistId}/albums?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching artist albums:", error);
            return {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size: params?.size ?? 0,
                number: params?.page ?? 0,
                first: true,
                last: true,
                empty: true,
                pageable: {
                    pageNumber: params?.page ?? 0,
                    pageSize: params?.size ?? 0,
                    sort: { empty: true, sorted: false, unsorted: true },
                    offset: 0,
                    paged: true,
                    unpaged: false
                },
                sort: { empty: true, sorted: false, unsorted: true },
                numberOfElements: 0
            } as PaginatedResponse<any>;
        }
    },

    // Lấy related artists
    getRelatedArtists: async (artistId: number, limit: number = 5): Promise<Artist[]> => {
        try {
            const response = await apiClient.get(`/artists/${artistId}/related?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching related artists:", error);
            return [];
        }
    },

    // Search artists
    search: async (query: string, params?: PaginationParams): Promise<PaginatedResponse<Artist>> => {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('search', query);
            if (params?.page !== undefined) queryParams.append('page', params.page.toString());
            if (params?.size !== undefined) queryParams.append('size', params.size.toString());
            if (params?.sort) queryParams.append('sort', params.sort);

            const response = await apiClient.get(`/artists/search?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error("Error searching artists:", error);
            return {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size: params?.size ?? 0,
                number: params?.page ?? 0,
                first: true,
                last: true,
                empty: true,
                pageable: {
                    pageNumber: params?.page ?? 0,
                    pageSize: params?.size ?? 0,
                    sort: { empty: true, sorted: false, unsorted: true },
                    offset: 0,
                    paged: true,
                    unpaged: false
                },
                sort: { empty: true, sorted: false, unsorted: true },
                numberOfElements: 0
            } as PaginatedResponse<Artist>;
        }
    },
};

export default artistsApi;
