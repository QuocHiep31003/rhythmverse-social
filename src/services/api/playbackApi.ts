import { API_BASE_URL, buildJsonHeaders, fetchWithAuth } from './config';
import type { PlaybackState } from '@/services/firebase/playback';

export interface PlaySongRequest {
  deviceId: string;
  songId: number;
}

export interface SetQueueRequest {
  deviceId: string;
  songIds: number[];
}

export interface AddToQueueRequest {
  deviceId: string;
  songId: number;
}

export const playbackApi = {
  /**
   * Get current playback state
   */
  getState: async (): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/state`, {
      method: 'GET',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get playback state: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Request playback control (become owner)
   */
  requestControl: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/request-control?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to request control: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Play a song
   */
  playSong: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/play`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ deviceId, songId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to play song: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Toggle play/pause
   */
  togglePlay: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/toggle?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to toggle play: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Play next song
   */
  playNext: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/next?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to play next: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Play previous song
   */
  playPrevious: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/previous?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to play previous: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Set queue
   */
  setQueue: async (deviceId: string, songIds: number[]): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/queue`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ deviceId, songIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set queue: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Add song to queue
   */
  addToQueue: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/queue/add`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ deviceId, songId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add to queue: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Remove song from queue
   */
  removeFromQueue: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/queue/${songId}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove from queue: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Set shuffle mode
   */
  setShuffle: async (deviceId: string, shuffled: boolean): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/shuffle?deviceId=${encodeURIComponent(deviceId)}&shuffled=${shuffled}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set shuffle: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Set repeat mode
   */
  setRepeat: async (deviceId: string, mode: 'off' | 'one' | 'all'): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/repeat?deviceId=${encodeURIComponent(deviceId)}&mode=${mode}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set repeat: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Update playback position (for seek and real-time sync)
   */
  updatePosition: async (deviceId: string, position: number): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/position?deviceId=${encodeURIComponent(deviceId)}&position=${position}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update position: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Update song duration (called from active device when audio duration is loaded from HLS)
   */
  updateDuration: async (deviceId: string, duration: number): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/duration?deviceId=${encodeURIComponent(deviceId)}&duration=${duration}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update duration: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Register a device (when music player is opened)
   */
  registerDevice: async (deviceId: string, deviceName?: string): Promise<PlaybackState> => {
    const url = deviceName 
      ? `${API_BASE_URL}/playback/devices/register?deviceId=${encodeURIComponent(deviceId)}&deviceName=${encodeURIComponent(deviceName)}`
      : `${API_BASE_URL}/playback/devices/register?deviceId=${encodeURIComponent(deviceId)}`;
    
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register device: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Unregister a device (when music player is closed)
   */
  unregisterDevice: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/devices/unregister?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to unregister device: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Select output device (switch active device)
   */
  selectOutputDevice: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/devices/select-output?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to select output device: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Update device heartbeat (keep device alive)
   */
  updateDeviceHeartbeat: async (deviceId: string): Promise<PlaybackState> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/playback/devices/heartbeat?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: buildJsonHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update device heartbeat: ${response.status}`);
    }
    
    return response.json();
  },
};

