import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const DEFAULT_AVATAR_URL = "https://tse4.mm.bing.net/th/id/OIP.5Xw-6Hc_loqdGyqQG6G2IgHaEr?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = DEFAULT_AVATAR_URL;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}

// Normalize duration value that may come as seconds, milliseconds, or string
export function toSeconds(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Handle mm:ss format
    if (trimmed.includes(":")) {
      const [mStr, sStr] = trimmed.split(":");
      const m = parseInt(mStr || "0", 10);
      const s = parseInt(sStr || "0", 10);
      if (Number.isFinite(m) && Number.isFinite(s)) {
        return Math.max(0, m * 60 + s);
      }
    }
    const n = parseInt(trimmed, 10);
    if (Number.isFinite(n)) {
      return n > 10000 ? Math.round(n / 1000) : Math.max(0, Math.round(n));
    }
    return 0;
  }
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return 0;
  // Heuristic: if value looks like milliseconds (> 10,000 ≈ 10s) convert to seconds
  return n > 10000 ? Math.round(n / 1000) : Math.max(0, Math.round(n));
}

export function formatDuration(raw: unknown): string {
  const total = toSeconds(raw);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Helper để map từ API Song (từ BE) sang MusicContext.Song format
// Đảm bảo nhất quán trong toàn bộ app
export interface ApiSong {
  id?: string | number;
  songId?: string | number;
  name?: string;
  songName?: string;
  title?: string;
  artist?: string;
  artists?: Array<{ id?: number; name: string }> | string;
  album?: string | { name?: string };
  albumName?: string;
  albumCoverImg?: string; // Field chính thức cho ảnh album từ BE
  albumImageUrl?: string;
  urlImageAlbum?: string;
  cover?: string;
  duration?: string | number;
  audioUrl?: string;
  audio?: string;
  url?: string;
  [key: string]: any; // Allow extra fields
}

export interface PlayerSong {
  id: string;
  songName?: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  genre?: string;
  plays?: string;
  url?: string;
  audio?: string;
  audioUrl?: string;
  uuid?: string; // UUID để stream HLS
}

export function mapToPlayerSong(song: ApiSong): PlayerSong {
  // ID: ưu tiên id, nếu không có thì dùng songId
  const id = String(song.id ?? song.songId ?? "");

  // Song name: ưu tiên songName, sau đó name, title, cuối cùng "Unknown"
  const songName = song.songName ?? song.name ?? song.title ?? "Unknown";

  // Artist: từ artists array hoặc artist string
  let artist = "Unknown";
  if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
    artist = song.artists.map((a) => a.name).filter(Boolean).join(", ");
  } else if (typeof song.artists === "string" && song.artists.trim().length > 0) {
    artist = song.artists.trim();
  } else if (song.artist && typeof song.artist === "string") {
    artist = song.artist;
  }

  // Album: từ album object hoặc string, hoặc albumName
  let album = "Unknown";
  if (typeof song.album === "string") {
    album = song.album;
  } else if (song.album && typeof song.album === "object" && song.album.name) {
    album = song.album.name;
  } else if (song.albumName) {
    album = song.albumName;
  }

  // Duration: convert sang số giây
  const duration = toSeconds(song.duration);

  // Cover: ưu tiên albumCoverImg (field chính thức), sau đó urlImageAlbum, albumImageUrl, cuối cùng cover
  const cover = song.albumCoverImg ?? song.urlImageAlbum ?? song.albumImageUrl ?? song.cover ?? "";

  // Audio URL: ưu tiên audioUrl, sau đó audio, cuối cùng url
  const audioUrl = song.audioUrl ?? song.audio ?? song.url ?? "";

  return {
    id,
    songName,
    artist,
    album,
    duration,
    cover,
    audioUrl,
    audio: song.audio ?? audioUrl,
    url: song.url ?? audioUrl,
    uuid: song.uuid, // Map UUID từ Song để dùng cho streaming
  };
}