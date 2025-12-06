import { adminClient } from './config';

/**
 * Admin API - Dùng adminClient (adminToken)
 * Tất cả endpoints trong file này yêu cầu admin token
 */

// ==================== PLAYLISTS ADMIN ====================
export const adminPlaylistsApi = {
  // Get banned playlists
  getBanned: async () => {
    try {
      const response = await adminClient.get('/playlists/admin/banned');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get banned playlists';
      throw new Error(errorMsg);
    }
  },

  // Get flagged playlists
  getFlagged: async () => {
    try {
      const response = await adminClient.get('/playlists/admin/flagged');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get flagged playlists';
      throw new Error(errorMsg);
    }
  },

  // Ban a playlist
  ban: async (playlistId: number) => {
    try {
      const response = await adminClient.post(`/playlists/admin/${playlistId}/ban`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to ban playlist';
      throw new Error(errorMsg);
    }
  },

  // Warn a playlist
  warn: async (playlistId: number) => {
    try {
      const response = await adminClient.post(`/playlists/admin/${playlistId}/warn`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to warn playlist';
      throw new Error(errorMsg);
    }
  },

  // Unban a playlist
  unban: async (playlistId: number) => {
    try {
      const response = await adminClient.post(`/playlists/admin/${playlistId}/unban`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to unban playlist';
      throw new Error(errorMsg);
    }
  },

  // Unwarn a playlist
  unwarn: async (playlistId: number) => {
    try {
      const response = await adminClient.post(`/playlists/admin/${playlistId}/unwarn`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to unwarn playlist';
      throw new Error(errorMsg);
    }
  },
};

// ==================== SYSTEM PLAYLISTS ADMIN ====================
export const adminSystemPlaylistsApi = {
  // Get editorial playlists
  getEditorial: async () => {
    try {
      const response = await adminClient.get('/playlists/editorial');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get editorial playlists';
      throw new Error(errorMsg);
    }
  },

  // Create editorial playlist
  createEditorial: async (data: any) => {
    try {
      const response = await adminClient.post('/playlists/editorial', data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create editorial playlist';
      throw new Error(errorMsg);
    }
  },

  // Get global system playlists
  getGlobal: async () => {
    try {
      const response = await adminClient.get('/playlists/system/global');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get global playlists';
      throw new Error(errorMsg);
    }
  },

  // Initialize global playlists
  initializeGlobal: async () => {
    try {
      const response = await adminClient.post('/playlists/system/global/initialize');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to initialize global playlists';
      throw new Error(errorMsg);
    }
  },

  // Update global playlists
  updateGlobal: async () => {
    try {
      const response = await adminClient.post('/playlists/system/global/update');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update global playlists';
      throw new Error(errorMsg);
    }
  },

  // Initialize genre-mood playlists
  initializeGenreMood: async () => {
    try {
      const response = await adminClient.post('/playlists/system/genre-mood/initialize');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to initialize genre-mood playlists';
      throw new Error(errorMsg);
    }
  },
};

// ==================== TRENDING ADMIN ====================
export const adminTrendingApi = {
  // Get all results
  getResults: async () => {
    try {
      const response = await adminClient.get('/admin/results');
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get results';
      throw new Error(errorMsg);
    }
  },

  // Get result details
  getResultDetails: async (id: number) => {
    try {
      const response = await adminClient.get(`/admin/results/${id}/details`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get result details';
      throw new Error(errorMsg);
    }
  },
};

// ==================== SNAPSHOTS ADMIN ====================
export const adminSnapshotsApi = {
  // Get all snapshots
  getAll: async (page = 0, size = 20) => {
    try {
      const response = await adminClient.get(`/admin/snapshots?page=${page}&size=${size}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch snapshots';
      throw new Error(errorMsg);
    }
  },

  // Get snapshot details
  getDetails: async (id: number) => {
    try {
      const response = await adminClient.get(`/admin/snapshots/${id}/details`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch snapshot details';
      throw new Error(errorMsg);
    }
  },
};

