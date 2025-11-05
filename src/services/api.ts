// Re-export API_BASE_URL from config
export { API_BASE_URL } from './api/config';

// Re-export common utilities
export { buildJsonHeaders, parseErrorResponse, getAuthToken } from './api/config';

// Re-export shared interfaces
export type { PaginationParams, PaginatedResponse } from './api/config';

// ✅ Re-export all API modules
export { artistsApi } from './api/artistApi';
export { songsApi } from './api/songApi';
export { albumsApi } from './api/albumApi';
export {
  playlistsApi,
  playlistCollabInvitesApi,
  playlistCollaboratorsApi,
} from './api/playlistApi';
export { friendsApi, inviteLinksApi } from './api/friendsApi';
export { listeningHistoryApi } from './api/listeningHistoryApi';
export { lyricsApi } from './api/lyricsApi';
export { moodsApi } from './api/moodApi';
export { authApi } from './api/authApi';


// Import mock data for fallback
import { mockUsers, mockGenres } from "@/data/mockData";
import { API_BASE_URL, buildJsonHeaders, parseErrorResponse, getAuthToken, PaginationParams, PaginatedResponse, apiClient } from "./api/config";
import axios from "axios";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  create: async (data: { name: string; description?: string; iconUrl?: string }) => {
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

  update: async (id: number, data: { name: string; description?: string; iconUrl?: string }) => {
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

// moved to ./api/authApi

// Stats API
export const statsApi = {
  getDashboard: async () => {
    await delay(300);
    return {
      totalUsers: mockUsers.length,
      totalSongs: 0, // Will be updated when songsApi is used
      totalPlaylists: 0, // Will be updated when playlistsApi is used
      totalAlbums: 0, // Will be updated when albumsApi is used
      totalArtists: 0, // Will be updated when artistsApi is used
      totalGenres: mockGenres.length,
      totalPlays: 0, // Will be updated when songsApi is used
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

// ACR Cloud Music Recognition API (via backend)
export const arcApi = {
  recognizeMusic: async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recorded.wav");

      // Use songs endpoint which returns internal list or external suggestions
      const response = await apiClient.post('/songs/recognize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error recognizing music:", error);
      throw error;
    }
  },
  
  recognizeHumming: async (audioFile: File | Blob) => {
    try {
      const formData = new FormData();
      const fileName = audioFile instanceof File ? audioFile.name : 'humming.wav';
      formData.append("file", audioFile, fileName);

      const response = await apiClient.post('/acr/recognize-humming', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error recognizing humming:", error);
      throw error;
    }
  },
  
  /**
   * Upload audio fingerprint từ URL lên ACR bucket trực tiếp từ FE
   * Được gọi sau khi upload Cloudinary thành công
   */
  uploadAudioFingerprint: async (audioUrl: string, title?: string) => {
    try {
      // ACR Cloud API v2 credentials
      const ACR_API_V2_BASE_URL = 'https://api-v2.acrcloud.com';
      const ACR_BUCKET_ID = '28233';
      // Token từ ACR Cloud (JWT token)
      const ACR_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiNTM4NzVkZjQ2M2QzMjg2ZTY4OTEyMGU5ZjM1ZWRhZTZiZjNhMTMyZGMwNTgxZjA5NDg2MGNmODcyNDVjMDJlZWFlY2NiMTcwYjg2N2RmYmEiLCJpYXQiOjE3NjIyMjcxNzEuMzI0OTEsIm5iZiI6MTc2MjIyNzE3MS4zMjQ5MTQsImV4cCI6MjA3Nzc1OTk2OS4yNTM4ODcsInN1YiI6IjI4NzY2NSIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.EkFOKsKo73j6Dd9e8SCovqK8LNhz6JagrSgYbmDzVhp_f_jc_T1nCk81XC8IXaZm3R-9XZrKtxe-MtEvFQmF8nLp-ABRvHvwhu6oZkKFFFoSiPzCOQlI5ekzwk8Jo2cNODYbTHDkn4lGOAD_b32M5XXvvAKnLYhKU42U0CMtv89z0_TfUI5598jfzo2pcCn7qluP96T2owRsEgFcsKPBp08Ql5au7X6XIhwrHTyT3GmpkDO8sS-CI08WyJHP978Bu8UOGkPHdkTXefM3VLA5Gi5Z5D1vJBSjErs7MzelPn1GcyY9t0tMZ17cYuvuJwccFQRyzFmRNIL-Ii1-Ol-s16GK_2OBx4i8K35gNk6ZfKiKo6XNOlHKiCvDqMHBd8PUrM6wFR9bWSF1jw0yxoUK5BmJoa9R3ULZ38lil62a7-ygRX-emywmFTKpoL3zJD7DofpflBBF8_Socg7Gk2lyzRHVkYZ7CNAn5yI6Lsd3vgooOms0EOqIyXOX1y3xuqg_EOPxNNlgdzUDfX6mapW7subzLS2x5Q1uHAiaW8eN9l4S0DuYkF2mKYdoIXcwE9xDikV5GVBKPr3rkDc3-6fBSpuM0khoM25DZpkkDC7GteqbQcFWo_JZD7qawqlAMDLwogSXtOfURJza-mqy96ICAUMj6ou9qGwkVkVo1aKna4Q';

      const endpoint = `${ACR_API_V2_BASE_URL}/api/buckets/${ACR_BUCKET_ID}/files`;

      // Theo API docs, khi data_type là audio_url, cần dùng JSON body, không phải FormData
      const requestBody: {
        data_type: string;
        url: string;
        title?: string;
        user_defined?: Record<string, unknown>;
      } = {
        data_type: 'audio_url',
        url: audioUrl,
      };
      if (title) requestBody.title = title;

      console.log('[ACR] Uploading audio URL to bucket:', audioUrl);
      console.log('[ACR] Endpoint:', endpoint);
      console.log('[ACR] Request body:', requestBody);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACR_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('[ACR] Response status:', response.status);
      console.log('[ACR] Response text:', responseText);

      if (!response.ok) {
        console.error('[ACR] Upload failed:', responseText);
        throw new Error(`ACR upload failed: ${response.status} ${response.statusText} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('[ACR] Upload response:', result);

      // Parse response để lấy acr_id
      if (result.data && result.data.acr_id) {
        return {
          success: true,
          acrid: result.data.acr_id,
          message: 'Audio URL uploaded successfully to ACR bucket',
        };
      }

      return {
        success: false,
        error: 'No acr_id found in response',
        raw: result,
      };
    } catch (error) {
      console.error('[ACR] Error uploading audio fingerprint:', error);
      throw error;
    }
  },

  searchYouTubeVideo: async (title: string, artists?: string) => {
    try {
      const response = await apiClient.post('/acr/search-youtube', { title, artists });
      return response.data?.videoId as string | undefined;
    } catch (error) {
      console.error('[YouTube] search error:', error);
      return undefined;
    }
  },

  searchYouTubeVideos: async (items: Array<{ title: string; artists?: string; key: string }>) => {
    try {
      const mapped: Record<string, { title: string; artists?: string }> = {};
      items.forEach(i => { mapped[i.key] = { title: i.title, artists: i.artists }; });
      // If there is a backend batch endpoint, call it here (not implemented in FE)
      // For now, call single endpoint sequentially (unused if BE enriches already)
      const result: Record<string, string> = {};
      for (const it of items) {
        const vid = await (await apiClient.post('/acr/search-youtube', { title: it.title, artists: it.artists })).data?.videoId;
        if (vid) result[it.key] = vid;
      }
      return result;
    } catch (error) {
      console.error('[YouTube] batch search error:', error);
      return {} as Record<string, string>;
    }
  },
};

// Quiz Attempts API - Based on new API structure
export const quizAttemptsApi = {
  // Start a new quiz attempt
  startQuiz: async (userId: number, quizId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/start`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        body: JSON.stringify({ userId, quizId }),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to start quiz');
      }

      return await response.json();
    } catch (error) {
      console.error("Error starting quiz:", error);
      throw error;
    }
  },

  // Submit an answer for a question
  submitAnswer: async (attemptId: number, questionId: number, selectedAnswerId: number, timeSpentSeconds: number = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/answers`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        body: JSON.stringify({
          questionId,
          selectedAnswerId,
          timeSpentSeconds,
        }),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to submit answer');
      }

      return await response.json();
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw error;
    }
  },

  // Submit the entire quiz
  submitQuiz: async (attemptId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to submit quiz');
      }

      return await response.json();
    } catch (error) {
      console.error("Error submitting quiz:", error);
      throw error;
    }
  },

  // Get attempt details
  getAttemptDetails: async (attemptId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get attempt details');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting attempt details:", error);
      throw error;
    }
  },

  // Get user's quiz history
  getUserQuizHistory: async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/user/${userId}`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get user quiz history');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting user quiz history:", error);
      throw error;
    }
  },

  // Get quiz results for a specific quiz
  getQuizResults: async (quizId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/quiz/${quizId}/results`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get quiz results');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting quiz results:", error);
      throw error;
    }
  },

  // Get user's quiz results
  getUserQuizResults: async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/user/${userId}/results`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get user quiz results');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting user quiz results:", error);
      throw error;
    }
  },

  // Get user's best score for a quiz
  getUserBestScore: async (userId: number, quizId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/user/${userId}/quiz/${quizId}/best`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get user best score');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting user best score:", error);
      throw error;
    }
  },

  // Get quiz leaderboard
  getQuizLeaderboard: async (quizId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz-attempts/quiz/${quizId}/leaderboard`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error || 'Failed to get quiz leaderboard');
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting quiz leaderboard:", error);
      throw error;
    }
  },
};