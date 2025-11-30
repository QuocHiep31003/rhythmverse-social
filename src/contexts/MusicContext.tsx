import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { mapToPlayerSong, type ApiSong } from "@/lib/utils";
import { getAuthToken, decodeToken, getRefreshToken, setTokens, clearTokens } from "@/services/api/config";
import { songsApi } from "@/services/api/songApi";

export interface Song {
  id: string;
  name?: string;
  title?: string;
  songName?: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  genre?: string;
  plays?: string;
  url?: string;
  audio?: string;
  audioUrl?: string;
  uuid?: string;
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  isShuffled: boolean;
  repeatMode: "off" | "one" | "all";
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  currentDeviceId: string; // Device ID của tab/device hiện tại
  position: number; // Current playback position in milliseconds
  duration: number; // Song duration in milliseconds
  setDuration: (duration: number) => void;
  isAuthenticated: boolean;
  playSong: (song: Song, skipApiCall?: boolean) => Promise<void>;
  togglePlay: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  addToQueue: (song: Song) => Promise<void>;
  setQueue: (songs: Song[]) => Promise<void>;
  removeFromQueue: (songId: string | number) => Promise<void>;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  toggleShuffle: () => Promise<void>;
  setRepeatMode: (mode: "off" | "one" | "all") => Promise<void>;
  updatePosition: (position: number) => Promise<void>;
  updateDuration: (duration: number) => Promise<void>;
  resetPlayer: () => void;
  requestPlaybackControl: () => Promise<boolean>;
  devices: Record<string, { deviceId: string; deviceName: string; lastSeen: number; isActive: boolean }>; // Map of deviceId -> DeviceInfo
  selectOutputDevice: (deviceId: string) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

type SongInput = Song | (Song & ApiSong) | (ApiSong & Record<string, unknown>);

const normalizeSong = (song: SongInput): Song => {
  const songData = song as ApiSong & Partial<Song>;
  const mapped = mapToPlayerSong(songData);
  const fallbackName = songData.songName ?? songData.name ?? songData.title ?? mapped.songName ?? "Unknown Song";
  const normalizedId = mapped.id || String(songData.id ?? songData.songId ?? "");
  return {
    ...song,
    ...mapped,
    id: normalizedId,
    name: songData.name ?? fallbackName,
    songName: fallbackName,
    artist: mapped.artist,
    album: mapped.album,
    duration: mapped.duration,
    cover: mapped.cover,
    audioUrl: mapped.audioUrl,
    audio: mapped.audio,
    url: mapped.url,
    uuid: mapped.uuid ?? song.uuid,
  };
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<"off" | "one" | "all">("off");
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [activeDeviceName, setActiveDeviceName] = useState<string | null>(null);
  const [position, setPosition] = useState<number>(0); // Position in milliseconds
  const [duration, setDuration] = useState<number>(0); // Duration in milliseconds
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devices, setDevices] = useState<Record<string, { deviceId: string; deviceName: string; lastSeen: number; isActive: boolean }>>({});
  
  const deviceIdRef = useRef<string>(`device-${Date.now()}-${Math.random()}`);
  const userIdRef = useRef<number | null>(null);
  const waitingForTokenRef = useRef<boolean>(false); // Track if we're waiting for token from another tab
  const queueSongMapRef = useRef<Map<number, Song>>(new Map()); // Cache song data by ID
  const checkingAuthRef = useRef<Promise<boolean> | null>(null); // Cache để tránh gọi đồng thời
  
  // Get userId from token or storage
  const getUserId = useCallback((): number | null => {
    // Thử lấy từ token trước
    const token = getAuthToken();
    if (token) {
    const decoded = decodeToken(token);
      if (decoded && decoded.sub) {
    try {
      const userId = parseInt(decoded.sub, 10);
          if (!isNaN(userId)) return userId;
    } catch {
          // Ignore
        }
      }
    }
    
    // Nếu không lấy được từ token, thử lấy từ localStorage (fallback) - DÙNG localStorage để chia sẻ giữa các tab
    try {
      if (typeof window !== 'undefined') {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          const userId = parseInt(storedUserId, 10);
          if (!isNaN(userId)) return userId;
        }
      }
    } catch {
      // Ignore
    }
    
      return null;
  }, []);
  
  // Check authentication status with retry logic
  const checkAuth = useCallback(async (retryCount: number = 0): Promise<boolean> => {
    // Nếu đang có một lần check đang chạy, đợi kết quả của nó
    if (checkingAuthRef.current && retryCount === 0) {
      return checkingAuthRef.current;
    }
    
    const MAX_RETRIES = 5; // Tăng số lần retry lên 5
    const RETRY_DELAYS = [200, 300, 400, 500, 600]; // Tăng delay đáng kể
    
    // Tạo promise cho lần check này (chỉ cho lần đầu)
    const authPromise = (async () => {
      // Wait a bit for token to be saved to sessionStorage (especially after login)
      if (retryCount > 0 && retryCount <= MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount - 1] || 600;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Tăng delay lần đầu lên 100ms
    }
    
      // Kiểm tra token nhiều lần để đảm bảo đọc được từ sessionStorage
      let token = getAuthToken();
      
      // Nếu không có token, thử đọc lại ngay lập tức (có thể sessionStorage chưa sync)
      if (!token && retryCount === 0) {
        // Force read lại từ sessionStorage
        await new Promise(resolve => setTimeout(resolve, 50));
        token = getAuthToken();
      }
    
    // Check if token exists and is not expired
    if (token) {
      // Check if token is expired (not just expiring soon)
      const decoded = decodeToken(token);
        if (!decoded) {
          console.warn('[MusicContext] Token exists but cannot be decoded');
          // Nếu không decode được nhưng có token, vẫn cho phép (có thể là vấn đề format)
          // Nhưng sẽ thử refresh nếu có refresh token
          const refreshToken = getRefreshToken();
          if (refreshToken && retryCount === 0) {
            try {
              const { authApi } = await import('@/services/api');
              const response = await authApi.refreshToken(refreshToken);
              if (response.token) {
                setTokens(response.token, response.refreshToken || refreshToken);
                checkingAuthRef.current = null;
                return checkAuth(1);
              }
            } catch (error) {
              console.warn('[MusicContext] Failed to refresh token:', error);
            }
          }
          // Nếu không refresh được, vẫn cho phép nếu có token (có thể backend sẽ validate)
          const userId = getUserId();
          userIdRef.current = userId;
          setIsAuthenticated(true);
          checkingAuthRef.current = null;
          return true;
        }
        
      if (decoded && decoded.exp) {
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        const isExpired = expirationTime <= currentTime;
        
        if (isExpired) {
          // Token is expired, try to refresh if we have refresh token
          const refreshToken = getRefreshToken();
          if (refreshToken && retryCount === 0) {
            // Try to refresh token once
            try {
              const { authApi } = await import('@/services/api');
              const response = await authApi.refreshToken(refreshToken);
              if (response.token) {
                setTokens(response.token, response.refreshToken || refreshToken);
                  // Retry check with new token (không cache cho retry)
                  checkingAuthRef.current = null;
                return checkAuth(1);
              }
            } catch (error) {
              console.warn('[MusicContext] Failed to refresh token:', error);
            }
          }
          // Token expired and refresh failed
          setIsAuthenticated(false);
          userIdRef.current = null;
            checkingAuthRef.current = null;
          return false;
        }
      }
      
        // Token exists and is valid (hoặc không có exp field - cho phép backend validate)
      const userId = getUserId();
        // Nếu không lấy được userId từ token, vẫn cho phép (có thể backend sẽ validate)
      userIdRef.current = userId;
      setIsAuthenticated(true);
        checkingAuthRef.current = null;
        console.log('[MusicContext] Authentication successful', { hasUserId: !!userId, hasToken: !!token });
      return true;
    } else {
        // No token - retry multiple times if token might still be saving (after login)
        if (retryCount < MAX_RETRIES) {
          console.log(`[MusicContext] No token found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          return checkAuth(retryCount + 1);
        }
        
        // After all retries, still no token
      userIdRef.current = null;
      setIsAuthenticated(false);
        checkingAuthRef.current = null;
        return false;
      }
    })();
      
    // Cache promise cho lần đầu tiên
      if (retryCount === 0) {
      checkingAuthRef.current = authPromise;
      }
      
    return authPromise;
  }, [getUserId]);
  
  // Load song data by ID from BE API (luôn lấy từ BE, không cache để đảm bảo fresh data)
  const loadSongById = useCallback(async (songId: number): Promise<Song | null> => {
    try {
      console.log('[MusicContext] 📡 Loading song metadata from BE API, songId:', songId);
      const apiSong = await songsApi.getById(String(songId));
      const song = normalizeSong(apiSong as ApiSong);
      
      // Cache để tránh gọi API nhiều lần trong cùng một session
      // Queue được quản lý local
      queueSongMapRef.current.set(songId, song);
      console.log('[MusicContext] ✅ Loaded song metadata from BE:', song.name || song.songName);
      return song;
    } catch (error) {
      console.error('[MusicContext] ❌ Failed to load song from BE API:', error);
      // Fallback: thử lấy từ cache nếu có (trong trường hợp API fail)
      if (queueSongMapRef.current.has(songId)) {
        console.log('[MusicContext] ⚠️ Using cached song data as fallback');
        return queueSongMapRef.current.get(songId) || null;
      }
      return null;
    }
  }, []);
  
  
  // QUAN TRỌNG: Check auth ngay khi component mount (mới vào page)
  // Đảm bảo check auth ngay cả khi mở tab mới sau khi đăng nhập
  useEffect(() => {
    console.log('[MusicContext] 🔐 Component mounted, checking auth...');
    
    // Check auth ngay lập tức
    const performAuthCheck = async () => {
      // Đợi một chút để đảm bảo sessionStorage và BroadcastChannel đã sẵn sàng
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const authenticated = await checkAuth();
      if (authenticated) {
        console.log('[MusicContext] ✅ Auth check successful on mount');
        waitingForTokenRef.current = false;
      } else {
        console.log('[MusicContext] ❌ Auth check failed on mount - user not authenticated');
        // Đánh dấu đang chờ token từ tab khác
        waitingForTokenRef.current = true;
        
        // Nếu không có token, thử check lại nhiều lần (có thể token đang được gửi từ tab khác)
        // Đợi tối đa 3 giây để nhận token từ tab khác
        let retryCount = 0;
        const maxRetries = 6; // 6 lần x 500ms = 3 giây
        const retryInterval = setInterval(async () => {
          retryCount++;
          const retryAuth = await checkAuth();
          if (retryAuth) {
            console.log(`[MusicContext] ✅ Auth check successful on retry ${retryCount}`);
            waitingForTokenRef.current = false;
            clearInterval(retryInterval);
          } else if (retryCount >= maxRetries) {
            console.log('[MusicContext] ⚠️ Max retries reached, no token received from other tabs');
            waitingForTokenRef.current = false;
            clearInterval(retryInterval);
          }
        }, 500);
      }
    };
    
    performAuthCheck();
  }, [checkAuth]); // Include checkAuth để đảm bảo dùng version mới nhất
  
  // Check auth on storage changes and tokenUpdated event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'adminToken') {
        checkAuth();
      }
      
      // Nếu userId thay đổi, kiểm tra xem có phải user khác không
      if (e.key === 'userId' && e.newValue && e.storageArea === localStorage) {
        // Lấy userId hiện tại từ localStorage (không phải từ token vì token có thể vẫn còn)
        const currentUserIdFromStorage = localStorage.getItem('userId');
        const newUserId = e.newValue;
        
        // Nếu userId thay đổi và khác với userId hiện tại trong storage
        if (currentUserIdFromStorage && currentUserIdFromStorage !== newUserId) {
          console.log('[MusicContext] ⚠️ User changed in another tab! Logging out...', {
            currentUserIdFromStorage,
            newUserId
          });
          
          // Clear tokens và redirect to login
          if (typeof window !== 'undefined') {
            try {
              clearTokens();
              
              // Clear userId từ localStorage
              localStorage.removeItem('userId');
              
              // Clear local state
              userIdRef.current = null;
              setIsAuthenticated(false);
              setCurrentSong(null);
              setQueueState([]);
              
              // Redirect to login
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            } catch (error) {
              console.error('[MusicContext] Failed to logout on user change:', error);
            }
          }
        }
      }
    };
    
    // Lắng nghe BroadcastChannel để detect user change và token update từ tab khác
    let authChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      authChannel = new BroadcastChannel('auth_channel');
      
       // Khi tab mới mở, request token từ tab khác (nếu có)
       // Chỉ request nếu chưa có token trong sessionStorage
       let tokenRequestRetries = 0;
       const MAX_TOKEN_REQUEST_RETRIES = 5;
       
       const requestTokenFromOtherTabs = () => {
         const currentToken = getAuthToken();
         if (!currentToken) {
           console.log(`[MusicContext] 🔍 Tab mới mở, không có token, requesting token from other tabs... (attempt ${tokenRequestRetries + 1}/${MAX_TOKEN_REQUEST_RETRIES})`);
           authChannel?.postMessage({
             type: 'REQUEST_TOKEN',
             tabId: `tab-${Date.now()}-${Math.random()}`,
             timestamp: Date.now()
           });
           
           // Retry nếu chưa nhận được token sau 1 giây
           tokenRequestRetries++;
           if (tokenRequestRetries < MAX_TOKEN_REQUEST_RETRIES) {
             setTimeout(() => {
               const stillNoToken = !getAuthToken();
               if (stillNoToken) {
                 console.log(`[MusicContext] 🔄 Retrying token request... (${tokenRequestRetries}/${MAX_TOKEN_REQUEST_RETRIES})`);
                 requestTokenFromOtherTabs();
               }
             }, 1000);
           } else {
             console.log('[MusicContext] ⚠️ Max retries reached, no token received from other tabs');
           }
         } else {
           console.log('[MusicContext] ✅ Tab mới mở, đã có token trong localStorage');
         }
       };
       
       // Request token ngay khi tab mới mở (nếu chưa có)
       // Đợi một chút để đảm bảo BroadcastChannel đã sẵn sàng
       setTimeout(() => {
         requestTokenFromOtherTabs();
       }, 100);
      
      authChannel.onmessage = (event) => {
        if (event.data.type === 'USER_CHANGED') {
          const newUserId = event.data.userId;
          // Lấy userId hiện tại từ localStorage (không phải từ token)
          const currentUserIdFromStorage = localStorage.getItem('userId');
          
          if (currentUserIdFromStorage && currentUserIdFromStorage !== String(newUserId)) {
            console.log('[MusicContext] ⚠️ User changed via BroadcastChannel! Logging out...', {
              currentUserIdFromStorage,
              newUserId
            });
            
            // Clear tokens và redirect to login
            try {
              clearTokens();
              
              // Clear userId từ localStorage
              localStorage.removeItem('userId');
              
              // Clear local state
              userIdRef.current = null;
              setIsAuthenticated(false);
              setCurrentSong(null);
              setQueueState([]);
              
              // Redirect to login
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            } catch (error) {
              console.error('[MusicContext] Failed to logout on user change:', error);
            }
          }
        } else if (event.data.type === 'TOKEN_UPDATED') {
          // Khi tab khác đăng nhập, lưu token vào sessionStorage và check auth
          const { token, refreshToken } = event.data;
          if (token) {
            console.log('[MusicContext] 🔔 Token updated in another tab, saving token...');
            waitingForTokenRef.current = false; // Đã nhận token, không cần chờ nữa
            (async () => {
              try {
                const { setTokens } = await import('@/services/api/config');
                setTokens(token, refreshToken);
                // Reset cache và check auth
                checkingAuthRef.current = null;
                const authenticated = await checkAuth();
                if (authenticated) {
                  console.log('[MusicContext] ✅ Auth check successful after receiving token from another tab');
                  // Dispatch event để các component khác biết đã đăng nhập
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('tokenUpdated'));
                  }
                }
              } catch (error) {
                console.error('[MusicContext] Failed to save token from another tab:', error);
              }
            })();
          } else {
            // Nếu không có token trong message, chỉ check auth lại (có thể token đã được lưu)
            console.log('[MusicContext] 🔔 Token updated event from another tab, checking auth...');
            checkingAuthRef.current = null;
            checkAuth().then(authenticated => {
              if (authenticated) {
                console.log('[MusicContext] ✅ Auth check successful after token update from another tab');
                waitingForTokenRef.current = false;
              }
            });
          }
        } else if (event.data.type === 'REQUEST_TOKEN') {
          // Tab khác request token, gửi token nếu có
          const token = getAuthToken();
          const refreshToken = getRefreshToken();
          if (token) {
            console.log('[MusicContext] 📤 Another tab requested token, sending token...');
            authChannel?.postMessage({
              type: 'TOKEN_RESPONSE',
              token: token,
              refreshToken: refreshToken || undefined
            });
          } else {
            console.log('[MusicContext] ⚠️ Another tab requested token but we don\'t have one');
          }
        } else if (event.data.type === 'TOKEN_RESPONSE') {
          // Nhận token từ tab khác, lưu vào sessionStorage và check auth
          const { token, refreshToken } = event.data;
          if (token) {
            console.log('[MusicContext] 📥 Received token from another tab, saving and checking auth...');
            waitingForTokenRef.current = false; // Đã nhận token, không cần chờ nữa
            const handleTokenResponse = async () => {
              try {
                const { setTokens } = await import('@/services/api/config');
                setTokens(token, refreshToken);
                // Reset cache và check auth
                checkingAuthRef.current = null;
                const authenticated = await checkAuth();
                if (authenticated) {
                  console.log('[MusicContext] ✅ Auth check successful after receiving token from another tab');
                  // Dispatch event để các component khác biết đã đăng nhập
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('tokenUpdated'));
                  }
                } else {
                  console.warn('[MusicContext] ⚠️ Token received but auth check failed');
                }
              } catch (error) {
                console.error('[MusicContext] Failed to save token from another tab:', error);
              }
            };
            handleTokenResponse();
          }
        }
      };
    }
    
    // Lắng nghe sự kiện tokenUpdated khi token được lưu (từ Login page)
    const handleTokenUpdated = () => {
      console.log('[MusicContext] Token updated event received, checking auth...');
      // Reset cache để force check lại
      checkingAuthRef.current = null;
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenUpdated', handleTokenUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleTokenUpdated);
      if (authChannel) {
        authChannel.close();
      }
    };
  }, [checkAuth, getUserId]);
  
  // Request playback control
  const requestPlaybackControl = useCallback(async (): Promise<boolean> => {
    // Kiểm tra xem có đang ở trang login không
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return false;
    }
    
    // Đơn giản: chỉ cần kiểm tra xem có token hay không
    let token = getAuthToken();
    let retryCount = 0;
    const MAX_TOKEN_WAIT = 5;
    
    // Đợi token xuất hiện trong sessionStorage (nếu vừa đăng nhập)
    while (!token && retryCount < MAX_TOKEN_WAIT) {
      await new Promise(resolve => setTimeout(resolve, 100));
      token = getAuthToken();
      retryCount++;
      if (token) break;
    }
    
    if (!token) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để phát nhạc.",
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      return false;
    }
    
    // Cập nhật userId nếu chưa có
    if (!userIdRef.current) {
      const userId = getUserId();
      userIdRef.current = userId;
    }
    
    // Local playback - không cần request control
    setActiveDeviceId(deviceIdRef.current);
    setActiveDeviceName('Current Device');
    return true;
  }, [checkAuth]);
  
  const playSong = useCallback(async (song: Song, skipApiCall = false) => {
    // Kiểm tra xem có đang ở trang login không - tránh redirect loop
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return;
    }
    
    // Đơn giản: chỉ cần kiểm tra xem có token hay không
    // Backend sẽ validate token khi gọi API
    let token = getAuthToken();
    let retryCount = 0;
    const MAX_TOKEN_WAIT = 5; // Đợi tối đa 5 lần
    
    // Đợi token xuất hiện trong sessionStorage (nếu vừa đăng nhập)
    while (!token && retryCount < MAX_TOKEN_WAIT) {
      await new Promise(resolve => setTimeout(resolve, 100));
      token = getAuthToken();
      retryCount++;
      if (token) break;
    }
    
    // Nếu không có token sau khi đợi, yêu cầu đăng nhập
    if (!token) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để phát nhạc.",
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      return;
    }
    
    // Có token rồi, cập nhật userId và isAuthenticated
    if (!userIdRef.current) {
      const userId = getUserId();
      userIdRef.current = userId;
    }
    
    // Đảm bảo isAuthenticated được set khi có token
    setIsAuthenticated(true);
    
    try {
      const songId = parseInt(String(song.id), 10);
      console.log('[MusicContext] Attempting to play song:', { songId, deviceId: deviceIdRef.current, song });
      
      if (isNaN(songId)) {
        console.error('[MusicContext] Invalid song ID:', song.id);
        toast({
          title: "Lỗi",
          description: "ID bài hát không hợp lệ.",
          variant: "destructive",
        });
        return;
      }
      
      // Kiểm tra xem đây có phải là yêu cầu mới từ người dùng không
      // Yêu cầu mới khi:
      // 1. skipApiCall = false (gọi trực tiếp từ người dùng)
      // 2. HOẶC skipApiCall = true nhưng:
      //    - Bài hát không có trong queue, HOẶC
      //    - Queue chỉ có 1 bài (đã được set từ yêu cầu mới trước đó), HOẶC
      //    - Bài hát không phải là bài tiếp theo trong queue (người dùng chọn bài khác trong cùng danh sách)
      let isNewRequest = false;
      
      // QUAN TRỌNG: Kiểm tra queue.length TRƯỚC để quyết định có reset queue không
      // Nếu queue có nhiều bài (ví dụ: 100 bài từ Top100), KHÔNG BAO GIỜ reset queue
      const hasMultipleSongs = queue.length > 1;
      const songIndex = queue.findIndex(s => String(s.id) === String(song.id));
      const isSongInQueue = songIndex >= 0;
      
      if (hasMultipleSongs) {
        // Queue có nhiều bài - KHÔNG BAO GIỜ reset queue, dù skipApiCall = true hay false
        // Đây có thể là từ Top100, Trending, hoặc playlist lớn
        isNewRequest = false; // Không reset queue
        console.log('[MusicContext] Queue có nhiều bài (', queue.length, '), giữ nguyên queue và phát bài:', song.name || song.title || song.songName);
      } else if (!skipApiCall) {
        // Gọi trực tiếp từ người dùng và queue chỉ có 1 bài hoặc rỗng - yêu cầu mới
        isNewRequest = true;
      } else {
        // skipApiCall = true: có thể là từ playNext/playPrevious hoặc từ playSongWithStreamUrl
        // Queue chỉ có 1 bài hoặc rỗng
        if (!isSongInQueue) {
          // Bài hát không có trong queue - đây là yêu cầu mới
          isNewRequest = true;
        } else if (queue.length === 1) {
          // Queue chỉ có 1 bài - đây có thể là yêu cầu mới (người dùng chọn bài khác)
          isNewRequest = true;
        } else {
          // Queue rỗng - đây là yêu cầu mới
          isNewRequest = true;
        }
      }
      
      if (isNewRequest) {
        // Chỉ reset queue nếu queue chỉ có 1 bài hoặc rỗng, và bài hát không có trong queue
        const shouldReplaceQueue = !isSongInQueue || queue.length <= 1;
        
        if (shouldReplaceQueue) {
          console.log('[MusicContext] New song request detected, clearing old queue and setting new queue with this song');
          // Xóa queue cũ và set queue mới với chỉ bài hát này
          const songIds = [parseInt(String(song.id), 10)].filter(id => !isNaN(id));
          if (songIds.length > 0) {
            // Set queue mới với chỉ bài hát này (local only)
            setQueueState([song]);
            console.log('[MusicContext] Old queue cleared, new queue set with song:', song.name || song.title || song.songName);
          }
        } else {
          // Bài hát đã có trong queue và queue có nhiều hơn 1 bài, giữ nguyên queue
          console.log('[MusicContext] Song is already in queue with multiple songs, keeping existing queue and playing this song');
        }
      } else {
        console.log('[MusicContext] Playing song from existing queue (keeping queue with', queue.length, 'songs)');
      }
      
      // Đã tắt: Không cần request control nữa - chỉ phát nhạc local
      // if (!activeDeviceId || activeDeviceId !== deviceIdRef.current) {
      //   console.log('[MusicContext] Requesting playback control before playing...');
      //   await requestPlaybackControl();
      // }
      
      if (skipApiCall) {
        // Đã có playback state từ /play-now, chỉ cần set song và trigger MusicPlayer
        console.log('[MusicContext] Skipping API call (already setup by /play-now)');
        setCurrentSong(song);
        setIsPlaying(true);
        // Set device hiện tại là active device để MusicPlayer phát nhạc
        setActiveDeviceId(deviceIdRef.current);
        setActiveDeviceName('Current Device');
        return;
      }
      
      // Local playback - chỉ cần set state
      setCurrentSong(song);
      setIsPlaying(true);
      setActiveDeviceId(deviceIdRef.current);
      setActiveDeviceName('Current Device');
    } catch (error: unknown) {
      console.error('[MusicContext] Failed to play song:', error);
      
      // Only redirect if it's a 401 and refresh failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is401 = errorMessage.includes('401') || (error && typeof error === 'object' && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401);
      if (is401) {
        // Kiểm tra lại token trước khi redirect
        const currentToken = getAuthToken();
        if (!currentToken && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        toast({
          title: "Yêu cầu đăng nhập",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          variant: "destructive",
        });
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500); // Tăng delay để tránh conflict
        } else {
          // Có token nhưng API trả về 401 - có thể là vấn đề khác
          toast({
            title: "Lỗi xác thực",
            description: "Vui lòng thử lại sau vài giây.",
            variant: "warning",
          });
        }
      } else {
        toast({
          title: "Lỗi",
          description: "Không thể phát bài hát.",
          variant: "destructive",
        });
      }
    }
  }, [getUserId, activeDeviceId, loadSongById, requestPlaybackControl, queue, currentSong]);
  
  const togglePlay = useCallback(async () => {
    // Kiểm tra xem có đang ở trang login không
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return;
    }
    
    // Đơn giản: chỉ cần kiểm tra xem có token hay không
    let token = getAuthToken();
    let retryCount = 0;
    const MAX_TOKEN_WAIT = 5;
    
    // Đợi token xuất hiện trong sessionStorage (nếu vừa đăng nhập)
    while (!token && retryCount < MAX_TOKEN_WAIT) {
      await new Promise(resolve => setTimeout(resolve, 100));
      token = getAuthToken();
      retryCount++;
      if (token) break;
    }
    
    if (!token) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để phát nhạc.",
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      return;
    }
    
    // Cập nhật userId nếu chưa có
    if (!userIdRef.current) {
      const userId = getUserId();
      userIdRef.current = userId;
    }
    
    // QUAN TRỌNG: Logic mới:
    // 1. Nếu không có active device và user click play -> request control
    // 2. Nếu active device đã stale (disconnect) và user click play -> backend sẽ tự động cho device này trở thành active
    // 3. Backend sẽ tự động pause nếu active device disconnect
    if (!activeDeviceId && !isPlaying) {
      // Không có active device và user muốn play -> request control để trở thành output device
      console.log('[MusicContext] Không có active device, requesting control để trở thành output device...');
      await requestPlaybackControl();
    }
    
    // Local playback - chỉ toggle state
    setIsPlaying(prev => !prev);
  }, [checkAuth, activeDeviceId, isPlaying, requestPlaybackControl]);
  
  const playNext = useCallback(async () => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Xử lý next từ queue local - không gọi API
    if (queue.length === 0) {
      console.log('[MusicContext] Queue is empty, cannot play next');
      setIsPlaying(false);
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    let nextIndex: number;

    console.log('[MusicContext] playNext called:', {
      queueLength: queue.length,
      currentIndex,
      currentSongId: currentSong?.id,
      repeatMode,
      isShuffled
    });

    if (isShuffled) {
      // Phát ngẫu nhiên
      const availableSongs = queue.filter(s => s.id !== currentSong?.id);
      if (availableSongs.length === 0) {
        // Nếu chỉ còn 1 bài và repeatMode === "all", quay lại bài đầu
        if (repeatMode === "all" && queue.length > 0) {
          nextIndex = 0;
        } else {
          console.log('[MusicContext] No more songs available, stopping');
          setIsPlaying(false);
          return;
        }
      } else {
        nextIndex = Math.floor(Math.random() * availableSongs.length);
        const nextSong = availableSongs[nextIndex];
        nextIndex = queue.findIndex(s => s.id === nextSong.id);
      }
    } else {
      // Phát theo thứ tự
      if (currentIndex === -1) {
        // Không tìm thấy bài hiện tại trong queue (có thể đã bị xóa)
        // Nếu repeatMode === "all", quay lại bài đầu
        // Nếu repeatMode === "off", phát bài đầu tiên trong queue
        if (repeatMode === "all") {
          nextIndex = 0;
        } else if (repeatMode === "off" && queue.length > 0) {
          // Ở chế độ off, nếu không tìm thấy bài hiện tại, phát bài đầu tiên
          nextIndex = 0;
        } else {
          console.log('[MusicContext] Current song not found in queue and repeatMode is off, stopping');
          setIsPlaying(false);
          return;
        }
      } else if (currentIndex === queue.length - 1) {
        // Đang ở bài cuối cùng
        if (repeatMode === "all") {
          // Quay lại bài đầu
          nextIndex = 0;
        } else {
          // repeatMode === "off": Hết queue, dừng phát
          console.log('[MusicContext] Reached end of queue, stopping');
          setIsPlaying(false);
          return;
        }
      } else {
        // Còn bài tiếp theo
        nextIndex = currentIndex + 1;
      }
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      console.log('[MusicContext] Playing next song from queue:', nextSong.name || nextSong.title || nextSong.songName);
      await playSong(nextSong, true);
    } else {
      console.log('[MusicContext] No next song found, stopping');
      setIsPlaying(false);
    }
  }, [checkAuth, queue, currentSong, isShuffled, repeatMode, playSong]);
  
  const playPrevious = useCallback(async () => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Xử lý previous từ queue local - không gọi API
    if (queue.length === 0) {
      console.log('[MusicContext] Queue is empty, cannot play previous');
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    let prevIndex: number;

    if (currentIndex === -1 || currentIndex === 0) {
      // Ở bài đầu hoặc không tìm thấy
      if (repeatMode === "all") {
        // Quay lại bài cuối
        prevIndex = queue.length - 1;
      } else {
        // Không có bài trước
        return;
      }
    } else {
      prevIndex = currentIndex - 1;
    }

    const prevSong = queue[prevIndex];
    if (prevSong) {
      console.log('[MusicContext] Playing previous song from queue:', prevSong);
      await playSong(prevSong, true);
    }
  }, [checkAuth, queue, currentSong, repeatMode, playSong]);
  
  const setQueue = useCallback(async (songs: Song[]) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    try {
      // Extract song IDs for local queue management
      const songIds = songs.map(s => parseInt(String(s.id), 10)).filter(id => !isNaN(id));
      
      console.log('[MusicContext] 📋 Setting queue (sending only IDs to backend):', songIds);
      
      // Cache songs locally để hiển thị ngay (optimistic update)
      // Queue managed locally
      songs.forEach(song => {
        const songId = parseInt(String(song.id), 10);
        if (!isNaN(songId)) {
          queueSongMapRef.current.set(songId, song);
        }
      });
      
      // Set queue state (local only)
      setQueueState(songs);
      console.log('[MusicContext] ✅ Queue state updated with', songs.length, 'songs');
    } catch (error) {
      console.error('[MusicContext] ❌ Failed to set queue:', error);
      // Rollback optimistic update nếu có lỗi
      setQueueState([]);
    }
  }, [checkAuth]);
  
  const addToQueue = useCallback(async (song: Song) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    try {
      const songId = parseInt(String(song.id), 10);
      if (isNaN(songId)) return;
      
      console.log('[MusicContext] ➕ Adding song to queue (sending only ID to backend):', songId);
      
      // Cache song locally để hiển thị ngay (optimistic update)
      queueSongMapRef.current.set(songId, song);
      
      // Optimistic update: thêm vào queue state ngay lập tức
      setQueueState(prev => {
        // Kiểm tra xem bài hát đã có trong queue chưa
        const existingIndex = prev.findIndex(s => String(s.id) === String(song.id));
        if (existingIndex >= 0) {
          // Nếu đã có, remove và add lại ở cuối
          const newQueue = prev.filter(s => String(s.id) !== String(song.id));
          return [...newQueue, song];
        }
        // Nếu chưa có, add vào cuối
        return [...prev, song];
      });
      
      // Queue updated locally
      console.log('[MusicContext] ✅ Song added to queue');
    } catch (error) {
      console.error('[MusicContext] ❌ Failed to add to queue:', error);
      // Rollback optimistic update nếu có lỗi
      setQueueState(prev => prev.filter(s => String(s.id) !== String(song.id)));
    }
  }, [checkAuth]);
  
  const removeFromQueue = useCallback(async (songId: string | number) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Any device can control (sync controls)
    try {
      const id = parseInt(String(songId), 10);
      if (isNaN(id)) return;
      
      // Remove from queue locally
      setQueueState(prev => prev.filter(s => String(s.id) !== String(id)));
    } catch (error) {
      console.error('[MusicContext] Failed to remove from queue:', error);
    }
  }, [checkAuth]);
  
  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueueState(prev => {
      if (prev.length === 0) return prev;
      const safeFrom = Math.max(0, Math.min(prev.length - 1, fromIndex));
      const safeTo = Math.max(0, Math.min(prev.length - 1, toIndex));
      if (safeFrom === safeTo) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(safeFrom, 1);
      updated.splice(safeTo, 0, moved);
      return updated;
    });
  }, []);
  
  const toggleShuffle = useCallback(async () => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Update state locally
    setIsShuffled(prev => !prev);
  }, [checkAuth, isShuffled]);
  
  const setRepeatMode = useCallback(async (mode: "off" | "one" | "all") => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Update state locally
    setRepeatModeState(mode);
  }, [checkAuth, repeatMode]);
  
  const updatePosition = useCallback(async (positionMs: number, durationMs?: number) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Update local state
    setPosition(positionMs);
    if (durationMs !== undefined && durationMs > 0) {
      setDuration(durationMs);
    }
  }, [checkAuth]);
  
  const updateDuration = useCallback(async (durationMs: number) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Update local state
    setDuration(durationMs);
  }, [checkAuth]);
  
  const resetPlayer = useCallback(() => {
    // Reset local state only, backend will handle actual reset
    setCurrentSong(null);
    setIsPlaying(false);
    setQueueState([]);
    setIsShuffled(false);
    setRepeatModeState("off");
    setActiveDeviceId(null);
    setActiveDeviceName(null);
    setPosition(0);
  }, []);
  
  const selectOutputDevice = useCallback(async (deviceId: string) => {
    if (!checkAuth() || !userIdRef.current) return;
    
    // Local playback - chỉ set device
    setActiveDeviceId(deviceId);
    setActiveDeviceName('Selected Device');
  }, [checkAuth]);
  
  // Local playback - không cần register device
  
  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        isShuffled,
        repeatMode,
        activeDeviceId,
        activeDeviceName,
        currentDeviceId: deviceIdRef.current,
        position,
        duration,
        setDuration,
        isAuthenticated,
        playSong,
        togglePlay,
        playNext,
        playPrevious,
        addToQueue,
        setQueue,
        removeFromQueue,
        moveQueueItem,
        toggleShuffle,
        setRepeatMode,
        updatePosition,
        updateDuration,
        resetPlayer,
        requestPlaybackControl,
        devices,
        selectOutputDevice,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within MusicProvider");
  }
  return context;
};
