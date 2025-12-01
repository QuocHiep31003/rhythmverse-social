import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Music } from "lucide-react";
import { playlistsApi, PlaylistLibraryItemDTO } from "@/services/api/playlistApi";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createSlug } from "@/utils/playlistUtils";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureName, FeatureLimitType, featureUsageApi } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: number | string;
  songTitle?: string;
  songCover?: string;
  onSuccess?: (playlistId?: number) => void;
  currentPlaylistId?: number;
}

export const AddToPlaylistDialog = ({
  open,
  onOpenChange,
  songId,
  songTitle,
  songCover,
  onSuccess,
  currentPlaylistId,
}: AddToPlaylistDialogProps) => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistLibraryItemDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(5); // Hiển thị 5 playlist ban đầu
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Feature limit check cho việc tạo playlist
  const {
    canUse,
    remaining,
    limit,
    limitType,
    checkUsage,
    isLoading: isCheckingLimit,
  } = useFeatureLimit({
    featureName: FeatureName.PLAYLIST_CREATE,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  useEffect(() => {
    if (open) {
      loadPlaylists();
      setDisplayLimit(5); // Reset về 5 playlist khi mở lại
      // Refresh usage khi mở dialog (có thể admin đã thay đổi limit)
      checkUsage();
    } else {
      setSearchQuery("");
      setNewPlaylistName("");
      setShowCreateForm(false);
    }
  }, [open, checkUsage]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const library = await playlistsApi.library();
      // Nếu songCount không có, lấy từ API
      const playlistsWithCount = await Promise.all(
        library.map(async (playlist) => {
          if (playlist.songCount !== undefined && playlist.songCount !== null) {
            return playlist;
          }
          try {
            const detail = await playlistsApi.getById(playlist.playlistId);
            return {
              ...playlist,
              songCount: detail.songs?.length || detail.songIds?.length || 0,
            };
          } catch {
            return { ...playlist, songCount: 0 };
          }
        })
      );
      setPlaylists(playlistsWithCount);
    } catch (error) {
      console.error("Failed to load playlists:", error);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Giới hạn số playlist hiển thị
  const displayedPlaylists = filteredPlaylists.slice(0, displayLimit);
  const hasMore = filteredPlaylists.length > displayLimit;

  const handleAddToPlaylist = async (playlistId: number) => {
    setAddingToPlaylistId(playlistId);
    try {
      await playlistsApi.addSong(playlistId, songId);
      toast({
        title: "Đã thêm vào playlist",
        description: `"${songTitle || "Bài hát"}" đã được thêm vào playlist`,
      });
      onOpenChange(false);
      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể thêm bài hát vào playlist";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAddingToPlaylistId(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên playlist",
        variant: "destructive",
      });
      return;
    }

    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    setCreating(true);
    try {
      // Refresh usage trước khi tạo để đảm bảo nắm thông tin mới nhất
      const latestUsage = await featureUsageApi.getFeatureUsage(FeatureName.PLAYLIST_CREATE);
      const latestCanUse = latestUsage?.canUse ?? true;
      if (!latestCanUse) {
        setShowLimitModal(true);
        setCreating(false);
        await checkUsage();
        return;
      }

      // Tạo playlist trước (không có songIds để tránh vấn đề addedBy)
      const newPlaylist = await playlistsApi.create({
        name: newPlaylistName.trim(),
        description: "",
        coverUrl: songCover || null, // Dùng ảnh bài hát làm ảnh bìa
        visibility: "PUBLIC",
        songLimit: 500,
        songIds: [], // Tạo playlist trống trước
      });

      // Sau đó thêm bài hát bằng addSong để đảm bảo thông tin addedBy được set đúng
      try {
        await playlistsApi.addSong(newPlaylist.id, songId);
      } catch (addError) {
        console.error("Failed to add song to new playlist:", addError);
        // Vẫn navigate dù có lỗi khi thêm bài hát
      }

      // Refresh usage sau khi tạo thành công để cập nhật thông tin mới nhất
      await checkUsage();

      toast({
        title: "Đã tạo playlist",
        description: `Playlist "${newPlaylistName}" đã được tạo và bài hát đã được thêm vào`,
      });

      onOpenChange(false);
      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess(newPlaylist.id);
      }
      // Navigate to the new playlist
      navigate(`/playlist/${createSlug(newPlaylist.name, newPlaylist.id)}`);
    } catch (error: any) {
      // Nếu lỗi từ backend về feature limit, show modal
      const errorMessage = error?.message || "";
      if (errorMessage.includes("limit exceeded") || 
          errorMessage.includes("Feature usage limit") ||
          errorMessage.includes("403") ||
          error?.status === 403) {
        setShowLimitModal(true);
      } else {
        const message = error instanceof Error ? error.message : "Không thể tạo playlist";
        toast({
          title: "Lỗi",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
      setNewPlaylistName("");
      setShowCreateForm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[600px] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50">
          <DialogTitle className="text-2xl font-bold">Thêm vào playlist</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Search bar */}
          <div className="px-6 pt-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-muted/50 border-yellow-500/50 focus:border-yellow-500 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* Create new playlist button */}
          {!showCreateForm && (
            <div className="px-6 pb-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto p-4 hover:bg-muted/70 rounded-xl transition-all"
                onClick={() => setShowCreateForm(true)}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-base block text-white">Tạo playlist mới</span>
                  <span className="text-xs text-muted-foreground">Tạo playlist và thêm bài hát này</span>
                </div>
              </Button>
            </div>
          )}

          {/* Create playlist form */}
          {showCreateForm && (
            <div className="px-6 pb-4">
              <div className="p-4 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
                <div className="space-y-3">
                  <Input
                    placeholder="Nhập tên playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreatePlaylist();
                      } else if (e.key === "Escape") {
                        setShowCreateForm(false);
                        setNewPlaylistName("");
                      }
                    }}
                    autoFocus
                    className="h-11 bg-background/80 border-border/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreatePlaylist}
                      disabled={creating || !newPlaylistName.trim()}
                      className="flex-1 h-9 font-semibold"
                    >
                      {creating ? "Đang tạo..." : "Tạo"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName("");
                      }}
                      disabled={creating}
                      className="h-9"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Playlists list */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent"></div>
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Music className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
                <p className="text-base font-medium text-foreground mb-1">
                  {searchQuery ? "Không tìm thấy playlist" : "Chưa có playlist nào"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Tạo playlist mới để bắt đầu
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedPlaylists.map((playlist) => (
                  <button
                    key={playlist.playlistId}
                    onClick={() => handleAddToPlaylist(playlist.playlistId)}
                    disabled={addingToPlaylistId === playlist.playlistId}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 active:bg-muted/80 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border/30"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md ring-1 ring-border/20">
                      {playlist.coverUrl ? (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <Music className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-base mb-0.5">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {playlist.songCount ?? playlist.totalSongs ?? 0} bài hát
                      </p>
                    </div>
                    {addingToPlaylistId === playlist.playlistId ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
                {hasMore && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setDisplayLimit(filteredPlaylists.length)}
                  >
                    Xem thêm ({filteredPlaylists.length - displayLimit} playlist)
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Feature Limit Modal */}
      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.PLAYLIST_CREATE}
        featureDisplayName="Create Playlist"
        remaining={remaining}
        limit={typeof limit === "number" ? limit : undefined}
        limitType={limitType}
        isPremium={limitType === FeatureLimitType.UNLIMITED}
        canUse={canUse}
        onRefresh={checkUsage}
      />
    </Dialog>
  );
};


