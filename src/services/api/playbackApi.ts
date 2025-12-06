import { apiClient } from './config';

export interface PlaybackState {
  userId: number;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  currentSongId: number | null;
  isPlaying: boolean;
  queue: number[];
  isShuffled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  position: number; // Current playback position in milliseconds
  duration: number; // Song duration in milliseconds
  timestamp: number;
  devices?: Record<string, { deviceId: string; deviceName: string; lastSeen: number; isActive: boolean }>;
}

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
    const response = await apiClient.get<PlaybackState>('/playback/state');
    return response.data;
  },

  /**
   * Request playback control (become owner)
   */
  requestControl: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/request-control?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Play a song
   */
  playSong: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>('/playback/play', { deviceId, songId });
    return response.data;
  },

  /**
   * Toggle play/pause
   */
  togglePlay: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/toggle?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Play next song
   */
  playNext: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/next?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Play previous song
   */
  playPrevious: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/previous?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Set queue
   */
  setQueue: async (deviceId: string, songIds: number[]): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>('/playback/queue', { deviceId, songIds });
    return response.data;
  },

  /**
   * Add song to queue
   */
  addToQueue: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>('/playback/queue/add', { deviceId, songId });
    return response.data;
  },

  /**
   * Remove song from queue
   */
  removeFromQueue: async (deviceId: string, songId: number): Promise<PlaybackState> => {
    const response = await apiClient.delete<PlaybackState>(`/playback/queue/${songId}?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Set shuffle mode
   */
  setShuffle: async (deviceId: string, shuffled: boolean): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/shuffle?deviceId=${encodeURIComponent(deviceId)}&shuffled=${shuffled}`);
    return response.data;
  },

  /**
   * Set repeat mode
   */
  setRepeat: async (deviceId: string, mode: 'off' | 'one' | 'all'): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/repeat?deviceId=${encodeURIComponent(deviceId)}&mode=${mode}`);
    return response.data;
  },

  /**
   * Update playback position (for seek and real-time sync)
   */
  updatePosition: async (deviceId: string, position: number): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/position?deviceId=${encodeURIComponent(deviceId)}&position=${position}`);
    return response.data;
  },

  /**
   * Update song duration (called from active device when audio duration is loaded from HLS)
   */
  updateDuration: async (deviceId: string, duration: number): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/duration?deviceId=${encodeURIComponent(deviceId)}&duration=${duration}`);
    return response.data;
  },

  /**
   * Register a device (when music player is opened)
   */
  registerDevice: async (deviceId: string, deviceName?: string): Promise<PlaybackState> => {
    const url = deviceName 
      ? `/playback/devices/register?deviceId=${encodeURIComponent(deviceId)}&deviceName=${encodeURIComponent(deviceName)}`
      : `/playback/devices/register?deviceId=${encodeURIComponent(deviceId)}`;
    
    const response = await apiClient.post<PlaybackState>(url);
    return response.data;
  },

  /**
   * Unregister a device (when music player is closed)
   */
  unregisterDevice: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/devices/unregister?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Select output device (switch active device)
   */
  selectOutputDevice: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/devices/select-output?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  /**
   * Update device heartbeat (keep device alive)
   */
  updateDeviceHeartbeat: async (deviceId: string): Promise<PlaybackState> => {
    const response = await apiClient.post<PlaybackState>(`/playback/devices/heartbeat?deviceId=${encodeURIComponent(deviceId)}`);
    return response.data;
  },
};

