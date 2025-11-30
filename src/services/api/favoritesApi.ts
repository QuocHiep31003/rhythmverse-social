import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "./config";
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
}

type Resource = "songs" | "playlists" | "albums";

const buildQuery = (params?: FavoriteListParams) => {
  if (!params) return "";
  const qp = new URLSearchParams();
  if (params.page !== undefined) qp.append("page", String(params.page));
  if (params.size !== undefined) qp.append("size", String(params.size));
  if (params.sort) qp.append("sort", params.sort);
  const qs = qp.toString();
  return qs ? `?${qs}` : "";
};

const parseStatusPayload = async (res: Response): Promise<boolean> => {
  // 404 hoặc 400 đều có nghĩa là không phải favorite
  if (res.status === 404 || res.status === 400) {
    return false;
  }
  if (!res.ok) {
    throw new FavoriteError(await parseErrorResponse(res), res.status);
  }
  const text = await res.text();
  if (!text) return true;
  try {
    const payload = JSON.parse(text);
    if (typeof payload === "boolean") return payload;
    if (typeof payload?.favorite === "boolean") return payload.favorite;
    if (typeof payload?.isFavorite === "boolean") return payload.isFavorite;
    if (typeof payload?.saved === "boolean") return payload.saved;
    if (typeof payload?.status === "string") {
      return payload.status.toLowerCase() === "favorite";
    }
    return !!payload;
  } catch {
    const normalized = text.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return !!text;
  }
};

const handleMutation = async (res: Response) => {
  if (!res.ok) {
    throw new FavoriteError(await parseErrorResponse(res), res.status);
  }
  try {
    return await res.json();
  } catch {
    return true;
  }
};

const statusEndpoint = (resource: Resource, id: number | string) =>
  `${API_BASE_URL}/favorites/${resource}/${id}/status`;

const mutationEndpoint = (resource: Resource, id: number | string) =>
  `${API_BASE_URL}/favorites/${resource}/${id}`;

export const favoritesApi = {
  // SONGS
  getSongStatus: async (songId: number | string) => {
    const res = await fetch(statusEndpoint("songs", songId), {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    return parseStatusPayload(res);
  },

  addSong: async (songId: number | string) => {
    const res = await fetch(mutationEndpoint("songs", songId), {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  removeSong: async (songId: number | string) => {
    const res = await fetch(mutationEndpoint("songs", songId), {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  listSongs: async (params?: FavoriteListParams) => {
    const res = await fetch(
      `${API_BASE_URL}/favorites/songs${buildQuery(params)}`,
      {
        method: "GET",
        headers: buildJsonHeaders(),
      }
    );
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return (await res.json()) as PageResponse<FavoriteSongDTO>;
  },

  // PLAYLISTS
  getPlaylistStatus: async (playlistId: number | string) => {
    const res = await fetch(statusEndpoint("playlists", playlistId), {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    return parseStatusPayload(res);
  },

  savePlaylist: async (playlistId: number | string) => {
    const res = await fetch(mutationEndpoint("playlists", playlistId), {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  removePlaylist: async (playlistId: number | string) => {
    const res = await fetch(mutationEndpoint("playlists", playlistId), {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  listPlaylists: async (params?: FavoriteListParams) => {
    const res = await fetch(
      `${API_BASE_URL}/favorites/playlists${buildQuery(params)}`,
      {
        method: "GET",
        headers: buildJsonHeaders(),
      }
    );
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return (await res.json()) as PageResponse<FavoritePlaylistDTO>;
  },

  // ALBUMS
  getAlbumStatus: async (albumId: number | string) => {
    const res = await fetch(statusEndpoint("albums", albumId), {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    return parseStatusPayload(res);
  },

  saveAlbum: async (albumId: number | string) => {
    const res = await fetch(mutationEndpoint("albums", albumId), {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  removeAlbum: async (albumId: number | string) => {
    const res = await fetch(mutationEndpoint("albums", albumId), {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    return handleMutation(res);
  },

  listAlbums: async (params?: FavoriteListParams) => {
    const res = await fetch(
      `${API_BASE_URL}/favorites/albums${buildQuery(params)}`,
      {
        method: "GET",
        headers: buildJsonHeaders(),
      }
    );
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return (await res.json()) as PageResponse<FavoriteAlbumDTO>;
  },

  // GET COUNT APIs
  getSongLikeCount: async (songId: number | string): Promise<{ songId: number; count: number }> => {
    const res = await fetch(`${API_BASE_URL}/favorites/songs/${songId}/count`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return await res.json();
  },

  getPlaylistLikeCount: async (playlistId: number | string): Promise<{ playlistId: number; count: number }> => {
    const res = await fetch(`${API_BASE_URL}/favorites/playlists/${playlistId}/count`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return await res.json();
  },

  getAlbumLikeCount: async (albumId: number | string): Promise<{ albumId: number; count: number }> => {
    const res = await fetch(`${API_BASE_URL}/favorites/albums/${albumId}/count`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) {
      throw new FavoriteError(await parseErrorResponse(res), res.status);
    }
    return await res.json();
  },
};



