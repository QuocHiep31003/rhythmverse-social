import { apiClient } from '@/services/api/config';
import { useMusic } from '@/contexts/MusicContext';
import { mapToPlayerSong } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Song } from '@/services/api/songApi';
import { clearTokens } from '@/services/api/config';

/**
 * Helper function để phát nhạc đơn giản - chỉ cần gọi /play-now và set song vào context
 * Không gọi thêm playbackApi.playSong() để tránh gọi 2 API
 * 
 * Nếu không phải tab đang phát (tab khác), sẽ gửi command qua BroadcastChannel thay vì tự phát nhạc
 */
export const playSongWithStreamUrl = async (
  song: Song | { id: string | number; [key: string]: unknown },
  playSongFromContext: (song: any, skipApiCall?: boolean) => Promise<void>,
  setQueue?: (songs: any[]) => Promise<void>,
  queue?: any[], // Queue hiện tại (nếu có)
  currentSong?: any // CurrentSong để kiểm tra xem có phải tab đang phát không
) => {
  // Kiểm tra xem có phải tab đang phát không
  // QUAN TRỌNG: CHỈ CÓ 1 TAB ĐƯỢC PHÁT NHẠC TẠI MỘT THỜI ĐIỂM
  // Tab chính = tab có currentSong (đang phát nhạc hoặc đã phát nhạc)
  // Tab phụ = tab không có currentSong
  // QUAN TRỌNG: Luôn kiểm tra qua BroadcastChannel để đảm bảo không có tab chính nào đang phát
  const isMainTab = currentSong !== null && currentSong !== undefined;
  
  // QUAN TRỌNG: Luôn kiểm tra qua BroadcastChannel trước khi quyết định tab phụ có trở thành tab chính không
  // Điều này đảm bảo khi đổi danh sách phát, tab phụ không tự phát nhạc nếu có tab chính đang phát
  let hasMainTabPlaying = false;
  if (typeof window !== 'undefined' && window.BroadcastChannel) {
    console.log('[playSongHelper] Kiểm tra xem có tab đang phát nào đang phát nhạc không...');
    
    const checkChannel = new BroadcastChannel('player');
    
    const checkPromise = new Promise<boolean>((resolve) => {
      const checkTimeout = setTimeout(() => {
        checkChannel.close();
        resolve(hasMainTabPlaying);
      }, 300); // Tăng timeout lên 300ms để đảm bảo nhận được response
      
      const checkHandler = (event: MessageEvent) => {
        if (event.data.type === "MAIN_TAB_RESPONSE") {
          // Nếu có response từ tab đang phát (dù isPlaying = true hay false), nghĩa là có tab đang phát
          // QUAN TRỌNG: Chỉ cần có currentSong là đủ, không cần isPlaying = true
          // Vì tab chính có thể đang pause nhưng vẫn là tab chính
          hasMainTabPlaying = true;
          clearTimeout(checkTimeout);
          checkChannel.removeEventListener('message', checkHandler);
          checkChannel.close();
          resolve(true);
        }
      };
      
      checkChannel.addEventListener('message', checkHandler);
      
      // Gửi message kiểm tra tab đang phát
      checkChannel.postMessage({
        type: "MAIN_TAB_CHECK",
      });
    });
    
    hasMainTabPlaying = await checkPromise;
  }
  
  // Nếu không phải tab đang phát (tab khác) VÀ có tab đang phát đang phát, gửi command qua BroadcastChannel
  if (!isMainTab && hasMainTabPlaying) {
    
      console.log('[playSongHelper] Có tab đang phát đang phát, tab phụ chỉ gửi command qua BroadcastChannel');
      try {
        // Gọi /play-now để lấy thông tin bài hát
        const songId = typeof song.id === 'string' ? parseInt(song.id, 10) : song.id;
        if (isNaN(songId)) {
          toast({
            title: "Lỗi",
            description: "ID bài hát không hợp lệ.",
            variant: "destructive",
          });
          return;
        }

        const response = await apiClient.post(`/songs/${songId}/play-now`, {});
        
        if (response.data?.success === false) {
          const errorMsg = response.data?.error || 'Không thể phát bài hát';
          toast({
            title: "Lỗi",
            description: errorMsg,
            variant: "destructive",
          });
          return;
        }

        // Format bài hát
        const formattedSong = response.data?.song 
          ? mapToPlayerSong(response.data.song)
          : mapToPlayerSong(song);

        // Tab phụ: Cập nhật queue trước (nếu có setQueue)
        let newQueue = queue ? [...queue] : [];
        
        // Nếu queue được truyền vào, dùng queue đó
        // Nếu không, tạo queue mới với chỉ bài hát này
        if (queue && queue.length > 0) {
          // Kiểm tra xem bài hát đã có trong queue chưa
          const existingIndex = newQueue.findIndex((q: any) => String(q.id) === String(formattedSong.id));
          if (existingIndex >= 0) {
            // Nếu đã có, remove và add lại ở cuối
            newQueue = newQueue.filter((q: any) => String(q.id) !== String(formattedSong.id));
          }
          // Thêm bài hát vào cuối queue
          newQueue.push(formattedSong);
        } else {
          // Nếu không có queue, tạo queue mới với chỉ bài hát này
          newQueue = [formattedSong];
        }
        
        // Cập nhật queue trong context (nếu có setQueue)
        if (setQueue) {
          await setQueue(newQueue);
          console.log('[playSongHelper] Tab phụ đã cập nhật queue, queue length:', newQueue.length);
        }

        // Gửi command qua BroadcastChannel để tab đang phát phát bài
        const channel = new BroadcastChannel('player');
        channel.postMessage({
          type: "PLAYER_CONTROL",
          action: "playNewSong",
          song: {
            id: formattedSong.id,
            title: formattedSong.title || formattedSong.name || formattedSong.songName,
            name: formattedSong.name || formattedSong.songName,
            artist: formattedSong.artist,
            cover: formattedSong.cover,
          },
          queue: newQueue.map((q: any) => ({
            id: q.id,
            title: q.title || q.name || q.songName,
            name: q.name || q.songName,
            artist: q.artist,
            cover: q.cover,
          })),
        });
        channel.close();
        
        console.log('[playSongHelper] Tab phụ đã gửi playNewSong command qua BroadcastChannel, tab đang phát sẽ phát bài');
        return; // QUAN TRỌNG: Tab phụ KHÔNG phát nhạc, chỉ gửi command
      } catch (error) {
        console.error('[playSongHelper] Lỗi khi gửi command từ tab phụ:', error);
        const errorResponse = error as { response?: { status?: number } };
        
        // ✅ Xử lý lỗi 403 (Access Denied) - chưa đăng nhập, redirect về login
        if (errorResponse?.response?.status === 403) {
          clearTokens();
          setTimeout(() => {
            const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
            const loginUrl = isAdminPage ? '/admin/login' : '/login';
            window.location.href = `${loginUrl}?message=${encodeURIComponent('Must login to play songs')}`;
          }, 100);
          return;
        }
        
        toast({
          title: "Lỗi",
          description: "Không thể gửi yêu cầu phát nhạc. Vui lòng thử lại.",
          variant: "destructive",
        });
        return;
      }
  }
  
  // Chỉ đến đây nếu:
  // 1. Là tab đang phát (isMainTab = true) → phát nhạc bình thường
  // 2. Là tab phụ nhưng không có tab đang phát nào → trở thành tab đang phát và phát nhạc
  if (!isMainTab && !hasMainTabPlaying) {
    console.log('[playSongHelper] Không có tab đang phát nào, tab phụ này sẽ trở thành tab đang phát và phát nhạc');
  }
  
  // Nếu là tab đang phát, phát nhạc bình thường
  try {
    const songId = typeof song.id === 'string' ? parseInt(song.id, 10) : song.id;
    if (isNaN(songId)) {
      toast({
        title: "Lỗi",
        description: "ID bài hát không hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    // Gọi /play-now endpoint để lấy streamUrl
    const response = await apiClient.post(`/songs/${songId}/play-now`, {});
    
    // Kiểm tra lỗi từ response
    if (response.data?.success === false) {
      const errorMsg = response.data?.error || 'Không thể phát bài hát';
      if (errorMsg.includes('HLS master playlist not found')) {
        toast({
          title: "Bài hát chưa sẵn sàng",
          description: "File audio của bài hát này chưa được xử lý. Vui lòng thử bài hát khác.",
          variant: "destructive",
          duration: 5000,
        });
      } else if (errorMsg.includes('missing uuid')) {
        toast({
          title: "Bài hát chưa sẵn sàng",
          description: "Bài hát này chưa có file audio. Vui lòng thử bài hát khác.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Lỗi",
          description: errorMsg,
          variant: "destructive",
        });
      }
      return;
    }
    
    // Nếu thành công, set song vào context và phát nhạc
    if (response.data?.song) {
      const formattedSong = mapToPlayerSong(response.data.song);
      // Đảm bảo UUID được set từ response
      if (response.data.song.uuid) {
        formattedSong.uuid = response.data.song.uuid;
      }
      
      // QUAN TRỌNG: Chỉ set queue nếu không có queue được truyền vào hoặc queue rỗng
      // Nếu có queue được truyền vào (ví dụ: Top100 với 100 bài), giữ nguyên queue đó
      if (setQueue) {
        if (queue && queue.length > 0) {
          // Có queue được truyền vào → set queue để đảm bảo queue trong context được cập nhật
          console.log('[playSongHelper] Tab chính: Set queue từ parameter, queue length:', queue.length);
          await setQueue(queue);
          // Đợi đủ lâu để queue được cập nhật trong context (tránh race condition với React batching)
          // Sử dụng requestAnimationFrame để đảm bảo React đã xử lý state update
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 200);
            });
          });
        } else {
          // Không có queue → set queue mới với chỉ bài hát này
          console.log('[playSongHelper] Tab chính: Không có queue, set queue mới với 1 bài');
          await setQueue([formattedSong]);
          // Đợi một chút để queue được cập nhật trong context
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Gọi playSong với skipApiCall=true vì /play-now đã setup rồi
      // QUAN TRỌNG: playSong sẽ đọc queue từ state, nên cần đảm bảo queue đã được cập nhật
      await playSongFromContext(formattedSong, true);
    } else {
      // Fallback: dùng song hiện tại nếu không có trong response
      const formattedSong = mapToPlayerSong(song);
      if (setQueue) {
        if (queue && queue.length > 0) {
          // Có queue được truyền vào → set queue để đảm bảo queue trong context được cập nhật
          console.log('[playSongHelper] Tab chính (fallback): Set queue từ parameter, queue length:', queue.length);
          await setQueue(queue);
          // Đợi một chút để queue được cập nhật trong context (tránh race condition)
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // Không có queue → set queue mới với chỉ bài hát này
          console.log('[playSongHelper] Tab chính (fallback): Không có queue, set queue mới với 1 bài');
          await setQueue([formattedSong]);
          // Đợi một chút để queue được cập nhật trong context
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      await playSongFromContext(formattedSong, true);
    }
  } catch (error: unknown) {
    console.error('Error playing song:', error);
    const errorResponse = error as { response?: { status?: number; data?: { error?: string; success?: boolean; message?: string } }; message?: string };
    
    // ✅ Xử lý lỗi 403 (Access Denied) - chưa đăng nhập, redirect về login
    if (errorResponse?.response?.status === 403) {
      // Clear tokens và redirect về login với message "must login to play songs"
      clearTokens();
      
      // Đợi một chút rồi redirect
      setTimeout(() => {
        const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        const loginUrl = isAdminPage ? '/admin/login' : '/login';
        // Thêm query param để hiển thị message
        window.location.href = `${loginUrl}?message=${encodeURIComponent('Must login to play songs')}`;
      }, 100);
      return;
    }
    
    const errorMessage = errorResponse?.response?.data?.error 
      || errorResponse?.response?.data?.message
      || (error instanceof Error ? error.message : 'Không thể phát bài hát');
    
    if (errorMessage.includes('HLS master playlist not found') || 
        errorResponse?.response?.data?.error?.includes('HLS master playlist not found')) {
      toast({
        title: "Bài hát chưa sẵn sàng",
        description: "File audio của bài hát này chưa được xử lý. Vui lòng thử bài hát khác.",
        variant: "destructive",
        duration: 5000,
      });
    } else {
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }
};

