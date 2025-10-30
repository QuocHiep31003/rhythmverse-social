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