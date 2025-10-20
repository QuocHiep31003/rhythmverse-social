import { mockSongs, mockUsers, mockPlaylists, mockAlbums, mockArtists, mockGenres } from "@/data/mockData";

const API_BASE_URL = "http://localhost:8080/api";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Auth helpers for API requests
const getAuthToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  } catch {
    return null;
  }
};

const buildJsonHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return (data && (data.message || data.error || data.details)) || JSON.stringify(data);
  } catch {
    try {
      const text = await response.text();
      return text || `${response.status} ${response.statusText}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }
};

interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  name?: string;
  country?: string;
  debutYear?: string;
  releaseYear?: number;
}

interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Users API
export const usersApi = {
  getAll: async (page: number = 0, size: number = 10, sort: string = "name,asc") => {
    try {
      const url = `${API_BASE_URL}/user?page=${page}&size=${size}&sort=${sort}`;
      console.log('Fetching users from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await parseErrorResponse(response);
        console.error('Error response:', errorText);
        throw new Error(errorText || `Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Users data received:', data);
      return data;
    } catch (error) {
      console.error('Error in usersApi.getAll:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    return await response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response);
      throw new Error(message || 'Failed to create user');
    }

    return await response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: 'PUT',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response);
      throw new Error(message || 'Failed to update user');
    }

    return await response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    return { success: true };
  },

  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Don't set Content-Type for FormData, browser will set it with boundary

    const response = await fetch(`${API_BASE_URL}/user/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response);
      throw new Error(message || 'Failed to import users');
    }

    // Return text response as backend returns "Users imported successfully."
    return await response.text();
  },
};

// Songs API
export const songsApi = {
  getByArtist: async (artistId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/by-artist/${artistId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch songs by artist");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching songs by artist:", error);
      return [];
    }
  },

  getAll: async (params?: PaginationParams) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.search) queryParams.append('search', params.search);

      const response = await fetch(`${API_BASE_URL}/songs?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }
      const data: PaginatedResponse<any> = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching songs:", error);

      return {
        content: mockSongs,
        totalElements: mockSongs.length,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false
      } as PaginatedResponse<any>;
    }
  },

  getById: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching song:", error);
      return mockSongs.find(s => s.id === id);
    }
  },

  create: async (data: any) => {
    try {
      const payload = {
        name: data.name,
        releaseYear: data.releaseYear,
        genreIds: data.genreIds,
        artistIds: data.artistIds,
        audioUrl: data.audioUrl,
      };

      const response = await fetch(`${API_BASE_URL}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating song:", error);
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      const payload = {
        name: data.name,
        releaseYear: data.releaseYear,
        genreIds: data.genreIds,
        artistIds: data.artistIds,
        audioUrl: data.audioUrl,
      };

      const response = await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating song:", error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting song:", error);
      throw error;
    }
  },

  getCount: async (search?: string) => {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/songs/count${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch song count");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching song count:", error);
      return mockSongs.length;
    }
  },

  exportExcel: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/export`);
      if (!response.ok) {
        throw new Error("Failed to export songs");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'songs.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting songs:", error);
      throw error;
    }
  },

  importExcel: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/songs/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import songs");
      }

      return await response.text();
    } catch (error) {
      console.error("Error importing songs:", error);
      throw error;
    }
  },
};

// Playlists API
export const playlistsApi = {
  getAll: async () => {
    await delay(300);
    return mockPlaylists;
  },

  getById: async (id: string) => {
    await delay(200);
    return mockPlaylists.find(p => p.id === id);
  },

  create: async (data: any) => {
    await delay(500);
    return { id: Date.now().toString(), ...data, songs: [] };
  },

  update: async (id: string, data: any) => {
    await delay(500);
    return { id, ...data };
  },

  delete: async (id: string) => {
    await delay(500);
    return { success: true };
  },
};

// Albums API
export const albumsApi = {
  getAll: async () => {
    await delay(300);
    return mockAlbums;
  },

  getById: async (id: string) => {
    await delay(200);
    return mockAlbums.find(a => a.id === id);
  },

  create: async (data: any) => {
    await delay(500);
    return { id: Date.now().toString(), ...data };
  },

  update: async (id: string, data: any) => {
    await delay(500);
    return { id, ...data };
  },

  delete: async (id: string) => {
    await delay(500);
    return { success: true };
  },
};

// Artists API
export const artistsApi = {
  getAll: async (params?: PaginationParams) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.name) queryParams.append('name', params.name);
      if (params?.country) queryParams.append('country', params.country);
      if (params?.debutYear) queryParams.append('debutYear', params.debutYear);

      const response = await fetch(`${API_BASE_URL}/artists?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artists");
      }
      const data: PaginatedResponse<any> = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching artists:", error);
      await delay(500);
      return {
        content: mockArtists,
        totalElements: mockArtists.length,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false
      } as PaginatedResponse<any>;
    }
  },

  getById: async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching artist:", error);
      return mockArtists.find(a => a.id === id);
    }
  },

  create: async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating artist:", error);
      throw error;
    }
  },

  update: async (id: number, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating artist:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting artist:", error);
      throw error;
    }
  },

  getCount: async (search?: string) => {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/artists/count${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artist count");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching artist count:", error);
      return mockArtists.length;
    }
  },

  exportExcel: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/export`);
      if (!response.ok) {
        throw new Error("Failed to export artists");
      }
      const blob = await response.blob();
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

  importExcel: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/artists/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import artists");
      }

      return await response.text();
    } catch (error) {
      console.error("Error importing artists:", error);
      throw error;
    }
  },
};

// Genres API
export const genresApi = {
  getAll: async (params?: PaginationParams) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.search) queryParams.append('search', params.search);

      const response = await fetch(`${API_BASE_URL}/genres?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch genres");
      }
      const data: PaginatedResponse<any> = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching genres:", error);
      await delay(300);
      return {
        content: mockGenres,
        totalElements: mockGenres.length,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false
      } as PaginatedResponse<any>;
    }
  },

  getById: async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching genre:", error);
      return mockGenres.find(g => g.id === id);
    }
  },

  create: async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating genre:", error);
      throw error;
    }
  },

  update: async (id: number, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating genre:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/genres/${id}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting genre:", error);
      throw error;
    }
  },

  getCount: async (search?: string) => {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/genres/count${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch genre count");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching genre count:", error);
      await delay(300);
      return mockGenres.length;
    }
  },

  exportExcel: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres/export`);
      if (!response.ok) {
        throw new Error("Failed to export genres");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'genres.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting genres:", error);
      throw error;
    }
  },

  importExcel: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/genres/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to import genres");
      }

      return await response.text();
    } catch (error) {
      console.error("Error importing genres:", error);
      throw error;
    }
  },
};

// Auth API
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return await response.json();
  },

  login: async (data: { email: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return await response.json();
  },
};

// Stats API
export const statsApi = {
  getDashboard: async () => {
    await delay(300);
    return {
      totalUsers: mockUsers.length,
      totalSongs: mockSongs.length,
      totalPlaylists: mockPlaylists.length,
      totalAlbums: mockAlbums.length,
      totalArtists: mockArtists.length,
      totalGenres: mockGenres.length,
      totalPlays: mockSongs.reduce((acc, song) => acc + parseInt(song.plays.replace(/[^\d]/g, '')), 0),
    };
  },
};
export const searchApi = {
  getAll: async (keyword: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/search?search=${encodeURIComponent(keyword)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching search results:", error);
      return { artists: [], songs: [], albums: [] };
    }
  },
};