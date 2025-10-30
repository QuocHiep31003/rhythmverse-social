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

