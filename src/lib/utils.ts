import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const DEFAULT_AVATAR_URL = "https://res-console.cloudinary.com/dhylbhwvb/thumbnails/v1/image/upload/v1759805930/eG5vYjR5cHBjbGhzY2VrY3NzNWU";

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
