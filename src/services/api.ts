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
    try {
      const response = await fetch(`${API_BASE_URL}/songs`);
      const data = await response.json();
      return data.content || [];
    } catch (error) {
      console.error("Error fetching songs:", error);
      return mockSongs;
    }
  },
  
  getById: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching song:", error);
      return mockSongs.find(s => s.id === id);
    }
  },
  
  create: async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating song:", error);
      throw error;
    }
  },
  
  update: async (id: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating song:", error);
      throw error;
    }
  },
  
  delete: async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting song:", error);
      throw error;
    }
  },
  
  getCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/count`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching songs count:", error);
      return mockSongs.length;
    }
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
    try {
      const response = await fetch(`${API_BASE_URL}/artists`);
      const data = await response.json();
      return data.content || [];
    } catch (error) {
      console.error("Error fetching artists:", error);
      return mockArtists;
    }
  },
  
  getById: async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching artist:", error);
      return mockArtists.find(a => a.id === id);
    }
  },
  
  create: async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating artist:", error);
      throw error;
    }
  },
  
  update: async (id: number, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating artist:", error);
      throw error;
    }
  },
  
  delete: async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting artist:", error);
      throw error;
    }
  },
  
  getCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/artists/count`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching artists count:", error);
      return mockArtists.length;
    }
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
