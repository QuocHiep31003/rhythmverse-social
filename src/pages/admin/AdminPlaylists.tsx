import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search, Music } from "lucide-react";
import { PlaylistFormDialog } from "@/components/admin/PlaylistFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { playlistsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const AdminPlaylists = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await playlistsApi.getAll();
      setPlaylists(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedPlaylist(null);
    setFormOpen(true);
  };

  const handleEdit = (playlist: any) => {
    setFormMode("edit");
    setSelectedPlaylist(playlist);
    setFormOpen(true);
  };

  const handleDeleteClick = (playlist: any) => {
    setSelectedPlaylist(playlist);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        await playlistsApi.create(data);
        toast({
          title: "Thành công",
          description: "Đã tạo playlist mới",
        });
      } else {
        await playlistsApi.update(selectedPlaylist.id, data);
        toast({
          title: "Thành công",
          description: "Đã cập nhật playlist",
        });
      }
      setFormOpen(false);
      loadPlaylists();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await playlistsApi.delete(selectedPlaylist.id);
      toast({
        title: "Thành công",
        description: "Đã xóa playlist",
      });
      setDeleteOpen(false);
      loadPlaylists();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa playlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Playlists</h1>
          <p className="text-muted-foreground">Tổng số: {playlists.length} playlists</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo playlist
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-8">Không tìm thấy playlist</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlaylists.map((playlist) => (
              <Card key={playlist.id} className="overflow-hidden">
                <div className="relative aspect-square">
                  <img
                    src={playlist.cover}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-lg mb-1">{playlist.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.description}
                    </p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Music className="w-4 h-4" />
                      <span>{playlist.songCount} bài hát</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(playlist)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(playlist)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlaylistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedPlaylist}
        isLoading={isSubmitting}
        mode={formMode}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Xóa playlist?"
        description={`Bạn có chắc muốn xóa playlist "${selectedPlaylist?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default AdminPlaylists;