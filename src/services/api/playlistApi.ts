import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";
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

export interface PlaylistDTO {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: PlaylistVisibility | "PUBLIC" | "PRIVATE" | "FRIENDS_ONLY";
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

    const res = await fetch(`${API_BASE_URL}/playlists?${qp.toString()}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PageResponse<PlaylistDTO>;
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

    const res = await fetch(`${API_BASE_URL}/playlists/user/${userId}?${qp.toString()}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PageResponse<PlaylistDTO>;
  },

  // Lấy tất cả playlists của user (owned + collaborated)
  // GET /api/playlists/library
  library: async () => {
    const res = await fetch(`${API_BASE_URL}/playlists/library`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistLibraryItemDTO[];
  },

  getById: async (id: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    
    // Handle 403 Forbidden - permission to view denied
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to view this playlist",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistDTO;
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
    const res = await fetch(`${API_BASE_URL}/playlists`, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistDTO;
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
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: "PUT",
      headers: buildJsonHeaders(),
      body: JSON.stringify(payload),
    });
    
    // Handle 401 Unauthorized - missing JWT token
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 Forbidden - only owner can update
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Only playlist owner can update playlist information",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistDTO;
  },

  addSong: async (playlistId: number | string, songId: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs/${songId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });

    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }

    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to add songs to this playlist",
        403,
        errorText
      );
    }

    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.json(); } catch { return { success: true } as const; }
  },

  // Remove a song from a playlist (dedicated endpoint)
  removeSong: async (playlistId: number | string, songId: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs/${songId}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    
    // Handle 401 Unauthorized - missing JWT token
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 Forbidden - no edit permission
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to edit this playlist",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Removed"; }
  },

  delete: async (id: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    
    // Handle 401 Unauthorized - missing JWT token
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 Forbidden - only owner can delete
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Only playlist owner can delete this playlist",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return { success: true } as const;
  },

  count: async (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`${API_BASE_URL}/playlists/count${qs}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as number;
  },

  exportExcel: async () => {
    const res = await fetch(`${API_BASE_URL}/playlists/export`, { headers: buildJsonHeaders() });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playlists.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importExcel: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const headers: Record<string, string> = { ...buildJsonHeaders() };
    delete headers["Content-Type"]; // let browser set boundary
    const res = await fetch(`${API_BASE_URL}/playlists/import`, {
      method: "POST",
      headers,
      body: fd,
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Imported"; }
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
    const res = await fetch(`${API_BASE_URL}/playlists/invites/collab?${qs.toString()}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    
    // Handle 400 - Bad request (e.g., invite already exists, invalid parameters)
    if (res.status === 400) {
      const errorText = await parseErrorResponse(res);
      // Try to parse JSON error response for better message
      let errorMessage = errorText || "Invalid invite request";
      try {
        // Check if errorText is JSON
        const jsonError = JSON.parse(errorText);
        if (jsonError.message) {
          errorMessage = jsonError.message;
        } else if (typeof jsonError === 'string') {
          errorMessage = jsonError;
        }
      } catch {
        // Not JSON, use errorText as is
        errorMessage = errorText || "Invalid invite request";
      }
      const error = new Error(errorMessage);
      (error as Error & { status: number }).status = 400;
      throw error;
    }
    
    // Handle 401 - Unauthorized
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 - Permission denied
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to invite collaborators",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    // Backend now returns DTO; be robust to text fallback
    try { return await res.json(); } catch {
      try { return await res.text(); } catch { return "Invite sent"; }
    }
  },
  accept: async (inviteId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/accept/${inviteId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Invite accepted"; }
  },
  acceptByCode: async (inviteCode: string) => {
    const qs = new URLSearchParams({ code: inviteCode });
    const res = await fetch(`${API_BASE_URL}/playlists/invites/accept-by-code?${qs.toString()}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Invite accepted"; }
  },
  reject: async (inviteId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/reject/${inviteId}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Invite rejected"; }
  },
  pending: async () => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/pending`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    // Support both array and paginated responses
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    return [];
  },
  preview: async (inviteId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/preview/${inviteId}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
  previewByCode: async (inviteCode: string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/preview/code/${encodeURIComponent(inviteCode)}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
  // Lấy pending invites của playlist để filter friend list
  // GET /api/playlists/invites/playlist/{playlistId}
  pendingForPlaylist: async (playlistId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/playlist/${playlistId}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const payload = await res.json();
    // Response format: { playlistId, invitedUserIds: [2, 3, 5], invites: [...] }
    if (payload && Array.isArray(payload.invitedUserIds)) {
      return payload;
    }
    // Fallback for array response
    if (Array.isArray(payload)) return { invitedUserIds: payload.map((p: any) => p.receiverId || p.id || p), invites: payload };
    return { invitedUserIds: [], invites: [] };
  },
};

// Collaborators (list/remove)
// According to Swagger: GET /api/playlists/invites/collaborators/{playlistId}
export const playlistCollaboratorsApi = {
  list: async (playlistId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/collaborators/${playlistId}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    
    // Handle 500 errors gracefully - server might not support this endpoint yet
    if (res.status === 500) {
      console.warn(`Server error loading collaborators for playlist ${playlistId}`);
      return []; // Return empty array instead of throwing
    }
    
    // Handle 401 - Unauthorized
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 - user doesn't have permission
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to view collaborators",
        403,
        errorText
      );
    }
    
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
  // Use invite API instead of separate invite endpoint
  invite: async (playlistId: number, friendId: number, role: CollaboratorRole | "EDITOR" | "VIEWER" = "EDITOR") => {
    // Use the invite API endpoint
    return await playlistCollabInvitesApi.send(playlistId, friendId, role);
  },
  remove: async (playlistId: number, collaboratorId: number) => {
    // According to Swagger: DELETE /api/playlists/invites/collaborators/{playlistId}?friendId={id}
    const qs = new URLSearchParams({ friendId: String(collaboratorId) });
    const res = await fetch(`${API_BASE_URL}/playlists/invites/collaborators/${playlistId}?${qs.toString()}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    
    // Handle 401 - Unauthorized
    if (res.status === 401) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "Unauthorized: Please login first",
        401,
        errorText
      );
    }
    
    // Handle 403 - Permission denied
    if (res.status === 403) {
      const errorText = await parseErrorResponse(res);
      throw new PlaylistPermissionError(
        "You don't have permission to remove collaborators",
        403,
        errorText
      );
    }

    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Collaborator removed"; }
  },
  leave: async (playlistId: number) => {
    const qs = new URLSearchParams({ playlistId: String(playlistId) });
    const res = await fetch(`${API_BASE_URL}/playlists/invites/collaborators/leave?${qs.toString()}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Left playlist"; }
  },
};
