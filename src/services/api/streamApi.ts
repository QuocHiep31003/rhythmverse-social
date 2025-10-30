import { apiClient, API_BASE_URL } from './config';

export const streamApi = {
    createSession: async (songId: number | string): Promise<{ playbackUrl: string; expiresIn: number }> => {
        const res = await apiClient.post(`/stream/${songId}/session`);
        const data = res.data as { playbackUrl: string; expiresIn: number };
        const toAbsolute = (u: string) => {
            if (u.startsWith('http')) return u;
            // Normalize to avoid double /api if API_BASE_URL already includes /api
            const base = API_BASE_URL.replace(/\/?$/, '');
            if (u.startsWith('/api/')) {
                // If base already ends with /api, drop it once
                if (base.endsWith('/api')) {
                    return `${base.slice(0, -4)}${u}`; // remove trailing '/api'
                }
            }
            return `${base}${u}`;
        };
        return { playbackUrl: toAbsolute(data.playbackUrl), expiresIn: data.expiresIn };
    },
};


