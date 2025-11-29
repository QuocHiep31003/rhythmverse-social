import { apiClient } from '@/services/api/config';
import { useMusic } from '@/contexts/MusicContext';
import { mapToPlayerSong } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Song } from '@/services/api/songApi';

/**
 * Helper function để phát nhạc đơn giản - chỉ cần gọi /play-now và set song vào context
 * Không gọi thêm playbackApi.playSong() để tránh gọi 2 API
 */
export const playSongWithStreamUrl = async (
  song: Song | { id: string | number; [key: string]: unknown },
  playSongFromContext: (song: any, skipApiCall?: boolean) => Promise<void>,
  setQueue?: (songs: any[]) => Promise<void>
) => {
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
      
      // Set queue nếu có
      if (setQueue) {
        await setQueue([formattedSong]);
      }
      
      // Gọi playSong với skipApiCall=true vì /play-now đã setup rồi
      await playSongFromContext(formattedSong, true);
    } else {
      // Fallback: dùng song hiện tại nếu không có trong response
      const formattedSong = mapToPlayerSong(song);
      if (setQueue) {
        await setQueue([formattedSong]);
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

