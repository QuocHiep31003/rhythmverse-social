import { apiClient } from "./config";
import { PlaylistVisibility, CollaboratorRole, PlaylistCollaborator } from "@/types/playlist";

/**
 * Custom error class for permission-related errors
 */
export class PlaylistPermissionError extends Error {
  constructor(
    message: string,
    public status: number = 403,
    public originalMessage?: string
  ) {
    super(message);
    this.name = "PlaylistPermissionError";
  }
}

export type PlaylistType = "USER_CREATED" | "SYSTEM_GLOBAL";

export interface PlaylistDTO {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: PlaylistVisibility | "PUBLIC" | "PRIVATE" | "FRIENDS_ONLY";
  type?: PlaylistType;
  isSystemGenerated?: boolean;
  autoUpdateSchedule?: string | null;
  lastAutoUpdate?: string | null;
  songLimit?: number;
  dateUpdate?: string | null; // YYYY-MM-DD
  songIds?: number[];
  songs?: Array<{
    id?: number;
    name?: string;
    artists?: Array<{ id?: number; name: string }>;
    album?: { id?: number; name: string } | null;
    urlImageAlbum?: string;
    audioUrl?: string;
    duration?: number | string;
  }>;
  owner?: { id: number; name: string } | null;
  ownerId?: number; // Owner ID for permission checks
  ownerName?: string; // Owner name (from backend DTO)
  ownerAvatar?: string | null; // Owner avatar (from backend DTO)
  collaborators?: PlaylistCollaborator[]; // List of collaborators
  isBanned?: boolean;
  isWarned?: boolean;
  warningCount?: number;
  warningReason?: string | null;
}

// Response từ GET /api/playlists/library
export interface PlaylistLibraryItemDTO {
  playlistId: number;
  name: string;
  coverUrl?: string | null;
  ownerId: number;
  ownerName?: string;
  ownerAvatar?: string | null;
  isOwner?: boolean;
  isCollaborator?: boolean;
  role?: "OWNER" | "EDITOR" | "VIEWER" | null; // ROLE returned by backend (OWNER when you own the playlist)
  description?: string | null;
  visibility?: PlaylistVisibility | "PUBLIC" | "PRIVATE" | "FRIENDS_ONLY" | null;
  songCount?: number;
  totalSongs?: number;
  totalDuration?: string | null;
  likes?: number;
  createdAt?: string;
  updatedAt?: string;
  dateUpdate?: string | null;
  isBanned?: boolean;
  isWarned?: boolean;
  warningCount?: number;
  warningReason?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export const playlistsApi = {
  getAll: async (params?: { page?: number; size?: number; sort?: string; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.page !== undefined) qp.append("page", String(params.page));
    if (params?.size !== undefined) qp.append("size", String(params.size));
    if (params?.sort) qp.append("sort", params.sort);
    if (params?.search) qp.append("search", params.search);

    try {
      const response = await apiClient.get<PageResponse<PlaylistDTO>>(`/playlists?${qp.toString()}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch playlists';
      throw new Error(errorMessage);
    }
  },

  getByUser: async (
    userId: number | string,
    params?: { page?: number; size?: number; sort?: string; search?: string }
  ) => {
    const qp = new URLSearchParams();
    if (params?.page !== undefined) qp.append("page", String(params.page));
    if (params?.size !== undefined) qp.append("size", String(params.size));
    if (params?.sort) qp.append("sort", params.sort);
    if (params?.search) qp.append("search", params.search);

    try {
      const response = await apiClient.get<PageResponse<PlaylistDTO>>(`/playlists/user/${userId}?${qp.toString()}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch playlists by user';
      throw new Error(errorMessage);
    }
  },

  // Lấy tất cả playlists của user (owned + collaborated)
  // GET /api/playlists/library
  // ĐÃ MỞ RỘNG: hỗ trợ search/visibility/sort (khi backend implement)
  library: async (params?: { search?: string; visibility?: string; sort?: string }) => {
    const qp = new URLSearchParams();
    if (params?.search) qp.append("search", params.search);
    if (params?.visibility) qp.append("visibility", params.visibility);
    if (params?.sort) qp.append("sort", params.sort);

    const qs = qp.toString();
    const url = qs ? `/playlists/library?${qs}` : `/playlists/library`;

    try {
      const response = await apiClient.get<PlaylistLibraryItemDTO[]>(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch playlist library';
      throw new Error(errorMessage);
    }
  },

  getById: async (id: number | string) => {
    try {
      const response = await apiClient.get<PlaylistDTO>(`/playlists/${id}`);
      return response.data;
    } catch (error: any) {
      // Handle 403 Forbidden - permission to view denied
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to view this playlist",
          403,
          errorText
        );
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch playlist';
      throw new Error(errorMessage);
    }
  },

  create: async (data: Partial<PlaylistDTO>) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? "",
      coverUrl: data.coverUrl ?? null,
      visibility: data.visibility ?? "PUBLIC",
      songLimit: data.songLimit ?? 500,
      dateUpdate: data.dateUpdate, // optional
      songIds: data.songIds ?? [],
    };
    try {
      const response = await apiClient.post<PlaylistDTO>('/playlists', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create playlist';
      throw new Error(errorMessage);
    }
  },

  update: async (id: number | string, data: Partial<PlaylistDTO>) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? "",
      coverUrl: data.coverUrl ?? null,
      visibility: data.visibility ?? "PUBLIC",
      songLimit: data.songLimit,
      dateUpdate: data.dateUpdate,
      songIds: data.songIds,
    };
    try {
      const response = await apiClient.put<PlaylistDTO>(`/playlists/${id}`, payload);
      return response.data;
    } catch (error: any) {
      // Handle 401 Unauthorized - missing JWT token
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 Forbidden - only owner can update
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Only playlist owner can update playlist information",
          403,
          errorText
        );
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update playlist';
      throw new Error(errorMessage);
    }
  },

  addSong: async (playlistId: number | string, songId: number | string) => {
    try {
      const response = await apiClient.post(`/playlists/${playlistId}/songs/${songId}`);
      return response.data || { success: true };
    } catch (error: any) {
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }

      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to add songs to this playlist",
          403,
          errorText
        );
      }

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add song to playlist';
      throw new Error(errorMessage);
    }
  },

  // Add multiple songs to a playlist (bulk)
  addSongs: async (playlistId: number | string, songIds: (number | string)[]) => {
    try {
      const response = await apiClient.post(`/playlists/${playlistId}/songs`, { songIds });
      return response.data || { success: true };
    } catch (error: any) {
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to add songs to this playlist",
          403,
          errorText
        );
      }

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add songs to playlist';
      throw new Error(errorMessage);
    }
  },

  // Remove a song from a playlist (dedicated endpoint)
  removeSong: async (playlistId: number | string, songId: number | string) => {
    try {
      await apiClient.delete(`/playlists/${playlistId}/songs/${songId}`);
      return "Removed";
    } catch (error: any) {
      // Handle 401 Unauthorized - missing JWT token
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 Forbidden - no edit permission
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to edit this playlist",
          403,
          errorText
        );
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove song from playlist';
      throw new Error(errorMessage);
    }
  },

  delete: async (id: number | string) => {
    // Đảm bảo id là số hợp lệ
    const playlistId = typeof id === "string" ? Number(id) : id;
    if (!playlistId || isNaN(playlistId) || !isFinite(playlistId)) {
      throw new Error("Invalid playlist ID");
    }
    
    try {
      await apiClient.delete(`/playlists/${playlistId}`);
      return { success: true } as const;
    } catch (error: any) {
      // Handle 400 Bad Request
      if (error.response?.status === 400) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new Error(errorText || "Cannot delete playlist: Invalid request");
      }
      
      // Handle 401 Unauthorized - missing JWT token
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 Forbidden - only owner can delete
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Only playlist owner can delete this playlist",
          403,
          errorText
        );
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || `Failed to delete playlist: ${error.response?.status}`;
      throw new Error(errorMessage);
    }
  },

  count: async (search?: string) => {
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await apiClient.get<number>(`/playlists/count${qs}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get playlist count';
      throw new Error(errorMessage);
    }
  },

  exportExcel: async () => {
    try {
      const response = await apiClient.get('/playlists/export', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "playlists.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to export playlists';
      throw new Error(errorMessage);
    }
  },

  importExcel: async (file: File) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await apiClient.post('/playlists/import', fd);
      return response.data || "Imported";
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to import playlists';
      throw new Error(errorMessage);
    }
  },

  // Search songs trong playlist
  searchSongs: async (playlistId: number | string, searchQuery: string) => {
    try {
      const qs = new URLSearchParams({ search: searchQuery });
      const response = await apiClient.get<PlaylistDTO>(`/playlists/${playlistId}/songs/search?${qs.toString()}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to search songs in playlist';
      throw new Error(errorMessage);
    }
  },
};

// Collaborator invites (invite by playlistId to receiver)
// According to API docs: POST /api/playlists/invites/collab?playlistId={id}&receiverId={id}
// Role mặc định là EDITOR (không có role parameter trong URL)
export const playlistCollabInvitesApi = {
  send: async (
    playlistId: number,
    receiverId: number,
    role?: CollaboratorRole | "EDITOR" | "VIEWER" // Role parameter không dùng nữa, chỉ để backward compatibility
  ) => {
    // Collab chỉ dành cho EDITOR, không có VIEWER
    // VIEWER nên dùng Share qua chat API thay vì collab invite
    const qs = new URLSearchParams({
      playlistId: String(playlistId),
      receiverId: String(receiverId),
    });

    // Endpoint collab chỉ dành cho EDITOR
    try {
      const response = await apiClient.post(`/playlists/invites/collab?${qs.toString()}`);
      return response.data || "Invite sent";
    } catch (error: any) {
      // Handle 400 - Bad request (e.g., invite already exists, invalid parameters)
      if (error.response?.status === 400) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message || "Invalid invite request";
        const err = new Error(errorText);
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      
      // Handle 401 - Unauthorized
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 - Permission denied
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to invite collaborators",
          403,
          errorText
        );
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send collaborator invite';
      throw new Error(errorMessage);
    }
  },
  accept: async (inviteId: number) => {
    try {
      const response = await apiClient.post(`/playlists/invites/accept/${inviteId}`);
      return response.data || "Invite accepted";
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept invite';
      throw new Error(errorMessage);
    }
  },
  acceptByCode: async (inviteCode: string) => {
    try {
      const qs = new URLSearchParams({ code: inviteCode });
      const response = await apiClient.post(`/playlists/invites/accept-by-code?${qs.toString()}`);
      return response.data || "Invite accepted";
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept invite by code';
      throw new Error(errorMessage);
    }
  },
  reject: async (inviteId: number) => {
    try {
      const response = await apiClient.post(`/playlists/invites/reject/${inviteId}`);
      return response.data || "Invite rejected";
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to reject invite';
      throw new Error(errorMessage);
    }
  },
  pending: async () => {
    try {
      const response = await apiClient.get('/playlists/invites/pending');
      const data = response.data;
      // Support both array and paginated responses
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.content)) return data.content;
      return [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get pending invites';
      throw new Error(errorMessage);
    }
  },
  preview: async (inviteId: number) => {
    try {
      const response = await apiClient.get(`/playlists/invites/preview/${inviteId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to preview invite';
      throw new Error(errorMessage);
    }
  },
  previewByCode: async (inviteCode: string) => {
    try {
      const response = await apiClient.get(`/playlists/invites/preview/code/${encodeURIComponent(inviteCode)}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to preview invite by code';
      throw new Error(errorMessage);
    }
  },
  // Lấy pending invites của playlist để filter friend list
  // GET /api/playlists/invites/playlist/{playlistId}
  pendingForPlaylist: async (playlistId: number) => {
    try {
      const response = await apiClient.get(`/playlists/invites/playlist/${playlistId}`);
      const payload = response.data;
      // Response format: { playlistId, invitedUserIds: [2, 3, 5], invites: [...] }
      if (payload && Array.isArray(payload.invitedUserIds)) {
        return payload;
      }
      // Fallback for array response
      if (Array.isArray(payload)) return { invitedUserIds: payload.map((p: any) => p.receiverId || p.id || p), invites: payload };
      return { invitedUserIds: [], invites: [] };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to get pending invites for playlist';
      throw new Error(errorMessage);
    }
  },
};

// Collaborators (list/remove)
// According to Swagger: GET /api/playlists/invites/collaborators/{playlistId}
export const playlistCollaboratorsApi = {
  list: async (playlistId: number) => {
    try {
      const response = await apiClient.get(`/playlists/invites/collaborators/${playlistId}`);
      return response.data;
    } catch (error: any) {
      // Handle 500 errors gracefully - server might not support this endpoint yet
      if (error.response?.status === 500) {
        console.warn(`Server error loading collaborators for playlist ${playlistId}`);
        return []; // Return empty array instead of throwing
      }
      
      // Handle 401 - Unauthorized
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 - user doesn't have permission
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to view collaborators",
          403,
          errorText
        );
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to list collaborators';
      throw new Error(errorMessage);
    }
  },
  // Use invite API instead of separate invite endpoint
  invite: async (playlistId: number, friendId: number, role: CollaboratorRole | "EDITOR" | "VIEWER" = "EDITOR") => {
    // Use the invite API endpoint
    return await playlistCollabInvitesApi.send(playlistId, friendId, role);
  },
  remove: async (playlistId: number, collaboratorId: number) => {
    // According to Swagger: DELETE /api/playlists/invites/collaborators/{playlistId}?friendId={id}
    const qs = new URLSearchParams({ friendId: String(collaboratorId) });
    try {
      await apiClient.delete(`/playlists/invites/collaborators/${playlistId}?${qs.toString()}`);
      return "Collaborator removed";
    } catch (error: any) {
      // Handle 401 - Unauthorized
      if (error.response?.status === 401) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "Unauthorized: Please login first",
          401,
          errorText
        );
      }
      
      // Handle 403 - Permission denied
      if (error.response?.status === 403) {
        const errorText = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new PlaylistPermissionError(
          "You don't have permission to remove collaborators",
          403,
          errorText
        );
      }

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to remove collaborator';
      throw new Error(errorMessage);
    }
  },
  leave: async (playlistId: number) => {
    try {
      const qs = new URLSearchParams({ playlistId: String(playlistId) });
      await apiClient.post(`/playlists/invites/collaborators/leave?${qs.toString()}`);
      return "Left playlist";
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to leave playlist';
      throw new Error(errorMessage);
    }
  },
};
