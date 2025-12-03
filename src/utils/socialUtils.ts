import { ChatMessageDTO, SharedContentDTO, SharedContentType, SharedAlbumDTO, SharedPlaylistDTO, SharedSongDTO } from "@/services/api/chatApi";
import type { Friend, Message, SharedAlbumMessageData, SharedPlaylistMessageData, SharedSongMessageData } from "@/types/social";

export const DEFAULT_ARTIST_NAME = "Unknown Artist";

export function normalizeArtistName(artist: unknown): string {
  if (!artist) return DEFAULT_ARTIST_NAME;
  if (typeof artist === "string") return artist;
  if (Array.isArray(artist)) {
    const first = artist[0];
    return first ? normalizeArtistName(first) : DEFAULT_ARTIST_NAME;
  }
  if (typeof artist === "object" && artist !== null) {
    const maybeName = (artist as { name?: unknown }).name;
    if (maybeName) return normalizeArtistName(maybeName);
  }
  return DEFAULT_ARTIST_NAME;
}

export const extractArtistNames = (artists: unknown): string[] => {
  // Handle string (BE trả về từ FirebaseChatService)
  if (typeof artists === "string" && artists.trim()) {
    return artists.split(',').map(a => a.trim()).filter(Boolean);
  }
  // Handle array
  if (!Array.isArray(artists)) return [];
  return artists
    .map((artist) => {
      if (!artist) return null;
      if (typeof artist === "string") return artist;
      if (typeof artist === "object") {
        const maybeName = (artist as { name?: unknown }).name;
        if (typeof maybeName === "string") return maybeName;
      }
      return null;
    })
    .filter((name): name is string => !!(name && name.trim().length > 0))
    .map((name) => name.trim());
};

export const formatDurationLabel = (input: unknown): string | null => {
  if (input == null) return null;
  if (typeof input === "string" && input.trim().length > 0) return input.trim();
  if (typeof input === "number" && Number.isFinite(input)) {
    const totalSeconds = Math.max(0, Math.floor(input));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return null;
};

export const decodeUnicodeEscapes = (input: unknown): string => {
  if (typeof input !== "string") {
    return typeof input === "number" ? String(input) : "";
  }
  if (!input.includes("\\u")) {
    return input;
  }
  const replaceBraced = input.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, hex: string) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return `\\u{${hex}}`;
    }
  });
  return replaceBraced.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex: string) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return `\\u${hex}`;
    }
  });
};

export function parseIncomingContent(m: ChatMessageDTO, friends: Friend[]): Message {
  const backendId = (() => {
    const maybeMessageId = (m as { messageId?: number | string | null | undefined }).messageId;
    if (typeof maybeMessageId === "number" && Number.isFinite(maybeMessageId)) return maybeMessageId;
    if (typeof maybeMessageId === "string" && maybeMessageId.trim().length > 0) {
      const parsed = Number(maybeMessageId);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof m.id === "number" && Number.isFinite(m.id)) return m.id;
    if (typeof m.id === "string" && m.id.trim().length > 0) {
      const parsed = Number(m.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  })();
  const resolvedId = (() => {
    if (typeof m.id === "string" && m.id.length > 0) return m.id;
    if (typeof m.id === "number" && Number.isFinite(m.id)) return String(m.id);
    const fallback = (m as { firebaseKey?: string | null })?.firebaseKey;
    if (fallback) return fallback;
    if (backendId != null) return String(backendId);
    return String(Date.now());
  })();
  let type: Message["type"] = "text";
  let songData: { id?: string | number; title: string; artist: string } | undefined = undefined;
  let playlistData: { id: number; name: string; coverUrl?: string | null; songCount?: number; owner?: string } | undefined = undefined;
  let albumData: { id: number; name: string; coverUrl?: string | null; artist?: string; releaseYear?: number } | undefined = undefined;
  let sharedPlaylist: SharedPlaylistMessageData | undefined;
  let sharedAlbum: SharedAlbumMessageData | undefined;
  let sharedSong: SharedSongMessageData | undefined;
  const rawContent = m.contentPlain ?? m.content ?? "";
  let content = typeof rawContent === "string" ? decodeUnicodeEscapes(rawContent) : "";

  const sharedTypeRaw = m.sharedContentType ?? undefined;
  const sharedContent: SharedContentDTO | undefined = m.sharedContent ?? undefined;
  const normalizedSharedType = (() => {
    if (typeof sharedTypeRaw === "string" && sharedTypeRaw.length > 0) {
      return sharedTypeRaw.toUpperCase() as SharedContentType | "PLAYLIST" | "ALBUM" | "SONG";
    }
    const raw = (sharedContent as { type?: string | null })?.type ?? (sharedContent as { contentType?: string | null })?.contentType ?? null;
    if (typeof raw === "string" && raw.length) {
      return raw.toUpperCase() as SharedContentType | "PLAYLIST" | "ALBUM" | "SONG";
    }
    if (sharedContent && typeof sharedContent === "object") {
      if ((sharedContent as { playlist?: unknown }).playlist) return "PLAYLIST";
      if ((sharedContent as { album?: unknown }).album) return "ALBUM";
      if ((sharedContent as { song?: unknown }).song) return "SONG";
    }
    return undefined;
  })();

  if (normalizedSharedType === "PLAYLIST") {
    type = "playlist";
    const playlistDto: SharedPlaylistDTO | null = sharedContent?.playlist ?? null;
    sharedPlaylist = playlistDto
      ? {
          id: playlistDto.id ?? sharedContent?.id ?? undefined,
          name: playlistDto.name ?? sharedContent?.title ?? undefined,
          description: playlistDto.description ?? sharedContent?.description ?? null,
          coverUrl: playlistDto.coverUrl ?? sharedContent?.coverUrl ?? null,
          visibility: playlistDto.visibility ?? null,
          songLimit: playlistDto.songLimit ?? null,
          songs: Array.isArray(playlistDto.songs)
            ? playlistDto.songs.map((song) => ({
                id: song?.id,
                name: song?.name ?? "",
                artists: extractArtistNames(song?.artists),
                coverUrl: song?.urlImageAlbum ?? song?.coverUrl ?? sharedContent?.coverUrl ?? null,
                durationLabel: formatDurationLabel(song?.duration),
              }))
            : [],
          ownerName: undefined,
          totalSongs: Array.isArray(playlistDto.songs) ? playlistDto.songs.length : null,
        }
      : {
          id: sharedContent?.id ?? undefined,
          name: sharedContent?.title ?? undefined,
          description: sharedContent?.description ?? null,
          coverUrl: sharedContent?.coverUrl ?? null,
          visibility: null,
          songLimit: null,
          songs: [],
          ownerName: undefined,
          totalSongs: null,
        };

    const playlistIdValue = sharedPlaylist?.id;
    const playlistId =
      typeof playlistIdValue === "number" && Number.isFinite(playlistIdValue)
        ? playlistIdValue
        : undefined;
    if (playlistId != null) {
      playlistData = {
        id: playlistId,
        name: sharedPlaylist?.name || "Shared playlist",
        coverUrl: sharedPlaylist?.coverUrl ?? null,
        songCount: sharedPlaylist?.totalSongs ?? undefined,
      };
    }
  } else if (normalizedSharedType === "ALBUM") {
    type = "album";
    const albumDto: SharedAlbumDTO | null = sharedContent?.album ?? null;
    const releaseYear = (() => {
      if (albumDto?.releaseDate) {
        const year = new Date(albumDto.releaseDate).getFullYear();
        return Number.isFinite(year) ? year : undefined;
      }
      return undefined;
    })();
    sharedAlbum = {
      id: albumDto?.id ?? sharedContent?.id ?? undefined,
      name: albumDto?.name ?? sharedContent?.title ?? undefined,
      coverUrl: albumDto?.coverUrl ?? sharedContent?.coverUrl ?? null,
      artistName: albumDto?.artist?.name ?? null,
      releaseYear: releaseYear ?? undefined,
      releaseDateLabel: albumDto?.releaseDate ?? null,
    };
    const albumIdValue = sharedAlbum?.id;
    const albumId =
      typeof albumIdValue === "number" && Number.isFinite(albumIdValue)
        ? albumIdValue
        : undefined;
    if (albumId != null) {
      albumData = {
        id: albumId,
        name: sharedAlbum?.name || "Shared album",
        coverUrl: sharedAlbum?.coverUrl ?? null,
        artist: sharedAlbum?.artistName ?? undefined,
        releaseYear: sharedAlbum?.releaseYear ?? undefined,
      };
    }
  } else if (normalizedSharedType === "SONG") {
    type = "song";
    const songDto: SharedSongDTO | null = sharedContent?.song ?? null;
    const artists = extractArtistNames(songDto?.artists);
    sharedSong = {
      id: songDto?.id ?? sharedContent?.id ?? undefined,
      name: songDto?.name ?? songDto?.title ?? sharedContent?.title ?? undefined,
      artists,
      coverUrl: songDto?.urlImageAlbum ?? songDto?.coverUrl ?? sharedContent?.coverUrl ?? null,
      audioUrl: songDto?.audioUrl ?? null,
      durationLabel: formatDurationLabel(songDto?.duration),
    };
    const songIdValue = sharedSong?.id;
    const songId =
      typeof songIdValue === "number" && Number.isFinite(songIdValue)
        ? songIdValue
        : undefined;
    if (songId != null) {
      songData = {
        id: songId,
        title: sharedSong?.name || "Shared song",
        artist: artists.join(", ") || DEFAULT_ARTIST_NAME,
      };
    }
  }

  if (normalizedSharedType == null) {
    if (content.startsWith("SONG:")) {
      type = "song";
      try {
        const data = JSON.parse(content.slice(5));
        songData = { id: data.id, title: data.title, artist: data.artist };
      } catch {
        void 0;
      }
    } else if (content.startsWith("PLAYLIST_LINK:")) {
      type = "playlist";
      const url = content.slice(14);
      const playlistIdMatch = url.match(/\/playlist\/(\d+)/);
      if (playlistIdMatch) {
        const playlistId = Number(playlistIdMatch[1]);
        playlistData = { id: playlistId, name: "Loading...", coverUrl: null };
      }
      content = url;
    } else if (content.startsWith("ALBUM_LINK:")) {
      type = "album";
      const url = content.slice(11);
      const albumIdMatch = url.match(/\/album\/(\d+)/);
      if (albumIdMatch) {
        const albumId = Number(albumIdMatch[1]);
        albumData = { id: albumId, name: "Loading...", coverUrl: null };
      }
      content = url;
    } else if (content.startsWith("SONG_LINK:")) {
      content = content.slice(10);
    } else if (content.startsWith("COLLAB_INVITE:")) {
      try {
        const data = JSON.parse(content.slice(14));
        content = `Collab invite for playlist #${data.playlistId} (role: ${data.role})`;
      } catch {
        void 0;
      }
    }
  }

  if (!songData && sharedSong) {
    songData = {
      id: sharedSong.id,
      title: sharedSong.name || "Shared song",
      artist: sharedSong.artists.join(", ") || DEFAULT_ARTIST_NAME,
    };
  }
  if (!playlistData && sharedPlaylist && typeof sharedPlaylist.id === "number") {
    playlistData = {
      id: sharedPlaylist.id,
      name: sharedPlaylist.name || "Shared playlist",
      coverUrl: sharedPlaylist.coverUrl ?? null,
      songCount: sharedPlaylist.totalSongs ?? undefined,
      owner: sharedPlaylist.ownerName ?? undefined,
    };
  }
  if (!albumData && sharedAlbum && typeof sharedAlbum.id === "number") {
    albumData = {
      id: sharedAlbum.id,
      name: sharedAlbum.name || "Shared album",
      coverUrl: sharedAlbum.coverUrl ?? null,
      artist: sharedAlbum.artistName ?? undefined,
      releaseYear: sharedAlbum.releaseYear ?? undefined,
    };
  }

  const sender = ((): string => {
    try {
      const me = typeof window !== "undefined" ? Number(localStorage.getItem("userId")) : NaN;
      if (Number.isFinite(me) && m.senderId === me) return "You";
    } catch {
      void 0;
    }
    const f = friends?.find((x) => Number(x.id) === m.senderId);
    return f?.name || `User ${m.senderId}`;
  })();
  const sentAtMs = (() => {
    const raw = m.sentAt;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  })();
  const timestamp = new Date(sentAtMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // System messages từ backend: sharedContentType = TEXT và senderId = 0 hoặc content được đánh dấu đặc biệt
  // Ta map sang type = "system" để render khác trong UI.
  if (m.sharedContentType === "TEXT" && (m.senderId === 0 || m.senderId == null)) {
    type = "system";
  }

  return {
    id: resolvedId,
    backendId,
    sender,
    content,
    timestamp,
    sentAt: sentAtMs,
    type,
    songData,
    playlistData,
    albumData,
    sharedContentType: (normalizedSharedType as SharedContentType | undefined),
    sharedPlaylist,
    sharedAlbum,
    sharedSong,
  };
}

