import { apiClient } from '@/services/api/config';
import { useMusic } from '@/contexts/MusicContext';
import { mapToPlayerSong } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Song } from '@/services/api/songApi';

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
  // Tab chính = tab có currentSong (đang phát nhạc)
  // Tab phụ = tab không có currentSong
  // Nếu tab không có currentSong → chắc chắn là tab khác, chỉ sửa queue và gửi command qua BroadcastChannel
  const isMainTab = currentSong !== null && currentSong !== undefined;
  
  // Nếu không phải tab đang phát (tab khác), kiểm tra xem có tab đang phát nào đang phát không
  if (!isMainTab && typeof window !== 'undefined' && window.BroadcastChannel) {
    console.log('[playSongHelper] Tab phụ phát hiện, kiểm tra xem có tab đang phát nào đang phát không...');
    
    // Kiểm tra xem có tab đang phát nào đang phát nhạc không
    let hasMainTab = false;
    const checkChannel = new BroadcastChannel('player');
    
    const checkPromise = new Promise<boolean>((resolve) => {
      const checkTimeout = setTimeout(() => {
        checkChannel.close();
        resolve(hasMainTab);
      }, 200);
      
      const checkHandler = (event: MessageEvent) => {
        if (event.data.type === "MAIN_TAB_RESPONSE" && event.data.isPlaying) {
          hasMainTab = true;
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
    
    hasMainTab = await checkPromise;
    
    // Nếu có tab đang phát đang phát, gửi command qua BroadcastChannel
    if (hasMainTab) {
      console.log('[playSongHelper] Có tab đang phát đang phát, gửi command qua BroadcastChannel');
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
        return; // KHÔNG phát nhạc ở tab khác
      } catch (error) {
        console.error('[playSongHelper] Lỗi khi gửi command từ tab khác:', error);
        toast({
          title: "Lỗi",
          description: "Không thể gửi yêu cầu phát nhạc. Vui lòng thử lại.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Không có tab đang phát đang phát → tab khác này sẽ trở thành tab đang phát và phát nhạc
      console.log('[playSongHelper] Không có tab đang phát đang phát, tab khác này sẽ trở thành tab đang phát và phát nhạc');
      // Tiếp tục xử lý như tab đang phát (phần code bên dưới)
    }
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
    const errorResponse = error as { response?: { data?: { error?: string; success?: boolean } }; message?: string };
    const errorMessage = errorResponse?.response?.data?.error 
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

