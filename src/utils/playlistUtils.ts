import { Song } from "@/contexts/MusicContext";
import type { SearchSongResult } from "@/types/playlistDetail";

export function toSeconds(input: unknown): number {
  try {
    if (typeof input === 'number' && Number.isFinite(input)) return input > 10000 ? Math.round(input/1000) : Math.round(input);
    if (typeof input === 'string') {
      const t = input.trim(); if (!t) return 0;
      if (t.includes(':')) {
        const parts = t.split(':').map(Number);
        if (parts.every(Number.isFinite)) {
          if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
          if (parts.length === 2) return parts[0]*60 + parts[1];
        }
      }
      const n = Number(t); if (Number.isFinite(n)) return n > 10000 ? Math.round(n/1000) : Math.round(n);
    }
  } catch {
    void 0;
  }
  return 0;
}

export const msToMMSS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s/60).toString().padStart(2,'0');
  const ss = Math.floor(s%60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
};

export const formatTotal = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const isValidImageValue = (value?: string | null): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (['string', 'null', 'undefined', 'na', 'n/a', 'none', 'placeholder', '{}', '[]'].includes(lower)) {
    return false;
  }
  return /^https?:\/\//.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:image') || trimmed.startsWith('blob:');
};

export const resolveSongCover = (
  song: SearchSongResult & { songId?: number; cover?: string | null; artwork?: string | null; thumbUrl?: string | null; albumArtUrl?: string | null },
): string => {
  // Chỉ dùng ảnh từ API như ban đầu, không thêm logic phức tạp
  if (isValidImageValue(song.urlImageAlbum)) return song.urlImageAlbum;
  if (isValidImageValue(song.cover)) return song.cover;
  return '';
};

export const mapSongsFromResponse = (
  songsRaw: unknown,
): (Song & { addedBy?: string; addedAt?: string; addedById?: number; addedByAvatar?: string | null })[] => {
  if (!Array.isArray(songsRaw)) return [];
  return songsRaw
    .map((raw) => {
      const song = raw as SearchSongResult & { 
        songId?: number; 
        addedByUser?: { 
          id?: number; 
          name?: string | null; 
          avatar?: string | null;
        } | null; 
        creator?: { name?: string | null } | null;
      };
      const rawId = typeof song.id === 'number' ? song.id : typeof song.songId === 'number' ? song.songId : undefined;
      if (rawId == null) return undefined;
      
      // Xử lý artist rõ ràng, tránh lỗi cú pháp từ chuỗi lồng nhiều điều kiện
      const artistsArray =
        Array.isArray(song.artists) && song.artists.length > 0
          ? song.artists
              .map((a) => {
                if (typeof a === "string") return a.trim();
                if (a && typeof a === "object" && "name" in a && typeof (a as { name?: unknown }).name === "string") {
                  return ((a as { name?: string }).name || "").trim();
                }
                return null;
              })
              .filter((name): name is string => !!name && name.length > 0)
          : [];
      const artistFromArray = artistsArray.join(", ");
      const artistFromString =
        typeof (song.artists as unknown) === "string" && (song.artists as unknown as string).trim().length > 0
          ? (song.artists as unknown as string).trim()
          : "";
      const artistField = (song as { artist?: unknown }).artist;
      const artistFromField = typeof artistField === "string" && artistField.trim().length > 0 ? artistField.trim() : "";
      const artist = artistFromArray || artistFromString || artistFromField || "Unknown";
      const addedAt =
        song.addedAt ??
        song.added_at ??
        song.addedDate ??
        song.updatedAt ??
        song.createdAt ??
        song.created_at ??
        null;
      const addedBy =
        song.addedBy ??
        song.addedByName ??
        song.addedByUserName ??
        song.createdByName ??
        (song.addedByUser && song.addedByUser.name) ??
        (song as { addedByDisplayName?: string | null }).addedByDisplayName ??
        (song as { addedByUsername?: string | null }).addedByUsername ??
        (song as { creatorName?: string | null }).creatorName ??
        (song as { creator?: { name?: string | null } }).creator?.name ??
        undefined;
      const addedById =
        (song as { addedById?: number }).addedById ??
        (song as { addedByUserId?: number }).addedByUserId ??
        song.addedByUser?.id ??
        (song as { creatorId?: number }).creatorId ??
        (song as { creator?: { id?: number } }).creator?.id ??
        undefined;
      const addedByAvatar =
        (song as { addedByAvatar?: string | null }).addedByAvatar ??
        song.addedByUser?.avatar ??
        (song as { creatorAvatar?: string | null }).creatorAvatar ??
        (song as { creator?: { avatar?: string | null } }).creator?.avatar ??
        null;
      return {
        id: String(rawId),
        title: song.name ?? (song as { title?: string }).title ?? 'Untitled',
        songName: song.name ?? (song as { title?: string }).title ?? 'Untitled',
        artist: artist,
        album: song.album?.name ?? (song as { albumName?: string }).albumName ?? '',
        cover: resolveSongCover(song),
        audioUrl: song.audioUrl ?? (song as { audio?: string }).audio ?? '',
        duration: toSeconds(song.duration),
        addedAt: addedAt ?? undefined,
        addedBy: addedBy ?? undefined,
        addedById: addedById ?? undefined,
        addedByAvatar: addedByAvatar ?? null,
      };
    })
    .filter((item) => Boolean(item)) as (Song & { title?: string; addedBy?: string; addedAt?: string; addedById?: number; addedByAvatar?: string | null })[];
};

export const formatDateDisplay = (value?: string) => {
  if (!value) return undefined;
  try {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch {
    void 0;
  }
  return value;
};

export const parseDateSafe = (value?: string | null): Date | null => {
  try {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) return direct;
    const normalized = trimmed.replace(' ', 'T');
    const normalizedDate = new Date(normalized);
    if (!Number.isNaN(normalizedDate.getTime())) return normalizedDate;
    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
    if (!hasTimezone) {
      const withZ = new Date(`${normalized}Z`);
      if (!Number.isNaN(withZ.getTime())) return withZ;
    }
  } catch { void 0; }
  return null;
};

// Tạo slug từ tên (dùng cho URL friendly)
export const createSlug = (name: string, id?: string | number): string => {
  if (!name) return id ? String(id) : '';
  
  // Chuyển thành lowercase, replace spaces và special chars với dash
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  
  // Nếu có ID, append vào cuối để backward compatible
  if (id) {
    return `${slug}-${id}`;
  }
  
  return slug || 'untitled';
};

// Parse slug từ URL - trả về { slug, id } hoặc null nếu không parse được
export const parseSlug = (slugFromUrl: string): { slug: string; id?: number } => {
  if (!slugFromUrl) return { slug: '' };
  
  // Nếu là số thuần túy (backward compatible với ID cũ)
  const numericId = Number(slugFromUrl);
  if (!isNaN(numericId) && isFinite(numericId)) {
    return { slug: slugFromUrl, id: numericId };
  }
  
  // Format: name-slug-id hoặc chỉ name-slug
  const parts = slugFromUrl.split('-');
  const lastPart = parts[parts.length - 1];
  const possibleId = Number(lastPart);
  
  // Nếu phần cuối là số, đó là ID
  if (!isNaN(possibleId) && isFinite(possibleId)) {
    const slug = parts.slice(0, -1).join('-');
    return { slug: slug || slugFromUrl, id: possibleId };
  }
  
  // Nếu không có ID trong URL, chỉ có slug
  return { slug: slugFromUrl };
};
