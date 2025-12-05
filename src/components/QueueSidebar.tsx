import { useState, useMemo, useRef } from "react";
import { useMusic, type Song } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, X, Plus, Upload, Lock, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSongDisplay } from "@/lib/songDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listeningHistoryApi } from "@/services/api/listeningHistoryApi";
import { useEffect } from "react";
import { getAuthToken, buildJsonHeaders, API_BASE_URL } from "@/services/api/config";
import { authApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureName, featureUsageApi } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";
import { PlaylistVisibility } from "@/types/playlist";
import { uploadImage } from "@/config/cloudinary";
import { createGridCover, uploadDataUrlToCloudinary } from "@/utils/imageUtils";
import { songsApi } from "@/services/api/songApi";

interface QueueSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customQueue?: Song[];
  customCurrentSongId?: string | number | null;
  onPlaySong?: (songId: string | number) => void;
  onRemoveFromQueue?: (songId: string | number) => void;
}

// QueueItem component
const QueueItem = ({
  song,
  index,
  isCurrent,
  onPlay,
  onRemove,
}: {
  song: Song;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) => {
  const { title, artist, cover } = getSongDisplay(song);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors rounded-md",
        isCurrent && "bg-primary/20"
      )}
      onClick={onPlay}
    >
      {/* Album Art - Small square */}
      {cover ? (
        <img
          src={cover}
          alt={title}
          className="w-12 h-12 rounded object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-music.png';
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-gradient-primary flex-shrink-0 flex items-center justify-center">
          <span className="text-xs text-white font-semibold">{index + 1}</span>
        </div>
      )}

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-medium truncate text-sm leading-tight",
            isCurrent ? "text-primary" : "text-white"
          )}
        >
          {title}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {artist}
        </div>
      </div>

      {/* Actions */}
      {isCurrent ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-44 bg-[#282828] border-white/10 z-[100]"
            sideOffset={5}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Thêm vào danh sách yêu thích
              }}
              className="text-white hover:bg-white/10 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              Thêm vào danh sách yêu thích
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-white hover:bg-white/10 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onRemove();
              }}
            >
              Xóa khỏi danh sách chờ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const QueueSidebar = ({ 
  isOpen, 
  onClose, 
  customQueue,
  customCurrentSongId,
  onPlaySong,
  onRemoveFromQueue: customRemoveFromQueue
}: QueueSidebarProps) => {
  const { queue: contextQueue, currentSong, playSong: contextPlaySong, removeFromQueue: contextRemoveFromQueue, setQueue: contextSetQueue } = useMusic();
  const navigate = useNavigate();
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistVisibility, setPlaylistVisibility] = useState<PlaylistVisibility>(PlaylistVisibility.PUBLIC);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUrlText, setCoverUrlText] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature limit check cho việc tạo playlist
  const {
    canUse,
    remaining,
    limit,
    limitType,
    refresh,
    isLoading: isCheckingLimit,
  } = useFeatureLimit({
    featureName: FeatureName.PLAYLIST_CREATE,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  // Sử dụng custom queue nếu có, nếu không dùng từ context
  const queue = customQueue || contextQueue;
  const currentSongId = customCurrentSongId !== undefined ? customCurrentSongId : (currentSong?.id || null);
  const playSong = onPlaySong ? async (song: Song) => {
    if (onPlaySong) {
      onPlaySong(song.id);
    }
  } : contextPlaySong;
  const removeFromQueue = customRemoveFromQueue || contextRemoveFromQueue;
  const setQueue = contextSetQueue; // Luôn dùng setQueue từ context để giữ queue

  const userId = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  const handlePlaySong = async (song: Song) => {
    if (String(currentSongId) === String(song.id)) return;
    try {
      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');
      // QUAN TRỌNG: Truyền đầy đủ tham số để giữ queue
      // Nếu có onPlaySong (từ ControlMusicPlayer), chỉ gọi onPlaySong
      // Nếu không (từ MusicPlayer), gọi playSongWithStreamUrl với đầy đủ tham số
      if (onPlaySong) {
        onPlaySong(song.id);
      } else {
        await playSongWithStreamUrl(song, playSong, setQueue, queue, currentSong);
      }
    } catch (error) {
      console.error("Error playing song:", error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const result = await uploadImage(file);
        setCoverPreview(result.secure_url);
        setCoverUrlText(result.secure_url);
        setCoverImage(file);
      } finally {
        setUploading(false);
      }
    }
  };

  const uploadCoverIfNeeded = async (file: File | null): Promise<string | null> => {
    if (!file) return null;

    const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";
    const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "";

    if (!cloudName || !uploadPreset) return null;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.secure_url || data.url || null;
    } catch {
      return null;
    }
  };

  const handleCreatePlaylistFromQueue = async () => {
    // Validation
    if (!playlistName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên playlist",
        variant: "destructive",
      });
      return;
    }

    if (playlistName.length > 100) {
      toast({
        title: "Lỗi",
        description: "Tên playlist không được vượt quá 100 ký tự",
        variant: "destructive",
      });
      return;
    }

    if (playlistDescription.length > 300) {
      toast({
        title: "Lỗi",
        description: "Mô tả không được vượt quá 300 ký tự",
        variant: "destructive",
      });
      return;
    }

    if (queue.length === 0) {
      toast({
        title: "Lỗi",
        description: "Danh sách chờ trống, không thể tạo playlist",
        variant: "destructive",
      });
      return;
    }

    // Limit check - refresh usage trước khi check
    await refresh();
    const latestUsage = await featureUsageApi.getFeatureUsage(FeatureName.PLAYLIST_CREATE);
    const latestCanUse = latestUsage?.canUse ?? true;
    
    if (!latestCanUse) {
      setShowLimitModal(true);
      return;
    }

    setCreating(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      let uploadedCoverUrl: string | null = null;

      // Upload ảnh người dùng chọn
      if (coverImage) {
        uploadedCoverUrl = await uploadCoverIfNeeded(coverImage);
      }
      // Tạo cover từ songs (nếu không có ảnh)
      else if (!coverUrlText && queue.length > 0) {
        try {
          const first4Songs = queue.slice(0, 4);
          const songPromises = first4Songs.map((song) => {
            const songId = typeof song.id === 'string' ? parseInt(song.id, 10) : song.id;
            return isNaN(songId) ? null : songsApi.getById(String(songId)).catch(() => null);
          });
          const songs = (await Promise.all(songPromises)).filter(Boolean);

          if (songs.length > 0) {
            const imageUrls = songs.map(
              (song: any) =>
                song.urlImageAlbum ||
                song.albumImageUrl ||
                song.albumCoverImg ||
                null
            );

            const gridDataUrl = await createGridCover(imageUrls);
            uploadedCoverUrl = await uploadDataUrlToCloudinary(gridDataUrl);
          }
        } catch (err) {
          console.warn("Failed to generate cover:", err);
        }
      }

      // Resolve userId
      let ownerId: number | undefined;
      try {
        const raw = localStorage.getItem("userId");
        ownerId = raw ? Number(raw) : undefined;

        if (!ownerId || !Number.isFinite(ownerId)) {
          const me = await authApi.me().catch(() => undefined);
          const uid = me && (me.id || me.userId);
          if (uid) {
            ownerId = Number(uid);
            localStorage.setItem("userId", String(uid));
          }
        }
      } catch {}

      // Lấy songIds từ queue
      const songIds = queue.map(song => {
        const id = typeof song.id === 'string' ? parseInt(song.id, 10) : song.id;
        return isNaN(id) ? null : id;
      }).filter((id): id is number => id !== null);

      if (songIds.length === 0) {
        toast({
          title: "Lỗi",
          description: "Không có bài hát hợp lệ trong danh sách chờ",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const body: any = {
        name: playlistName.trim(),
        description: (playlistDescription || "").slice(0, 300),
        visibility: playlistVisibility,
        songIds: songIds,
        dateUpdate: today,
        coverUrl: /^https?:\/\//.test(coverUrlText)
          ? coverUrlText
          : uploadedCoverUrl || null,
      };

      if (ownerId) body.ownerId = ownerId;

      const headers = buildJsonHeaders();

      const res = await fetch(`${API_BASE_URL}/playlists`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create playlist";
        const status = res.status;
        try {
          const errorText = await res.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {}
        const error = new Error(errorMessage);
        (error as any).status = status;
        throw error;
      }

      const data = await res.json();

      // Đồng bộ lại usage sau khi backend đã tự tăng count
      await refresh();
      toast({
        title: "Playlist created",
        description: `Playlist "${playlistName}" has been added to your library`,
      });

      setShowCreatePlaylistDialog(false);
      setPlaylistName("");
      setPlaylistDescription("");
      setPlaylistVisibility(PlaylistVisibility.PUBLIC);
      setCoverImage(null);
      setCoverPreview("");
      setCoverUrlText("");
      
      // Navigate to playlist library page
      navigate("/playlist");
    } catch (err: any) {
      // Kiểm tra các trường hợp lỗi về limit
      const errorMessage = err?.message || "";
      const isLimitError = 
        err?.status === 403 ||
        errorMessage.toLowerCase().includes("limit") ||
        errorMessage.toLowerCase().includes("giới hạn") ||
        errorMessage.toLowerCase().includes("đã đạt") ||
        errorMessage.toLowerCase().includes("premium") ||
        errorMessage.toLowerCase().includes("vô hiệu hóa") ||
        errorMessage.toLowerCase().includes("nâng cấp");
      
      if (isLimitError) {
        setShowLimitModal(true);
        await refresh();
        return;
      }
      
      toast({
        title: "Error",
        description: errorMessage || "Failed to create playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[64px] bottom-[80px] w-[320px] bg-[#181818] border-l border-white/10 z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/80 via-fuchsia-500/70 to-orange-400/70 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-white">Queue</h2>
            <p className="text-xs text-white/80">Manage your queue and save to a playlist</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Create playlist from queue - only show when items exist */}                                                                            
        {queue.length > 0 && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-auto p-2.5 mt-2 bg-white/10 hover:bg-white/15 text-white rounded-md transition-all text-sm"
            onClick={() => setShowCreatePlaylistDialog(true)}
          >
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-white">Create playlist from queue</span>
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-visible px-2 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
        {queue.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground text-center">                                                                               
            Queue is empty
          </div>
        ) : (
          <div className="space-y-1">
            {queue.map((song, index) => (
              <QueueItem
                key={song.id}
                song={song}
                index={index}
                isCurrent={String(currentSongId) === String(song.id)}
                onPlay={async () => {
                  if (String(currentSongId) !== String(song.id)) {
                    if (onPlaySong) {
                      onPlaySong(song.id);
                    } else {
                      const { playSongWithStreamUrl } = await import('@/utils/playSongHelper');                                                               
                      await playSongWithStreamUrl(song, playSong, setQueue, queue, currentSong);                                                              
                    }
                  }
                }}
                onRemove={async () => {
                  if (removeFromQueue) {
                    await removeFromQueue(song.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog tạo playlist từ danh sách chờ */}
      <Dialog open={showCreatePlaylistDialog} onOpenChange={(open) => {
        setShowCreatePlaylistDialog(open);
        if (!open) {
          // Reset form khi đóng
          setPlaylistName("");
          setPlaylistDescription("");
          setPlaylistVisibility(PlaylistVisibility.PUBLIC);
          setCoverImage(null);
          setCoverPreview("");
          setCoverUrlText("");
        }
      }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Tạo playlist từ danh sách chờ</DialogTitle>
            <DialogDescription className="text-gray-400">
              Tạo playlist mới với {queue.length} bài hát từ danh sách chờ của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-white">Ảnh bìa</Label>
              <div
                className="relative w-32 h-32 rounded-lg bg-muted/50 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/60"
                onClick={() => fileInputRef.current?.click()}
              >
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Playlist cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-400">Chọn ảnh</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Playlist Name */}
            <div className="space-y-2">
              <Label htmlFor="playlist-name" className="text-white">
                Tên playlist *
              </Label>
              <Input
                id="playlist-name"
                placeholder="Nhập tên playlist"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="h-11 bg-background/80 border-border/50 text-white placeholder:text-gray-500"
                disabled={creating || isCheckingLimit || uploading}
                maxLength={100}
              />
              <p className="text-xs text-gray-400">
                {playlistName.length}/100 ký tự
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="playlist-description" className="text-white">
                Mô tả
              </Label>
              <Textarea
                id="playlist-description"
                placeholder="Mô tả playlist..."
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                className="bg-background/80 border-border/50 text-white placeholder:text-gray-500 min-h-[80px] resize-none"
                disabled={creating || isCheckingLimit || uploading}
                maxLength={300}
              />
              <p className="text-xs text-gray-400">
                {playlistDescription.length}/300 ký tự
              </p>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="playlist-visibility" className="text-white">
                Quyền riêng tư
              </Label>
              <Select
                value={playlistVisibility}
                onValueChange={(value) => setPlaylistVisibility(value as PlaylistVisibility)}
                disabled={creating || isCheckingLimit || uploading}
              >
                <SelectTrigger
                  id="playlist-visibility"
                  className="w-full border-border/60 bg-background/30 text-white"
                >
                  <SelectValue placeholder="Chọn quyền riêng tư" />
                </SelectTrigger>
                <SelectContent className="bg-[#282828] border-white/10 text-white">
                  <SelectItem value={PlaylistVisibility.PUBLIC} className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>Public</span>
                  </SelectItem>
                  <SelectItem value={PlaylistVisibility.FRIENDS_ONLY} className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Friends Only</span>
                  </SelectItem>
                  <SelectItem value={PlaylistVisibility.PRIVATE} className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <span>Private</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreatePlaylistFromQueue}
                disabled={creating || isCheckingLimit || uploading || !playlistName.trim()}
                className="flex-1 h-10 font-semibold bg-primary hover:bg-primary/90"
              >
                {creating || isCheckingLimit || uploading ? "Đang xử lý..." : "Tạo playlist"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreatePlaylistDialog(false);
                  setPlaylistName("");
                  setPlaylistDescription("");
                  setPlaylistVisibility(PlaylistVisibility.PUBLIC);
                  setCoverImage(null);
                  setCoverPreview("");
                  setCoverUrlText("");
                }}
                disabled={creating || isCheckingLimit || uploading}
                className="h-10 border-white/20 text-white hover:bg-white/10"
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Limit Modal */}
      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.PLAYLIST_CREATE}
        featureDisplayName="Tạo Playlist"
        remaining={remaining}
        limit={limit}
        limitType={limitType}
        canUse={canUse}
        onRefresh={refresh}
      />
    </div>
  );
};

export default QueueSidebar;

