import { ref, onValue, off, set, getDatabase } from 'firebase/database';
import { firebaseDb } from '@/config/firebase-config';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  lastSeen: number;
  isActive: boolean;
}

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
  devices?: Record<string, DeviceInfo>; // Map of deviceId -> DeviceInfo
}

/**
 * Watch playback state for a user (real-time sync)
 */
export const watchPlaybackState = (
  userId: number,
  callback: (state: PlaybackState | null) => void
): (() => void) => {
  const playbackRef = ref(firebaseDb, `playback/${userId}`);
  
  console.log('[Firebase Playback] 🔥 Setting up listener for user:', userId, 'path: playback/' + userId);
  
  const unsubscribe = onValue(playbackRef, (snapshot) => {
    const data = snapshot.val();
    console.log('[Firebase Playback] 📥 Data received from Firebase:', {
      hasData: !!data,
      songId: data?.currentSongId,
      isPlaying: data?.isPlaying,
      queueLength: data?.queue?.length || 0,
      timestamp: data?.timestamp
    });
    
    if (data) {
      callback(data as PlaybackState);
    } else {
      console.warn('[Firebase Playback] ⚠️ No data in Firebase snapshot - path may not exist or empty');
      callback(null);
    }
  }, (error) => {
    console.error('[Firebase Playback] ❌ Error watching playback state:', error);
    console.error('[Firebase Playback]   Error code:', error.code);
    console.error('[Firebase Playback]   Error message:', error.message);
    console.error('[Firebase Playback]   Firebase path: playback/' + userId);
    callback(null);
  });
  
  // Log khi listener được setup
  console.log('[Firebase Playback] ✅ Listener setup completed for user:', userId);
  
  return () => {
    console.log('[Firebase Playback] 🛑 Removing listener for user:', userId);
    off(playbackRef);
    unsubscribe();
  };
};

/**
 * Update playback state in Firebase (called by backend after Redis update)
 * NOTE: FE không được phép write vào Firebase (Rules: .write: false)
 * Backend sẽ tự update Firebase, function này chỉ để reference
 * @deprecated FE không nên gọi function này, backend sẽ tự update
 */
export const updatePlaybackState = async (userId: number, state: PlaybackState): Promise<void> => {
  // FE không được phép write vào Firebase (Firebase Rules chặn)
  // Backend sẽ tự update Firebase sau khi update Redis
  console.log('[Firebase Playback] FE không được phép write vào Firebase, backend sẽ tự update');
  return;
};

/**
 * Get current playback state (one-time read)
 */
export const getPlaybackState = async (userId: number): Promise<PlaybackState | null> => {
  try {
    const playbackRef = ref(firebaseDb, `playback/${userId}`);
    const snapshot = await import('firebase/database').then(m => m.get(playbackRef));
    return snapshot.val() as PlaybackState | null;
  } catch (error) {
    console.error('[Firebase Playback] Error getting playback state:', error);
    return null;
  }
};

