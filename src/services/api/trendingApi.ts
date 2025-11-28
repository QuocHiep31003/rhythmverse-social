import { api } from '../api';
import { PagedResult } from './config';

export interface SimpleDTO {
    id: number;
    name: string;
}

export enum TrendStatus {
    RISING = 'RISING',
    FALLING = 'FALLING',
    NEW = 'NEW',
    HOT_TODAY = 'HOT_TODAY',
    SAME = 'SAME',
}

export interface TrendingSong {
    songId: number;
    songName: string;
    rank: number;
    previousRank: number;
    trendStatus: TrendStatus;
    score: number;
    audioUrl: string;
    releaseYear: number;
    playCount: number;
    duration: string;
    albumImageUrl: string;
    artists: string
    genres: SimpleDTO[];
    snapshotCreatedAt: string; // ISO date string
}

export interface ResultDetailDTO {
    songId: number;
    songName: string;
    albumImageUrl?: string;
    artists?: string;
    rank?: number;
    totalPoints?: number;
    oldRank?: number;
    uuid?: string;
    id?: number;
    name?: string;
}

export const getTrendingComparison = async (limit = 10): Promise<TrendingSong[]> => {
    const response = await api.get<any>('/trending/comparison', {
        params: { limit },
    });
    const data = response.data;
    if (Array.isArray(data)) return data as TrendingSong[];
    // Some backends may return an object like { labels: [], lines: [] }
    // Normalize to an empty list to keep UI stable
    if (Array.isArray(data?.content)) return data.content as TrendingSong[];
    return [] as TrendingSong[];
};

export const getLatestTrending = async (limit = 10): Promise<TrendingSong[]> => {
    const response = await api.get<TrendingSong[]>('/trending', {
        params: { limit },
    });
    return response.data;
};

// Call Top 100 trending for admin page
export const fetchTop100Trending = async () => {
    const response = await api.get<TrendingSong[]>("/trending/top-100", {
        params: { size: 100, page: 0 },
    });
    return response.data;
};

// Call hot-today BXH, truyền tham số top (số lượng bài mong muốn)
export const callHotTodayTrending = async (top: number = 100) => {
    const response = await api.get<ResultDetailDTO[]>(`/trending/hot-today`, {
        params: { top },
    });
    return response.data;
};



