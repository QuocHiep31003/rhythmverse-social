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
