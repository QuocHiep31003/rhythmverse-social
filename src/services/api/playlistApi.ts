import { API_BASE_URL, buildJsonHeaders, parseErrorResponse } from "@/services/api";

export interface PlaylistDTO {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
  songLimit?: number;
  dateUpdate?: string | null; // YYYY-MM-DD
  songIds?: number[];
  songs?: any[];
  owner?: { id: number; name: string } | null;
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

  getById: async (id: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistDTO;
  },

  create: async (data: Partial<PlaylistDTO>) => {
    const payload: any = {
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
    const payload: any = {
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
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as PlaylistDTO;
  },

  delete: async (id: number | string) => {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
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
    const headers = { ...buildJsonHeaders() } as any;
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
export const playlistCollabInvitesApi = {
  send: async (playlistId: number, receiverId: number, role: "VIEWER" | "EDITOR" = "VIEWER") => {
    const qs = new URLSearchParams({ playlistId: String(playlistId), receiverId: String(receiverId), role });
    const res = await fetch(`${API_BASE_URL}/playlists/invites/send?${qs.toString()}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Invite sent"; }
  },
  accept: async (inviteId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/invites/accept/${inviteId}`, {
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
    return await res.json();
  },
};

// Collaborators (list/remove)
export const playlistCollaboratorsApi = {
  list: async (playlistId: number) => {
    const res = await fetch(`${API_BASE_URL}/playlists/collaborators/${playlistId}`, {
      method: "GET",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return await res.json();
  },
  invite: async (playlistId: number, friendId: number, role: "VIEWER" | "EDITOR" = "VIEWER") => {
    const qs = new URLSearchParams({ playlistId: String(playlistId), friendId: String(friendId), role });
    const res = await fetch(`${API_BASE_URL}/playlists/collaborators/invite?${qs.toString()}`, {
      method: "POST",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Collaborator invited"; }
  },
  remove: async (playlistId: number, userId: number) => {
    const qs = new URLSearchParams({ playlistId: String(playlistId), userId: String(userId) });
    const res = await fetch(`${API_BASE_URL}/playlists/collaborators/remove?${qs.toString()}`, {
      method: "DELETE",
      headers: buildJsonHeaders(),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    try { return await res.text(); } catch { return "Collaborator removed"; }
  },
};
