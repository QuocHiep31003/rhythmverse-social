import { apiClient } from "./config";
import type { PlaylistDTO, PageResponse } from "./playlistApi";

export class FavoriteError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "FavoriteError";
  }
}

export interface FavoriteSongDTO {
  id: number;
  name?: string;
  title?: string;
  artist?: string;
  artists?: Array<{ id?: number; name?: string }>;
  duration?: string | number;
  album?: string | { id?: number; name?: string };
  albumId?: number;
  albumCoverImg?: string | null;
  coverUrl?: string | null;
  urlImageAlbum?: string | null;
  likedAt?: string | null;
  likes?: number | null;
}

export interface FavoriteAlbumDTO {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  artist?: { id?: number; name?: string } | string | null; // Can be object or string
  artistName?: string | null;
  artistId?: number | null;
  songCount?: number | null;
  totalDuration?: string | null;
  releaseDate?: string | null;
  likedAt?: string | null;
  likes?: number | null;
}

export type FavoritePlaylistDTO = PlaylistDTO;

export interface FavoriteListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
}

type Resource = "songs" | "playlists" | "albums";

const buildQuery = (params?: FavoriteListParams) => {
  if (!params) return "";
  const qp = new URLSearchParams();
  if (params.page !== undefined) qp.append("page", String(params.page));
  if (params.size !== undefined) qp.append("size", String(params.size));
  if (params.sort) qp.append("sort", params.sort);
  if (params.search) qp.append("search", params.search);
  const qs = qp.toString();
  return qs ? `?${qs}` : "";
};

const parseStatusPayload = (data: any): boolean => {
  if (typeof data === "boolean") return data;
  if (typeof data?.favorite === "boolean") return data.favorite;
  if (typeof data?.isFavorite === "boolean") return data.isFavorite;
  if (typeof data?.saved === "boolean") return data.saved;
  if (typeof data?.status === "string") {
    return data.status.toLowerCase() === "favorite";
  }
  return !!data;
};

export const favoritesApi = {
  // SONGS
  getSongStatus: async (songId: number | string) => {
    try {
      const response = await apiClient.get(`/favorites/songs/${songId}/status`);
      return parseStatusPayload(response.data);
    } catch (error: any) {
      // 404 hoặc 400 đều có nghĩa là không phải favorite
      if (error.response?.status === 404 || error.response?.status === 400) {
        return false;
      }
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get song status';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  addSong: async (songId: number | string) => {
    try {
      const response = await apiClient.post(`/favorites/songs/${songId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add song to favorites';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  removeSong: async (songId: number | string) => {
    try {
      const response = await apiClient.delete(`/favorites/songs/${songId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove song from favorites';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  listSongs: async (params?: FavoriteListParams) => {
    try {
      const response = await apiClient.get<PageResponse<FavoriteSongDTO>>(`/favorites/songs${buildQuery(params)}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to list favorite songs';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  // PLAYLISTS
  getPlaylistStatus: async (playlistId: number | string) => {
    try {
      const response = await apiClient.get(`/favorites/playlists/${playlistId}/status`);
      return parseStatusPayload(response.data);
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        return false;
      }
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get playlist status';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  savePlaylist: async (playlistId: number | string) => {
    try {
      const response = await apiClient.post(`/favorites/playlists/${playlistId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save playlist';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  removePlaylist: async (playlistId: number | string) => {
    try {
      const response = await apiClient.delete(`/favorites/playlists/${playlistId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove playlist from favorites';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  listPlaylists: async (params?: FavoriteListParams) => {
    try {
      const response = await apiClient.get<PageResponse<FavoritePlaylistDTO>>(`/favorites/playlists${buildQuery(params)}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to list favorite playlists';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  // ALBUMS
  getAlbumStatus: async (albumId: number | string) => {
    try {
      const response = await apiClient.get(`/favorites/albums/${albumId}/status`);
      return parseStatusPayload(response.data);
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        return false;
      }
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get album status';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  saveAlbum: async (albumId: number | string) => {
    try {
      const response = await apiClient.post(`/favorites/albums/${albumId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save album';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  removeAlbum: async (albumId: number | string) => {
    try {
      const response = await apiClient.delete(`/favorites/albums/${albumId}`);
      return response.data || true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove album from favorites';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  listAlbums: async (params?: FavoriteListParams) => {
    try {
      const response = await apiClient.get<PageResponse<FavoriteAlbumDTO>>(`/favorites/albums${buildQuery(params)}`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to list favorite albums';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  // GET COUNT APIs
  getSongLikeCount: async (songId: number | string): Promise<{ songId: number; count: number }> => {
    try {
      const response = await apiClient.get<{ songId: number; count: number }>(`/favorites/songs/${songId}/count`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get song like count';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  getPlaylistLikeCount: async (playlistId: number | string): Promise<{ playlistId: number; count: number }> => {
    try {
      const response = await apiClient.get<{ playlistId: number; count: number }>(`/favorites/playlists/${playlistId}/count`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get playlist like count';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },

  getAlbumLikeCount: async (albumId: number | string): Promise<{ albumId: number; count: number }> => {
    try {
      const response = await apiClient.get<{ albumId: number; count: number }>(`/favorites/albums/${albumId}/count`);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get album like count';
      throw new FavoriteError(errorMsg, error.response?.status);
    }
  },
};



