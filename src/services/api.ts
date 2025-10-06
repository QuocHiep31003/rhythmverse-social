import { mockSongs, mockUsers, mockPlaylists, mockAlbums, mockArtists, mockGenres } from "@/data/mockData";

const API_BASE_URL = "http://localhost:8080/api";

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Users API
export const usersApi = {
  getAll: async () => {
    await delay(300);
    return mockUsers;
  },
  
  getById: async (id: string) => {
    await delay(200);
    return mockUsers.find(u => u.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/users
    return { id: Date.now().toString(), ...data };
  },
  
  update: async (id: string, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/users/${id}
    return { id, ...data };
  },
  
  delete: async (id: string) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/users/${id}
    return { success: true };
  },
};

// Songs API
export const songsApi = {
  getAll: async () => {
    await delay(300);
    return mockSongs;
  },
  
  getById: async (id: string) => {
    await delay(200);
    return mockSongs.find(s => s.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/songs
    return { id: Date.now().toString(), ...data, plays: 0 };
  },
  
  update: async (id: string, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/songs/${id}
    return { id, ...data };
  },
  
  delete: async (id: string) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/songs/${id}
    return { success: true };
  },
};

// Playlists API
export const playlistsApi = {
  getAll: async () => {
    await delay(300);
    return mockPlaylists;
  },
  
  getById: async (id: string) => {
    await delay(200);
    return mockPlaylists.find(p => p.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/playlists
    return { id: Date.now().toString(), ...data, songs: [] };
  },
  
  update: async (id: string, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/playlists/${id}
    return { id, ...data };
  },
  
  delete: async (id: string) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/playlists/${id}
    return { success: true };
  },
};

// Albums API
export const albumsApi = {
  getAll: async () => {
    await delay(300);
    return mockAlbums;
  },
  
  getById: async (id: string) => {
    await delay(200);
    return mockAlbums.find(a => a.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/albums
    return { id: Date.now().toString(), ...data };
  },
  
  update: async (id: string, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/albums/${id}
    return { id, ...data };
  },
  
  delete: async (id: string) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/albums/${id}
    return { success: true };
  },
};

// Artists API
export const artistsApi = {
  getAll: async () => {
    await delay(300);
    return mockArtists;
  },
  
  getById: async (id: number) => {
    await delay(200);
    return mockArtists.find(a => a.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/artists
    return { id: Date.now(), ...data };
  },
  
  update: async (id: number, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/artists/${id}
    return { id, ...data };
  },
  
  delete: async (id: number) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/artists/${id}
    return { success: true };
  },
  
  getCount: async () => {
    await delay(200);
    // TODO: Call GET ${API_BASE_URL}/artists/count
    return mockArtists.length;
  },
};

// Genres API
export const genresApi = {
  getAll: async () => {
    await delay(300);
    return mockGenres;
  },
  
  getById: async (id: number) => {
    await delay(200);
    return mockGenres.find(g => g.id === id);
  },
  
  create: async (data: any) => {
    await delay(500);
    // TODO: Call POST ${API_BASE_URL}/genres
    return { id: Date.now(), ...data };
  },
  
  update: async (id: number, data: any) => {
    await delay(500);
    // TODO: Call PUT ${API_BASE_URL}/genres/${id}
    return { id, ...data };
  },
  
  delete: async (id: number) => {
    await delay(500);
    // TODO: Call DELETE ${API_BASE_URL}/genres/${id}
    return { success: true };
  },
  
  getCount: async () => {
    await delay(200);
    // TODO: Call GET ${API_BASE_URL}/genres/count
    return mockGenres.length;
  },
};

// Stats API
export const statsApi = {
  getDashboard: async () => {
    await delay(300);
    return {
      totalUsers: mockUsers.length,
      totalSongs: mockSongs.length,
      totalPlaylists: mockPlaylists.length,
      totalAlbums: mockAlbums.length,
      totalArtists: mockArtists.length,
      totalGenres: mockGenres.length,
      totalPlays: mockSongs.reduce((acc, song) => acc + parseInt(song.plays.replace(/[^\d]/g, '')), 0),
    };
  },
};
