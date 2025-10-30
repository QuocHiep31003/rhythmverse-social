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
    artists: SimpleDTO[];
    genres: SimpleDTO[];
    snapshotCreatedAt: string; // ISO date string
}

export const getTrendingComparison = async (limit = 10): Promise<TrendingSong[]> => {
    const response = await api.get<TrendingSong[]>('/trending/comparison', {
        params: { limit },
    });
    return response.data;
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



